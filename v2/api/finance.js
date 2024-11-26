var express = require('express');
var router = express.Router();
var v2utils = require('../processes/utils');
var logger = require('../../logger');
var settings = require('../../settings');

var util = require('./util');
const fs = require("fs");
const Mustache = require("mustache");

var Finance = settings.v2test ? require('../test/finance') : require('../models/finance');
var Data = settings.v2test ? require('../test/manage/data') : require('../models/manage/data');
var Season = settings.v2test ? require('../test/season') : require('../models/season');

function filterSportEntities(entities, query) {
    if (query.sport != null) {
        entities = entities.filter(entity => {
            if (entity.account && entity.account.sports != null) {
                var matchingSport = entity.account.sports.find(sport => sport.id == query.sport);
                return matchingSport != null;
            }
            return false;
        });
    }
    if (query.championship != null) {
        entities = entities.filter(entity => {
            if (entity.account && entity.account.sports != null) {
                var matchingSport = entity.account.sports.find(sport => {
                    if (sport.championships != null) {
                        var matchingChampionship = sport.championships.find(championship => championship.id == query.championship);
                        return matchingChampionship != null;
                    }
                    return false;
                });
                return matchingSport != null;
            }
            return false;
        });
    }
    if (query.category != null) {
        entities = entities.filter(entity => {
            if (entity.account && entity.account.sports != null) {
                var matchingSport = entity.account.sports.find(sport => {
                    if (sport.championships != null) {
                        var matchingChampionship = sport.championships.find(championship => {
                            if (championship.categories != null) {
                                var matchingCategory = championship.categories.find(category => category.id == query.category);
                                return matchingCategory != null;
                            }
                            return false;
                        });
                        return matchingChampionship != null;
                    }
                    return false;
                });
                return matchingSport != null;
            }
            return false;
        });
    }
    return entities;
}

function getReceiptTitle(pageIndex) {
    var title = '';
    switch (pageIndex) {
        case 1:
            title = '****מקור';
            break;
        case 2:
            title = 'העתק 1';
            break;
        case 3:
            title = 'העתק 2';
            break;
    }
    return title;
}

function parseReceiptPayments(receiptPayments) {
    function parseSingleItem(paymentArray) {
        var parsedPayments = [];
        if (paymentArray.length > 0) {
            var type = paymentArray[0].hasOwnProperty('תוקף כרטיס') ? 1 : 2; //1 - VISA, 2 - NON VISA
            paymentArray.forEach(payment => {
                var parsedPayment = {
                    type: payment['אמצעי תשלום'],
                    sum: payment['סכום']
                };
                switch (type) {
                    case 1:
                        //VISA
                        parsedPayment.cardType = payment['סוג כרטיס'];
                        parsedPayment.lastDigits = payment['4 ספרות אחרונות'];
                        parsedPayment.expireDate = payment['תוקף כרטיס'];
                        parsedPayment.creditPayments = payment['מס\'\' תשלומים'];
                        break;
                    case 2:
                        //NON VISA
                        parsedPayment.bank = payment['בנק'];
                        parsedPayment.branch = payment['סניף'];
                        parsedPayment.accountNumber = payment['חשבון'];
                        parsedPayment.reference = payment['אסמכתא'];
                        parsedPayment.paymentDate = payment['תאריך פרעון'];
                        break;
                }
                parsedPayments.push(parsedPayment);
            });
        }
        return {
            Type: type,
            Payments: parsedPayments
        };
    }

    var nonVisaPayments = [];
    var visaPayments = [];
    if (receiptPayments != null && receiptPayments.length > 0) {
        //can have up to two items
        var firstItem;
        var secondItem = null;
        if (Array.isArray(receiptPayments[0])) {
            firstItem = parseSingleItem(receiptPayments[0]);
            if (receiptPayments.length > 1)
                secondItem = parseSingleItem(receiptPayments[1]);
        } else {
            firstItem = parseSingleItem(receiptPayments);
        }
        if (firstItem != null) {
            switch (firstItem.Type) {
                case 1: //VISA
                    visaPayments = firstItem.Payments;
                    break;
                case 2: //NON VISA
                    nonVisaPayments = firstItem.Payments;
                    break;
            }
        }
        if (secondItem != null) {
            switch (secondItem.Type) {
                case 1: //VISA
                    visaPayments = secondItem.Payments;
                    break;
                case 2: //NON VISA
                    nonVisaPayments = secondItem.Payments;
                    break;
            }
        }
    }
    return {
        nonVisa: nonVisaPayments,
        visa: visaPayments
    };
}

