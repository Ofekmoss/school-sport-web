var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Session = settings.v2test ? require('../test/season') : require('../models/season');

router.get('/', function (req, res) {
    Session.getAllSeasons(function (err, result) {
        util.sendResult(res, err, result);
    });
});


module.exports = router;