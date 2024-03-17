define(["templates/supervisor", "utils", "dialog", "services/access", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access) {

        function readCompetitions(comp, callback) {
            // ?clubs=1
            Vue.http.get('/api/v2/admin/competitions')
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.sports.length; i++) {
                            comp.sports.push(resp.body.sports[i]);
                        }
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

        function translateTeamStatus(rawStatus) {
            if (rawStatus >= 16)
                return 'לא אושר';
            if (rawStatus >= 8)
                return 'אושר';
            return 'ממתין לאישור';
        }

        function getFilters(comp) {
            var filters = [];
            if (comp.selectedRegion > 0) {
                filters.push('region=' + comp.selectedRegion);
            }
            return filters;
        }

        function readTeams(comp) {
            // ?clubs=1
            var url = '/api/v2/admin/teams';
            var filters = getFilters(comp);
            if (filters.length > 0) {
                url += '?' + filters.join('&');
            }
            comp.teams = [];
            Vue.http.get(url).then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    var team = resp.body[i];
                    team.sport = getById(comp.sports, team.sport);
                    team.parsedStatus = translateTeamStatus(team.approved);
                    if (team.sport) {
                        team.category = getById(team.sport.categories, team.competition);
                    }
                    if (team.category) {

                        if ((team.approved == 10 ) || (team.approved == 15 )) {
                            team.green = true;
                        }
                        comp.teams.push(team);
                    }
                }
                comp.teams.sort(function(a, b){
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                comp.sportFields = [];
                comp.championships = [];
                comp.categories = [];
                comp.allTeams = comp.teams.slice(0);
                comp.teams.forEach(function(team) {
                    if (comp.sportFields.find(function(x) { return x.id === team.sport.id; }) == null) {
                        comp.sportFields.push({
                            id: team.sport.id,
                            name: team.sport.name
                        });
                    }
                    if (comp.championships.find(function(x) { return x.id === team.championship.id; }) == null) {
                        comp.championships.push({
                            id: team.championship.id,
                            name: team.championship.name
                        });
                        comp.championshipSportFieldMapping[team.championship.id.toString()] = team.sport.id;
                    }
                    if (comp.categories.find(function(x) { return x.name === team.category.name; }) == null) {
                        comp.categories.push({
                            id: team.category.id,
                            name: team.category.name
                        });
                    }
                });
            }, function (err) {
                console.log(err);
            });
        }

        function ReloadTeams(comp) {
            var selectedSportField = parseInt(comp.selectedSportField, 10);
            var selectedChampionship = parseInt(comp.selectedChampionship, 10);
            var selectedCategory = comp.selectedCategory;
            comp.teams = comp.allTeams.filter(function(team) {
                var matchingSportField = (selectedSportField === 0) || (selectedSportField > 0 && team.sport.id === selectedSportField);
                var matchingChampionship = (selectedChampionship === 0) || (selectedChampionship > 0 && team.championship.id === selectedChampionship);
                var matchingCategory = (selectedCategory.length === 0) || (selectedCategory.length > 0 && team.category.name === selectedCategory);
                return matchingSportField && matchingChampionship && matchingCategory;
            });
        }

        function AbortChangeByCode() {
            window.setTimeout(function() {
                window['changedByCode'] = false;
            }, 250);
        }

        var ClubTeamsApprovalComponent = Vue.extend({
            template: templates["club-teams-approval"],
            data: function () {
                return {
                    user: Access.user,
                    teams: [],
                    columns: [
                        {
                            key: 'school.name',
                            name: 'בית ספר',
                            active: true
                        },
                        {
                            key: 'school.regionName',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'school.symbol',
                            name: 'סימול בית ספר',
                            active: true
                        },
                        {
                            key: 'sport.name',
                            name: 'ענף ספורט',
                            active: true
                        },
                        {
                            key: 'championship.name',
                            name: 'שם אליפות',
                            active: true
                        },
                        {
                            key: 'category.name',
                            name: 'קטגוריה',
                            active: true
                        },
                        {
                            name: 'סטטוס',
                            key: 'parsedStatus',
                            active: true
                        }],
                    sports: [],
                    regions: [],
                    loggedUser: null,
                    searchText: "",
                    isSelectAll: false,
                    statuses: [{id: 1, name: 'אושר'}, {id: 2, name: 'לא אושר'}, {id: 3, name: 'ממתין לאישור'}],
                    selectedStatus: null,
                    selectedRegion: -1,
                    selectedTeams: [],
                    sportFields: [],
                    selectedSportField: 0,
                    championships: [],
                    selectedChampionship: 0,
                    categories: [],
                    selectedCategory: '',
                    allTeams: [],
                    championshipSportFieldMapping: {}
                };
            },
            mounted: function () {
                var comp = this;
                // readTeams(this);
                readCompetitions(comp, function (err) {
                    if (!err) {
                        readTeams(comp);
                        Vue.http.get('/api/v2/login').then(function (resp) {
                            comp.loggedUser = resp.data;
                            Vue.http.get('/api/v2/regions').then(function (resp) {
                                comp.regions = resp.data.filter(function(x) {
                                    return x.id > 0;
                                });
                                if (comp.loggedUser.region > 0) {
                                    comp.loggedUser.regionName = comp.regions.find(function (x) {
                                        return x.id === comp.loggedUser.region;
                                    }).name;
                                }
                            }, function (err) {
                                console.log(err);
                            });
                        }, function (err) {
                            console.log(err);
                        });
                    }
                });
            },
            watch: {
                selectedRegion: function () {
                    readTeams(this);
                },
                selectedSportField: function () {
                    if (!window['changedByCode']) {
                        window['changedByCode'] = true;
                        this.selectedChampionship = 0;
                        this.selectedCategory = '';
                        AbortChangeByCode();
                        ReloadTeams(this);
                    }
                },
                selectedChampionship: function () {
                    if (!window['changedByCode']) {
                        window['changedByCode'] = true;
                        this.selectedSportField = this.selectedChampionship > 0 ? this.championshipSportFieldMapping[this.selectedChampionship.toString()] : 0;
                        this.selectedCategory = '';
                        ReloadTeams(this);
                        AbortChangeByCode();
                    }
                },
                selectedCategory: function () {
                    if (!window['changedByCode']) {
                        ReloadTeams(this);
                    }
                }
            },
            methods: {
                handleSelectionChange: function () {
                    this.selectedTeams.splice(0, this.selectedTeams.length);
                    this.selectedStatus = null;
                    for (var i = 0; i < this.teams.length; i++) {
                        var team = this.teams[i];
                        if (team.selected) {
                            /*
                            if (this.selectedTeams.length === 0) {
                                this.selectedStatus = team.approved;
                            }
                            else if (this.selectedStatus != team.approved) {
                                this.selectedStatus = null;
                            }
                             */
                            this.selectedTeams.push(team);
                        }
                    }
                },
                changeStatus: function(status) {
                    var comp = this;
                    Vue.http.post('/api/v2/admin/teams/status/supervisor', {
                        teams: comp.selectedTeams.map(function (t) { return t.id; }),
                        status: status
                    })
                        .then(
                            function () {
                                var approved = 0;
                                switch (status) {
                                    case -1:
                                        approved = 16;
                                        break;
                                    case 1:
                                        approved = 8;
                                        break;
                                    case 0:
                                        approved = 1;
                                        break;
                                }
                                comp.selectedStatus = status;
                                comp.selectedTeams.forEach(function(team) {
                                    team.approved = approved;
                                    team.parsedStatus = translateTeamStatus(team.approved);
                                });
                            },
                            function (err) {
                                console.log(err);
                            }
                        );

                },
                logout: function() {
                    Access.logout();
                }
            }
        });

        return ClubTeamsApprovalComponent;
    });