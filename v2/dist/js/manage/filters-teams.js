define(["templates/manage", "manage/dal", "utils", "services/access", "components/multiselect-search", "components/selectex"], function (templates, dal, utils, Access) {

    function ReadAllData(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        utils.promiseAll([dal.getRegionsWithChampionships(), dal.getSportsWithChampionships(), dal.getChampionships()]).then(function(results) {
            comp.regions = results[0];
            comp.sports = results[1];
            comp.championships = results[2];

            console.log(comp.initFilters);
            if (!comp.initFilters) {
                callback();
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
                    comp.result.championship = c ? c : {};
                });
            }

            if (comp.initFilters.championship) {
                actions.push(function () {
                    dal.getCategories({championship: comp.initFilters.championship}).then(function (result) {
                        comp.categories = result.map(function (item) {
                            return {
                                id: item.Id,
                                name: item.Name
                            }
                        });

                        if (comp.initFilters.category) {
                            var ca = utils.getById(comp.categories, comp.initFilters.category);
                            comp.result.category = ca ? ca : {};
                        }

                        comp.upCount++;
                        window.setTimeout(function() {
                            comp.load('init');
                            callback();
                        }, 500);
                    });
                });
            } else {
                actions.push(function () {
                    comp.upCount++;
                    comp.load('init');
                    callback();
                });
            }

            var executeSingleAction = function (index) {
                if (index >= actions.length) {
                    if (actions.length === 0) {
                        comp.upCount++;
                        comp.load('init');
                        callback();
                    }
                } else {
                    var action = actions[index];
                    action();
                    window.setTimeout(function() {
                        executeSingleAction(index + 1);
                    }, waitInterval);
                }
            };
            window.setTimeout(function() {
                executeSingleAction(0);
            }, waitInterval);
        });
    }

    var FiltersTeams = Vue.extend({
        template: templates["filters-teams"],
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
                changed: false,
                loaded: false,
                mounting: true,
                result: {
                    season: null,
                    region: null,
                    sport: null,
                    championship: null,
                    category: null
                }
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
                            ReadAllData(comp, function () {
                                //console.log('bar');
                            });
                        }, function (err) {
                            console.log('error');
                        });
                    }
                }
            },
            load: function(sender) {
                /* if (!(this.result.region ||
                        this.result.sport ||
                        this.result.championship ||
                        this.result.category
                    )) {
                    return;
                } */

                this.result.description = 'קבוצות';
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
                //console.log(this.result);
                if (sender === 'click' || sender === 'init') {
                    this.$emit('change', this.result);
                }
                this.changed = false;
                if (this.loaded == false) {
                    this.loaded = true;
                }
            }
        },
        watch: {
            'result.championship': function(curr) {
                var comp = this;
                if ( curr && curr.id) {
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
            'result.sport': function(curr) {
                var comp = this;
                if ( curr && curr.id) {
                    var filters = {
                        sport: curr.id,
                        region: this.result.region ? this.result.region.id : null,
                    };
                    dal.getChampionships(filters).then(function(res) {
                        comp.championships = res;
                    });
                }
            },
            'result.region': function(curr) {
                var comp = this;
                if ( curr && curr.id) {
                    var filters = {
                        sport: this.result.sport ? this.result.sport.id : null,
                        region: curr.id,
                    };
                    utils.promiseAll([dal.getSportsWithChampionships(curr.id), dal.getChampionships(filters)]).then(function (results) {
                        comp.result.category = null;
                        comp.result.championship = null;
                        comp.sports = results[0];
                        comp.championships = results[1];
                        comp.championships.forEach(function (championship) {
                            championship.name = championship.Name;
                            if (championship.Region.Id > 0)
                                championship.name += ' (' + championship.Region.Name + ')';
                        });
                        //comp.load();
                    });
                }
            },
            result: {
                deep: true,
                handler: function() {
                    if (this.loaded) {
                        this.changed = true;
                    }
                }
            }
        }

    });

    Vue.component('filters-teams', FiltersTeams);
});