define(["templates/competitions", "views", "services/competitions", "services/venues", "dialog", "utils"],
    function (templates, Views, Competitions, Venues, Dialog, utils) {
//http://127.0.0.1:5000/v2/#/competitions/competition?id=17828

        var RankingTableFields = {
            R: "position",
            S: "score",
            G: "games",
            P: "points",
            C: "pointsAgainst",
            T: "smallPoints",
            Y: "smallPointsAgainst",
            W: "wins",
            L: "losses",
            E: "technicalWins",
            F: "technicalLosses",
            D: "ties"
        };

        function buildTeamField(arg) {
            var field = RankingTableFields[arg];
            if (field) {
                return function (team) {
                    return team[field];
                };
            }
            else {
                return "";
            }
        }

        function isSameSequencePart(a, b) {
            if (a.length !== b.length) {
                return false;
            }
            for (var n = 0; n < a.length - 1; n++) {
                if (a[n] !== b[n]) {
                    return false;
                }
            }
            return true;
        }

        var ErrorMessages = {
          "TEAM-ALREADY-IN-GROUP": "הקבוצה כבר קיימת בבית"
        };

        function Ask(caption, message, callback) {
            Dialog.open('general/message-box', {
                caption: caption,
                message: message,
                alert: true,
                confirmText: "כן",
                cancelText: "לא"
            }, callback);
        }

        function Alert(caption, err, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            var messageText = '';
            if (err.status && err.status > 200) {
                if (err.body.code) {
                    messageText = ErrorMessages[err.body.code];
                    if (!messageText) {
                        messageText = err.body.message;
                    }
                }
                else {
                    messageText = err.bodyText || err.body;
                }
            } else if (typeof err === "string") {
                messageText = err;
            }

            if (!messageText) {
                messageText = 'הפעולה נכשלה';
            }

            Dialog.open('general/message-box', {
                caption: caption,
                message: messageText,
                alert: true,
                confirmText: "אישור"
            }, callback);
        }

        function findDuplicatePhase(comp, phaseName) {
            if (comp.event && comp.event.phases) {
                return comp.event.phases.find(function (phase) {
                    return phase.name.trim() === phaseName;
                });
            } else {
                return null;
            }
        }

        function findDuplicateGroup(comp, groupName) {
            if (comp.phase && comp.phase.groups) {
                return comp.phase.groups.find(function (group) {
                    return group.formatName().trim() === groupName;
                });
            } else {
                return null;
            }
        }

        function extractTeamId(match, teamLetter) {
            var teamIndex = match['opponent' + teamLetter];
            if (teamIndex != null && match.group && match.group.teams) {
                var matchingTeam = match.group.teams.find(function(t) {
                    return t.index == teamIndex;
                });
                if (matchingTeam != null) {
                    return matchingTeam.team;
                }
            }
            return null;
        }

        function verifySets(comp, match) {
            var setCount = comp.competition.setCount || 4; //TODO - read from competition
            if (match && match.result && (match.result.setsA != null || match.result.setsB != null)) {
                var lengthA = match.result.setsA != null ? match.result.setsA.length : 0;
                var lengthB = match.result.setsB != null ? match.result.setsB.length : 0;
                return lengthA === lengthB && lengthA >= setCount;
            }
            return true;
        }


        function openMatchDetails(comp, group, match, callback) {
            var teams = [];
            for (var t = 0; t < group.teams.length; t++) {
                var groupTeam = group.teams[t];
                teams.push({
                    placement: t,
                    name: comp.getGroupTeamName(groupTeam)
                });
            }

            var teamA = -1;
            var teamB = -1;
            if (group.matches) {
                for (var m = 0; m < group.matches.length; m++) {
                    var mt = group.matches[m];
                    if (mt == match) continue;
                    teams.push({
                        reference: "W" + mt.id,
                        name: "מנצחת משחק " + (mt.number + 1)
                    });
                    teams.push({
                        reference: "L" + mt.id,
                        name: "מפסידת משחק " + (mt.number + 1)
                    });
                }
            }

            if (match != null) {
                if (match.matchReferenceA != null) {
                    for (var n = group.teams.length; n < teams.length; n++) {
                        var team = teams[n];
                        if (team.reference === match.matchReferenceA) {
                            teamA = n;
                            break;
                        }
                    }
                }
                else if (match.opponentA < group.teams.length) {
                    teamA = match.opponentA;
                }
                if (match.matchReferenceB != null) {
                    for (var n = group.teams.length; n < teams.length; n++) {
                        var team = teams[n];
                        if (team.reference === match.matchReferenceB) {
                            teamB = n;
                            break;
                        }
                    }
                }
                else if (match.opponentB < group.teams.length) {
                    teamB = match.opponentB;
                }
            }

            var edit = (match != null);
            var setCount = 0;
            var functionaryData = [
                {
                    type: 1,
                    caption: 'אחראי/ת משחק',
                    functionary: null
                },
                {
                    type: 2,
                    caption: 'שופט/ת',
                    functionary: null
                }
            ]; //TODO - read from competition
            var dialogParams = {
                teams: teams,
                teamA: teamA,
                teamB: teamB,
                groupName: comp.group.name,
                edit: edit,
                setCount: setCount,
                functionaryData: functionaryData
            };
            if (edit) {
                if (match.time) {
                    dialogParams.date = utils.parseCompetitionTime(match.time); //Vue.filter('competitionTime')(match.time)
                }
                if (match.venue) {
                    dialogParams.facility = match.venue;
                }
                if (match.functionaries != null) {
                    match.functionaries.forEach(function (matchFunctionary) {
                        var matchingDataItem = dialogParams.functionaryData.find(function(fd) {
                            return fd.type == matchFunctionary.type;
                        });
                        if (matchingDataItem != null) {
                            matchingDataItem.functionary = matchFunctionary.functionary;
                        }
                    });
                }
                utils.assignNonEmptyValues(match, dialogParams,
                    ['scoreA|resultA', 'scoreB|resultB', 'technicalWinA', 'technicalWinB', 'setsA', 'setsB']);
                /*
                    scoreA: 55,
                    scoreB: 100,
                    //technicalWinA: false,
                    //technicalWinB: false,
                    setsA: [10, null, null, 5, 25],
                    setsB: [null, 5, 20, null, 15]
                 */
            }
            Dialog.open('competitions/match-details', dialogParams, function(err, matchData) {
                if (err) {
                    Alert('נתוני משחק', err);
                    callback(null);
                } else {
                    if (matchData != null) {
                        var outcome = null;
                        var result = null;
                        if (matchData.result) {
                            if (matchData.result.technicalWinA) {
                                outcome = Competitions.Outcome.TechnicalA;
                            }
                            else if (matchData.result.technicalWinB) {
                                outcome = Competitions.Outcome.TechnicalB;
                            }
                            else {
                                result = {
                                    scoreA: matchData.result.scoreA,
                                    scoreB: matchData.result.scoreB

                                };
                                if (matchData.result.setsA && matchData.result.setsB) {
                                    result.sets = [];
                                    for (var n = 0; n < matchData.result.setsA.length; n++) {
                                        result.sets.push({a: matchData.result.setsA[n], b: matchData.result.setsA[n]});
                                    }
                                }
                            }
                        }
                        var matchUpdate = {
                            time: matchData.time,
                            venue: matchData.facility,
                            outcome: outcome,
                            result: result,
                            functionaries: matchData.functionaries
                        };

                        var teamA = teams[matchData.teamA];
                        if (teamA.placement != null) {
                            matchUpdate.opponentA = teamA.placement;
                            matchUpdate.matchReferenceA = null;
                        }
                        else {
                            matchUpdate.opponentA = null;
                            matchUpdate.matchReferenceA = teamA.reference;
                        }
                        var teamB = teams[matchData.teamB];
                        if (teamB.placement != null) {
                            matchUpdate.opponentB = teamB.placement;
                            matchUpdate.matchReferenceB = null;
                        }
                        else {
                            matchUpdate.opponentB = null;
                            matchUpdate.matchReferenceB = teamB.reference;
                        }
                    }

                    callback(matchUpdate);
                }
            });
        }

        var MatchColumns = {
            "number": {caption: "#", size: 4},
            "opponentA": {caption: "קבוצה א", size: 25},
            "opponentB": {caption: "קבוצה ב", size: 25},
            "time": {caption: "תאריך", size: 13},
            "venue": {caption: "מתקן", size: 13},
            "score": {caption: "תוצאה", size: 16}
        };


        var CompetitionComponent = Vue.extend({
            template: templates.competition,
            props: {
                id: {}
            },
            data: function () {
                return {
                    tabName: "אליפויות",
                    caption: "אליפות",
                    alterViews: null,
                    updating: false,
                    season: null,
                    meeting: null,
                    competition: null,
                    building: false,
                    event: null,
                    phase: null,
                    group: null,
                    groupsFull: true,
                    insertPanel: null,
                    teamsPanelState: false,
                    draggedTeam: null,
                    originalPositions: null,
                    contentMode: 'games',
                    phaseTeams: null,
                    teamForAssignment: null,
                    teamAssignSelect: null,
                    teamSearch: "",
                    teamSortByPosition: localStorage["team-sort-by-position"] === "1",
                    groupTeam: null,
                    rankTeam: null,
                    venues: {},
                    rankingTables: [],
                    selectedRankingTable: null,
                    matchSelection: null,
                    matchColumns: [
                        {id: "number", caption: "#", size: 4, show: true},
                        {id: "opponentA", caption: "קבוצה א", size: 25, show: true},
                        {id: "opponentB", caption: "קבוצה ב", size: 25, show: true},
                        {id: "time", caption: "תאריך", size: 13, show: true},
                        {id: "venue", caption: "מתקן", size: 13, show: true},
                        {id: "score", caption: "תוצאה", size: 16, show: true}
                    ],
                    totalMatchColumnsSize: 4+25+25+13+13+16,
                    visibleMatchColumns: 6,
                    functionaries: {},
                    dragging: null
                };
            },
            mounted: function () {
                var comp = this;
                Vue.http.get('/api/v2/functionaries?full=1')
                    .then(function (resp) {
                        for (var n = 0; n < resp.body.length; n++) {
                            var functionary = resp.body[n];
                            comp.functionaries[functionary.id] = functionary;
                        }
                    });
                Competitions.open(this.id, function (err, competition) {
                    if (!err) {
                        //console.log(competition);
                        Competitions.season(competition.season, function (err, season) {
                            if (!err) {
                                comp.season = season;
                                if (season && season.meetings.length > 0) {
                                    comp.meeting = season.meetings[0];
                                }

                                var alterViews = [];
                                for (var c = 0; c < season.competitions.length; c++) {
                                    var ct = season.competitions[c];
                                    alterViews.push(
                                        {
                                            caption: "אליפות - " + ct.name + " (" + Competitions.getCategoryName(ct.category) + ")",
                                            link: "competitions/competition?id=" + encodeURIComponent(ct.id)
                                        }
                                    );
                                }
                                comp.alterViews = alterViews;
                            }
                        });
                        comp.competition = competition;
                        comp.caption = "אליפות - " + competition.name + " (" + Competitions.getCategoryName(competition.category) +")";
                        for (var key in competition.events) {
                            comp.event = competition.events[key];
                            if (comp.event.phases.length > 0) {
                                comp.phase = comp.event.phases[0];
                                if (comp.phase.groups && comp.phase.groups.length > 0) {
                                    comp.group = comp.phase.groups[0];
                                }
                            }
                            else {
                                comp.building = true;
                                comp.insertPhase();
                            }
                            break;
                        }
                        var arr = (localStorage.getItem("matchColumns") || "number,opponentA,opponentB,time,venue,score").split(",");
                        var matchColumns = {};
                        for (var n = 0; n < arr.length; n++) {
                            var id = arr[n];
                            if (id[0] === "-") {
                                matchColumns[id.slice(1)] = -(n + 1);
                            }
                            else {
                                matchColumns[id] = n + 1;
                            }
                        }
                        comp.setMatchColumns(matchColumns);
                        comp.updateRankingTables();
                    } else {
                        console.log(err);
                    }
                });
            },
            methods: {
                updateView: function (params) {
                    var comp = this;
                    if (params.id && this.season) {
                        for (var c = 0; c < this.season.competitions.length; c++) {
                            var ct = this.season.competitions[c];
                            if (ct.id == params.id) {
                                this.id = ct.id;
                                this.competition = null;
                                this.building = false;
                                this.event = null;
                                this.phase = null;
                                this.group = null;
                                Competitions.open(this.id, function (err, competition) {
                                    comp.competition = competition;
                                    comp.caption = "אליפות - " + competition.name + " (" + Competitions.getCategoryName(competition.category) +")";
                                    for (var key in competition.events) {
                                        comp.event = competition.events[key];
                                        if (comp.event.phases.length > 0) {
                                            comp.phase = comp.event.phases[0];
                                            if (comp.phase.groups && comp.phase.groups.length > 0) {
                                                comp.group = comp.phase.groups[0];
                                            }
                                        }
                                        else {
                                            comp.building = true;
                                        }
                                        break;
                                    }
                                    comp.updateRankingTables();
                                });
                                return true;
                            }
                        }
                    }
                },
                updateRankingTables: function () {
                    this.rankingTables.splice(0, this.rankingTables.length);
                    var rankingTables = this.competition ? this.competition.rules.RankingTables : null;
                    if (rankingTables) {
                        for (var n = 0; n < rankingTables.length; n++) {
                            var rankingTable = rankingTables[n];
                            this.rankingTables.push({
                                name: rankingTable.name,
                                fields: rankingTable.fields.map(function (f) {
                                    return {
                                        title: f.title,
                                        formatter: utils.formatter(f.value, buildTeamField)
                                    };
                                })
                            });
                        }
                    }
                    if (this.rankingTables.length > 0) {
                        this.selectedRankingTable = this.rankingTables[0];
                    }
                    else {
                        this.selectedRankingTable = null;
                    }
                },
                setMatchColumns: function (columns) {
                    this.matchColumns.splice(0, this.matchColumns.length);
                    var totalMatchColumnsSize = 0;
                    var visibleMatchColumns = 0;
                    for (var id in columns) {
                        var order = columns[id];
                        var show = false;
                        if (order < 0) {
                            order = -order;
                        }
                        else {
                            show = true;
                        }
                        var col = {id: id, caption: null, size: 20, show: show};
                        var info = MatchColumns[id];
                        if (info) {
                            col.caption = info.caption;
                            col.size = info.size;
                        }
                        if (id.slice(0, 4) === "func") {
                            col.functionary = parseInt(id.slice(4));
                            if (this.competition.rules.Functionaries) {
                                for (var f = 0; f < this.competition.rules.Functionaries.length; f++) {
                                    var func = this.competition.rules.Functionaries[f];
                                    if (func.type === col.functionary) {
                                        col.caption = func.description;
                                    }
                                }
                            }

                        }
                        this.matchColumns.push(col);
                        if (show) {
                            totalMatchColumnsSize += col.size;
                            visibleMatchColumns++;
                        }
                    }
                    this.totalMatchColumnsSize = totalMatchColumnsSize;
                    this.visibleMatchColumns = visibleMatchColumns;
                    this.matchColumns.sort(function (a, b) { return a.order - b.order; });
                },
                getTeamFieldValue: function (team, field) {
                    return field.formatter.evaluate(team);
                },
                newGameDisabledReason: function() {
                    var comp = this;
                    if (comp.group == null)
                        return 'לא נבחר בית';
                    if (!comp.group.teams || comp.group.teams.length < 2)
                        return 'פחות משתי קבוצות בבית';
                    return '';
                },
                getMatchTeamName: function (group, matchReference) {
                    var matchId = matchReference.slice(1);
                    for (var n = 0; n < group.matches.length; n++) {
                        var match = group.matches[n];
                        if (match.id == matchId) {
                            if (matchReference[0] === "W") {
                                return "מנצחת משחק " + (match.number + 1);
                            }
                            else {
                                return "מפסידת משחק " + (match.number + 1);
                            }
                        }
                    }
                    return "";
                },
                getGroupTeamName: function (groupTeam, placement) {
                    if (placement != null) {
                        // If placement is given, groupTeam is the group
                        if (groupTeam.teams.length <= placement) {
                            return "קבוצה " + (placement + 1);
                        }
                        groupTeam = groupTeam.teams[placement];
                    }
                    var team = groupTeam.getTeam();
                    if (team) {
                        return team.name;
                    }
                    return null;
                },
                getOpponentName: function (group, match, opponent) {
                    if (opponent === 1) {
                        if (match.matchReferenceA) {
                            return this.getMatchTeamName(group, match.matchReferenceA);
                        }
                        return this.getGroupTeamName(group, match.opponentA);
                    }
                    else {
                        if (match.matchReferenceB) {
                            return this.getMatchTeamName(group, match.matchReferenceB);
                        }
                        return this.getGroupTeamName(group, match.opponentB);
                    }
                },
                getEntrantNumber: function (entrant) {
                    var participant = entrant.getParticipant();
                    if (participant) {
                        return participant.number;
                    }
                    return "?";
                },
                getEntrantName: function (entrant) {
                    var participant = entrant.getParticipant();
                    if (participant) {
                        return participant.name;
                    }
                    return null;
                },
                getEntrantTeamName: function (entrant) {
                    var participant = entrant.getParticipant();
                    if (participant) {
                        var team = participant.getTeam();
                        if (team) {
                            return team.name;
                        }
                    }
                    return null;
                },
                getFunctionaryName: function (funcId) {
                    if (funcId) {
                        var functionary = this.functionaries[funcId];
                        if (functionary) {
                            return functionary.name;
                        }
                    }
                    return "";
                },
                getVenueName: function (venueId) {
                    if (venueId == null) {
                        return "";
                    }
                    // TODO - for now not reading court part
                    var courtSplit = venueId.toString().indexOf("/");
                    if (courtSplit > 0) {
                        venueId = venueId.toString().slice(0, courtSplit);
                    }
                    var venue = this.venues[venueId];
                    if (venue) {
                        return venue.name;
                    }
                    else {
                        var comp = this;
                        Venues.getVenue(venueId, function (err, result) {
                            if (!err) {
                                Vue.set(comp.venues, venueId, result);
                            }
                        });
                        return "..."
                    }
                },
                toggleBuilding: function () {
                    this.building = !this.building;
                },
                toggleForAssignment: function (team) {
                    this.groupTeam = null;
                    this.teamForAssignment = team === this.teamForAssignment ? null : team;
                    this.teamAssignSelect = null;
                },
                teamAssignEnter: function ($event, team) {
                    if (this.building && !this.teamForAssignment) {
                        var teamDiv = $event.currentTarget.parentElement;
                        var teamsDiv = teamDiv.parentElement.parentElement.parentElement;
                        var parent = teamsDiv.getBoundingClientRect();
                        var rect = teamDiv.getBoundingClientRect();
                        this.teamAssignSelect = {
                            team: team,
                            top: rect.top - parent.top,
                            right: parent.right - rect.left - 6,
                            group: null
                        };
                    }
                },
                teamAssignLeave: function ($event, team) {
                    if (this.teamAssignSelect && this.teamAssignSelect.team === team) {
                        var target = $event.toElement || $event.relatedTarget;
                        if (target != null) {
                            while (target) {
                                if (target.classList.contains("team-assign-popup")) {
                                    return;
                                }
                                target = target.parentElement;
                            }
                        }
                        this.teamAssignSelect = null;
                    }
                },
                toggleGroupTeam: function (groupTeam) {
                    if (groupTeam.teamReference) {
                        for (var n = 0; n < this.teamsList.length; n++) {
                            var teamForAssignment = this.teamsList[n];
                            if (teamForAssignment.reference === groupTeam.teamReference) {
                                this.toggleForAssignment(teamForAssignment);
                                return;
                            }
                        }
                    }
                    this.teamForAssignment = null;
                    this.groupTeam = groupTeam === this.groupTeam ? null : groupTeam;
                },
                openRuleset: function () {
                    /*Dialog.open('competitions/ruleset', {competition: this.competition}, function(err){

                    });*/
                    Views.openView("competitions/ruleset", {id: this.competition.ruleset});
                },
                assignTeam: function (group, index, replace) {
                    var assign;
                    var move = false;
                    var team = null;
                    if (this.teamForAssignment || this.teamAssignSelect || this.groupTeam) {
                        var comp = this;
                        assign = {
                            placement: index,
                            replace: replace
                        };
                        if (this.teamForAssignment) {
                            team = this.teamForAssignment;
                            if (this.teamForAssignment.placement && this.teamForAssignment.placement.group !== group) {
                                move = this.teamForAssignment.placement.group;
                            }
                            assign.reference = this.teamForAssignment.reference;
                        }
                        else if (this.teamAssignSelect) {
                            team = this.teamAssignSelect.team;
                            if (this.teamAssignSelect.team.placement && this.teamAssignSelect.team.placement.group !== group) {
                                move = this.teamAssignSelect.team.placement.group;
                            }
                            assign.reference = this.teamAssignSelect.team.reference;
                            this.teamAssignSelect = null;
                        }
                        else if (this.groupTeam.group === group) {
                            team = this.groupTeam;
                            assign.reference = this.groupTeam.teamReference;
                        }
                        else {
                            team = this.groupTeam;
                            assign.group = this.groupTeam.group.id;
                            assign.replace = this.groupTeam.group.teams.indexOf(this.groupTeam);
                        }
                    }
                    else {
                        assign = {};
                    }

                    if (assign) {
                        if (move) {
                            Ask('שיבוץ קבוצה לבית',
                                "האם להעביר קבוצה " + team.name + " מבית '" +
                                move.name + "' לבית '" + group.formatName() + "'?", function (err, result) {
                                    if (result === true) {
                                        assign.move = true;
                                        group.assignTeam(assign, function (err, newTeam) {
                                            if (err) {
                                                Alert('שיבוץ קבוצה לבית', err);
                                            } else {
                                                comp.groupTeam = null;
                                                comp.teamForAssignment = null;
                                            }
                                        });
                                    }
                                });
                        }
                        else {
                            group.assignTeam(assign, function (err, newTeam) {
                                if (err) {
                                    Alert('שיבוץ קבוצה לבית', err);
                                } else {
                                    comp.groupTeam = null;
                                    comp.teamForAssignment = null;
                                }
                            });
                        }
                    }
                },
                listTeamsByPosition: function (group) {
                    if (group && group.teams) {
                        var teams = group.teams.slice();
                        teams.sort(function (a, b) {
                            return a.position - b.position;
                        });
                        return teams;
                    }
                    else {
                        return [];
                    }
                },
                listEntrantsByPosition: function (group) {
                    var entrants = group.entrants.slice();
                    entrants.sort(function (a, b) { return a.position - b.position; });
                    return entrants;
                },
                selectContentMode: function(mode) {
                    var comp = this;
                    comp.contentMode = mode;
                },
                selectPhase: function (phase) {
                    if (this.phase !== phase) {
                        this.teamForAssignment = null;
                        this.phase = phase;
                        this.group = null;
                    }
                },
                selectGroup: function (group) {
                    this.group = group === this.group ? null : group;
                    if (this.group && this.matchSelection && this.group != this.matchSelection.group) {
                        this.matchSelection = null;
                    }
                },
                selectEvent: function (event) {
                    if (this.event !== event) {
                        this.teamForAssignment = null;
                        this.event = event;
                        this.phase = event.phases.length > 0 ? event.phases[0] : null;
                        this.group = null;
                    }
                },
                newEvent: function () {

                },
                buildFromBoard: function () {
                    var comp = this;
                    Dialog.open('competitions/board-build', {participants:
                        comp.group.teams.map(function (team) { return comp.getGroupTeamName(team); }),
                        boardId: comp.group.gameBoard,
                        disableClickOutside: true
                    }, function(err, board) {
                        if (err) {
                            console.log(err);
                        }
                        else if (board) {
                            comp.updating = true;
                            comp.group.buildFromBoard(board, function (err) {
                                comp.updating = false;
                                if (err) {
                                    Alert('בניית משחקים מלוח', err);
                                }
                            });
                        }

                    });
                },
                editOrganizationLevels: function (phase) {
                    var comp = this;
                    Dialog.open('competitions/organization-levels', {phase: phase}, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                        else if (result) {
                            comp.updating = true;
                            phase.update({levels: result}, function (err) {
                                comp.updating = false;
                                if (err) {
                                    Alert('עדכון סידור משחקים', err);
                                }
                            });
                        }

                    });
                },
                newGame: function () {
                    var comp = this;
                    if (comp.newGameDisabledReason().length > 0)
                        return;
                    openMatchDetails(comp, comp.group,null, function(matchData) {
                        if (matchData != null) {
                            comp.group.insertMatch(matchData, function (err, result) {
                                if (err) {
                                    Alert('הוספת משחק חדש', err);
                                }
                            });
                        }
                    });
                },
                updatePosition: function (team, position) {
                    var comp = this;
                    team.update({position: position}, function () {
                    });
                },
                insertGroup: function () {
                    var comp = this;
                    var name = "בית %%";
                    this.phase.insertGroup(name, null, function (err, group) {
                        if (!err) {
                            comp.group = group;
                        }
                    });
                },
                insertPhase: function () {
                    var comp = this;
                    var name = "שלב " + (this.event.phases.length + 1);

                    this.event.insertPhase(name, null, function (err, phase) {
                        if (!err) {
                            comp.phase = phase;
                            comp.group = null;
                        }
                    });
                },
                changePosition: function(team, diff) {
                    if (team.position != null && team.group != null && team.group.teams) {
                        var newPos = utils.ensureRange(team.position + diff, 0, team.group.teams.length);
                        var matchingTeam = team.group.teams.find(function(t) {
                            return t.position == newPos;
                        });
                        if (matchingTeam != null) {
                            matchingTeam.position = team.position;
                        }
                        team.position = newPos;
                        team.group.teams.sort(function(t1, t2) {
                            return t1.position - t2.position;
                        });
                        //TODO - store new position
                    }
                },
                nextPhase: function () {
                    if (this.event) {
                        this.event.nextPhase(function (err, result) {

                        });
                    }
                },
                previousPhase: function () {
                    if (this.event) {
                        var event = this.event;
                        var phase = event.phases[event.phase];
                        if (phase) {
                            var hasOutcome = false;
                            for (var g = 0; !hasOutcome && g < phase.groups.length; g++) {
                                var group = phase.groups[g];
                                for (var m = 0; !hasOutcome && group.matches && m < group.matches.length; m++) {
                                    hasOutcome = group.matches[m].outcome != null;
                                }
                            }

                            if (hasOutcome) {
                                Ask('חזרת שלב', 'חזרה לשלב קודם ימחק את כל תוצאות המשחקים, האם להמשיך?', function(err, isDelete){
                                    if (!isDelete) {
                                        return;
                                    }

                                    event.previousPhase(true, function (err, result) {});
                                });
                            }
                            else {
                                event.previousPhase(false, function (err, result) {});
                            }
                        }
                    }
                },
                dropTeam: function(e, team, group) {
                    var comp = this;
                    // if this team already in group, place it in the drop location order
                    // get team
                    var teamId;
                    if (team == undefined) {
                        teamId = e.dataTransfer.getData('team');
                    } else {
                        teamId = team.id;
                    }
                    var team = this.competition.teams[teamId];

                    // get group
                    var groupId;
                    if (e) {
                        groupId = e.currentTarget.id.split('-')[1];
                    } else {
                        groupId = group;
                    }
                    var group = this.phase ? this.phase.groups[groupId] : null;

                    // is this team in group?
                    var isIncluded = group.teams && group.teams.find(function(t) {
                            return (t.id || t.team) == team.id;
                        }
                    );

                    // if yes set its order
                    // else insert it to this group in last place
                    if (e) {
                        var l = '';
                        if (e.target.id == '') {
                            l = e.target.parentElement.id;
                        } else {
                            l = e.target.id;
                        }
                    }

                    var matchingGroup = group.phase.groups.find(function(g) {
                        if (g.teams) {
                            var matchingTeam = g.teams.find(function(t) {
                                return t.team == team.id;
                            });
                            return matchingTeam != null;
                        }
                        return false;
                    });
                    if (matchingGroup != null) {
                        if (matchingGroup.id == group.id) {
                            //change position?
                            if (comp.draggedTeam != null && comp.draggedTeam.group && comp.draggedTeam.group.id == group.id) {
                                comp.draggedTeam = null;
                                //console.log('save positions');
                                //TODO - store new position
                            } else {
                                Alert('הוספת קבוצה לבית', 'קבוצה כבר קיימת בבית זה, לא ניתן להוסיף');
                            }
                        } else {
                            Alert('הוספת קבוצה לבית', 'קבוצה זו כבר משוייכת לבית ' + matchingGroup.formatName() +
                                ', לא ניתן להוסיף');
                            comp.group = matchingGroup;
                        }
                    } else {
                        group.insertTeam(team, function(err, newTeam) {
                            if (err) {
                                Alert('הוספת קבוצה לבית', err);
                            } else {
                                //console.log(newTeam);
                            }
                        });
                    }

                    // this is the team number where the dragged team dropped
                    //console.log(l.split(':')[1].split('-')[1]);
                },
                setData: function(e, team) {
                    var comp = this;
                    e.dataTransfer.setData('team', team.id || team.team);
                    e.dataTransfer.dropEffect = 'move';
                    if (team.group && team.group.teams) {
                        comp.draggedTeam = team;
                        comp.originalPositions = {};
                        team.group.teams.forEach(function(t) {
                            comp.originalPositions[t.team.toString()] = t.position;
                        });
                    }
                },
                dragEnded: function(e, team) {
                    var comp = this;
                    if (comp.draggedTeam != null && comp.originalPositions != null) {
                        //restore original positions
                        comp.draggedTeam.group.teams.forEach(function(groupTeam) {
                            groupTeam.position = comp.originalPositions[groupTeam.team.toString()];
                        });
                        comp.draggedTeam.group.teams.sort(function(t1, t2) {
                            return t1.position - t2.position;
                        });
                        comp.draggedTeam = null;
                    }
                },
                dragOver: function(e, t) {
                    var comp = this;
                    if (t != null && comp.draggedTeam != null && comp.draggedTeam.team
                        && comp.draggedTeam.team != t.team && comp.draggedTeam.position != null) {
                        var tp = t.position;
                        t.position = comp.draggedTeam.position;
                        comp.draggedTeam.position = tp;
                        t.group.teams.sort(function(t1, t2) {
                            return t1.position - t2.position;
                        });
                    }
                },
                deleteTeam: function (team) {
                    Ask('מחיקת קבוצה', 'האם למחוק את הקבוצה?', function(err, isDelete){
                        if (!isDelete) {
                            return;
                        }

                        //console.log("deleting team: ", team)
                    })
                },
                removeTeamFromGroup: function(team) {
                    var comp = this;
                    //console.log(team);
                    var msg = 'האם להסיר את הקבוצה <strong>' +
                        comp.getGroupTeamName(team) + '</strong> מ<strong>' +
                        team.group.formatName() + '</strong>?';
                    Ask('הסרת קבוצה מבית', msg, function(err, isDelete) {
                        if (!isDelete) {
                            return;
                        }

                        team.remove(function (err, newTeam) {
                            if (err) {
                                Alert('הסרת קבוצה מבית', err);
                            } else {
                                comp.groupTeam = null;
                                comp.teamForAssignment = null;
                            }
                        });
                    });
                },
                isMatchSelected: function (match) {
                    if (this.matchSelection == null) {
                        return false;
                    }
                    if (this.matchSelection.group !== match.group) {
                        return false;
                    }
                    return this.matchSelection.matches.indexOf(match) >= 0;
                },
                areAllGroupMatchesSelected: function (group) {
                    if (this.matchSelection == null || this.matchSelection.group !== group || group.matches.length === 0) {
                        return false;
                    }
                    for (var n = 0; n < group.matches.length; n++) {
                        if (this.matchSelection.matches.indexOf(group.matches[n]) < 0) {
                            return false;
                        }
                    }
                    return true;
                },
                areAllRoundMatchesSelected: function (round) {
                    if (round.matches.length === 0) {
                        return false;
                    }
                    if (this.matchSelection == null || this.matchSelection.group !== round.matches[0].group) {
                        return false;
                    }
                    for (var n = 0; n < round.matches.length; n++) {
                        if (this.matchSelection.matches.indexOf(round.matches[n]) < 0) {
                            return false;
                        }
                    }
                    return true;
                },
                toggleMatchSelected: function (match) {
                    if (this.matchSelection == null || this.matchSelection.group !== match.group) {
                        this.matchSelection = {
                            group: match.group,
                            matches: []
                        };
                    }
                    var index = this.matchSelection.matches.indexOf(match);
                    if (index >= 0) {
                        this.matchSelection.matches.splice(index, 1);
                    }
                    else {
                        this.matchSelection.matches.push(match);
                    }
                },
                toggleAllGroupMatchesSelected: function (group) {
                    if (this.areAllGroupMatchesSelected(group)) {
                        this.matchSelection = null;
                    }
                    else {
                        this.matchSelection = {
                            group: group,
                            matches: []
                        };
                        for (var n = 0; n < group.matches.length; n++) {
                            this.matchSelection.matches.push(group.matches[n]);
                        }
                    }
                },
                toggleAllRoundMatchesSelected: function (round) {
                    if (round.matches.length > 0) {
                        if (this.matchSelection && this.areAllRoundMatchesSelected(round)) {
                            for (var n = 0; n < round.matches.length; n++) {
                                var match = round.matches[n];
                                var i = this.matchSelection.matches.indexOf(match);
                                if (i >= 0) {
                                    this.matchSelection.matches.splice(i, 1);
                                }
                            }
                        } else {
                            if (!this.matchSelection || this.matchSelection.group !== round.matches[0].group) {
                                this.matchSelection = {
                                    group: round.matches[0].group,
                                    matches: round.matches.slice()
                                };
                            }
                            else {
                                for (var n = 0; n < round.matches.length; n++) {
                                    var match = round.matches[n];
                                    if (this.matchSelection.matches.indexOf(match) < 0) {
                                        this.matchSelection.matches.push(match);
                                    }
                                }
                            }
                        }
                    }
                },
                selectColumns: function () {
                    var comp = this;
                    var columns = {};
                    for (var n = 0; n < this.matchColumns.length; n++) {
                        var col = this.matchColumns[n];
                        if (col.show) {
                            columns[col.id] = n + 1;
                        }
                        else {
                            columns[col.id] = -(n + 1);
                        }
                    }
                    Dialog.open('competitions/select-columns', {
                        setColumns: columns,
                        functionaries: this.competition.rules.Functionaries
                    }, function(err, result) {
                        if (result) {
                            comp.setMatchColumns(result);
                            localStorage.setItem("matchColumns", comp.matchColumns.map(function (c) { return c.show ? c.id : "-"    + c.id; }).join(","));
                        }
                    });

                },
                editSelectedMatches: function () {
                    if (this.matchSelection == null) {
                        return;
                    }
                    var comp = this;
                    if (comp.group == null) {
                        comp.group = this.matchSelection.group;
                    }

                    this.openMatchesEdit(
                        this.season && this.season.program ? this.season.program.region : 0,
                        this.matchSelection.group,
                        this.matchSelection.matches);
                },
                deleteSelectedMatches: function () {
                    if (this.matchSelection == null && this.matchSelection.matches.length > 0) {
                        return;
                    }

                    var comp = this;

                    Ask("מחיקת משחקים",
                        this.matchSelection.matches.length === 1 ? "האם למחוק את המשחק שנבחר?" :
                        "האם למחוק את " + this.matchSelection.matches.length + " המשחקים שנבחרו?", function(err, result){
                        if (result) {
                            /*comp.matchSelection.group.phase.event.competition.delete(comp.matchSelection.matches.map(function (m) { return {match: m.id, remove: true}; }), function(err, result) {
                                if (err) {
                                    Alert('מחיקת משחק', 'שגיאה בעת מחיקת משחקים, נא לנסות שוב מאוחר יותר');
                                    console.log(err);
                                }
                                else {
                                    comp.matchSelection = null;
                                }
                            });*/
                        }
                    });
                },
                onEditMatch: function(group, match) {
                    var comp = this;
                    if (comp.group == null) {
                        comp.group = comp.phase.groups.find(function(g) {
                            return match.group.id == g.id;
                        });
                    }
                    //console.log(match);
                    /*
                    match.functionaries = [
                        {
                            type: 1,
                            functionary: 629
                        }
                    ]; //DEBUG
                    */

                    /*
                    openMatchDetails(comp, match.group, match, function(matchData) {
                        if (matchData != null) {
                            match.update(matchData, function(err, result) {
                                if (err) {
                                    Alert('עריכת פרטי משחק', err);
                                } else {
                                    console.log(result);
                                }
                            });
                        }
                    });*/

                    this.openMatchesEdit(this.season && this.season.program ? this.season.program.region : 0,
                        group, [match]);
                },
                openMatchesEdit: function (region, group, matches) {
                    matches.sort(function (a, b) {
                        var d = 0;
                        var i = 0;
                        while (!d && i < a.sequence.length && i < b.sequence.length) {
                            d = a.sequence[i] - b.sequence[i];
                            i++;
                        }
                        if (!d) {
                            d = a.sequence.length - b.sequence.length;
                        }
                        return d;
                    });
                    Dialog.open('competitions/edit-match', {
                        region: region,
                        group: group,
                        matches: matches,
                        disableClickOutside: true
                    }, function(err, updates) {
                        if (updates) {
                            group.phase.event.competition.updateMatches(updates, function (err) {

                            });
                        }
                    });
                },
                onDeleteMatch: function(group, match) {
                    //console.log(match);
                    var comp = this;
                    var msg = 'האם למחוק את משחק מספר ' + (match.number + 1) + ' בין ' +
                        comp.getOpponentName(group, match, 1) + ' לבין ' +
                        comp.getOpponentName(group, match, 2) + '?';
                    Ask('מחיקת משחק', msg, function(err, isDelete) {
                        if (!isDelete) {
                            return;
                        }
                        match.delete(function(err, result) {
                            if (err) {
                                Alert('מחיקת משחק', 'שגיאה בעת מחיקת משחק, נא לנסות שוב מאוחר יותר');
                                console.log(err);
                            }
                            comp.matchSelection = null;
                        });
                    });
                },
                setMatchResult: function (match) {
                    var phase = match.group.phase;
                    if (!phase || phase.event.currentPhase() !== phase) {
                        // Not current phase
                        return;
                    }

                    Dialog.open('competitions/match-result', {
                        gameStructure: this.competition.rules.GameStructure,
                        teamA: this.getGroupTeamName(match.group.teams[match.opponentA]),
                        teamB: this.getGroupTeamName(match.group.teams[match.opponentB]),
                        scoreA: match.scoreA,
                        scoreB: match.scoreB,
                        sets: match.result ? match.result.sets : null,
                        outcome: match.outcome,
                        disableClickOutside: true
                    }, function(err, matchResult) {
                        if (matchResult) {
                            match.update(matchResult, function(err, result) {
                                if (err) {
                                    Alert('עדכון תוצאה', err);
                                }
                            });
                        }
                    });
                },
                onEditPhase: function(phaseIndex, e) {
                    var comp = this;
                    e.stopPropagation();
                    // find phase
                    var p = comp.event.phases[phaseIndex];
                    var oldName = p.name;
                    Dialog.open('competitions/edit-item', {
                        name: oldName,
                        title: "עריכת שלב",
                        caption: "שם השלב",
                        deleteCaption: "מחיקת שלב",
                        disableClickOutside: true
                    }, function(err, dialogResponse) {
                        if (dialogResponse && dialogResponse.action && dialogResponse.action === 'delete') {
                            comp.deletePhase(p);
                        } else {
                            var newName = dialogResponse ? dialogResponse.trim() : '';
                            if (newName.length === 0 || newName == oldName) {
                                return;
                            }
                            var matchingPhase = findDuplicatePhase(comp, newName);
                            if (matchingPhase != null) {
                                Alert('עריכת שלב', 'שלב בעל שם זהה כבר קיים, לא ניתן לשנות שם');
                                comp.phase = matchingPhase;
                            } else {
                                p.update({name : newName}, function(err, result) {
                                    if (err) {
                                        console.log('error updating phase');
                                        console.log(err);
                                    } else {
                                        p.name = newName;
                                    }
                                });
                            }
                        }
                    });
                },
                editRound: function (round, group) {
                    var comp = this;
                    // find phase
                    Dialog.open('competitions/edit-item', {
                        name: round.name || "",
                        defaultName: this.formatRoundName(group, round.sequence),
                        title: "עריכת חלק",
                        caption: "שם החלק",
                        showDelete: false,
                        disableClickOutside: true
                    }, function(err, result) {
                        if (result) {
                            if (typeof result === "string") {
                                var rounds = {};
                                rounds[round.sequence.join(":")] = result;
                                group.updateRounds(rounds);
                            }
                            else if (result.action === "default") {
                                var rounds = {};
                                rounds[round.sequence.join(":")] = null;
                                group.updateRounds(rounds);
                            }

                        }
                    });
                },
                moveGroup: function (group, number, e) {
                    e.stopPropagation();
                    group.update({number: number}, function (err) {
                        if (err) {
                            Alert('הזזת בית', err);
                        }
                    });
                },
                deleteGroup: function(group, index) {
                    var comp = this;
                    function deleteGroup(withData) {
                        group.delete(withData, function(err, result) {
                            if (err) {
                                console.log('error deleting group');
                                console.log(err);
                                Alert('מחיקת בית',err);
                            } else {
                                if (comp.phase.groups.length > 0) {
                                    comp.selectGroup(comp.phase.groups[0]);
                                } else {
                                    comp.group = null;
                                }
                            }
                        });
                    }

                    Ask("מחיקת בית", "האם למחוק את הבית?", function(err, isDelete){
                        if (!isDelete) {
                            return;
                        }

                        var warnings = null;
                        if (group.teams && group.teams.length > 0) {
                            warnings = "הקבוצות";
                        }
                        if (group.matches && group.matches.length > 0) {

                            if (group.matches.find(function (t) { return t.outcome != null; }) != null) {
                                warnings = (warnings == null ? "" : warnings + ", ") + "המשחקים והתוצאות";
                            }
                            else {
                                warnings = warnings == null ? "המשחקים" : warnings + " והמשחקים";
                            }
                        }

                        if (warnings != null) {
                            Ask("מחיקת בית", warnings + " ימחקו. האם להמשיך?", function(err, isDelete){
                                if (isDelete) {
                                    deleteGroup(true);
                                }
                            });
                        }
                        else {
                            deleteGroup()
                        }


                    });
                },
                deletePhase: function (phase) {
                    var comp = this;
                    function deletePhase(withData) {
                        phase.delete(withData, function(err, result) {
                            if (err) {
                                console.log('error deleting phase');
                                console.log(err);
                            } else {
                                comp.selectPhase(comp.event.phases[0]);
                            }
                        });
                    }

                    //delete phase
                    Ask("מחיקת שלב", "האם למחוק את השלב?", function(err, isDelete){
                        if (!isDelete) {
                            return;
                        }

                        var hasTeams = false;
                        var hasMatches = false;
                        var hasResults = false;
                        var warnings = [];
                        if (phase.groups.length > 0) {
                            warnings.push("הבתים");
                            for (var n = 0; n < phase.groups.length; n++) {
                                var group = phase.groups[n];
                                if (!hasTeams) {
                                    hasTeams = group.teams && group.teams.length > 0;
                                    warnings.push("הקבוצות");
                                }
                                if (!hasResults) {
                                    if (group.matches && group.matches.length > 0) {
                                        if (!hasMatches) {
                                            hasMatches = true;
                                            warnings.push("המשחקים");
                                        }
                                        if (group.matches.find(function (t) { return t.outcome != null; }) != null) {
                                            hasResults = true;
                                            warnings.push("התוצאות");
                                            break; // All warnings
                                        }
                                    }
                                }

                            }
                        }
                        if (warnings.length > 0) {
                            var warning = warnings.length === 1 ? warnings[0] :
                                warnings.slice(0, warnings.length - 1).join(", ") + " ו" + warnings[warnings.length - 1];
                            Ask("מחיקת שלב", warning + " ימחקו. האם להמשיך?", function(err, isDelete){
                                if (isDelete) {
                                    deletePhase(true);
                                }
                            });
                        }
                        else {
                            deletePhase()
                        }
                    });
                },
                onEditGroup: function(groupIndex, e) {
                    var comp = this;
                    e.stopPropagation();
                    var oldName = this.phase ? this.phase.groups[groupIndex].name : '';
                    // find group
                    var g = comp.phase && comp.phase.groups ? comp.phase.groups[groupIndex] : null;
                    if (g == null)
                        return;
                    Dialog.open('competitions/edit-item', {
                        name: oldName,
                        title: "עריכת בית",
                        caption: "שם הבית",
                        deleteCaption: "מחיקת בית",
                        defaultName: "בית " + Competitions.hebNumber(groupIndex + 1),
                        disableClickOutside: true
                    }, function(err, dialogResponse){
                        if (dialogResponse && dialogResponse.action && dialogResponse.action === 'delete') {
                            //delete group
                            comp.deleteGroup(g, groupIndex);
                        } else if (dialogResponse && dialogResponse.action === "default") {
                            g.update({name : "בית %%"}, function(err, result) {
                                if (err) {
                                    console.log('error updating group');
                                    console.log(err);
                                } else {
                                    g.name = "בית %%";
                                }
                            });
                        } else {
                            var newName = dialogResponse ? dialogResponse.trim() : '';
                            if (newName.length === 0 || newName == oldName) {
                                return;
                            }
                            var matchingGroup = findDuplicateGroup(comp, newName);
                            if (matchingGroup != null) {
                                Alert('עריכת בית', 'בית בעל שם זהה כבר קיים, לא ניתן לשנות לשם זה');
                                comp.group = matchingGroup;
                            } else {
                                g.update({name : newName}, function(err, result) {
                                    if (err) {
                                        console.log('error updating group');
                                        console.log(err);
                                    } else {
                                        g.name = newName;
                                    }
                                });
                            }

                        }
                    });
                },
                toggleTeams: function() {
                    this.teamsPanelState = !this.teamsPanelState;
                },
                startDragMatch: function (ev, group, match) {
                    ev.preventDefault();
                    var comp = this;
                    comp.dragging = {
                        group: group,
                        match: match,
                        round: match.sequence.length > 1 ? match.sequence.slice(0, match.sequence.length - 1).join(":") : "",
                        groupContent: this.$el.querySelector("#group-content")
                    };
                    //console.log("drag " + group.id + " " + match.id);
                    document.onmouseup = function () {
                        comp.completeDrag();
                    };

                    document.onblur = function () {
                        comp.completeDrag();
                    };
                },
                completeDrag: function () {
                    if (this.dragging) {
                        this.dragging = null;
                        document.onmouseup = null;
                        document.onmousemove = null;
                    }
                },
                scrollGroupContent: function () {
                    if (this.dragging && this.dragging.groupContent) {
                        var groupContentRect = this.dragging.groupContent.getBoundingClientRect();
                        //console.log(groupContentRect.top + " - " + this.dragging.pos + " - " + groupContentRect.bottom);
                        var scroll = false;
                        if (this.dragging.pos - groupContentRect.top < 20) {
                            scroll = true;
                            this.dragging.groupContent.scrollTop = Math.max(0,
                                this.dragging.groupContent.scrollTop + Math.min(-16, (this.dragging.pos - groupContentRect.top)/2));
                        }
                        else if (this.dragging.pos - groupContentRect.bottom > -20) {
                            scroll = true;
                            this.dragging.groupContent.scrollTop = Math.min(this.dragging.groupContent.scrollHeight,
                                this.dragging.groupContent.scrollTop + Math.max(16, (this.dragging.pos - groupContentRect.bottom)/2));
                        }
                        if (scroll) {
                            setTimeout((function (comp) {
                                return function () {
                                    comp.scrollGroupContent();
                                };
                            })(this), 100);
                        }
                    }
                },
                mouseMove: function (ev) {
                    if (this.dragging && !this.dragging.updating) {
                        var element = ev.srcElement;
                        var id = null;
                        var type = null;
                        while (id == null && element) {
                            if (element.id) {
                                if (element.id.startsWith("match")) {
                                    id = element.id.slice(5);
                                    type = "match";
                                }
                                else if (element.id.startsWith("round")) {
                                    id = element.id.slice(5);
                                    type = "round";
                                }
                            }
                            element = element.parentElement;
                        }
                        this.dragging.pos = ev.pageY;
                        this.scrollGroupContent();
                        if (id) {
                            if (type === "match") {
                                var details = id.split(".");
                                if (details[0] === this.dragging.group.id && details[1] !== this.dragging.match.id) {
                                    var targetMatch = null;
                                    var targetIndex = 0;
                                    for (var m = 0; m < this.dragging.group.matches.length; m++) {
                                        var match = this.dragging.group.matches[m];
                                        if (match.id === details[1]) {
                                            targetMatch = match;
                                            targetIndex = m;
                                            break;
                                        }
                                    }
                                    var sequence = targetMatch.sequence.join(":");
                                    if (this.dragging.sequence !== sequence) {
                                        var comp = this;
                                        this.dragging.sequence = sequence;
                                        this.dragging.updating = true;
                                        var updates = [{match: this.dragging.match.id, sequence: targetMatch.sequence}];
                                        if (isSameSequencePart(targetMatch.sequence, this.dragging.match.sequence)) {
                                            updates.push({
                                                match: targetMatch.id,
                                                sequence: this.dragging.match.sequence
                                            });
                                        } else {
                                            var mi = this.dragging.group.matches.indexOf(this.dragging.match);
                                            if (mi >= 0) {
                                                mi++;
                                                while (mi < this.dragging.group.matches.length) {
                                                    var match = this.dragging.group.matches[mi];
                                                    if (!isSameSequencePart(match.sequence, this.dragging.match.sequence)) {
                                                        break;
                                                    }
                                                    var sequence = match.sequence.slice();
                                                    sequence[sequence.length - 1] = sequence[sequence.length - 1] - 1;
                                                    updates.push({match: match.id, sequence: sequence});
                                                    mi++;
                                                }
                                            }
                                            mi = targetIndex;
                                            while (mi < this.dragging.group.matches.length) {
                                                var match = this.dragging.group.matches[mi];
                                                if (match !== targetMatch) {
                                                    if (!isSameSequencePart(match.sequence, targetMatch.sequence)) {
                                                        break;
                                                    }
                                                }
                                                var sequence = match.sequence.slice();
                                                sequence[sequence.length - 1] = sequence[sequence.length - 1] + 1;
                                                updates.push({match: match.id, sequence: sequence});
                                                mi++;
                                            }
                                        }
                                        this.competition.updateMatches(updates, function (err) {
                                            comp.dragging.updating = false;
                                        });
                                    }
                                }
                            }
                            else if (type === "round") {
                                var details = id.split(".");
                                if (details[0] === this.dragging.group.id && this.dragging.round !== details[1]) {
                                    var d = details[1].localeCompare(this.dragging.round);
                                    if (d !== 0) {
                                        var updates = [];
                                        var mi = this.dragging.group.matches.indexOf(this.dragging.match);
                                        var targetSequence = details[1].split(':').map(function (x) { return parseInt(x); });
                                        targetSequence.push(0);
                                        if (d < 0) {
                                            // Move to previous round
                                            var gotToTarget = false;
                                            var m = 0;
                                            while (mi < this.dragging.group.matches.length) {
                                                var match = this.dragging.group.matches[mi];
                                                if (!gotToTarget) {
                                                    if (isSameSequencePart(match.sequence, targetSequence)) {
                                                        gotToTarget = true;
                                                        targetSequence = match.sequence.slice();
                                                        targetSequence[targetSequence.length - 1] = targetSequence[targetSequence.length - 1] + 1;
                                                    }
                                                }
                                                else if (isSameSequencePart(match.sequence, targetSequence)) {
                                                    targetSequence = match.sequence.slice();
                                                    targetSequence[targetSequence.length - 1] = targetSequence[targetSequence.length - 1] + 1;
                                                }
                                                else if (isSameSequencePart(match.sequence, this.dragging.match.sequence)) {
                                                    var sequence = match.sequence.slice();
                                                    sequence[sequence.length - 1] = sequence[sequence.length - 1] - 1;
                                                    updates.push({match: match.id, sequence: sequence});
                                                }
                                                mi++;
                                            }
                                            updates.push({match: this.dragging.match.id, sequence: targetSequence});
                                        } else if (d > 0) {
                                            // Move to next round
                                            // Putting first at round
                                            var gotToTarget = false;
                                            mi++;
                                            while (mi < this.dragging.group.matches.length) {
                                                var match = this.dragging.group.matches[mi];
                                                if (isSameSequencePart(match.sequence, this.dragging.match.sequence)) {
                                                    var sequence = match.sequence.slice();
                                                    sequence[sequence.length - 1] = sequence[sequence.length - 1] - 1;
                                                    updates.push({match: match.id, sequence: sequence});
                                                } else {
                                                    break;
                                                }
                                                mi++;
                                            }

                                            updates.splice(0, 0, {match: this.dragging.match.id, sequence: targetSequence});
                                            while (mi < this.dragging.group.matches.length) {
                                                var match = this.dragging.group.matches[mi];
                                                if (!isSameSequencePart(match.sequence, targetSequence)) {
                                                    if (gotToTarget) {
                                                        break;
                                                    }
                                                }
                                                else {
                                                    gotToTarget = true;
                                                    var sequence = match.sequence.slice();
                                                    sequence[sequence.length - 1] = sequence[sequence.length - 1] + 1;
                                                    updates.splice(0, 0, {match: match.id, sequence: sequence});
                                                }
                                                mi++;
                                            }
                                        }

                                        var sequence = targetSequence.join(":");
                                        if (this.dragging.sequence !== sequence) {
                                            var comp = this;
                                            this.dragging.sequence = sequence;
                                            this.dragging.updating = true;
                                            this.competition.updateMatches(updates, function (err) {
                                                comp.dragging.updating = false;
                                            });
                                        }
                                    }
                                }
                            }

                        }
                    }
                },
                getGroupRounds: function (group) {
                    var roundMap = {};
                    var rounds = [];
                    if (group.rounds) {
                        for (var key in group.rounds) {
                            var roundSequence = key.split(":").map(function (x) { return parseInt(x); });
                            var round = {
                                sequence: roundSequence,
                                name: group.rounds[key],
                                matches: []
                            };
                            roundMap[key] = round;
                            rounds.push(round);
                        }
                    }
                    for (var n = 0; n < group.matches.length; n++) {
                        var match = group.matches[n];
                        var roundSequence = match.sequence.length > 1
                            ? match.sequence.slice(0, match.sequence.length - 1)
                            : [];
                        var key = roundSequence.join(":");
                        var round = roundMap[key];
                        if (!round) {
                            roundMap[key] = round = {
                                sequence: roundSequence,
                                name: null,
                                matches: []
                            };
                            rounds.push(round);
                        }
                        round.matches.push(match);
                    }
                    rounds.sort(function (a, b) {
                        var d = 0;
                        for (var n = 0; n < a.sequence.length && n < b.sequence.length; n++) {
                            d = a.sequence[n] - b.sequence[n];
                            if (d) {
                                return d;
                            }
                        }
                        return b.sequence.length - a.sequence.length;
                    });
                    return rounds;
                },
                checkLevelChange: function (group, index) {
                    if (!group.phase.levels) {
                        return false;
                    }
                    if (index === 0) {
                        return group.phase.levels.length > 0;
                    }
                    else {
                        var match = group.matches[index];
                        var prev = group.matches[index - 1];
                        for (var n = 0; n < group.phase.levels.length; n++) {
                            if (match.sequence[n] !== prev.sequence[n]) {
                                return true;
                            }
                        }
                    }

                    return false;
                },
                toggleTeamSortByPosition: function () {
                    this.teamSortByPosition = !this.teamSortByPosition;
                    localStorage["team-sort-by-position"] = this.teamSortByPosition ? "1" : "0";
                },
                formatRoundName: function (group, sequence) {
                    var result = "";
                    for (var n = 0; n < sequence.length; n++) {
                        var num = (sequence[n] || 0) + 1;
                        if (result.length > 0) {
                            result += " - ";
                        }
                        if (n < group.phase.levels.length) {
                            result += group.phase.levels[n].name + " " + num;
                        }
                        else {
                            result += num;
                        }
                    }
                    return result;
                },
                test: function(t) {
                    console.log(t);
                }
            },
            watch: {
                phase: function () {
                    if (this.phaseTeams &&
                        (!this.phase || this.phase.number <= this.phaseTeams.number)) {
                        this.phaseTeams = null;
                    }
                }
            },
            computed: {
                teamsList: function () {
                    var search = this.teamSearch.trim();
                    var teams = [];
                    var teamsPlacement = {};
                    if (this.phase) {
                        for (var gi = 0; gi < this.phase.groups.length; gi++) {
                            var group = this.phase.groups[gi];
                            if (group.teams) {
                                for (var ti = 0; ti < group.teams.length; ti++) {
                                    var groupTeam = group.teams[ti];
                                    teamsPlacement[groupTeam.teamReference] = {
                                        group: group,
                                        groupNumber: gi,
                                        placement: ti,
                                        name: group.formatName() + " - " + (ti + 1)
                                    };
                                }
                            }
                        }

                        if (this.phaseTeams) {
                            for (var gi = 0; gi < this.phaseTeams.groups.length; gi++) {
                                var group = this.phaseTeams.groups[gi];
                                if (group.teams) {
                                    for (var ti = 0; ti < group.teams.length; ti++) {
                                        var reference = "G" + group.id + "R" + ti;
                                        var name = group.formatName() + " - מיקום " + (ti + 1);
                                        if (search.length > 0 && name.indexOf(search) < 0) {
                                            continue;
                                        }
                                        teams.push({
                                            reference: reference,
                                            name: name,
                                            placement: teamsPlacement[reference]
                                        });
                                    }
                                }
                            }
                            return teams;
                        }
                    }

                    for (var key in this.competition.teams) {
                        var team = this.competition.teams[key];
                        if (search.length > 0 && team.name.indexOf(search) < 0) {
                            continue;
                        }
                        var reference = "C" + team.id;
                        teams.push({
                            reference: reference,
                            name: team.name,
                            placement: teamsPlacement[reference]
                        });
                    }

                    if (this.teamSortByPosition) {
                        teams.sort(function (a, b) {
                            if (a.placement == null) {
                                if (b.placement != null) {
                                    return -1;
                                }
                                return a.name.localeCompare(b.name);
                            }
                            else if (b.placement == null) {
                                return 1;
                            }
                            var d = a.placement.groupNumber - b.placement.groupNumber;
                            if (d === 0) {
                                d = a.placement.placement - b.placement.placement;
                            }
                            if (d === 0) {
                                d = a.name.localeCompare(b.name);
                            }
                            return d;
                        });
                    }
                    else {
                        teams.sort(function (a, b) { return a.name.localeCompare(b.name); });
                    }

                    return teams;
                },
                meetingEvents: function () {
                    var events = [];
                    var meetingId = this.meeting ? this.meeting.id : null;
                    if (this.competition && this.season) {
                        for (var eventId in this.competition.events) {
                            var event = this.competition.events[eventId];
                            for (var p = 0; p < event.phases.length; p++) {
                                var phase = event.phases[p];
                                if (phase.meeting == meetingId) {
                                    events.push(event);
                                    break;
                                }
                            }
                        }
                    }
                    return events;
                }
            }
        });

        return CompetitionComponent
    });
