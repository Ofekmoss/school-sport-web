var express = require('express');
var path = require('path');
var router = express.Router();
var logger = require('../logger');

router.get('/', function (req, res) {
    res.redirect('/manage');
});

module.exports = router;
