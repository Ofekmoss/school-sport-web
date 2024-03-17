var express = require('express');
var logger = require('../logger');
var sql = require('mssql');
var settings = require('../settings');
var Promise = require('promise');
var utils = require('./utils');
var router = express.Router();

/*
 $.post("http://localhost:5000/api/iva-service", {
 "token": "8C64D209-8A3B-4CE8-93E1-E7CDE82DDFF1",
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
    if (token == '8C64D209-8A3B-4CE8-93E1-E7CDE82DDFF1') {
        createSportsmanConnection().then(function(sportsmanConnection) {
            var changedAfter = utils.ParseDateTime(req.body.changedAfter);
            logger.log('verbose', 'IVA Service called, change after: ' + changedAfter);
            var qs = 'Select CATEGORY, SEASON, REGISTRATION_DATE, FIRST_NAME, LAST_NAME, GRADE, [GENDER], BIRTH_DATE, ID_NUMBER, TEAM_ID, TEAM_NAME, SCHOOL_SYMBOL,' +
                '   CHAMPIONSHIP_NAME, PIC_NAME, MEDICAL_EXAM, ID_VOUCHER ' +
                'From VolleyballPlayers ' +
                'Where CharIndex(\'י\'\'-י"ב\', CHAMPIONSHIP_NAME)=0 ';
            if (changedAfter != null)
                qs += 'And REGISTRATION_DATE>=@date ';
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
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        var currentIdNumber = row['ID_NUMBER'];
                        var curPlayer = {
                            Id: currentIdNumber,
                            Season: row['SEASON'],
                            RegisterDate: row['REGISTRATION_DATE'],
                            FirstName: row['FIRST_NAME'],
                            LastName: row['LAST_NAME'],
                            Grade: row['GRADE'],
                            Gender: row['GENDER'],
                            BirthDate: row['BIRTH_DATE'],
                            TeamNumber: row['TEAM_ID'],
                            TeamName: row['TEAM_NAME'],
                            SchoolSymbol: row['SCHOOL_SYMBOL'],
                            Championship: row['CHAMPIONSHIP_NAME'],
                            Picture: ParsePlayerFile(row, currentIdNumber, 1),
                            MedicalExam: ParsePlayerFile(row, currentIdNumber, 2),
                            IdVoucher: ParsePlayerFile(row, currentIdNumber, 3)
                        };
                        allPlayers.push(curPlayer);
                    }
                    //row['']
                    //row['']

                    logger.log('verbose', 'Sending ' + allPlayers.length + ' IVA players');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.send({
                        'Players': allPlayers
                    });
                }
            });
        }, function(err) {
            logger.log('error', 'Error creating connection for IVA service: ' + (err.message || err));
            res.sendStatus(500);
        });
    } else {
        logger.log('verbose', 'IVA Service called with invalid token (' + token + ')');
        res.status(401).send('Invalid token')
    }
});

module.exports = router;