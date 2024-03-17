var express = require('express');

var settings = require('../../../settings');

var util = require('../util');
const multipart = require("../multipart");

var ProjectRegistration = settings.v2test ? require('../../test/registration/project') : require('../../models/registration/project');
var Access = settings.v2test ? require('../../test/access') : require('../../models/access');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');

var router = express.Router();

router.post('/', util.requireCityLogin, function (req, res) {
    ProjectRegistration.saveProject(req.session.user.cityID, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});


router.get('/:id/teams/', util.requireCityLogin, function (req, res) {
    var withPlayers = req.query.players === "1" || req.query.players === "true";
    var isAdmin = req.session.user.roles.indexOf('admin') >= 0 || req.session.user.roles.indexOf('sport-admin') >= 0;
    var city = isAdmin ? req.query.city || req.session.user.cityID : req.session.user.cityID;
    var team = isAdmin ? req.query.team : null;
    Season.current(req.session.user, function(currentSeason) {
        var season = req.query.season || currentSeason;
        ProjectRegistration.getProjectTeams(season, req.params.id, city, team, withPlayers, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.put('/:id/teams/', util.requireCityLogin, function (req, res) {

    var id = req.body.team.id;

    if (!id) {
        ProjectRegistration.insertProjectTeam(parseInt(req.params.id), req.session.user, req.body.team, function (err, result) {
            util.sendResult(res, err, result);
        });
    } else {
        ProjectRegistration.updateProjectTeam(parseInt(req.params.id), req.session.user, id, req.body.team, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
});

router.post('/:project/teams/delete', util.requireCityLogin, function (req, res) {
    ProjectRegistration.deleteProjectTeams(parseInt(req.params.project), req.session.user, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.put('/:project/teams/:team/players/', util.requireCityLogin, multipart(), function (req, res) {
    var id = req.body.id;

    if (id == null || id <= 0) {
        ProjectRegistration.insertProjectPlayer(parseInt(req.params.project), req.session.user, parseInt(req.params.team), req.body, function (err, result) {
            util.sendResult(res, err, result);
        });
    } else {
        ProjectRegistration.updateProjectPlayer(parseInt(req.params.project), req.session.user, parseInt(req.params.team), id, req.body, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
});

router.post('/:project/teams/:team/players/delete', util.requireCityLogin, function (req, res) {
    ProjectRegistration.deleteProjectPlayers(parseInt(req.params.project), req.session.user, parseInt(req.params.team), req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/:project/player/:player/teams', util.requireCityLogin, function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var season = req.query.season || currentSeason;
        ProjectRegistration.getPlayerTeams(season,parseInt(req.params.project), req.params.player, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.get('/sports', util.requireCityLogin, function (req, res) {
    ProjectRegistration.readPeleSports(req.session.user.cityID, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/:id', util.requireCityLogin, function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        ProjectRegistration.getProjectRegistration(parseInt(req.params.id), req.session.user.cityID,
            {withTeams: req.query.withTeams, withPlayers: req.query.withPlayers, season: currentSeason}, function (err, result) {
                util.sendResult(res, err, result);
            });
    });
});

router.put('/:id', util.requireCityLogin, function (req, res) {
    ProjectRegistration.updateProjectRegistration(parseInt(req.params.id), req.session.user, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.put('/:id/status/:status', util.requireCityLogin, function (req, res) {
    ProjectRegistration.updateProjectStatus(parseInt(req.params.id), req.session.user, req.params.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/:id/schools', util.requireCityLogin, function (req, res) {
    ProjectRegistration.insertProjectSchool(parseInt(req.params.id), req.session.user, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/:id/schools/:projectSchool', util.requireCityLogin, function (req, res) {
    ProjectRegistration.getProjectSchool(parseInt(req.params.id), req.session.user, parseInt(req.params.projectSchool), function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.put('/:id/schools/:projectSchool', util.requireCityLogin, function (req, res) {
    ProjectRegistration.updateProjectSchool(parseInt(req.params.id), req.session.user, parseInt(req.params.projectSchool), req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.delete('/:id/schools/:projectSchool', util.requireCityLogin, function (req, res) {
    ProjectRegistration.deleteProjectSchool(parseInt(req.params.id), req.session.user, parseInt(req.params.projectSchool), function (err, result) {
        util.sendResult(res, err, result);
    });
});

module.exports = router;