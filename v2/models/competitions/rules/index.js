var oldDb = require('../../db');
var Category = require('../category');

var fs = require('fs');

var RuleTypeName = {
    1: "PlayersAmount",
    2: "GameScore",
    3: "RankingTables",
    4: "TeamRanking",
    5: "TechnicalResult",
    7: "ResultType",
    8: "GameStructure",
    9: "ScoreTable",
    10: "CompetitorCompetitions",
    11: "CompetitionTeamCompetitors",
    12: "TeamScoreCounters",
    13: "TeamScoreCounter",
    14: "Functionaries",
    15: "GeneralSportTypeData",
    16: "TeamPhaseScoring",
    17: "PartScore",
    18: "ScoreByPart"
};


var RuleTypes = {};

fs.readdirSync(__dirname).forEach(function (file) {
    var extIndex = file.indexOf('.js', file.length - 3);
    if (extIndex >= 0) {
        var name = file.slice(0, extIndex);
        if (name !== "index") {
            try {
                var rule = require('./' + name);
                var ruleName = name.split('-').map(function (x) { return x[0].toUpperCase() + x.slice(1); }).join('');
                RuleTypes[ruleName] = rule;
            }
            catch (err) {
                console.log("Error loading rule " + name);
                console.log(err);
            }
        }
    }
});


function createRule(ruleName, value) {
    if (value != null) {
        var s = value[0];
        if (s === "{" || s === "[") {
            return JSON.parse(value);
        }
    }
    var ruleType = RuleTypes[ruleName];
    if (ruleType) {
        return ruleType.parse(value);
    }
    return null;
}

