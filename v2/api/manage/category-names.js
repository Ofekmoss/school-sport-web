var express = require('express');
var settings = require('../../../settings');

var Data = settings.v2test ? require('../../test/manage/data') : require('../../models/manage/data');

var util = require('../util');

var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.get('/', util.requireRole('admin'), function (req, res) {
    Data.getCategoryNames(req.query.season, req.query.sport, req.query.region, function(err, categoryNames) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(categoryNames);
        }
    });
});

module.exports = router;