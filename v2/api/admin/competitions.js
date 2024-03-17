var express = require('express');
var router = express.Router();

var settings = require('../../../settings');

var util = require('../util');

var Competitions = settings.v2test ? require('../../test/admin/competitions') : require('../../models/admin/competitions');
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
        if (req.query.region != null) {
            options.region = req.query.region;
        } else {
            if (req.session.user.regionID !== 0) {
                options.region = req.query.region || req.session.user.regionID;
            }
        }
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Competitions.list(season, options, function (err, result) {
                util.sendResult(res, err, result);
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.get('/:competition/events', util.requireRole('admin'), function (req, res) {
    if (req.session.user) {
        Competitions.listEvents(parseInt(req.params.competition), function (err, result) {
            util.sendResult(res, err, result);
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.post('/loglig', util.requireRole('admin'), function (req, res) {
    if (req.session.user) {
        Competitions.updateLogligId(req.body.competition, req.body.logligId, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

module.exports = router;