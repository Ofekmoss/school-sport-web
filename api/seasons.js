var express = require('express');
var Promise = require('promise');
var settings = require('../settings');
var logger = require('../logger');
var sql = require('mssql');
var utils = require('./utils');
var data = require('./data');
var router = express.Router();

function CreateConnection() {
    return new Promise(function (fulfil, reject) {
        var connection = new sql.Connection(settings.sqlConfig, function(err) {
            if (err) {
                logger.error('Seasons connection error: ' + err.message);
                reject('error creating connection for seasons');
            }
            else {
               fulfil(connection);
            }
        });
    });
}

function ApplyCurrentSeason(connection, season) {
    return new Promise(function (fulfil, reject) {
        if (season) {
            fulfil(season);
        } else {
            var qs = 'Select HebrewYear, IsCurrent ' +
                'From Seasons ' +
                'Where (GetDate() Between FirstDay And LastDay) Or (IsCurrent=1)';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading current season: ' + (err.message || err));
                    reject('error reading the current season');
                }
                else {
                    if (recordset.length > 0) {
						var currentSeason = 0;
						for (var i = 0; i < recordset.length; i++) {
							var row = recordset[i];
							currentSeason = row['HebrewYear'];
							if (row['IsCurrent'] == 1)
								break;
							
						}
                        fulfil(currentSeason);

                    } else {
                        reject('current season not found');
                    }
                }
            });
        }
    });
}

function ReadSeasons(season) {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function (connection) {
            ApplyCurrentSeason(connection, season).then(function (currentSeason) {
                season = currentSeason;
                var qs = 'Select HebrewYear As [Season], [Name], FirstDay, LastDay, IsCurrent ' +
                    'From [Seasons]';
                if (season != 'all')
                    qs += ' Where HebrewYear=@season';
                var request = connection.request();
                if (season != 'all')
                    request.input('season', season);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading seasons: ' + (err.message || err));
                        reject('error while reading seasons');
                    }
                    else {
                        var now = new Date();
                        var seasons = [];
						var gotCurrentSeason = false;
                        for (var i = 0; i < recordset.length; i++) {
                            var curSeason = recordset[i];
                            curSeason.IsCurrent = (curSeason.IsCurrent == 1);
							if (curSeason.IsCurrent)
								gotCurrentSeason = true;
                            seasons.push(curSeason);
                        }
						if (!gotCurrentSeason) {
							for (var i = 0; i < seasons.length; i++) {
								var curSeason = seasons[i];
								if (now >= curSeason.FirstDay && now <= curSeason.LastDay) {
									curSeason.IsCurrent = true;
									break;
								}
							}
						}
                        fulfil(seasons);
                    }
                });
            }, function (err) {
                reject(err);
            });
        }, function (err) {
            reject('error creating connection');
        });
    });
}

function GetSeasonDetails(seasonCode) {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function (connection) {
            var qs = 'Select HebrewYear, [Name], IsCurrent, FirstDay, LastDay ' +
                'From Seasons ' +
                'Where SeasonCode=@season';
            var request = connection.request();
            request.input('season', seasonCode);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading season ' + seasonCode + ': ' + (err.message || err));
                    reject('error reading season');
                } else {
                    if (recordset.length > 0) {
                        var season = {};
                        data.copyRecord(recordset[0], season, ['HebrewYear', 'Name', 'IsCurrent', 'FirstDay', 'LastDay'])
                        fulfil(season);
                    } else {
                        reject('season not found');
                    }
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

router.get('/', function (req, res) {
    var season = req.query.season;
    ReadSeasons(season).then(function(recordset) {
        res.send(recordset);
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/current', function (req, res) {
    CreateConnection().then(function (connection) {
        ApplyCurrentSeason(connection, null).then(function(currentSeason) {
            res.send({
                'Year': currentSeason
            });
        }, function(err) {
            res.status(500).send(err);
        });
    }, function(err) {
        res.status(500).send(err);
    });
});


module.exports = router;
module.exports.read = ReadSeasons;
module.exports.GetSeasonDetails = GetSeasonDetails;