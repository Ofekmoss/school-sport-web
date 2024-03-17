var express = require('express');
var router = express.Router();
var fs = require('fs');
var v2utils = require('../../processes/utils');
var path = require('path');
const Mustache = require('mustache');
var settings = require('../../../settings');
var util = require('../util');
var logger = require('../../../logger');
var Registration = settings.v2test ? require('../../test/registration/club') : require('../../models/registration');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');
var Schools = settings.v2test ? require('../../test/schools') : require('../../models/schools');
var pCache = require('../persistent-cache');

router.use('/club', require('./club'));
router.use('/league', require('./league'));
router.use('/project', require('./project'));

router.get('/', util.requireRole('school', 'city'), function (req, res) {
    var entity = {};
    if (util.hasRole(req, 'school') && req.session.user.schoolID) {
        entity.school = req.session.user.schoolID;
    }
    else if (util.hasRole(req, 'city') && req.session.user.cityID) {
        entity.city = req.session.user.cityID;
    }
    else {
        res.status(403).end();
        return;
    }
    //console.log(entity);
    entity.user = req.session.user;
    Registration.getRegistrationStatus(entity, function (err, registrationStatus) {
        if (err) {
            util.sendResult(res, err, registrationStatus);
        } else {
            Registration.getSeasons(function(err, seasons) {
                if (err == null) {
                    registrationStatus.seasons = seasons;
                    Season.current(req.session.user, function(currentSeason) {
                        registrationStatus.currentSeason = currentSeason;
                        util.sendResult(res, err, registrationStatus);
                    });
                } else {
                    util.sendResult(res, err, registrationStatus);
                }
            });
        }
    });
});

