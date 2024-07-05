var express = require('express');
var settings = require('../../../settings');

var Data = settings.v2test ? require('../../test/manage/data') : require('../../models/manage/data');
var util = require('../util');
var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

router.get('/', util.requireRole('admin'), function (req, res) {
    var season = req.query.season;
    var region = req.query.region;
    var sport = req.query.sport;
    var category = req.query.category;
    if (parseInt(req.query.type, 10) === 2) {
        var allIds = [];
        Data.getDashboardData(season, 1, region, sport, 1, category, function (err, championshipIds) {
            if (err) {
                res.status(500).send(err);
            } else {
                championshipIds.forEach(id => allIds.push(id));
                Data.getDashboardData(season, 3, region, sport, 1, category, function (err, championshipIds) {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        championshipIds.forEach(id => allIds.push(id));
                        Data.getDashboardData(season, 4, region, sport, 1, category, function (err, championshipIds) {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                championshipIds.forEach(id => allIds.push(id));
                                Data.getDashboardData(season, null, region, sport, allIds, category, function(err, dashboardData) {
                                    if (err) {
                                        res.status(500).send(err);
                                    } else {
                                        res.status(200).send(dashboardData);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    } else {
        Data.getDashboardData(season, req.query.type, region, sport, req.query.championship, category, function(err, dashboardData) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).send(dashboardData);
            }
        });
    }
});

router.get('/unconfirmed-data', util.requireRole('admin'), function (req, res) {
    var token = req.query.token;
    if (!token) {
        res.status(400).send('No token');
        return;
    }
    Data.getUnconfirmedDashboardData(token, req.query.entity, function(err, unconfirmedData) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(unconfirmedData);
        }
    });
});

router.get('/pele/:filter', util.requireRole('admin'), function (req, res) {
    var projectId = req.query.type && req.query.type > 10 ? req.query.type - 10 : null;
    Data.getPeleData(req.query.season, req.params.filter, req.query.region, req.query.sport, projectId, function(err, peleData) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(peleData);
        }
    });
});

module.exports = router;