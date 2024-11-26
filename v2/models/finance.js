var utils = require('./utils');
var sql = require('mssql');
var logger = require('../../logger');
var settings = require('../../settings');

function Finance(db) {
    this.db = db;
}

function addIfMissing(record, entity, fieldTitle, arrayName, childArrayName, zeroFields) {
    if (typeof zeroFields === 'undefined')
        zeroFields = [];
    var idField = fieldTitle + 'ID';
    var entityId = record[idField];
    var item = entity[arrayName].find(x => x.id === entityId);
    if (item == null) {
        item = utils.getBasicEntity(record, fieldTitle);
        zeroFields.forEach(zeroField => {
            item[zeroField] = 0;
        });
        if (childArrayName) {
            item[childArrayName] = [];
        }
        entity[arrayName].push(item);
    }
    return item;
}

function getSeasonRange(season, callback) {
    var seasonConnection = new sql.Connection(settings.sqlConfig, function (err) {
        if (err) {
            logger.error('Get season range connection error: ' + err.message);
            callback(err);
        } else {
            var qs = 'Select FirstDay, LastDay ' +
                'From Seasons ' +
                'Where SeasonCode=@season';
            var request = seasonConnection.request();
            request.input('season', season);
            request.query(qs, function (err, records) {
                if (err) {
                    seasonConnection.close();
                    callback(err);
                } else {
                    if (records.length === 0) {
                        seasonConnection.close();
                        callback('Season data not found for ' + season);
                    } else {
                        var firstRecord = records[0];
                        var seasonStart = firstRecord.FirstDay;
                        var seasonEnd = firstRecord.LastDay;
                        seasonConnection.close();
                        var range = {
                            Start: seasonStart,
                            End: seasonEnd
                        };
                        callback(null, range);
                    }
                }
            });
        }
    });
}

function getExtraConditions(options, prefix) {
    if (typeof prefix === 'undefined' || prefix == null)
        prefix = 'c';
    var extraConditions = '';
    switch (options.type) {
        case 1:
            extraConditions += 'And $p.IS_CLUBS=1 ';
            break;
        case 2:
            extraConditions += 'And $p.IS_LEAGUE=1 ';
            break;
        case 3:
            extraConditions += 'And $p.IS_CLUBS=0 ';
            extraConditions += 'And $p.IS_LEAGUE=1 ';
            extraConditions += 'And $p.REGION_ID=@region ';
            extraConditions += 'And $p.IS_OPEN=0 ';
            options.region = 0;
            break;
        case 4:
            extraConditions += 'And $p.IS_CLUBS=0 ';
            extraConditions += 'And $p.REGION_ID=@region ';
            extraConditions += 'And $p.IS_OPEN=1 ';
            options.region = 0;
            break;
    }
    while (extraConditions.indexOf('$p') >= 0) {
        extraConditions = extraConditions.replace('$p', prefix);
    }
    return extraConditions;
}

