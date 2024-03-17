define(["templates/admin", "utils", "dialog", "services/access", "consts", "views", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts, Views) {
        function buildFilter(comp) {
            var query = '';
            if (comp.region != null) {
                if (query.length > 0)
                    query += '&';
                query += 'region=' + comp.region;
            }
            if (comp.competitionSport > 0) {
                if (query.length > 0)
                    query += '&';
                query += 'sport=' + comp.competitionSport;
            }
            if (comp.season) {
                if (query.length > 0)
                    query += '&';
                query += 'season=' + comp.season;
            }
            return query;
        }

        function filterCategories(comp) {
            var sport = comp.competitionSport;
            var championship = comp.competitionChampionship;
            var allSports = (sport == -1);
            var allChampionships = (championship == -1);
            comp.categories = comp.allCategories.filter(function(category) {
                var matchingSport = allSports || category.sport.id == sport;
                var matchingChampionship = allChampionships || category.championship.id == championship;
                return matchingSport && matchingChampionship;
            });
        }

        function readCategories(comp, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            var query = buildFilter(comp);
            Vue.http.get('/api/v2/admin/competitions?' + query).then(function (resp) {
                comp.allCategories = [];
                comp.sports = [];
                comp.sports.push({
                    id: -1,
                    name: 'כל הענפים'
                });
                for (var i = 0; i < resp.body.sports.length; i++) {
                    var sport = resp.body.sports[i];
                    sport.categories.forEach(function(category) {
                        category.sport = {
                            id: sport.id,
                            name: sport.name
                        };
                        comp.allCategories.push(category);
                    });
                    comp.sports.push(sport);
                }
                comp.categories = comp.allCategories.slice(0);
                callback();
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        function readChampionships(comp, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            var query = buildFilter(comp);
            Vue.http.get('/api/v2/admin/championships?' + query).then(function (resp) {
                comp.championships = [];
                comp.championship = -1;
                comp.championships.push({
                    id: -1,
                    name: 'כל האליפויות'
                });
                for (var i = 0; i < resp.body.length; i++) {
                    var championship = resp.body[i];
                    comp.championships.push(championship);
                }
                //comp.competitionChampionship = -1;
                callback();
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        function readSeasons(comp, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
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
                        });
                    }
                });
            });
        }

        function readRegions(comp, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            comp.regions = [];
            comp.sport = -1;
            comp.championship = -1;
            if (Access.user.region === 0) {
                comp.regions.push({
                    id: null,
                    name: 'כל המחוזות'
                });
            }
            Vue.http.get('/api/v2/regions').then(function (resp) {
                //console.log(resp);
                for (var i = 0; i < resp.body.length; i++) {
                    var region = resp.body[i];
                    //console.log(region);
                    comp.regions.push(region);
                }
                comp.updateCaption();
                callback();
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        var CategoriesComponent = Vue.extend({
            template: templates["categories"],
            props: {
                //region: {}
            },
            data: function () {
                return {
                    tabName: "אליפויות",
                    caption: "תחרויות",
                    competitionSport: -1,
                    competitionChampionship: -1,
                    allCategories: [],
                    categories: [],
                    championships: [],
                    regions: [],
                    sports: [],
                    seasons: [],
                    season: null,
                    region: null,
                    columns: [
                        {
                            key: 'id',
                            name: 'זיהוי תחרות',
                            active: true
                        },
                        {
                            key: 'region.name',
                            name: 'מחוז',
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
                            key: 'name',
                            name: 'קטגוריית אליפות',
                            active: true
                        },
                        {
                            key: 'registrationPrice',
                            name: 'תעריף רישום',
                            type: 'NIS',
                            active: true
                        },
                        {
                            key: 'chargeSeason.name',
                            name: 'עונה לחיוב',
                            active: true
                        },
                        {
                            key: 'teams',
                            name: 'קבוצות',
                            active: true,
                            click: function(category) {
                                var viewParams = {
                                    region: category.region.id,
                                    sport: category.sport.id,
                                    championship: category.championship.id,
                                    category: category.id
                                };
                                Views.openView('manage/teams', viewParams);
                            }
                        },
                        {
                            key: 'phases',
                            name: 'שלבים',
                            active: true
                        },
                        {
                            name: 'פעולות',
                            key: 'manageCompetition',
                            type: 'button',
                            active: true,
                            onclick: this.manageCompetitionClicked,
                            getText: function(account, index) {
                                return 'ניהול תחרות';
                            }
                        }
                    ],
                    searchText: "",
                    isSelectAll: false,
                    selectedCategories: []
                };
            },
            mounted: function () {
                if (this.region == null) {
                    this.region = Access.user.region > 0 ? Access.user.region : null;
                }
                var comp = this;
                readChampionships(comp, function() {
                    readRegions(comp, function() {
                        readSeasons(comp, function () {
                            readCategories(comp, function () {
                                comp.updateCaption();
                            });
                        });
                    });
                });
            },
            watch: {
                region: function () {
                    var comp = this;
                    readChampionships(comp, function () {
                        readCategories(comp, function() {
                            if (comp.competitionSport > 0)
                                filterCategories(comp);
                            comp.updateCaption();
                        });
                    });
                },
                competitionSport: function () {
                    var comp = this;
                    readChampionships(comp, function () {
                        readCategories(comp, function() {
                            filterCategories(comp);
                            comp.updateCaption();
                        });
                    });
                },
                competitionChampionship: function () {
                    var comp = this;
                    readCategories(comp, function() {
                        filterCategories(comp);
                        comp.updateCaption();
                    });
                },
                season: function () {
                    var comp = this;
                    readChampionships(comp, function () {
                        readCategories(comp, function () {
                            comp.updateCaption();
                        });
                    });
                }
            },
            methods: {
                manageCompetitionClicked: function(competition) {
                    Views.openView('competitions/competition', {id: competition.id});
                },
                updateCaption: function () {
                    var caption = "תחרויות";
                    if (this.region != null && this.region >= 0 && this.regions) {
                        for (var n = 0; n < this.regions.length; n++) {
                            var region = this.regions[n];
                            if (region.id == this.region) {
                                caption += " - " + region.name;
                                break;
                            }
                        }
                    }
                    if (this.competitionSport != null && this.competitionSport >= 0 && this.sports) {
                        for (var n = 0; n < this.sports.length; n++) {
                            var sport = this.sports[n];
                            if (sport.id == this.competitionSport) {
                                caption += " - " + sport.name;
                                break;
                            }
                        }
                    }
                    this.caption = caption;
                },
                handleSelectionChange: function () {
                    var comp = this;
                    comp.selectedCategories = [];
                    for (var i = 0; i < comp.categories.length; i++) {
                        var category = comp.categories[i];
                        if (category.selected) {
                            comp.selectedCategories.push(category);
                        }
                    }
                },
                editSelectedCategory: function() {
                    var comp = this;
                    if (comp.selectedCategories == null || comp.selectedCategories.length !== 1) {
                        console.log('must have only one selected');
                        return;
                    }
                    var selectedCategory = comp.selectedCategories[0];
                    Dialog.open("admin/category-dialog", {
                        category: selectedCategory.id,
                        disableClickOutside: true
                    }, function (err, result) {
                        if (err == null && result != null) {
                            selectedCategory.chargeSeason = result.chargeSeason;
                            selectedCategory.registrationPrice = result.price;
                        }
                    });
                },
                linkLogligCompetition: function() {
                    var comp = this;
                    if (comp.selectedCategories == null || comp.selectedCategories.length !== 1) {
                        console.log('must have only one selected');
                        return;
                    }
                    var selectedCategory = comp.selectedCategories[0];
                    Dialog.open("admin/link-loglig-dialog", {
                        category: selectedCategory.id,
                        categoryName: selectedCategory.championship.name + " " + selectedCategory.name,
                        competition: selectedCategory.logligId,
                        disableClickOutside: true
                    }, function (err, result) {
                        if (err == null && result != null) {

                        }
                    });
                }
            }
        });

        return CategoriesComponent;
    });