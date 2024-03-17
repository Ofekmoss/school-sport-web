var Promise = require('promise');
var express = require('express');
var logger = require('../logger');
var data = require('./data');
var settings = require('../settings');
var sportsman = require('./sportsman');
var utils = require('./utils');
var router = express.Router();

String.prototype.endsWith = function(value, matchCase) {
    if (typeof value == 'undefined' || value == null)
        return false;
    if (typeof matchCase == 'undefined')
        matchCase = true;
    value = value.toString();
    if (value.length == 0)
        return false;
    if (matchCase)
        return this.substr(this.length - value.length) == value;
    else
        return this.toLowerCase().substr(this.length - value.length) == value.toLowerCase();
};

router.get('/team-orders', function (req, res) {
    function GetCategories(connection, schoolSymbol) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select CHAMPIONSHIP_CATEGORY_ID, [Amount] ' +
                'From SchoolClubTeamOrders ' +
                'Where SchoolSymbol=@symbol';
            var request = connection.request();
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading team orders for school ' + schoolSymbol + ': ' + (err.message || err));
                    reject('error');
                } else {
                    var teamOrders = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var teamOrder = {};
                        data.copyRecord(recordset[i], teamOrder);
                        teamOrders.push(teamOrder);
                    }
                    fulfil(teamOrders);
                    /*
                    sportsman.CreateConnection().then(function (sportsmanConnection) {
                        qs = 'Select t.CHAMPIONSHIP_CATEGORY_ID, Count(t.TEAM_ID) As Amount ' +
                        'From TEAMS t Inner Join CHAMPIONSHIPS c On t.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
                        'Where t.DATE_DELETED Is Null And c.DATE_DELETED Is Null And c.IS_CLUBS=1 ' +
                        '   And t.SCHOOL_ID=(Select SCHOOL_ID From SCHOOLS Where SYMBOL=@symbol) ' +
                        '   And c.SEASON=(Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where [STATUS]=1)) From SEASONS Where [STATUS]=1 And [START_DATE]<=GetDate()) ' +
                        'Group By t.CHAMPIONSHIP_CATEGORY_ID';
                        request = sportsmanConnection.request();
                        request.input('symbol', schoolSymbol);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading exiting teams for school ' + schoolSymbol + ': ' + (err.message || err));
                                fulfil(teamOrders);
                            } else {
                                for (var i = 0; i < recordset.length; i++) {
                                    var row = recordset[i];
                                    var teamOrder = null;
                                    var categoryId = row['CHAMPIONSHIP_CATEGORY_ID'];
                                    var matchingItems = teamOrders.filter(function(x) { return x.CHAMPIONSHIP_CATEGORY_ID == categoryId; });
                                    if (matchingItems.length > 0) {
                                        teamOrder = matchingItems[0];
                                        teamOrder.Amount += parseInt(row['Amount']);
                                    } else {
                                        teamOrder = {};
                                        data.copyRecord(row, teamOrder);
                                        teamOrders.push(teamOrder);
                                    }
                                }
                                fulfil(teamOrders);
                            }
                        });
                    }, function(err) {
                        logger.error('Error sportsman connection');
                        fulfil(teamOrders);
                    });
                    */
                }
            });
        });
    }

    function GetChampionshipDetails(connection, categories) {
        return new Promise(function (fulfil, reject) {
            var ids = categories.map(function (x) {
                return x.CHAMPIONSHIP_CATEGORY_ID;
            });
            var qs = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, cc.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, cm.CATEGORY_NAME, s.SPORT_NAME ' +
                'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
                '   Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
                'Where cc.CHAMPIONSHIP_CATEGORY_ID In (' + ids.join(', ') + ')';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading championship details for school ' + schoolSymbol + ': ' + (err.message || err));
                    reject('error');
                }
                else {
                    fulfil(recordset);
                }
            });
        });
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    GetCategories(req.connection, schoolSymbol).then(function(categories) {
        if (categories.length > 0) {
            sportsman.CreateConnection().then(function (sportsmanConnection) {
                GetChampionshipDetails(sportsmanConnection, categories).then(function(championshipDetails) {
                    var detailsMapping = {};
                    for (var i = 0; i < championshipDetails.length; i++) {
                        var row = championshipDetails[i];
                        detailsMapping[row.CHAMPIONSHIP_CATEGORY_ID.toString()] = row;
                    }
                    var teamOrders = categories.map(function(category) {
                        var teamOrder = {};
                        data.copyRecord(category, teamOrder);
                        var championshipDetail = detailsMapping[category.CHAMPIONSHIP_CATEGORY_ID.toString()];
                        if (championshipDetail) {
                            data.copyRecord(championshipDetail, teamOrder,
                                ['CHAMPIONSHIP_ID', 'CHAMPIONSHIP_NAME', 'CATEGORY_NAME', 'SPORT_NAME']);
                        }
                        return teamOrder;
                    });
                    res.send(teamOrders)
                }, function(err) {
                    res.sendStatus(500);
                });
            }, function (err) {
                res.sendStatus(500);
            });
        } else {
            res.send([])
        }
    }, function(err) {
        res.sendStatus(500);
    });
});

