var express = require('express');
var settings = require('../../../settings');

var Data = settings.v2test ? require('../../test/manage/data') : require('../../models/manage/data');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');
var util = require('../util');

var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

router.get('/', util.requireRole('admin'), function (req, res) { //util.requireQueryStringParams('team'),
    function buildStudentFilePath(player, fName) {
        var idNumber = player.Student.IdNumber;
        var schoolId = player.Student.School.Id;
        var localPath = util.getFilePath(schoolId + '/students/' + idNumber + '/' + player.Season + '/' + fName);
        var filePath = '';
        if (localPath != null && localPath.length > 0) {
            filePath = settings.siteBaseUrl + '/api/v2/document/' + localPath;
        }
        return filePath;
    }
    var options = {
        season: req.query.season,
        championship: req.query.championship,
        school: req.query.school,
        category: req.query.category,
        sport: req.query.sport,
        region: req.query.region,
        team: req.query.team
    };
    Data.getPlayers(options, req.session.user, function (err, players) {
        if (err) {
            res.status(500).send(err);
        } else {
            players.forEach(player => {
                if (player.Student != null && player.Student.IdNumber != null) {
                    //set gender by team if not provided already
                    if (!player.Student.Gender && player.Category != null) {
                        var catName = player.Category.Name || '';
                        if (catName.indexOf('תלמידים') > 0) {
                            player.Student.Gender = 1;
                        } else if (catName.indexOf('תלמידות') > 0) {
                            player.Student.Gender = 2;
                        }
                    }

                    //student files
                    player.Files = {
                        Picture: buildStudentFilePath(player, 'picture'),
                        IdSlip: buildStudentFilePath(player, 'id-slip'),
                        MedicalApproval: buildStudentFilePath(player, 'medical-approval')
                    };
                }
            });
            res.status(200).send(players);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    var options = {
        id: req.params.id
    };
    Data.getPlayers(options, req.session.user, function (err, players) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(players.length > 0 ? players[0] : {});
        }
    });
});

router.get('/:team/:student', util.requireRole('admin'), function (req, res) {
    var options = {
        team: req.params.team,
        student: req.params.student,
        season: req.query.season
    };
    Data.getPlayers(options, req.session.user, function (err, players) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(players.length > 0 ? players[0] : {});
        }
    });
});

router.delete('/', util.requireRole('admin'), function (req, res) {
    var playerId = req.query.player;
    var registrationTeam = req.query.team;
    var studentId = req.query.student;
    if (playerId == null && (registrationTeam == null || studentId == null)) {
        res.status(400).send('missing player id or team and student');
    } else {
        var options = {
            userId: req.session.user.seq || req.session.user.id,
            playerId: playerId,
            teamId: registrationTeam,
            studentId: studentId
        };
        Data.deletePlayer(options, function (err, resp) {
            if (err) {
                var status = err.toString().toLowerCase().indexOf('error') === 0 ? 500 : 400;
                res.status(status).send(err);
            } else {
                res.status(200).send(resp);
            }
        });
    }
});

module.exports = router;