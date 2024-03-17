var express = require('express');
var router = express.Router();

var settings = require('../../../settings');

var util = require('../util');

var Schools = settings.v2test ? require('../../test/admin/schools') : require('../../models/schools');
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
        if (req.query.region) {
            options.region = parseInt(req.query.region, 10);
        } else if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Schools.listRegistrations(season, options, function (err, result) {
                util.sendResult(res, err, result);
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

router.get('/clubReport', util.requireRole('admin', 'supervisor', 'finance'), function (req, res) {
    if (req.session.user) {
        var options = {};
        if (req.query.clubs) {
            options.clubs = true;
        }
        else if (req.query.league) {
            options.league = true;
        }
        if (req.query.region) {
            options.region = parseInt(req.query.region, 10);
        } else if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        Season.current(req.session.user, function(currentSeason) {
            var season = req.query.season || currentSeason;
            Schools.generateClubReport(season, options, function (err, result) {
                util.sendResult(res, err, result);
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

module.exports = router;