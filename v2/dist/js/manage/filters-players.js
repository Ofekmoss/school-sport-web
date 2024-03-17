define(["templates/manage", "manage/dal", "utils", "services/access", "components/multiselect-search", "components/selectex"], function (templates, dal, utils, Access) {

    function ReadAllData(comp) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        var promises = [dal.getRegionsWithChampionships(), dal.getSportsWithChampionships(), dal.getChampionships()];
        var categoryPromiseIndex = -1;
        var teamPromiseIndex = -1;
        if (comp.initFilters) {
            if (comp.initFilters.championship) {
                promises.push(dal.getCategories({championship: comp.initFilters.championship}));
                categoryPromiseIndex = 3;
                if (comp.initFilters.category) {
                    promises.push(dal.getTeams({
                        championship: comp.initFilters.championship,
                        category: comp.initFilters.category
                    }));
                    teamPromiseIndex = 4;
                }
            }
        }

        utils.promiseAll(promises).then(function(results) {
            //console.log(results[0]);
            comp.regions = results[0];
            comp.sports = results[1];
            comp.championships = results[2];
            comp.categories = categoryPromiseIndex > 0 ? results[categoryPromiseIndex].map(function (item) {
                return {
                    id: item.Id,
                    name: item.Name
                }
            }) : [];
            comp.teams = teamPromiseIndex > 0 ? results[teamPromiseIndex].map(function (item) {
                var name = item.DisplayName;
                if (item.Type === 'new')
                    name += ' [רישום]';
                return {
                    id: item.TeamId || item.Id,
                    team: item.Id || item.TeamId,
                    name: name
                }
            }) : [];

            comp.championships.forEach(function (championship) {
                championship.name = championship.Name;
                if (championship.Region.Id > 0)
                    championship.name += ' (' + championship.Region.Name + ')';
            });

            if (!comp.initFilters) {
                return;
            }

            var actions = [];
            var waitInterval = 300;
            if (comp.initFilters.region) {
                actions.push(function () {
                    var r = utils.getById(comp.regions, comp.initFilters.region);
                    comp.result.region = r ? r : null;
                });
            }

            if (comp.initFilters.sport) {
                actions.push(function () {
                    var s = utils.getById(comp.sports, comp.initFilters.sport);
                    comp.result.sport = s ? s : null;
                });
            }

            if (comp.initFilters.championship) {
                actions.push(function () {
                    var c = utils.getById(comp.championships, comp.initFilters.championship);
                    comp.result.championship = c ? c : null;
                });
            }

            if (comp.initFilters.category) {
                actions.push(function () {
                    var ca = utils.getById(comp.categories, comp.initFilters.category);
                    comp.result.category = ca ? ca : null;
                });
                if (comp.initFilters.team) {
                    actions.push(function () {
                        var te = utils.getById(comp.teams, comp.initFilters.team);
                        if (te == null) {
                            //search by old system ream:
                            te = utils.getById(comp.teams, comp.initFilters.team, 'team');
                        }
                        comp.result.team = te ? te : null;
                    });
                }
            }

            var executeSingleAction = function (index) {
                if (index >= actions.length) {
                    comp.upCount++;
                    comp.load('init');
                    callback();
                } else {
                    var action = actions[index];
                    action();
                    window.setTimeout(function () {
                        executeSingleAction(index + 1);
                    }, waitInterval);
                }
            };
            window.setTimeout(function () {
                executeSingleAction(0);
            }, waitInterval);
        });
    }

    var FiltersPlayers = Vue.extend({
        template: templates["filters-players"],
        props: {
            initFilters: Object,
            upCount : 0
        },
        data: function () {
            return {
                loggedUser: null,
                regions: [],
                sports: [],
                championships: [],
                categories: [],
                seasons: [],
                teams: [],
                changed: false,
                loaded: false,
                mounting: true,
                result: {
                    season: null,
                    region: null,
                    sport: null,
                    championship: null,
                    category: null,
                    team: null,
                },
                initialized : false
            };
        },
        mounted: function () {
            var comp = this;
            Access.get(function (err, user) {
                comp.loggedUser = user;
                dal.getSeasons().then(function(seasons) {
                    comp.seasons = seasons;
                    var selectedSeasonId = 0;
                    if (comp.loggedUser.season) {
                        selectedSeasonId = comp.loggedUser.season;
                    }
                    if (selectedSeasonId) {
                        var season = utils.getById(comp.seasons, selectedSeasonId);
                        window.setTimeout(function() {
                            comp.result.season = season ? season : null;
                        }, 250);
                    }
                    comp.$watch('result.season', comp.seasonChanged);
                    ReadAllData(comp, function() {
                        window.setTimeout(function() {
                            comp.mounting = false;
                        }, 1000);
                    });
                });
            });
        },
        methods: {
            seasonChanged: function() {
                var comp = this;
                if (!comp.mounting) {
                    var season = comp.result.season ? comp.result.season.id : null;
                    if (season) {
                        var url = '/api/v2/registration/season';
                        Vue.http.post(url, {season: season}).then(function (resp) {
                            comp.initFilters = null;
                            ReadAllData(comp);
                        }, function (err) {
                            console.log('error');
                        });
                    }
                }
            },
            load: function(sender) {
                this.initialized = true;
                this.result.description = "שחקנים";
                if (this.result.region) {
                    this.result.description += '-' + this.result.region.name;
                }

                if (this.result.sport) {
                    this.result.description += '-' + this.result.sport.name;
                }

                if (this.result.championship) {
                    this.result.description += '-' + this.result.championship.name;
                }

                if (this.result.category) {
                    this.result.description += '-' + this.result.category.name;
                }

                if (this.result.team) {
                    this.result.description += '-' + this.result.team.name;
                }

                if (sender === 'click' || sender === 'init') {
                    this.$emit('change', this.result);
                }
            }
        },
        watch: {
            'result.region': function(curr) {
                if (!this.initialized) {
                    return;
                }
                var comp = this;
                var region = (comp.result.region || {}).id;
                utils.promiseAll([dal.getSportsWithChampionships(region), dal.getChampionships({region: region})]).then(function (results) {
                    comp.result.category = null;
                    comp.result.championship = null;
                    comp.sports = results[0];
                    comp.championships = results[1];
                    comp.championships.forEach(function (championship) {
                        championship.name = championship.Name;
                        if (championship.Region.Id > 0)
                            championship.name += ' (' + championship.Region.Name + ')';
                    });
                    comp.load();
                });

            },
            'result.sport': function(curr) {
                if (!this.initialized) {
                    return;
                }
                var comp = this;
                var region = (comp.result.region || {}).id;
                var sport = (comp.result.sport || {}).id;
                utils.promiseAll([dal.getChampionships({region: region, sport: sport})]).then(function (results) {
                    comp.result.category = null;
                    comp.result.championship = null;
                    comp.championships = results[0];
                    comp.championships.forEach(function (championship) {
                        championship.name = championship.Name;
                        if (championship.Region.Id > 0)
                            championship.name += ' (' + championship.Region.Name + ')';
                    });
                    comp.load();
                });
            },
            'result.championship': function(curr) {
                if (!this.initialized) {
                    return;
                }
                var comp = this;
                if ( curr && curr.id != -1) {
                    dal.getCategories({championship: curr.id}).then(function(result) {
                        comp.categories = result.map(function(item){
                            return {
                                id: item.Id,
                                name: item.Name
                            }
                        });
                    });
                } else {
                    this.categories = [];
                }
            },
            'result.category': function(curr) {
                if (!this.initialized) {
                    return;
                }
                var comp = this;
                if ( curr && curr.id != -1) {
                    dal.getTeams({championship: comp.result.championship.id, category: curr.id }).then(function(result) {
                        comp.teams = result.map(function(item){
                            var name = item.DisplayName; //item.School.SCHOOL_NAME + ' - ' + item.TeamNumber
                            if (item.Type === 'new')
                                name += ' [רישום]';
                            return {
                                id: item.TeamId || item.Id,
                                name: name
                            }
                        });
                    });
                } else {
                    this.teams = [];
                }
            }
        }

    });

    Vue.component('filters-players', FiltersPlayers);
});