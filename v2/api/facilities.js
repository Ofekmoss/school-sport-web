var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Facilities = settings.v2test ? require('../test/facilities') : require('../models/facilities');

function readFacilitiesById(ids, result, callback) {
    if (ids.length > 0) {
        var id = ids.shift();
        Facilities.getFacilityById(id, function (err, facility) {
            if (err) {
                callback(err);
            }
            else {
                result.push(facility);
                readFacilitiesById(ids, result, callback);
            }
        });
    }
    else {
        callback(null, result);
    }
}

router.get('/', function (req, res) {
    if (req.session.user) {
        if (req.query.id) {
            if (Array.isArray(req.query.id)) {
                readFacilitiesById(req.query.id, [], function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
            else {
                Facilities.getFacilityById(req.query.id, function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
        } else {
            if (req.query.region) {
                Facilities.getFacilitiesByRegion(req.query.region, function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
            else if (req.query.school) {
                Facilities.getFacilitiesBySchool(req.query.school, function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
            else if (req.query.team) {
                Facilities.getFacilitiesByTeam(req.query.team, function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
            else if (req.query.city) {
                Facilities.getFacilitiesByCity(req.query.city, function (err, result) {
                    util.sendResult(res, err, result);
                });
            }
            else {
                if (req.session.user.schoolID) {
                    Facilities.getFacilitiesBySchool(req.session.user.schoolID, function (err, result) {
                        util.sendResult(res, err, result);
                    });
                } else if (req.session.user.cityID) {
                    Facilities.getFacilitiesByCity(req.session.user.cityID, function (err, result) {
                        util.sendResult(res, err, result);
                    });
                } else {
                    if (req.session.user.schoolID) {
                        Facilities.getFacilitiesBySchool(req.session.user.schoolID, function (err, result) {
                            util.sendResult(res, err, result);
                        });
                    } else if (req.session.user.cityID) {
                        Facilities.getFacilitiesByCity(req.session.user.cityID, function (err, result) {
                            util.sendResult(res, err, result);
                        });
                    } else {
                        res.status(403).end();
                        return;
                    }
                }
            }
        }
    }
    else {
        res.status(401).end();
        return;
    }
});

router.get('/regions', function (req, res) {
    if (req.session.user) {
        Facilities.getRegions(function (err, result) {
            util.sendResult(res, err, result);
        });
    }
    else {
        res.status(401).end();
        return;
    }
});

router.get('/:school', function (req, res) {
    var school;
    if (req.params.school === "-") {
        if (req.session.user) {
            if (req.session.user.schoolID) {
                school = req.session.user.schoolID;
            }
            else {
                res.status(403).end();
                return;
            }
        }
        else {
            res.status(401).end();
            return;
        }
    }
    else {
        school = parseInt(req.params.school);
    }

    Facilities.getFacilitiesBySchool(school, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/:school', function (req, res) {
    var school;
    if (req.params.school === "-") {
        if (req.session.user) {
            if (req.session.user.schoolID) {
                school = req.session.user.schoolID;
            }
            else {
                res.status(403).end();
                return;
            }
        }
        else {
            res.status(401).end();
            return;
        }
    }
    else {
        school = parseInt(req.params.school);
    }

    // Checking permissions
    if (!req.session.user.roles.indexOf('admin')) {
        if (school !== req.session.user.schoolID) {
            util.sendResult(res, {status: 403});
            return;
        }
    }

    Facilities.insertFacility(school, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.put('/:school/:facility', function (req, res) {
    var school;
    if (req.params.school === "-") {
        if (req.session.user) {
            if (req.session.user.schoolID) {
                school = req.session.user.schoolID;
            }
            else {
                res.status(403).end();
                return;
            }
        }
        else {
            res.status(401).end();
            return;
        }
    }
    else {
        school = parseInt(req.params.school);
    }

    // Checking permissions
    if (!req.session.user.roles.indexOf('admin')) {
        if (school !== req.session.user.schoolID) {
            util.sendResult(res, {status: 403});
            return;
        }
    }

    Facilities.updateFacility(school, parseInt(req.params.facility), req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

module.exports = router;

