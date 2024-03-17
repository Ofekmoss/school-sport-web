define([], function () {

    var hebBase = "אבגדהוזחט";
    var hebTens = "יכלמנסעפצ";

    var classes = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", "י\"א", "י\"ב"];

    function updateFields(fields, source, target) {
        for (var n = 0; n < fields.length; n++) {
            var field = fields[n];
            var value = source[field];
            if (value !== undefined) {
                target[field] = value;
            }
        }
    }

    function updateDictionary(dict, source, target, cls) {
        var sourceDict = source[dict];
        if (sourceDict) {
            var targetDict = sourceDict.$reset ? null : target[dict];
            if (!targetDict) {
                target[dict] = targetDict = {};
            }

            for (var key in sourceDict) {
                if (key === "$reset") {
                    continue;
                }
                var item = targetDict[key];
                if (!item) {
                    targetDict[key] = item = new cls(target, key);
                }
                item.$update(sourceDict[key]);
            }
        }
    }

    function indexById(list, id) {
        for (var n = 0; n < list.length; n++) {
            var item = list[n];
            if (item.id == id) {
                return n;
            }
        }
        return -1;
    }

    function getById(list, id) {
        for (var n = 0; n < list.length; n++) {
            var item = list[n];
            if (item.id === id) {
                return item;
            }
        }
        return null;
    }

    function getByIndex(list, index) {
        for (var n = 0; n < list.length; n++) {
            var item = list[n];
            if (item.index === index) {
                return item;
            }
        }
        return null;
    }

    function updateList(list, source, target, cls, find) {
        if (!find) {
            find = getById;
        }
        var sourceDict = source[list];
        if (sourceDict) {
            var targetList = sourceDict.$reset ? null : target[list];
            if (!targetList) {
                target[list] = targetList = [];
            }

            for (var key in sourceDict) {
                if (key === "$reset") {
                    continue;
                }
                var item = find(targetList, key);
                if (!item) {
                    item = new cls(target, key);
                    targetList.push(item);
                }
                item.$update(sourceDict[key]);
            }
        }
        else if (!target[list]) {
            target[list] = [];
        }
    }

    function GroupTeam(group, index) {
        this.group = group;
        this.index = index;
    }

    GroupTeam.prototype.getTeam = function () {
        var competition = this.group.phase.event.competition;
        var team = this.team;
        if (team) {
            return competition.teams[this.team];
        }
        else if (this.reference) {
            if (this.reference.group != null) {
                var group = this.group.phase.event.competition.groups[this.reference.group];
                if (group) {
                    return {
                        name: group.formatName() + " - מיקום " + (this.reference.position + 1),
                        group: group,
                        position: this.reference.position
                    };
                }
            }
        }
        else {
            return {
                name: "קבוצה " + (parseInt(this.index) + 1),
                group: group
            };
        }
        return null;
    };

    GroupTeam.prototype.remove = function (callback) {
        var group = this.group;
        //console.log(team);
        var url = "/groups/" + encodeURIComponent(group.id) + "/teams/" + encodeURIComponent(this.index);
        group.phase.event.competition.delete(url, function (err, result) {
            if (!callback) {
                return;
            }
            if (err) {
                callback(err);
            } else {
                callback();
            }
        });
    };

    GroupTeam.prototype.update = function (data, callback) {
        var group = this.group;
        var url = "/groups/" + encodeURIComponent(group.id) + "/teams/" + encodeURIComponent(this.index);
        group.phase.event.competition.put(url, data, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    GroupTeam.prototype.$update = function (update) {
        updateFields(["teamReference", "team", "position", "setPosition", "games", "losses", "points",
            "pointsAgainst", "reference", "score", "sets", "setsAgainst", "smallPoints",
            "smallPointsAgainst", "team", "technicalLosses", "technicalWins", "ties", "wins"], update, this);
    };

    function Match(group, id) {
        this.id = id;
        this.group = group;
    }

    Match.prototype.$update = function (update) {
        updateFields(["number", "sequence", "opponentA", "opponentB", "matchReferenceA", "matchReferenceB",
            "venue", "time", "functionaries", "scoreA", "scoreB", "smallPointsA", "smallPointsB", "outcome", "result"], update, this);
    };

    Match.prototype.update = function (matchData, callback) {
        var url = "/matches/" + encodeURIComponent(this.id);
        this.group.phase.event.competition.put(url, matchData, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Match.prototype.delete = function (callback) {
        var url = "/matches/" + encodeURIComponent(this.id);
        this.group.phase.event.competition.delete(url, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    function Entrant(group, index) {
        this.group = group;
        this.index = index;
        // TODO - index is string.. probably can change to number but need to check first
        // for now putting field "number" as number
        this.number = parseInt(index);
    }

    Entrant.prototype.$update = function (update) {
        updateFields(["id", "participant", "score", "points", "position"], update, this);
    };

    Entrant.prototype.getParticipant = function () {
        if (this.participant) {
            if (this.participant[0] === "N") {
                // Dummy participant with only number
                return {
                    number: this.participant.slice(1),
                    getTeam: function () {
                        return null;
                    }
                };
            }
            var competition = this.group.phase.event.competition;
            return competition.participants[this.participant];
        }
        return null;
    };

    function Group(phase, id) {
        this.id = id;
        this.phase = phase;
        phase.event.competition.groups[id] = this;
    }

    Group.prototype.$update = function (update) {
        updateFields(["name", "number", "state", "gameBoard", "rounds"], update, this);
        updateList("teams", update, this, GroupTeam, getByIndex);
        updateList("matches", update, this, Match);
        updateList("entrants", update, this, Entrant, getByIndex);
        if (this.matches) {
            this.matches.sort(function (a, b) {
                return a.number - b.number;
            });
        }
    };

    Group.prototype.formatName = function () {
        var i = this.name.indexOf('%%');
        if (i >= 0) {
            var num = this.phase.groups.indexOf(this) + 1;
            return this.name.slice(0, i) + Competitions.hebNumber(num) + this.name.slice(i + 2);
        }
        return this.name;
    };

    Group.prototype.assignTeam = function (team, callback) {
        var group = this;
        //console.log(team);
        var url = "/groups/" + encodeURIComponent(this.id) + "/teams";
        this.phase.event.competition.post(url, team, function (err, result) {
            if (!callback) {
                return;
            }
            if (err) {
                callback(err);
            } else {
                callback(null, group.teams[result]);
            }
        });
    };

    Group.prototype.updateRounds = function (rounds, callback) {
        var group = this;
        //console.log(team);
        var url = "/groups/" + encodeURIComponent(this.id) + "/rounds";
        this.phase.event.competition.post(url, rounds, function (err, result) {
            if (!callback) {
                return;
            }
            if (err) {
                callback(err);
            } else {
                callback();
            }
        });
    };

    Group.prototype.insertMatch = function (match, callback) {
        var group = this;
        var url = "/groups/" + encodeURIComponent(this.id) + "/matches";
        this.phase.event.competition.post(url, match, function (err, result) {
            if (!callback) {
                return;
            }
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Group.prototype.buildFromBoard = function (board, callback) {
        var group = this;
        var url = "/groups/" + encodeURIComponent(this.id) + "/matches/build";
        this.phase.event.competition.post(url, {board: board}, function (err, result) {
            if (!callback) {
                return;
            }
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Group.prototype.update = function (groupData, callback) {
        var url = "/groups/" + encodeURIComponent(this.id);
        this.phase.event.competition.put(url, groupData, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Group.prototype.delete = function (withData, callback) {
        var url = "/groups/" + encodeURIComponent(this.id);
        if (withData) {
            url += "?withData=1";
        }
        this.phase.event.competition.delete(url, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    function OrganizationLevel(phase, index) {
        this.phase = phase;
        this.index = index;
    }

    OrganizationLevel.prototype.$update = function (update) {
        updateFields(["name", "format", "count"], update, this);
    };

    function Phase(event, id) {
        this.id = id;
        this.event = event;
        event.competition.phases[id] = this;
    }

    Phase.prototype.$update = function (update) {
        updateFields(["name", "number", "meeting"], update, this);
        updateList("groups", update, this, Group);
        if (this.groups) {
            this.groups.sort(function (a, b) {
                return a.number - b.number;
            });
        }
        updateList("levels", update, this, OrganizationLevel, getByIndex);
    };

    Phase.prototype.update = function (phaseData, callback) {
        this.event.competition.put("/phases/" + this.id, phaseData, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Phase.prototype.delete = function (withData, callback) {
        var url = "/phases/" + encodeURIComponent(this.id);
        if (withData) {
            url += "?withData=1";
        }
        this.event.competition.delete(url, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Phase.prototype.getTeamGroup = function (id) {
        if (this.groups) {
            for (var g = 0; g < this.groups.length; g++) {
                var group = this.groups[g];
                for (var t = 0; t < group.teams.length; t++) {
                    var team = group.teams[t];
                    if (team.team == id) {
                        return group;
                    }
                }
            }
        }
        return null;
    };

    Phase.prototype.insertGroup = function (name, number, callback) {
        var phase = this;
        this.event.competition.post("/phases/" + encodeURIComponent(this.id) + "/groups", {name: name, number: number}, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, phase.getGroup(result));
            }
        });
    };

    Phase.prototype.getGroup = function (groupId) {
        return getById(this.groups, groupId.toString());
    };

    function Event(competition, id) {
        this.competition = competition;
        this.id = id;
    }

    Event.prototype.$update = function (update) {
        updateFields(["name", "phase"], update, this);
        updateList("phases", update, this, Phase);
        this.phases.sort(function (a, b) { return a.number - b.number; });
    };

    Event.prototype.getPhase = function (phaseId) {
        return getById(this.phases, phaseId.toString());
    };

    Event.prototype.insertPhase = function (name, number, callback) {
        var event = this;
        this.competition.post("/events/" + encodeURIComponent(this.id) + "/phases", {name: name, number: number}, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, event.getPhase(result));
            }
        });
    };

    Event.prototype.currentPhase = function () {
        if (this.phase >= 0 && this.phase < this.phases.length) {
            return this.phases[this.phase];
        }
        return false;
    };

    Event.prototype.nextPhase = function (callback) {
        var event = this;
        this.competition.put("/events/" + encodeURIComponent(this.id) + "/phase", {next: true}, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback();
            }
        });
    };

    Event.prototype.previousPhase = function (clearMatches, callback) {
        var event = this;
        this.competition.put("/events/" + encodeURIComponent(this.id) + "/phase", {previous: true, clearMatches: clearMatches}, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback();
            }
        });
    };

    function Team(competition, id) {
        this.competition = competition;
        this.id = id;
    }

    Team.prototype.$update = function (update) {
        updateFields(["identifier", "name"], update, this);
    };

    function Participant(competition, id) {
        this.competition = competition;
        this.id = id;
    }

    Participant.prototype.$update = function (update) {
        updateFields(["identifier", "name", "team", "number"], update, this);
    };

    Participant.prototype.getTeam = function () {
        return this.competition.teams[this.team];
    };

    function Competition(id) {
        this.id = id;
        this.phases = {};
        this.groups = {};
    }

    Competition.prototype.updateMatches = function (matchesData, callback) {
        var url = "/matches";
        this.post(url, matchesData, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, result);
            }
        });
    };

    Competition.prototype.post = function (path, data, callback) {
        var competition = this;
        Vue.http.post('/api/v2/competitions/' +
            encodeURIComponent(this.id) + path + "?ver=" + encodeURIComponent(this.$version), data).
            then(
                function (resp) {
                    competition.$update(resp.body);

                    callback(null, resp.body.$result);
                },
                function (err) {
                    callback(err);
                });
    };

    Competition.prototype.put = function (path, data, callback) {
        var competition = this;
        Vue.http.put('/api/v2/competitions/' +
            encodeURIComponent(this.id) + path + "?ver=" + encodeURIComponent(this.$version), data).
        then(
            function (resp) {
                competition.$update(resp.body);

                callback(null, resp.body.$result);
            },
            function (err) {
                callback(err);
            });
    };

    Competition.prototype.delete = function (path, callback) {
        var competition = this;
        var url = '/api/v2/competitions/' + encodeURIComponent(this.id) + path;
        url += url.indexOf('?') > 0 ? '&' : '?';
        url += 'ver=' + encodeURIComponent(this.$version);
        Vue.http.delete(url).then(function (resp) {
            competition.$update(resp.body);
            callback(null, resp.body.$result);
        }, function (err) {
            callback(err);
        });
    };

    Competition.prototype.$update = function (update) {
        if (update.$removed) {
            for (var n = 0; n < update.$removed.length; n++) {
                var remove = update.$removed[n];
                if (remove.phase != null) {
                    if (this.events) {
                        var event = this.events[remove.event];
                        if (event) {
                            var index = indexById(event.phases, remove.phase);
                            if (index >= 0) {
                                if (remove.group != null) {
                                    var phase = event.phases[index];
                                    index = indexById(phase.groups, remove.group);
                                    if (index >= 0) {
                                        if (remove.match != null) {
                                            var group = phase.groups[index];
                                            index = indexById(group.matches, remove.match);
                                            if (index >= 0) {
                                                group.matches.splice(index, 1);
                                            }
                                        }
                                        else {
                                            delete this.groups[remove.group];
                                            phase.groups.splice(index, 1);
                                        }
                                    }
                                }
                                else {
                                    delete this.phases[remove.phase];
                                    event.phases.splice(index, 1);
                                }
                            }
                        }
                    }
                }
            }
        }
        updateFields(["$version", "name", "category", "sport", "season", "ruleset", "rules"], update, this)
        updateDictionary("events", update, this, Event);
        updateDictionary("teams", update, this, Team);
        updateDictionary("participants", update, this, Participant);
    };

    var Competitions = {
        open: function (id, callback) {
            Vue.http.get('/api/v2/competitions/' + encodeURIComponent(id)).then(
                function (resp) {
                    var competition = new Competition(id);

                    competition.$update(resp.body);

                    callback(null, competition);
                },
                function (err) {
                    callback(err);
                });
        },
        season: function (id, callback) {
            Vue.http.get('/api/v2/competitions/seasons/' + encodeURIComponent(id)).then(
                function (resp) {
                    callback(null, resp.body);
                },
                function (err) {
                    callback(err);
                });
        },
        ruleset: function (id, callback) {
            Vue.http.get('/api/v2/competitions/rulesets/' + encodeURIComponent(id)).then(
                function (resp) {
                    callback(null, resp.body);
                },
                function (err) {
                    callback(err);
                });
        },
        disciplines: function (sport, callback) {
            if (callback === undefined) {
                callback = sport;
                Vue.http.get('/api/v2/competitions/disciplines').then(
                    function (resp) {
                        callback(null, resp.body);
                    },
                    function (err) {
                        callback(err);
                    });
            }
            else {
                Vue.http.get('/api/v2/competitions/sports/' + encodeURIComponent(sport) + '/disciplines').then(
                    function (resp) {
                        callback(null, resp.body);
                    },
                    function (err) {
                        callback(err);
                    });
            }
        },
        time: function (dateOrYear, month, day) {
            if (month != null) {
                // Setting date value
                return (dateOrYear * 10000) + (month * 100) + day;
            }
            else if (dateOrYear != null) {
                if (typeof dateOrYear === "number" || typeof dateOrYear === "string") {
                    dateOrYear = new Date(dateOrYear);
                }
                return Math.floor(dateOrYear.getTime()/1000);
            }
            return null;
        },
        hebNumber: function (number) {
            if (!number || number < 0 || number > 99) {
                return number;
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
            return hebNum;
        },
        getCategoryName: function (category) {
            var name = classes[category.minAge] || category.minAge;
            if (category.minAge !== category.maxAge) {
                name += "-" + (classes[category.maxAge] || category.maxAge);
            }

            if (category.gender == 1) {
                name += " תלמידים";
            }
            else if (category.gender == 2) {
                name += " תלמידות";
            }
            else {
                name += " תלמידים/ות";
            }
            return name;
        },
        Outcome: {
            Tie: 0,
            WinA: 1,
            WinB: 2,
            TechnicalA: 3,
            TechnicalB: 4
        }
    };

    return Competitions;
});