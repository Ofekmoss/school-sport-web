const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');
const Promise = require('promise');
const sql = require('mssql');
const utils = require('./utils');
const settings = require('../../settings');
const logger = require('../../logger');

const email_subject = "התחברות למערכת התאחדות הספורט";
const login_link = "https://www.schoolsport.org.il/v2/#/login?token=$token";

let timer = 0;

function UpdateTokenStatus(connection, token, status) {
    return new Promise(function (fulfil, reject) {
        let qs = 'Update TokenLogins ' +
            'Set [Status]=@status ' +
            'Where [Token]=@token';
        let request = connection.request();
        request.input('status', status);
        request.input('token', token);
        request.query(qs, function (err, queryResponse) {
            if (err) {
                logger.error('[TokenLoginNotifications] Error updating token ' + token + ' status to ' + status + ': ' + (err.message || err));
                reject('ERROR');
            } else {
                fulfil('OK');
            }
        });
    });
}

/**
 * @return {string}
 */
function ExtractRole(rawDetails) {
    if (rawDetails != null && rawDetails.roles && rawDetails.roles.length > 0) {
        let rawRole = rawDetails.roles[0];
        if (rawRole.length > 0)
            return rawRole.split('-')[0];
    }
    return "";
}

function sendSingleMail(info) {
    return new Promise(function (fulfil, reject) {
        let recipientEmail = info.RecipientEmail;
        if (!utils.IsValidEmail(recipientEmail)) {
            reject('Trying to send token login notification ' + info.Token + ' to invalid email address: ' + recipientEmail);
            return;
        }
        let recipientRole = ExtractRole(info.Details);
        logger.log('verbose', '[TokenLoginNotifications] Sending token login notification to ' + recipientEmail + ' (' + info.RecipientName + '), token ' + info.Token);
		let subject = email_subject;
		let archiveFile = "TokenLoginNotification_" + info.Token + ".html";
		let htmlContents = '<div dir="rtl" style="text-direction: rtl;">';
		htmlContents += 'שלום ' + info.RecipientName + ', <br />';
		if (recipientRole === 'principal') {
            htmlContents += 'בית ספרך ' + info.Details.SchoolName + ' ביצע רישום';
        } else if (recipientRole === 'representative') {
		    htmlContents += 'בית ספר ' + info.Details.SchoolName + ' מהרשות ' + info.Details.CityName + ' ביצע רישום ';
        } else {
            htmlContents += 'בוצע רישום ';
        }
		htmlContents += ' ';
		htmlContents += 'לאירועי הספורט של התאחדות הספורט לבתי הספר.';
		htmlContents += '<br />';
		htmlContents += 'לאישור הקבוצות ';
		htmlContents += '<a href="' + login_link.replace("$token", info.Token) + '" style="font-weight: bold;">';
		htmlContents += 'לחץ כאן';
		htmlContents += '</a>.';
		htmlContents += '<br /><br />בברכה,<br />';
		htmlContents += 'התאחדות הספורט לבתי הספר בישראל';
		htmlContents += '</div>';
		utils.SendEmail(recipientEmail, subject, null, null, htmlContents, archiveFile, info).then(function(mailSendInfo) {
			let logMessage = '[TokenLoginNotifications] Email sent successfully';
			if (mailSendInfo && mailSendInfo.messageId) {
				logMessage += ' with message Id ' + mailSendInfo.messageId;
			}
			logger.log('info', logMessage);
			fulfil('OK');
		}, function(err) {
			logger.log('error', '[TokenLoginNotifications] ' + err);
			reject('Error sending mail');
		});
    });
}

function readNextNotification(connection) {
    return new Promise(function (fulfil, reject) {
        let qs = 'Select Top 1 [Token], [Code], [Identifier], [Email], [UserDetails] ' + 
				'From TokenLogins ' + 
				'Where [Expiration]>GetDate() And IsNull([Status], 0)=0 ' + 
				'Order By [Expiration] Asc';
        let request = connection.request();
        request.query(qs, function (err, queryResponse) {
            if (err) {
                logger.error('[TokenLoginNotifications] Error reading next token: ' + (err.message || err));
                reject('ERROR')
            } else {
                recordset = queryResponse.recordset || queryResponse;
                if (recordset != null && recordset.length > 0) {
                    let row = recordset[0];
                    let dataObject = {
                        Token: row['Token'],
                        Details: JSON.parse(row['UserDetails']),
                        Code: row['Code'],
                        Identifier: row['Identifier'],
                        Email: row['Email']
                    };
                    fulfil(dataObject);
                } else {
                    fulfil(null);
                }
            }
        });
    });
}

