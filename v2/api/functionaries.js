var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Functionaries = require('../models/functionaries');

router.get('/', util.requireRole('admin'), function (req, res) {
    var options = {};
    for (var key in req.query) {
        if (req.query.hasOwnProperty(key)) {
            if (key && req.query[key] != null) {
                options[key] = req.query[key];
            }
        }
    }
    Functionaries.list(options, function (err, result) {
        util.sendResult(res, err, result);
    });
});

module.exports = router;