var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Schools = settings.v2test ? require('../test/schools') : require('../models/schools');
var Season = settings.v2test ? require('../test/season') : require('../models/season');

router.get('/', util.requireRole('admin', 'city'), function (req, res) {
    if (util.hasRole(req, 'admin')) {
        var options = {};
        if (req.session.user.regionID !== 0) {
            options.region = req.session.user.regionID;
        }
        else if (req.query.region) {
            options.region = req.query.region;
        }
        Schools.list(options, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
    else if (req.session.user.cityID != null) {
        Schools.list({city: req.session.user.cityID}, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
});

router.get('/possiblePlayers', util.requireSchoolLogin, function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var options = {
            clubs: req.query.clubs == '1',
            league: req.query.league == '1',
            season: currentSeason
        };
        Schools.getPossiblePlayers(req.session.user.schoolID,options, function (err, result) {
            util.sendResult(res, err, result);
        });
    });
});

module.exports = router;