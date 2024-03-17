var util = require('./util');
var Rules = require('./rules');
var ranking = require('./ranking');

//
//
// Competition
// -----------
//
// One or more events of a specific sport and category having a list of teams or participants
// competing each other.
// A competition can be:
//   Match - the competition is broken into matches where two opponents compete each other
//   Contest - the competition is broken into contests where multiple entrants are competing
// A competition can be:
//   Team - the opponents are teams - usually the case for match competitions. The scores are managed for teams only
//   Individual - the opponents are participants which can be part of the team. The scores are managed for the participants
//                The team might also have a score according to its participants scores.
// The type of the competition is determined by its Sport.
//
// A competition can be broken into Events. Usually for contest competition where each event is for a different discipline.
//
// Each event is broken to Phases. Each phase results in a ranking of the teams/participants of the phase.
// The phase is broken to Groups of teams/entrants, each with its own matches/contents and resulting in its own ranking.
// Between phases teams/participants process according to their ranking.
//
// A competition can belong to a Season - which is an instance of a Program over a specific period - usually each year
// A competition phase can belong to a Meeting - a sport event that takes place at a specific time range within the season
//
//
// Teams/participant references:
//   Cnnnn - Competition's nnnn team
//   PppRrr - Phase pp rank rr
//   GggRrr - Group gg rank rr
//   Wnnnn - winner of match nnnn
//   Lnnnn - loser of match nnnn
//
// DB tables according to previous version:
// Season = CHAMPIONSHIPS
// Competition - CHAMPIONSHIP_CATEGORIES
// Event - no table
// Phase - CHAMPIONSHIP_PHASES
// Group - CHAMPIONSHIP_GROUPS
//
// Id conversion
// Phase    - PHASE
// Group    - PHASE*100 + NGROUP
function GroupId(phase, group) {
    return phase*100 + group;
}
// Match    - PHASE*100000000 + NGROUP*1000000 + ROUND*10000 + CYCLE*100 + MATCH
function MatchId(phase, group, round, cycle, match) {
    return phase*100000000 + group*1000000 + round*10000 + cycle*100 + match;
}

// Contets -
// Event    - PHASE*10000 + SPORT_FIELD
function EventId(phase, sportField) {
    return phase*10000 + sportField;
}
// Group - PHASE*1000000 + NGROUP*10000 + COMPETITION*100 + HEAT
function ContestGroupId(phase, group, competition, heat) {
    return phase*1000000 + group*10000 + competition*100 + heat;
}

// Entrant - PHASE*100000000 + NGROUP*1000000 + COMPETITION*10000 + HEAT*100 + competitor
function EntrantId(phase, group, competition, heat, competitor) {
    return phase*100000000 + group*1000000 + competition*10000 + heat*100 + competitor;
}
// Discipline    - SPORT_FIELD_TYPE*1000 + SPORT_FIELD
function DisciplineId(sportFieldType, sportField) {
    return sportFieldType*1000 + (sportField||0);
}

function ensureMatchRound(match) {
    if (match.sequence.length > 1) {
        var round = match.sequence.slice(0, match.sequence.length - 1).join(":");
        if (match.group.rounds[round] === undefined) {
            match.group.rounds[round] = null;
        }
    }

}

// Team name login by school and city from previous version
function applyCityWithTeamName(schoolName, cityName) {
    if (!cityName) {
        return schoolName;
    }

    if (cityName.indexOf("תל אביב") >= 0) {
        cityName = "תל אביב";
    }
    if (cityName === "ראשון לציון") {
        if (schoolName.indexOf('רשל"צ') >= 0) {
            return schoolName;
        }
    }
    else {
        var initials = cityName.split(' ').reduce(function (c, p) {
            if (c.length > 0) {
                return p + c[0];
            }
            return '';
        }, "");
        if (initials.length > 2) {
            initials = initials.slice(0, initials.length - 1) + '"' + initials[initials.length - 1];
            if (schoolName.indexOf(initials) >= 0) {
                return cityName;
            }
        }
    }

    var sn = schoolName.replace('-', ' ').replace('"', '').replace("'", '').split(' ').filter(function (r) { return r !== ""}).join(" ");
    var cn = schoolName.replace('-', ' ').replace('"', '').replace("'", '').split(' ').filter(function (r) { return r !== ""}).join(" ");
    if (sn.indexOf(cn) >= 0) {
        return schoolName;
    }
    return schoolName + " " + cityName;
}

var hebBase = "אבגדהוזחט";
var hebTens = "יכלמנסעפצ";
function applyNumberWithTeamName(teamName, number) {
    if (!number || number < 0) {
        return teamName;
    }
    if (number > 99) {
        return teamName + " " + number;
    }
    var hebNum;
    if (number === 15) {
        hebNum = 'ט"ו';
    }
    else if (number === 16) {
        hebNum = 'ט"ז';
    }
    else if (number < 10) {
        hebNum = hebBase[number - 1] + "'";
    }
    else if (number % 10 === 0) {
        hebNum = hebTens[number / 10 - 1] + "'";
    }
    else {
        hebNum = hebTens[Math.floor(number/10)] + '"' +
            hebBase[(number % 10) - 1];
    }

    return teamName + " " + hebNum;
}

var Category = require('./category');

function convertUTCTime(date) {
    return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCMilliseconds());
}

function compareSequence(a, b) {
    var n = 0;
    while (n < a.length && n < b.length) {
        var d = a[n] - b[n];
        if (d !== 0) {
            return d;
        }
        n++;
    }
    return a.length - b.length;
}

var GroupState = {
    planned: 0,
    ready: 1,
    started: 2,
    completed: 3
};

function Event(competition, id, name, phase, discipline, version) {
    this.competition = competition;
    this.id = id;
    this.name = name;
    this.phase = Math.max(0, phase);
    this.discipline = discipline;
    this.phases = [];
    this.$self = version;
    this.$content = version;
}

Event.prototype.compile = function (competition, version) {
    if (this.$content > version || this.$self > version) {
        // Updating match numbers if required
        if (this.$matchNumbers == null || this.$matchNumbers < this.$content) {
            this.$matchNumbers = this.$content;
            var matchNumber = 0;
            for (var pi = 0; pi < this.phases.length; pi++) {
                var phase = this.phases[pi];
                var phaseChange = false;
                for (var gi = 0; gi < phase.groups.length; gi++) {
                    var group = phase.groups[gi];
                    var groupChange = false;
                    if (group.matches) {
                        for (var mi = 0; mi < group.matches.length; mi++) {
                            var match = group.matches[mi];
                            var number = matchNumber++;
                            if (match.number !== number) {
                                if (match.$self < this.$matchNumbers) {
                                    match.$self = this.$matchNumbers;
                                }
                                match.number = number;
                                groupChange = true;
                                phaseChange = true;
                            }
                        }
                    }
                    if (groupChange && group.$content < this.$matchNumbers) {
                        group.$content = this.$matchNumbers;
                    }
                }
                if (phaseChange && phase.$content < this.$matchNumbers) {
                    phase.$content = this.$matchNumbers;
                }

            }
        }

        if (!competition.events) {
            competition.events = {};
        }
        var event = {};
        competition.events[this.id] = event;
        if (this.$self > version) {
            event.name = this.name;
            event.phase = this.phase;
            if (this.discipline) {
                if (!competition.disciplines) {
                    competition.disciplines = {};
                }
                competition.disciplines[this.discipline.id] = {
                    id: this.discipline.id,
                    identifier: this.discipline.identifier,
                    name: this.discipline.name
                };
                event.discipline = this.discipline.id;
            }
        }
        if (this.$content > version) {
            event.phases = {};
            for (var n = 0; n < this.phases.length; n++) {
                this.phases[n].compile(event, version)
            }
        }
    }
};

function Phase(event, id, name, number, meeting, version) {
    this.event = event;
    this.id = id;
    this.name = name;
    this.number = number;
    this.meeting = meeting;
    this.groups = [];
    this.levels = [];
    this.$self = version;
    this.$content = version;
}

Phase.prototype.compile = function (event, version) {
    if (this.$deleted) {
        if (this.$deleted > version) {
            if (!event.phases) {
                event.phases = {};
            }
            event.phases[this.id] = null;
        }
    }
    else if (this.$content > version || this.$self > version) {
        if (!event.phases) {
            event.phases = {};
        }
        var phase = {};
        event.phases[this.id] = phase;
        if (this.$self > version) {
            phase.name = this.name;
            phase.number = this.number;
            phase.meeting = this.meeting;
        }
        if (this.$content > version) {
            phase.groups = {};
            for (var n = 0; n < this.groups.length; n++) {
                this.groups[n].compile(phase, version)
            }
            // If any level changes - reseting all levels
            for (var n = 0; n < this.levels.length; n++) {
                var level = this.levels[n];
                if (level.$self > version) {
                    phase.levels = {$reset: true};
                    break;
                }
            }
            if (phase.levels) {
                for (var n = 0; n < this.levels.length; n++) {
                    var level = this.levels[n];
                    phase.levels[n] = {name: level.name, format: level.format, count: level.count};
                }
            }
        }
    }
};

function Group(phase, id, name, number, state, sport, version) {
    this.phase = phase;
    this.id = id;
    this.name = name;
    this.number = number;
    this.state = state;
    this.$self = version;
    this.$content = version;
    this.$calculate = version;

    if (sport.individual) {
        this.entrants = [];
    }
    else {
        this.teams = [];
    }
    if (sport.match) {
        this.rounds = {
            $self: version
        };
        this.matches = [];
        this.updateRounds(version);
    }
}

function parseTeamReference(teamReference) {
    if (teamReference[0] === "C") {
        return {
            team: parseInt(teamReference.slice(1))
        };
    }
    else if (teamReference[0] === "P") {
        var p = teamReference.indexOf('R', 1);
        return {
            phase: parseInt(teamReference.slice(1, p)),
            position: parseInt(teamReference.slice(p + 1))
        };
    }
    else if (teamReference[0] === "G") {
        var p = teamReference.indexOf('R', 1);
        return {
            group: parseInt(teamReference.slice(1, p)),
            position: parseInt(teamReference.slice(p + 1))
        };
    }
    return null;
}

function getGroupTeam(teamReference, team) {
    if (team != null) {
        return team;
    }
    if (teamReference != null) {
        var reference = parseTeamReference(teamReference);
        if (reference != null && reference.team != null) {
            return reference.team;
        }
    }
    return null;
}

function compileGroupTeam(group, teamNumber) {
    if (teamNumber == null) {
        return {team: null};
    }
    var groupTeam = group.teams[teamNumber];
    var teamReference = groupTeam.teamReference;
    var team = groupTeam.team;

    if (teamReference) {
        var tr = parseTeamReference(teamReference);
        if (tr == null) {

        }
        else if (tr.team != null) {
            if (team == null) {
                if (group.phase.event.competition.teams[tr.team]) {
                    team = tr.team;
                }
            }

            return {
                teamReference: teamReference,
                reference: {team: tr.team},
                team: team
            };
        } else if (tr.phase != null) {
            // TODO - complete
            var phase = group.phase.event.competition.phases[tr.phase];
            if (phase) {
                // put team
            }
            return {
                teamReference: teamReference,
                reference: tr,
                team: team
            };
        } else if (tr.group != null) {
            // TODO - complete
            var group = group.phase.event.competition.groups[tr.group];
            if (group) {
                // put team
            }
            return {
                teamReference: teamReference,
                reference: tr,
                team: team
            };
        }
    }
    return {team: team};
}

function compileMatchOpponent(group, teamNumber, matchReference) {
    if (teamNumber == null) {
        if (matchReference != null) {
            if (matchReference[0] === "W") {
                return {
                    reference: {
                        winner: parseInt(matchReference.slice(1))
                    },
                    team: null
                };
            }
            else if (matchReference[0] === "L") {
                return {
                    reference: {
                        loser: parseInt(matchReference.slice(1))
                    },
                    team: null
                };
            }
        }
        return {team: null};
    }
    var groupTeam = group.teams[teamNumber];
    if (!groupTeam) {
        return {team: null, reference: {number: teamNumber}};
    }

    var teamReference = groupTeam.teamReference;
    var team = groupTeam.team;

    if (teamReference) {
        if (teamReference[0] === "C") {
            var reference = parseInt(teamReference.slice(1));
            if (team == null) {
                if (group.phase.event.competition.teams[reference]) {
                    team = reference;
                }
            }

            return {
                reference: teamNumber == null ? {team: reference} : {number: teamNumber},
                team: team
            };
        } else if (teamReference[0] === "P") {
            // TODO - complete
            var p = teamReference.indexOf('R', 1);
            var reference = {
                phase: parseInt(teamReference.slice(1, p)),
                position: parseInt(teamReference.slice(p + 1))
            };
            var phase = group.phase.event.competition.phases[reference.phase];
            if (phase) {
                // put team
            }
            return {
                reference: reference,
                team: team
            };
        }
    }
    return {team: team};
}

Group.prototype.updateRounds = function (version) {
    if (this.rounds) {
        var empty = {};
        for (var key in this.rounds) {
            if (this.rounds[key] == null) {
                empty[key] = true;
            }
        }
        var changed = false;
        var sequence = [];
        var finished = false;
        for (var l = 0; l < this.phase.levels.length; l++) {
            sequence.push(0);
            var count = this.phase.levels[l].count || 0;
            if (!count) {
                finished = true;
            }
        }
        while (!finished) {
            var key = sequence.join(":");
            if (this.rounds[key] === undefined) {
                this.rounds[key] = null;
                changed = true;
            }
            else {
                delete empty[key];
            }
            for (var l = this.phase.levels.length - 1; l >= 0; l--) {
                var count = this.phase.levels[l].count || 0;
                if (sequence[l] >= count - 1) {
                    sequence[l] = 0;
                }
                else {
                    sequence[l]++;
                    break;
                }
            }
            finished = l < 0;
        }
        for (var key in empty) {
            changed = true;
            delete this.rounds[key];
        }
        if (changed) {
            this.rounds.$self = version;
            return true;
        }
    }
    return false;
};

Group.prototype.recalculate = function (version) {
    this.$calculate = version;
    this.phase.event.competition.$calculated = false;
};

function getMatchRelativeOpponent(group, reference) {
    var match = group.phase.event.competition.matches[reference.slice(1)];
    if (!match || match.group !== group || match.outcome == null) {
        return null;
    }
    if (reference[0] === "W") {
        if (match.outcome === ranking.MatchOutcome.WinA || match.outcome === ranking.MatchOutcome.TechnicalA) {
            return match.opponentA;
        }
        if (match.outcome === ranking.MatchOutcome.WinB || match.outcome === ranking.MatchOutcome.TechnicalB) {
            return match.opponentB;
        }
    }
    else if (reference[0] === "L") {
        if (match.outcome === ranking.MatchOutcome.WinA || match.outcome === ranking.MatchOutcome.TechnicalA) {
            return match.opponentB;
        }
        if (match.outcome === ranking.MatchOutcome.WinB || match.outcome === ranking.MatchOutcome.TechnicalB) {
            return match.opponentA;
        }
    }
    return null;
}

