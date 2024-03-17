define(["templates/admin", "utils", "dialog", "services/access", "consts", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts) {
        function readChampionships(comp) {
            var query = '';
            if (comp.competitionType.toString().length === 0) {
                query = 'type=all';
            } else {
                switch (parseInt(comp.competitionType)) {
                    case 1:
                        query = 'clubs=1';
                        break;
                    case 2:
                        query = 'league=1';
                        break;
                }
            }
            if (comp.region >= 0) {
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
            comp.allCategories = [consts.allCategoriesHebName];
            Vue.http.get('/api/v2/admin/championships?' + query).then(function (resp) {
                comp.championships = [];
                var champCategories = [];
                for (var i = 0; i < resp.body.length; i++) {
                    var championship = resp.body[i];
                    comp.championships.push(championship);
                    championship.categories.split(', ').forEach(function(categoryName) {
                        if (champCategories.indexOf(categoryName) < 0) {
                            champCategories.push(categoryName);
                        }
                    });
                }
                champCategories.sort();
                champCategories.forEach(function(categoryName) {
                    comp.allCategories.push(categoryName);
                });
                comp.allChampionships = comp.championships.filter(function(x) { return  true; });
                comp.competitionCategory = consts.allCategoriesHebName;
            }, function (err) {
                console.log(err);
            });
        }

        function readSeasons(comp) {
            comp.seasons.splice(0, comp.seasons.length);
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    comp.seasons.push(resp.body[i]);
                }
                Vue.http.get('/api/v2/cache?key=season').then(function (resp) {
                    var cachedSeason = resp.body.Value;
                    if (cachedSeason != null) {
                        comp.season = cachedSeason;
                    } else {
                        Vue.http.get('/api/v2/season').then(function (resp) {
                            var curSeason = resp.body.season;
                            if (curSeason) {
                                comp.season = curSeason;
                            }
                        });
                    }
                });
            });
        }

        function readRegions(comp) {
            comp.regions = [];
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
            }, function (err) {
                console.log(err);
            });
        }

        function readSports(comp) {
            comp.sports = [];
            comp.sports.push({
                id: -1,
                name: 'כל הענפים'
            });
            Vue.http.get('/api/sportsman/sports').then(function (resp) {
                //console.log(resp);
                for (var i = 0; i < resp.body.length; i++) {
                    var sport = resp.body[i];
                    //console.log(region);
                    comp.sports.push({
                        id: sport['SPORT_ID'],
                        name: sport['SPORT_NAME']
                    });
                }
                comp.updateCaption();
            }, function (err) {
                console.log(err);
            });
        }

        var allColumns = [
            {
                key: 'id',
                name: 'זיהוי אליפות',
                active: true
            },
            {
                key: 'name',
                name: 'שם אליפות',
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
                key: 'isOpen',
                name: 'סוג אליפות',
                active: true
            },
            {
                key: 'status',
                name: 'סטטוס אליפות',
                active: true
            },
            {
                key: 'categories',
                name: 'קטגוריות',
                active: true
            },
            {
                key: 'ruleset.name',
                name: 'תקנון',
                active: true
            },
            {
                key: 'remarks',
                name: 'הערות',
                active: true
            },
            {
                key: 'supervisor.name',
                name: 'שם אחראי אליפות',
                active: true
            },
            {
                key: 'supervisor.email',
                name: 'מייל אחראי אליפות',
                active: true
            },
            {
                key: 'dates.lastRegistration',
                name: 'תאריך רישום אחרון',
                type: 'date',
                active: false
            },
            {
                key: 'dates.start',
                name: 'מועד פתיחת אליפות',
                type: 'date',
                active: false
            },
            {
                key: 'dates.end',
                name: 'מועד סיום אליפות',
                type: 'date',
                active: false
            },
            {
                key: 'dates.finals',
                name: 'מועד גמר',
                type: 'date',
                active: false
            },
            {
                key: 'alternativeDates.start',
                name: 'מועד פתיחה חלופי',
                type: 'date',
                active: false
            },
            {
                key: 'alternativeDates.end',
                name: 'מועד סיום חלופי',
                type: 'date',
                active: false
            },
            {
                key: 'alternativeDates.finals',
                name: 'מועד גמר חלופי',
                type: 'date',
                active: false
            }
        ];

        var ChampionshipsComponent = Vue.extend({
            template: templates["championships"],
            props: {
                //region: {}
            },
            data: function () {
                return {
                    tabName: "אליפויות",
                    caption: "אליפויות",
                    competitionType: 1,
                    competitionSport: -1,
                    competitionCategory: consts.allCategoriesHebName,
                    championships: [],
                    allChampionships: [],
                    allCategories: [],
                    regions: [],
                    sports: [],
                    seasons: [],
                    season: null,
                    region: null,
                    columns: allColumns,
                    searchText: "",
                    isSelectAll: false,
                    selectedChampionships: []
                };
            },
            mounted: function () {
                if (this.region == null) {
                    this.region = Access.user.region > 0 ? Access.user.region : null;
                }
                readChampionships(this);
                readRegions(this);
                readSports((this));
                readSeasons(this);
                this.updateCaption();
            },
            watch: {
                competitionType: function () {
                    readChampionships(this);
                },
                region: function () {
                    this.updateCaption();
                    readChampionships(this);
                },
                competitionSport: function () {
                    this.updateCaption();
                    readChampionships(this);
                },
                competitionCategory: function() {
                    var selectedCategory = this.competitionCategory;
                    this.championships = this.allChampionships.filter(function(x) {
                        return (selectedCategory === consts.allCategoriesHebName) ? true : x.categories.indexOf(selectedCategory) >= 0;
                    });
                },
                season: function() {
                    readChampionships(this);
                }
            },
            methods: {
                updateCaption: function () {
                    var caption = "אליפויות";
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
                    this.selectedChampionships.splice(0, this.selectedChampionships.length);
                    for (var i = 0; i < this.championships.length; i++) {
                        var championship = this.championships[i];
                        if (championship.selected) {
                            this.selectedChampionships.push(championship);
                        }
                    }
                }
            }
        });

        return ChampionshipsComponent;
    });