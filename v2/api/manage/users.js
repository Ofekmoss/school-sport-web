var express = require('express');
var settings = require('../../../settings');

var Data = settings.v2test ? require('../../test/manage/data') : require('../../models/manage/data');

var util = require('../util');

var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.get('/', util.requireRole('admin'), function (req, res) {
    Data.getUsers(null, req.query.region, req.query.school, req.query.city, req.query.type, function(err, users) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(users);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    Data.getUsers(req.params.id, function(err, users) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(users.length > 0 ? users[0] : {});
        }
    });
});

module.exports = router;