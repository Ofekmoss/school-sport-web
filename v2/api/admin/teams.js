var express = require('express');
var router = express.Router();

var settings = require('../../../settings');

var util = require('../util');

var Teams = settings.v2test ? require('../../test/admin/teams') : require('../../models/admin/teams');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');

router.get('/', util.requireRole('admin', 'supervisor', 'finance'), function (req, res) {
    if (req.session.user) {
        var options = {};
        if (req.query.clubs) {
            options.clubs = true;
        }
        else if (req.query.league) {
            options.league = true;
        }
        // console.log(req.session.user);
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        if (req.query.region != null) {
            options.region = parseInt(req.query.region);
            if (isNaN(options.region))
                options.region = null;
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
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Teams.list(season, options, function (err, result) {
                util.sendResult(res, err, result);
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.post('/status', util.requireRole('admin', 'supervisor'), function (req, res) {
    Teams.setTeamsStatus(req.body.teams, req.body.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/status/supervisor', util.requireRole('supervisor'), function (req, res) {
    var change = {add: 0, remove: 0};
    if (req.body.status === 0) {
        change.remove = Teams.Status.SupervisorApproval | Teams.Status.SupervisorDisapproval;
    }
    else if (req.body.status === -1) {
        change.remove = Teams.Status.SupervisorApproval;
        change.add = Teams.Status.SupervisorDisapproval;
    }
    else if (req.body.status === 1) {
        change.add = Teams.Status.SupervisorApproval;
        change.remove = Teams.Status.SupervisorDisapproval;
    }
    // console.log(req.body.teams);
    // console.log(change);
    Season.current(req.session.user, function(currentSeason) {
        Teams.setTeamsApproval(currentSeason, req.body.teams, change, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});


router.put('/:id', util.requireRole('admin', 'supervisor'), function (req, res) {
    Teams.updateTeam(req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

module.exports = router;