var express = require('express');
var Promise = require('promise');
var settings = require('../settings');
var logger = require('../logger');
var utils = require('./utils');
var sportsman = require('./sportsman');
var sql = require('mssql');
var router = express.Router();

router.use(function(req, res, next){
    // Add database connection
    var connection = new sql.Connection(settings.sqlConfig, function(err) {
        if (err) {
            logger.error('Connection error: ' + err.message);
            res.sendStatus(400);
        }
        else {
            req.connection = connection;
            next();
        }
    });
});

router.use('/common', require('./common'));
router.use('/mails', require('./mails'));
router.use('/images', require('./images'));
router.use('/pages', require('./content-pages'));
router.use('/flowers', require('./sport-flowers'));
router.use('/sportsman', require('./sportsman'));
router.use('/school-club', require('./school-club'));
router.use('/seasons', require('./seasons'));
router.use('/banners', require('./banners'));
router.use('/links', require('./links'));
router.use('/iva-service', require('./iva-service'));
router.use('/ibba-service', require('./ibba-service'));
router.use('/ifa-service', require('./ifa-service'));

router.get('/login', function (req, res) {
    if (req.session && req.session.user && req.session.user.seq) {
        res.send({
            seq: req.session.user.seq,
            name: req.session.user.username,
            displayName: req.session.user.displayName,
            role: req.session.user.role,
            schoolSymbol: req.session.user.schoolSymbol,
            isClubUser: req.session.user.isClub
        });
    } else {
        res.send(null);
    }
});


router.get('/encode', function (req, res) {
    res.send(utils.SportsmanEncode(req.query.v));
});

/*
router.get('/decode', function (req, res) {
    res.send(utils.SportsmanDecode(req.query.v));
});
 */

router.post('/login', function (req, res) {
    if (req.session) {
        delete req.session.user;
        delete req.session.permissions;
    }

    function GetUserData(username, password) {
        return new Promise(function (fulfil, reject) {
            sportsman.UserLogin(username, password).then(function(sportsmanUserDetails) {
                logger.log('verbose', 'Got valid sportsman login for ' + username);
                fulfil({
                    Seq: sportsmanUserDetails.Id + settings.Sportsman.UserOffset,
                    Name: sportsmanUserDetails.Name,
                    Role: sportsmanUserDetails.Admin ? 1 : 2,
                    School: sportsmanUserDetails.School
                });
            }, function(err) {
                //ignore sportsman login errors for now
                var qs = 'Select Seq, DisplayName, [Role] ' +
                    'From Users ' +
                    'Where Lower(UserLogin)=Lower(@username) And Password=@password';
                var request = req.connection.request();
                request.input('username', username);
                request.input('password', password);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        reject('Error during login: ' + (err.message || err));
                    } else {
                        if (recordset === undefined || recordset.length == 0) {
                            fulfil(null);
                        } else {
                            var row = recordset[0];
                            var userObject = {
                                Seq: row.Seq,
                                Name: row.DisplayName,
                                Role: row.Role
                            };
                            if (userObject.Role == 5) {
                                //check region
                                qs = 'Select RegionId ' +
                                    'From RegionUsers ' +
                                    'Where UserSeq=@user';
                                request = req.connection.request();
                                request.input('user', userObject.Seq);
                                request.query(qs, function (err, recordset) {
                                    if (err) {
                                        reject('Error reading region: ' + (err.message || err));
                                    } else {
                                        if (recordset === undefined || recordset.length == 0) {
                                            reject('Region not found for user ' + userObject.Seq);
                                        } else {
                                            row = recordset[0];
                                            userObject.Region = row['RegionId'];
                                            fulfil(userObject);
                                        }
                                    }
                                });
                            } else {
                                fulfil(userObject);
                            }
                        }
                    }
                });
            });
        });
    }

    var username = req.body.username;
    var password = req.body.password;
    GetUserData(username, password).then(function(data) {
        if (data == null || data.Seq == null || data.Seq <= 0) {
            res.sendStatus(401);
        } else {
            if (!req.session)
                req.session = {};
            delete req.session.permissions;
            var schoolSymbol = data.School ? data.School.Symbol : null;
            var schoolID = data.School ? data.School.Id : null;
            var isClub = data.School ? data.School.IsClub : false;
            var regionID = data.Role == 5 ? data.Region : null;
            //logger.log('verbose', 'Got valid sportsman login for ' + username);
            req.session.user = {
                seq: data.Seq,
                username: username,
                displayName: data.Name,
                role: data.Role,
                schoolSymbol: schoolSymbol,
                schoolID: schoolID,
                isClub: isClub,
                regionID: regionID
            };
            req.session.year = data.Year;
            res.send({
                seq: data.Seq,
                displayName: data.Name,
                role: data.Role,
                schoolSymbol: schoolSymbol,
                isClub: isClub,
                regionID: regionID
            });
        }
    }, function(err) {
        logger.error(err);
        res.sendStatus(500);
    });
});

router.post('/logout', function (req, res) {
    delete req.session.user;
    delete req.session.permissions;
    res.send(204);
});

module.exports = router;