router.get('/products', function (req, res) {
    Finance.getProducts(function (err, result) {
        util.sendResult(res, err, result);
    });
});

/*
router.get('/payment-requests', function (req, res) {
    Data.getPaymentRequests(function (err, result) {
        util.sendResult(res, err, result);
    });
});
*/

router.get('/team-payments', util.requireRole('finance', 'admin'), function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var options = {
            season: currentSeason
        };

        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        else if (req.query.region != null) {
            options.region = parseInt(req.query.region);
        }
        if (req.query.clubs) {
            options.clubs = true;
        }
        else if (req.query.league) {
            options.league = true;
        }

        Finance.listTeamPayments(options, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.get('/payment-request-details/:id', util.requireRole('finance', 'admin'), function (req, res) {
    var paymentRequestId = req.params.id;
    if (!paymentRequestId) {
        util.sendResult(res, 'missing request id', null);
        return;
    }
    Finance.getPaymentRequestDetails(paymentRequestId, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/payment-request-contacts/:id', util.requireRole('finance', 'admin'), function (req, res) {
    var paymentRequestId = req.params.id;
    if (!paymentRequestId) {
        util.sendResult(res, 'missing request id', null);
        return;
    }
    Finance.getPaymentRequestContacts(paymentRequestId, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/payment-requests', util.requireRole('finance', 'admin'), function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var season = req.query.season || currentSeason;
        var options = {
            season: season
        };
        if (req.session.user.regionID !== 0 && req.session.user.regionID != null) {
            options.region = req.session.user.regionID;
        }
        if (req.query.region != null) {
            options.region = parseInt(req.query.region);
        }
        if (req.query.type != null) {
            options.type = parseInt(req.query.type);
        }
        Finance.getPaymentRequests(options, function (err, paymentRequests) {
            util.sendResult(res, err, filterSportEntities(paymentRequests, req.query));
        });
    });
});

router.get('/receipts', util.requireRole('finance', 'admin'), function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var season = req.query.season || currentSeason;
        var options = {
            season: season
        };
        if (req.session.user.regionID !== 0 && req.session.user.regionID != null) {
            options.region = req.session.user.regionID;
        }
        if (req.query.region != null) {
            options.region = util.cleanNonsense(req.query.region);
        }
        if (req.query.account != null) {
            options.account = util.cleanNonsense(req.query.account);
        }
        if (req.query.type != null) {
            options.type = util.cleanNonsense(req.query.type);
        }
        if (req.query.receipt_ids != null) {
            options.receipt_ids = req.query.receipt_ids;
        }
        //console.log(options);
        Finance.getReceipts(options, function (err, receipts) {
            util.sendResult(res, err, filterSportEntities(receipts, req.query));
        });
    });
});

router.get('/charges', util.requireRole('finance', 'admin'), function (req, res) {
    var options = {};
    if (req.session.user.regionID !== 0 && req.session.user.regionID != null) {
        options.region = req.session.user.regionID;
    }
    var queryRegion = util.getIntOrDefault(req.query.region);
    options.account = util.getIntOrDefault(req.query.account);
    if (req.query.start != null && req.query.end != null) {
        options.range = util.getDateRange(req.query.start, req.query.end);
        if ((options.account == null || options.account <= 0) && options.range != null) {
            var diff = options.range.end.getFullYear() - options.range.start.getFullYear();
            if (diff > 2) {
                util.sendResult(res, 'Range can be up to 2 years when not providing account', null);
                return;
            }
        }
    }
    if (queryRegion != null && queryRegion > 0) {
        options.region = queryRegion;
    }
    options.type = util.getIntOrDefault(req.query.type);
    options.sport = util.getIntOrDefault(req.query.sport);
    options.championship = util.getIntOrDefault(req.query.championship);
    options.category = util.getIntOrDefault(req.query.category);
    Finance.getCharges(options, function (err, charges) {
        util.sendResult(res, err, charges);
    });
});

router.get('/charge/:id', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.getChargeDetails(req.params.id, function (err, charge) {
        if (err != null && typeof err === 'string' && err.toLowerCase().indexOf('not found') >= 0) {
            err = {
                status: 404,
                message: 'Charge not found'
            };
        }
        util.sendResult(res, err, charge);
    });
});