function verifyTokenData(connection, dataObject) {
    return new Promise(function (fulfil, reject) {
        if (dataObject.Email == null || dataObject.Email.length === 0) {
            reject('No email');
            return;
        }
		if (!utils.IsValidEmail(dataObject.Email)) {
            reject('Email is invalid');
			return;
        }
		
        dataObject.Recipient = {
			Email: dataObject.Email,
			Name: dataObject.Details.displayName
		};

		fulfil('OK');
    });
}

function HandleCurrentNotification() {
    utils.CreateDbConnection(function (err, connection) {
        function StatusUpdateFailure() {
            console.log('[TokenLoginNotifications] Updating status failed');
            connection.close();
        }

        function SendTokenNotification(dataObject) {
            dataObject.RecipientEmail = dataObject.Recipient.Email;
            dataObject.RecipientName = dataObject.Recipient.Name;
            sendSingleMail(dataObject).then(function () {
                logger.log('info', '[TokenLoginNotifications] Done, email has been sent.');
                UpdateTokenStatus(connection, dataObject.Token, 1).then(function () {
                    connection.close();
                }, StatusUpdateFailure);
            }, function (err) {
                logger.log('verbose', '[TokenLoginNotifications] Sending email failed: ' + err);
                UpdateTokenStatus(connection, dataObject.Token, 2).then(function () {
                    connection.close();
                }, StatusUpdateFailure);
            });
        }

        if (err) {
            console.log('[TokenLoginNotifications] connection failed');
            logger.error('[TokenLoginNotifications] ' + err);
        } else {
            readNextNotification(connection).then(function (dataObject) {
                if (dataObject == null) {
                    console.log('[TokenLoginNotifications] No current notification');
                    connection.close();
                } else {
                    verifyTokenData(connection, dataObject).then(function () {
                        // console.log(dataObject);
                        if (dataObject.Details.schoolID) {
                            let qs = 'Select s.SCHOOL_NAME, c.CITY_NAME ' +
                                    'From SCHOOLS s Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                    'Where s.SCHOOL_ID=@school And s.DATE_DELETED Is Null';
                            let request = connection.request();
                            request.input('school', dataObject.Details.schoolID);
                            request.query(qs, function (err, queryResponse) {
                                if (err) {
                                    logger.error('[TokenLoginNotifications] Warning! Failed to read school ' + dataObject.Details.schoolID + ': ' + (err.message || err));
                                    SendTokenNotification(dataObject);
                                } else {
                                    let recordset = queryResponse.recordset || queryResponse;
                                    if (recordset != null && recordset.length > 0) {
                                        dataObject.Details.SchoolName = recordset[0]['SCHOOL_NAME'];
                                        dataObject.Details.CityName = recordset[0]['CITY_NAME'];
                                    } else {
                                        logger.log('verbose', '[TokenLoginNotifications] Warning: school ' + dataObject.Details.schoolID + ' not found');
                                    }
                                    SendTokenNotification(dataObject);
                                }
                            });
                        } else {
                            logger.log('verbose', '[TokenLoginNotifications] Warning: no school for token login notification ' + dataObject.Token);
                            SendTokenNotification(dataObject);
                        }
                    }, function (err) {
                        let notificationStatus = 3;
                        if (err.indexOf('ERROR') === 0) {
                            notificationStatus = 2;
                        } else {
                            logger.log('verbose', '[TokenLoginNotifications] Warning! Token login notification ' + dataObject.Token + ' has wrong details: ' + err);
                        }
                        UpdateTokenStatus(connection, dataObject.Token, notificationStatus).then(function () {
                            connection.close();
                        }, StatusUpdateFailure);

                    });
                }
            }, function (err) {
                console.log('[TokenLoginNotifications] reading next notification failed');
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
        logger.error('[TokenLoginNotifications] General error handling current notification: ' + (err.message || err))
    }
}

function Stop() {
    clearInterval(timer);
}

timer = setInterval(TrySendNotification, 30000);
TrySendNotification();

module.exports.Stop = Stop;