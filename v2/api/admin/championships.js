var express = require('express');
var router = express.Router();

var settings = require('../../../settings');

var util = require('../util');

var Championships = require('../../models/admin/championships');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');

router.get('/', util.requireRole('admin', 'supervisor', 'finance'), function (req, res) {
    if (req.session.user) {
        var options = {
            type: req.query.type
        };
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
            options.region = req.query.region;
        }
        if (req.query.sport) {
            options.sport = req.query.sport;
        }
        //console.log(options);
        Season.current(req.session.user, function(currentSeason) {
            var season = currentSeason;
            if (req.query.season)
                season = parseInt(req.query.season);
            Championships.list(season, options, function (err, result) {
                util.sendResult(res, err, result);
            });
        });
    }
    else {
        util.sendResult(res, {status: 403});
    }
});

module.exports = router;