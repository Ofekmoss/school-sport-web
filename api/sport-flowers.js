var express = require('express');
var Promise = require('promise');
var settings = require('../settings');
var logger = require('../logger');
var sql = require('mssql');
var utils = require('./utils');
var seasons = require('./seasons');
var router = express.Router();

function CreateConnection() {
    return new Promise(function (fulfil, reject) {
        var connection = new sql.Connection(settings.sportFlowersDb, function(err) {
            if (err) {
                logger.error('Sport flowers connection error: ' + err.message);
                reject('error creating connection');
            }
            else {
               fulfil(connection);
            }
        });
    });
}

function GetEventsRange() {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            var qs = 'Select Min([DateTime]) As MinDate, Max([DateTime]) As MaxDate ' +
                '   From [Activities] ' +
                '   Where [DateTime] Is Not Null And Year([DateTime]) Between 2000 And 2100';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading flowers events range: ' + (err.message || err));
                    reject('error while reading');
                }
                else {
                    var first = new Date();
                    var last = new Date();
                    if (recordset && recordset.length > 0) {
                        var row = recordset[0];
                        first = row['MinDate'];
                        last = row['MaxDate'];
                    }
                    fulfil({
                        'First': first,
                        'Last': last
                    });
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

router.get('/events', function (req, res) {
    var season = req.query.season;
    var activitySeq = req.query.activity;
    seasons.read(season).then(function(matchingSeasons) {
        if (matchingSeasons && matchingSeasons.length == 1) {
            var matchingSeason = matchingSeasons[0];
            var firstDay = matchingSeason.FirstDay;
            var lastDay = matchingSeason.LastDay;
            var whereClause = activitySeq ? 'a.Seq=@activity' :
                'a.[DateTime] Is Not Null And a.[DateTime] Between @first_day And @last_day';
            CreateConnection().then(function (connection) {
                var qs = 'Select a.Seq, a.SportFieldSeq, a.[DateTime], sf.[Name] As SportFieldName, ev.[Name] As EventName, ' +
                    '   a.FacilitySeq, f.[Name] As FacilityName, ev.Seq As EventSeq ' +
                    'From [Activities] a Inner Join SportFields sf On a.SportFieldSeq=sf.Seq ' +
                    '   Inner Join Events ev On a.EventSeq=ev.Seq ' +
                    '   Left Join Facilities f On a.FacilitySeq=f.Seq ' +
                    'Where ' + whereClause;
                var request = connection.request();
                if (activitySeq) {
                    request.input('activity', activitySeq);
                } else {
                    request.input('first_day', firstDay);
                    request.input('last_day', lastDay);
                }
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading sport flowers events: ' + (err.message || err));
                        res.sendStatus(400);
                    }
                    else {
                        res.send(recordset);
                    }
                });
            }, function (err) {
                res.sendStatus(500);
            });
        } else {
            res.status(400).send('Missing or invalid season');
        }
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/messages', function (req, res) {
    var season = req.query.season;
    CreateConnection().then(function (connection) {
        var qs = 'Select Seq, [Contents], TargetUserType, DateCreated ' +
            'From Messages ' +
            'Where TargetUserType=5 ' +
            'Order By Seq Asc';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading sport flowers messages: ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                res.send(recordset);
            }
        });
    }, function (err) {
        res.sendStatus(500);
    });
});

router.get('/attachments', function (req, res) {
    var season = req.query.season;
    CreateConnection().then(function (connection) {
        var qs = 'Select Seq, [FileName], [FileSize], DateUploaded, Description ' +
            'From Attachments ' +
            'Where Description Is Not Null And Len(Description)>0 ' +
            'Order By DateUploaded Desc';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading sport flowers attachments: ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                res.send(recordset);
            }
        });
    }, function (err) {
        res.sendStatus(500);
    });
});

module.exports = router;
module.exports.EventsRange = GetEventsRange;