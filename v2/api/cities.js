var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Cities = settings.v2test ? require('../test/cities') : require('../models/cities');

router.get('/', function (req, res) {
    Cities.list(function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/:id/user', util.requireRole('admin'), function (req, res) {
    Cities.setUser(parseInt(req.params.id), req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

module.exports = router;