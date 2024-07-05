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
    Data.getChampionships({season: req.query.season, sport: req.query.sport, region: req.query.region}, req.session.user, function(err, championships) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(championships);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    Data.getChampionships({id: req.params.id}, req.session.user, function(err, championships) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(championships.length > 0 ? championships[0] : {});
        }
    });
});

module.exports = router;