router.post('/playerId', util.requireSchoolOrCityLogin, function (req, res) {
    Registration.getPlayer(req.session.user, req.session.user.regionID,
        parseInt(req.body.id), req.body.projectId, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/season', util.requireSchoolOrCityLogin, function (req, res) {
    pCache.set(req.session.user, 'season', req.body.season, function(err, seasonResponse) {
        util.sendResult(res, err, seasonResponse);
    });
});

router.get('/test-get-user',  function (req, res) {
    util.sendResult(res, null, req.session.user);
});

router.post('/confirmation', util.requireSchoolOrCityLogin, function (req, res) {
    var userObject = req.session.user;
    var approval = req.body.Approval || 1;
    var teamIds = req.body.Teams || [];
    var userId = userObject.id;
    var school = userObject.schoolID || userObject.cityID; //TODO - special case for city
    var userLogin = userObject.username;
    var tokenUser = typeof userId === 'undefined' || userId == null;
    var userRole = userObject.roles && userObject.roles.length > 0 ? userObject.roles[0].split('-')[0] : '';
    var formName = req.body.Form || ((userRole || school) + '-teams');
    var confirmationData = {
        ConfirmedBy: {
            Name: tokenUser ? (userRole + ':' + userObject.displayName) : (userObject.displayName || 'School ' + school),
            Id: tokenUser ? null : userId
        },
        School: school,
        Form: formName,
        Value: approval,
        Teams: teamIds
    };
    if (!tokenUser && userLogin) {
        confirmationData.Comments = userLogin;
    }
    util.addConfirmation(confirmationData, req.session.user, function (err) {
        if (err) {
            logger.error('Error adding confirmation: ' + err);
            res.send(500);
        } else {
            res.send('OK');
        }
    });
});

router.get('/confirmations', util.requireRole('principal-approval', 'representative-approval'),  function (req, res) {
    //console.log(req.session.user);
    if (req.session && req.session.user && req.session.user.roles) {
        var schoolId = req.session.user.schoolID;
        Season.current(req.session.user, function (currentSeason) {
            //console.log('school: ' + schoolId + ', season: ' + currentSeason);
            Schools.getClubConfirmations(currentSeason, schoolId, function (err, confirmations) {
                if (err) {
                    util.sendResult(res, err, {});
                } else {
                    util.sendResult(res, null, confirmations);
                }
            });
        });
    } else {
        res.send(403);
    }
});

router.get('/team-confirmations', util.requireSchoolLogin, function (req, res) {
    var userObject = req.session.user;
    var school = userObject.schoolID;
    var role = userObject.roles && userObject.roles.length > 0 ? userObject.roles[0].split('-')[0] : '';
    util.getTeamsConfirmations(role, school, req.session.user, function (err, teamConfirmations) {
        if (err) {
            logger.error('Error reading teams confirmation: ' + err);
            res.send(500);
        } else {
            res.send(teamConfirmations);
        }
    });
});

router.get('/school-confirmations', util.requireSchoolOrCityLogin, function (req, res) {
    var userObject = req.session.user;
    var school = userObject.schoolID || userObject.cityID; //TODO - special case for city
    util.getSchoolConfirmations(school, req.session.user, function (err, confirmations) {
        if (err) {
            logger.error('Error reading school confirmations: ' + err);
            res.send(500);
        } else {
            res.send(confirmations);
        }
    });
});

router.get('/teams/:team/player-cards', util.requireSchoolOrCityLogin, function (req, res) {
    var teamId = parseInt(req.params.team, 10);
    if (teamId == null || isNaN(teamId) || teamId <= 0) {
        util.sendResult(res, 'Invalid or missing team', {});
        return;
    }
    Registration.getPlayerCardsData(teamId, function(err, playerCardsData) {
        if (err) {
            util.sendResult(res, err, {});
        } else {
            //console.log(playerCardsData);
            var approvedPlayers = playerCardsData.players.slice(0); //.filter(p => p.status === 'מאושר');
            approvedPlayers.forEach(p => {
                //p.picture = fs.readFileSync(p.picturePath, {encoding: 'base64'});
                p.rowStyle = p.overMaxAge === 'כן' ? 'background-color: #ffff0057;' : '';
            });
            //console.log(playerCardsData.players);
            var playersPerPage = 12;
            var pageCount = Math.floor(approvedPlayers.length / (playersPerPage + 1)) + 1;
            playerCardsData.pages = [];
            for (var pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
                var currentPage = {};
                for (var prop in playerCardsData) {
                    if (prop !== 'pages' && prop !== 'players' && playerCardsData.hasOwnProperty(prop)) {
                        currentPage[prop] = playerCardsData[prop];
                    }
                }
                currentPage.players = [];
                var startIndex = (pageIndex - 1) * playersPerPage;
                for (var p = startIndex; p < startIndex + playersPerPage; p++) {
                    if (p >= approvedPlayers.length)
                        break;
                    currentPage.players.push(approvedPlayers[p]);
                }
                currentPage.pageBreakStyle = pageIndex < pageCount ? 'page-break-before: always' : '';
                currentPage.pageCount = pageCount;
                currentPage.pageIndex = pageIndex;
                currentPage.pagerStyle = pageCount > 1 ? '' : 'display: none;';
                playerCardsData.pages.push(currentPage);
            }
            let templateFile = fs.readFileSync('v2/templates/PlayerCardsTemplate.html', {encoding: 'utf8'});
            let rawHTML = Mustache.render(templateFile, playerCardsData);
            var fileName = 'players-cards-' + teamId + '.html';
            res.setHeader('Content-type', 'text/html');
            res.setHeader('Content-disposition', 'inline; filename"' + fileName + '"');
            util.sendResult(res, null, rawHTML);
            /*
            var pdfName = 'players-cards-' + teamId + '.pdf';
            v2utils.createPDF('PlayerCardsTemplate.html', pdfName, playerCardsData, 'PlayerCards').then(function (pdfPath) {
                logger.log('verbose', 'Player cards file "' + pdfPath + '" has been created successfully');
                res.setHeader('Content-type', 'application/pdf');
                res.setHeader('Content-disposition', 'inline; filename"' + pdfName + '"');
                res.status(200).sendFile(pdfPath);
                //util.sendResult(res, null, buffer);
            });
            */
        }
    });
});

module.exports = router;