var express = require('express');
var logger = require('../logger');
var sql = require('mssql');
var settings = require('../settings');
var Promise = require('promise');
var utils = require('./utils');
var router = express.Router();

/*
 $.post("http://localhost:5000/api/ibba-service", {
 "token": "E1F9F423-C69F-4367-B57D-3A69283978FC",
 "changedAfter": "10/06/2017"
 }, function(resp) {
 console.log(resp);
 });

 $.post("http://www.schoolsport.co.il/api/ibba-service", {
 "token": "E1F9F423-C69F-4367-B57D-3A69283978FC",
 "changedAfter": "10/04/2018"
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
    if (token == 'E1F9F423-C69F-4367-B57D-3A69283978FC') {
        createSportsmanConnection().then(function(sportsmanConnection) {
            var changedAfter = utils.ParseDateTime(req.body.changedAfter);
            logger.log('verbose', 'IBBA Service called, change after: ' + changedAfter);
            var qs = 'Select CATEGORY, REGISTRATION_DATE, FIRST_NAME, LAST_NAME, GRADE, [GENDER], BIRTH_DATE, ID_NUMBER, TEAM_ID, TEAM_NAME, SCHOOL_SYMBOL, ' +
                '   SCHOOL_NAME, CHAMPIONSHIP_NAME, PIC_NAME, MEDICAL_EXAM, ID_VOUCHER, REGION_NAME, CITY_NAME, SPORT_NAME, TEAM_INDEX ' +
                'From Basketball_3x3_Players ';
            if (changedAfter != null)
                qs += 'Where REGISTRATION_DATE>=@date ';
            qs += 'Order By REGISTRATION_DATE Asc, CHAMPIONSHIP_NAME Asc, TEAM_NAME Asc, FIRST_NAME Asc, LAST_NAME Asc';
            var request = sportsmanConnection.request();
            if (changedAfter != null)
                request.input('date', changedAfter);
            request.query(qs, function (err, recordset) {
                if (err) {
                    var msg = 'Error reading volleyball players: ' + (err.message || err);
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
                            SchoolName: row['SCHOOL_NAME'],
                            TeamIndex: row['TEAM_INDEX'],
                            TeamDisplayName: row['TEAM_NAME'],
                            PictureUrl: ParsePlayerFile(row, currentIdNumber, 1),
                            MedicalExamUrl: ParsePlayerFile(row, currentIdNumber, 2),
                            IdVoucherUrl: ParsePlayerFile(row, currentIdNumber, 3)
                        };
                        allPlayers.push(curPlayer);
                    }

                    var allTeams = [];
                    for (var teamID in teamMapping)
                        allTeams.push(teamMapping[teamID]);
                    logger.log('verbose', 'Sending ' + allPlayers.length + ' IBBA players and ' + allTeams.length + ' teams');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.send({
                        'Players': allPlayers,
                        'Teams': allTeams
                    });
                }
            });
        }, function(err) {
            logger.log('error', 'Error creating connection for IBBA service: ' + (err.message || err));
            res.sendStatus(500);
        });
    } else {
        logger.log('verbose', 'IBBA Service called with invalid token (' + token + ')');
        res.status(401).send('Invalid token')
    }
});

module.exports = router;