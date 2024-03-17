var express = require('express');
var fs = require('fs');

var settings = require('../../../settings');

var util = require('../util');
var PDF = require('../../processes/utils');
var multipart = require('../multipart');

var Registration = settings.v2test ? require('../../test/registration/league') : require('../../models/registration');
var Access = settings.v2test ? require('../../test/access') : require('../../models/access');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');

var router = express.Router();

router.get('/', util.requireSchoolLogin, function (req, res) {
    Registration.getLeagueRegistrationStage(req.session.user, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/details', util.requireSchoolLogin, function (req, res) {
    Registration.getLeagueRegistrationDetails(req.session.user, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/first-confirmation-approval', util.requireSchoolLogin, function(req, res) {
    if (req.session.user && req.session.user.username) {
        Registration.approveFirstConfirmation(req.session.user.schoolID, function(err, result) {
            util.sendResult(res, err, result);
        });
    }
});

router.post('/details', util.requireSchoolLogin, function (req, res) {
    /*if (req.session.user && req.session.user.username) {
        Access.validate(req.session.user.username, req.body.password, function (err, result) {
            if (err) {
                util.sendResult(res, err);
            }
            else if (result) {
                Registration.setLeagueRegistrationDetails(req.session.user.schoolID, req.body, function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
            else {
                res.status(401).send("כישלון באימות משתמש");
            }
        })
    }*/

    // TODO - Validation removed for now - should move to teams approval

    if (req.session.user) {
        Registration.setLeagueRegistrationDetails(req.session.user.schoolID, req.body, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
});

router.get('/competitions', util.requireSchoolLogin, function (req, res) {
    Registration.getCompetitions(req.session.user, {hemed: true}, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/teams', util.requireSchoolLogin, function (req, res) {
    Registration.getLeagueTeams(req.session.user, function (err, result) {
        var season = Season.current();

        // Set teams players files
        if (result == null || !result)
            result = [];
        for (var ti = 0; ti < result.length; ti++) {
            var team = result[ti];
            for (var pi = 0; pi < team.players.length; pi++) {
                var player = team.players[pi];
                if (player.student != null) {
                    player.picture = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/picture');
                    player.idSlip = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/id-slip');
                    player.medicalApproval = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/medical-approval');
                }

            }
        }
        util.sendResult(res, err, result);
    });
});

router.get('/teams/:teamId', util.requireSchoolLogin, function (req, res) {
    Registration.getLeagueTeam(req.session.user, parseInt(req.params.teamId), function (err, result) {
        var season = Season.current();

        // Set teams players files
        for (var pi = 0; pi < result.players.length; pi++) {
            var player = result.players[pi];
            if (player.student != null) {
                player.picture = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/picture');
                player.idSlip = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/id-slip');
                player.medicalApproval = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/medical-approval');
            }
        }

        util.sendResult(res, err, result);
    });
});

router.post('/teams/status', function (req, res) {
    Registration.changeLeagueTeamStatus(req.body.teams, req.body.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/players/status', function (req, res) {
    Registration.changeLeaguePlayerStatus(req.body.players, req.body.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams', util.requireSchoolLogin, function (req, res) {
    Registration.insertLeagueTeam(req.session.user, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.put('/teams/:id', util.requireSchoolLogin, function (req, res) {
    Registration.updateLeagueTeam(req.session.user.id, req.session.user.schoolID, parseInt(req.params.id), req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.delete('/teams/:id', util.requireSchoolLogin, function (req, res) {
    Registration.deleteLeagueTeam(req.session.user.schoolID, parseInt(req.params.id), function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/approve', util.requireSchoolLogin, function (req, res) {
    Registration.approveLeagueTeams(req.session.user.id, req.session.user.schoolID, 1, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/approve/principal', util.requireRole('principal-approval'), util.requireSchoolLogin, function (req, res) {
    Registration.approveLeagueTeams(req.session.user.id, req.session.user.schoolID, 0x2, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/approve/representative', util.requireRole('representative-approval'), util.requireSchoolLogin, function (req, res) {
    Registration.approveLeagueTeams(req.session.user.id, req.session.user.schoolID, 0x4, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/payments', util.requireSchoolLogin, function (req, res) {
    Registration.getLeaguePayments(req.session.user, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/payments/:order/cancel', util.requireSchoolLogin, function (req, res) {
    Registration.cancelOrderPayments(req.session.user.schoolID, req.params.order, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/payment', util.requireSchoolLogin, function (req, res) {
    Registration.insertPayments(req.session.user, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/teams/:teamid/transfers', util.requireSchoolLogin, function(req, res) {
    Registration.getTransferRequests(req.session.user, parseInt(req.params.teamid), function(err, result) {
        util.sendResult(res, err, result);
    })
});

router.post('/teams/:teamid/players', util.requireSchoolLogin, multipart(), function (req, res) {
    // Converting fields
    if (req.body.external) {
        Registration.requestTransfer(req.session.user, req.body.idNumber,
            parseInt(req.params.teamid), function (err, result) {
                util.sendResult(res, err, result);
            });
    }
    else {
        var student = JSON.parse(req.body.student);
        student.idNumber = parseInt(student.idNumber);
        var birthDate = new Date(student.birthDate);
        student.birthDate = ('000' + birthDate.getFullYear()).slice(-4) + "-" +
            ('0' + (birthDate.getMonth() + 1)).slice(-2) + "-" +
            ('0' + birthDate.getDate()).slice(-2);
        Registration.upsertTeamPlayer(req.session.user, parseInt(req.params.teamid), student, function (err, result) {
            var season = Season.current();
            if (req.body.picture) {
                util.moveFile(req.body.picture, req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/picture');
            }
            if (req.body.idSlip) {
                util.moveFile(req.body.idSlip, req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/id-slip');
            }
            if (req.body.medicalApproval) {
                util.moveFile(req.body.medicalApproval, req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/medical-approval');
            }

            util.sendResult(res, err, result);
        });
    }
});

router.get('/teams/:teamid/players/download/:filename', util.requireSchoolLogin, function (req, res) {

    var team = req.params.teamid;
    var filename = req.params.filename;

    Registration.getLeagueTeam(req.session.user, parseInt(team), function (err, teamResult) {
        Registration.getCompetitions(req.session.user, {hemed: true}, function(err, competitionsResult){
            Registration.getLeagueRegistrationDetails(req.session.user, function (err, schoolResult) {
                var sport = competitionsResult.sports.find(function(s){
                    return s.id == teamResult.sport
                });
                var category = sport.categories.find(function (c) {
                    return c.id == teamResult.competition;
                });
                var data = {
                    sport: sport.name,
                    category: category ? category.name : "",
                    year: 2019,
                    schoolName: schoolResult.school.name,
                    regionAndSymbol: schoolResult.school.symbol,
                    schoolAddress: schoolResult.school.address,
                    schoolPhone: schoolResult.school.phoneNumber,
                    schoolFax: schoolResult.school.fax,
                    schoolEmail: schoolResult.school.email,
                    teacherName: teamResult.teacher.name,
                    teacherPhone: teamResult.teacher.phoneNumber,
                    teacherEmail: teamResult.teacher.email,
                    coachName: teamResult.coach.name,
                    coachPhone: teamResult.coach.phoneNumber,
                    coachEmail: teamResult.coach.email,
                    players: teamResult.players.map(function(player, index) {
                        player.grade = getGrade(player.grade);
                        if (player.birthDate instanceof Date) {
                            player.birthDate =
                                ('0' + player.birthDate.getDate()).slice(-2) + "/" +
                                ('0' + (player.birthDate.getMonth() + 1)).slice(-2) + "/" +
                                player.birthDate.getFullYear();
                        }
                        player.index = index + 1;
                        return player;
                    })
                };

                data.logo = fs.readFileSync('v2/templates/images/PDF-logo.png', {encoding: 'base64'});
                PDF.createPDF('PlayersReportTemplate.html', null, data).then(function (buffer) {
                    //fs.writeFileSync(filename, buffer);
                    delete data.logo; // no need to store it
                    res.setHeader('Content-type', 'application/pdf');
                    res.setHeader('Content-disposition', 'inline; filename"' + filename + '"');
                    util.sendResult(res, null, buffer);
                });
            });
        });
    });
});

router.delete('/teams/:teamid/players/:playerid', util.requireSchoolLogin, function (req, res) {
    Registration.deleteTeamPlayer(req.session.user.schoolID, parseInt(req.params.teamid), parseInt(req.params.playerid), function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.delete('/teams/:teamid/transfers/:id', util.requireSchoolLogin, function (req, res) {
    Registration.deleteTransferRequest(req.session.user.schoolID, parseInt(req.params.teamid), parseInt(req.params.id), function (err, result) {
        util.sendResult(res, err, result);
    });
});

function getGrade(grade) {
    return {
        0: 'א',
        1: 'ב',
        2: 'ג',
        3: 'ד',
        4: 'ה',
        5: 'ו',
        6: 'ז',
        7: 'ח',
        8: 'ט',
        9: 'י',
        10: 'י"א',
        11: 'י"ב',
    }[grade]
}

module.exports = router;