var express = require('express');
var router = express.Router();

var settings = require('../../../settings');

var util = require('../util');

var Players = settings.v2test ? require('../../test/admin/players') : require('../../models/admin/players');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');

router.get('/', util.requireRole('admin', 'supervisor', 'finance'), function (req, res) {
    if (req.session.user) {
        // console.log(req.session.user);
        var options = {};
        if (req.query.clubs) {
            options.clubs = true;
        }
        else if (req.query.league) {
            options.league = true;
        }
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        if (req.query.region != null) {
            options.region = parseInt(req.query.region);
        }
        if (req.query.competition) {
            options.competition = parseInt(req.query.competition);
        }
        if (req.query.championship) {
            options.championship = parseInt(req.query.championship);
        }
        if (req.query.sport) {
            options.sport = parseInt(req.query.sport);
        }
        if (req.query.numOfRows) {
            options.numOfRows = parseInt(req.query.numOfRows);
        }
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Players.list(season, options, function (err, result) {
                if (!err) {
                    var players = [];
                    for (var pi = 0; pi < result.length; pi++) {
                        var player = result[pi];
                        player.TransferRequested = false;
                        if (player.student != null && player.school != null) {
                            player.picture = util.getFilePath(player.school.id + '/students/' + player.student.idNumber + '/' + season + '/picture');
                            player.idSlip = util.getFilePath(player.school.id + '/students/' + player.student.idNumber + '/' + season + '/id-slip');
                            player.medicalApproval = util.getFilePath(player.school.id + '/students/' + player.student.idNumber + '/' + season + '/medical-approval');
                        }
                        players.push(player);
                    }
                    if (req.session.user.role === 1) {
                        //add transfer requests as well:
                        Players.listTransferRequests(season, options, function (err, result) {
                            for (var pi = 0; pi < result.length; pi++) {
                                var player = result[pi];
                                var matchingPlayer = players.find(function (p) {
                                    return p.student.idNumber === player.idNumber;
                                });
                                if (matchingPlayer == null) {
                                    player.TransferRequested = true;
                                    player.id = player.student;
                                    player.student = {
                                        firstName: player.firstName,
                                        lastName: player.lastName,
                                        birthDate: player.birthDate,
                                        idNumber: player.idNumber
                                    };
                                    player.team = {
                                        id: player.team,
                                        name: player.teamFullName,
                                        team: player.teamId
                                    };
                                    players.push(player);
                                }
                            }
                            util.sendResult(res, err, players);
                        });
                    } else {
                        util.sendResult(res, err, players);
                    }
                } else {
                    util.sendResult(res, err, result);
                }
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.get('/team-players', util.requireRole('admin', 'supervisor', 'finance'), function (req, res) {
    if (req.session.user) {
        // console.log(req.session.user);
        var options = {};
        if (req.query.clubs) {
            options.clubs = true;
        }
        else if (req.query.league) {
            options.league = true;
        }
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        if (req.query.region != null) {
            options.region = parseInt(req.query.region);
        }
        if (req.query.competition) {
            options.competition = parseInt(req.query.competition);
        }
        if (req.query.championship) {
            options.championship = parseInt(req.query.championship);
        }
        if (req.query.sport) {
            options.sport = parseInt(req.query.sport);
        }
        if (req.query.numOfRows) {
            options.numOfRows = parseInt(req.query.numOfRows);
        }
        if (req.query.school) {
            options.school = parseInt(req.query.school);
        }
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Players.listTeamPlayers(season, options, function (err, result) {
                if (!err) {
                    var players = [];
                    for (var pi = 0; pi < result.length; pi++) {
                        var player = result[pi];
                        player.TransferRequested = false;
                        if (player.student != null && player.school != null) {
                            player.picture = util.getFilePath(player.school.id + '/students/' + player.student.idNumber + '/' + season + '/picture');
                            player.idSlip = util.getFilePath(player.school.id + '/students/' + player.student.idNumber + '/' + season + '/id-slip');
                            player.medicalApproval = util.getFilePath(player.school.id + '/students/' + player.student.idNumber + '/' + season + '/medical-approval');
                        }
                        players.push(player);
                    }
                    if (req.session.user.role === 1) {
                        //add transfer requests as well:
                        Players.listTransferRequests(season, options, function (err, result) {
                            for (var pi = 0; pi < result.length; pi++) {
                                var player = result[pi];
                                var matchingPlayer = players.find(function (p) {
                                    return p.student.idNumber === player.idNumber;
                                });
                                if (matchingPlayer == null) {
                                    player.TransferRequested = true;
                                    player.id = player.student;
                                    player.student = {
                                        firstName: player.firstName,
                                        lastName: player.lastName,
                                        birthDate: player.birthDate,
                                        idNumber: player.idNumber
                                    };
                                    player.team = {
                                        id: player.team,
                                        name: player.teamFullName,
                                        team: player.teamId
                                    };
                                    players.push(player);
                                }
                            }
                            util.sendResult(res, err, players);
                        });
                    } else {
                        util.sendResult(res, err, players);
                    }
                } else {
                    util.sendResult(res, err, result);
                }
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.post('/status', util.requireRole('admin'), function (req, res) {
    Players.setPlayersStatus(req.body.players, req.body.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/transfers', util.requireRole('admin'), function (req, res) {
    if (req.session.user) {
        var options = {};
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Players.listTransferRequests(season, options, function (err, result) {
                util.sendResult(res, err, result);
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.post('/transfers', util.requireRole('admin'), function (req, res) {
    if (req.session.user) {
        Players.approveTransferRequests(req.body, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

module.exports = router;