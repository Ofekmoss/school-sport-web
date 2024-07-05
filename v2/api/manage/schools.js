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
    Data.getSchools(null, req.query.season, req.query.region, req.query.city, function(err, schools) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(schools);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    Data.getSchools(req.params.id, function(err, schools) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(schools.length > 0 ? schools[0] : {});
        }
    });
});

module.exports = router;