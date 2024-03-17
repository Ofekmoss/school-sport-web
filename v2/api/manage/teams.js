var express = require('express');
var settings = require('../../../settings');

var Data = settings.v2test ? require('../../test/manage/data') : require('../../models/manage/data');

var util = require('../util');
var utils = require('../../models/utils');

var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.get('/', util.requireRole('admin'), function (req, res) {
    /* if (req.query.championship == null && req.query.category == null) {
        res.status(400).send('must provide championship or category');
        return;
    } */
    var options = {
        season: req.query.season,
        championship: req.query.championship,
        category: req.query.category,
        school: req.query.school,
        sport: req.query.sport,
        region: req.query.region
    };
    Data.getTeams(options, req.session.user, function(err, teams) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(teams);
        }
    });
});

router.get('/:category/:school/team-numbers', util.requireRole('admin'), function (req, res) {
    Data.getTeamNumbers(req.params.category, req.params.school, function (err, teamNumbers) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(utils.distinctArray(teamNumbers.map(t => (t.TeamNumber || '').replace("'", ""))));
        }
    });
});

router.get('/:id', util.requireRole('admin'), function (req, res) {
    if (req.params.id === 'counts') {
        Data.getTeamCounts({}, req.session.user, function (err, teamCounts) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).send(teamCounts);
            }
        });
    } else {
        Data.getTeams({id: req.params.id, season: req.query.season}, req.session.user, function (err, teams) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).send(teams.length > 0 ? teams[0] : {});
            }
        });
    }
});

router.post('/', util.requireRole('admin'), function (req, res) {
    Data.addTeam(req.session.user.seq || req.session.user.id, req.body, function(err, newTeam) {
        if (err) {
            var status = err.toString().toLowerCase().indexOf('error') === 0 ? 500 : 400;
            if (status === 400)
            {
                console.log(err);
                console.log(req.body);
            }
            res.status(status).send(err);
        } else {
            res.status(200).send(newTeam);
        }
    });
});

router.put('/', util.requireRole('admin'), function (req, res) {
    Data.editTeam(req.session.user.seq || req.session.user.id,req.body, function(err, resp) {
        if (err) {
            var status = err.toString().toLowerCase().indexOf('error') === 0 ? 500 : 400;
            res.status(status).send(err);
        } else {
            res.status(200).send(resp);
        }
    });
});

router.delete('/', util.requireRole('admin'), function (req, res) {
    var registrationId = req.query.Id;
    var teamId = req.query.TeamId;
    var confirmed = req.query.confirmed;
    if (typeof confirmed === 'undefined' || confirmed == null)
        confirmed = false;
    if (registrationId == null && teamId == null) {
        res.status(400).send('missing team id');
    } else {
        var options = {
            userId: req.session.user.seq || req.session.user.id,
            registrationId: registrationId,
            teamId: teamId,
            confirmed: confirmed
        };
        Data.deleteTeam(options, function (err, resp) {
            if (err) {
                var status = err.toString().toLowerCase().indexOf('error') === 0 ? 500 : 400;
                res.status(status).send(err);
            } else {
                res.status(200).send(resp);
            }
        });
    }
});

module.exports = router;