function getAllAccounts(db, options, callback) {
    var _connection = null;
    //console.log(options);
    function error(err) {
        if (_connection != null) {
            _connection.complete();
            _connection = null;
        }
        callback(err);
    }

    function readAccountCredits(connection) {
        return new Promise(function(fulfil, reject) {
            var qs = 'Select c.ACCOUNT_ID, r.RECEIPT_ID, Sum(c.CREDIT) As TotalPaid ' +
                'From CREDITS c Inner Join RECEIPTS r On c.RECEIPT_ID=r.RECEIPT_ID And r.DATE_DELETED Is Null ' +
                '   Left Join TeamPayments tp On tp.ReceiptId=r.RECEIPT_ID ' +
                'Where c.DATE_DELETED Is Null And r.RECEIPT_DATE Between dbo.GetSeasonStart(@season) And dbo.GetSeasonEnd(@season) ' +
                'Group By c.ACCOUNT_ID, r.RECEIPT_ID ' +
                'Having Sum(IsNull(tp.Amount, 0))=0 And Sum(c.CREDIT)>0';
            connection.request(qs, {season: options.season}).then(function (records) {
                var creditMapping = {};
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var accountId = record.ACCOUNT_ID;
                    var key = accountId.toString();
                    if (creditMapping[key] == null) {
                        creditMapping[key] = {
                            account: accountId,
                            receipts: [],
                            totalPaid: 0
                        };
                    }
                    creditMapping[key].receipts.push(record.RECEIPT_ID);
                    creditMapping[key].totalPaid += record.TotalPaid;
                }
                fulfil(utils.flattenArray(creditMapping));
            }, function(err) {
                reject(err);
            });
        });
    }

    function readAccountCharges(connection) {
        return new Promise(function(fulfil, reject) {
            var extraConditions = getExtraConditions(options);
            var qs = 'Select ch.ACCOUNT_ID, ch.CHARGE_ID, Sum(ch.[PRICE]*ch.AMOUNT) As TotalCharge ' +
                'From CHARGES ch Left Join TEAMS t On t.CHARGE_ID=ch.CHARGE_ID And t.DATE_DELETED Is Null ' +
                '   Left Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Left Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.SEASON=@season ' +
                'Where ch.DATE_DELETED Is Null And ch.PaymentRequest Is Null And t.TEAM_ID Is Null ' + extraConditions +
                '   And ch.CHARGE_DATE Between dbo.GetSeasonStart(@season) And dbo.GetSeasonEnd(@season) ' +
                'Group By ch.ACCOUNT_ID, ch.CHARGE_ID';
            var queryParams = {
                season: options.season,
                region: options.region
            };
            connection.request(qs, queryParams).then(function (records) {
                var chargeMapping = {};
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var accountId = record.ACCOUNT_ID;
                    var key = accountId.toString();
                    if (chargeMapping[key] == null) {
                        chargeMapping[key] = {
                            account: accountId,
                            chargeCount: 0,
                            totalCharge: 0
                        };
                    }
                    chargeMapping[key].chargeCount++;
                    chargeMapping[key].totalCharge += record.TotalCharge;
                }
                fulfil(utils.flattenArray(chargeMapping));
            }, function(err) {
                reject(err);
            });
        });
    }

    function readPaymentRequests(connection) {
        function readCharges() {
            return new Promise(function(fulfil, reject) {
                var extraConditions = getExtraConditions(options);
                var qs = 'Select Distinct pr.Id As PaymentRequestId, ch.PRICE As ChargePrice, ch.ADDITIONAL ' +
                    'From CHARGES ch Inner Join PaymentRequests pr On ch.PaymentRequest=pr.Id And pr.CancelTime Is Null ' +
                    '   Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    'Where ch.DATE_DELETED Is Null And c.SEASON=@season ' + extraConditions;
                connection.request(qs, {season: options.season, region: options.region}).then(function (records) {
                    var chargeMapping = {};
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var key = record.PaymentRequestId.toString();
                        var teamId = record.ADDITIONAL;
                        if (teamId != null)
                            key += '_' + teamId;
                        chargeMapping[key] = record.ChargePrice;
                    }
                    fulfil(chargeMapping);
                }, function(err) {
                    reject(err);
                });
            });
        }
        return new Promise(function(fulfil, reject) {
            var readError = function(err) {
                reject(err);
            };
            var extraConditions = getExtraConditions(options);
            var qs = 'Select pr.Id, pr.TotalAmount, pr.PayerName, pr.[Time], pr.AccountId, tr.Id As TeamId, ' +
                '   tr.Competition As CATEGORY_ID, cm.CATEGORY_NAME, ' +
                '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, ' +
                '   sp.SPORT_ID, sp.SPORT_NAME, ' +
                '   s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL As "symbol", ' +
                '   r.REGION_ID, r.REGION_NAME, ' +
                '   cit.CITY_ID, cit.CITY_NAME, ' +
                '   cc.CATEGORY As "category", ' +
                '   c.IS_CLUBS As IsClubs, ' +
                '   c.IS_LEAGUE As IsLeague, ' +
                '   IsNull(tc.Amount, ch.PRICE) As TeamCharge, ' +
                '   Sum(IsNull(tp.Amount, 0)) As TeamPayment ' +
                'From PaymentRequests pr Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
                '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                '   Left Join TeamCharges tc On tc.PaymentId=pr.Id And tc.TeamId=tr.Id ' +
                '   Left Join TeamPayments tp On tp.PaymentId=pr.Id And tp.TeamId=tr.Id ' +
                '   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                '   Left Join CHARGES ch On t.CHARGE_ID=ch.CHARGE_ID And ch.DATE_DELETED Is Null ' +
                'Where pr.CancelTime Is Null And c.SEASON=@season ' + extraConditions +
                'Group By pr.Id, pr.TotalAmount, pr.PayerName, pr.[Time], pr.AccountId, tr.Id, tr.Competition, cm.CATEGORY_NAME, ' +
                '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, sp.SPORT_ID, sp.SPORT_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL, ' +
                '   r.REGION_ID, r.REGION_NAME, cit.CITY_ID, cit.CITY_NAME, cc.CATEGORY, tc.Amount, ch.PRICE, c.IS_LEAGUE, c.IS_CLUBS';
            var queryParams = {
                season: options.season,
                region: options.region
            };
            connection.request(qs, queryParams).then(function (records) {
                var paymentRequestMapping = {};
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var key = record.Id.toString();
                    var paymentRequest = paymentRequestMapping[key];
                    if (paymentRequest == null) {
                        paymentRequest = {
                            id: record.Id,
                            accountId: record.AccountId,
                            amountToPay: record.TotalAmount,
                            paidAmount: 0,
                            time: record.Time,
                            payerName: record.PayerName.trim(),
                            region: utils.getBasicEntity(record, 'REGION_'),
                            school: utils.getBasicEntity(record, 'SCHOOL_', null, ['symbol']),
                            city: utils.getBasicEntity(record, 'CITY_'),
                            isLeague: record.IsLeague,
                            isClubs: record.IsClubs,
                            teams: [],
                        };
                        paymentRequestMapping[key] = paymentRequest;
                    }
                    paymentRequest.teams.push({
                        id: record.TeamId,
                        amountToPay: record.TeamCharge,
                        amountPaid: record.TeamPayment,
                        sport: utils.getBasicEntity(record, 'SPORT_'),
                        championship: utils.getBasicEntity(record, 'CHAMPIONSHIP_'),
                        category: utils.getBasicEntity(record, 'CATEGORY_', null, ['category'])
                    });
                }

                //read automated charges
                var paymentRequests = utils.flattenArray(paymentRequestMapping);
                readCharges().then(function(chargeMapping) {
                    //when editing payment request, amount is defined per team.
                    paymentRequests.forEach(paymentRequest => {
                        var totalRequestTeams = 0;
                        var totalAmountToPay = 0;
                        var nonEmptyTeamCharges = 0;
                        var chargeKey = paymentRequest.id.toString();
                        if (chargeMapping[chargeKey] != null)
                            paymentRequest.amountToPay = chargeMapping[chargeKey];
                        paymentRequest.teams.forEach(team => {
                            if (team.amountToPay != null) {
                                nonEmptyTeamCharges++;
                            }
                            chargeKey = paymentRequest.id.toString() + '_' + team.id.toString();
                            if (chargeMapping[chargeKey] != null && team.amountToPay == null) {
                                team.amountToPay = chargeMapping[chargeKey];
                            }
                            if (team.amountToPay != null) {
                                totalAmountToPay += parseInt(team.amountToPay, 10);
                            }
                            if (team.amountPaid != null) {
                                paymentRequest.paidAmount += parseInt(team.amountPaid, 10);
                            }
                            totalRequestTeams += 1;
                        });
                        if (nonEmptyTeamCharges === paymentRequest.teams.length) {
                            paymentRequest.amountToPay = totalAmountToPay;
                        }
                        paymentRequest.totalRequestTeams = totalRequestTeams;
                    });
                    //console.log(paymentRequests);
                    fulfil(paymentRequests);
                }, readError)
            }, readError);
        });
    }

    db.connect().then(function (connection) {
        _connection = connection;
        var qs = 'Select a.ACCOUNT_ID, a.ACCOUNT_NAME, ' +
            '   reg.REGION_ID, reg.REGION_NAME, ' +
            '   s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL As "symbol", ' +
            '   cit.CITY_ID, cit.CITY_NAME ' +
            'From ACCOUNTS a Inner Join REGIONS reg On a.REGION_ID=reg.REGION_ID And reg.DATE_DELETED Is Null ' +
            '   Left Join SCHOOLS s On a.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
            'Where a.DATE_DELETED Is Null';
        connection.request(qs, {}).then(function (records) {
            var accounts = {};
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var account = {
                    id: record.ACCOUNT_ID,
                    name: record.ACCOUNT_NAME.trim(),
                    region: utils.getBasicEntity(record, 'REGION_'),
                    school: utils.getBasicEntity(record, 'SCHOOL_', null, ['symbol']),
                    city: utils.getBasicEntity(record, 'CITY_'),
                    sports: [],
                    paymentRequests: [],
                    receipts: [],
                    paymentRequestCount: 0,
                    receiptCount: 0,
                    chargeCount: 0,
                    totalAmount: 0,
                    paidAmount: 0
                };
                accounts[account.id.toString()] = account;
            }
            readPaymentRequests(connection).then(function(paymentRequests) {
                readAccountCredits(connection).then(function(accountCredits) {
                    readAccountCharges(connection).then(function(accountCharges) {
                        connection.complete();
                        _connection = null;
                        var plainAccounts = utils.flattenArray(accounts);
                        var accountNameMapping = {};
                        plainAccounts.forEach(a => {
                            var mainKey = a.name.replace(' (בית ספר)', '');
                            var subKey = a.name.indexOf('עבור בית ספר') > 0 ? a.name.split('בית ספר ')[1].replace(')', '')
                                : '';
                            if (mainKey.length > 0) {
                                if (!accountNameMapping[mainKey])
                                    accountNameMapping[mainKey] = {};
                                accountNameMapping[mainKey]['main'] = a.id;
                            }
                            if (subKey.length > 0) {
                                if (!accountNameMapping[subKey])
                                    accountNameMapping[subKey] = {};
                                accountNameMapping[subKey]['sub'] = a.id;
                            }
                        });

                        //look for account based on the payer name:
                        var matchingAccount = null;
                        paymentRequests.forEach(paymentRequest => {
                            if (!paymentRequest.accountId) {
                                matchingAccount = accountNameMapping[paymentRequest.payerName];
                                if (matchingAccount != null)
                                    paymentRequest.accountId = matchingAccount.main || matchingAccount.sub;
                            }
                            if (paymentRequest.accountId) {
                                matchingAccount = accounts[paymentRequest.accountId.toString()];
                                if (matchingAccount != null)
                                    matchingAccount.paymentRequests.push(paymentRequest);
                            }
                        });

                        //apply sports, championships, and categories from payment requests to accounts to enable filters
                        for (var accountId in accounts) {
                            if (accounts.hasOwnProperty(accountId)) {
                                var totalTeams = 0;
                                var account = accounts[accountId];
                                var sportMapping = {};
                                account.paymentRequests.forEach(paymentRequest => {
                                    account.totalAmount += utils.toIntOrDefault(paymentRequest.amountToPay);
                                    account.paidAmount += utils.toIntOrDefault(paymentRequest.amountPaid);
                                    paymentRequest.teams.forEach(team => {
                                        var amountToPay = utils.toIntOrDefault(team.amountToPay);
                                        var amountPaid = utils.toIntOrDefault(team.amountPaid);
                                        var sportKey = team.sport.id.toString();
                                        var championshipKey = team.championship.id.toString();
                                        var categoryKey = team.category.id.toString();
                                        var sport = sportMapping[sportKey];
                                        if (sport == null) {
                                            sport = {
                                                id: team.sport.id,
                                                name: team.sport.name,
                                                totalAmount: 0,
                                                paidAmount: 0,
                                                championships: {}
                                            };
                                            sportMapping[sportKey] = sport;
                                        }
                                        sport.totalAmount += amountToPay;
                                        sport.paidAmount += amountPaid;
                                        var championship = sport.championships[championshipKey];
                                        if (championship == null) {
                                            championship = {
                                                id: team.championship.id,
                                                name: team.championship.name,
                                                totalAmount: 0,
                                                paidAmount: 0,
                                                categories: {}
                                            };
                                            sport.championships[championshipKey] = championship;
                                        }
                                        championship.totalAmount += amountToPay;
                                        championship.paidAmount += amountPaid;
                                        var category = championship.categories[categoryKey];
                                        if (category == null) {
                                            category = {
                                                id: team.category.id,
                                                name: team.category.name,
                                                category: team.category.category,
                                                totalAmount: 0,
                                                paidAmount: 0,
                                            };
                                            championship.categories[categoryKey] = category;
                                        }
                                        category.totalAmount += amountToPay;
                                        category.paidAmount += amountPaid;
                                        totalTeams += 1;
                                    });
                                });
                                account.remainingAmount = account.totalAmount - account.paidAmount;
                                account.sports = utils.flattenArray(sportMapping);
                                account.paymentRequestCount = account.paymentRequests.length;
                                account.sports.forEach(sport => {
                                    sport.remainingAmount = sport.totalAmount - sport.paidAmount;
                                    sport.championships = utils.flattenArray(sport.championships);
                                    sport.championships.forEach(championship => {
                                        championship.remainingAmount = championship.totalAmount - championship.paidAmount;
                                        championship.categories = utils.flattenArray(championship.categories);
                                        championship.categories.forEach(category => {
                                            category.remainingAmount = category.totalAmount - category.paidAmount;
                                        });
                                    });
                                });
                                account.totalTeams = totalTeams;
                            }
                        }

                        //apply credits
                        accountCredits.forEach(accountCredit => {
                            var accountId = accountCredit.account;
                            var matchingAccount = accounts[accountId.toString()];
                            if (matchingAccount != null) {
                                matchingAccount.paidAmount += accountCredit.totalPaid;
                                matchingAccount.receipts = accountCredit.receipts;
                                matchingAccount.receiptCount = accountCredit.receipts.length;
                                matchingAccount.remainingAmount = matchingAccount.totalAmount - matchingAccount.paidAmount;
                            }
                        });

                        //apply charges
                        accountCharges.forEach(accountCharge => {
                            var accountId = accountCharge.account;
                            var matchingAccount = accounts[accountId.toString()];
                            if (matchingAccount != null) {
                                matchingAccount.totalAmount += accountCharge.totalCharge;
                                matchingAccount.chargeCount = accountCharge.chargeCount;
                                matchingAccount.remainingAmount = matchingAccount.totalAmount - matchingAccount.paidAmount;
                            }
                        });

                        //take only accounts with any activity
                        var activeAccounts = utils.flattenArray(accounts).filter(account => {
                            return account.paymentRequests.length > 0 || account.totalAmount !== 0 || account.paidAmount !== 0;
                        })

                        //filters
                        if (options.region != null) {
                            var regionId = parseInt(options.region, 10);
                            activeAccounts = activeAccounts.filter(account => account.region.id === regionId);
                            activeAccounts.forEach(account => {
                                account.paymentRequests = account.paymentRequests.filter(paymentRequest => paymentRequest.region.id === regionId);
                                account.paymentRequestCount = account.paymentRequests.length;
                            });
                        }
                        if (options.account != null) {
                            activeAccounts = activeAccounts.filter(account => account.id == options.account);
                        }

                        callback(null, activeAccounts);
                    }, error); //end read account charges
                }, error); //end read account credits
            }, error); //end read payment requests
        }, error); //end reading accounts
    }, error); //end database connection

    /*
    getSeasonRange(options.season, function(err, seasonRange) {
        if (err) {
            callback(err);
        } else {
            var seasonStart = seasonRange.Start;
            var seasonEnd = seasonRange.End;
            var checkCredits = options.checkCredits;
            if (typeof checkCredits === 'undefined' || checkCredits == null)
                checkCredits = true;
            db.connect().then(function (connection) {
                _connection = connection;
                var regionFilter = ''; // (options.region != null) ? ' And IsNull(r3.REGION_ID, IsNull(r2.REGION_ID, r.REGION_ID))=@region ' : '';
                var regionFilter2 = ''; // (options.region != null) ? ' And IsNull(r2.REGION_ID, r.REGION_ID)=@region ' : '';
                var qs = 'Select  pr.Id As PaymentRequestId, pr.[Time], IsNull(a2.ACCOUNT_ID, a.ACCOUNT_ID) As ACCOUNT_ID, ' +
                    '   \'בית ספר \' + REPLACE(IsNull(a2.ACCOUNT_NAME, a.ACCOUNT_NAME), \' (בית ספר)\', \'\') As ACCOUNT_NAME, ' +
                    '   IsNull(r3.REGION_ID, IsNull(r2.REGION_ID, r.REGION_ID)) As REGION_ID, ' +
                    '   IsNull(r3.REGION_NAME, IsNull(r2.REGION_NAME, r.REGION_NAME)) As REGION_NAME, ' +
                    '   IsNull(s3.SCHOOL_ID, IsNull(s2.SCHOOL_ID, s.SCHOOL_ID)) As SCHOOL_ID, ' +
                    '   IsNull(s3.SCHOOL_NAME, IsNull(s2.SCHOOL_NAME, s.SCHOOL_NAME)) As SCHOOL_NAME, ' +
                    '   IsNull(s3.SYMBOL, IsNull(s2.SYMBOL, s.SYMBOL)) As SYMBOL, ' +
                    '   IsNull(cit3.CITY_ID, IsNull(cit2.CITY_ID, cit.CITY_ID)) As CITY_ID, ' +
                    '   IsNull(cit3.CITY_NAME, IsNull(cit2.CITY_NAME, cit.CITY_NAME)) As CITY_NAME, ' +
                    '   c.SPORT_ID, sp.SPORT_NAME, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, ' +
                    '   cc.CHAMPIONSHIP_CATEGORY_ID As CATEGORY_ID, cm.CATEGORY_NAME, ' +
                    '   IsNull(pr.TotalAmount, 0) As TotalAmount, ' +
                    '   IsNull(ct.PRICE, 0) + IsNull(cp.PRICE, 0) + IsNull(cr.PRICE, 0) As PaidAmount ' +
                    'From PaymentRequests pr Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                    '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                    '   Inner Join ACCOUNTS a On s.SCHOOL_ID=a.SCHOOL_ID And a.DATE_DELETED Is Null ' +
                    '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
                    '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                    '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                    '   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                    '   Left Join ACCOUNTS a2 On pr.AccountId=a2.ACCOUNT_ID And a2.DATE_DELETED Is Null ' +
                    '   Left Join SCHOOLS s2 On a.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null ' +
                    '   Left Join SCHOOLS s3 On a2.SCHOOL_ID=s3.SCHOOL_ID And s3.DATE_DELETED Is Null ' +
                    '   Left Join CITIES cit2 On s2.CITY_ID=cit2.CITY_ID And cit2.DATE_DELETED Is Null ' +
                    '   Left Join CITIES cit3 On s3.CITY_ID=cit3.CITY_ID And cit3.DATE_DELETED Is Null ' +
                    '   Left Join REGIONS r2 On s2.REGION_ID=r2.REGION_ID And r2.DATE_DELETED Is Null ' +
                    '   Left Join REGIONS r3 On a2.REGION_ID=r3.REGION_ID And r3.DATE_DELETED Is Null ' +
                    '   Left Join CHARGES ct On t.CHARGE_ID=ct.CHARGE_ID And ct.[STATUS]=2 And ct.DATE_DELETED Is Null ' + //--old system charges
                    '   Left Join CHARGES cp On cp.PaymentRequest=pr.Id And cp.[STATUS]=2 And cp.ADDITIONAL=tr.Id And cp.DATE_DELETED Is Null ' + //--auto charges per team
                    '   Left Join CHARGES cr On cr.PaymentRequest=pr.Id And cr.[STATUS]=2 And cr.ADDITIONAL=0 And cr.DATE_DELETED Is Null ' + //--auto charges remaining
                    'Where pr.CancelTime Is Null And pr.PayerName=s.SCHOOL_NAME And c.SEASON=@season ' + regionFilter +
                    'Union All ' +
                    'Select  pr.Id As PaymentRequestId, pr.[Time], IsNull(a2.ACCOUNT_ID, a.ACCOUNT_ID) As ACCOUNT_ID, ' +
                    '   REPLACE(IsNull(a2.ACCOUNT_NAME, a.ACCOUNT_NAME), \' בית ספר\', \'\') As ACCOUNT_NAME, ' +
                    //'   r.REGION_ID, r.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL, cit.CITY_ID, cit.CITY_NAME, ' +
                    '   IsNull(r3.REGION_ID, IsNull(r2.REGION_ID, r.REGION_ID)) As REGION_ID, ' +
                    '   IsNull(r3.REGION_NAME, IsNull(r2.REGION_NAME, r.REGION_NAME)) As REGION_NAME, ' +
                    '   IsNull(s3.SCHOOL_ID, IsNull(s2.SCHOOL_ID, s.SCHOOL_ID)) As SCHOOL_ID, ' +
                    '   IsNull(s3.SCHOOL_NAME, IsNull(s2.SCHOOL_NAME, s.SCHOOL_NAME)) As SCHOOL_NAME, ' +
                    '   IsNull(s3.SYMBOL, IsNull(s2.SYMBOL, s.SYMBOL)) As SYMBOL, ' +
                    '   IsNull(cit3.CITY_ID, IsNull(cit2.CITY_ID, cit.CITY_ID)) As CITY_ID, ' +
                    '   IsNull(cit3.CITY_NAME, IsNull(cit2.CITY_NAME, cit.CITY_NAME)) As CITY_NAME, ' +
                    '   c.SPORT_ID, sp.SPORT_NAME, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, ' +
                    '   cc.CHAMPIONSHIP_CATEGORY_ID As CATEGORY_ID, cm.CATEGORY_NAME, ' +
                    '   IsNull(pr.TotalAmount, 0) As TotalAmount, ' +
                    '   IsNull(ct.PRICE, 0) + IsNull(cp.PRICE, 0) + IsNull(cr.PRICE, 0) As PaidAmount ' +
                    'From PaymentRequests pr Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                    '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                    '   Inner Join ACCOUNTS a On a.DATE_DELETED Is Null  ' +
                    '       And a.ACCOUNT_NAME= pr.PayerName + \' (עבור בית ספר \' + s.SCHOOL_NAME + \')\' ' +
                    '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
                    '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                    '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                    '   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                    '   Left Join ACCOUNTS a2 On pr.AccountId=a2.ACCOUNT_ID And a2.DATE_DELETED Is Null ' +
                    '       And a2.ACCOUNT_NAME= pr.PayerName + \' (עבור בית ספר \' + s.SCHOOL_NAME + \')\' ' +
                    '   Left Join SCHOOLS s2 On a.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null ' +
                    '   Left Join SCHOOLS s3 On a2.SCHOOL_ID=s3.SCHOOL_ID And s3.DATE_DELETED Is Null ' +
                    '   Left Join CITIES cit2 On s2.CITY_ID=cit2.CITY_ID And cit2.DATE_DELETED Is Null ' +
                    '   Left Join CITIES cit3 On s3.CITY_ID=cit3.CITY_ID And cit3.DATE_DELETED Is Null ' +
                    '   Left Join REGIONS r2 On s2.REGION_ID=r2.REGION_ID And r2.DATE_DELETED Is Null ' +
                    '   Left Join REGIONS r3 On a2.REGION_ID=r3.REGION_ID And r3.DATE_DELETED Is Null ' +
                    '   Left Join CHARGES ct On t.CHARGE_ID=ct.CHARGE_ID And ct.[STATUS]=2 And ct.DATE_DELETED Is Null ' + //--old system charges
                    '   Left Join CHARGES cp On cp.PaymentRequest=pr.Id And cp.[STATUS]=2 And cp.ADDITIONAL=tr.Id And cp.DATE_DELETED Is Null ' + //--auto charges per team
                    '   Left Join CHARGES cr On cr.PaymentRequest=pr.Id And cr.[STATUS]=2 And cr.ADDITIONAL=0 And cr.DATE_DELETED Is Null ' + //--auto charges remaining
                    'Where pr.CancelTime Is Null And pr.PayerName<>s.SCHOOL_NAME And c.SEASON=@season ' + regionFilter +
                    'Union All ' +
                    'Select  Null As PaymentRequestId, Null As \'Time\', a.ACCOUNT_ID, ' +
                    '   \'בית ספר \' + REPLACE(a.ACCOUNT_NAME, \' (בית ספר)\', \'\') As ACCOUNT_NAME, ' +
                    //'   r.REGION_ID, r.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL, cit.CITY_ID, cit.CITY_NAME, ' +
                    '   IsNull(r2.REGION_ID, r.REGION_ID) As REGION_ID, ' +
                    '   IsNull(r2.REGION_NAME, r.REGION_NAME) As REGION_NAME, ' +
                    '   IsNull(s2.SCHOOL_ID, s.SCHOOL_ID) As SCHOOL_ID, ' +
                    '   IsNull(s2.SCHOOL_NAME, s.SCHOOL_NAME) As SCHOOL_NAME, ' +
                    '   IsNull(s2.SYMBOL, s.SYMBOL) As SYMBOL, ' +
                    '   IsNull(cit2.CITY_ID, cit.CITY_ID) As CITY_ID, ' +
                    '   IsNull(cit2.CITY_NAME, cit.CITY_NAME) As CITY_NAME, ' +
                    '   c.SPORT_ID, sp.SPORT_NAME, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, ' +
                    '   cc.CHAMPIONSHIP_CATEGORY_ID As CATEGORY_ID, cm.CATEGORY_NAME, ' +
                    '   ch.PRICE*ch.AMOUNT As TotalAmount, ' +
                    '   Case ch.[STATUS] When 2 Then ch.PRICE*ch.AMOUNT Else 0 End As PaidAmount ' +
                    'From CHARGES ch Inner Join TEAMS t On t.CHARGE_ID=ch.CHARGE_ID And t.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                    '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                    '   Inner Join ACCOUNTS a On ch.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null ' +
                    '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
                    '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                    '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                    '   Left Join SCHOOLS s2 On a.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null ' +
                    '   Left Join CITIES cit2 On s2.CITY_ID=cit2.CITY_ID And cit2.DATE_DELETED Is Null ' +
                    '   Left Join REGIONS r2 On s2.REGION_ID=r2.REGION_ID And r2.DATE_DELETED Is Null ' +
                    '   Left Join TeamRegistrations tr On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                    'Where ch.DATE_DELETED Is Null And tr.Id Is Null And ch.PRICE>0 And c.SEASON=@season' + regionFilter2;
                var queryParams = {
                    season: options.season,
                    region: options.region
                };
                //console.log(qs);
                //console.log(queryParams);
                connection.request(qs, queryParams).then(function (records) {
                    var accountMapping = {};
                    //console.log(records);
                    var zeroFields = ['totalAmount', 'paidAmount'];
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var key = record.ACCOUNT_ID.toString();
                        var curTotalAmount = record.TotalAmount;
                        var curPaidAmount = record.PaidAmount;
                        var paymentRequestId = record.PaymentRequestId;
                        var account = accountMapping[key];
                        if (!account) {
                            account = {
                                id: record.ACCOUNT_ID,
                                name: record.ACCOUNT_NAME.trim(),
                                region: utils.getBasicEntity(record, 'REGION_'),
                                school: utils.getBasicEntity(record, 'SCHOOL_'),
                                city: utils.getBasicEntity(record, 'CITY_'),
                                sports: [],
                                paymentRequests: [],
                                receiptCount: 0,
                                totalAmount: 0,
                                paidAmount: 0
                            };
                            account.school.symbol = record.SYMBOL;
                            accountMapping[key] = account;
                        }
                        account.paidAmount += curPaidAmount;
                        if (paymentRequestId != null) {
                            if (!utils.arrayContains(account.paymentRequests, paymentRequestId, 'id')) {
                                account.paymentRequests.push({
                                    id: paymentRequestId,
                                    amountToPay: curTotalAmount,
                                    paidAmount: curPaidAmount,
                                    time: record.Time
                                });
                                account.totalAmount += curTotalAmount;
                            }
                        } else {
                            account.totalAmount += curTotalAmount;
                        }
                        var sport = addIfMissing(record, account, 'SPORT_', 'sports', 'championships', zeroFields);
                        sport.totalAmount += curTotalAmount;
                        sport.paidAmount += curPaidAmount;
                        var championship = addIfMissing(record, sport, 'CHAMPIONSHIP_', 'championships', 'categories', zeroFields);
                        if (account.region.id > 0 && championship.name.indexOf(' ' + account.region.name) < 0) {
                            championship.name += ' ' + account.region.name;
                        }
                        championship.totalAmount += curTotalAmount;
                        championship.paidAmount += curPaidAmount;
                        var category = addIfMissing(record, championship, 'CATEGORY_', 'categories', '', zeroFields);
                        category.totalAmount += curTotalAmount;
                        category.paidAmount += curPaidAmount;
                    }
                    var accounts = [];
                    for (var accountId in accountMapping) {
                        var curAccount = accountMapping[accountId];
                        curAccount.remainingAmount = curAccount.totalAmount - curAccount.paidAmount;
                        curAccount.paymentRequestCount = curAccount.paymentRequests.length;
                        curAccount.sports.forEach(sport => {
                            sport.remainingAmount = sport.totalAmount - sport.paidAmount;
                            sport.championships.forEach(championship => {
                                championship.remainingAmount = championship.totalAmount - championship.paidAmount;
                                championship.categories.forEach(category => category.remainingAmount = category.totalAmount - category.paidAmount);
                            });
                        });
                        accounts.push(curAccount);
                    }
                    qs = 'Select tp.PaymentId, Sum(IsNull(tp.Amount, 0)) As TotalAmount, Sum(IsNull(tc.Amount, 0)) As TotalChargeOverride ' +
                        'From TeamPayments tp Left Join TeamCharges tc On tp.TeamId=tc.TeamId And tp.PaymentId=tc.PaymentId ' +
                        'Group By tp.PaymentId';
                    connection.request(qs, queryParams).then(function (teamPaymentRecords) {
                        for (var i = 0; i < teamPaymentRecords.length; i++) {
                            var teamPaymentRecord = teamPaymentRecords[i];
                            accounts.forEach(account => {
                                if (account.paymentRequests.length > 0) {
                                    var paymentId = teamPaymentRecord.PaymentId;
                                    var matchingPayment = account.paymentRequests.find(pr => pr.id == paymentId);
                                    if (matchingPayment != null) {
                                        matchingPayment.amountToPay = teamPaymentRecord.TotalAmount;
                                        var diff = matchingPayment.paidAmount - teamPaymentRecord.TotalChargeOverride;
                                        matchingPayment.paidAmount = teamPaymentRecord.TotalChargeOverride;
                                        if (diff !== 0) {
                                            account.totalAmount += diff;
                                        }
                                    }
                                }
                            });
                        }
                        if (accounts.length > 0 && checkCredits) {
                            qs = 'Select c.ACCOUNT_ID, ' +
                                '   Case When a.SCHOOL_ID Is Null Then REPLACE(a.ACCOUNT_NAME, \' בית ספר\', \'\') ' +
                                '   Else \'בית ספר \' + REPLACE(a.ACCOUNT_NAME, \' (בית ספר)\', \'\') End As ACCOUNT_NAME, ' +
                                '   reg.REGION_ID, reg.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL, ' +
                                '   cit.CITY_ID, cit.CITY_NAME, ' +
                                '   Count(Distinct r2.RECEIPT_ID) As ReceiptCount, ' +
                                '   Sum(c.CREDIT) As PaidAmount ' +
                                'From CREDITS c Inner Join RECEIPTS r On c.RECEIPT_ID=r.RECEIPT_ID And r.DATE_DELETED Is Null ' +
                                '   Inner Join ACCOUNTS a On c.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null ' +
                                '   Inner Join REGIONS reg On c.REGION_ID=reg.REGION_ID And reg.DATE_DELETED Is Null ' +
                                '   Left Join SCHOOLS s On a.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                                '   Left Join RECEIPTS r2 On c.ACCOUNT_ID=r2.ACCOUNT_ID And r2.DATE_DELETED Is Null And r2.RECEIPT_DATE Between @start And @end ' +
                                'Where c.DATE_DELETED Is Null And r.RECEIPT_DATE Between @start And @end ' + regionFilter +
                                'Group By c.ACCOUNT_ID, a.ACCOUNT_NAME, a.SCHOOL_ID, reg.REGION_ID, reg.REGION_NAME, ' +
                                '   s.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL, cit.CITY_ID, cit.CITY_NAME ' +
                                'Having Sum(c.CREDIT)>0';
                            var queryParams = {
                                start: seasonStart,
                                end: seasonEnd,
                                region: options.region
                            };
                            connection.request(qs, queryParams).then(function (records) {
                                var accountReceiptsMapping = {};
                                for (var i = 0; i < records.length; i++) {
                                    var record = records[i];
                                    var key = record.ACCOUNT_ID.toString();
                                    accountReceiptsMapping[key] = record;
                                }
                                connection.complete();
                                var existingAccounts = {};
                                accounts.forEach(account => {
                                    var key = account.id.toString();
                                    var accountData = accountReceiptsMapping[key];
                                    if (accountData) {
                                        account.receiptCount = accountData.ReceiptCount || 0;
                                        if (accountData.PaidAmount) {
                                            account.paidAmount = accountData.PaidAmount;
                                            account.remainingAmount = account.totalAmount - account.paidAmount;
                                        }
                                    }
                                    existingAccounts[key] = true;
                                });

                                //add accounts with receipts but without charges or payment requests
                                for (var accountId in accountReceiptsMapping) {
                                    if (!existingAccounts[accountId]) {
                                        var existingRecord = accountReceiptsMapping[accountId];
                                        var newAccount = {
                                            id: existingRecord.ACCOUNT_ID,
                                            name: existingRecord.ACCOUNT_NAME.trim(),
                                            region: utils.getBasicEntity(existingRecord, 'REGION_'),
                                            school: utils.getBasicEntity(existingRecord, 'SCHOOL_ID', 'SCHOOL_NAME', ['SYMBOL']),
                                            city: utils.getBasicEntity(existingRecord, 'CITY_'),
                                            sports: [],
                                            paymentRequests: [],
                                            receiptCount: existingRecord.ReceiptCount,
                                            totalAmount: 0,
                                            paidAmount: existingRecord.PaidAmount
                                        };
                                        newAccount.remainingAmount = newAccount.totalAmount - newAccount.paidAmount;
                                        newAccount.paymentRequestCount = newAccount.paymentRequests.length;
                                        accounts.push(newAccount);
                                        existingAccounts[accountId] = true;
                                    }
                                }

                                callback(null, accounts);
                            }, function (err) {
                                connection.complete();
                                callback(err);
                            });
                        } else {
                            connection.complete();
                            callback(null, accounts);
                        }
                    }, function(err) {
                        connection.complete();
                        callback(err);
                    });
                }, function (err) {
                    connection.complete();
                    callback(err);
                });
            }, function (err) {
                callback(err);
            });
        }
    });
    */
}

