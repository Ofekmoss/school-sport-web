var express = require('express');
var settings = require('../../../settings');

var Data = settings.v2test ? require('../../test/manage/data') : require('../../models/manage/data');

var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.get('/', function (req, res) {
    Data.getUpcomingEvents(req.connection, req.query, function(err, upcomingEvents) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(upcomingEvents);
        }
    });
});

module.exports = router;