module.exports = {
    create: createRule,
    getRuleName: function (ruleType) {
        return RuleTypeName[ruleType];
    },
    readRuleset: async function (db, rulesetId) {
        var loaded = {};

        var connection;
        var oldConnection;
        var result = null;
        try {
            connection = await db.connect();

            var previous = null;

            var nextId = rulesetId;

            while (nextId) {
                // Checking ruleset is not repeats
                if (loaded[nextId]) {
                    break;
                }
                loaded[nextId] = true;

                var records = await connection.request(
                    "select r.uid as \"uid\", r.Sport as \"Sport\", r.Name as \"Name\", " +
                    "  r.BaseRuleset as \"BaseRuleset\", r.Category as \"Category\", " +
                    "  s.Name as \"SportName\", s.Type as \"SportType\" " +
                    "from Rulesets as r " +
                    "  join Sports as s on r.Sport = s.uid " +
                    "where r.uid = @id",
                    {id: nextId});

                if (records.length > 0) {
                    var rulesetRec = records[0];

                    var ruleset = {
                        id: rulesetRec.uid,
                        name: rulesetRec.Name,
                        category: rulesetRec.Category ? new Category(rulesetRec.Category) : null,
                        rules: {}
                    };

                    records = await connection.request(
                        "select r.uid as \"uid\", r.RuleType as \"RuleType\", r.Discipline as \"Discipline\", " +
                        "  r.Category as \"Category\", r.Value as \"Value\", d.Identifier as \"DisciplineIdentifier\" " +
                        "from Rules as r " +
                        "  left outer join Disciplines as d on r.Discipline = d.uid " +
                        "where r.Ruleset = @ruleset",
                        {ruleset: nextId});

                    for (var n = 0; n < records.length; n++) {
                        var record = records[n];
                        var rule = ruleset.rules[record.RuleType];
                        if (!rule) {
                            ruleset.rules[record.RuleType] = rule = [];
                        }
                        rule.push({
                            id: record.uid,
                            category: record.Category ? new Category(record.Category) : null,
                            discipline: record.Discipline,
                            data: this.create(record.RuleType, record.Value)
                        });
                        if (record.Discipline) {
                            if (!ruleset.disciplines) {
                                ruleset.disciplines = {};
                                ruleset.disciplines[record.Discipline] = record.DisciplineIdentifier;
                            }
                            else if (!ruleset.disciplines[record.Discipline]) {
                                ruleset.disciplines[record.Discipline] = record.DisciplineIdentifier;
                            }
                        }
                    }

                    if (previous) {
                        previous.base = ruleset;
                    } else {
                        ruleset.sport = {
                            id: rulesetRec.Sport,
                            name: rulesetRec.SportName,
                            match: (rulesetRec.SportType & 2) === 2,
                            individual: (rulesetRec.SportType % 1) === 1
                        };
                        result = ruleset;
                    }
                    previous = ruleset;
                    nextId = rulesetRec.BaseRuleset;
                }
                else {
                    if (!oldConnection) {
                        oldConnection = await oldDb.connect();
                    }

                    var records = await oldConnection.request(
                        "select r.RULESET_ID as \"uid\", r.SPORT_ID as \"Sport\", r.RULESET_NAME as \"Name\", " +
                        "  s.RULESET_ID as \"BaseRuleset\",  " +
                        "  s.SPORT_NAME as \"SportName\", s.SPORT_TYPE as \"SportType\" " +
                        "from RULESETS as r " +
                        "  join SPORTS as s on r.SPORT_ID = s.SPORT_ID " +
                        "where r.RULESET_ID = @id and r.DATE_DELETED is null",
                        {id: nextId});

                    if (records.length > 0) {
                        var rulesetRec = records[0];

                        var ruleset = {
                            id: rulesetRec.uid,
                            name: rulesetRec.Name,
                            category: null,
                            previousVersion: true,
                            rules: {}
                        };

                        records = await oldConnection.request(
                            "select RULE_ID as \"uid\", RULE_TYPE_ID as \"RuleTypeId\", " +
                            "  SPORT_FIELD_TYPE_ID as \"SportFieldType\", SPORT_FIELD_ID as \"SportField\", " +
                            "  CATEGORY as \"Category\", VALUE as \"Value\" " +
                            "from RULES " +
                            "where RULESET_ID = @ruleset and DATE_DELETED is null",
                            {ruleset: nextId});

                        for (var n = 0; n < records.length; n++) {
                            var record = records[n];
                            var ruleType = RuleTypeName[record.RuleTypeId];
                            if (!ruleType) {
                                continue;
                            }
                            var rule = ruleset.rules[ruleType];
                            if (!rule) {
                                ruleset.rules[ruleType] = rule = [];
                            }
                            var discipline = record.SportFieldType != null ? (record.SportFieldType*1000 + (record.SportField||0)).toString() : null;
                            rule.push({
                                id: record.uid,
                                category: record.Category ? new Category(Category.convertOldCategory(record.Category)) : null,
                                discipline: discipline,
                                data: this.create(ruleType, record.Value)
                            });
                            if (discipline) {
                                if (!ruleset.disciplines) {
                                    ruleset.disciplines = {};
                                    ruleset.disciplines[discipline] = "." + record.SportFieldType + "." + (record.SportField ? record.SportField + "." : "");
                                }
                                else if (!ruleset.disciplines[discipline]) {
                                    ruleset.disciplines[discipline] = "." + record.SportFieldType + "." + (record.SportField ? record.SportField + "." : "");
                                }
                            }
                        }

                        if (previous) {
                            previous.base = ruleset;
                        } else {
                            ruleset.sport = {
                                id: rulesetRec.Sport,
                                name: rulesetRec.SportName,
                                match: rulesetRec.SportType === 2,
                                individual: rulesetRec.SportType === 1
                            };
                            result = ruleset;
                        }
                        previous = ruleset;

                        nextId = rulesetRec.BaseRuleset;
                    }
                    else {
                        nextId = null;
                    }
                }
            }
        }
        finally {
            if (connection) {
                connection.complete();
            }
            if (oldConnection) {
                oldConnection.complete();
            }
        }

        return result;
    },
    ensureNewRuleset: async function (db, rulesetId) {
        var ruleset = await this.readRuleset(db, rulesetId);
        if (ruleset) {
            var sport = ruleset.sport.id;

            var updates = [];
            while (ruleset && ruleset.previousVersion) {
                updates.splice(0, 0, ruleset);
            }

            if (updates.length > 0) {

                var connection;
                try {
                    connection = await db.connect();
                    for (var n = 0; n < updates.length; n++) {
                        var ruleset = updates[n];
                        await connection.request(
                            "insert into Rulesets(uid, Sport, Name, BaseRuleset, Category) " +
                            "values(@id, @sport, @name, @base, @category)",
                            {
                                id: ruleset.id,
                                sport: sport,
                                name: ruleset.name,
                                base: ruleset.base ? ruleset.base.id : null,
                                category: ruleset.category ? new Category(ruleset.category) : null
                            });

                        for (var ruleType in ruleset.rules) {
                            var rule = ruleset.rules[ruleType];
                            for (var i = 0; i < rule.length; i++) {
                                var ruleDef = rule[i];
                                await connection.request(
                                    "insert into Rules(uid, Ruleset, RuleType, Discipline, Category, Value) " +
                                    "values(@id, @ruleset, @ruleType, @discipline, @category, @value)",
                                    {
                                        id: ruleDef.id,
                                        ruleset: ruleset.id,
                                        ruleType: ruleType,
                                        discipline: ruleDef.discipline,
                                        category: ruleDef.category ? new Category(ruleDef.category) : null,
                                        value: ruleDef.data ? JSON.stringify(ruleDef.data) : null
                                    });
                            }

                        }
                    }
                } finally {
                    if (connection) {
                        connection.complete();
                    }
                }
            }
            return true;
        }
        return false;
    },
    getRules: function (ruleset, categoryValue) {
        var category = new Category(categoryValue);
        var rules = {};

        var matched = {};
        while (ruleset) {
            for (var key in matched) {
                matched[key] = true; // Making all general matches final
            }
            for (var ruleId in ruleset.rules) {
                var ruleScopes = ruleset.rules[ruleId];
                for (var n = 0; n < ruleScopes.length; n++) {
                    var scope = ruleScopes[n];
                    if (!scope.data) {
                        continue;
                    }
                    var ruleName = ruleId;
                    if (scope.discipline) {
                        ruleName += ruleset.disciplines[scope.discipline];
                    }

                    var match = matched[ruleName];
                    if (!match) {
                        if (scope.category == null) {
                            if (match === undefined) {
                                rules[ruleName] = scope.data;
                                matched[ruleName] = false; // Mark general match
                            }
                        }
                        else if (category.include(scope.category)) {
                            rules[ruleName] = scope.data;
                            matched[ruleName] = true; // Mark final match
                        }
                    }
                }
            }
            ruleset = ruleset.base;
        }

        return rules;
    }
};