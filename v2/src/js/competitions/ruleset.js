define(["templates/competitions", "services/competitions", "utils"], function (templates, Competitions) {
    function cloneData(data) {
        if (data == null) {
            return null;
        }
        if (Array.isArray(data)) {
            return data.map(function (d) { return cloneData(d); });
        }
        else if (typeof data === "object") {
            var result = {};
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    result[key] = cloneData(data[key]);
                }
            }
            return result;
        }
        return data;
    }

    var ValidateData = {
        ScoreTable: function (data) {
            if (data.direction == null) {
                data.direction = 0;
            }
            if (data.scores == null) {
                data.scores = [];
            }
            while (data.scores.length < 100) {
                data.scores.push(null);
            }
        }
    };

    var RulesetDialogComponent = Vue.extend({
        template: templates["ruleset"],
        props: {
            id: {}
        },
        data: function () {
            return {
                tabName: "אליפויות",
                caption: "תקנון",
                rules: [
                    //1: "PlayersAmount",
                    {id: "GameScore", name: "ניקוד משחק", match: true },
                    {id: "RankingTables", name: "טבלאות דירוג", match: true, array: true},
                    {id: "TeamRanking", name: "דירוג קבוצות", match: true, array: true},
                    {id: "TechnicalResult", name: "תוצאת טכני", match: true},
                    //7: "ResultType",
                    {id: "GameStructure", name: "מבנה משחק", match: true},
                    {id: "ScoreTable", name: "טבלת ניקוד", individual: true},
                    {id: "Functionaries", name: "בעלי תפקידים", match: true, individual: true, array: true}
                    /*
                    10: "CompetitorCompetitions",
                    11: "CompetitionTeamCompetitors",
                    12: "TeamScoreCounters",
                    13: "TeamScoreCounter",
                    14: "Functionaries",
                    15: "GeneralSportTypeData",
                    16: "TeamPhaseScoring",
                    17: "PartScore",
                    18: "ScoreByPart"*/
                ],
                rankingMethods: {
                    "Score": "ניקוד",
                    "PointsRatio": "יחס נקודות",
                    "PointsDifference": "הפרש נקודות",
                    "MostPoints": "נקודות זכות",
                    "MostSmallPoints": "נקודות קטנות זכות",
                    "Wins": "נצחונות",
                    "SmallPointsRatio": "יחס נקודות קטנות",
                    "SmallPointsDifference": "הפרש נקודות קטנות"
                },
                disciplines: null,
                selectedRule: null,
                selectedScope: null,
                scopeData: null,
                changed: false,
                competition: null,
                sport: null,
                ruleset: null,
                error: ""
            };
        },
        mounted: function () {
            var comp = this;
            Competitions.ruleset(this.id, function (err, result) {
                if (!err) {
                    comp.caption = "תקנון - " + result.name;
                    comp.ruleset = result;
                    if (!comp.sport || comp.ruleset.sport.id !== comp.sport.id) {
                        comp.sport = comp.ruleset.sport;
                        if (comp.disciplines) {
                            for (var key in comp.disciplines) {
                                delete comp.disciplines[key];
                            }
                        }
                        Competitions.disciplines(comp.sport.id, function (err, result) {
                            if (!err) {
                                if (!comp.disciplines) {
                                    comp.disciplines = {};
                                }
                                var dispMap = {};
                                for (var n = 0; n < result.length; n++) {
                                    var discipline = result[n];
                                    dispMap[discipline.identifier] = discipline;
                                    comp.disciplines[discipline.id] = discipline;
                                }
                                function updateDisciplineHierarchy(discipline) {
                                    if (discipline.level != null) {
                                        return;
                                    }
                                    var i = discipline.identifier.lastIndexOf('.', discipline.identifier.length - 2);
                                    var parent = null;
                                    if (i > 0) {
                                        parent = dispMap[discipline.identifier.slice(0, i + 1)];
                                    }
                                    if (parent) {
                                        updateDisciplineHierarchy(parent);
                                        discipline.level = parent.level + 1;
                                        discipline.parent = parent;
                                    }
                                    else {
                                        discipline.level = 0;
                                    }
                                }

                                for (var key in comp.disciplines) {
                                    updateDisciplineHierarchy(comp.disciplines[key]);
                                }
                            }
                        });
                    }
                }
            });
        },
        methods: {
            onChange: function () {
                this.changed = true;
            },
            shouldShowRule: function (rule) {
                if (this.ruleset) {
                    if ((this.ruleset.sport.match && rule.match) || (this.ruleset.sport.individual && rule.individual)) {
                        return true;
                    }
                }
                return false;
            },
            selectRule: function (rule) {
                var comp = this;
                if (!this.changed && this.disciplines) {
                    this.selectedRule = {
                        rule: rule,
                        scopes: [
                            {description: "כללי", category: null, discipline: null, inherited: false}
                        ]
                    };

                    var ruleset = this.ruleset;
                    var inherited = false;
                    while (ruleset) {
                        var configs = ruleset.rules[rule.id];
                        if (configs) {
                            for (var n = 0; n < configs.length; n++) {
                                var config = configs[n];
                                var scope = null;
                                for (var si = 0; !scope && si < this.selectedRule.scopes.length; si++) {
                                    var s = this.selectedRule.scopes[si];
                                    if (s.category == config.category && s.discipline == config.discipline) {
                                        scope = s;
                                    }
                                }

                                if (scope) {
                                    if (scope.data == null) {
                                        scope.data = config.data;
                                    }
                                } else {
                                    var description = null;
                                    if (config.category) {
                                        description = Competitions.getCategoryName(config.category);
                                    }
                                    if (config.discipline) {

                                        var disciplineName = "";
                                        var discipline = comp.disciplines[config.discipline];
                                        if (!discipline) {
                                            disciplineName = config.discipline;
                                        } else {
                                            var d = discipline;
                                            while (d) {
                                                if (disciplineName.length > 0) {
                                                    disciplineName = d.name + " / " + disciplineName;
                                                } else {
                                                    disciplineName = d.name;
                                                }
                                                d = d.parent;
                                            }
                                        }

                                        if (description) {
                                            description = description + " - " + disciplineName;
                                        } else {
                                            description = disciplineName;
                                        }
                                    }
                                    this.selectedRule.scopes.push(
                                        {
                                            description: description,
                                            category: config.category,
                                            discipline: null,
                                            data: config.data,
                                            inherited: inherited
                                        }
                                    );
                                }
                            }
                        }
                        ruleset = ruleset.base;
                        inherited = true;
                    }

                    /*if (rule) {
                        var source = this.competition.rules[rule.id];
                        Vue.set(rule, "data", source
                            ? (CloneRule[rule.id] || CloneRule.Default)(source)
                            : null);

                    }*/

                    this.selectScope(this.selectedRule.scopes[0]);
                }
            },
            selectScope: function (scope) {
                this.selectedScope = scope;
                if (scope && this.selectedRule) {
                    this.scopeData =
                        scope.data
                            ? cloneData(scope.data)
                            : (this.selectedRule.rule.array ? [] : {});
                    var validate = ValidateData[this.selectedRule.rule.id];
                    if (validate) {
                        validate(this.scopeData);
                    }
                }

                //console.log(this.scopeData);
            },
            getRange: function (from, to) {
                var result = [];
                if (from < to) {
                    for (var n = from; n <= to; n++) {
                        result.push(n);
                    }
                }
                else {
                    for (var n = from; n >= to; n--) {
                        result.push(n);
                    }
                }
                return result;
            },
            getRankingName: function (method, matchedOpponents) {
                var name = this.rankingMethods[method] || "???";
                return matchedOpponents ? name + " (קבוצות שוויון)" : name;
            },
            isRankingSet: function (method, matchedOpponents) {
                if (this.scopeData && Array.isArray(this.scopeData)) {
                    return this.scopeData.find(function (r) {
                        return r.method == method && r.matchedOpponents == matchedOpponents;
                    }) != null;
                }
                return false;
            },
            removeRanking: function (index) {
                this.changed = true;
                this.scopeData.splice(index, 1);
            },
            addRanking: function (method, matchedOpponents) {
                this.changed = true;
                this.scopeData.push({method: method, matchedOpponents: matchedOpponents});
            },
            close: function () {
                this.$emit("close");
            }
        }
    });
    return RulesetDialogComponent;
});