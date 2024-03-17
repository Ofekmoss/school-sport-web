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

router.get('/', util.requireRole('admin'), util.requireQueryStringParams('championship'), function (req, res) {
    Data.getCategories({season: req.query.season, championship: req.query.championship}, req.session.user, function(err, categories) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(categories);
        }
    });
});

router.post('/', util.requireRole('admin'), function (req, res) {
    Data.editCategory(req.body, function(err, resp) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(resp);
        }
    });
});

router.get('/season/:season/sport/:sport', util.requireRole('admin'), function (req, res) {
    var options = {
        season: req.params.season,
        sport: req.params.sport
    };
    Data.getCategories(options, req.session.user, function(err, categories) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(categories);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    Data.getCategories({id: req.params.id}, req.session.user, function(err, categories) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(categories.length > 0 ? categories[0] : {});
        }
    });
});

module.exports = router;