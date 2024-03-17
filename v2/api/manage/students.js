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

router.get('/', util.requireRole('admin'), util.requireQueryStringParams('school'), function (req, res) {
    Data.getStudents(null, req.query.idNumber, req.query.school, req.query.grade, function(err, students) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(students);
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    Data.getStudents(req.params.id, function(err, students) {
        if (err) {
            res.status(500).send(err);
        } else {
            if (students.length > 0) {
                res.status(200).send(students[0]);
            } else {
                //try by id number
                Data.getStudents(null, req.params.id, null, null, function(err, students) {
                    var student = students.length > 0 ? students[0] : {};
                    res.status(200).send(student);
                }, function(err) {
                    var status = err.indexOf('ERROR') === 0 ? 500 : 400;
                    res.status(status).send({Error: err.replace('ERROR: ', '').replace('ERROR', '')});
                });
            }
        }
    });
});

module.exports = router;