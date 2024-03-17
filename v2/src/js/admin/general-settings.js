define(["templates/admin", "dialog", "generic/data-table", "utils"],
    function (templates, Dialog, dataTable, utils) {
        function loadAllData(comp, callback) {
            //[{"id":69,"name":"תשע\"ח"},{"id":70,"name":"תשפ\"א"}]
            //[{"Id":29,"Name":"אופני הרים","Type":1}
            //[{"Category":1,"Name":"א' תלמידים"},{"Category":65537,"Name":"א' תלמידים/תלמידות"},
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            comp.seasons = [{id: -1, name: 'עונה...'}];
            comp.filters.seasons = [{id: -1, name: 'כל העונות'}];
            comp.sports = [{Id: -1, Name: 'ענף ספורט...'}];
            comp.categories = [{Category: -1, Name: 'קטגוריית אליפות...'}];
            Vue.http.get('/api/v2/seasons', {}).then(function (seasonsResponse) {
                for (var i = 0; i < seasonsResponse.body.length; i++) {
                    var curSeason = seasonsResponse.body[i];
                    comp.seasons.push(curSeason);
                    comp.filters.seasons.push(curSeason);
                }
                Vue.http.get('/api/v2/manage/sports', {}).then(function (sportsResponse) {
                    for (var i = 0; i < sportsResponse.body.length; i++) {
                        comp.sports.push(sportsResponse.body[i]);
                    }
                    Vue.http.get('/api/v2/manage/categories?championship=-1', {}).then(function (categoriesResponse) {
                        for (var i = 0; i < categoriesResponse.body.length; i++) {
                            comp.categories.push(categoriesResponse.body[i]);
                        }
                        Vue.http.get('/api/v2/general-data', {}).then(function (generalDataResponse) {
                            var latestVersionData = generalDataResponse.body.SportsmanLatestVersion;
                            if (latestVersionData != null && latestVersionData.Link && latestVersionData.Version) {
                                var text = 'הורדת גרסה ' + latestVersionData.Version + ' של תוכנת ספורטסמן';
                                comp.downloadLinks.push({
                                    url: latestVersionData.Link,
                                    text: text
                                });
                            }
                            callback();
                        });
                    });
                });
            });
        }

        function restoreIsfOverageData(comp, isfOverageRawData) {
            comp.isfOverAgeItems = utils.parseIsfOverageItems(isfOverageRawData);
        }

        function restoreOverageData(comp, overageRawData) {
            comp.overAgeItems = utils.parseIsfOverageItems(overageRawData);
        }

        function updateSuccess(comp, key) {
            comp.updateStatus[key].success = true;
            window.setTimeout(function() {
                comp.updateStatus[key].success = false;
            }, 5000);
        }

        function updateFailure(comp, key) {
            comp.updateStatus[key].failed = true;
            window.setTimeout(function() {
                comp.updateStatus[key].failed = false;
            }, 5000);
        }

        function updateServerCache(comp, key, value, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            comp.updateStatus[key].loading = true;
            Vue.http.post('/api/v2/cache', {
                key: key,
                value: value,
                global: 1
            }).then(function (resp) {
                comp.updateStatus[key].loading = false;
                updateSuccess(comp, key);
                callback();
            }, function(err) {
                comp.updateStatus[key].loading = false;
                updateFailure(comp, key);
                callback();
            });
        }

        function verifyValidDate(date) {
            return date !== '' && date != null;
        }

        function verifyValidRange(item) {
            var rangeStart = utils.parseDate(item.rangeStart, '');
            var rangeEnd = utils.parseDate(item.rangeEnd, '');
            return verifyValidDate(rangeStart) && verifyValidDate(rangeEnd) && rangeStart < rangeEnd;
        }

        function getCacheValue(items, onlyEnd) {
            if (typeof onlyEnd === 'undefined' || onlyEnd == null)
                onlyEnd = false;
            return items.map(function (item) {
                var rangeStart = onlyEnd ? '01/01/2000' : utils.formatDate(utils.parseDate(item.rangeStart, ''), 'dd/MM/yyyy');
                var rangeEnd = utils.formatDate(utils.parseDate(item.rangeEnd, ''), 'dd/MM/yyyy');
                return [item.season, item.sport, item.category, rangeStart, rangeEnd].join(',');
            }).join('|');
        }

        function saveIsfOverageData(comp) {
            var validItems = comp.isfOverAgeItems.filter(function (item) {
                return (item.season > 0 && item.sport > 0 && item.category > 0) ? verifyValidRange(item) : false;
            });
            var rawCacheValue = getCacheValue(validItems);
            if (rawCacheValue != comp.originalIsfOverageData) {
                updateServerCache(comp, 'isf-overage', rawCacheValue, function () {
                    comp.originalIsfOverageData = rawCacheValue;
                });
            }
        }

        function saveOverageData(comp) {
            var validItems = comp.overAgeItems.filter(function (item) {
                return (item.season > 0 && item.sport >= 0 && item.category > 0) ? verifyValidDate(item.rangeEnd) : false;
            });
            var rawCacheValue = getCacheValue(validItems, true);
            if (rawCacheValue != comp.originalOverageData) {
                updateServerCache(comp, 'overage', rawCacheValue, function () {
                    comp.originalOverageData = rawCacheValue;
                });
            }
        }

        var GeneralSettingsComponent = Vue.extend({
            template: templates["general-settings"],
            props: {
                type: {}
            },
            data: function () {
                return {
                    tabName: "כללי",
                    caption: "הגדרות כלליות",
                    image: 'img/settings.svg',
                    updating: false,
                    types: [
                        {
                            value: 0,
                            caption: 'כל הסוגים'
                        },
                        {
                            value: 1,
                            caption: 'פל"א'
                        },
                        {
                            value: 2,
                            caption: 'רישום'
                        },
                        {
                            value: 3,
                            caption: 'הורדות'
                        }
                    ],
                    filters: {
                        seasons: [],
                        season: -1
                    },
                    seasons: [],
                    sports: [],
                    categories: [],
                    peleTeamRegistration: false,
                    schoolsSeasonAuthorization: '',
                    isfOverAgeItems: [],
                    isfOverAgeTimer: 0,
                    originalIsfOverageData: '',
                    overAgeItems: [],
                    overAgeTimer: 0,
                    originalOverageData: '',
                    downloadsVisible: false,
                    downloadLinks: [],
                    updateStatus: {
                        'pele-team-registration': {
                            loading: false,
                            success: false,
                            failed: false,
                            authorized: false,
                            authorizing: false,
                            password: ''
                        },
                        'schools-season-authorization': {
                            loading: false,
                            success: false,
                            failed: false
                        },
                        'isf-overage': {
                            loading: false,
                            success: false,
                            failed: false,
                            authorized: false,
                            authorizing: false,
                            password: ''
                        },
                        'overage': {
                            loading: false,
                            success: false,
                            failed: false,
                            authorized: false,
                            authorizing: false,
                            password: ''
                        }
                    }
                };
            },
            watch: {
                type: function () {
                    var comp = this;
                    comp.updateCaption();
                },
                isfOverAgeItems: {
                    // This will let Vue know to look inside the array
                    deep: true,

                    // We have to move our method to a handler field
                    handler: function() {
                        var comp = this;
                        comp.isfOverAgeItems.forEach(function(isfOverAgeItem) {
                            var rangeStart = utils.parseDate(isfOverAgeItem.rangeStart, '');
                            var rangeEnd = utils.parseDate(isfOverAgeItem.rangeEnd, '');
                            var error = '';
                            if (rangeStart == null || rangeEnd == null) {
                                error = 'פורמט תאריכים הוא dd/MM/yyyy';
                            } else if (rangeStart > rangeEnd) {
                                error = 'תאריך התחלה גדול מתאריך סיום';
                            }
                            isfOverAgeItem.error = error;
                        });
                        window.clearTimeout(comp.isfOverAgeTimer);
                        comp.isfOverAgeTimer = window.setTimeout(function() {
                            saveIsfOverageData(comp);
                        }, 5000);
                    }
                },
                overAgeItems: {
                    // This will let Vue know to look inside the array
                    deep: true,

                    // We have to move our method to a handler field
                    handler: function() {
                        var comp = this;
                        comp.overAgeItems.forEach(function(overAgeItem) {
                            //var rangeStart = utils.parseDate(overAgeItem.rangeStart, '');
                            var rangeEnd = utils.parseDate(overAgeItem.rangeEnd, '');
                            var error = '';
                            if (rangeEnd == null) { //rangeStart == null ||
                                error = 'פורמט תאריכים הוא dd/MM/yyyy';
                            } //else if (rangeStart > rangeEnd) {
                            //    error = 'תאריך התחלה גדול מתאריך סיום';
                            //}
                            overAgeItem.error = error;
                        });
                        window.clearTimeout(comp.overAgeTimer);
                        comp.overAgeTimer = window.setTimeout(function() {
                            saveOverageData(comp);
                        }, 5000);
                    }
                }
            },
            mounted: function () {
                var comp = this;
                if (typeof comp.type === 'undefined' || comp.type == null)
                    comp.type = 0;
                utils.readServerCache('pele-team-registration', true, function(err, peleTeamRegistrationValue) {
                    if (!err) {
                        comp.peleTeamRegistration = utils.isTrue(peleTeamRegistrationValue);
                    }
                    utils.readServerCache('schools-season-authorization', true, function(err, schoolsSeasonAuthorizationValue) {
                        if (!err) {
                            comp.schoolsSeasonAuthorization = schoolsSeasonAuthorizationValue;
                            utils.readServerCache('isf-overage', true, function(err, isfOverageRawData) {
                                if (!err) {
                                    utils.readServerCache('overage', true, function(err, overageRawData) {
                                        if (!err) {
                                            loadAllData(comp, function() {
                                                comp.originalOverageData = overageRawData;
                                                comp.originalIsfOverageData = isfOverageRawData;
                                                restoreIsfOverageData(comp, isfOverageRawData);
                                                restoreOverageData(comp, overageRawData);
                                                comp.addIsfOverageItem();
                                                comp.addOverageItem();
                                                //console.log(comp.seasons);
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            },
            methods: {
                isfOveragePasswordChange: function() {
                    var comp = this;
                    if (comp.updateStatus['isf-overage'].password === 'ISF2021') {
                        comp.updateStatus['isf-overage'].authorizing = false;
                        comp.updateStatus['isf-overage'].authorized = true;
                    }
                },
                overagePasswordChange: function() {
                    var comp = this;
                    if (comp.updateStatus['overage'].password === 'ISF2021') {
                        comp.updateStatus['overage'].authorizing = false;
                        comp.updateStatus['overage'].authorized = true;
                    }
                },
                pelePasswordChange: function() {
                    var comp = this;
                    if (comp.updateStatus['pele-team-registration'].password.toLowerCase() === 'pele2021') {
                        comp.updateStatus['pele-team-registration'].authorizing = false;
                        comp.updateStatus['pele-team-registration'].authorized = true;
                    }
                },
                toggleDownloadsPanel: function() {
                    var comp = this;
                    comp.downloadsVisible = !comp.downloadsVisible;
                },
                addIsfOverageItem: function() {
                    var comp = this;
                    comp.isfOverAgeItems.push({
                        season: -1,
                        sport: -1,
                        category: -1,
                        rangeStart: '',
                        rangeEnd: '',
                        error: ''
                    });
                },
                addOverageItem: function() {
                    var comp = this;
                    comp.overAgeItems.push({
                        season: -1,
                        sport: -1,
                        category: -1,
                        rangeStart: '',
                        rangeEnd: '',
                        error: ''
                    });
                },
                removeIsfOverageItem: function(index) {
                    var comp = this;
                    if (index >= 0 && index < (comp.isfOverAgeItems.length - 1)) {
                        comp.isfOverAgeItems.splice(index, 1);
                    }
                },
                removeOverageItem: function(index) {
                    var comp = this;
                    if (index >= 0 && index < (comp.overAgeItems.length - 1)) {
                        comp.overAgeItems.splice(index, 1);
                    }
                },
                updateCaption: function () {
                    var caption = "הגדרות כלליות";
                    var comp = this;
                    if (comp.type != null && comp.type > 0) {
                        var matchingType = comp.types.find(function(t) {
                            return t.value == comp.type;
                        })
                        if (matchingType != null) {
                            caption += ' - ' + matchingType.caption;
                        }
                    }
                    comp.caption = caption;
                },
                peleTeamRegistrationChanged: function() {
                    var comp = this;
                    updateServerCache(comp, 'pele-team-registration', comp.peleTeamRegistration);
                },
                schoolsSeasonAuthorizationChanged: function() {
                    var comp = this;
                    var rawValue = comp.schoolsSeasonAuthorization;
                    var cacheValue = '';
                    if (rawValue.length > 0) {
                        while (rawValue.indexOf(', ') >= 0)
                            rawValue = rawValue.replace(', ', ',');
                        cacheValue = rawValue.split(',').map(function(rawSymbol) {
                            return parseInt(rawSymbol, 10);
                        }).filter(function(symbol) {
                            return !isNaN(symbol) && symbol > 0;
                        }).join(',');
                    }
                    updateServerCache(comp, 'schools-season-authorization', cacheValue);
                },
                isItemVisible: function (item) {
                    var comp = this;
                    if (item.hasOwnProperty('season') && comp.filters.season > 0) {
                        var itemSeason = item['season'];
                        return itemSeason == comp.filters.season;
                    }
                    return true;
                }
            }
        });

        return GeneralSettingsComponent;
    }
);