router.put('/team-order', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    var championshipCategory = req.body.Category;
    if (championshipCategory == null || !championshipCategory) {
        res.sendStatus(400);
        return;
    }

    var amount = req.body.Amount || 1;
    var qs = 'Insert Into SchoolClubTeamOrders ' +
        '(SchoolSymbol, CHAMPIONSHIP_CATEGORY_ID, [Amount]) Values ' +
        '(@symbol, @category, @amount)';
    var request = req.connection.request();
    request.input('symbol', schoolSymbol);
    request.input('category', championshipCategory);
    request.input('amount', amount);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.log('error', 'Error adding new team order for school ' + schoolSymbol + ': ' + (err.message || err));
            res.sendStatus(500);
        } else {
            res.send('OK');
        }
    });
});

router.delete('/team-order', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    var championshipCategory = req.query.category;
    if (championshipCategory == null || !championshipCategory) {
        res.sendStatus(400);
        return;
    }

    var deleteAll = (championshipCategory == 'all');
    var qs = 'Delete From SchoolClubTeamOrders ' +
        'Where SchoolSymbol=@symbol';
    if (!deleteAll)
        qs += ' And CHAMPIONSHIP_CATEGORY_ID=@category';
    var request = req.connection.request();
    request.input('symbol', schoolSymbol);
    if (!deleteAll)
        request.input('category', championshipCategory);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.log('error', 'Error deleting team order(s) for school ' + schoolSymbol + ': ' + (err.message || err));
            res.sendStatus(500);
        } else {
            res.send('OK');
        }
    });
});

router.post('/team-order', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    var oldCategory = req.body.OldCategory;
    if (oldCategory == null || !oldCategory) {
        res.sendStatus(400);
        return;
    }

    var newCategory = req.body.NewCategory || oldCategory;
    var amount = req.body.Amount || 1;
    var qs = 'Update SchoolClubTeamOrders ' +
        'Set [Amount]=@amount';
    if (newCategory != oldCategory)
        qs += ', CHAMPIONSHIP_CATEGORY_ID=@new_category';
    qs += ' Where SchoolSymbol=@symbol And CHAMPIONSHIP_CATEGORY_ID=@old_category';
    var request = req.connection.request();
    request.input('symbol', schoolSymbol);
    request.input('old_category', oldCategory);
    if (newCategory != oldCategory)
        request.input('new_category', newCategory);
    request.input('amount', amount);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.log('error', 'Error updating team order for school ' + schoolSymbol + ': ' + (err.message || err));
            res.sendStatus(500);
        } else {
            res.send('OK');
        }
    });
});

router.get('/data', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    var qs = 'Select PropertyName, PropertyValue ' +
        'From SchoolClubData ' +
        'Where SchoolSymbol=@symbol';
    var request = req.connection.request();
    request.input('symbol', schoolSymbol);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.log('error', 'Error reading school club data, symbol ' + schoolSymbol + ' : ' + (err.message || err));
            res.sendStatus(500);
        } else {
            res.send(recordset);
        }
    });
});

