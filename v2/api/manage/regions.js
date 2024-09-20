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

router.get('/', util.requireRole('admin', 'supervisor'), function (req, res) {
    var options = {};
    if (req.query.withchampionships === '1' || req.query.withchampionships === 'true')
        options.withChampionships = true;
    Data.getRegions(options, req.session.user, function(err, regions) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(regions);
        }
    });
});

router.get('/:id', util.requireRole('admin', 'supervisor'), function (req, res) {
    Data.getRegions({region: req.params.id}, req.session.user, function(err, regions) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(regions.length > 0 ? regions[0] : {});
        }
    });
});

module.exports = router;