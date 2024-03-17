var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Regions = settings.v2test ? require('../test/regions') : require('../models/regions');

router.get('/', function (req, res) {
    Regions.list(function (err, result) {
        util.sendResult(res, err, result);
    });
});


module.exports = router;