Group.prototype.calculate = function (version) {
    if (this.$calculate) {
        if (this.matches) {
            // Setting unset match relative opponents
            var missingOpponent = true;
            var matchReferenceSet = true;
            while (missingOpponent && matchReferenceSet) {
                // Handling match reference chaining by looping while any opponent is missing and any reference is set
                missingOpponent = false;
                matchReferenceSet = false;
                for (var m = 0; m < this.matches.length; m++) {
                    var match = this.matches[m];
                    if (match.opponentA == null && match.matchReferenceA != null) {
                        match.opponentA = getMatchRelativeOpponent(this, match.matchReferenceA);
                        if (match.opponentA == null) {
                            missingOpponent = true;
                        } else {
                            matchReferenceSet = true;
                            match.$self = this.$calculate;
                        }
                    }
                    if (match.opponentB == null && match.matchReferenceB != null) {
                        match.opponentB = getMatchRelativeOpponent(this, match.matchReferenceB);
                        if (match.opponentB == null) {
                            missingOpponent = true;
                        } else {
                            matchReferenceSet = true;
                            match.$self = this.$calculate;
                        }
                    }
                }
            }

            var gameScore = this.phase.event.competition.rules.GameScore || {
                win: 0,
                loss: 0,
                tie: 0,
                technicalWin: 0,
                technicalLoss: 0
            };
            var rankingMethods = this.phase.event.competition.rules.TeamRanking || [{method: "Score"}];

            var teams = ranking.calculate(this.teams, this.matches, gameScore, rankingMethods);
            for (var n = 0; n < teams.length; n++) {
                var teamData = teams[n];
                var team = this.teams[n];
                var changed = false;
                for (var key in teamData) {
                    changed = changed || team[key] != teamData[key];
                    team[key] = teamData[key];
                }

                // This is for calling calculate after setting a match result and updating team versions as needed
                if (changed) {
                    team.$self = this.$calculate;
                }

            }
        }
        else if (this.entrants) {
            var event = this.phase.event;
            var scoreTable = event.competition.rules["ScoreTable" + event.discipline.identifier];
            if (scoreTable) {
                for (var n = 0; n < this.entrants.length; n++) {
                    var entrant = this.entrants[n];
                    if (entrant.score == null) {
                        delete entrant.points;
                    }
                    else {
                        entrant.points = scoreTable.getPoints(entrant.score);
                    }
                }
                var order = this.entrants.slice();
                order.sort(function (a, b) {
                    var d = 0;
                    if (a.points == null) {
                        if (b.points != null) {
                            return 1;
                        }
                    }
                    else if (b.points == null) {
                        return -1;
                    }
                    else {
                        d = b.points - a.points;
                    }
                    if (d === 0) {
                        if (scoreTable.direction === 0) {
                            d = b.score - a.score;
                        }
                        else {
                            d = a.score - b.score;
                        }
                    }
                    return d;
                });
                var position = 0;
                var last = null;
                for (var n = 0; n < order.length; n++) {
                    var e = order[n];
                    if (last != null && last.score != e.score) {
                        position++;
                    }
                    e.position = position;
                    last = e;
                }
            }
        }

        delete this.$calculate;
    }
};

Group.prototype.compile = function (phase, version) {
    if (this.$content > version || this.$self > version) {
        if (!phase.groups) {
            phase.groups = {};
        }
        var group = {};
        phase.groups[this.id] = group;
        if (this.$self > version) {
            group.name = this.name;
            group.number = this.number;
            group.state = this.state;
            group.gameBoard = this.gameBoard;
        }
        if (this.$reset > version) {
            version = 0;
            if (this.teams) {
                group.teams = {$reset: true};
            }
        }
        if (this.$content > version) {
            if (this.teams) {
                for (var n = 0; n < this.teams.length; n++) {
                    var team = this.teams[n];
                    if (team && team.$self > version) {
                        if (!group.teams) {
                            group.teams = {};
                        }
                        var groupTeam = compileGroupTeam(this, n);
                        groupTeam.position = team.position;
                        groupTeam.setPosition = team.setPosition;
                        groupTeam.score = team.score;
                        groupTeam.games = team.games;
                        groupTeam.points = team.points;
                        groupTeam.pointsAgainst = team.pointsAgainst;
                        groupTeam.smallPoints = team.smallPoints;
                        groupTeam.smallPointsAgainst = team.smallPointsAgainst;
                        groupTeam.sets = team.sets;
                        groupTeam.setsAgainst = team.setsAgainst;
                        groupTeam.wins = team.wins;
                        groupTeam.losses = team.losses;
                        groupTeam.ties = team.ties;
                        groupTeam.technicalWins = team.technicalWins;
                        groupTeam.technicalLosses = team.technicalLosses;
                        group.teams[n] = groupTeam;
                    }
                }
            }
            if (this.rounds && this.rounds.$self > version) {
                group.rounds = {};
                for (var key in this.rounds) {
                    if (key !== "$self") {
                        group.rounds[key] = this.rounds[key];
                    }
                }
            }
            if (this.matches) {
                // Match competition
                for (var n = 0; n < this.matches.length; n++) {
                    var match = this.matches[n];
                    if (match.$self > version) {
                        if (!group.matches) {
                            group.matches = {};
                        }
                        group.matches[match.id] = {
                            number: match.number,
                            sequence: match.sequence,
                            //opponentA: compileMatchOpponent(this, match.opponentA, match.matchReferenceA),
                            //opponentB: compileMatchOpponent(this, match.opponentB, match.matchReferenceB),
                            // So far it is easier to work with the data directly
                            opponentA: match.opponentA,
                            opponentB: match.opponentB,
                            matchReferenceA: match.matchReferenceA,
                            matchReferenceB: match.matchReferenceB,
                            venue: match.venue,
                            time: match.time,
                            scoreA: match.scoreA,
                            scoreB: match.scoreB,
                            smallPointsA: match.smallPointsA,
                            smallPointsB: match.smallPointsB,
                            outcome: match.outcome,
                            result: match.result,
                            functionaries: match.functionaries
                        };
                    }
                }
            }
            else {
                // Contest competition
                for (var n = 0; n < this.entrants.length; n++) {
                    var entrant = this.entrants[n];
                    if (entrant.$self > version) {
                        if (!group.entrants) {
                            group.entrants = {};
                        }
                        group.entrants[n] = {
                            id: entrant.id,
                            participant: entrant.participant,
                            score: entrant.score,
                            points: entrant.points,
                            position: entrant.position
                        };
                    }
                }
            }
        }
    }
};

function Competition(id, sport, name, category, season, version) {
    this.id = id;
    this.sport = sport;
    this.name = name;
    this.category = new Category(category);
    this.season = season;
    this.teams = {};
    this.events = {};
    this.phases = {};
    this.groups = {};
    this.rules = {};
    if (!sport.match) {
        this.participants = {};
    }
    this.$self = version;
    this.$content = version;
    this.$removed = [];
}

