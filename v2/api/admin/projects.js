var express = require('express');
var router = express.Router();

var settings = require('../../../settings');

var util = require('../util');

var Projects = settings.v2test ? require('../../test/admin/projects') : require('../../models/admin/projects');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');

router.get('/:id/registrations', util.requireRole('admin'), function (req, res) {
    var options = {};
    Season.current(req.session.user, function(currentSeason) {
        var season = currentSeason;
        if (req.query.season)
            season = parseInt(req.query.season);
        Projects.list(season, parseInt(req.params.id), options, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.post('/:id/registrations', util.requireRole('admin'), function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var season = currentSeason;
        Projects.insert(season, parseInt(req.params.id), req.body, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.delete('/:id/registrations/:registration', util.requireRole('admin'), function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        Projects.delete(currentSeason, parseInt(req.params.id), parseInt(req.params.registration), function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.get('/:id/teams', util.requireRole('admin', 'sport-admin'), function (req, res) {
    var options = {};
    if (req.session.user.roles.indexOf('admin') >= 0) {
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
    }
    else {
		//central user should see all teams, otherwise show based on user cities table
        options.userCities = (req.session.user.regionID !== 0);
		options.user = req.session.user.id;
    }
    //console.log(req.session.user.roles);
    //console.log(req.session.user.regionID);
    Season.current(req.session.user, function(currentSeason) {
        var season = currentSeason;
        if (req.query.season)
            season = parseInt(req.query.season);
        Projects.listTeams(season, parseInt(req.params.id), options, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

router.post('/:id/teams/approval', util.requireRole('admin', 'sport-admin'), function (req, res) {
    // Checking approve permissions
    if ((
            (req.body.approve & 1) !== 0 ||
            (req.body.clear & 1) !== 0
        ) && req.session.user.roles.indexOf('admin') < 0) {
        res.status(403).end();
        return;
    }
    if ((
        (req.body.approve & 2) !== 0 ||
        (req.body.clear & 2) !== 0
    ) && req.session.user.roles.indexOf('sport-admin') < 0) {
        res.status(403).end();
        return;
    }
    var options = req.body;
    if (req.session.user.roles.indexOf('admin') >= 0) {
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
    }
    else {
        options.userCities = true;
        options.user = req.session.user.id;
    }
    Season.current(req.session.user, function(currentSeason) {
        var season = currentSeason;
        if (req.query.season)
            season = parseInt(req.query.season);
        Projects.setTeamsApproval(req.session.user.id, season, parseInt(req.params.id), options, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

module.exports = router;