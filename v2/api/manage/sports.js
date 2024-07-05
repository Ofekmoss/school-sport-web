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
    var options = {
        id: null,
        type: req.query.type,
        region: req.query.region
    };
    if (req.query.withchampionships === '1' || req.query.withchampionships === 'true')
        options.withChampionships = true;
    Data.getSports(options, req.session.user, function(err, sports) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(sports);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    Data.getSports({id: req.params.id, type: null}, req.session.user, function(err, sports) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(sports.length > 0 ? sports[0] : {});
        }
    });
});

module.exports = router;