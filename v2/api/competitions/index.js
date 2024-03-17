var express = require('express');
var router = express.Router();
var settings = require('../../../settings');

var util = require('../util');

var Competitions = require('../../models/competitions');
var External = require('../../models/competitions/external');
// var Competitions = settings.v2test ? require('../../test/manage/competitions') : require('../../models/competitions');

// Programs

router.get('/seasons/:season', util.requireRole('admin'), async function (req, res) {
    try {
        //console.log('loading ' + req.params.id);
        var season = await Competitions.season(req.params.season);
        if (season) {
            res.status(200).send(season);
        }
        else {
            res.status(404).send("Season " + req.params.season + " not found");
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

router.get('/rulesets/:ruleset', util.requireRole('admin'), async function (req, res) {
    try {
        var season = await Competitions.ruleset(req.params.ruleset);
        if (season) {
            res.status(200).send(season);
        }
        else {
            res.status(404).send("Ruleset " + req.params.ruleset + " not found");
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

router.get('/disciplines', util.requireRole('admin'), async function (req, res) {
    try {
        var disciplines = await Competitions.disciplines();
        res.status(200).send(disciplines);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

router.get('/sports/:sport/disciplines', util.requireRole('admin'), async function (req, res) {
    try {
        var disciplines = await Competitions.disciplines(req.params.sport);
        res.status(200).send(disciplines);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

router.get('/matches/boards', util.requireRole('admin'), async function (req, res) {
    try {
        var boards = await Competitions.boards(req.query.participants == null ? null : parseInt(req.query.participants));
        var result = [];
        for (var key in boards) {
            result.push({id: key, name: boards[key].name});
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

router.get('/matches/boards/:board/:participants', util.requireRole('admin'), async function (req, res) {
    try {
        var result = await Competitions.board(req.params.board, parseInt(req.params.participants));
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

router.get('/:id', util.requireRole('admin'), async function (req, res) {
    try {
        //console.log('loading ' + req.params.id);
        var competition = await Competitions.get(req.params.id, !!req.query.reload);
        if (competition) {
            //console.log(competition);
            res.status(200).send(competition.compile(null, req.query.ver ? parseInt(req.query.ver) : null));
        }
        else {
            res.status(404).send("Competition " + req.params.id + " not found");
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Change event phase
router.put('/:competition/events/:event/phase',  util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result;
        if (req.body.next) {
            result = await competition.nextPhase(Competitions, req.params.event);
        }
        else if (req.body.previous) {
            result = await competition.previousPhase(Competitions, req.params.event, req.body.clearMatches);
        }

        if (result) {
            if (req.query.ver) {
                competition.compile(result, parseInt(req.query.ver));
            }
            res.status(200).send(result);
        }
        else {
            res.status(400).end();
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Insert phase
router.post('/:competition/events/:event/phases', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.insertPhase(Competitions, req.params.event, req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Update phase
router.put('/:competition/phases/:phase', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.updatePhase(Competitions, req.params.phase, req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Delete phase
router.delete('/:competition/phases/:phase', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.deletePhase(Competitions, req.params.phase, req.query.withData === "1");
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Insert group
router.post('/:competition/phases/:phase/groups', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.insertGroup(Competitions, req.params.phase, req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Assign group team
router.post('/:competition/groups/:group/teams', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.assignGroupTeam(Competitions, req.params.group, req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Update group rounds
router.post('/:competition/groups/:group/rounds', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.updateRounds(Competitions, req.params.group, req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Update group team
router.put('/:competition/groups/:group/teams/:placement', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.updateGroupTeam(Competitions, req.params.group, parseInt(req.params.placement), req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Remove team from group
router.delete('/:competition/groups/:group/teams/:placement', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.removeGroupTeam(Competitions, req.params.group, parseInt(req.params.placement));
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Delete group
router.delete('/:competition/groups/:group', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.deleteGroup(Competitions, req.params.group, req.query.withData === "1");
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Update group
router.put('/:competition/groups/:group', util.requireRole('admin'), async function (req, res) {
    try {
        var competition = await Competitions.get(req.params.competition);
        var result = await competition.updateGroup(Competitions, req.params.group, req.body);
        if (req.query.ver) {
            competition.compile(result, parseInt(req.query.ver));
        }
        res.status(200).send(result);
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Insert match
router.post('/:competition/groups/:group/matches', util.requireRole('admin'), async function (req, res) {
    try {
        try {
            var competition = await Competitions.get(req.params.competition);
            if (req.body.opponentA && typeof req.body.opponentA !== "number") {
                req.body.opponentA = parseInt(req.body.opponentA);
            }
            if (req.body.opponentB && typeof req.body.opponentB !== "number") {
                req.body.opponentB = parseInt(req.body.opponentB);
            }
            var result = await competition.insertMatch(Competitions, req.params.group, req.body);
            if (req.query.ver) {
                competition.compile(result, parseInt(req.query.ver));
            }
            res.status(200).send(result);
        }
        catch (err) {
            util.sendError(res, err);
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Update match
router.put('/:competition/matches/:match', util.requireRole('admin'), async function (req, res) {
    try {
        try {
            var competition = await Competitions.get(req.params.competition);
            if (req.body.opponentA && typeof req.body.opponentA !== "number") {
                req.body.opponentA = parseInt(req.body.opponentA);
            }
            if (req.body.opponentB && typeof req.body.opponentB !== "number") {
                req.body.opponentB = parseInt(req.body.opponentB);
            }
            if (req.body.venue != null) {
                req.body.venue = req.body.venue.toString();
            }
            req.body.match = req.params.match;
            var result = await competition.updateMatches(Competitions, [req.body]);
            if (req.query.ver) {
                competition.compile(result, parseInt(req.query.ver));
            }
            res.status(200).send(result);
        }
        catch (err) {
            util.sendError(res, err);
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Update multiple matches
router.post('/:competition/matches', util.requireRole('admin'), async function (req, res) {
    try {
        try {
            var competition = await Competitions.get(req.params.competition);
            var result = await competition.updateMatches(Competitions, req.body);
            if (req.query.ver) {
                competition.compile(result, parseInt(req.query.ver));
            }
            res.status(200).send(result);
        }
        catch (err) {
            util.sendError(res, err);
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Delete match
router.delete('/:competition/matches/:match', util.requireRole('admin'), async function (req, res) {
    try {
        try {
            var competition = await Competitions.get(req.params.competition);
            var result = await competition.deleteMatch(Competitions, req.params.match);
            if (req.query.ver) {
                competition.compile(result, parseInt(req.query.ver));
            }
            res.status(200).send(result);
        }
        catch (err) {
            util.sendError(res, err);
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});

// Build group matches
router.post('/:competition/groups/:group/matches/build', util.requireRole('admin'), async function (req, res) {
    try {
        try {
            var competition = await Competitions.get(req.params.competition);

            if (req.body.board) {
                var result = await competition.buildMatchesFromBoard(Competitions, req.params.group, req.body.board);
                if (req.query.ver) {
                    competition.compile(result, parseInt(req.query.ver));
                }
                res.status(200).send(result);
            }
            else {
                res.status(400).end();
            }
        }
        catch (err) {
            util.sendError(res, err);
        }
    }
    catch (err) {
        util.sendError(res, err);
    }
});


//------------------------------------------------------------------------------------
// Additional data used in competitions UI external to the competitions model
//------------------------------------------------------------------------------------
router.get("/ext/teams", util.requireRole('admin'), async function (req, res) {
    // Reads teams' region, school, city info
    if (req.query.id == null) {
        res.status(400).end();
    }
    else {
        try {
            var ids = Array.isArray(req.query.id) ? req.query.id : [req.query.id];
            var teamsInfo = await External.teamsInfo(ids);
            res.status(200).send(teamsInfo);
        }
        catch (err) {
            util.sendError(res, err);
        }
    }
});

module.exports = router;