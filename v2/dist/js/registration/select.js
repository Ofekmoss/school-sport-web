define(["templates/registration", "views", "services/access", "dialog", "utils", "consts"],
    function (templates, Views, Access, Dialog, utils, consts) {


        function readLeagueCompetitions(comp, callback) {
            comp.sports.splice(0, comp.sports.length);
            Vue.http.get('/api/v2/registration/league/competitions')
                .then(function (resp) {
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

        function readLeagueTeams(comp, callback) {
            readLeagueCompetitions(comp, function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    Vue.http.get('/api/v2/registration/league/teams')
                        .then(
                            function (resp) {
                                var teams = [];
                                for (var i = 0; i < resp.body.length; i++) {
                                    var team = resp.body[i];
                                    team.sport = utils.getById(comp.sports, team.sport);
                                    if (team.sport) {
                                        team.category = utils.getById(team.sport.categories, team.competition);
                                    }
                                    if (team.category) {
                                        team.league = true;
                                        comp.teams.push(team);
                                    }
                                }

                                callback();
                            },
                            function (err) {
                                callback(err);
                            }
                        );
                }
            });
        }

        function loadLeagueMenu(comp) {
            comp.groups = [ {
                links: [
                    // {enabled: true, name: "ספורט1", route: "registration/league/league?team="+res.body},
                    // {enabled: true, name: "ספורט2", route: "registration/league/league?team="+}
                ]}
            ];

            comp.teams.forEach(function(team){
                if (team.league) {
                    var name = team.sport.name + ' ' + team.category.name;
                    if (comp.groups && comp.groups.length > 0 && comp.groups[0].links) {
                        comp.groups[0].links.push({
                            enabled: true,
                            name: name,
                            route: "registration/league/league?team=" + team.team
                        });
                    }
                }
            });
        }

        function Init(comp) {
            readLeagueTeams(comp, function () {
                Vue.http.get('/api/v2/registration').then(function (resp) {
                    comp.groups.splice(0, comp.groups.length);
                    comp.seasons = [];
                    comp.season = null;
                    for (var i = 0; i < resp.data.groups.length; i++) {
                        comp.groups.push(resp.data.groups[i]);
                    }
                    if (resp.data.seasons) {
                        for (var i = 0; i < resp.data.seasons.length; i++) {
                            var curSeason = resp.data.seasons[i];
                            comp.seasons.push(curSeason);
                            if (curSeason.SeasonId == resp.data.currentSeason) {
                                comp.currentSeasonName = curSeason.SeasonName;
                            }
                        }
                        comp.season = resp.data.currentSeason;
                        comp.$watch('season', comp.seasonChanged);
                    }
                    comp.active.splice(0, comp.active.length);
                    for (var i = 0; i < resp.data.active.length; i++) {
                        comp.active.push(resp.data.active[i]);
                        /*
                        var activeRegistration = resp.data.active[i];
                        if (activeRegistration.id === "club") {
                            comp.active.push(
                                {name: "הרשמה למועדון", route: "registration/club/club"}
                            );
                        } else if (activeRegistration.id === "league") {
                            var team = utils.getById(comp.teams, activeRegistration.team);
                            var name = 'ליגות תיכוניים - ' + team.sport.name + ' ' + team.category.name;
                            comp.active.push({
                                name: name,
                                route: "registration/league/league?team=" + team.team
                            });
                        }*/
                    }
                    if (comp.groups && comp.groups.length > 0 && comp.groups[0].links && comp.groups[0].links.length > 0 &&
                        comp.groups[0].links[0].name.indexOf('תכנית') < 0) {
                        Vue.http.get('/api/v2/login').then(function (loginResp) {
                            var region = loginResp.data.region;
                            if (comp.teams.length === 0) {
                                var regionData = consts.coordinators[region];
                                var text = 'אינך מוגדר בליגת תיכונים, אנא פנה לרכז המחוז ' + regionData.name + ' בטלפון ' + regionData.phone;
                                if (comp.groups && comp.groups.length > 1 && comp.groups[2].links && comp.groups[2].links.length > 0) {
                                    comp.groups[2].links[0].enabled = false;
                                    comp.groups[2].links[0].tooltip = text;
                                }
                            }
                            Vue.http.get('/api/v2/registration/club/competitions').then(function (resp) {
                                if (resp.body.sports.length === 0) {
                                    var regionData = consts.coordinators[region];
                                    var text = 'אינך מוגדר ברישום מועדונים, אנא פנה לרכז המחוז ' + regionData.name + ' בטלפון ' + regionData.phone;
                                    if (comp.groups && comp.groups.length > 0 && comp.groups[0].links && comp.groups[0].links.length > 0) {
                                        comp.groups[0].links[0].enabled = false;
                                        comp.groups[0].links[0].tooltip = text;
                                    }
                                }
                            });
                        });
                    }
                }, function (err) {
                    console.log(err);
                });
            });
        }

        var RegistrationSelectComponent = Vue.extend({
            template: templates.select,
            data: function () {
                return {
                    user: Access.user,
                    active: [],
                    prevGroups: null,
                    sports: [],
                    teams: [],
                    groups: [],
                    seasons: [],
                    season: null,
                    peleUser: false,
                    currentSeasonName: '',
                    seasonPanelVisible: false,
                    inactiveSeason: false
                };
            },
            mounted: function () {
                var comp = this;
                comp.peleUser = comp.user.roles && comp.user.roles.length === 1 && comp.user.roles[0] === 'city';
                comp.inactiveSeason = utils.inactiveSeason(comp);
                Init(comp);
            },
            methods: {
                toggleSeasonPanel: function() {
                    var comp = this;
                    comp.seasonPanelVisible = !comp.seasonPanelVisible;
                },
                seasonChanged: function() {
                    var comp = this;
                    var url = '/api/v2/registration/season';
                    Vue.http.post(url, {season: comp.season}).then(function (resp) {
                        Init(comp);
                        document.location.reload();
                    }, function (err) {
                        console.log('error');
                    });
                },
                resetSeason: function() {
                    var comp = this;
                    var activeSeason = comp.seasons.find(function(season) {
                        return season.SeasonId == comp.user.activeSeason;
                    });
                    if (activeSeason != null) {
                        var msg = 'האם להחליף לעונת רישום פעילה ' + activeSeason.SeasonName + '?';
                        Dialog.open('general/message-box', {
                            caption: 'החלפת עונה',
                            message: msg,
                            alert: true,
                            confirmText: "אישור",
                            cancelText: "ביטול"
                        }, function(err, confirmed) {
                            if (confirmed) {
                                var url = '/api/v2/registration/season';
                                Vue.http.post(url, {season: activeSeason.SeasonId}).then(function (resp) {
                                    Init(comp);
                                    document.location.reload();
                                }, function (err) {
                                    console.log('error');
                                });
                            }
                        });
                    } else {
                        alert('עונה פעילה לא נמצאה')
                    }
                },
                goTo: function (link) {
                    var comp = this;
                    if (link.links) {
                        this.prevGroups = this.groups;
                        comp.groups = [{links: link.links}];
                    }
                    else if (link.onclick) {
                        this.prevGroups = this.groups;

                        link.onclick(comp);
                    } else {
                        Views.openView(link.route);
                    }
                },
                logout: function() {
                    Access.logout();
                },
                back: function() {
                    this.groups = this.prevGroups;
                    this.prevGroups = null;
                }
            }
        });

        return RegistrationSelectComponent;
    });