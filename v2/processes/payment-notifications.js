const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');
const Promise = require('promise');
const sql = require('mssql');
const utils = require('./utils');
const settings = require('../../settings');
const logger = require('../../logger');

const email_subject = "תעודת חיוב $order";

let timer = 0;

function ParsePaymentOrder(rawOrder) {
    if (rawOrder == null)
        return '';
    rawOrder = rawOrder.toString();
    if (rawOrder.length < 5)
        return '';
    let YY = rawOrder.substr(0, 2);
    let MM = rawOrder.substr(2, 2);;
    let XXXX = rawOrder.substr(4);
    while (XXXX.indexOf('0') === 0)
        XXXX = XXXX.substr(1);
    return XXXX + '-' + MM + '/' + YY;
}



function UpdateNotificationStatus(connection, id, status) {
    return new Promise(function (fulfil, reject) {
        let qs = 'Update PaymentRequests ' +
            'Set [Notification]=@status ' +
            'Where Id=@id';
        let request = connection.request();
        request.input('status', status);
        request.input('id', id);
        request.query(qs, function (err, queryResponse) {
            if (err) {
                logger.error('[PaymentNotifications] Error updating notification #' + id + ' status to ' + status + ': ' + (err.message || err));
                reject('ERROR');
            } else {
                fulfil('OK');
            }
        });
    });
}

function sendSingleMail(info) {
    return new Promise(function (fulfil, reject) {
        let recipientEmail = info.RecipientEmail;
        if (!utils.IsValidEmail(recipientEmail)) {
            reject('Trying to send payment notification #' + info.Id + ' to invalid email address: ' + recipientEmail);
            return;
        }
        logger.log('verbose', '[PaymentNotifications] Sending payment notification to ' + recipientEmail + ' (' + info.PayerName + '), order ' + info.Id);
        let pdfName = 'תעודת חיוב ' + info.Order.replace('/', '-') + '.pdf';
        let pdfData = {};
        for (let key in info) {
            if (info.hasOwnProperty(key)) {
                pdfData[key] = info[key];
            }
        }
        pdfData.logo = fs.readFileSync('v2/templates/images/PDF-logo.png', {encoding: 'base64'});
        pdfData.Date = utils.FormatDate(new Date(), 'dd / MM / yyyy');
        utils.createPDF('PaymentNotificationTemplatePDF.html', pdfName, pdfData, 'PaymentNotifications').then(function(pdfPath) {
			logger.log('verbose', '[PaymentNotifications] PDF file "' + pdfPath + '" has been created successfully');
            delete pdfData.logo; // no need to store it
			let subject = email_subject.replace('$order', info.Order);
			let attachments = [{
				filename: pdfName,
				path: pdfPath
				//cid: 'logo-sportiada.png'
			}];
			let archiveFile = "PaymentNotification_" + info.Id + ".html";
			utils.SendEmail(recipientEmail, subject, attachments, 'PaymentNotificationTemplate.html', null, archiveFile, info).then(function(mailSendInfo) {
				let logMessage = '[PaymentNotifications] Email sent successfully';
                if (mailSendInfo && mailSendInfo.messageId) {
					logMessage += ' with message Id ' + mailSendInfo.messageId;
				}
                logger.log('info', logMessage);
				fulfil('OK');
			}, function(err) {
				logger.log('error', '[PaymentNotifications] ' + err);
                reject('Error sending mail');
			});
        }, function(err) {
            logger.error('[PaymentNotifications] Error creating PDF:');
            logger.error(err);
            delete pdfData.logo; // no need to store it
            reject(err);
        });
    });
}

function readNextNotification(connection) {
    return new Promise(function (fulfil, reject) {
        let qs = 'Select Top 1 px.Id, px.[Method], px.TotalAmount, px.PayerName, px.Details, px.[Order], px.[Time], ' +
            '   IsNull(s.NAME, \'\') As SeasonName ' +
            'From PaymentRequests px Left Join SEASONS s On px.Season=s.SEASON And s.DATE_DELETED Is Null ' +
            'Where px.[Notification] Is Null ' +
            'Order By px.[Time] Asc';
        let request = connection.request();
        request.query(qs, function (err, queryResponse) {
            if (err) {
                logger.error('[PaymentNotifications] Error reading next notification: ' + (err.message || err));
                reject('ERROR')
            } else {
                recordset = queryResponse.recordset || queryResponse;
                if (recordset != null && recordset.length > 0) {
                    let row = recordset[0];
                    let dataObject = {
                        Id: row['Id'],
                        Details: JSON.parse(row['Details']),
                        PayerName: row['PayerName'],
                        PaymentMethod: row['Method'],
                        Order: ParsePaymentOrder(row['Order']),
                        TotalAmount: row['TotalAmount'],
                        SeasonName: row['SeasonName']
                    };
                    switch (dataObject.PaymentMethod) {
                        case 1:
                            dataObject.PaymentMethodName = 'שליחת המחאה';
                            dataObject.IsChecque = true;
                            break;
                        case 2:
                            dataObject.PaymentMethodName = 'העברה בנקאית';
                            dataObject.IsBankTransfer = true;
                            break;
                    }
                    fulfil(dataObject);
                } else {
                    fulfil(null);
                }
            }
        });
    });
}

