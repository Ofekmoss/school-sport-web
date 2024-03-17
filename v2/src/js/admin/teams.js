define(["templates/admin", "utils", "dialog", "consts", "services/access",
        "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, consts, Access) {

        function readChampionships(comp, callback) {
            comp.championships.splice(0, comp.championships.length);

            Vue.http.get('/api/v2/admin/championships?season=' + comp.season)
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.length; i++) {
                            comp.championships.push(resp.body[i]);
                        }
                        // TODO - work around to prevent change in server
                        Vue.http.get('/api/v2/admin/championships?clubs=1&season=' + comp.season)
                            .then(
                                function (resp) {
                                    for (var i = 0; i < resp.body.length; i++) {
                                        var curChamp = resp.body[i];
                                        var existingIndex = comp.championships.findIndex(function (c) {
                                            return c.id === curChamp.id;
                                        });
                                        if (existingIndex < 0) {
                                            comp.championships.push(curChamp);
                                        }
                                    }
                                    Vue.http.get('/api/v2/admin/championships?league=1&season=' + comp.season)
                                        .then(
                                            function (resp) {
                                                for (var i = 0; i < resp.body.length; i++) {
                                                    var curChamp = resp.body[i];
                                                    var existingIndex = comp.championships.findIndex(function (c) {
                                                        return c.id === curChamp.id;
                                                    });
                                                    if (existingIndex < 0) {
                                                        comp.championships.push(curChamp);
                                                    }
                                                }
                                                callback();
                                            },
                                            function (err) {
                                                callback(err);
                                            }
                                        );
                                },
                                function (err) {
                                    callback(err);
                                }
                            );
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }

        function readSeasons(comp, callback) {
            comp.seasons.splice(0, comp.seasons.length);
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    comp.seasons.push(resp.body[i]);
                }
                Vue.http.get('/api/v2/cache?key=season').then(function (resp) {
                    var cachedSeason = resp.body.Value;
                    if (cachedSeason != null) {
                        comp.season = cachedSeason;
                        callback();
                    } else {
                        Vue.http.get('/api/v2/season').then(function (resp) {
                            var curSeason = resp.body.season;
                            if (curSeason) {
                                comp.season = curSeason;
                            }
                            callback();
                        }, function (err) {
                            callback(err);
                        });
                    }
                }, function (err) {
                    callback(err);
                });
            }, function (err) {
                callback(err);
            });
        }

        function readRegions(comp, callback) {
            comp.regions.splice(0, comp.regions.length);
            Vue.http.get('/api/v2/regions')
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.length; i++) {
                            comp.regions.push(resp.body[i]);
                        }
                        comp.updateCaption();
                        callback();
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }

        function readCompetitions(comp, callback) {
            comp.sports.splice(0, comp.sports.length);
            var url = '/api/v2/admin/competitions?season=' + comp.season;
            if (comp.region != null) {
                url += '&region=' + comp.region;
            }
            Vue.http.get(url)
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.sports.length; i++) {
                            comp.sports.push(resp.body.sports[i]);
                        }
                        comp.updateCaption();
                        callback();
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }

        function getById(list, id) {
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item.id === id) {
                    return item;
                }
            }
            return null;
        }

        function readTeams(comp) {
            var query = [];
            if (comp.season) {
                query.push("season=" + comp.season);
            }
            if (comp.championship) {
                query.push("championship=" + comp.championship);
            }
            else {
                if (comp.competitionType) {
                    if (parseInt(comp.competitionType) === 1) {
                        query.push("clubs=1");
                    }
                    else {
                        query.push("league=1");
                    }
                }
                if (comp.region != null) {
                    query.push("region=" + comp.region);
                }
                if (comp.sport) {
                    query.push("sport=" + comp.sport);
                }
            }
            comp.teams.splice(0, comp.teams.length);
            Vue.http.get('/api/v2/admin/teams' + (query.length > 0 ? '?' + query.join('&') : ""))
                .then(
                    function (resp) {
                        // console.log(resp.body);
                        comp.teams = [];
                        for (var i = 0; i < resp.body.length; i++) {
                            var team = resp.body[i];
                            team.sport = getById(comp.sports, team.sport);
                            if (team.sport) {
                                team.category = getById(team.sport.categories, team.competition);
                            }
                            if (team.category && team.school.region) {
                                team.school.region = consts.coordinators[team.school.region].areaName;
                            }
                            if (team.activity) {
                                team.activity = utils.getActivityText(team.activity);
                            }

                            if (team.teamStatus == 2 && team.approved == 15) {
                                team.green = true;
                            }

                            if (team.tokens && team.tokens.principal) {
                                team.principalLoginLink = 'https://www.schoolsport.org.il/v2/#/login?token=' + team.tokens.principal;
                            }

                            if (team.tokens && team.tokens.representative) {
                                team.representativeLoginLink = 'https://www.schoolsport.org.il/v2/#/login?token=' + team.tokens.representative;
                            }

                            comp.teams.push(team);
                        }

                        comp.teams.sort(function(a, b){
                            return new Date(b.createdAt) - new Date(a.createdAt);
                        });
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        }

        function setup(comp) {
            readSeasons(comp, function() {
                readRegions(comp, function () {
                    readChampionships(comp, function () {
                        readCompetitions(comp, function () {
                            readTeams(comp);
                        });
                    });
                });
            });
        }


        var TeamsComponent = Vue.extend({
            template: templates["teams"],
            props: {
                sport: {},
                region: {}
            },
            data: function () {
                return {
                    tabName: "קבוצות",
                    caption: "קבוצות",
                    image: 'img/icon-teams.svg',
                    competitionType: 1,
                    teams: [],
                    user: null,
                    columns: [
                        {
                            key: 'id',
                            name: 'זיהוי',
                            active: true
                        },
                        {
                            key: 'school.name',
                            name: 'בית ספר',
                            active: true
                        }
                        ,{
                            key: 'teamNumber',
                            name: 'קבוצה',
                            active: true
                        }
                        ,{
                            key: 'school.regionName',
                            name: 'מחוז',
                            active: true
                        }
                        ,{
                            key: 'school.symbol',
                            name: 'סימול בית ספר',
                            active: true
                        }
                        ,{
                            key: 'coach.name',
                            name: 'מאמן',
                            active: true
                        },{
                            key: 'coach.email',
                            name: 'אימייל מאמן',
                            active: false
                        },{
                            key: 'coach.phoneNumber',
                            name: 'טלפון מאמן',
                            active: true
                        },{
                            key: 'coach.certification',
                            name: 'המאמן עבר השתלמות',
                            lookup: {
                                "0": "לא",
                                "1": "כן"
                            },
                            active: false
                        },{
                            key: 'facility.name',
                            name: 'מתקן',
                            active: true
                        },{
                            key: 'facility.address',
                            name: 'כתובת מתקן',
                            active: false
                        },{
                            key: 'alternativeFacility.name',
                            name: 'מתקן חלופי',
                            active: false
                        },{
                            key: 'alternativeFacility.address',
                            name: 'כתובת מתקן חלופי',
                            active: false
                        },{
                            key: 'school.principal',
                            name: 'מנהל/ת',
                            active: false
                        },{
                            key: 'teacher.name',
                            name: 'מורה אחראי',
                            active: false
                        },{
                            key: 'teacher.phoneNumber',
                            name: 'טלפון מורה אחראי',
                            active: false
                        },{
                            key: 'teacher.email',
                            name: 'מייל מורה אחראי',
                            active: false
                        },{
                            key: 'activity',
                            name: 'יום ושעת משחק',
                            active: true
                        }
                        , {
                            key: 'sport.name',
                            name: 'ענף ספורט',
                            active: true
                        }, {
                            key: 'category.name',
                            name: 'קטגוריה',
                            active: true
                        }, {
                            key: "order",
                            name: 'דרישת תשלום',
                            type: 'documentNumber',
                            active: true
                        },
                        {
                            name: 'סטטוס',
                            key: 'teamStatus',
                            active: true,
                            type: '',
                            lookup: {
                                "1": "רשומה",
                                "2": "מאושרת"
                            }
                        },
                        {
                            key: "approved",
                            name: 'אישור נציג',
                            type: 'teamApproved',
                            extras: { approved: 4 },
                            active: true
                        },
                        {
                            key: "representativeLoginLink",
                            name: 'לינק התחברות נציג',
                            type: 'link',
                            active: true
                        },
                        {
                            key: "approved",
                            name: 'אישור מנהל',
                            type: 'teamApproved',
                            extras: { approved: 2 },
                            active: true
                        },
                        {
                            key: "principalLoginLink",
                            name: 'לינק התחברות מנהל',
                            type: 'link',
                            active: true
                        },
                        {
                            key: "approved",
                            name: 'אישור מפקח',
                            type: 'teamApproved',
                            extras: { approved: 8, notApproved: 16 },
                            active: true
                        },
                        {
                            key: 'principal.name',
                            name: 'מנהל',
                            active: false
                        },{
                            key: 'principal.email',
                            name: 'אימייל מנהל',
                            active: false
                        },{
                            key: 'principal.phoneNumber',
                            name: 'טלפון מנהל',
                            active: false
                        },
                        {
                            key: 'chairman.name',
                            name: 'יו"ר',
                            active: false
                        },{
                            key: 'chairman.email',
                            name: 'אימייל יו"ר',
                            active: false
                        },{
                            key: 'chairman.phoneNumber',
                            name: 'טלפון יו"ר',
                            active: false
                        },
                        {
                            key: 'coordinator.name',
                            name: 'רכז',
                            active: false
                        },{
                            key: 'coordinator.email',
                            name: 'אימייל רכז',
                            active: false
                        },{
                            key: 'coordinator.phoneNumber',
                            name: 'טלפון רכז',
                            active: false
                        },
                        {
                            key: 'representative.name',
                            name: 'נציג',
                            active: false
                        },{
                            key: 'representative.email',
                            name: 'אימייל נציג',
                            active: false
                        },{
                            key: 'representative.phoneNumber',
                            name: 'טלפון נציג',
                            active: false
                        },{
                            key: 'createdAt',
                            name: 'תאריך הוספה',
                            active: false,
                            type: 'date'
                        }
                    ],
                    championships: [],
                    competitions: [],
                    sports: [],
                    regions: [],
                    seasons: [],
                    season: null,
                    championship: null,
                    searchText: "",
                    isSelectAll: false,
                    statuses: [{id: 1, name: 'אושר'}, {id: 2, name: 'לא אושר'}, {id: 3, name: 'ממתין לאישור'}],
                    selectedStatus: null,
                    selectedTeams: [],
                    approveButtonDisabled: true,
                    approveButtonTitle: 'יש לבחור לפחות קבוצה אחת',
                    notAllConfirmations: false
                };
            },
            mounted: function () {
                var comp = this;
                Access.get(function (err, user) {
                    comp.user = user;
                    setup(comp);
                });
            },
            computed: {
                filteredChampionships: function () {
                    var result = [];
                    for (var i = 0; i < this.championships.length; i++) {
                        var championship = this.championships[i];
                        if (this.competitionType) {
                            if (this.competitionType == 1) {
                                if (!championship.clubs) {
                                    continue;
                                }
                            }
                            else if (this.competitionType == 2) {
                                if (!championship.league) {
                                    continue;
                                }
                            }
                        }
                        if (this.region != null && this.region !== "") {
                            if (championship.region.id !== this.region) {
                                continue;
                            }
                        }

                        if (this.sport != null && this.sport !== "") {
                            if (championship.sport.id !== this.sport) {
                                continue;
                            }
                        }
                        result.push(championship);
                    }
                    return result;
                }
            },
            watch: {
                competitionType: function () {
                    readTeams(this);
                },
                championship: function () {
                    readTeams(this);
                },
                sport: function () {
                    this.updateCaption();
                    readTeams(this);
                },
                region: function () {
                    var comp = this;
                    this.updateCaption();
                    readCompetitions(comp, function () {
                        readTeams(comp);
                    });
                },
                season: function () {
                    var comp = this;
                    readChampionships(comp, function () {
                        readCompetitions(comp, function () {
                            readTeams(comp);
                        });
                    });
                }
            },
            methods: {
                getTeamValue: function(team, colIndex) {
                    if (typeof team === 'number')
                        team = this.teams[team];
                    return this.$refs.teamsTable.getValue(team, this.columns[colIndex]);
                },
                updateCaption: function () {
                    var caption = "קבוצות";
                    if (this.region != null && this.regions) {
                        for (var n = 0; n < this.regions.length; n++) {
                            var region = this.regions[n];
                            if (region.id == this.region) {
                                caption += " - " + region.name;
                                break;
                            }
                        }
                    }
                    if (this.sport != null && this.sports) {
                        for (var n = 0; n < this.sports.length; n++) {
                            var sport = this.sports[n];
                            if (sport.id == this.sport) {
                                caption += " - " + sport.name;
                                break;
                            }
                        }
                    }
                    this.caption = caption;
                },
                handleSelectionChange: function () {
                    // console.log(this.$refs.teamsTable.getValue(this.teams[2], this.columns[20]));
                    this.selectedTeams.splice(0, this.selectedTeams.length);
                    this.selectedStatus = null;
                    for (var i = 0; i < this.teams.length; i++) {
                        var team = this.teams[i];
                        if (team.selected) {
                            if (this.selectedTeams.length === 0) {
                                this.selectedStatus = team.teamStatus;
                            }
                            else if (this.selectedStatus != team.teamStatus) {
                                this.selectedStatus = null;
                            }
                            this.selectedTeams.push(team);
                        }
                    }
                    this.notAllConfirmations = false;
                    if (this.selectedTeams.length === 0) {
                        this.approveButtonDisabled = true;
                        this.approveButtonTitle = 'יש לבחור לפחות קבוצה אחת';
                    } else {
                        this.approveButtonDisabled = false;
                        var comp = this;
                        var allApproved = this.selectedTeams.filter(function(team) {
                            return comp.getTeamValue(team, 20) == 'מאושר' &&
                                comp.getTeamValue(team, 21) == 'מאושר' &&
                                comp.getTeamValue(team, 22) == 'מאושר';
                        });
                        this.notAllConfirmations = allApproved.length !== this.selectedTeams.length;
                    }
                },
                changeStatus: function(status) {
                    var comp = this;
                    /*
                    var allApproved = comp.selectedTeams.filter(function(team) {
                        return comp.getTeamValue(team, 20) == 'מאושר' &&
                            comp.getTeamValue(team, 21) == 'מאושר' &&
                            comp.getTeamValue(team, 22) == 'מאושר';
                    });
                    */
                    Vue.http.post('/api/v2/admin/teams/status', {
                        teams: comp.selectedTeams.map(function (t) { return t.team == null ? {id: t.id} : {team: t.team}; }),
                        status: status
                    })
                        .then(
                            function (resp) {
                                // Returns team ids for inserted teams
                                for (var i = 0; i < resp.body.length; i++) {
                                    var update = resp.body[i];
                                    for (var n = 0; n < comp.selectedTeams.length; n++) {
                                        var team = comp.selectedTeams[n];
                                        if (team.id === update.id) {
                                            team.team = update.team;
                                            break;
                                        }
                                    }
                                }
                                comp.selectedStatus = status;
                                comp.selectedTeams.forEach(function(team) {
                                    team.teamStatus = status;
                                    if (team.teamStatus == 2 && team.approved == 15)
                                        team.green = true;
                                });
                            },
                            function (err) {
                                console.log(err);
                            }
                        );

                }
            }
        });

        return TeamsComponent;
    });