Competition.prototype.ensureNewVersion = async function (service, connection) {
    if (this.oldVersion) {
        // This instance is loaded from old version
        // All competition data is now stored into new tables

        var old = null;
        var transaction;
        var db = require('../db');

        try {
            old = await db.connect();
            transaction = await connection.transaction();

            // Saving sport if missing
            var records = await transaction.request(
                "select uid as \"uid\", Name as \"Name\", Type as \"Type\" " +
                "from Sports " +
                "where uid = @id",
                {id: this.sport.id});
            if (records.length === 0) {
                await transaction.request(
                    "insert into Sports(uid, Name, Type) " +
                    "values(@id, @name, @type)",
                    {
                        id: this.sport.id,
                        name: this.sport.name,
                        type: (this.sport.match ? 2 : 0) | (this.sport.individual ? 1 : 0)
                    }
                );
            }

            var disciplines = {};

            records = await transaction.request(
                "select uid as \"uid\", Identifier as \"Identifier\" " +
                "from Disciplines " +
                "where Sport = @sport",
                {sport: this.sport.id});
            for (var n = 0; n < records.length; n++) {
                var record = records[n];
                disciplines[record.Identifier] = record.uid;
            }

            if (this.ruleset != null) {
                records = await transaction.request(
                    "select uid as \"uid\" " +
                    "from Rulesets " +
                    "where uid = @id",
                    {id: this.ruleset});

                if (records.length === 0) {
                    // Copy old ruleset
                    records = await old.request("select RULESET_NAME as \"Name\" " +
                        "from RULESETS " +
                        "where RULESET_ID = @ruleset",
                        {ruleset: this.ruleset});
                    await transaction.request(
                        "insert into Rulesets(uid, Sport, Name, Category) " +
                        "values(@uid, @sport, @name, null) ",
                        {uid: this.ruleset, sport: this.sport.id, name: records.length > 0 ? records[0].Name : ""});

                    records = await old.request(
                        "select r.RULE_ID as \"RuleId\", r.RULE_TYPE_ID as \"Rule\", " +
                        "  r.SPORT_FIELD_TYPE_ID as \"SportFieldType\", r.SPORT_FIELD_ID as \"SportField\", " +
                        "  r.Category as \"Category\", r.Value as \"Value\", " +
                        "  sf.SPORT_FIELD_NAME as \"SportFieldName\", sft.SPORT_FIELD_TYPE_NAME as \"SportFieldTypeName\" " +
                        "from RULES as r " +
                        "  left outer join SPORT_FIELDS as sf on r.SPORT_FIELD_ID = sf.SPORT_FIELD_ID " +
                        "  left outer join SPORT_FIELD_TYPES as sft on r.SPORT_FIELD_TYPE_ID = sft.SPORT_FIELD_TYPE_ID " +
                        "where r.RULESET_ID = @ruleset",
                        {ruleset: this.ruleset});
                    for (var n = 0; n < records.length; n++) {
                        var record = records[n];
                        var discipline = null;
                        if (record.SportFieldType) {
                            // First checking discipline for sport field type
                            var disciplineIdentifier = "." + record.SportFieldType + ".";
                            discipline = disciplines[disciplineIdentifier];
                            if (!discipline) {
                                discipline = DisciplineId(record.SportFieldType).toString();
                                disciplines[disciplineIdentifier] = discipline;
                                await transaction.request("insert into Disciplines(uid, Sport, Identifier, Name) " +
                                    "values(@uid, @sport, @identifier, @name) ",
                                    {
                                        uid: discipline,
                                        sport: this.sport.id,
                                        identifier: disciplineIdentifier,
                                        name: record.SportFieldTypeName
                                    });
                            }
                            if (record.SportField) {
                                disciplineIdentifier = "." + record.SportFieldType + "." + record.SportField + ".";
                                discipline = disciplines[disciplineIdentifier];
                                if (!discipline) {
                                    discipline = DisciplineId(record.SportFieldType, record.SportField).toString();
                                    disciplines[disciplineIdentifier] = discipline;
                                    await transaction.request("insert into Disciplines(uid, Sport, Identifier, Name) " +
                                        "values(@uid, @sport, @identifier, @name) ",
                                        {
                                            uid: discipline,
                                            sport: this.sport.id,
                                            identifier: disciplineIdentifier,
                                            name: record.SportFieldName
                                        });
                                }
                            }
                        }
                        await transaction.request("insert into Rules(uid, Ruleset, RuleType, Discipline, Category, Value) " +
                            "values(@uid, @ruleset, @ruleType, @discipline, @category, @value) ",
                            {
                                uid: record.RuleId.toString(),
                                ruleset: this.ruleset,
                                ruleType: Rules.getRuleName(record.Rule),
                                discipline: discipline,
                                category: Category.convertOldCategory(record.Category),
                                value: record.Value
                            });
                    }
                }
            }

            if (this.season) {
                // Checking season exists
                var recs = await transaction.request("select count(*) as \"Count\" from Seasons where uid = @season", {season: this.season});
                if (!recs[0].Count) {
                    await transaction.request(
                        "insert into Seasons(uid, Name) " +
                        "values(@uid, @name) ",
                        {uid: this.season, name: this.name});
                }
            }

            await transaction.request(
                "insert into Competitions(uid, Sport, Name, Category, Season, Ruleset) " +
                "values(@uid, @sport, @name, @category, @season, @ruleset) ",
                {uid: this.id, sport: this.sport.id, name: this.name, category: this.category.value, season: this.season, ruleset: this.ruleset});

            for (var id in this.teams) {
                var team = this.teams[id];
                await transaction.request(
                    "insert into CompetitionTeams(Competition, Team, Name) " +
                    "values(@competition, @team, @name) ",
                    {competition: this.id, team: id, name: team.name});
            }

            if (this.participants) {
                for (var id in this.participants) {
                    var participant = this.participants[id];
                    await transaction.request(
                        "insert into CompetitionParticipants(Competition, Participant, Team, Number, Name) " +
                        "values(@competition, @participant, @team, @number, @name) ",
                        {competition: this.id, participant: id, team: participant.team, number: participant.number, name: participant.name});
                }
            }

            async function ensureDiscipline(discipline) {
                if (discipline) {
                    if (!disciplines[discipline.identifier]) {
                        await ensureDiscipline(discipline.base);
                        disciplines[discipline.identifier] = discipline.id;
                        await transaction.request("insert into Disciplines(uid, Sport, Identifier, Name) " +
                            "values(@uid, @sport, @identifier, @name) ",
                            {
                                uid: discipline.id,
                                sport: this.sport.id,
                                identifier: discipline.identifier,
                                name: discipline.name
                            });
                    }
                }
            }

            for (var eventId in this.events) {
                var event = this.events[eventId];
                await ensureDiscipline(event.discipline);
                await transaction.request(
                    "insert into CompetitionEvents(Competition, Event, Phase, Discipline) " +
                    "values(@competition, @event, @phase, @discipline) ",
                    {competition: this.id, event: event.id, phase: event.phase, discipline: event.discipline ? event.discipline.id : null});

                for (var p = 0; p < event.phases.length; p++) {
                    var phase = event.phases[p];
                    await transaction.request(
                        "insert into CompetitionPhases(Competition, Phase, Event, Number, Name) " +
                        "values(@competition, @phase, @event, @number, @name) ",
                        {
                            competition: this.id,
                            event: event.id,
                            phase: phase.id,
                            number: phase.number,
                            name: phase.name
                        });

                    for (var l = 0; l < phase.levels.length; l++) {
                        var level = phase.levels[l];
                        await transaction.request(
                            "insert into CompetitionOrganizationLevels(Competition, Phase, Level, Name, Format, Count_) " +
                            "values(@competition, @phase, @level, @name, @format, @count) ",
                            {competition: this.id, phase: phase.id, level: l, name: level.name, format: level.format, count: level.count});
                    }

                    for (var g = 0; g < phase.groups.length; g++) {
                        var group = phase.groups[g];
                        await transaction.request(
                            "insert into CompetitionGroups(Competition, Group_, Phase, Number, State, Name) " +
                            "values(@competition, @group, @phase, @number, @state, @name) ",
                            {
                                competition: this.id,
                                group: group.id,
                                phase: phase.id,
                                number: group.number,
                                state: group.state,
                                name: group.name
                            });

                        for (var t = 0; t < group.teams.length; t++) {
                            var groupTeam = group.teams[t];
                            await transaction.request(
                                "insert into CompetitionGroupTeams(Competition, Group_, Placement, TeamReference, Team) " +
                                "values(@competition, @group, @placement, @teamReference, @team) ",
                                {
                                    competition: this.id,
                                    group: group.id,
                                    placement: t,
                                    teamReference: groupTeam.teamReference,
                                    team: groupTeam.team
                                });
                        }

                        if (group.matches) {
                            for (var m = 0; m < group.matches.length; m++) {
                                var match = group.matches[m];
                                await transaction.request(
                                    "insert into CompetitionMatches(Competition, Match, Group_, Sequence, OpponentA, OpponentB, " +
                                    "  MatchReferenceA, MatchReferenceB, ScoreA, ScoreB, Outcome, Result) " +
                                    "values(@competition, @match, @group, @sequence, @opponentA, @opponentB, " +
                                    "  @matchReferenceA, @matchReferenceB, @scoreA, @scoreB, @outcome, @result) ",
                                    {
                                        competition: this.id,
                                        match: match.id,
                                        group: group.id,
                                        sequence: match.sequence.join(':'),
                                        opponentA: match.opponentA,
                                        opponentB: match.opponentB,
                                        matchReferenceA: match.matchReferenceA,
                                        matchReferenceB: match.matchReferenceB,
                                        scoreA: match.scoreA,
                                        scoreB: match.scoreB,
                                        outcome: match.outcome,
                                        result: match.result
                                    });

                                for (var role in match.functionaries) {
                                    await transaction.request(
                                        "insert into CompetitionMatchFunctionaries(Competition, Match, Role, Functionary) " +
                                        "values(@competition, @match, @role, @functionary) ",
                                        {
                                            competition: this.id,
                                            match: match.id,
                                            role: role,
                                            functionary: match.functionaries[role]
                                        });
                                }
                            }
                        }
                        if (group.entrants) {
                            for (var e = 0; e < group.entrants.length; e++) {
                                var entrant = group.entrants[t];
                                await transaction.request(
                                    "insert into CompetitionEntrants(Competition, Entrant, Group_, Placement, ParticipantReferent, Participant, Score, Result) " +
                                    "values(@competition, @entrant, @group, @placement, @participantReference, @participant, @score, @result) ",
                                    {
                                        competition: this.id,
                                        entrant: entrant.id,
                                        group: group.id,
                                        placement: e,
                                        participantReference: entrant.participantReference,
                                        participant: entrant.participant,
                                        score: entrant.score,
                                        result: entrant.result ? JSON.stringify(entrant.result) : null
                                    });
                            }
                        }
                    }
                }
            }
            await transaction.commit();
            delete this.oldVersion;
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            throw err;
        }
        finally {
            if (old) {
                old.complete();
            }
        }
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Events
//////////////////////////////////////////////////////////////////////////////////////////////////////
Competition.prototype.nextPhase = async function (service, eventId) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var event = this.events[eventId];
        if (!event) {
            throw new CompetitionError("Event " + eventId + " not found");
        }

        // Event phase is the phase number
        if (event.phase >= event.phases.length) {
            throw new CompetitionError("Event " + eventId + " is completed");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var currentPhase = null;
        if (event.phase >= 0) {
            currentPhase = event.phases[event.phase];
            await transaction.request(
                "update CompetitionGroups " +
                "set State = 3" + // Group completed
                "where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: currentPhase.id});
        }

        var nextPhase = null;
        if (event.phase < event.phases.length - 1) {
            nextPhase = event.phases[event.phase + 1];
            await transaction.request(
                "update CompetitionGroups " +
                "set State = 2" + // Group started
                "where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: nextPhase.id});
        }

        await transaction.request(
            "update CompetitionEvents " +
            "set Phase = @phase " +
            "where Competition = @competition and Event = @event",
            {competition: this.id, event: event.id, phase: event.phase + 1});

        var teamSets = [];
        if (nextPhase && currentPhase) {
            for (var g = 0; g < nextPhase.groups.length; g++) {
                var group = nextPhase.groups[g];
                for (var t = 0; t < group.teams.length; t++) {
                    var team = group.teams[t];
                    if (team.teamReference) {
                        var reference = parseTeamReference(team.teamReference);
                        if (reference && reference.group != null) {
                            var fromGroup = this.groups[reference.group];
                            if (fromGroup && fromGroup.phase.event == nextPhase.event && fromGroup.phase.number < nextPhase.number) {
                                var fromTeam = fromGroup.teams.find(function (team) { return team.position == reference.position; });
                                if (fromTeam && fromTeam.team != null) {
                                    await transaction.request(
                                        "update CompetitionGroupTeams " +
                                        "set Team = @team " +
                                        "where Competition = @competition and Group_ = @group and Placement = @placement",
                                        {competition: this.id, group: group.id, placement: t, team: fromTeam.team});
                                    teamSets.push({
                                        groupTeam: team,
                                        team: fromTeam.team
                                    });
                                }
                                else {
                                    // Team not found
                                }
                            }
                            else {
                                // Team not found - log? error?
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        event.phase++;
        this.$content = service.version;
        event.$self = service.version;
        event.$content = service.version;
        if (currentPhase) {
            currentPhase.$content = service.version;
            for (var n = 0; n < currentPhase.groups.length; n++) {
                var group = currentPhase.groups[n];
                group.state = GroupState.completed; // Group completed
                group.$self = service.version;
            }
        }

        if (nextPhase) {
            nextPhase.$content = service.version;
            for (var n = 0; n < nextPhase.groups.length; n++) {
                var group = nextPhase.groups[n];
                group.state = GroupState.started; // Group started
                group.$content = service.version;
                group.$self = service.version;
            }

            for (var n = 0; n < teamSets.length; n++) {
                var teamSet = teamSets[n];
                teamSet.groupTeam.team = teamSet.team;
                teamSet.groupTeam.$self = service.version;
            }
        }

        service.version++;
        return {
            $result: event.phase
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.previousPhase = async function (service, eventId, clearMatches) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var event = this.events[eventId];
        if (!event) {
            throw new CompetitionError("Event " + eventId + " not found");
        }

        // Event phase is the phase number
        if (event.phase <= 0) {
            throw new CompetitionError("Event " + eventId + " is not started");
        }

        // TODO - check if group has results - if so should have a specific flag saying if they should be deleted

        connection = await service.db.connect();

        var currentPhase = null;
        if (event.phase < event.phases.length) {
            currentPhase = event.phases[event.phase];

            if (!clearMatches) {
                for (var g = 0; g < currentPhase.groups.length; g++) {
                    var group = currentPhase.groups[g];
                    for (var m = 0; m < group.matches.length; m++) {
                        var match = group.matches[m];
                        if (match.outcome != null) {
                            throw new CompetitionError("Event " + eventId + " " + " match " + match.id + " has outcome");
                        }
                    }
                }
            }
        }

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        if (currentPhase) {
            currentPhase = event.phases[event.phase];
            await transaction.request(
                "update CompetitionGroups " +
                "set State = 1" + // Group ready
                "where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: currentPhase.id});

            await transaction.request(
                "update CompetitionMatches " +
                "set ScoreA = null, ScoreB = null, Outcome = null, Result = null " +
                "where Competition = @competition and Group_ in (" +
                "  select Group_ " +
                "  from CompetitionGroups " +
                "  where Competition = @competition and Phase = @phase)",
                {competition: this.id, phase: currentPhase.id});

            await transaction.request(
                "update CompetitionGroupTeams " +
                "set Team = null " +
                "where Competition = @competition and Group_ in (" +
                "  select Group_ " +
                "  from CompetitionGroups " +
                "  where Competition = @competition and Phase = @phase)",
                {competition: this.id, phase: currentPhase.id});
        }

        var previousPhase = null;
        if (event.phase >= 1) {
            previousPhase = event.phases[event.phase - 1];
            await transaction.request(
                "update CompetitionGroups " +
                "set State = 2" + // Group started
                "where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: previousPhase.id});
        }

        await transaction.request(
            "update CompetitionEvents " +
            "set Phase = @phase " +
            "where Competition = @competition and Event = @event",
            {competition: this.id, event: event.id, phase: event.phase - 1});

        // TODO - clear current phase group data that rely on previous group

        await transaction.commit();

        event.phase--;
        this.$content = service.version;
        event.$self = service.version;
        event.$content = service.version;
        if (currentPhase) {
            currentPhase.$content = service.version;
            for (var n = 0; n < currentPhase.groups.length; n++) {
                var group = currentPhase.groups[n];
                group.state = 1; // Group ready
                group.$self = service.version;
                group.$content = service.version;
                for (var t = 0; t < group.teams.length; t++) {
                    var groupTeam = group.teams[t];
                    groupTeam.team = null;
                    groupTeam.$self = service.version;
                }
                for (var m = 0; m < group.matches.length; m++) {
                    var match = group.matches[m];
                    if (match.outcome != null) {
                        match.scoreA = null;
                        match.scoreB = null;
                        match.outcome = null;
                        match.result = null;
                        match.$self = service.version;
                    }
                }
            }
        }

        if (previousPhase) {
            previousPhase.$content = service.version;
            for (var n = 0; n < previousPhase.groups.length; n++) {
                var group = previousPhase.groups[n];
                group.state = 2; // Group started

                // TODO - clear current phase group data that rely on previous group

                group.$self = service.version;
            }
        }

        service.version++;
        return {
            $result: event.phase
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Phases
//////////////////////////////////////////////////////////////////////////////////////////////////////
Competition.prototype.insertPhase = async function (service, eventId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var event = this.events[eventId];
        if (!event) {
            throw new CompetitionError("Event " + eventId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();


        var phaseNumbers = {};
        var number;
        if (data.number) {
            var records = await transaction.request(
                "update CompetitionPhases " +
                "set Number = Number + 1" +
                "output inserted.Phase as \"Phase\", inserted.Number as \"Number\" " +
                "where Competition = @competition and Event = @event and Number >= @number",
                {competition: this.id, event: event.id, number: data.number});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                phaseNumbers[record.Phase] = record.Number;
            }
        }
        else if (event.phases.length > 0) {
            data.number = event.phases[event.phases.length - 1].number + 1;
        }
        else {
            data.number = 1;
        }

        var rec = await transaction.request(
            "select MAX(Phase) as \"MaxId\" " +
            "from CompetitionPhases " +
            "where Competition = @competition",
            {competition: this.id});

        var phase = new Phase(event, (rec[0].MaxId || 0) + 1, data.name, data.number, data.meeting, service.version);

        await transaction.request(
            "insert into CompetitionPhases(Competition, Phase, Event, Name, Number) " +
            "values(@competition, @phase, @event, @name, @number)",
            {competition: this.id, event: event.id, phase: phase.id, name: phase.name, number: phase.number}
        );

        await transaction.commit();

        this.$content = service.version;
        event.$content = service.version;
        this.phases[phase.id] = phase;
        event.phases.push(phase);
        for (var n = 0; n < event.phases.length; n++) {
            var p = event.phases[n];
            var number = phaseNumbers[p.id];
            if (number != null) {
                p.number = number;
                p.$self = service.version;
            }
        }
        event.phases.sort(function (a, b) { return a.number - b.number; });

        service.version++;
        return {
            $result: phase.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.updatePhase = async function (service, phaseId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var phase = this.phases[phaseId];
        if (!phase) {
            throw new CompetitionError("Phase " + phaseId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var set = null;

        var numberChanged = false;
        var phaseNumbers = {};
        if (data.number && data.number != phase.number) {
            set = "Number = @number";
            numberChanged = true;
            var records = await transaction.request(
                "update CompetitionPhases " +
                (phase.number < data.number
                    ? "set Number = Number - 1 " +
                      "output inserted.Phase as \"Phase\", inserted.Number as \"Number\" " +
                      "where Competition = @competition and Number <= @number and Number > @current"
                    : "set Number = Number + 1 " +
                      "output inserted.Phase as \"Phase\", inserted.Number as \"Number\" " +
                      "where Competition = @competition and Event = @event and Number >= @number and Number < @current"),
                {competition: this.id, event: phase.event.id, number: data.number, current: phase.number});
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                phaseNumbers[record.Phase] = record.Number;
            }
        }
        if (data.name) {
            set = (set ? set + ", " : "") + "Name = @name";
        }

        if (set) {
            await transaction.request(
                "update CompetitionPhases " +
                "set " + set +
                " where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: phase.id, name: data.name, number: data.number});
        }

        if (data.levels) {
            await transaction.request(
                "delete from CompetitionOrganizationLevels " +
                "where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: phase.id}
            );

            for (var l = 0; l < data.levels.length; l++) {
                var level = data.levels[l];
                await transaction.request(
                    "insert into CompetitionOrganizationLevels(Competition, Phase, Level, Name, Format, Count_) " +
                    "values(@competition, @phase, @level, @name, @format, @count)",
                    {competition: this.id, phase: phase.id, level: l, name: level.name, format: level.format, count: level.count}
                );
            }
        }

        await transaction.commit();

        this.$content = service.version;
        phase.event.$content = service.version;
        if (data.name) {
            phase.$self = service.version;
            phase.name = data.name;
        }
        if (numberChanged) {
            phase.$self = service.version;
            phase.number = data.number;
            for (var n = 0; n < phase.event.phases.length; n++) {
                var p = phase.event.phases[n];
                var number = phaseNumbers[p.id];
                if (number != null) {
                    p.number = number;
                    p.$self = service.version;
                }
            }
            phase.event.phases.sort(function (a, b) {
                return a.number - b.number;
            });
        }
        if (data.levels) {
            phase.$content = service.version;
            phase.levels.splice(0, phase.levels.length);
            for (var l = 0; l < data.levels.length; l++) {
                var level = data.levels[l];
                phase.levels.push({
                    name: level.name,
                    format: level.format,
                    count: level.count,
                    $self: service.version
                });
            }

            for (var g = 0; g < phase.groups.length; g++) {
                var group = phase.groups[g];
                if (group.updateRounds(service.version)) {
                    group.$content = service.version;
                }
            }

        }

        service.version++;
        return {
            $result: phase.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.deletePhase = async function (service, phaseId, withData) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var phase = this.phases[phaseId];
        if (!phase) {
            throw new CompetitionError("Phase " + phaseId + " not found");
        }
        if (!withData) {
            if (phase.groups.length > 0) {
                throw new CompetitionError("Phase " + phaseId + " is not empty");
            }
        }


        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var set = null;

        if (withData) {
            await transaction.request(
                "delete from CompetitionMatches " +
                "where Competition = @competition and Group_ in " +
                "   (select Group_ " +
                "    from CompetitionGroups " +
                "    where Competition = @competition and Phase = @phase)",
                {competition: this.id, phase: phase.id});

            await transaction.request(
                "delete from CompetitionGroupTeams " +
                "where Competition = @competition and Group_ in " +
                "   (select Group_ " +
                "    from CompetitionGroups " +
                "    where Competition = @competition and Phase = @phase)",
                {competition: this.id, phase: phase.id});

            await transaction.request(
                "delete from CompetitionGroups " +
                "where Competition = @competition and Phase = @phase",
                {competition: this.id, phase: phase.id});
        }

        var phaseNumbers = {};
        await transaction.request(
            "delete from CompetitionPhases " +
            "where Competition = @competition and Phase = @phase",
            {competition: this.id, phase: phase.id});
        var records = await transaction.request(
            "update CompetitionPhases " +
            "set Number = Number - 1 " +
            "output inserted.Phase as \"Phase\", inserted.Number as \"Number\" " +
            "where Competition = @competition and Event = @event and Number > @number",
            {competition: this.id, event: phase.event.id, number: phase.number});
        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            phaseNumbers[record.Phase] = record.Number;
        }

        await transaction.commit();

        if (withData) {
            for (var g = 0; g < phase.groups.length; g++) {
                var group = phase.groups[g];
                for (var m = 0; m < group.matches.length; m++) {
                    delete this.matches[group.matches[m].id];
                }
                delete this.groups[group.id];
            }
        }

        this.$content = service.version;
        delete this.phases[phase.id];
        this.$removed.push({ver: service.version, event: phase.event.id, phase: phase.id});
        phase.event.$content = service.version;
        var n = 0;
        while (n < phase.event.phases.length) {
            var p = phase.event.phases[n];
            if (p === phase) {
                phase.event.phases.splice(n, 1);
            }
            else {
                var number = phaseNumbers[p.id];
                if (number != null) {
                    p.number = number;
                    p.$self = service.version;
                }
                n++;
            }
        }

        service.version++;
        return {};
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Groups
//////////////////////////////////////////////////////////////////////////////////////////////////////

Competition.prototype.insertGroup = async function (service, phaseId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var phase = this.phases[phaseId];
        if (!phase) {
            throw new CompetitionError("Phase " + phaseId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var groupNumbers = {};
        var number;
        if (data.number) {
            var records = await transaction.request(
                "update CompetitionGroups " +
                "set Number = Number + 1 " +
                "output inserted.Group_ as \"Group\", inserted.Number as \"Number\" " +
                "where Competition = @competition and Phase = @phase and Number >= @number",
                {competition: this.id, phase: phase.id, number: data.number});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                groupNumbers[record.Group] = record.Number;
            }
        }
        else if (phase.groups.length > 0) {
            data.number = phase.groups[phase.groups.length - 1].number + 1;
        }
        else {
            data.number = 1;
        }

        var rec = await transaction.request(
            "select MAX(Group_) as \"MaxId\" " +
            "from CompetitionGroups " +
            "where Competition = @competition",
            {competition: this.id});

        var group = new Group(phase, (rec[0].MaxId || 0) + 1, data.name, data.number, null, this.sport, service.version);

        await transaction.request(
            "insert into CompetitionGroups(Competition, Group_, Phase, Name, Number) " +
            "values(@competition, @group, @phase, @name, @number)",
            {competition: this.id, phase: phase.id, group: group.id, name: group.name, number: group.number}
        );

        await transaction.commit();

        this.$content = service.version;
        phase.event.$content = service.version;
        phase.$content = service.version;
        this.groups[group.id] = group;
        phase.groups.push(group);
        for (var n = 0; n < phase.groups.length; n++) {
            var g = phase.groups[n];
            var number = groupNumbers[g.id];
            if (number != null) {
                g.number = number;
                g.$self = service.version;
            }
        }
        phase.groups.sort(function (a, b) { return a.number - b.number; });

        service.version++;
        return {
            $result: group.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.updateGroup = async function (service, groupId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var set = null;

        var numberChanged = false;
        var groupNumbers = {};
        if (data.number != null && data.number != group.number) {
            set = "Number = @number";
            numberChanged = true;
            var records = await transaction.request(
                "update CompetitionGroups " +
                (group.number < data.number
                    ? "set Number = Number - 1 " +
                    "output inserted.Group_ as \"Group\", inserted.Number as \"Number\" " +
                    "where Competition = @competition and Number <= @number and Number > @current"
                    : "set Number = Number + 1 " +
                    "output inserted.Group_ as \"Group\", inserted.Number as \"Number\" " +
                    "where Competition = @competition and Phase = @phase and Number >= @number and Number < @current"),
                {competition: this.id, phase: group.phase.id, number: data.number, current: group.number});
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                groupNumbers[record.Group] = record.Number;
            }
        }
        if (data.name) {
            set = (set ? set + ", " : "") + "Name = @name";
        }

        if (set) {
            await transaction.request(
                "update CompetitionGroups " +
                "set " + set +
                " where Competition = @competition and Group_ = @group",
                {competition: this.id, group: group.id, name: data.name, number: data.number});
        }

        await transaction.commit();

        this.$content = service.version;
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        group.$self = service.version;
        if (data.name) {
            group.name = data.name;
        }
        if (numberChanged) {
            group.number = data.number;
            for (var n = 0; n < group.phase.groups.length; n++) {
                var p = group.phase.groups[n];
                var number = groupNumbers[p.id];
                if (number != null) {
                    p.number = number;
                    p.$self = service.version;
                }
            }
            group.phase.groups.sort(function (a, b) {
                return a.number - b.number;
            });
        }

        service.version++;
        return {
            $result: group.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.updateRounds = async function (service, groupId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var updates = [];
        for (var sequence in data) {
            var name = data[sequence];
            var round = group.rounds[sequence];
            if (!round) {
                if (name) {
                    updates.push({
                        competition: this.id,
                        group: group.id,
                        sequence: sequence,
                        name: name,
                        insert: true
                    });
                }
            }
            else {
                updates.push({
                    competition: this.id,
                    group: group.id,
                    sequence: sequence,
                    name: name
                });
            }
        }

        for (var i = 0; i < updates.length; i++) {
            var update = updates[i];
            if (update.insert) {
                await transaction.request(
                    "insert into CompetitionGroupRounds(Competition, Group_, Sequence, Name) " +
                    "values(@competition, @group, @sequence, @name)",
                    update);
            }
            else if (update.name) {
                await transaction.request(
                    "update CompetitionGroupRounds " +
                    "set Name = @name " +
                    "where Competition = @competition and Group_ = @group and Sequence = @sequence",
                    update);
            }
            else {
                await transaction.request(
                    "delete from CompetitionGroupRounds " +
                    "where Competition = @competition and Group_ = @group and Sequence = @sequence",
                    update);
            }
        }

        await transaction.commit();

        if (updates.length > 0) {
            for (var i = 0; i < updates.length; i++) {
                var update = updates[i];
                group.rounds[update.sequence] = update.name;
            }
            this.$content = service.version;
            group.phase.event.$content = service.version;
            group.phase.$content = service.version;
            group.$content = service.version;
            group.rounds.$self = service.version;
        }

        service.version++;
        return {
            $result: group.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.deleteGroup = async function (service, groupId, withData) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }
        if (!withData) {
            if ((group.teams && group.teams.length) > 0 || (group.matches && group.matches.length > 0) || (group.entrants && group.entrants.length > 0)) {
                throw new CompetitionError("Group " + groupId + " is not empty");
            }
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var set = null;

        if (withData) {
            await transaction.request(
                "delete from CompetitionMatches " +
                "where Competition = @competition and Group_ = @group",
                {competition: this.id, group: group.id});

            await transaction.request(
                "delete from CompetitionGroupTeams " +
                "where Competition = @competition and Group_ = @group",
                {competition: this.id, group: group.id});
        }

        var groupNumbers = {};
        await transaction.request(
            "delete from CompetitionGroups " +
            "where Competition = @competition and Group_ = @group",
            {competition: this.id, group: group.id});
        var records = await transaction.request(
            "update CompetitionGroups " +
            "set Number = Number - 1 " +
            "output inserted.Group_ as \"Group\", inserted.Number as \"Number\" " +
            "where Competition = @competition and Phase = @phase and Number > @number",
            {competition: this.id, phase: group.phase.id, number: group.number});
        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            groupNumbers[record.Group] = record.Number;
        }

        await transaction.commit();

        if (withData) {
            for (var m = 0; m < group.matches.length; m++) {
                delete this.matches[group.matches[m].id];
            }
        }

        this.$content = service.version;
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        delete this.groups[group.id];
        this.$removed.push({ver: service.version, event: group.phase.event.id, phase: group.phase.id, group: group.id});
        var n = 0;
        while (n < group.phase.groups.length) {
            var p = group.phase.groups[n];
            if (p === group) {
                group.phase.groups.splice(n, 1);
            }
            else {
                var number = groupNumbers[p.id];
                if (number != null) {
                    p.number = number;
                    p.$self = service.version;
                }
                n++;
            }
        }

        service.version++;
        return {};
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Group Teams
//////////////////////////////////////////////////////////////////////////////////////////////////////
Competition.prototype.assignGroupTeam = async function (service, groupId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }
        if (group.state && group.state > GroupState.started) {
            // Group was started
            // TODO - later should enable changes with specific setting in data
            throw new CompetitionError("Group " + groupId + " was started");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var team = null;
        var reference = data.reference;
        if (!reference && data.team) {
            reference = "C" + data.team;
        }
        
        if (data.replace != null) {
            if (data.placement == null) {
                throw new CompetitionError("Missing replace placement");
            }

            if (data.placement < 0 || data.placement >= group.teams.length) {
                throw new CompetitionError("Placement out of range");
            }

            var source = null;
            var sourceGroupTeam = null;
            var sourceGroup = group;

            if (data.group) {
                sourceGroup = this.groups[data.group];
                if (!sourceGroup) {
                    throw new CompetitionError("Group " + data.group + " not found");
                }

                if (data.replace < 0 || data.replace >= sourceGroup.teams.length) {
                    throw new CompetitionError("Replace placement out of range");
                }

                source = data.replace;
                sourceGroupTeam = sourceGroup.teams[source];
                reference = sourceGroupTeam.teamReference;
            }
            else {
                for (var g = 0; !source && g < group.phase.groups.length; g++) {
                    var grp = group.phase.groups[g];
                    for (var n = 0; n < grp.teams.length; n++) {
                        if (grp.teams[n].teamReference === data.reference) {
                            source = n;
                            sourceGroupTeam = grp.teams[n];
                            sourceGroup = grp;
                            break;
                        }
                    }
                }

                if (sourceGroup === group && source === data.placement) {
                    throw new CompetitionError("Cannot team replace with itself");
                }
            }

            var groupTeam = group.teams[data.placement];

            // TODO - what if match already has a team?

            if (source != null) {
                // Clear team reference to prevent unique - will be set later
                await transaction.request(
                    "update CompetitionGroupTeams " +
                    "set TeamReference = 'CHANGE' " +
                    "where Competition = @competition and " +
                    "  Group_ = @group and " +
                    "  Placement = @placement ",
                    {
                        competition: this.id,
                        group: groupId,
                        placement: data.placement
                    });

                await transaction.request(
                    "update CompetitionGroupTeams " +
                    "set TeamReference = @teamReference " +
                    "where Competition = @competition and " +
                    "  Group_ = @group and " +
                    "  Placement = @placement ",
                    {
                        competition: this.id,
                        group: sourceGroup.id,
                        placement: source,
                        teamReference: groupTeam.teamReference
                    });
            }

            await transaction.request(
                "update CompetitionGroupTeams " +
                "set TeamReference = @teamReference " +
                "where Competition = @competition and " +
                "  Group_ = @group and " +
                "  Placement = @placement ",
                {
                    competition: this.id,
                    group: groupId,
                    placement: data.placement,
                    teamReference: reference
                });

            await transaction.commit();

            if (sourceGroupTeam) {
                sourceGroupTeam.teamReference = groupTeam.teamReference;
                sourceGroupTeam.team = groupTeam.team;
                sourceGroupTeam.$self = service.version;

                if (sourceGroup !== group) {
                    sourceGroup.$content = service.version;
                }
            }

            groupTeam.teamReference = reference;
            groupTeam.team = team;
            groupTeam.$self = service.version;
        }
        else {
            if (data.placement == null) {
                var rec = await transaction.request(
                    "select MAX(Placement) as \"MaxPlacement\" " +
                    "from CompetitionGroupTeams " +
                    "where Competition = @competition and Group_ = @group ",
                    {competition: this.id, group: groupId});

                if (rec.length > 0) {
                    data.placement = rec[0].MaxPlacement == null ? 0 : rec[0].MaxPlacement + 1;
                } else {
                    data.placement = 0;
                }
            } else {
                await transaction.request(
                    "update CompetitionGroupTeams " +
                    "set Placement = Placement + 1 " +
                    "where Competition = @competition and " +
                    "  Group_ = @group and " +
                    "  Placement >= @placement ",
                    {competition: this.id, group: groupId, placement: data.placement});
            }

            var source = null;
            var sourceGroupTeam = null;
            var sourceGroup = null;

            if (reference) {
                for (var g = 0; !source && g < group.phase.groups.length; g++) {
                    var grp = group.phase.groups[g];
                    for (var n = 0; n < grp.teams.length; n++) {
                        if (grp.teams[n].teamReference === reference) {
                            source = n;
                            sourceGroup = grp;
                            sourceGroupTeam = grp.teams[n];
                            break;
                        }
                    }
                }
            }
            else {
                var emptyNum = 0;
                for (var n = 0; n < group.teams.length; n++) {
                    var gt = group.teams[n];
                    if (gt.teamReference[0] === "E") {
                        var num = parseInt(gt.teamReference.slice(1));
                        if (num >= emptyNum) {
                            emptyNum = num + 1;
                        }
                    }
                }
                reference = "E" + emptyNum;
            }

            if (data.move) {
                if (!sourceGroupTeam) {
                    throw new CompetitionError("Source team " + reference + " not found");
                }
                else if (sourceGroup === group) {
                    throw new CompetitionError("Source team " + reference + " already exists in group");
                }
                else {
                    await transaction.request(
                        "delete from CompetitionGroupTeams " +
                        "where Competition = @competition and " +
                        "  Group_ = @group and " +
                        "  Placement = @placement ",
                        {competition: this.id, group: sourceGroup.id, placement: source});

                    await transaction.request(
                        "update CompetitionGroupTeams " +
                        "set Placement = Placement - 1 " +
                        "where Competition = @competition and " +
                        "  Group_ = @group and " +
                        "  Placement >= @placement ",
                        {competition: this.id, group: sourceGroup.id, placement: source});
                }

            }
            else if (sourceGroupTeam) {
                throw new CompetitionError("Team " + sourceGroupTeam.teamReference + " already exists in group" +
                    (sourceGroup === group ? "" : " " + sourceGroup.number), "TEAM-ALREADY-IN-GROUP");
            }

            await transaction.request(
                "insert into CompetitionGroupTeams(Competition, Group_, Placement, Team, TeamReference) " +
                "values(@competition, @group, @placement, @team, @teamReference)",
                {
                    competition: this.id,
                    group: groupId,
                    placement: data.placement,
                    teamReference: reference,
                    team: team
                });

            await transaction.commit();

            if (sourceGroup) {
                sourceGroup.teams.splice(source, 1);

                for (var p = source; p < sourceGroup.teams.length; p++) {
                    // Placement changed
                    sourceGroup.teams[p].$self = service.version;
                }

                sourceGroup.recalculate(service.version);
                sourceGroup.$content = service.version;
                sourceGroup.$reset = service.version;
            }

            group.teams.splice(data.placement, 0, {
                teamReference: reference,
                team: team,
                $self: service.version
            });

            for (var p = data.placement + 1; p < group.teams.length; p++) {
                // Placement changed
                group.teams[p].$self = service.version;
            }
        }

        this.$content = service.version;
        group.recalculate(service.version);
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        group.$content = service.version;

        service.version++;
        return {
            $result: data.placement
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.updateGroupTeam = async function (service, groupId, placement, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        var actions = null;

        if (data.position !== undefined) {
            if (data.position < 0 || data.position >= group.teams.length) {
                throw new CompetitionError("Team position out of range");
            }
            actions = [{
                update: {
                    competition: this.id,
                    group: groupId,
                    placement: placement,
                    position: data.position
                },
                team: group.teams[placement]
            }];

            if (data.position != null) {
                // Getting all teams with positions
                // TODO - fix this - will not actually work when changing rank to a ranked team - should consider actual position too
                var posTeams = [];
                for (var n = 0; n < group.teams.length; n++) {
                    var t = group.teams[n];
                    if (t.setPosition != null && n !== placement) {
                        posTeams.push({placement: n, team: t});
                    }
                }
                posTeams.sort(function (a, b) {
                    return a.team.setPosition - b.team.setPosition;
                });
                var lastPosition = data.position;
                for (var n = 0; n < posTeams.length; n++) {
                    var ps = posTeams[n];
                    if (ps.team.setPosition == lastPosition) {
                        lastPosition++;
                        actions.push({
                            update: {
                                competition: this.id,
                                group: groupId,
                                placement: ps.placement,
                                position: lastPosition
                            },
                            team: ps.team
                        });
                    } else if (ps.team.setPosition > lastPosition) {
                        break;
                    }
                }
            }
        }

        if (actions == null) {
            throw new CompetitionError("No team field set");
        }

        transaction = await connection.transaction();

        for (var a = 0; a < actions.length; a++) {
            await transaction.request(
                "update CompetitionGroupTeams " +
                "set SetPosition = @position " +
                "where Competition = @competition and Group_ = @group and Placement = @placement",
                actions[a].update);
        }

        await transaction.commit();

        this.$content = service.version;
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        group.$content = service.version;
        group.recalculate(service.version);

        for (var a = 0; a < actions.length; a++) {
            var action = actions[a];
            action.team.setPosition = action.update.position;
            action.team.$self = service.version;
        }
        service.version++;
        return {
            $result: group.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.removeGroupTeam = async function (service, groupId, placement) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }
        if (group.state && group.state > GroupState.started) {
            // Group was started
            // TODO - later should enable changes with specific setting in data
            throw new CompetitionError("Group " + groupId + " was started");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        await transaction.request(
            "delete from CompetitionGroupTeams " +
            "where Competition = @competition and " +
            "  Group_ = @group and " +
            "  Placement = @placement ",
            {competition: this.id, group: groupId, placement: placement});

        await transaction.request(
            "update CompetitionGroupTeams " +
            "set Placement = Placement - 1 " +
            "where Competition = @competition and " +
            "  Group_ = @group and " +
            "  Placement >= @placement ",
            {competition: this.id, group: groupId, placement: placement});

        await transaction.commit();

        group.teams.splice(placement, 1);

        for (var p = placement; p < group.teams.length; p++) {
            // Placement changed
            group.teams[p].$self = service.version;
        }

        this.$content = service.version;
        group.recalculate(service.version);
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        group.$content = service.version;
        group.$reset = service.version;

        service.version++;
        return {
            $result: placement
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////
// Matches
//////////////////////////////////////////////////////////////////////////////////////////////////////
Competition.prototype.insertMatch = async function (service, groupId, data) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }

        if (data.matchReferenceA != null) {
            if (data.opponentA != null) {
                throw new CompetitionError("Opponent A cannot be set along with a match reference");
            }
        }
        else if (data.opponentA < 0 || data.opponentA >= group.teams.length) {
            throw new CompetitionError("Opponent A " + data.opponentA + " out of range");
        }
        if (data.matchReferenceB != null) {
            if (data.opponentB != null) {
                throw new CompetitionError("Opponent B cannot be set along with a match reference");
            }
        }
        else if (data.opponentB < 0 || data.opponentB >= group.teams.length) {
            throw new CompetitionError("Opponent B " + data.opponentB + " out of range");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var rec = await transaction.request(
            "select MAX(Match) as \"MaxId\" " +
            "from CompetitionMatches " +
            "where Competition = @competition",
            {competition: this.id});

        if (data.sequence == null) {
            var max = [];
            for (var n = 0; n < group.matches.length; n++) {
                var match = group.matches[n];
                if (compareSequence(match.sequence, max) > 0) {
                    max = match.sequence;
                }
            }
            if (max.length === 0) {
                data.sequence = [0, 0, 0]; // TODO - this is default for now, i.e. first round, first cycle, first match
            }
            else {
                data.sequence = max.slice();
                data.sequence[data.sequence.length - 1]++;
            }
        }
        else {
            // TODO - update match sequences in same part
        }

        var match = {
            group: group,
            id: (rec[0].MaxId || 0) + 1,
            sequence: data.sequence,
            opponentA: data.opponentA,
            opponentB: data.opponentB,
            matchReferenceA: data.matchReferenceA,
            matchReferenceB: data.matchReferenceB,
            venue: data.venue,
            time: data.time,
            functionaries: data.functionaries || {},
            $self: service.version
        };

        await transaction.request(
            "insert into CompetitionMatches(Competition, Match, Group_, Sequence, OpponentA, OpponentB, MatchReferenceA, MatchReferenceB, Venue, Time) " +
            "values(@competition, @match, @group, @sequence, @opponentA, @opponentB, @matchReferenceA, @matchReferenceB, @venue, @time)",
            {
                competition: this.id,
                match: match.id,
                group: groupId,
                sequence: match.sequence.join(':'),
                opponentA: match.opponentA,
                opponentB: match.opponentB,
                matchReferenceA: match.matchReferenceA,
                matchReferenceB: match.matchReferenceB,
                venue: match.venue,
                time: match.time
            });

        await transaction.commit();

        this.matches[match.id] = match;
        ensureMatchRound(match);
        for (var n = 0; n <= group.matches.length; n++) {
            if (n === group.matches.length) {
                group.matches.push(match);
                break;
            }
            else if (compareSequence(group.matches[n].sequence, match.sequence) > 0) {
                group.matches.splice(n, 0, match);
                break;
            }
        }

        this.$content = service.version;
        group.recalculate(service.version);
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        group.rounds.$self = service.version;

        service.version++;
        return {
            $result: match.id
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.updateMatches = async function (service, matches) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    var sequenceChanges = [];
    var actions = [];
    var groups = {};
    try {
        for (var n = 0; n < matches.length; n++) {
            var data = matches[n];
            var match = this.matches[data.match];
            if (!match) {
                throw new CompetitionError("Match " + data.match + " not found");
            }
            var group = match.group;

            var action = {
                update: {
                    competition: this.id,
                    match: data.match
                },
                sets: [],
                functionaries: [],
                match: match,
                data: data
            };

            var hasSet = false;
            if (data.matchReferenceA != null) {
                if (data.opponentA != null) {
                    throw new CompetitionError("Opponent A cannot be set along with a match reference");
                }
                hasSet = true;
                action.update.matchReferenceA = data.matchReferenceA;
                action.sets.push("MatchReferenceA = @matchReferenceA");
            }
            else if (data.opponentA != null) {
                hasSet = true;
                if (data.opponentA === match.opponentA) {
                    delete data.opponentA;
                }
                else {
                    if (data.opponentA < 0 || data.opponentA >= group.teams.length) {
                        throw new CompetitionError("Opponent A " + data.opponentA + " out of range");
                    }
                    action.update.opponentA = data.opponentA;
                    action.sets.push("OpponentA = @opponentA");
                }
            }

            if (data.matchReferenceB != null) {
                if (data.opponentB != null) {
                    throw new CompetitionError("Opponent B cannot be set along with a match reference");
                }
                hasSet = true;
                action.update.matchReferenceB = data.matchReferenceB;
                action.sets.push("MatchReferenceB = @matchReferenceB");
            }
            else if (data.opponentB != null) {
                hasSet = true;
                if (data.opponentB === match.opponentB) {
                    delete data.opponentB;
                }
                else {
                    if (data.opponentB < 0 || data.opponentB >= group.teams.length) {
                        throw new CompetitionError("Opponent B " + data.opponentB + " out of range");
                    }
                    action.update.opponentB = data.opponentB;
                    action.sets.push("OpponentB = @opponentB");
                }
            }
            if (data.sequence != null) {
                hasSet = true;
                // To prevent unique constraint while changing sequences - updating first to a temporary sequence
                sequenceChanges.push({
                    competition: this.id,
                    match: data.match,
                    sequence: "ch" + sequenceChanges.length
                });
                action.update.sequence = data.sequence.join(":");
                if (action.update.sequence === match.sequence.join(":")) {
                    delete data.sequence;
                }
                else {
                    action.sets.push("Sequence = @sequence");
                }
            }
            if (data.venue !== undefined) {
                hasSet = true;
                if (data.venue == match.venue) {
                    delete data.venue;
                }
                else {
                    action.update.venue = data.venue;
                    action.sets.push("Venue = @venue");
                }
            }
            if (data.time !== undefined) {
                hasSet = true;
                if (data.time === match.time) {
                    delete data.time;
                }
                else {
                    action.update.time = data.time;
                    action.sets.push("Time = @time");
                }
            }
            if (data.functionaries) {
                hasSet = true;
                for (var role in data.functionaries) {
                    var functionary = data.functionaries[role];
                    if (functionary) {
                        if (match.functionaries[role]) {
                            if (match.functionaries[role] != functionary) {
                                action.functionaries.push({role: role, update: functionary});
                            }
                        }
                        else {
                            action.functionaries.push({role: role, insert: functionary});
                        }
                    }
                    else if (match.functionaries[role]) {
                        action.functionaries.push({role: role});
                    }
                }
            }
            var result = undefined;

            if (data.outcome != null) {
                hasSet = true;
                action.update.outcome = data.outcome;
                action.update.scoreA = null;
                action.update.scoreB = null;
                action.update.result = null;
                action.sets.push("Outcome = @outcome");
                action.sets.push("ScoreA = @scoreA");
                action.sets.push("ScoreB = @scoreB");
                action.sets.push("Result = @result");
            }

            if (data.result != null) {
                hasSet = true;
                if (data.result.scoreA == null && data.result.scoreB == null) {
                    if (data.outcome != null) {
                        throw new CompetitionError("Match " + data.match + " outcome is incompatible with result");
                    }
                    action.update.scoreA = null;
                    action.update.scoreB = null;
                    action.update.outcome = null;
                    action.sets.push("ScoreA = NULL");
                    action.sets.push("ScoreB = NULL");
                    action.sets.push("Outcome = NULL");
                }
                else {
                    action.update.scoreA = data.result.scoreA || 0;
                    action.update.scoreB = data.result.scoreB || 0;
                    if (data.outcome == null) {
                        // If outcome is set - sets are already set
                        action.sets.push("ScoreA = @scoreA");
                        action.sets.push("ScoreB = @scoreB");
                        action.sets.push("Outcome = @outcome");
                    }

                    if (action.update.outcome != ranking.MatchOutcome.TechnicalA && action.update.outcome != ranking.MatchOutcome.TechnicalB) {
                        if (action.update.scoreA > action.update.scoreB) {
                            action.update.outcome = ranking.MatchOutcome.WinA;
                        }
                        else if (action.update.scoreB > action.update.scoreA) {
                            action.update.outcome = ranking.MatchOutcome.WinB;
                        }
                        else {
                            action.update.outcome = ranking.MatchOutcome.Tie;
                        }
                        if (data.outcome != null && data.outcome != action.update.outcome) {
                            throw new CompetitionError("Match " + data.match + " outcome is incompatible with result");
                        }
                    }
                }
                delete data.result.scoreA;
                delete data.result.scoreB;
                result = null;
                for (var key in data.result) {
                    // Checking if any other information is in the result besides score A and B
                    result = data.result;
                    break;
                }
            }

            if (result !== undefined) {
                action.update.result = result == null ? null : JSON.stringify(result);
                if (data.outcome == null) {
                    action.sets.push("Result = @result");
                }
            }

            if (!hasSet) {
                throw new CompetitionError("No match field is set for match " + data.match);
            }

            if (action.sets.length > 0 || action.functionaries.length > 0) {
                actions.push(action);

                if (!groups[group.id]) {
                    groups[group.id] = {
                        group: group
                    };
                }
            }
        }

        if (actions.length === 0) {
            // No change needed
            return {$result: null};
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        for (var n = 0; n < sequenceChanges.length; n++) {
            await transaction.request(
                "update CompetitionMatches " +
                "set Sequence = @sequence " +
                "where Competition = @competition and Match = @match", sequenceChanges[n]);
        }

        for (var n = 0; n < actions.length; n++) {
            var action = actions[n];

            if (action.functionaries.length > 0) {
                for (var f = 0; f < action.functionaries.length; f++) {
                    var func = action.functionaries[f];
                    if (func.update) {
                        await transaction.request(
                            "update CompetitionMatchFunctionaries " +
                            "set Functionary = @functionary " +
                            "where Competition = @competition and Match = @match and Role = @role",
                            {
                                competition: action.update.competition,
                                match: action.update.match,
                                role: func.role,
                                functionary: func.update
                            });
                    }
                    else if (func.insert) {
                        await transaction.request(
                            "insert into CompetitionMatchFunctionaries(Competition, Match, Role, Functionary) " +
                            "values(@competition, @match, @role, @functionary) ",
                            {
                                competition: action.update.competition,
                                match: action.update.match,
                                role: func.role,
                                functionary: func.insert
                            });
                    }
                    else {
                        await transaction.request(
                            "delete from CompetitionMatchFunctionaries " +
                            "where Competition = @competition and Match = @match and Role = @role ",
                            {
                                competition: action.update.competition,
                                match: action.update.match,
                                role: func.role
                            });
                    }
                }
            }
            if (action.sets.length > 0) {
                await transaction.request(
                    "update CompetitionMatches " +
                    "set " + action.sets.join(", ") +
                    " where Competition = @competition and Match = @match", action.update);
            }
        }

        await transaction.commit();

        for (var n = 0; n < actions.length; n++) {
            var action = actions[n];
            action.match.$self = service.version;
            if (action.data.matchReferenceA != null) {
                action.match.matchReferenceA = action.data.matchReferenceA;
                action.match.opponentA = null;
            } else if (action.data.opponentA != null) {
                action.match.opponentA = action.data.opponentA;
                action.match.matchReferenceA = null;
            }
            if (action.data.matchReferenceB != null) {
                action.match.matchReferenceB = action.data.matchReferenceB;
                action.match.opponentB = null;
            } else if (action.data.opponentB != null) {
                action.match.opponentB = action.data.opponentB;
                action.match.matchReferenceB = null;
            }
            if (action.data.sequence != null) {
                action.match.sequence = action.data.sequence;
                groups[action.match.group.id].sort = true;
            }
            if (action.data.venue !== undefined) {
                action.match.venue = action.data.venue;
            }
            if (action.data.time !== undefined) {
                action.match.time = action.data.time;
            }
            for (var f = 0; f < action.functionaries.length; f++) {
                var func = action.functionaries[f];
                if (func.update || func.insert) {
                    action.match.functionaries[func.role] = func.update || func.insert;
                }
                else {
                    delete action.functionaries[func.role];
                }
            }
            if (action.update.outcome !== undefined) {
                action.match.outcome = action.update.outcome;
                groups[action.match.group.id].resetOpponents = true;
            }

            if (action.data.result) {
                action.match.scoreA = action.update.scoreA;
                action.match.scoreB = action.update.scoreB;
                action.match.result = result;
            }
        }

        for (var k in groups) {
            var groupChange = groups[k];
            if (groupChange.sort) {
                groupChange.group.matches.sort(function (a, b) {
                    return compareSequence(a.sequence, b.sequence);
                });
            }
            if (groupChange.resetOpponents) {
                // Resetting opponents of match references so that they'll be recalculated
                for (var m = 0; m < groupChange.group.matches.length; m++) {
                    var mt = groupChange.group.matches[m];
                    if (mt.matchReferenceA != null) {
                        mt.opponentA = null;
                        mt.$self = service.version;
                    }
                    if (mt.matchReferenceB != null) {
                        mt.opponentB = null;
                        mt.$self = service.version;
                    }
                }
            }
            groupChange.group.phase.event.$content = service.version;
            groupChange.group.phase.$content = service.version;
            groupChange.group.$content = service.version;
            groupChange.group.recalculate(service.version);
        }

        this.$content = service.version;

        service.version++;
        return {
            $result: actions.map(function (a) { return a.match.id; })
        };
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.deleteMatch = async function (service, matchId) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var match = this.matches[matchId];
        if (!match) {
            throw new CompetitionError("Match " + matchId + " not found");
        }

        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        var set = null;

        await transaction.request(
            "delete from CompetitionMatches " +
            "where Competition = @competition and Match = @match",
            {competition: this.id, match: match.id});

        await transaction.commit();

        this.$content = service.version;
        var group = match.group;
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        delete this.matches[match.id];
        this.$removed.push({ver: service.version, event: group.phase.event.id, phase: group.phase.id, group: group.id, match: match.id});
        var index = group.matches.indexOf(match);
        if (index >= 0) {
            group.matches.splice(index, 1);
        }
        else {
            // TODO - log error
        }

        service.version++;
        return {};
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};

Competition.prototype.buildMatchesFromBoard = async function (service, groupId, board) {
    var release = await util.lock(this);
    var connection;
    var transaction;
    try {
        var group = this.groups[groupId];
        if (!group) {
            throw new CompetitionError("Group " + groupId + " not found");
        }

        var matches = [];
        var rounds = {};
        for (var n = 0; n < board.matches.length; n++) {
            var boardMatch = board.matches[n];
            if (boardMatch.a < 0 || boardMatch.a >= group.teams.length) {
                throw new CompetitionError("Opponent A " + boardMatch.a + " out of range");
            }
            if (boardMatch.b < 0 || boardMatch.b >= group.teams.length) {
                throw new CompetitionError("Opponent B " + boardMatch.b + " out of range");
            }

            var round = boardMatch.sequence.slice(0, boardMatch.sequence.length - 1);
            var roundId = round.join(":");
            if (!rounds[roundId] || rounds[roundId] !== !group.rounds[roundId]) {
                rounds[roundId] = round.map(function (n, i) {
                    if (i < board.levels.length) {
                        var level = board.levels[i];
                        if (n < level.length) {
                            return level[n];
                        }
                    }
                    return (n + 1);
                }).join(" - ");
            }

            matches.push({
                group: group,
                sequence: boardMatch.sequence,
                opponentA: boardMatch.a,
                opponentB: boardMatch.b,
                matchReferenceA: null,
                matchReferenceB: null,
                time: null,
                venue: null,
                scoreA: null,
                scoreB: null,
                outcome: null,
                result: null,
                functionaries: {},
                $self: service.version
            });
        }

        matches.sort(function (a, b) {
            return compareSequence(a.sequence, b.sequence);
        });



        connection = await service.db.connect();

        await this.ensureNewVersion(service, connection);

        transaction = await connection.transaction();

        await transaction.request(
            "delete from CompetitionMatches " +
            "where Competition = @competition and Group_ = @group",
            {competition: this.id, group: groupId}
        );

        var rec = await transaction.request(
            "select MAX(Match) as \"MaxId\" " +
            "from CompetitionMatches " +
            "where Competition = @competition",
            {competition: this.id});

        var id = (rec[0].MaxId || 0) + 1;
        for (var n = 0; n < matches.length; n++) {
            var match = matches[n];
            match.id = id++;

            await transaction.request(
                "insert into CompetitionMatches(Competition, Match, Group_, Sequence, OpponentA, OpponentB) " +
                "values(@competition, @match, @group, @sequence, @opponentA, @opponentB)",
                {
                    competition: this.id,
                    match: match.id,
                    group: groupId,
                    sequence: match.sequence.join(':'),
                    opponentA: match.opponentA,
                    opponentB: match.opponentB
                });
        }

        var roundChange = false;
        for (var roundId in rounds) {
            roundChange = true;
            if (group.rounds[roundId] != null) {
                await transaction.request(
                    "update CompetitionGroupRounds " +
                    "set Name = @name " +
                    "where Competition = @competition and Group_ = @group and Sequence = @sequence",
                    {competition: this.id, group: groupId, sequence: roundId, name: rounds[roundId]});
            }
            else {
                await transaction.request(
                    "insert into CompetitionGroupRounds(Competition, Group_, Sequence, Name) " +
                    "values(@competition, @group, @sequence, @name)",
                    {competition: this.id, group: groupId, sequence: roundId, name: rounds[roundId]});
            }
        }

        await transaction.request(
            "update CompetitionGroups " +
            "set GameBoard = @board " +
            "where Competition = @competition and Group_ = @group",
            {competition: this.id, group: groupId, board: board.board});

        await transaction.commit();

        for (var n = 0; n < group.matches.length; n++) {
            var match = group.matches[n];
            this.$removed.push({ver: service.version, event: group.phase.event.id, phase: group.phase.id, group: group.id, match: match.id});
            delete this.matches[match.id];
        }
        group.matches.splice(0, group.matches.length);

        for (var n = 0; n < matches.length; n++) {
            var match = matches[n];
            this.matches[match.id] = match;
            group.matches.push(match);
        }

        if (roundChange) {
            for (var roundId in rounds) {
                group.rounds[roundId] = rounds[roundId];
            }
            group.rounds.$self = service.version;
        }

        group.gameBoard = board.board;

        this.$content = service.version;
        group.recalculate(service.version);
        group.phase.event.$content = service.version;
        group.phase.$content = service.version;
        group.$content = service.version;
        group.$self = service.version;

        service.version++;
        return {};
    }
    catch (err) {
        if (transaction) {
            transaction.rollback();
        }
        throw err;
    }
    finally {
        release();
        if (connection) {
            connection.complete();
        }
    }
};


Competition.prototype.compile = function (result, version) {
    if (result == null) {
        result = {};
    }
    result.$version = Math.max(this.$self, this.$content);

    if (version == null) {
        version = 0;
    }

    if (!this.$calculated) {
        for (var key in this.groups) {
            this.groups[key].calculate();
        }
        this.$calculated = true;
    }

    var remove = this.$removed.length;
    while (remove > 0 && this.$removed[remove - 1].ver > version) {
        remove--;
    }
    if (remove < this.$removed.length) {
        result.$removed = this.$removed.slice(remove);
    }

    if (this.$self > version) {
        result.sport = this.sport;
        result.name = this.name;
        result.category = this.category;
        result.season = this.season;
        result.ruleset = this.ruleset;
        result.rules = this.rules;
    }

    if (this.$content > version) {
        for (var key in this.teams) {
            var team = this.teams[key];
            if (team.$self > version) {
                if (!result.teams) {
                    result.teams = {};
                }
                result.teams[key] = {
                    name: team.name
                };
            }
        }

        if (!this.sport.match) {
            for (var key in this.participants) {
                var participant = this.participants[key];
                if (participant.$self > version) {
                    if (!result.participants) {
                        result.participants = {};
                    }
                    result.participants[key] = {
                        identifier: participant.identifier,
                        team: participant.team,
                        number: participant.number,
                        name: participant.name
                    };
                }
            }
        }

        for (var key in this.events) {
            this.events[key].compile(result, version);
        }
    }

    return result;
};

var BasicRules = null;

async function ensureBasicRules(connection) {
    if (BasicRules === null) {
        // Loading sports basic rules (functionaries) to fill in rulesets if missing
        var records = await connection.request(
            "select s.SPORT_ID as \"Sport\", r.RULE_ID as \"RuleId\", r.RULE_TYPE_ID as \"Rule\", " +
            "   r.SPORT_FIELD_TYPE_ID as \"SportFieldType\", r.SPORT_FIELD_ID as \"SportField\", " +
            "   r.Category as \"Category\", r.Value as \"Value\" " +
            "from SPORTS as s " +
            "  join RULESETS as rs on s.RULESET_ID = rs.RULESET_ID " +
            "  join RULES as r on rs.RULESET_ID = r.RULESET_ID " +
            "where s.DATE_DELETED is null and rs.DATE_DELETED is null and R.DATE_DELETED is null " +
            "  and RULE_TYPE_ID = 14"); // for now only functionaries (14)

        BasicRules = {};
        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            var rules = BasicRules[record.Sport];
            if (!rules) {
                BasicRules[record.Sport] = rules = {};
            }
            var category = new Category(Category.convertOldCategory(record.Category));
            var disciplineIdentifier = null;
            if (record.SportFieldType) {
                if (record.SportField) {
                    disciplineIdentifier = "." + record.SportFieldType + "." + record.SportField + ".";
                }
                else {
                    disciplineIdentifier = "." + record.SportFieldType + ".";
                }
            }
            var ruleName = Rules.getRuleName(record.Rule);
            var ruleId = ruleName;
            if (disciplineIdentifier) {
                ruleId += disciplineIdentifier;
            }
            var rule = Rules.create(ruleName, record.Value);
            if (rule != null) {
                rule.category = category;
                rules[ruleId] = rule;
            }
        }
    }
}

async function loadFromOlderVersion(id, version, serviceDb) {
    var connection;
    var db = require('../db');
    try {
        connection = await db.connect();

        await ensureBasicRules(connection);

        // Reading competition with sport
        var records = await connection.request(
            "select cc.CHAMPIONSHIP_CATEGORY_ID as \"Id\", " +
            "  c.CHAMPIONSHIP_NAME as \"Name\", cc.CATEGORY as \"Category\", c.CHAMPIONSHIP_ID as \"Season\", " +
            "  c.SPORT_ID as \"Sport\", s.SPORT_NAME as \"SportName\", s.SPORT_TYPE as \"SportType\", " +
            "  c.RULESET_ID as \"Ruleset\", r.RULESET_ID as \"SportRuleset\", r.REGION_ID as \"SportRulesetRegion\" " +
            "from CHAMPIONSHIPS as c " +
            "  join CHAMPIONSHIP_CATEGORIES as cc on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
            "  join SPORTS as s on c.SPORT_ID = s.SPORT_ID " +
            "  left outer join RULESETS as r on s.SPORT_ID = r.SPORT_ID and (r.REGION_ID is null OR r.REGION_ID = c.REGION_ID) and " +
            "     r.DATE_DELETED is null and r.RULESET_ID in (select RULESET_ID from RULES where DATE_DELETED is null)" +
            "where c.DATE_DELETED is null and cc.DATE_DELETED is null and cc.CHAMPIONSHIP_CATEGORY_ID = @id",
            {id: id});

        if (records.length === 0) {
            return null;
        }

        var record = records[0];

        var sport = {
            id: record.Sport.toString(),
            name: record.SportName,
            match: record.SportType === 2,
            individual: record.SportType === 1
        };

        var rulesetId = record.Ruleset;
        if (!rulesetId) {
            for (var n = 0; n < records.length; n++) {
                var r = records[n];
                if (r.SportRuleset) {
                    rulesetId = r.SportRuleset;
                    if (r.SportRulesetRegion != null) {
                        break;
                    }
                }
            }
        }

        var ruleset = null;
        if (rulesetId) {
            ruleset = await Rules.readRuleset(serviceDb, rulesetId);
            var rules = Rules.getRules(ruleset, Category.convertOldCategory(record.Category));
        }

        var competition = new Competition(id, sport, record.Name, Category.convertOldCategory(record.Category), record.Season, version);
        competition.oldVersion = true;

        if (rulesetId) {
            competition.ruleset = rulesetId;

            records = await connection.request(
                "select RULE_ID as \"RuleId\", RULE_TYPE_ID as \"Rule\", " +
                "   SPORT_FIELD_TYPE_ID as \"SportFieldType\", SPORT_FIELD_ID as \"SportField\", " +
                "   Category as \"Category\", Value as \"Value\" " +
                "from RULES " +
                "where RULESET_ID = @ruleset",
                {ruleset: rulesetId});
            for (var n = 0; n < records.length; n++) {
                var record = records[n];
                var category = new Category(Category.convertOldCategory(record.Category));
                if (competition.category.include(category)) {
                    var disciplineIdentifier = null;
                    if (record.SportFieldType) {
                        if (record.SportField) {
                            disciplineIdentifier = "." + record.SportFieldType + "." + record.SportField + ".";
                        }
                        else {
                            disciplineIdentifier = "." + record.SportFieldType + ".";
                        }
                    }
                    var ruleName = Rules.getRuleName(record.Rule);
                    var ruleId = ruleName;
                    if (disciplineIdentifier) {
                        ruleId += disciplineIdentifier;
                    }
                    var rule = null;
                    rule = competition.rules[ruleId];
                    // TODO - else should take discpline from competition and it should have rules or something like that
                    if (rule == null ||
                        (rule.category.gender === 0 && category.gender !== 0) ||
                        (rule.category.minAge === competition.category.minAge && rule.category.maxAge === competition.category.maxAge)) {
                        // Apply rule
                        rule = Rules.create(ruleName, record.Value);
                        if (rule != null) {
                            rule.category = category;
                            competition.rules[ruleId] = rule;
                        }
                    }
                }
            }
        }

        if (!competition.rules.Functionaries) {
            var sportRules = BasicRules[sport.id];
            if (sportRules && sportRules.Functionaries) {
                competition.rules.Functionaries = sportRules.Functionaries;
            }
        }

        // Reading teams
        records = await connection.request(
            "select t.TEAM_ID as \"Team\", s.SCHOOL_NAME as \"Name\", TEAM_INDEX as \"Number\", " +
            "  t.PLAYER_NUMBER_FROM as \"NumberFrom\", t.PLAYER_NUMBER_TO as \"NumberTo\", " +
            "  c.CITY_NAME as \"CityName\" " +
            "from TEAMS as t " +
            "  join SCHOOLS as s on t.SCHOOL_ID = s.SCHOOL_ID " +
            "  left outer join CITIES as c on s.CITY_ID = c.CITY_ID " +
            "where t.DATE_DELETED is null and s.DATE_DELETED is null and t.CHAMPIONSHIP_CATEGORY_ID = @id " +
            "order by s.SCHOOL_NAME ",
            {id: id});

        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            //var doubleTeam = (r > 0 ? records[r - 1].Name == record.Name : false) ||
                //(r < records.length - 1 ? records[r + 1].Name == record.Name : false);
            var numbers = null;
            if (record.NumberFrom != null) {
                numbers = {from: record.NumberFrom, to: record.NumberTo};
            }
            var name = applyCityWithTeamName(record.Name, record.CityName);
            competition.teams[record.Team] = {
                identifier: record.Team,
                //name: doubleTeam ? (record.Name + " " + record.Number) : record.Name,
                name: applyNumberWithTeamName(name, record.Number),
                numbers: numbers,
                $self: version,
                $content: version
            };
        }

        if (sport.match) {
            // Match competition

            // For now - single event competitions
            var event = new Event(competition, 0, null, null, null, version);
            competition.events[event.id] = event;

            // Reading phases
            records = await connection.request(
                "select p.PHASE as \"Phase\", p.PHASE_NAME as \"Name\", p.STATUS as \"Status\" " +
                "from CHAMPIONSHIP_PHASES as p " +
                "where p.DATE_DELETED is null and p.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by p.PHASE",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var phase = new Phase(event, record.Phase, record.Name, r + 1, null /*meeting*/, version);
                if (event.phase == null && record.Status < 2) {
                    event.phase = r;
                }
                competition.phases[record.Phase] = phase;
                event.phases.push(phase);
            }

            // Reading groups
            records = await connection.request(
                "select g.PHASE as \"Phase\", g.NGROUP as \"Group\", g.GROUP_NAME as \"Name\" " +
                "from CHAMPIONSHIP_GROUPS as g " +
                "where g.DATE_DELETED is null and g.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by g.PHASE, g.NGROUP",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                phase = competition.phases[record.Phase];
                if (!phase) {
                    continue;
                }

                var group = new Group(phase, GroupId(record.Phase, record.Group), record.Name, record.Group + 1, null, sport, version);
                competition.groups[group.id] = group;
                phase.groups.push(group);
            }

            if (sport.individual) {

            } else {
                // Reading groups teams
                records = await connection.request(
                    "select t.PHASE as \"Phase\", t.NGROUP as \"Group\", t.POSITION as \"Placement\", " +
                    "  t.PREVIOUS_GROUP as \"PreviousGroup\", t.PREVIOUS_POSITION as \"PreviousPlacement\", " +
                    "  t.TEAM_ID as \"Team\" " +
                    "from CHAMPIONSHIP_GROUP_TEAMS as t " +
                    "where t.DATE_DELETED is null and t.CHAMPIONSHIP_CATEGORY_ID = @id " +
                    "order by t.POSITION",
                    {id: id});

                for (var r = 0; r < records.length; r++) {
                    var record = records[r];
                    var groupId = GroupId(record.Phase, record.Group);
                    var group = competition.groups[groupId];
                    if (!group) {
                        continue;
                    }

                    var teamReference = "";
                    if (record.PreviousGroup != null) {
                        teamReference = "G" + GroupId(record.Phase - 1, record.PreviousGroup) + "R" + record.PreviousPlacement;
                    } else {
                        teamReference = "C" + record.Team;
                    }

                    while (group.teams.length < record.Placement) {
                        group.teams.push({
                            team: null,
                            $self: version
                        });
                    }
                    group.teams[record.Placement] = {
                        teamReference: teamReference,
                        team: getGroupTeam(teamReference, record.Team),
                        $self: version
                    };
                }
            }

            competition.matches = {};

            // Reading matches
            records = await connection.request(
                "select m.PHASE as \"Phase\", m.NGROUP as \"Group\", m.ROUND as \"Round\", m.CYCLE as \"Cycle\", " +
                "  m.MATCH as \"Match\", m.TEAM_A as \"TeamA\", m.TEAM_B as \"TeamB\", " +
                "  m.relative_team_a as \"RelativeTeamA\", m.relative_team_b as \"RelativeTeamB\", " +
                "  m.match_number as \"Number\", " +
                "  m.FACILITY_ID as \"Facility\", m.COURT_ID as \"Court\", m.TIME as \"Time\", " +
                "  m.TEAM_A_SCORE as \"ScoreA\", m.TEAM_B_SCORE as \"ScoreB\", m.RESULT as \"Outcome\", m.PARTS_RESULT as \"Result\" " +
                "from CHAMPIONSHIP_MATCHES as m " +
                "where m.DATE_DELETED is null and m.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by m.Round, m.Cycle, m.Match",
                {id: id});

            var mapNumbers = {};
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                mapNumbers[record.Number] = record;
            }

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var groupId = GroupId(record.Phase, record.Group);
                var group = competition.groups[groupId];
                if (!group) {
                    continue;
                }

                var result = null;
                if (record.Outcome != null && record.Result) {
                    var sets = record.Result.split('\n').map(function (set) {
                        return {
                            games: set.split('|').map(function (x) {
                                var p = x.split('-');
                                return {
                                    a: parseInt(p[0]),
                                    b: parseInt(p[1])
                                };
                            })
                        };
                    });
                    if (sets.length > 1) {
                        result = {
                            sets: sets
                        };
                    }
                    else if (sets.length === 1 && sets[0].games.length > 0) {
                        result = {
                            sets: sets[0].games
                        };
                    }

                }

                if (record.Round > 0 || record.Cycle > 0) {
                    var phase = competition.phases[record.Phase];
                    if (record.Cycle > 0 || record.Round > 0) {
                        if (phase.levels.length === 0) {
                            phase.levels.push({
                                name: "סיבוב",
                                count: 0,
                                $self: version
                            });
                        }
                        if (phase.levels[0].count < record.Round) {
                            phase.levels[0].count = record.Round;
                        }
                    }
                    if (record.Cycle > 0) {
                        if (phase.levels.length < 2) {
                            phase.levels.push({
                                name: "מחזור",
                                count: 0,
                                $self: version
                            });
                        }
                        if (phase.levels[1].count < record.Cycle) {
                            phase.levels[1].count = record.Cycle;
                        }
                    }
                }

                var match = {
                    group: group,
                    id: MatchId(record.Phase, record.Group, record.Round, record.Cycle, record.Match),
                    sequence: [record.Round, record.Cycle, record.Number],
                    opponentA: record.TeamA,
                    opponentB: record.TeamB,
                    matchReferenceA: null,
                    matchReferenceB: null,
                    time: record.Time ? Math.floor(convertUTCTime(record.Time).getTime()/1000) : null,
                    venue: record.Facility ? (record.Court ? record.Facility + "/" + record.Court : record.Facility.toString()) : null,
                    scoreA: record.Outcome == null ? null : record.ScoreA,
                    scoreB: record.Outcome == null ? null : record.ScoreB,
                    outcome: record.Outcome,
                    result: result,
                    functionaries: {},
                    $self: version
                };

                if (record.RelativeTeamA != null && record.TeamA == null) {
                    if (record.RelativeTeamA < 0) {
                        var rec = mapNumbers[-record.RelativeTeamA];
                        match.matchReferenceA = "L" + MatchId(rec.Phase, rec.Group, rec.Round, rec.Cycle, rec.Match);
                    }
                    else {
                        var rec = mapNumbers[record.RelativeTeamA];
                        match.matchReferenceA = "W" + MatchId(rec.Phase, rec.Group, rec.Round, rec.Cycle, rec.Match);
                    }
                }
                if (record.RelativeTeamB != null && record.TeamB == null) {
                    if (record.RelativeTeamB < 0) {
                        var rec = mapNumbers[-record.RelativeTeamB];
                        match.matchReferenceB = "L" + MatchId(rec.Phase, rec.Group, rec.Round, rec.Cycle, rec.Match);
                    }
                    else {
                        var rec = mapNumbers[record.RelativeTeamB];
                        match.matchReferenceB = "W" + MatchId(rec.Phase, rec.Group, rec.Round, rec.Cycle, rec.Match);
                    }
                }
                competition.matches[match.id] = match;
                group.matches.push(match);

                if (match.outcome) {
                    if (group.state == null) {
                        // No state set yet - setting to completed
                        group.state = GroupState.completed;
                    }
                    else if (group.state === GroupState.ready || group.state === GroupState.planned) {
                        group.state = GroupState.started;
                    }
                }
                else if (group.state === GroupState.completed) {
                    group.state = GroupState.started;
                }
                else if (group.state == null) {
                    if (group.phase.id > group.phase.event.phase) {
                        group.state = GroupState.planned;
                    }
                    else {
                        group.state = GroupState.ready;
                    }
                }
            }

            // Reading matches functionaries
            records = await connection.request(
                "select m.PHASE as \"Phase\", m.NGROUP as \"Group\", m.ROUND as \"Round\", m.CYCLE as \"Cycle\", " +
                "  m.MATCH as \"Match\", m.ROLE as \"Role\", m.FUNCTIONARY_ID as \"Functionary\" " +
                "from CHAMPIONSHIP_MATCH_FUNCTIONARIES as m " +
                "where m.DATE_DELETED is null and m.CHAMPIONSHIP_CATEGORY_ID = @id ",
                {id: id});
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                if (record.Functionary != null) {
                    var matchId = MatchId(record.Phase, record.Group, record.Round, record.Cycle, record.Match);
                    var match = competition.matches[matchId];
                    if (match) {
                        // Role is functionaries seems to be the index of the functionary in the functionaries rule
                        // If no functionaries rule assuming role 0 is supervisor (1) and role 1 is referee (2)
                        var type = competition.rules.Functionaries && competition.rules.Functionaries.length > record.Role
                            ? competition.rules.Functionaries[record.Role].type
                            : record.Role + 1;
                        match.functionaries[type] = record.Functionary.toString();
                    }
                }
            }
        }
        else {
            // Contests competition

            // Reading participants - by players
            // later participants with no player will be added
            records = await connection.request(
                "select p.PLAYER_ID as \"Player\", p.TEAM_ID as \"Team\", p.TEAM_NUMBER as \"Number\", " +
                "  s.FIRST_NAME + ' ' + s.LAST_NAME as \"Name\" " +
                "from PLAYERS as p " +
                "  join STUDENTS as s on p.STUDENT_ID = s.STUDENT_ID " +
                "  join TEAMS as t on p.TEAM_ID = t.TEAM_ID " +
                "where p.DATE_DELETED is null and s.DATE_DELETED is null and t.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by p.TEAM_ID, p.TEAM_NUMBER ",
                {id: id});

            var playerMap = {};

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                if (record.Number) {
                    // Creating mapping to specific player for entrants without a reference to a player
                    if (playerMap[record.Number]) {
                        playerMap[record.Number] = true; // Marking duplicate number
                    }
                    else {
                        playerMap[record.Number] = record.Player;
                    }
                }
                competition.participants[record.Player] = {
                    identifier: record.Player,
                    name: record.Name,
                    team: record.Team,
                    number: record.Number,
                    $self: version,
                    $content: version
                };
            }

            // Reading competitions (-> events)
            records = await connection.request(
                "select c.PHASE as \"Phase\", p.PHASE_NAME as \"PhaseName\", c.NGROUP as \"Group\", g.GROUP_NAME as \"GroupName\", " +
                "  c.COMPETITION as \"Competition\", " +
                "  sft.SPORT_FIELD_TYPE_ID as \"SportFieldType\", sft.SPORT_FIELD_TYPE_NAME as \"SportFieldTypeName\", " +
                "  sf.SPORT_FIELD_ID as \"SportField\", sf.SPORT_FIELD_NAME as \"SportFieldName\", " +
                "  c.FACILITY_ID as \"Facility\", c.COURT_ID as \"Court\", c.TIME as \"Time\" " +
                "from CHAMPIONSHIP_COMPETITIONS as c " +
                "  join CHAMPIONSHIP_PHASES as p on c.CHAMPIONSHIP_CATEGORY_ID = p.CHAMPIONSHIP_CATEGORY_ID and c.PHASE = p.PHASE " +
                "  join CHAMPIONSHIP_GROUPS as g on c.CHAMPIONSHIP_CATEGORY_ID = g.CHAMPIONSHIP_CATEGORY_ID and c.PHASE = g.PHASE and c.NGROUP = g.NGROUP " +
                "  join SPORT_FIELDS as sf on c.SPORT_FIELD_ID = sf.SPORT_FIELD_ID " +
                "  join SPORT_FIELD_TYPES as sft on sft.SPORT_FIELD_TYPE_ID = sf.SPORT_FIELD_TYPE_ID " +
                "where c.DATE_DELETED is null and c.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by c.PHASE, c.SPORT_FIELD_ID, c.NGROUP, c.COMPETITION",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                // Phase -> meeting
                // Phase-Group-Competition -> group
                var eventId = EventId(record.Phase, record.SportField);
                var event = competition.events[eventId];
                var phase;
                if (event) {
                    phase = event.phases[0];
                }
                else {
                    var discipline = {
                        id: DisciplineId(record.SportFieldType, record.SportField).toString(),
                        identifier: "." + record.SportFieldType + "." + record.SportField + ".",
                        name: record.SportFieldName,
                        base: { // Used for import
                            id: record.SportFieldType.toString(),
                            identifier: "." + record.SportFieldType + ".",
                            name: record.SportFieldTypeName
                        }
                    };

                    event = new Event(competition, eventId, discipline.name, null, discipline, version);
                    competition.events[eventId] = event;
                    // Reading phase as event and each phase is the same id as the event
                    phase = new Phase(event, eventId, record.PhaseName, 1, record.Phase, version);
                    competition.phases[phase.id] = phase;
                    event.phases.push(phase);
                }

                var group = new Group(phase, ContestGroupId(record.Phase, record.Group, record.Competition, 0),
                    record.GroupName, phase.groups.length + 1, null, sport, version);
                competition.groups[group.id] = group;
                phase.groups.push(group);
            }

            // Reading heats to groups
            records = await connection.request(
                "select h.PHASE as \"Phase\", h.NGROUP as \"Group\", h.COMPETITION as \"Competition\", " +
                "  c.SPORT_FIELD_ID as \"SportField\", g.GROUP_NAME as \"GroupName\", " +
                "  h.HEAT as \"Heat\", h.FACILITY_ID as \"Facility\", h.COURT_ID as \"Court\", h.TIME as \"Time\" " +
                "from CHAMPIONSHIP_COMPETITION_HEATS as h " +
                "  join CHAMPIONSHIP_GROUPS as g on " +
                "      h.CHAMPIONSHIP_CATEGORY_ID = g.CHAMPIONSHIP_CATEGORY_ID and " +
                "      h.PHASE = g.PHASE and h.NGROUP = g.NGROUP " +
                "  join CHAMPIONSHIP_COMPETITIONS as c on " +
                "      h.CHAMPIONSHIP_CATEGORY_ID = c.CHAMPIONSHIP_CATEGORY_ID and " +
                "      h.PHASE = c.PHASE and h.NGROUP = c.NGROUP and h.COMPETITION = c.COMPETITION " +
                "where h.DATE_DELETED is null and h.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by h.PHASE, h.NGROUP, h.COMPETITION, h.HEAT",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var eventId = EventId(record.Phase, record.SportField);
                var event = competition.events[eventId];
                var phase = event.phases[0];
                var group = new Group(phase, ContestGroupId(record.Phase, record.Group, record.Competition, record.Heat + 1),
                    record.GroupName + " (מקצה " + (record.Heat + 1) + ")", phase.groups.length + 1, null, sport, version);
                competition.groups[group.id] = group;
                phase.groups.push(group);
            }

            competition.entrants = {};

            // Reading entrants
            records = await connection.request(
                "select o.PHASE as \"Phase\", o.NGROUP as \"Group\", o.COMPETITION as \"Competition\", " +
                "  o.HEAT as \"Heat\", o.COMPETITOR as \"Competitor\", o.PLAYER_ID as \"Player\", " +
                "  o.POSITION as \"Position\", o.RESULT as \"Result\", o.SCORE as \"Score\", " +
                "  o.PLAYER_NUMBER as \"PlayerNumber\" " +
                "from CHAMPIONSHIP_COMPETITION_COMPETITORS as o " +
                "where o.DATE_DELETED is null and o.CHAMPIONSHIP_CATEGORY_ID = @id " +
                "order by o.PHASE, o.NGROUP, o.COMPETITION, o.HEAT, o.POSITION",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var heat = record.Heat == null ? 0 : (record.Heat + 1);
                var groupId = ContestGroupId(record.Phase, record.Group, record.Competition, heat);
                var group = competition.groups[groupId];
                var participant = null;
                if (record.Player) {
                    participant = record.Player;
                }
                else if (record.PlayerNumber) {
                    var player = playerMap[record.PlayerNumber];
                    if (player === true) {
                        // There are multiple participants with the same number
                        participant = "N" + record.PlayerNumber;
                    }
                    else if (player) {
                        // Player matched
                        participant = player;
                    }
                    else {
                        var matchedTeam = null;
                        for (var teamId in competition.teams) {
                            var team = competition.teams[teamId];
                            if (team.numbers && team.numbers.from <= record.PlayerNumber && team.numbers.to >= record.PlayerNumber) {
                                if (participant == null) {
                                    participant = "T" + teamId + "N" + record.PlayerNumber;
                                    matchedTeam = teamId;
                                } else {
                                    // Duplicate teams for the same player number
                                    participant = "N" + record.PlayerNumber;
                                    matchedTeam = null;
                                    break;
                                }
                            }
                        }
                        if (matchedTeam) {
                            competition.participants[participant] = {
                                team: matchedTeam,
                                number: record.PlayerNumber,
                                $self: version,
                                $content: version
                            };
                        }
                    }
                }
                var entrant = {
                    group: group,
                    id: EntrantId(record.Phase, record.Group, record.Competition, heat, record.Competitor),
                    participant: participant,
                    score: record.Result == null ? null : parseInt(record.Result)/1000,
                    $self: version
                };
                competition.entrants[entrant.id] = entrant;
                group.entrants.push(entrant);
            }

            // Clearing and joining groups
            for (var phaseId in competition.phases) {
                var phase = competition.phases[phaseId];
                var last = null;
                var g = 0;
                while (g < phase.groups.length) {
                    var group = phase.groups[g];
                    if (group.entrants.length === 0) {
                        // Empty group - removing it
                        delete competition.groups[group.id];
                        phase.groups.splice(g, 1);
                    }
                    else if (group.entrants.length === 1 && last) {
                        // Group has only 1 entrant - moving to previous group and removing this group
                        var entrant = group.entrants[0];
                        entrant.group = last;
                        last.entrants.push(entrant);
                        delete competition.groups[group.id];
                        phase.groups.splice(g, 1);
                    }
                    else {
                        last = group;
                        g++;
                    }
                }
            }
        }

        return competition;
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
}

Competition.load = async function (service, id) {
    var connection;
    try {
        connection = await service.db.connect();

        // Reading competition with sport
        var records = await connection.request(
            "select c.uid as \"Id\", " +
            "  c.Name as \"Name\", c.Category as \"Category\", c.Season as \"Season\", " +
            "  s.uid as \"Sport\", s.Name as \"SportName\", s.Type as \"SportType\", " +
            "  c.Ruleset as \"Ruleset\", r.uid as \"SportRuleset\" " +
            //"  s.SPORT_ID as \"Sport\", s.SPORT_NAME as \"SportName\", s.SPORT_TYPE as \"SportType\" " +
            "from Competitions as c " +
            "  join Sports as s on c.Sport = s.uid " +
            "  left outer join Rulesets as r on r.Sport = s.uid and r.Name is null " +
            //"  join SPORTS as s on c.Sport = s.SPORT_ID " +
            "where c.uid = @id",
            {id: id});

        if (records.length === 0) {
            return loadFromOlderVersion(id, service.version++, service.db);
        }

        var record = records[0];

        var ruleset = record.Ruleset || record.SportRuleset;

        var sport = {
            id: record.Sport,
            name: record.SportName,
            match: (record.SportType & 2) === 2,
            individual: (record.SportType % 1) === 1
        };

        var competition = new Competition(id, sport, record.Name, record.Category, record.Season, service.version);

        // Reading rules
        if (ruleset) {
            competition.ruleset = ruleset;
            records = await connection.request(
                "select r.RuleType as \"Rule\", d.Identifier as \"DisciplineIdentifier\", r.Category as \"Category\", r.Value as \"Value\" " +
                "from Rules as r " +
                "  left outer join Disciplines as d on r.Discipline = d.uid " +
                "where r.Ruleset = @ruleset",
                {ruleset: ruleset});
            for (var n = 0; n < records.length; n++) {
                var record = records[n];
                var category = new Category(record.Category);
                if (competition.category.include(category)) {
                    var ruleId = record.Rule;
                    if (record.DisciplineIdentifier) {
                        ruleId += record.DisciplineIdentifier;
                    }

                    var rule = competition.rules[ruleId];
                    // TODO - else should take discpline from competition and it should have rules or something like that
                    if (rule == null ||
                        (rule.category.gender === 0 && category.gender !== 0) ||
                        (rule.category.minAge === competition.category.minAge && rule.category.maxAge === competition.category.maxAge)) {
                        // Apply rule
                        rule = Rules.create(record.Rule, record.Value);
                        if (rule != null) {
                            rule.category = category;
                            competition.rules[ruleId] = rule;
                        }
                    }
                }
            }
        }

        // Reading teams
        records = await connection.request(
            "select t.Team as \"Team\", Name as \"Name\" " +
            "from CompetitionTeams as t " +
            "where t.Competition = @id",
            {id: id});

        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            competition.teams[record.Team] = {
                identifier: null,
                name: record.Name,
                $self: service.version,
                $content: service.version
            };
        }

        // Reading events
        records = await connection.request(
            "select e.Event as \"Event\", e.Name as \"Name\", " +
            "  e.Discipline as \"Discipline\", d.Identifier as \"DisciplineIdentifier\", d.Name as \"DisciplineName\", " +
            "  e.Phase as \"Phase\" " +
            "from CompetitionEvents as e " +
            "  left outer join Disciplines as d on e.Discipline = d.uid " +
            "where e.Competition = @id",
            {id: id});

        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            competition.events[record.Event] = new Event(competition, record.Event, record.Name, record.Phase,
                record.Discipline ? {id: record.Discipline, identifier: record.DisciplineIdentifier, name: record.DisciplineName}: null,
                service.version);
        }

        // Reading phases
        records = await connection.request(
            "select p.Phase as \"Phase\", p.Name as \"Name\", p.Event as \"Event\", p.Number as \"Number\" " +
            "from CompetitionPhases as p " +
            "where p.Competition = @id " +
            "order by p.Phase ",
            {id: id});

        var levels = await connection.request(
            "select ol.Phase as \"Phase\", ol.Level as \"Level\", ol.Name as \"Name\", ol.Format as \"Format\", ol.Count_ as \"Count\" " +
            "from CompetitionOrganizationLevels as ol " +
            "where ol.Competition = @id " +
            "order by ol.Phase, ol.Level",
            {id: id});

        var level = levels.shift();

        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            var event = competition.events[record.Event];
            if (!event) {
                continue;
            }
            var phase = new Phase(event, record.Phase, record.Name, record.Number, null /*meeting*/, service.version);

            while (level && level.Phase < phase.id) {
                // Phase id missing ??
                level = levels.shift();
            }

            while (level && level.Phase === phase.id) {
                phase.levels.push({
                    name: level.Name,
                    format: level.Format,
                    count: level.Count,
                    $self: service.version
                });
                level = levels.shift();
            }

            competition.phases[phase.id] = phase;
            event.phases.push(phase);
        }

        // Reading groups
        records = await connection.request(
            "select g.Group_ as \"Group\", g.Phase as \"Phase\", g.Name as \"Name\", g.Number as \"Number\", " +
            "  g.State as \"State\", g.GameBoard as \"GameBoard\" " +
            "from CompetitionGroups as g " +
            "where g.Competition = @id ",
            {id: id});

        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            var phase = competition.phases[record.Phase];
            if (!phase) {
                continue;
            }

            var group = new Group(phase, record.Group, record.Name, record.Number, record.State, sport, service.version);
            group.gameBoard = record.GameBoard;
            competition.groups[group.id] = group;
            phase.groups.push(group);
        }

        for (var eventId in competition.events) {
            var event = competition.events[eventId];
            event.phases.sort(function (a, b) { return a.number - b.number; });
            for (var i = 0; i < event.phases.length; i++) {
                event.phases[i].groups.sort(function (a, b) { return a.number - b.number; });
            }

        }

        if (sport.individual) {

        }
        else {
            // Reading groups teams
            records = await connection.request(
                "select t.Group_ as \"Group\", t.Placement as \"Placement\", t.TeamReference as \"TeamReference\", " +
                "  t.Team as \"Team\", t.SetPosition as \"SetPosition\" " +
                "from CompetitionGroupTeams as t " +
                "where t.Competition = @id " +
                "order by t.Placement",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var group = competition.groups[record.Group];
                if (!group) {
                    continue;
                }

                while (group.teams.length < record.Placement) {
                    group.teams.push({
                        team: null,
                        $self: service.version
                    });
                }
                group.teams[record.Placement] = {
                    teamReference: record.TeamReference,
                    team: getGroupTeam(record.TeamReference, record.Team),
                    setPosition: record.SetPosition,
                    $self: service.version
                };
            }
        }

        if (sport.match) {
            competition.matches = {};

            // Reading rounds
            records = await connection.request(
                "select r.Group_ as \"Group\", r.Sequence as \"Sequence\", r.Name as \"Name\" " +
                "from CompetitionGroupRounds as r " +
                "where r.Competition = @id ",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var group = competition.groups[record.Group];
                if (!group) {
                    continue;
                }

                group.rounds[record.Sequence] = record.Name;
            }

            // Reading matches
            records = await connection.request(
                "select m.Group_ as \"Group\", m.Match as \"Match\", m.Sequence as \"Sequence\", " +
                "  m.OpponentA as \"OpponentA\", m.OpponentB as \"OpponentB\", " +
                "  m.MatchReferenceA as \"MatchReferenceA\", m.MatchReferenceB as \"MatchReferenceB\", " +
                "  m.Venue as \"Venue\", Time as \"Time\", " +
                "  m.ScoreA as \"ScoreA\", m.ScoreB as \"ScoreB\", m.Outcome as \"Outcome\", m.Result as \"Result\" " +
                "from CompetitionMatches as m " +
                "where m.Competition = @id ",
                {id: id});

            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var group = competition.groups[record.Group];
                if (!group) {
                    continue;
                }

                var result = null;
                if (record.Result) {
                    try {
                        result = JSON.parse(record.Result);
                    } catch (err) {
                        result = null;
                    }
                }

                var match = {
                    group: group,
                    id: record.Match,
                    sequence: record.Sequence.split(":").map(function (x) { return parseInt(x); }),
                    opponentA: record.OpponentA,
                    opponentB: record.OpponentB,
                    matchReferenceA: record.MatchReferenceA,
                    matchReferenceB: record.MatchReferenceB,
                    venue: record.Venue,
                    time: record.Time,
                    scoreA: record.ScoreA,
                    scoreB: record.ScoreB,
                    outcome: record.Outcome,
                    result: result,
                    functionaries: {},
                    $self: service.version
                };

                competition.matches[match.id] = match;

                ensureMatchRound(match);
                group.matches.push(match);
            }

            for (var groupId in competition.groups) {
                var group = competition.groups[groupId];
                group.matches.sort(function (a, b) {
                    return compareSequence(a.sequence, b.sequence);
                });
            }

            // Reading matches functionaries
            records = await connection.request(
                "select Match as \"Match\", Role as \"Role\", Functionary as \"Functionary\" " +
                "from CompetitionMatchFunctionaries " +
                "where Competition = @id ",
                {id: id});
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var match = competition.matches[record.Match];
                if (match) {
                    match.functionaries[record.Role] = record.Functionary;
                }
            }
        }

        service.version++;

        return competition;

    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};

function CompetitionError(message, code) {
    this.status = 400;
    this.code = code;
    this.message = message;
}

module.exports = Competition;