router.put('/charge', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.newCharge(req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/charge', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.updateCharge(req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.delete('/charge', util.requireRole('finance', 'admin'), function (req, res) {
    var chargeId = parseInt(req.query.id);
    if (isNaN(chargeId) || chargeId <= 0) {
        res.status(400).send('Missing or invalid charge id');
        return;
    }
    Finance.deleteCharge(chargeId, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/receipt/:receipt/payments', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.getReceiptPayments(req.params.receipt, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/receipt/:receipt/credits', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.getReceiptCreditedAccounts(req.params.receipt, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/receipt/:receipt/payment-requests', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.getReceiptPaymentRequests(req.params.receipt, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/receipt/:receipt/print', util.requireRole('finance', 'admin'), function (req, res) {
    function GetReceiptData(receipt, callback) {
        Finance.getReceiptPaidFor(receipt.id, function(err, paidForAccounts) {
            if (err) {
                callback(err);
                return;
            }
            Finance.getReceiptPayments(receipt.id, function (err, receiptPayments) {
                if (err) {
                    callback(err);
                    return;
                }
                Finance.getReceiptPaymentRequests(receipt.id, function(err, rawPaymentRequests) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    var paymentRequests = [];
                    var paymentRequestIds = [];
                    var paymentRequestMapping = {};
                    rawPaymentRequests.forEach(rawPaymentRequest => {
                        var paymentRequestId = parseInt(rawPaymentRequest['פרטים נוספים'].split('=')[1], 10);
                        if (!isNaN(paymentRequestId) && paymentRequestId > 0) {
                            paymentRequestIds.push(paymentRequestId);
                            paymentRequestMapping[paymentRequestId.toString()] = rawPaymentRequest['מספר תעודת חיוב'];
                        }
                    });
                    var loadSinglePaymentRequestDetails = function(index) {
                        if (index >= paymentRequestIds.length) {
                            callback(null, {
                                PaidForAccounts: paidForAccounts,
                                Payments: receiptPayments,
                                PaymentRequests: paymentRequests
                            });
                            return;
                        }
                        var paymentRequestId = paymentRequestIds[index];
                        Finance.getPaymentRequestDetails(paymentRequestId, function(err, paymentRequestDetails) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            paymentRequestDetails.forEach(paymentRequestDetail => {
                                var paymentRequest = {
                                    parsedPaymentRequest: paymentRequestMapping[paymentRequestId.toString()]
                                };
                                for (var key in paymentRequestDetail) {
                                    if (paymentRequestDetail.hasOwnProperty(key)) {
                                        paymentRequest[key] = paymentRequestDetail[key];
                                    }
                                }
                                if (paymentRequest.createdAt) {
                                    paymentRequest.createdAtDisplay = util.parseDateTime(paymentRequest.createdAt, 'DD/MM/YYYY');
                                } else {
                                    paymentRequest.createdAtDisplay = '';
                                }
                                paymentRequests.push(paymentRequest);
                            });
                            loadSinglePaymentRequestDetails(index + 1);
                        });
                    };
                    loadSinglePaymentRequestDetails(0);
                });
            });
        });
    }
    var receiptId = req.params.receipt;
    if (!receiptId) {
        util.sendResult(res, {status: 400, message: 'missing receipt id'}, null);
        return;
    }
    var isPDF = req.query.pdf === '1';
    Season.current(req.session.user, function(currentSeason) {
        Season.getAllSeasons(function(err, allSeasons) {
            if (err) {
                util.sendResult(res, err, null);
                return;
            }
            Finance.getReceipts({receipt: receiptId}, function (err, receipts) {
                if (err) {
                    util.sendResult(res, err, null);
                    return;
                }
                if (receipts == null || receipts.length === 0) {
                    util.sendResult(res, {status: 400, message: 'Receipt not found'}, null);
                    return;
                }
                var receipt = receipts[0];
                if (!receipt.account) {
                    util.sendResult(res, {status: 400, message: 'receipt has no account'}, null);
                    return;
                }
                if (receipt.account.name.indexOf('(עבור ') > 0)
                    receipt.account.name = receipt.account.name.substr(0, receipt.account.name.indexOf('(') - 1);
                GetReceiptData(receipt, function(err, rawData) {
                    if (err) {
                        util.sendResult(res, err, null);
                        return;
                    }
                    receipt.creditedAccounts = rawData.PaidForAccounts;
                    receipt.payments = parseReceiptPayments(rawData.Payments);
                    receipt.paymentRequests = rawData.PaymentRequests;
                    receipt.season = allSeasons.find(s => s.id == currentSeason);
                    if (receipt.creditedAccounts.length === 1 && (receipt.region == null || receipt.region.id == 0)) {
                        receipt.region = {
                            "id": receipt.creditedAccounts[0].REGION_ID,
                            "name": receipt.creditedAccounts[0].REGION_NAME
                        };
                    }
                    var seasonStart = new Date(receipt.season.start);
                    var receiptData = {
                        pages: []
                    };
                    var copies = 1; //3
                    for (var i = 1; i <= copies; i++) {
                        var curPage = {
                            payerName: receipt.account.name,
                            payerAddress: receipt.account.address,
                            receiptRegion: (receipt.region || {}).name,
                            season: receipt.season.name,
                            years: [seasonStart.getFullYear(), seasonStart.getFullYear() + 1].join('-'),
                            receiptDate: util.parseDateTime(receipt.date, 'DD/MM/YYYY'),
                            title: getReceiptTitle(i),
                            receiptNumber: receipt.number,
                            remarkStyle: util.hideWhenEmpty(receipt.remarks),
                            remarks: receipt.remarks,
                            nonVisaPaymentsStyle: util.hideWhenEmpty(receipt.payments.nonVisa),
                            nonVisaPayments: receipt.payments.nonVisa,
                            visaPaymentsStyle: util.hideWhenEmpty(receipt.payments.visa),
                            visaPayments: receipt.payments.visa,
                            creditedAccountStyle: util.hideWhenEmpty(receipt.creditedAccounts),
                            creditedAccounts: receipt.creditedAccounts.map(x => {
                                return {
                                    symbol: x.SYMBOL,
                                    name: x.SCHOOL_NAME,
                                    sum: x.CREDIT
                                }
                            }),
                            paymentRequestStyle: util.hideWhenEmpty(receipt.paymentRequests),
                            paymentRequests: receipt.paymentRequests,
                            pageBreakStyle: i < 3 ? 'page-break-before: always;' : ''
                        };
                        receiptData.pages.push(curPage);
                    }
                    if (isPDF) {
                        var pdfName = 'receipt-' + receipt.id + '.pdf';
                        v2utils.createPDF('ReceiptTemplate.html', pdfName, receiptData, 'Receipts').then(function (pdfPath) {
                            logger.log('verbose', 'Receipt file "' + pdfPath + '" has been created successfully');
                            res.setHeader('Content-type', 'application/pdf');
                            res.setHeader('Content-disposition', 'inline; filename="' + pdfName + '"');
                            res.status(200).sendFile(pdfPath);
                            //util.sendResult(res, null, buffer);
                        });
                    } else {
                        let templateFile = fs.readFileSync('v2/templates/ReceiptTemplate.html', {encoding: 'utf8'});
                        let rawHTML = Mustache.render(templateFile, receiptData);
                        var fileName = 'receipt-' + receipt.id + '.html';
                        res.setHeader('Content-type', 'text/html');
                        res.setHeader('Content-disposition', 'inline; filename="' + fileName + '"');
                        util.sendResult(res, null, rawHTML);
                        //util.sendResult(res, err, receipt);
                    }
                });
            });
        });
    });
});

router.get('/accounts', util.requireRole('finance', 'admin'), function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var season = req.query.season || currentSeason;
        var options = {
            season: season
        };
        if (req.session.user.regionID !== 0 && req.session.user.regionID != null) {
            options.region = req.session.user.regionID;
        }
        if (req.query.region != null) {
            options.region = parseInt(req.query.region);
        }
        if (req.query.type != null) {
            options.type = parseInt(req.query.type);
        }
        Finance.getAccounts(options, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.get('/raw-accounts', util.requireRole('finance', 'admin'), function (req, res) {
    var options = {
        region: req.query.region
    };
    Finance.getRawAccounts(options, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/payments/payment', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.updatePaymentsPayment(req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/receipt', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.newReceipt(req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/payment-request', util.requireRole('finance', 'admin'), function (req, res) {
    Finance.editPaymentRequest(req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

module.exports = router;