function createNewAccount(chargeData, transaction) {
    return new Promise(function (fulfill, reject) {
        var error = function(err) {
            reject(err);
        };
        var accountId = parseInt(chargeData.account, 10);
        if (isNaN(accountId) || accountId <= 0) {
            var newAccountName = (chargeData.newAccount != null) ? (chargeData.newAccount.name || '').trim() : '';
            if (newAccountName.length > 0) {
                var newAccountSchool = chargeData.newAccount.school;
                if (newAccountSchool)
                    newAccountName += ' (בית ספר)';
                var qs = "Insert Into ACCOUNTS (REGION_ID, ACCOUNT_NAME, SCHOOL_ID) Values (@region, @name, @school)";
                var queryParams = {
                    'region': chargeData.region,
                    'name': newAccountName,
                    'school': newAccountSchool
                };
                transaction.request(qs, queryParams).then(function () {
                    qs = 'Select Max(ACCOUNT_ID) As LatestAccountId From ACCOUNTS Where DATE_DELETED Is Null';
                    transaction.request(qs, {}).then(function(records) {
                        if (records != null && records.length > 0) {
                            fulfill(records[0]['LatestAccountId']);
                        } else {
                            reject('new account not found!')
                        }
                    }, error);
                }, error);
            } else {
                reject('Missing or invalid account info');
            }
        } else {
            fulfill(accountId);
        }
    });
}

