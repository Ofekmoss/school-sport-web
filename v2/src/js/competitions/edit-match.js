define(["templates/competitions", "services/competitions", "utils", "components/edit-select"], function (templates, Competitions, utils) {

    var Functionaries = null;

    function setTimeObject(timeObject) {
        if (timeObject.date) {
            if (timeObject.hours == null) {
                timeObject.time = timeObject.date.getFullYear() * 10000 + (timeObject.date.getMonth() + 1) * 100 + timeObject.date.getDate();
            }
            else {
                var d = new Date(timeObject.date);
                d.setHours(timeObject.hours, timeObject.minutes, 0, 0);
                timeObject.time = Math.floor(d.getTime() / 1000);
            }
        }
        else {
            timeObject.time = null;
        }
    }

    function setMatchTime(match, time) {
        if (time != null) {
            var dateTime = utils.parseCompetitionTime(time);
            if (dateTime) {
                match.date = new Date(dateTime);
                match.date.setHours(0, 0, 0, 0);
                if (time > 100000000) {
                    match.hours = dateTime.getHours();
                    match.minutes = dateTime.getMinutes();
                    match.timeText = match.hours + ":" + ("0" + match.minutes).slice(-2);
                }
                else {
                    match.hours = null;
                    match.minutes = null;
                    match.timeText = "";
                }
            }
        }
        else {
            match.time = null;
            match.date = null;
            match.hours = null;
            match.minutes = null;
            match.timeText  = "";
        }
    }

    function parseTime(timeText) {
        var timeParts = [];
        if (timeText && timeText.length > 0) {
            timeParts = timeText.split(':');
        }
        else {
            return {hours: null, minutes: null};
        }
        if (timeParts.length === 2) {
            if (timeParts[0].length > 0 && timeParts[0].length < 3 &&
                timeParts[1].length === 2) {
                var h = parseInt(timeParts[0]);
                var m = parseInt(timeParts[1]);
                if (h != null && h >= 0 && h < 24 &&
                    m != null && m >= 0 && m < 60) {
                    return {hours: h, minutes: m};
                }
            }
        }
        return null;
    }

    var EditMatchDialogComponent = Vue.extend({
        template: templates["edit-match"],
        data: function () {
            return {
                group: null,
                region: null,
                sweeping: false,
                selectedMatch: null,
                matches: [],
                teams: [],
                winners: [],
                losers: [],
                matchesEdit: [],
                venueRegion: null,
                functionarySearch: null,
                // For sweeping set
                generalVenue: null,
                generalTime: {
                    date: null,
                    timeText: null,
                    timeInvalid: false,
                    hours: null,
                    minutes: null,
                    diffText: null,
                    diffInvalid: null
                },
                regions: [],
                regionFacilities: {},
                teamFacilities: {},
                facilities: []
            };
        },
        mounted: function() {
            var comp = this;
            var teamIds = [];
            for (var t = 0; t < this.group.teams.length; t++) {
                var groupTeam = this.group.teams[t];
                var team = groupTeam.getTeam();
                if (team.id) {
                    teamIds.push(team.id);
                }
                this.updateTeamFacilities(team.id);
                this.teams.push({
                    placement: t,
                    id: team.id,
                    name: team ? team.name : "?",
                    school: null,
                    region: null,
                    city: null
                });
            }

            var matchReferences = {};
            for (var m = 0; m < this.group.matches.length; m++) {
                var match = this.group.matches[m];
                var winner = null;
                var loser = null;
                if (match.outcome === 1 || match.outcome === 3) {
                    if (match.opponentA != null) {
                        winner = this.group.teams[match.opponentA];
                    }
                    if (match.opponentB != null) {
                        loser = this.group.teams[match.opponentB];
                    }
                }
                else if (match.outcome === 2 || match.outcome === 4) {
                    if (match.opponentB != null) {
                        winner = this.group.teams[match.opponentB];
                    }
                    if (match.opponentA != null) {
                        loser = this.group.teams[match.opponentA];
                    }
                }
                var winnerTeam = winner ? winner.getTeam() : null;
                var mr = {
                    reference: "W" + match.id,
                    id: winnerTeam ? winnerTeam.id : null,
                    name: "משחק " + (match.number + 1) + (winnerTeam ? " - " + winnerTeam.name : "")
                };
                matchReferences[mr.reference] = mr;
                this.winners.push(mr);

                var loserTeam = loser ? loser.getTeam() : null;
                var mr = {
                    reference: "L" + match.id,
                    id: loserTeam ? loserTeam.id : null,
                    name: "משחק " + (match.number + 1) + (loserTeam ? " - " + loserTeam.name : "")
                };
                matchReferences[mr.reference] = mr;
                this.losers.push(mr);
            }

            this.teams.push({
                placement: -1,
                name: "מנצחת משחק"
            });
            this.teams.push({
                placement: -2,
                name: "מפסידת משחק"
            });

            // Reading selected venues
            var venues = {};
            var generalTime = null;
            var lastTime = null;
            var diff = null;
            for (var n = 0; n < this.matches.length; n++) {
                var match = this.matches[n];
                if (match.venue != null) {
                    venues[match.venue] = true;
                }

                if (generalTime !== false) {
                    if (match.time == null) {
                        // Match time not set - can't set general time
                        generalTime = false;
                    }
                    else if (generalTime == null) {
                        generalTime = match.time;
                    }
                    else if (match.time < 100000000 || lastTime < 100000000) {
                        // Match is set to date - checking
                        if (generalTime !== match.time) {
                            generalTime = false;
                        }
                    }
                    else if (match.time >= lastTime) {
                        if (diff == null) {
                            diff = match.time - lastTime;
                        }
                        else if (diff !== match.time - lastTime) {
                            generalTime = false;
                        }
                    }
                    else {
                        generalTime = false;
                    }
                    lastTime = match.time;
                }
            }

            if (generalTime) {
                this.generalTime.date = utils.parseCompetitionTime(generalTime);
                if (generalTime > 100000000) {
                    this.generalTime.hours = this.generalTime.date.getHours();
                    this.generalTime.minutes = this.generalTime.date.getMinutes();
                    this.generalTime.timeText = ("0" + this.generalTime.hours).slice(-2) + ":" + ("0" + this.generalTime.minutes).slice(-2);
                    if (diff) {
                        if (diff > 86400) {
                            diff = Math.floor(diff / 1000);
                        }
                        this.generalTime.diffText = Math.floor(diff / 60);
                    }
                }
            }

            var functionariesDef = this.group.phase.event.competition.rules.Functionaries;

            var pendingCalls = 0;

            function completeSetup() {
                if (pendingCalls > 0) {
                    pendingCalls--;
                    return;
                }

                for (var n = 0; n < comp.matches.length; n++) {
                    var match = comp.matches[n];
                    var matchEdit = {
                        match: match,
                        venue: match.venue != null ? (venues[match.venue] || null) : null
                    };
                    setMatchTime(matchEdit, match.time);
                    if (match.matchReferenceA != null) {
                        if (match.matchReferenceA[0] === "L") {
                            matchEdit.opponentA = comp.teams[comp.teams.length - 1];
                            matchEdit.matchLoserA = matchReferences[match.matchReferenceA];
                        } else {
                            matchEdit.opponentA = comp.teams[comp.teams.length - 2];
                            matchEdit.matchWinnerA = matchReferences[match.matchReferenceA];
                        }
                    } else {
                        matchEdit.opponentA = comp.teams[match.opponentA];
                    }
                    if (match.matchReferenceB != null) {
                        if (match.matchReferenceB[0] === "L") {
                            matchEdit.opponentB = comp.teams[comp.teams.length - 1];
                            matchEdit.matchLoserB = matchReferences[match.matchReferenceB];
                        } else {
                            matchEdit.opponentB = comp.teams[comp.teams.length - 2];
                            matchEdit.matchWinnerB = matchReferences[match.matchReferenceB];
                        }
                    } else {
                        matchEdit.opponentB = comp.teams[match.opponentB];
                    }
                    matchEdit.functionaries = [];
                    if (functionariesDef) {
                        for (var f = 0; f < functionariesDef.length; f++) {
                            var fd = functionariesDef[f];
                            var func = null;
                            if (match.functionaries) {
                                var id = match.functionaries[fd.type];
                                func = Functionaries[id] || null;
                            }
                            var functionary = {
                                type: fd.type,
                                typeName: fd.description,
                                functionary: func
                            };
                            matchEdit.functionaries.push(functionary);
                        }
                    }
                    comp.matchesEdit.push(matchEdit);
                }

                if (comp.matchesEdit.length > 1) {
                    comp.showSweeping();
                }
                else {
                    comp.showDetails();
                }
            }

            pendingCalls++;
            Vue.http.get('/api/v2/regions').then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    var region = resp.body[i];
                    comp.regions.push(region);
                    if (region.id == comp.region) {
                        comp.venueRegion = region;
                    }
                }

                completeSetup();
            });

            if (Functionaries == null) {
                pendingCalls++;
                Vue.http.get('/api/v2/functionaries?full=1')
                    .then(function (resp) {
                        Functionaries = {};
                        for (var n = 0; n < resp.body.length; n++) {
                            var functionary = resp.body[n];
                            Functionaries[functionary.id] = functionary;
                        }
                        completeSetup();
                    });
            }

            if (teamIds.length > 0) {
                pendingCalls++;
                Vue.http.get('/api/v2/competitions/ext/teams?' +
                    teamIds.map(function (id) { return "id=" + encodeURIComponent(id); }).join("&"))
                    .then(function (resp) {
                        for (var n = 0; n < resp.body.length; n++) {
                            var teamInfo = resp.body[n];

                            for (var t = 0; t < comp.teams.length; t++) {
                                var team = comp.teams[t];
                                if (team.id == teamInfo.id) {
                                    team.region = teamInfo.region;
                                    team.school = teamInfo.school;
                                    team.city = teamInfo.city;
                                }
                            }
                        }

                        completeSetup();
                    });
            }

            var venueIds = Object.keys(venues);
            if (venueIds.length > 0) {
                pendingCalls++;
                Vue.http.get('/api/v2/facilities?' + venueIds.map(function (id) { return "id=" + id; }).join("&"))
                    .then(function (resp) {
                        var result = Array.isArray(resp.body) ? resp.body : [resp.body];
                        for (var i = 0; i < result.length; i++) {
                            var venue = result[i];
                            venues[venue.id] = venue;
                        }
                        completeSetup();
                    });
            }

            completeSetup();
        },
        methods: {
            showSweeping: function () {
                this.sweeping = true;
            },
            showDetails: function () {
                this.sweeping = false;
                if (!this.selectedMatch) {
                    this.selectedMatch = this.matchesEdit[0];
                }
            },
            getOpponentName: function (opponent, winner, loser) {
                var name = opponent.name;
                if (opponent.placement === -1 && winner) {
                    name += "<br/>" + winner.name;
                }
                else if (opponent.placement === -2 && loser) {
                    name += "<br/>" + loser.name;
                }
                return name;
            },
            getOpponentTeamId: function (opponent, winner, loser) {
                var id = opponent.id;
                if (opponent.placement === -1 && winner) {
                    id = winner.id;
                }
                else if (opponent.placement === -2 && loser) {
                    id = loser.id;
                }
                return id;
            },
            switchOpponents: function (match) {
                var opponentA = match.opponentA;
                var matchWinnerA = match.matchWinnerA;
                var matchLoserA = match.matchLoserA;
                match.opponentA = match.opponentB;
                match.matchWinnerA = match.matchWinnerB;
                match.matchLoserA = match.matchLoserB;
                match.opponentB = opponentA;
                match.matchWinnerB = matchWinnerA;
                match.matchLoserB = matchLoserA;
            },
            updateTeamFacilities: function (teamId) {
                var facilities = this.teamFacilities[teamId];
                if (!facilities) {
                    this.teamFacilities[teamId] = {};
                    var url = '/api/v2/facilities?team=' + teamId;
                    Vue.http.get(url).then((function (comp) {
                        return function (resp) {
                            var facilities = comp.teamFacilities[teamId];
                            for (var i = 0; i < resp.body.length; i++) {
                                var facility = resp.body[i];
                                facilities[facility.id] = true;
                            }
                        };
                    })(this));
                }
            },
            updateFacilities: function () {
                if (this.venueRegion) {
                    var facilities = this.regionFacilities[this.venueRegion.id];
                    if (!facilities) {
                        this.regionFacilities[this.venueRegion.id] = facilities = [];
                        var url = '/api/v2/facilities?region=' + this.venueRegion.id;
                        Vue.http.get(url).then((function (comp, region) {
                            return function (resp) {
                                var facilities = comp.regionFacilities[region];
                                for (var i = 0; i < resp.body.length; i++) {
                                    if (resp.body[i].name) {
                                        facilities.push(resp.body[i]);
                                    }
                                }
                            };
                        })(this, this.venueRegion.id));
                    }

                    this.facilities = facilities;
                }
                else {
                    this.facilities = [];
                }
            },
            updateVenue: function () {
                if (this.sweeping) {
                    // Update all matches venue from general
                    if (this.generalVenue) {
                        for (var n = 0; n < this.matchesEdit.length; n++) {
                            this.matchesEdit[n].venue = this.generalVenue;
                        }
                    }
                }
                else {
                    // Update general venue if all matches venues are the same
                    var venue = this.matchesEdit[0].venue;
                    if (venue != null) {
                        for (var n = 1; n < this.matchesEdit.length; n++) {
                            var matchEdit = this.matchesEdit[n];
                            if (matchEdit.venue == null || matchEdit.venue.id !== venue.id) {
                                venue = null;
                                break;
                            }
                        }
                    }
                    this.generalVenue = venue;
                }
            },
            onVenueSearch: function (term, options, id) {
                if (this.venueRegion && term) {
                    term = term.trim().toLowerCase();
                    var facilities = this.regionFacilities[this.venueRegion.id];
                    if (facilities && term !== "") {
                        options.splice(0, options.length);
                        for (var n = 0; n < facilities.length; n++) {
                            var facility = facilities[n];
                            if (facility.name.toLowerCase().indexOf(term) >= 0) {
                                options.push(facility);
                            }
                        }
                    }
                }
            },
            generateMatchesTime: function () {
                if (this.generalTime.date != null && !this.generalTime.diffInvalid && !this.generalTime.timeInvalid) {
                    setTimeObject(this.generalTime);
                    if (this.generalTime.time == null) {
                        return;
                    }

                    if (this.generalTime.diffHours != null) {
                        var diff = this.generalTime.diffHours * 60 + this.generalTime.diffMinutes;
                        var dateTime = utils.parseCompetitionTime(this.generalTime.time);
                        for (var n = 0; n < this.matchesEdit.length; n++) {
                            setMatchTime(this.matchesEdit[n], Math.floor(dateTime.getTime() / 1000));
                            dateTime.setMinutes(dateTime.getMinutes() + diff);
                        }
                    }
                    else {
                        for (var n = 0; n < this.matchesEdit.length; n++) {
                            setMatchTime(this.matchesEdit[n], this.generalTime.time);
                        }
                    }
                }
            },
            onGeneralDateInput: function () {
                this.generateMatchesTime();
            },
            onTimeDiffInput: function () {
                var time = null;
                if (this.generalTime.diffText.indexOf(':') >= 0) {
                    time = parseTime(this.generalTime.diffText);
                }
                else if (this.generalTime.diffText.length > 0) {
                    var minutes = parseInt(this.generalTime.diffText);
                    if (isFinite(minutes) && minutes >= 0) {
                        time = {
                            hours: Math.floor(minutes/60),
                            minutes: minutes % 60
                        };
                    }
                }
                else {
                    time = {hours: 0, minutes: 0};
                }
                if (time != null) {
                    this.generalTime.diffHours = time.hours;
                    this.generalTime.diffMinutes = time.minutes;
                    Vue.delete(this.generalTime, "diffInvalid");
                    this.generateMatchesTime();
                }
                else {
                    Vue.set(this.generalTime, "diffInvalid", true);
                }
            },
            onTimeInput: function () {
                var timeObject = this.sweeping ? this.generalTime : this.selectedMatch;
                var time = parseTime(timeObject.timeText);
                if (time != null) {
                    timeObject.hours = time.hours;
                    timeObject.minutes = time.minutes;
                    setTimeObject(timeObject);
                    Vue.delete(timeObject, "timeInvalid");
                    if (this.sweeping) {
                        this.generateMatchesTime();
                    }
                }
                else {
                    Vue.set(timeObject, "time", null);
                    Vue.set(timeObject, "timeInvalid", true);
                }
            },
            getMatchFacilityTeam: function (match, facility) {
                if (match.facilities == null) {
                    match.facilities = {};
                    var teamId = this.getOpponentTeamId(match.opponentB, match.matchWinnerB, match.matchLoserB);
                    if (teamId != null) {
                        var f = this.teamFacilities[teamId];
                        if (f) {
                            for (var id in f) {
                                match.facilities[id] = 1;
                            }
                        }
                    }
                    teamId = this.getOpponentTeamId(match.opponentA, match.matchWinnerA, match.matchLoserA);
                    if (teamId != null) {
                        var f = this.teamFacilities[teamId];
                        if (f) {
                            for (var id in f) {
                                match.facilities[id] = 2;
                            }
                        }
                    }
                }

                return match.facilities[facility.id] || 0;
            },
            getFacilityTeam: function (facility) {
                if (this.sweeping) {
                    var team = 0;
                    for (var n = 0; n < this.matchesEdit.length; n++) {
                        var match = this.matchesEdit[n];
                        var t = this.getMatchFacilityTeam(match, facility);
                        if (t > 0) {
                            team = t;
                            if (team === 1) {
                                break;
                            }
                        }
                    }
                    return team;
                }
                else if (this.selectedMatch) {
                    return this.getMatchFacilityTeam(this.selectedMatch, facility);
                }
                return 0;

            },
            getFacilityDisplay: function (facility, name) {
                if (facility.id == null) {
                    return "<i class='muted'>" + facility.name + "</i>";
                }
                else if (this.getFacilityTeam(facility)) {
                    return "<strong>" + facility.name + "</strong>";
                }
                return name;
            },
            onFunctionarySearch: function (term, options, id) {
                this.functionarySearch = term ? term.trim().toLowerCase() : "";
            },
            getFunctionaryDisplay: function (functionary, name) {
                var muted = null;
                if (functionary.school) {
                    muted = functionary.school.name;
                }
                else if (functionary.city) {
                    muted = functionary.city.name;
                }
                if (muted) {
                    return "<span>" + name + " <i class='muted'>" + muted + "</i></span>";
                }
                else {
                    return "<span>" + name + "</span>";
                }
            },
            getTeamAInfo: function (match) {
                var teamId = null;
                if (match.matchWinnerA) {
                    teamId = match.matchWinnerA.id;
                }
                else if (match.matchLoserA) {
                    teamId = match.matchLoserA.id;
                }
                else {
                    return match.opponentA;
                }
                if (teamId) {
                    for (var n = 0; n < this.teams.length; n++) {
                        var team = this.teams[n];
                        if (team.id == teamId) {
                            return team;
                        }
                    }
                }
                return null;
            },
            getTeamBInfo: function (match) {
                var teamId = null;
                if (match.matchWinnerB) {
                    teamId = match.matchWinnerB.id;
                }
                else if (match.matchLoserB) {
                    teamId = match.matchLoserB.id;
                }
                else {
                    return match.opponentB;
                }
                if (teamId) {
                    for (var n = 0; n < this.teams.length; n++) {
                        var team = this.teams[n];
                        if (team.id == teamId) {
                            return team;
                        }
                    }
                }
                return null;
            },
            getFunctionaries: function (type) {
                var functionaries = [];

                if (this.selectedMatch) {
                    var teamA = this.getTeamAInfo(this.selectedMatch) || {};
                    var teamB = this.getTeamBInfo(this.selectedMatch) || {};
                    for (var key in Functionaries) {
                        var f = Functionaries[key];
                        if (f.type != type) {
                            continue;
                        }
                        if (this.functionarySearch && this.functionarySearch.length > 0) {
                            if (f.name.toLowerCase().indexOf(this.functionarySearch) < 0) {
                                continue;
                            }
                        }
                        if (f.region && ((teamA.region && teamA.region.id == f.region.id) || (teamB.region && teamB.region.id == f.region.id))) {
                            functionaries.push(f);
                        }
                    }

                    function getFunctionaryOrder(f) {
                        if (f.school) {
                            if (teamA.school && teamA.school.id == f.school.id) {
                                return 0;
                            }
                            if (teamB.school && teamB.school.id == f.school.id) {
                                return 1;
                            }
                        }
                        if (f.city) {
                            if (teamA.city && teamA.city.id == f.city.id) {
                                return 2;
                            }
                            if (teamB.city && teamB.city.id == f.city.id) {
                                return 3;
                            }
                        }
                        return 4;
                    }

                    functionaries.sort(function (a, b) {
                        var d = getFunctionaryOrder(a) - getFunctionaryOrder(b);
                        if (d === 0) {
                            d = a.name.localeCompare(b.name);
                        }
                        return d;
                    });
                }

                return functionaries;
            },
            getTeams: function (opponent) {
                if (opponent == null) {
                    return this.teams;
                }
                var teams = [];
                for (var n = 0; n < this.teams.length; n++) {
                    var t = this.teams[n];
                    if (t.placement < 0 || t !== opponent) {
                        teams.push(t);
                    }
                }
                return teams;
            },
            getWinners: function (opponent) {
                if (opponent == null) {
                    return this.winners;
                }
                var teams = [];
                for (var n = 0; n < this.winners.length; n++) {
                    var t = this.winners[n];
                    if (t !== opponent) {
                        teams.push(t);
                    }
                }
                return teams;
            },
            getLosers: function (opponent) {
                if (opponent == null) {
                    return this.losers;
                }
                var teams = [];
                for (var n = 0; n < this.losers.length; n++) {
                    var t = this.losers[n];
                    if (t !== opponent) {
                        teams.push(t);
                    }
                }
                return teams;
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                if (this.hasInvalidTime) {
                    return;
                }
                
                var updates = [];

                for (var mi = 0; mi < this.matchesEdit.length; mi++) {
                    var matchEdit = this.matchesEdit[mi];
                    var update = null;
                    var opponentA = null;
                    var matchReferenceA = null;
                    if (matchEdit.opponentA.placement === -2) {
                        matchReferenceA = matchEdit.matchLoserA.reference;
                    }
                    else if (matchEdit.opponentA.placement === -1) {
                        matchReferenceA = matchEdit.matchWinnerA.reference;
                    }
                    else {
                        opponentA = matchEdit.opponentA.placement;
                    }
                    if (matchReferenceA) {
                        if (matchReferenceA !== matchEdit.match.matchReferenceA) {
                            update = {
                                match: matchEdit.match.id,
                                matchReferenceA: matchReferenceA
                            };
                        }
                    }
                    else if (opponentA !== matchEdit.match.opponentA) {
                        update = {
                            match: matchEdit.match.id,
                            opponentA: opponentA,
                            matchReferenceA: null
                        };
                    }
                    var opponentB = null;
                    var matchReferenceB = null;
                    if (matchEdit.opponentB.placement === -2) {
                        matchReferenceB = matchEdit.matchLoserB.reference;
                    }
                    else if (matchEdit.opponentB.placement === -1) {
                        matchReferenceB = matchEdit.matchWinnerB.reference;
                    }
                    else {
                        opponentB = matchEdit.opponentB.placement;
                    }
                    if (matchReferenceB) {
                        if (matchReferenceB !== matchEdit.match.matchReferenceB) {
                            if (!update) {
                                update = {match: matchEdit.match.id};
                            }
                            update.matchReferenceB = matchReferenceB;
                        }
                    }
                    else if (opponentB !== matchEdit.match.opponentB) {
                        if (!update) {
                            update = {match: matchEdit.match.id};
                        }
                        update.opponentB = opponentB;
                        update.matchReferenceB = null;
                    }
                    var venue = matchEdit.venue ? matchEdit.venue.id : null;
                    if (venue !== matchEdit.match.venue || null) {
                        if (!update) {
                            update = {match: matchEdit.match.id};
                        }
                        update.venue = venue;
                    }
                    setTimeObject(matchEdit);
                    if (matchEdit.time !== matchEdit.match.time) {
                        if (!update) {
                            update = {match: matchEdit.match.id};
                        }
                        update.time = matchEdit.time;
                    }
                    var functionaries = {};
                    var functionariesChanged = false;
                    for (var n = 0; n < matchEdit.functionaries.length; n++) {
                        var f = matchEdit.functionaries[n];
                        if (f.functionary) {
                            if (!matchEdit.match.functionaries || matchEdit.match.functionaries[f.type] !== f.functionary.id) {
                                functionaries[f.type] = f.functionary.id;
                                functionariesChanged = true;
                            }
                        }
                        else if (matchEdit.match.functionaries && matchEdit.match.functionaries[f.type]) {
                            functionaries[f.type] = null;
                            functionariesChanged = true;
                        }
                    }
                    if (functionariesChanged) {
                        if (!update) {
                            update = {match: matchEdit.match.id};
                        }
                        update.functionaries = functionaries;
                    }
                    if (update) {
                        updates.push(update);
                    }
                }
                this.$emit("close", updates);
            }
        },
        computed: {
            sortedFacilities: function () {
                var comp = this;
                var facilities = this.facilities.slice();
                facilities.sort(function (a, b) {
                    var d = comp.getFacilityTeam(b) - comp.getFacilityTeam(a);
                    if (!d) {
                        d = a.name.localeCompare(b.name);
                    }
                    return d;
                });
                facilities.splice(0, 0, {id: null, name: "ללא"});
                return facilities;
            },
            hasInvalidTime: function () {
                for (var n = 0; n < this.matchesEdit.length; n++) {
                    if (this.matchesEdit[n].timeInvalid) {
                        return true;
                    }
                }
                return false;
            }
        },
        watch: {
            venueRegion: function () {
                this.updateFacilities();
            }
        }
    });

    return EditMatchDialogComponent;
});