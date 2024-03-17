var express = require('express');
var logger = require('../logger');
var soap = require('soap');
var sql = require('mssql');
var settings = require('../settings');
var Promise = require('promise');
var utils = require('./utils');
var router = express.Router();

/*
 $.post("http://localhost:5000/api/ifa-service", {
 "token": "9F82A71C-84E4-46DE-BFC8-A9EE80778580",
 "changedAfter": "10/06/2017"
 }, function(resp) {
 console.log(resp);
 });
 */

function createSportsmanConnection() {
    return new Promise(function (fulfil, reject) {
        var connection = new sql.Connection(settings.sportsmanDb, function(err) {
            if (err) {
                reject(err);
            }
            else {
                fulfil(connection);
            }
        });
    });
}

function RegisterStatus(idNumber) {
    return new Promise(function (fulfil, reject) {
        soap.createClient(settings.footballService.ServiceUrl, function (err, client) {
            if (err) {
                logger.log('error', 'Error connecting to football web service: ', err);
                reject('error connecting to service');
            } else {
                logger.log('info', 'Checking football player status, id ' + idNumber);
                var requestParams = {
                    uid: settings.footballService.Username,
                    pwd: settings.footballService.Password,
                    tz: idNumber
                };
                client.CheckPlayerStatus(requestParams, function (err, result) {
                    if (err) {
                        logger.log('error', 'Error consuming football web service: ', {
                            faultcode: err.faultcode,
                            faultstring: err.faultstring,
                            body: err.body
                        });
                        reject('error consuming service');
                    }
                    else {
                        logger.log('info', 'Got football web service data');
                        fulfil(result.CheckPlayerStatusResult);
                    }
                });
            }
        });
    });
}

router.post('/', function(req, res) {
    function ParsePlayerFile(row, idNumber, fileType)
    {
        var fieldName = '';
        switch (fileType) {
            case 1:
                fieldName = 'PIC_NAME';
                break;
            case 2:
                fieldName = 'MEDICAL_EXAM';
                break;
            case 3:
                fieldName = 'ID_VOUCHER';
                break;
        }
        if (fieldName.length > 0 && row[fieldName].indexOf('_') > 0)
            return 'http://www.schoolsport.org.il/content/PlayerFile?type=' + fileType + '&id=' + idNumber;
        return '';
    }
    var token = req.body.token;
    //logger.log('verbose', 'body:');
    //logger.log('verbose', req.body);
    if (token == '9F82A71C-84E4-46DE-BFC8-A9EE80778580') {
        createSportsmanConnection().then(function(sportsmanConnection) {
            var changedAfter = utils.ParseDateTime(req.body.changedAfter);
            logger.log('verbose', 'IBBA Service called, change after: ' + changedAfter);
            var qs = 'Select CATEGORY, REGISTRATION_DATE, FIRST_NAME, LAST_NAME, GRADE, [GENDER], BIRTH_DATE, ID_NUMBER, TEAM_ID, TEAM_NAME, SCHOOL_SYMBOL,' +
                '   CHAMPIONSHIP_NAME, PIC_NAME, MEDICAL_EXAM, ID_VOUCHER, REGION_NAME, CITY_NAME, SPORT_NAME ' +
                'From Futsal_Players ';
            if (changedAfter != null)
                qs += 'Where REGISTRATION_DATE>=@date ';
            qs += 'Order By REGISTRATION_DATE Asc, CHAMPIONSHIP_NAME Asc, TEAM_NAME Asc, FIRST_NAME Asc, LAST_NAME Asc';
            var request = sportsmanConnection.request();
            if (changedAfter != null)
                request.input('date', changedAfter);
            request.query(qs, function (err, recordset) {
                if (err) {
                    var msg = 'Error reading futsal players: ' + (err.message || err);
                    logger.log('error', msg);
                    res.sendStatus(500);
                } else {
                    var allPlayers = [];
                    var teamMapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        var currentIdNumber = row['ID_NUMBER'];
                        var currentTeamId = row['TEAM_ID'];
                        if (!teamMapping[currentTeamId.toString()]) {
                            var teamGender = 0;
                            var champName = row['CHAMPIONSHIP_NAME'];
                            if (champName.indexOf(' תלמידים') > 0)
                                teamGender = 1;
                            else if (champName.indexOf(' תלמידות') > 0)
                                teamGender = 2;
                            teamMapping[currentTeamId.toString()] = {
                                TeamNumber: currentTeamId,
                                RegionName: row['REGION_NAME'],
                                OrganizationName: row['CITY_NAME'],
                                SportFieldName: row['SPORT_NAME'],
                                ActualGender: teamGender
                            };
                        }
                        var curPlayer = {
                            Id: currentIdNumber,
                            RegisterDate: row['REGISTRATION_DATE'],
                            FirstName: row['FIRST_NAME'],
                            LastName: row['LAST_NAME'],
                            Grade: row['GRADE'],
                            Gender: row['GENDER'],
                            BirthDate: row['BIRTH_DATE'],
                            TeamNumber: currentTeamId,
                            RegionName: row['REGION_NAME'],
                            OrganizationName: row['CITY_NAME'],
                            SportFieldName: row['SPORT_NAME'],
                            PictureUrl: ParsePlayerFile(row, currentIdNumber, 1),
                            MedicalExamUrl: ParsePlayerFile(row, currentIdNumber, 2),
                            IdVoucherUrl: ParsePlayerFile(row, currentIdNumber, 3)
                        };
                        allPlayers.push(curPlayer);
                    }

                    var allTeams = [];
                    for (var teamID in teamMapping)
                        allTeams.push(teamMapping[teamID]);
                    logger.log('verbose', 'Sending ' + allPlayers.length + ' Futsal players and ' + allTeams.length + ' teams');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.send({
                        'Players': allPlayers,
                        'Teams': allTeams
                    });
                }
            });
        }, function(err) {
            logger.log('error', 'Error creating connection for Futsal service: ' + (err.message || err));
            res.sendStatus(500);
        });
    } else {
        logger.log('verbose', 'Futsal Service called with invalid token (' + token + ')');
        res.status(401).send('Invalid token')
    }
});

module.exports = router;
module.exports.RegisterStatus = RegisterStatus;