Finance.prototype.getProducts = function (callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select PRODUCT_ID as \"Id\", PRODUCT_NAME as \"Name\", PRICE as \"Price\" " +
                    "from PRODUCTS " +
                    "where DATE_DELETED is null")
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                result.push({id: record.Id, name: record.Name, price: parseInt(record.Price)});
                            }

                            callback(null, result);
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Finance.prototype.getProduct = function (product, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select PRODUCT_ID as \"Id\", PRODUCT_NAME as \"Name\", PRICE as \"Price\" " +
                    "from PRODUCTS " +
                    "where PRODUCT_ID = @product and DATE_DELETED is null",
                    {product: product})
                    .then(
                        function (records) {
                            connection.complete();

                            if (records.length > 0) {
                                var record = records[0];
                                callback(null, {
                                    id: record.Id,
                                    name: record.Name,
                                    price: record.Price
                                });
                            }
                            else {
                                callback();
                            }
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Finance.prototype.getPaymentRequests = function (options, callback) {
    if (options == null) {
        options = {};
    }
    options.checkCredits = false;
    getAllAccounts(this.db, options, function(err, accounts) {
        if (err) {
            callback(err);
            return;
        }
        var paymentRequests = [];
        accounts.forEach(account => {
            paymentRequests.push(...account.paymentRequests.map(paymentRequest => {
                return {
                    id: paymentRequest.id,
                    order: paymentRequest.id,
                    account: {
                        id: account.id,
                        name: account.name,
                        sports: account.sports
                    },
                    totalAmount: paymentRequest.amountToPay,
                    time: paymentRequest.time,
                    paidAmount: paymentRequest.paidAmount,
                    region: account.region,
                    school: account.school,
                    city: account.city,
                    isClubs: paymentRequest.isClubs,
                    isLeague: paymentRequest.isLeague,
                    remainingAmount: paymentRequest.amountToPay - paymentRequest.paidAmount,
                    totalRequestTeams: paymentRequest?.teams?.length,
                };
            }));
        });
        callback(null, paymentRequests);
    });
};

Finance.prototype.getReceipts = function (options, callback) {
    function getQueryFilters(accounts) {
        return new Promise(function(fulfil, reject) {
            if (options.receipt_ids) {
                const sqlPart = Array.isArray(options.receipt_ids) ? options.receipt_ids.join(', ') : options.receipt_ids;
                fulfil(`r.RECEIPT_ID In (${sqlPart})`);
            } else if (options.account) {
                var filter = 'r.ACCOUNT_ID=@account And ' +
                    'r.RECEIPT_DATE Between dbo.GetSeasonStart(@season) And dbo.GetSeasonEnd(@season)';
                fulfil(filter);
            } else {
                if (options.receipt) {
                    fulfil('r.RECEIPT_ID=@receipt');
                } else {
                    if (accounts == null) {
                        reject('no accounts found');
                    } else {
                        var receiptMapping = {};
                        accounts.forEach(account => {
                            if (account.receipts != null) {
                                account.receipts.forEach(receiptId => {
                                    receiptMapping[receiptId.toString()] = true;
                                });
                            }
                        });
                        var receipts = [];
                        for (var receiptId in receiptMapping) {
                            receipts.push(parseInt(receiptId, 10));
                        }
                        if (receipts.length > 0) {
                            fulfil('r.RECEIPT_ID In (' + receipts.join(', ') + ')')
                        } else {
                            reject('no account receipts found');
                        }
                    }
                }
            }
            /*
            if (options.account) {
                getAllAccounts(db, options, function(err, accounts) {
                    if (err) {
                        reject(err);
                    } else {
                        if (accounts == null || accounts.length === 0) {
                            reject('account not found');
                        } else {
                            var account = accounts[0];
                            var receipts = account.receipts || [];
                            if (receipts.length > 0) {
                                fulfil('r.RECEIPT_ID In (' + receipts.join(', ') + ')')
                            } else {
                                reject('no receipts for this account')
                            }
                        }
                    }
                });
            } else {
                var filters = ['r.RECEIPT_DATE Between dbo.GetSeasonStart(@season) And dbo.GetSeasonEnd(@season)'];
                if (options.region != null) {
                    filters.push('r.REGION_ID=@region');
                }
                fulfil(filters.join(' AND '));
            }
            */
        });
    }
    if (options == null) {
        options = {};
    }
    var error = function (err) {
        callback(err);
    };
    var db = this.db;
    getAllAccounts(db, options, function(err, accounts) {
        if (err) {
            callback(err);
            return;
        }
        getQueryFilters(accounts).then(function(queryFilters) {
            db.connect().then(function (connection) {
                var qs = 'Select r.RECEIPT_ID, r.[NUMBER], r.RECEIPT_DATE, r.RECEIPT_SUM, r.REMARKS, ' +
                    '   reg.REGION_ID, reg.REGION_NAME, a.ACCOUNT_ID, a.ACCOUNT_NAME, ' +
                    '   IsNull(a.ADDRESS, s.ADDRESS) As ACCOUNT_ADDRESS, ' +
                    '   a.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL, ' +
                    '   cit.CITY_ID, cit.CITY_NAME,  ' +
                    '   Count(Distinct p.PAYMENT_ID) As PaymentCount, ' +
                    '   Count(Distinct c.ACCOUNT_ID) As CreditedAccounts, ' +
                    '   Count(Distinct tp.PaymentId) As PaymentRequestCount ' +
                    'From RECEIPTS r Inner Join REGIONS reg On r.REGION_ID=reg.REGION_ID And reg.DATE_DELETED Is Null ' +
                    '   Inner Join ACCOUNTS a On r.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null ' +
                    '   Left Outer Join CREDITS c On c.RECEIPT_ID=r.RECEIPT_ID And c.DATE_DELETED Is Null ' +
                    '   Left Outer Join PAYMENTS p On p.RECEIPT_ID=r.RECEIPT_ID And p.DATE_DELETED Is Null ' +
                    '   Left Join SCHOOLS s On a.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                    '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                    '   Left Join TeamPayments tp On tp.ReceiptId=r.RECEIPT_ID ' +
                    'Where r.DATE_DELETED Is Null And ' + queryFilters +
                    ' Group By r.RECEIPT_ID, r.[NUMBER], r.RECEIPT_DATE, r.RECEIPT_SUM, r.REMARKS, ' +
                    '   reg.REGION_ID, reg.REGION_NAME, a.ACCOUNT_ID, a.SCHOOL_ID, a.ACCOUNT_NAME, ' +
                    '   s.SCHOOL_NAME, s.SYMBOL, cit.CITY_ID, cit.CITY_NAME, a.ADDRESS, s.ADDRESS ' +
                    'Order By r.RECEIPT_DATE Desc';
                var queryParams = {
                    season: options.season,
                    region: options.region,
                    account: options.account,
                    receipt: options.receipt
                };
                //console.log(qs);
                //console.log(queryParams);
                connection.request(qs, queryParams).then(function (records) {
                    connection.complete();
                    var receipts = [];
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var receipt = {
                            id: record.RECEIPT_ID,
                            number: record.NUMBER,
                            date: record.RECEIPT_DATE,
                            sum: record.RECEIPT_SUM,
                            remarks: record.REMARKS,
                            paymentCount: record.PaymentCount,
                            creditedAccounts: record.CreditedAccounts,
                            paymentRequests: record.PaymentRequestCount,
                            account: utils.getBasicEntity(record, 'ACCOUNT_'),
                            region: utils.getBasicEntity(record, 'REGION_'),
                            school: utils.getBasicEntity(record, 'SCHOOL_'),
                            city: utils.getBasicEntity(record, 'CITY_')
                        };
                        receipt.account.address = record['ACCOUNT_ADDRESS'];
                        if (receipt.school != null) {
                            receipt.school.symbol = record.SYMBOL;
                        }
                        receipts.push(receipt);
                    }
                    var accountSportMapping = {};
                    accounts.forEach(account => {
                        accountSportMapping[account.id.toString()] = account.sports;
                    });
                    //console.log(accountSportMapping);
                    receipts.forEach(receipt => {
                        if (receipt.account.id) {
                            receipt.account.sports = accountSportMapping[receipt.account.id.toString()] || [];
                        }
                    });
                    callback(null, receipts);
                }, function (err) {
                    connection.complete();
                    callback(err);
                });
            }, error);
        }, error)
    });
};

Finance.prototype.getReceiptPayments = function (receiptId, callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select PAYMENT_ID, ' +
            '   dbo.TranslatePaymentType(PAYMENT_TYPE) As \'אמצעי תשלום\', ' +
            '   PAYMENT_SUM As \'סכום\', ' +
            '   [dbo].TranslateBankNumber(BANK) As \'בנק\', ' +
            '   BANK_BRANCH As \'סניף\', ' +
            '   BANK_ACCOUNT As \'חשבון\', ' +
            '   [REFERENCE] As \'אסמכתא\', ' +
            '   dbo.PrettifyDate(PAYMENT_DATE) As \'תאריך פרעון\' ' +
            'From PAYMENTS ' +
            'Where DATE_DELETED Is Null And RECEIPT_ID=@receipt And PAYMENT_TYPE<>3';
        var queryParams = {
            receipt: receiptId
        };
        connection.request(qs, queryParams).then(function (nonVisaRecords) {
            qs = 'Select PAYMENT_ID, ' +
                '   dbo.TranslatePaymentType(PAYMENT_TYPE) As \'אמצעי תשלום\', ' +
                '   PAYMENT_SUM As \'סכום\', ' +
                '   [dbo].TranslateCreditCardType(CREDIT_CARD_TYPE) As \'סוג כרטיס\', ' +
                '   CREDIT_CARD_LAST_DIGITS As \'4 ספרות אחרונות\', ' +
                '   dbo.PrettifyDate(CREDIT_CARD_EXPIRE_DATE) As \'תוקף כרטיס\', ' +
                '   CREDIT_CARD_PAYMENTS As \'מס\'\' תשלומים\' ' +
                'From PAYMENTS ' +
                'Where DATE_DELETED Is Null And RECEIPT_ID=@receipt And PAYMENT_TYPE=3';
            connection.request(qs, queryParams).then(function (visaRecords) {
                connection.complete();
                var paymentArrays = [];
                var record = null;
                if (nonVisaRecords.length > 0) {
                    var nonVisaPayments = [];
                    for (var i = 0; i < nonVisaRecords.length; i++) {
                        record = nonVisaRecords[i];
                        var nonVisaPayment = utils.makeShallowCopy(record);
                        nonVisaPayments.push(nonVisaPayment);
                    }
                    paymentArrays.push(nonVisaPayments);
                }
                if (visaRecords.length > 0) {
                    var visaPayments = [];
                    for (var i = 0; i < visaRecords.length; i++) {
                        record = visaRecords[i];
                        var visaPayment = utils.makeShallowCopy(record);
                        visaPayments.push(visaPayment);
                    }
                    paymentArrays.push(visaPayments);
                }
                if (paymentArrays.length === 1) {
                    callback(null, paymentArrays[0]);
                } else {
                    callback(null, paymentArrays);
                }
            }, function (err) {
                connection.complete();
                callback(err);
            });
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getReceiptCreditedAccounts = function (receiptId, callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select c.CREDIT_ID, ' +
            '   Case When a.SCHOOL_ID Is Null Then REPLACE(a.ACCOUNT_NAME, \' בית ספר\', \'\')  ' +
            '   Else \'בית ספר \' + REPLACE(a.ACCOUNT_NAME, \' (בית ספר)\', \'\') End As \'חשבון\', ' +
            '   c.[CREDIT] As \'סכום\' ' +
            'From CREDITS c Inner Join ACCOUNTS a On c.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null ' +
            'Where c.DATE_DELETED Is Null And c.RECEIPT_ID=@receipt';
        var queryParams = {
            receipt: receiptId
        };
        connection.request(qs, queryParams).then(function (records) {
            connection.complete();
            var creditedAccounts = [];
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var creditedAccount = utils.makeShallowCopy(record);
                creditedAccounts.push(creditedAccount);
            }
            callback(null, creditedAccounts);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getReceiptPaidFor = function (receiptId, callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select s.SCHOOL_ID, s.SYMBOL, s.SCHOOL_NAME, c.CREDIT, reg.REGION_ID, reg.REGION_NAME ' +
            'From RECEIPTS r Inner Join ACCOUNTS a On r.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null ' +
            '   Inner Join CREDITS c On c.RECEIPT_ID=r.RECEIPT_ID And c.ACCOUNT_ID<>r.ACCOUNT_ID And c.DATE_DELETED Is Null ' +
            '   Inner Join ACCOUNTS ac On ac.ACCOUNT_ID=c.ACCOUNT_ID And ac.DATE_DELETED Is Null ' +
            '   Inner Join SCHOOLS s On ac.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS reg On s.REGION_ID=reg.REGION_ID And reg.DATE_DELETED Is Null ' +
            'Where r.DATE_DELETED Is Null And r.RECEIPT_ID=@receipt';
        var queryParams = {
            receipt: receiptId
        };
        connection.request(qs, queryParams).then(function (records) {
            connection.complete();
            var paidForAccounts = [];
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var paidForAccount = utils.makeShallowCopy(record);
                paidForAccounts.push(paidForAccount);
            }
            callback(null, paidForAccounts);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getReceiptPaymentRequests = function (receiptId, callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select dbo.ParsePaymentOrder(pr.Id) As \'מספר תעודת חיוב\', ' +
            '   r.REGION_NAME As \'מחוז\', ' +
            '   pr.TotalAmount As \'סה"כ סכום לחיוב\', ' +
            '   dbo.PrettifyDate(pr.[Time]) As \'תאריך יצירה\', ' +
            '   Sum(tp.Amount) As \'סה"כ שולם בקבלה זו\', ' +
            '   \'finance/payment-request-details?paymentRequestId=\' + Convert(nvarchar(50), pr.Id) As \'פרטים נוספים\' ' +
            'From TeamPayments tp Inner Join PaymentRequests pr On tp.PaymentId=pr.Id ' +
            '   Inner Join TeamRegistrations tr On tp.TeamId=tr.Id ' +
            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
            'Where tp.ReceiptId=@receipt ' +
            'Group By pr.Id, r.REGION_NAME, pr.TotalAmount, pr.[Time]';
        var queryParams = {
            receipt: receiptId
        };
        connection.request(qs, queryParams).then(function (records) {
            connection.complete();
            var paymentRequests = [];
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var paymentRequest = utils.makeShallowCopy(record);
                paymentRequests.push(paymentRequest);
            }
            callback(null, paymentRequests);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getRawAccounts = function (options, callback) {
    if (options == null) {
        options = {};
    }
    var db = this.db;
    db.connect().then(function (connection) {
        var qs = 'Select a.ACCOUNT_ID, a.ACCOUNT_NAME, ' +
            //'   Case When a.SCHOOL_ID Is Null Then REPLACE(a.ACCOUNT_NAME, \' בית ספר\', \'\') ' +
            //'   Else \'בית ספר \' + REPLACE(a.ACCOUNT_NAME, \' (בית ספר)\', \'\') End As ACCOUNT_NAME, ' +
            '   a.[ADDRESS], a.REGION_ID, a.SCHOOL_ID, s.SYMBOL ' +
            'From ACCOUNTS a Left Join SCHOOLS s On a.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            'Where a.DATE_DELETED Is Null';
        if (options.region != null && options.region != '')
            qs += ' And a.REGION_ID=@region';
        connection.request(qs, {region: options.region}).then(function (records) {
            connection.complete();
            var rawAccounts = [];
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var rawAccount = {
                    id: record.ACCOUNT_ID,
                    name: record.ACCOUNT_NAME,
                    address: record.ADDRESS,
                    region: record.REGION_ID,
                    school: record.SCHOOL_ID,
                    symbol: record.SYMBOL
                };
                rawAccounts.push(rawAccount);
            }
            callback(null, rawAccounts);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getAccounts = function (options, callback) {
    if (options == null) {
        options = {};
    }
    getAllAccounts(this.db, options, callback);
};

Finance.prototype.getPaymentRequestDetails = function (paymentRequestId, callback) {
    if (paymentRequestId == null || paymentRequestId <= 0) {
        callback("missing or invalid payment request id");
        return;
    }
    this.db.connect().then(function (connection) {
        var qs = 'Select pr.Id, pr.PayerName, s.SCHOOL_NAME, tr.Id As TeamId, tr.Team, tr.CreatedAt, c.IS_LEAGUE, c.IS_CLUBS, ' +
            '   c.REGION_ID, c.CHAMPIONSHIP_NAME, cm.CATEGORY_NAME, tr.TeamNumber, ' +
            '   IsNull(ct.PRICE, 0) + IsNull(cp.PRICE, 0) + IsNull(a.TotalPrice, 0) As TotalPrice, ' +
            '   (' +
            '       Case ct.[STATUS] When 2 Then ct.PRICE Else 0 End + ' +
            '       Case cp.[STATUS] When 2 Then cp.PRICE Else 0 End' +
            '   ) + IsNull(a2.TotalPrice, 0) + IsNull(tp.Amount, 0) As TotalPaid, tc.Amount As ChargeOverride ' +
            'From PaymentRequests pr Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
            '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
            '   Left Join CHARGES ct On t.CHARGE_ID=ct.CHARGE_ID And ct.DATE_DELETED Is Null ' + //--old system charges
            '   Left Join CHARGES cp On cp.PaymentRequest=pr.Id And cp.ADDITIONAL=tr.Id And cp.DATE_DELETED Is Null ' + //--auto charges per team
            //'   Left Join CHARGES cr On cr.PaymentRequest=pr.Id And cr.ADDITIONAL=0 And cr.DATE_DELETED Is Null ' + //--auto charges remaining
            '   Left Join TeamPayments tp On tp.PaymentId=pr.Id And tp.TeamId=tr.Id ' +
            '   Left Join TeamCharges tc On tc.TeamId=tr.Id And tc.PaymentId=pr.Id ' +
            '   Left Join (' +
            '      Select PaymentRequest, Sum(PRICE) As TotalPrice ' +
            '      From CHARGES ' +
            '      Where DATE_DELETED Is Null And ADDITIONAL=0 ' +
            '      Group By PaymentRequest' +
            '   ) as a On a.PaymentRequest=pr.Id ' +
            '   Left Join (' +
            '      Select PaymentRequest, Sum(PRICE) As TotalPrice ' +
            '      From CHARGES ' +
            '      Where DATE_DELETED Is Null And ADDITIONAL=0 And [STATUS]=2 ' +
            '      Group By PaymentRequest' +
            '   ) as a2 On a2.PaymentRequest=pr.Id ' +
            'Where pr.CancelTime Is Null And pr.Id=@id';
        connection.request(qs, {id: paymentRequestId}).then(function (records) {
            connection.complete();
            var paymentRequestDetails = [];
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var teamId = record.TeamId;
                var championshipName = record.CHAMPIONSHIP_NAME + ' ' + record.CATEGORY_NAME;
                var championshipType = '';
                if (record.IS_CLUBS === 1)
                    championshipType = 'ליגת מועדונים';
                else if (record.IS_LEAGUE === 1)
                    championshipType = 'אליפות תיכונים';
                else if (record.REGION_ID === 0)
                    championshipType = 'אליפות ארצית';
                else
                    championshipType = 'אליפות מחוזית';
                var paymentRequestDetail = paymentRequestDetails.find(detail => detail.teamId === teamId);
                if (paymentRequestDetail == null) {
                    paymentRequestDetail = {
                        order: record.Id,
                        teamId: teamId,
                        payerName: record.PayerName.trim(),
                        schoolName: record.SCHOOL_NAME,
                        championshipName: championshipName,
                        championshipType: championshipType,
                        teamNumber: record.TeamNumber,
                        createdAt: record.CreatedAt,
                        totalAmount: record.TotalPrice,
                        paidAmount: 0,
                        chargeOverride: record.ChargeOverride
                    };
                    paymentRequestDetails.push(paymentRequestDetail);
                }
                paymentRequestDetail.paidAmount += record.TotalPaid;
            }
            paymentRequestDetails.forEach(paymentRequestDetail => {
                paymentRequestDetail.remainingAmount = paymentRequestDetail.totalAmount - paymentRequestDetail.paidAmount;
            });
            callback(null, paymentRequestDetails);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getPaymentRequestContacts = function (paymentRequestId, callback) {
    if (paymentRequestId == null || paymentRequestId <= 0) {
        callback("missing or invalid payment request id");
        return;
    }
    this.db.connect().then(function (connection) {
        var qs = 'Select Details ' +
            'From PaymentRequests ' +
            'Where CancelTime Is Null And Id=@id';
        connection.request(qs, {id: paymentRequestId}).then(function (records) {
            connection.complete();
            var paymentRequestContacts = [];
            if (records && records.length > 0) {
                var record = records[0];
                var parsedPaymentDetails = null;
                try {
                    parsedPaymentDetails = JSON.parse(record.Details);
                } catch {
                    parsedPaymentDetails = null;
                }
                if (parsedPaymentDetails != null && parsedPaymentDetails.contacts) {
                    for (var i = 0; i < parsedPaymentDetails.contacts.length; i++) {
                        paymentRequestContacts.push(parsedPaymentDetails.contacts[i]);
                    }
                }
            }
            callback(null, paymentRequestContacts);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.listTeamPayments = function (options, callback) {
    this.db.connect()
        .then(
            function (connection) {
                if (options == null) {
                    options = {};
                }
                //console.log(options);
                var qs = "select tr.Id As TeamId, p.Id as \"Payment\", p.\"Order\" as \"Order\", s.SCHOOL_ID as \"School\", " +
                    "  s.SCHOOL_NAME as \"SchoolName\", s.SYMBOL as \"SchoolSymbol\", r.REGION_NAME as \"RegionName\", " +
                    "  p.PayerName as \"PayerName\", p.Details as \"Details\", " +
                    "  p.TotalAmount as \"TotalAmount\", " +
                    "  c.CHAMPIONSHIP_NAME as \"ChampionshipName\", cm.CATEGORY_NAME As \"CategoryName\", tr.CreatedAt " +
                    "from TeamRegistrations as tr " +
                    "  join PaymentRequests as p on tr.Payment = p.Id and p.CancelTime is null " +
                    "  join SCHOOLS as s on tr.School = s.SCHOOL_ID and s.DATE_DELETED Is Null " +
                    "  join REGIONS as r on s.REGION_ID = r.REGION_ID and r.DATE_DELETED Is Null " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID and cc.DATE_DELETED Is Null " +
                    "  join CHAMPIONSHIPS as c on cc.CHAMPIONSHIP_ID = c.CHAMPIONSHIP_ID and c.DATE_DELETED Is Null " +
                    "  left join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.[CATEGORY] " +
                    "where c.SEASON = @season";
                if (options.region)
                    qs += ' and s.REGION_ID=@region';
                if (options.clubs)
                    qs += ' and c.IS_CLUBS = 1';
                if (options.league)
                    qs += ' and c.IS_LEAGUE = 1';
                var queryParams = {
                    season: options.season,
                    region: options.region
                };
                connection.request(qs, queryParams)
                    .then(
                        function (records) {
                            var result = [];
                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                var details = null;
                                if (record.Details) {
                                    try {
                                        details = JSON.parse(record.Details);
                                    } catch (err) {
                                        details = {};
                                    }
                                }
                                result.push({
                                    team: record.TeamId,
                                    payment: record.Payment,
                                    order: record.Order,
                                    school: {
                                        id: record.School,
                                        name: record.SchoolName,
                                        symbol: record.SchoolSymbol,
                                        region: record.RegionName
                                    },
                                    championshipName: record.ChampionshipName,
                                    categoryName: record.CategoryName,
                                    createdAt: record.CreatedAt,
                                    payerName: record.PayerName,
                                    details: details,
                                    totalAmount: record.TotalAmount
                                });
                            }

                            qs = 'Select TeamId, PaymentId, Amount From TeamPayments';
                            connection.request(qs, {}).then(function (records) {
                                connection.complete();
                                var teamPaymentMapping = {};
                                for (var i = 0; i < records.length; i++) {
                                    var record = records[i];
                                    var key = record['PaymentId'].toString();
                                    if (!teamPaymentMapping[key])
                                        teamPaymentMapping[key] = [];
                                    teamPaymentMapping[key].push({
                                        team: record['TeamId'],
                                        amount: record['Amount']
                                    });
                                }
                                callback(null, result);
                            }, function(err) {
                                connection.complete();
                                callback(err);
                            });
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

function updateNextPayment(transaction, payments, callback) {
    function updateTeamPayment(payment) {
        return new Promise(function (fulfill, reject) {
            if (payment.team) {
                var qs = '';
                if (payment.amount != null) {
                    if (payment.amount == 0) {
                        //remove existing payment
                        qs = 'Delete From TeamPayments Where TeamId=@team And PaymentId=@payment';
                    } else {
                        //update existing payment
                        qs = 'Update TeamPayments Set Amount=@amount Where TeamId=@team And PaymentId=@payment';
                    }
                    transaction.request(qs, {
                        team: payment.team,
                        payment: payment.payment,
                        amount: payment.amount
                    }).then(function () {
                        fulfill(null); //synchronize with team payments
                    }, function (err) {
                        reject(err);
                    });
                } else {
                    //look for specific team and add a payment
                    qs = 'Select [Details] From PaymentRequests Where Id=@payment';
                    transaction.request(qs, {payment: payment.payment}).then(function (records) {
                        if (records != null && records.length > 0) {
                            var row = records[0];
                            var details = JSON.parse(row['Details']);
                            if (details != null && details.items != null && details.items.length > 0) {
                                var matchingItem = null;
                                for (var i = 0; i < details.items.length; i++) {
                                    var curItem = details.items[i];
                                    if (curItem.teams.indexOf(payment.team) >= 0) {
                                        matchingItem = curItem;
                                        break;
                                    }
                                }
                                if (matchingItem != null) {
                                    var amount = matchingItem.price;
                                    qs = 'Delete From TeamPayments Where TeamId=@team And PaymentId=@payment';
                                    transaction.request(qs, {
                                        team: payment.team,
                                        payment: payment.payment
                                    }).then(function () {
                                        qs = 'Insert Into TeamPayments (TeamId, PaymentId, Amount) Values (@team, @payment, @amount)';
                                        transaction.request(qs, {
                                            team: payment.team,
                                            payment: payment.payment,
                                            amount: amount
                                        }).then(function () {
                                            fulfill(amount);
                                        }, function (err) {
                                            reject(err);
                                        });
                                    }, function (err) {
                                        reject(err);
                                    });
                                } else {
                                    fulfill(payment.amount);
                                }
                            } else {
                                fulfill(payment.amount);
                            }
                        } else {
                            fulfill(payment.amount);
                        }
                    }, function (err) {
                        reject(err);
                    });
                }
            } else {
                fulfill(payment.amount);
            }
        });
    }

    var payment = payments[0];
    payments.splice(0, 1);
    updateTeamPayment(payment).then(function(amount) {
        if (payments.length > 0) {
            updateNextPayment(transaction, payments, callback);
        }
        else {
            callback();
        }
    }, function(err) {
        callback(err);
    });
}

Finance.prototype.updatePaymentsPayment = function (payments, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.transaction()
                    .then(
                        function (transaction) {
                            updateNextPayment(transaction, payments, function (err) {
                                if (err) {
                                    transaction.rollback();
                                    connection.complete();
                                    callback(err);
                                }
                                else {
                                    transaction.commit()
                                        .then(
                                            function () {
                                                connection.complete();
                                                callback();
                                            },
                                            function (err) {
                                                connection.complete();
                                                callback(err);
                                            });
                                }

                            })
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        }
                    );
            },
            function (err) {
                callback(err);
            }
        );
};

Finance.prototype.editPaymentRequest = function (paymentRequestData, callback) {
    function editPaymentRecord(transaction) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            var qs = 'Select [Details] From PaymentRequests Where Id=@id';
            transaction.request(qs, paymentRequestData).then(function (records) {
                if (records && records.length > 0) {
                    var record = records[0];
                    var paymentDetails = JSON.parse(record.Details);
                    paymentDetails.contacts = paymentRequestData.contacts;
                    paymentRequestData.details = JSON.stringify(paymentDetails);
                    qs = 'Update PaymentRequests ' +
                        'Set TotalAmount=@totalAmount, Details=@details, AccountId=@account ' +
                        'Where Id=@id';
                    transaction.request(qs, paymentRequestData).then(function () {
                        fulfill('OK');
                    }, error);
                } else {
                    reject('payment not found');
                }
            }, error);
        });
    }

    function editTeamPayments(transaction, teamPayments) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            var editSingleTeamPayment = function (index) {
                if (index >= teamPayments.length) {
                    fulfill('OK');
                    return;
                }
                var teamPayment = teamPayments[index];
                teamPayment.payment = paymentRequestData.id;
                var qs = 'Select * From TeamCharges ' +
                    'Where TeamId=@team And PaymentId=@payment';
                transaction.request(qs, teamPayment).then(function (records) {
                    qs = '';
                    if (records.length > 0) {
                        qs = 'Update TeamCharges ' +
                            'Set [Amount]=@amount ' +
                            'Where TeamId=@team And PaymentId=@payment';
                    } else {
                        qs = 'Insert Into TeamCharges (TeamId, PaymentId, [Amount]) ' +
                            'Values (@team, @payment, @amount)';
                    }
                    if (qs.length > 0) {
                        transaction.request(qs, teamPayment).then(function () {
                            editSingleTeamPayment(index + 1);
                        }, error);
                    } else {
                        error('No data?');
                    }
                }, error);
            };
            editSingleTeamPayment(0);
        });
    }

    this.db.connect().then(function (connection) {
        connection.transaction().then(function (transaction) {
            function error(err) {
                transaction.rollback();
                connection.complete();
                callback(err);
            }
            editPaymentRecord(transaction).then(function() {
                editTeamPayments(transaction, paymentRequestData.teamPayments).then(function() {
                    transaction.commit().then(function () {
                        connection.complete();
                        callback(null, {
                            Status: 'success'
                        });
                    }, function (err) {
                        connection.complete();
                        callback(err);
                    });
                }, error);
            }, error);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getChargeDetails = function (chargeId, callback) {
    var db =  this.db;
    db.connect().then(function (connection) {
        var qs = 'Select ch.CHARGE_ID, ch.REGION_ID, ch.ACCOUNT_ID, ch.PRODUCT_ID, (ch.AMOUNT*ch.PRICE) As TotalCharge, ' +
            'ch.CHARGE_DATE, ch.CHAMPIONSHIP_CATEGORY, ch.PaymentRequest, c.SEASON, c.SPORT_ID, c.CHAMPIONSHIP_ID ' +
            'From CHARGES ch Left Join CHAMPIONSHIP_CATEGORIES cc On ch.CHAMPIONSHIP_CATEGORY=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Left Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null\n' +
            'Where ch.DATE_DELETED Is Null And ch.CHARGE_ID=@charge';
        connection.request(qs, {'charge': chargeId}).then(function (records) {
            connection.complete();
            if (records.length === 0) {
                callback('NOT FOUND');
            } else {
                var record = records[0];
                var charge = {
                    id: record['CHARGE_ID'],
                    region: record['REGION_ID'],
                    account: record['ACCOUNT_ID'],
                    product: record['PRODUCT_ID'],
                    sum: record['TotalCharge'],
                    date: record['CHARGE_DATE'],
                    category: record['CHAMPIONSHIP_CATEGORY'],
                    paymentRequest: record['PaymentRequest'],
                    season: record['SEASON'],
                    sport: record['SPORT_ID'],
                    championship: record['CHAMPIONSHIP_ID']
                };
                callback(null, charge);
            }
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.getCharges = function (options, callback) {
    var required = ['range', 'account'];
    if (!utils.containsAtLeastOne(options, required)) {
        callback('must provide at least one of the following: ' + required.join(', '));
        return;
    }
    var db =  this.db;
    db.connect().then(function (connection) {
        var qs = 'Select c.CHARGE_ID, (c.AMOUNT * c.PRICE) As TotalCharge, c.PaymentRequest, c.CHARGE_DATE, ' +
            '   c.PRODUCT_ID, p.PRODUCT_NAME, ' +
            '   c.REGION_ID, r.REGION_NAME, ' +
            '   c.ACCOUNT_ID, a.ACCOUNT_NAME, a.REGION_ID As AccountRegion, ' +
            '   a.SCHOOL_ID, s.SCHOOL_NAME, s.SYMBOL As "symbol", ' +
            '   IsNull(c.CHAMPIONSHIP_CATEGORY, tr.Competition) As CHAMPIONSHIP_CATEGORY, ' +
            '   IsNull(cc.CATEGORY, t_cc.CATEGORY) As CATEGORY, ' +
            '   IsNull(cm.CATEGORY_NAME, t_cm.CATEGORY_NAME) As CATEGORY_NAME, ' +
            '   IsNull(cc.CHAMPIONSHIP_ID, t_cc.CHAMPIONSHIP_ID) As CHAMPIONSHIP_ID, IsNull(cc.CHAMPIONSHIP_ID, t_cc.CHAMPIONSHIP_ID) As "championship", ' +
            '   IsNull(champ.CHAMPIONSHIP_NAME, t_champ.CHAMPIONSHIP_NAME) As CHAMPIONSHIP_NAME, ' +
            '   IsNull(champ.SPORT_ID, t_champ.SPORT_ID) As SPORT_ID, IsNull(champ.SPORT_ID, t_champ.SPORT_ID) As "sport", ' +
            '   IsNull(sp.SPORT_NAME, t_sp.SPORT_NAME) As SPORT_NAME ' +
            'From CHARGES c Inner Join ACCOUNTS a On c.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null ' +
            '   Inner Join PRODUCTS p On c.PRODUCT_ID=p.PRODUCT_ID And p.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
            '   Left Join SCHOOLS s On a.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Left Join CHAMPIONSHIP_CATEGORIES cc On c.CHAMPIONSHIP_CATEGORY=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Left Join CHAMPIONSHIPS champ On cc.CHAMPIONSHIP_ID=champ.CHAMPIONSHIP_ID And champ.DATE_DELETED Is Null ' +
            '   Left Join SPORTS sp On champ.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.[CATEGORY] ' +
            '   Left Join TeamRegistrations tr On c.ADDITIONAL=tr.Id And c.PaymentRequest Is Not Null ' +
            '   Left Join CHAMPIONSHIP_CATEGORIES t_cc On tr.Competition=t_cc.CHAMPIONSHIP_CATEGORY_ID And t_cc.DATE_DELETED Is Null ' +
            '   Left Join CHAMPIONSHIPS t_champ On t_cc.CHAMPIONSHIP_ID=t_champ.CHAMPIONSHIP_ID And t_champ.DATE_DELETED Is Null ' +
            '   Left Join SPORTS t_sp On t_champ.SPORT_ID=t_sp.SPORT_ID And t_sp.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING t_cm On t_cm.RAW_CATEGORY=t_cc.[CATEGORY] ' +
            'Where c.DATE_DELETED Is Null ';
        var queryParams = {};
        if (options.range) {
            qs += 'And c.CHARGE_DATE Between @start And @end ';
            options.range.start.setHours(0);
            options.range.start.setMinutes(0);
            options.range.start.setSeconds(0);
            options.range.end.setHours(23);
            options.range.end.setMinutes(59);
            options.range.end.setSeconds(59);
            queryParams.start = options.range.start;
            queryParams.end = options.range.end;
        }
        if (options.account) {
            qs += 'And c.ACCOUNT_ID=@account ';
            queryParams.account = options.account;
        }
        if (options.type != null) {
            var extraConditions = getExtraConditions(options, 'champ');
            if (extraConditions.length > 0)
                qs += extraConditions + ' ';
        }
        if (options.region != null) {
            qs += 'And c.REGION_ID=@region ';
            queryParams.region = options.region;
        }
        if (options.sport != null) {
            qs += 'And (champ.SPORT_ID=@sport Or t_champ.SPORT_ID=@sport) ';
            queryParams.sport = options.sport;
        }
        if (options.championship != null) {
            qs += 'And (cc.CHAMPIONSHIP_ID=@championship Or t_cc.CHAMPIONSHIP_ID=@championship) ';
            queryParams.championship = options.championship;
        }
        if (options.category != null) {
            qs += 'And (c.CHAMPIONSHIP_CATEGORY=@category Or tr.Competition=@category) ';
            queryParams.category = options.category;
        }
        qs += 'Order By c.CHARGE_DATE Desc';
        connection.request(qs, queryParams).then(function (records) {
            connection.complete();
            var charges = [];
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var charge = {
                    id: record.CHARGE_ID,
                    totalCharge: record.TotalCharge,
                    order: record.PaymentRequest,
                    date: record.CHARGE_DATE,
                    product: utils.getBasicEntity(record, 'PRODUCT_'),
                    region: utils.getBasicEntity(record, 'REGION_'),
                    account: utils.getBasicEntity(record, 'ACCOUNT_'),
                    school: utils.getBasicEntity(record, 'SCHOOL_', null, ['symbol']),
                    category: utils.getBasicEntity(record, 'CHAMPIONSHIP_CATEGORY', 'CATEGORY_NAME', ['CATEGORY', 'championship']),
                    championship: utils.getBasicEntity(record, 'CHAMPIONSHIP_ID', 'CHAMPIONSHIP_NAME', ['sport']),
                    sport: utils.getBasicEntity(record, 'SPORT_')
                };
                charge.account.region = record['AccountRegion'];
                if (charge.order != null && charge.category == null) {
                    charge.category = { id: -1, name: '[קבוצה נמחקה]'};
                    charge.championship = { id: -1, name: '[קבוצה נמחקה]'};
                    charge.sport = { id: -1, name: '[קבוצה נמחקה]'};
                }
                charges.push(charge);
            }
            callback(null, charges);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.newCharge = function (chargeData, callback) {
    function createCharge(transaction) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            if (typeof chargeData.date === 'string')
                chargeData.date = new Date(chargeData.date);
            var fields = ['REGION_ID', 'ACCOUNT_ID', 'PRODUCT_ID', 'AMOUNT', 'PRICE', 'CHARGE_DATE', 'STATUS'];
            var values = ['@region', '@accountId', '@product', '1', '@sum', '@date', '1'];
            if (chargeData.category) {
                fields.push('CHAMPIONSHIP_CATEGORY');
                values.push('@category');
            }
            if (chargeData.paymentRequest) {
                fields.push('PaymentRequest');
                values.push('@paymentRequest');
            }
            var qs = "Insert Into CHARGES (" + fields.join(', ') + ") " +
                "Values (" + values.join(', ') + ")";
            //console.log(qs);
            //console.log(chargeData);
            transaction.request(qs, chargeData).then(function () {
                qs = 'Select Max(CHARGE_ID) As LatestChargeId From CHARGES Where DATE_DELETED Is Null';
                transaction.request(qs, {}).then(function(records) {
                    if (records != null && records.length > 0) {
                        fulfill(records[0]['LatestChargeId']);
                    } else {
                        reject('new charge not found!')
                    }
                }, error);
            }, error);
        });
    }

    this.db.connect().then(function (connection) {
        connection.transaction().then(function (transaction) {
            function error(err) {
                transaction.rollback();
                connection.complete();
                callback(err);
            }
            createNewAccount(chargeData, transaction).then(function(accountId) {
                chargeData.accountId = accountId;
                createCharge(transaction).then(function(chargeId) {
                    chargeData.id = chargeId;
                    transaction.commit().then(function () {
                        connection.complete();
                        callback(null, {
                            Status: 'success',
                            ChargeId: chargeId
                        });
                    }, function (err) {
                        connection.complete();
                        callback(err);
                    });
                }, error);
            }, error);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.updateCharge = function (chargeData, callback) {
    function editCharge(transaction) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            if (typeof chargeData.date === 'string')
                chargeData.date = new Date(chargeData.date);
            var fields = ['REGION_ID', 'ACCOUNT_ID', 'PRODUCT_ID', 'PRICE', 'CHARGE_DATE'];
            var values = ['@region', '@accountId', '@product', '@sum', '@date'];
            if (utils.isTrue( chargeData.removeChampionship)) {
                fields.push('CHAMPIONSHIP_CATEGORY');
                values.push('null');
            } else if (chargeData.category) {
                fields.push('CHAMPIONSHIP_CATEGORY');
                values.push('@category');
            }
            if (utils.isTrue( chargeData.removePaymentRequest)) {
                fields.push('PaymentRequest');
                values.push('null');
            } else if (chargeData.paymentRequest) {
                fields.push('PaymentRequest');
                values.push('@paymentRequest');
            }
            var qs = "Update CHARGES Set ";
            for (var i = 0; i < fields.length; i++) {
                if (i > 0)
                    qs += ", ";
                var field = fields[i];
                var value = values[i];
                qs += field + "=" + value;
            }
            qs += " Where CHARGE_ID=@id";
            //console.log(qs);
            //console.log(chargeData);
            transaction.request(qs, chargeData).then(function () {
                fulfill('success');
            }, error);
        });
    }

    this.db.connect().then(function (connection) {
        connection.transaction().then(function (transaction) {
            function error(err) {
                transaction.rollback();
                connection.complete();
                callback(err);
            }
            createNewAccount(chargeData, transaction).then(function(accountId) {
                chargeData.accountId = accountId;
                editCharge(transaction).then(function() {
                    transaction.commit().then(function () {
                        connection.complete();
                        callback(null, {
                            Status: 'Success'
                        });
                    }, function (err) {
                        connection.complete();
                        callback(err);
                    });
                }, error);
            }, error);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.deleteCharge = function (chargeId, callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Update CHARGES Set DATE_DELETED=GetDate() ' +
            'Where CHARGE_ID=@id And DATE_DELETED Is Null';
        connection.request(qs, {'id': chargeId}).then(function () {
            connection.complete();
            callback(null, {
                Status: 'Success'
            });
        }, function(err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Finance.prototype.newReceipt = function (receiptData, callback) {
    function createReceipt(transaction) {
        return new Promise(function (fulfill, reject) {
            var error = function(err) {
                reject(err);
            };
            var qs = 'Insert Into RECEIPTS (REGION_ID, ACCOUNT_ID, RECEIPT_SUM, RECEIPT_DATE, REMARKS) ' +
                'Values (@region, @account, @sum, @date, @remarks)';
            transaction.request(qs, receiptData).then(function () {
                qs = 'Select Max(RECEIPT_ID) As LatestReceiptId From RECEIPTS Where DATE_DELETED Is Null';
                transaction.request(qs, {}).then(function(records) {
                    if (records != null && records.length > 0) {
                        fulfill(records[0]['LatestReceiptId']);
                    } else {
                        reject('receipt not found!')
                    }
                }, error);
            }, error);
        });
    }

    function createPayments(transaction) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            var insertSinglePayment = function (index) {
                if (index >= receiptData.payments.length) {
                    fulfill('OK');
                    return;
                }
                var payment = receiptData.payments[index];
                payment.receipt = receiptData.id;
                if (payment.dueDate == null)
                    payment.dueDate = new Date();
                var fieldNames = ['RECEIPT_ID', 'PAYMENT_TYPE', 'PAYMENT_SUM', 'PAYMENT_DATE'];
                var fieldValues = ['@receipt', '@type', '@sum', '@dueDate'];
                switch (parseInt(payment.type, 10)) {
                    case 0:
                    case 1:
                        fieldNames.push('BANK');
                        fieldNames.push('BANK_BRANCH');
                        fieldNames.push('BANK_ACCOUNT');
                        fieldNames.push('REFERENCE');
                        fieldValues.push('@bankId');
                        fieldValues.push('@bankBranch');
                        fieldValues.push('@bankAccount');
                        fieldValues.push('@bankReference');
                        utils.explode(payment, 'bank');
                        break;
                    case 3:
                        fieldNames.push('CREDIT_CARD_TYPE');
                        fieldNames.push('CREDIT_CARD_LAST_DIGITS');
                        fieldNames.push('CREDIT_CARD_EXPIRE_DATE');
                        fieldNames.push('CREDIT_CARD_PAYMENTS');
                        fieldValues.push('@creditCardType');
                        fieldValues.push('@creditCardLastFourDigits');
                        fieldValues.push('@creditCardExpireDate');
                        fieldValues.push('@creditCardInstallments');
                        utils.explode(payment, 'creditCard');
                        break;
                }
                var qs = 'Insert Into PAYMENTS (' + fieldNames.join(', ') + ') ' +
                    'Values (' + fieldValues.join(', ') + ')';
                //console.log(payment);
                transaction.request(qs, payment).then(function () {
                    insertSinglePayment(index + 1);
                }, error);
            };
            insertSinglePayment(0);
        });
    }

    function createCredits(transaction) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            var insertSingleCredit = function (index) {
                if (index >= receiptData.creditedAccounts.length) {
                    fulfill('OK');
                    return;
                }
                var creditedAccount = receiptData.creditedAccounts[index];
                creditedAccount.region = receiptData.region;
                creditedAccount.receipt = receiptData.id;
                creditedAccount.account = creditedAccount.id;
                var qs = 'Insert Into CREDITS (REGION_ID, RECEIPT_ID, ACCOUNT_ID, [CREDIT]) ' +
                    'Values (@region, @receipt, @account, @sum)';
                transaction.request(qs, creditedAccount).then(function () {
                    insertSingleCredit(index + 1);
                }, error);
            };
            insertSingleCredit(0);
        });
    }

    function createTeamPayments(transaction, teamPayments) {
        return new Promise(function (fulfill, reject) {
            var error = function (err) {
                reject(err);
            };
            var insertSingleTeamPayment = function (index) {
                if (index >= teamPayments.length) {
                    fulfill('OK');
                    return;
                }
                var teamPayment = teamPayments[index];
                teamPayment.receipt = receiptData.id;
                var qs = 'Insert Into TeamPayments (TeamId, PaymentId, ReceiptId, [Amount]) ' +
                    'Values (@team, @payment, @receipt, @sum)';
                transaction.request(qs, teamPayment).then(function () {
                    insertSingleTeamPayment(index + 1);
                }, error);
            };
            insertSingleTeamPayment(0);
        });
    }

    this.db.connect().then(function (connection) {
        connection.transaction().then(function (transaction) {
            function error(err) {
                transaction.rollback();
                connection.complete();
                callback(err);
            }
            createReceipt(transaction).then(function(receiptId) {
                receiptData.id = receiptId;
                createPayments(transaction).then(function() {
                    createCredits(transaction).then(function() {
                        var teamPayments = [];
                        receiptData.paymentRequests.forEach(paymentRequest => {
                            paymentRequest.teams.forEach(team => {
                                teamPayments.push({
                                    team: team.id,
                                    payment: paymentRequest.id,
                                    sum: team.sum
                                });
                            });
                        });
                        createTeamPayments(transaction, teamPayments).then(function() {
                            transaction.commit().then(function () {
                                connection.complete();
                                callback(null, {
                                    Status: 'success',
                                    ReceiptId: receiptId
                                });
                            }, function (err) {
                                connection.complete();
                                callback(err);
                            });
                        }, error);
                    }, error);
                }, error);
            }, error);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

module.exports = new Finance(require('./db'));

/* 'Select pr.Id, IsNull(pr.[Order], pr.Id) As \'Order\', ' +
'   IsNull(a2.ACCOUNT_ID, a.ACCOUNT_ID) As ACCOUNT_ID, pr.TotalAmount, pr.[Time], ' +
'   \'בית ספר \' + REPLACE(IsNull(a2.ACCOUNT_NAME, a.ACCOUNT_NAME), \' (בית ספר)\', \'\') As ACCOUNT_NAME, ' +
'   r.REGION_ID, r.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, cit.CITY_ID, cit.CITY_NAME, ' +
'   Sum(tp.Amount) As PaidAmount ' +
'From PaymentRequests pr Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
'   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
'   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
'   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
'   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
'   Inner Join ACCOUNTS a On s.SCHOOL_ID=a.SCHOOL_ID And a.DATE_DELETED Is Null ' +
'   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
'   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
'   Left Join TeamPayments tp On tp.TeamId=tr.Id ' +
'   Left Join ACCOUNTS a2 On pr.AccountId=a2.ACCOUNT_ID And a2.DATE_DELETED Is Null ' +
'Where pr.CancelTime Is Null And pr.PayerName=s.SCHOOL_NAME And c.SEASON=@season ' + regionFilter +
'Group By pr.Id, pr.[Order], a.ACCOUNT_ID, a2.ACCOUNT_ID, pr.TotalAmount, pr.[Time], a.ACCOUNT_NAME, a2.ACCOUNT_NAME, ' +
'   r.REGION_ID, r.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, cit.CITY_ID, cit.CITY_NAME ' +
'Union All ' +
'Select pr.Id, IsNull(pr.[Order], pr.Id) As \'Order\', ' +
'   IsNull(a2.ACCOUNT_ID, a.ACCOUNT_ID) As ACCOUNT_ID, pr.TotalAmount, pr.[Time], ' +
'   REPLACE(IsNull(a2.ACCOUNT_NAME, a.ACCOUNT_NAME), \' בית ספר\', \'\') As ACCOUNT_NAME, ' +
'   r.REGION_ID, r.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, cit.CITY_ID, cit.CITY_NAME, ' +
'   Sum(tp.Amount) As PaidAmount ' +
'From PaymentRequests pr Inner Join TeamRegistrations tr On tr.Payment=pr.Id ' +
'   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
'   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
'   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
'   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
'   Inner Join ACCOUNTS a On a.DATE_DELETED Is Null  ' +
'       And a.ACCOUNT_NAME= pr.PayerName + \' (עבור בית ספר \' + s.SCHOOL_NAME + \')\' ' +
'   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
'   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
'   Left Join TeamPayments tp On tp.TeamId=tr.Id ' +
'   Left Join ACCOUNTS a2 On pr.AccountId=a2.ACCOUNT_ID And a2.DATE_DELETED Is Null ' +
'       And a2.ACCOUNT_NAME= pr.PayerName + \' (עבור בית ספר \' + s.SCHOOL_NAME + \')\' ' +
'Where pr.CancelTime Is Null And pr.PayerName<>s.SCHOOL_NAME And c.SEASON=@season ' + regionFilter +
'Group By pr.Id, pr.[Order], a.ACCOUNT_ID, a2.ACCOUNT_ID, pr.TotalAmount, pr.[Time], a.ACCOUNT_NAME, ' +
'   a2.ACCOUNT_NAME, r.REGION_ID, r.REGION_NAME, s.SCHOOL_ID, s.SCHOOL_NAME, cit.CITY_ID, cit.CITY_NAME'; */