function parseNotificationDetails(connection, dataObject) {
    return new Promise(function (fulfil, reject) {
        if (dataObject.Details == null) {
            reject('No details');
            return;
        }
        if (dataObject.Details.contacts == null || dataObject.Details.contacts.length === 0) {
            reject('No contacts');
            return;
        }
        if (dataObject.Details.items == null || dataObject.Details.contacts.items == 0) {
            reject('No items');
            return;
        }

        let validContacts = [];
        dataObject.Details.contacts.forEach(function(contact) {
            if (utils.IsValidEmail(contact.email)) {
                validContacts.push(contact);
            } else {
                logger.log('verbose', '[PaymentNotifications] Warning! Contact "' + contact.name + '" has invalid email: ' + contact.email);
            }
        });
        if (validContacts.length === 0) {
            reject('No valid contacts');
            return;
        }

        dataObject.Recipients = validContacts.map(function(contact) {
            return {
                Email: contact.email,
                Name: contact.name
            };
        });

        dataObject.Teams = [];
        dataObject.Details.items.forEach(function(rawItem) {
            let itemPrice = rawItem.price || 0;
            if (rawItem.teams && rawItem.teams.length > 0) {
                rawItem.teams.forEach(function(teamId) {
                    dataObject.Teams.push({
                        Id: teamId,
                        Price: itemPrice
                    });
                });
            }
        });

        if (dataObject.Teams.length === 0) {
            reject('No team data');
            return;
        }

        let qs = 'Select tr.Id, sr.Name As SchoolName, c.CHAMPIONSHIP_NAME, s.SPORT_NAME, cm.CATEGORY_NAME ' +
            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID ' +
            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
            '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.[CATEGORY] ' +
            '   Left Join SchoolRegistrations sr On tr.School=sr.School ' +
            'Where tr.Id In (' + dataObject.Teams.map(function(x) { return x.Id; }).join(', ') + ')';
        let request = connection.request();
        request.query(qs, function (err, queryResponse) {
            if (err) {
                logger.error('[PaymentNotifications] Error reading teams data: ' + (err.message || err));
                reject('ERROR');
            } else {
                let recordset = queryResponse.recordset || queryResponse;
                if (recordset != null && recordset.length > 0) {
                    dataObject.SchoolName = recordset[0]['SchoolName'];
                    let dataMapping = {};
                    for (let i = 0; i < recordset.length; i++) {
                        let row = recordset[i];
                        dataMapping[row.Id.toString()] = row;
                    }
                    dataObject.Teams.forEach(function(team) {
                        var teamRow = dataMapping[team.Id.toString()];
                        if (teamRow) {
                            team.ChampionshipName = teamRow['CHAMPIONSHIP_NAME'];
                            team.SportName = teamRow['SPORT_NAME'];
                            team.CategoryName = teamRow['CATEGORY_NAME'];
                        }
                    });
                    fulfil('OK');
                } else {
                    logger.log('verbose', '[PaymentNotifications] Warning: no detailed information for order #' + dataObject.Id + ' teams');
                    fulfil('OK but no teams data');
                }
            }
        });
    });
}

function HandleCurrentNotification() {
    utils.CreateDbConnection(function (err, connection) {
        function StatusUpdateFailure() {
            console.log('[PaymentNotifications] Updating status failed');
            connection.close();
        }

        function SendSingleNotification(dataObject, recipientIndex) {
            if (recipientIndex >= dataObject.Recipients.length) {
                logger.log('info', '[PaymentNotifications] Done, ' + dataObject.Recipients.length + ' emails have been sent.');
                UpdateNotificationStatus(connection, dataObject.Id, 1).then(function () {
                    connection.close();
                }, StatusUpdateFailure);
                return;
            }

            dataObject.RecipientEmail = dataObject.Recipients[recipientIndex].Email;
            dataObject.RecipientName = dataObject.Recipients[recipientIndex].Name;
            sendSingleMail(dataObject).then(function () {
                SendSingleNotification(dataObject, recipientIndex + 1);
            }, function (err) {
                logger.log('verbose', '[PaymentNotifications] Sending email failed: ' + err);
                UpdateNotificationStatus(connection, dataObject.Id, 2).then(function () {
                    connection.close();
                }, StatusUpdateFailure);
            });
        }

        if (err) {
            console.log('[PaymentNotifications] connection failed');
            logger.error('[PaymentNotifications] ' + err);
        } else {
            readNextNotification(connection).then(function (dataObject) {
                if (dataObject == null) {
                    console.log('[PaymentNotifications] No current notification');
                    connection.close();
                } else {
                    parseNotificationDetails(connection, dataObject).then(function () {
                        //console.log(dataObject);
                        UpdateNotificationStatus(connection, dataObject.Id, 0).then(function () {
                            SendSingleNotification(dataObject, 0);
                        }, StatusUpdateFailure);
                    }, function (err) {
                        let notificationStatus = 3;
                        if (err.indexOf('ERROR') === 0) {
                            notificationStatus = 2;
                        } else {
                            logger.log('verbose', '[PaymentNotifications] Warning! Payment notification #' + dataObject.Id + ' has wrong details: ' + err);
                        }
                        UpdateNotificationStatus(connection, dataObject.Id, notificationStatus).then(function () {
                            connection.close();
                        }, StatusUpdateFailure);

                    });
                }
            }, function (err) {
                console.log('[PaymentNotifications] reading next notification failed');
                connection.close();
            });
        }
    });
}

function TrySendNotification() {
    try {
        HandleCurrentNotification();
    } catch (err) {
        if (typeof err === 'undefined' || err == null)
            err = '';
        if (err)
            console.log(err);
        logger.error('[PaymentNotifications] General error handling current notification: ' + (err.message || err))
    }
}

function Stop() {
    clearInterval(timer);
}

timer = setInterval(TrySendNotification, 30000);
TrySendNotification();

module.exports.Stop = Stop;