router.post('/data', function (req, res) {
    function GetExistingProperties(connection, schoolSymbol) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select PropertyName, PropertyValue ' +
                'From SchoolClubData ' +
                'Where SchoolSymbol=@symbol';
            var request = connection.request();
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.log('error', 'Error reading existing club properties, school: ' + (err.message || err));
                    transaction.rollback();
                    reject('ERROR');
                } else {
                    var mapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        mapping[row['PropertyName']] = true;
                    }
                    fulfil(mapping);
                }
            });
        });
    }

    function ExtractProperties(rawData, body) {
        var properties = body.Properties || [];
        if (properties.length == 0) {
            for (var propertyName in rawData) {
                if (typeof propertyName == 'string') {
                    properties.push(propertyName);
                }
            }
        }

        if (body.Excluded) {
            var excludedPropertiesMapping = {};
            body.Excluded.forEach(function(propertyName) {
                excludedPropertiesMapping[propertyName] = true;
            });
            properties = properties.filter(function(propertyName) {
                return !excludedPropertiesMapping[propertyName];
            });
        }

        properties = properties.filter(function(propertyName) {
            return !propertyName.endsWith('TabIndex') && !propertyName.endsWith('Mapping');
        });

        return properties;
    }

    function DeleteExistingRecords(transaction, prefix, schoolSymbol) {
        return new Promise(function (fulfil, reject) {
            if (prefix == null || !prefix || prefix.length == 0) {
                fulfil('no prefix');
            } else {
                var qs = "Delete From SchoolClubData Where PropertyName Like '" + prefix + "%' And SchoolSymbol=@symbol";
                var request = transaction.request();
                request.input('symbol', schoolSymbol);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.log('error', 'Error deleting existing properties starting with ' + prefix + ': ' + (err.message || err));
                        transaction.rollback();
                        reject('ERROR');
                    } else {
                        fulfil('OK');
                    }
                });
            }
        });
    }

    function InsertOrUpdateSingleRecord(transaction, existingProperties, records, index, successCallback, failureCallback) {
        if (index >= records.length) {
            transaction.commit(function (err, recordset) {
                successCallback('OK');
            });
            return;
        }

        var currentRecord = records[index];
        var update = existingProperties[currentRecord.PropertyName] ? true : false;
        var qs = update?
            'Update SchoolClubData Set PropertyValue=@value Where SchoolSymbol=@symbol And PropertyName=@name' :
            'Insert Into SchoolClubData (SchoolSymbol, PropertyName, PropertyValue) Values (@symbol, @name, @value)';
        var request = transaction.request();
        request.input('symbol', currentRecord.SchoolSymbol);
        request.input('name', currentRecord.PropertyName);
        request.input('value', currentRecord.PropertyValue);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.log('error', 'Error ' + (update ? 'updating' : 'inserting') + ' school club data, school ' + currentRecord.SchoolSymbol + ', ' +
                    'property name: ' + currentRecord.PropertyName + ': ' + (err.message || err));
                transaction.rollback();
                failureCallback('ERROR');
                return;
            }
            InsertOrUpdateSingleRecord(transaction, existingProperties, records, index + 1, successCallback, failureCallback);
        });
    }

    function ParseValue(rawValue) {
        if (rawValue == null || !rawValue || rawValue == '')
            return rawValue;
        if (typeof rawValue == 'string')
            return rawValue;
        if (utils.IsArray(rawValue))
            return rawValue.join(',');
        if (rawValue.hasOwnProperty('Id'))
            return rawValue.Id;
        if (rawValue.hasOwnProperty('Index'))
            return rawValue.Index;
        return rawValue;
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    var rawData = req.body.Data;
    if (rawData == null || !rawData) {
        res.sendStatus(403);
        return;
    }

    var prefix = req.body.Prefix || '';
    var properties = ExtractProperties(rawData, req.body);
    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        DeleteExistingRecords(transaction, prefix, schoolSymbol).then(function() {
            var records = [];
            properties.forEach(function(curProperty) {
                var propertyName = prefix + curProperty;
                var currentValue = ParseValue(rawData[curProperty]);
                records.push({
                    SchoolSymbol: schoolSymbol,
                    PropertyName: propertyName,
                    PropertyValue: currentValue
                });
            });
            GetExistingProperties(transaction, schoolSymbol).then(function(propertyMapping) {
                InsertOrUpdateSingleRecord(transaction, propertyMapping, records, 0, function() {
                    res.send('OK');
                }, function(err) {
                    res.sendStatus(500);
                });
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.sendStatus(500);
        });
    });
});

module.exports = router;