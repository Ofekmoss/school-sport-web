define(["templates/finance", "utils", "dialog", "services/access", "consts", "views", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts, Views) {
        function readSeasons(comp, callback) {
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            comp.seasons.splice(0, comp.seasons.length);
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                // console.log(resp.body);
                comp.seasons = resp.body.map(function (season) {
                    return {
                        id: season.Id,
                        name: season.Name
                    };
                });
                Vue.http.get('/api/v2/cache?key=season').then(function (resp) {
                    var cachedSeason = resp.body.Value;
                    if (cachedSeason != null) {
                        comp.season = cachedSeason;
                    } else if (Access.user.season) {
                        comp.season = Access.user.season;
                    }
                    callback();
                }, function(err) {
                    callback();
                });
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        function sportChanged(comp) {
            if (comp.sport === true || comp.sport === 'true') {
                //special case...
                comp.sport = null;
            }
            if (!comp.mounting || (comp.mounting &&  comp.sport != null)) {
                var gotSport = comp.sport != null;
                comp.championships = [];
                comp.championship = null;
                comp.accounts.forEach(function(account) {
                    var show = true;
                    var matchingSport = null;
                    if (gotSport) {
                        if (account.sports != null) {
                            matchingSport = account.sports.find(function (sport) {
                                return sport.id == comp.sport;
                            });
                            show = matchingSport != null;
                        }
                    }
                    account.hidden = !show;
                    if (matchingSport == null) {
                        account.totalAmount = account.originalTotalAmount;
                        account.paidAmount = account.originalPaidAmount;
                        account.remainingAmount = account.originalRemainingAmount;
                    } else {
                        account.totalAmount = matchingSport.totalAmount;
                        account.paidAmount = matchingSport.paidAmount;
                        account.remainingAmount = matchingSport.remainingAmount;
                        if (matchingSport.championships != null) {
                            matchingSport.championships.forEach(function(championship) {
                                comp.championships.push(championship);
                            });
                        }
                    }
                });
                comp.updateCaption();
                comp.championships = utils.distinctArray(comp.championships, 'id');
            }
        }

        function removeUnusedRegions(comp) {
            if (comp.region == null) {
                var usedRegions = {};
                comp.accounts.forEach(function (account) {
                    usedRegions[account.region.id.toString()] = true;
                });
                comp.regions = comp.allRegions.filter(function (region) {
                    return usedRegions[region.id] === true;
                });
            }
        }

        function readRegions(comp, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            comp.regions = [];
            Vue.http.get('/api/v2/manage/regions').then(function (resp) {
                // console.log(resp.body);
                comp.regions = resp.body.map(function (region) {
                    return {
                        id: region.Id,
                        name: region.Name
                    };
                });
                comp.allRegions = [];
                for (var i = 0; i < comp.regions.length; i++)
                    comp.allRegions.push(comp.regions[i]);
                if (Access.user.region) {
                    comp.region = Access.user.region;
                }
                callback();
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        function readSports(comp) {
            comp.sports = [];
            //comp.sport = null;
            var sportMapping = {};
            comp.accounts.forEach(function(account) {
                if (account.sports) {
                    account.sports.forEach(function(sport) {
                        var key = sport.id.toString();
                        if (!sportMapping[key]) {
                            comp.sports.push(sport);
                            sportMapping[key] = true;
                        }
                    });
                }
            });
            comp.sports.sort(function(s1, s2) {
                return s1.name.localeCompare(s2.name);
            });
        }

        function readAccounts(comp, callback) {
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            //comp.accounts.splice(0, comp.accounts.length);
            comp.accounts = [];
            var filters = [];
            if (comp.type != null && comp.type != 'true')
                filters.push('type=' + comp.type);
            if (comp.region != null)
                filters.push('region=' + comp.region);
            if (comp.season != null)
                filters.push('season=' + comp.season);
            var query = filters.length > 0 ? '?' + filters.join('&') : '';
            Vue.http.get('/api/v2/finance/accounts' + query).then(function (resp) {
                // console.log(resp.body);
                comp.accounts = [];
                for (var i = 0; i < resp.body.length; i++) {
                    var account = resp.body[i];
                    account.green = account.remainingAmount === 0;
                    account.selected = false;
                    account.originalTotalAmount = account.totalAmount;
                    account.originalPaidAmount = account.paidAmount;
                    account.originalRemainingAmount = account.remainingAmount;
                    comp.accounts.push(account);
                }
                if (comp.mounting) {
                    removeUnusedRegions(comp);
                }
                readSports(comp);
                utils.autoSelect();
                comp.accounts.sort(function(a1, a2) {
                    var r1 = a1.region.name;
                    var r2 = a2.region.name;
                    if (r1 === r2) {
                        var c1 = a1.city == null ? 'תתת' : a1.city.name;
                        var c2 = a2.city == null ? 'תתת' : a2.city.name;
                        if (c1 === c2) {
                            return a1.name.localeCompare(a2.name);
                        }
                        return c1.localeCompare(c2);
                    }
                    return r1.localeCompare(r2);
                });
                if (comp.mounting) {
                    sportChanged(comp);
                }
                callback();
            }, function (err) {
                comp.accounts = [];
                console.log(err);
                callback();
            });
        }

        var FinanceAccountsComponent = Vue.extend({
            template: templates["accounts"],
            props: {
                region: {},
                sport: {},
                type: {}
            },
            data: function () {
                return {
                    tabName: "כספים",
                    caption: 'חשבונות',
                    image: 'img/finance.svg',
                    user: Access.user,
                    accounts: [],
                    columns: [
                        {
                            key: 'name',
                            name: 'שם חשבון',
                            active: true
                        },
                        {
                            key: 'region.name',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'school.symbol',
                            name: 'סמל בית ספר',
                            active: true,
                            getter: function (account) {
                                var symbol = account.school ? parseInt(account.school.symbol, 10) : 0;
                                return isNaN(symbol) || symbol === 0 ? '' : symbol;
                            }
                        },
                        {
                            key: 'city.name',
                            name: 'רשות',
                            active: true
                        },
                        {
                            key: 'totalAmount',
                            name: 'סכום',
                            active: true
                        },
                        {
                            key: 'paidAmount',
                            name: 'שולם',
                            active: true
                        },
                        {
                            key: 'remainingAmount',
                            name: 'נותר לתשלום',
                            active: true
                        },
                        {
                            name: 'תעודות חיוב',
                            key: 'paymentRequests',
                            type: 'button',
                            active: true,
                            onclick: this.showPaymentRequests,
                            checkDisabled: function(account, index) {
                                return account.paymentRequestCount == 0;
                            },
                            getText: function(account, index) {
                                var text = 'תעודות חיוב';
                                if (account.paymentRequestCount > 0) {
                                    text += ' (' + account.paymentRequestCount + ')';
                                }
                                return text;
                            },
                            getter: function (account) {
                                return account.paymentRequestCount;
                            }
                        },
                        {
                            name: 'קבלות',
                            key: 'receipts',
                            type: 'button',
                            active: true,
                            onclick: this.showReceipts,
                            checkDisabled: function(account, index) {
                                return account.receiptCount == 0;
                            },
                            getText: function(account, index) {
                                var text = 'קבלות';
                                if (account.receiptCount > 0) {
                                    text += ' (' + account.receiptCount + ')';
                                }
                                return text;
                            },
                            getter: function (account) {
                                return account.receiptCount;
                            }
                        }
                    ],
                    searchText: "",
                    selectedRows: [],
                    regions: [],
                    allRegions: [],
                    userRegion: null,
                    season: null,
                    seasons: [],
                    city: null,
                    cities: [],
                    sports: [],
                    championship: null,
                    championships: [],
                    category: null,
                    categories: [],
                    mounting: null,
                    types: utils.removeProjects(consts.sportTypes)
                };
            },
            mounted: function () {
                this.userRegion = Access.user.region;
                var comp = this;
                comp.mounting = true;
                readSeasons(comp, function() {
                    readRegions(comp, function() {
                        utils.autoSelect();
                        readAccounts(comp, function() {
                            comp.mounting = false;
                            comp.updateCaption();
                        });

                    });
                });
            },
            watch: {
                type: function() {
                    var comp = this;
                    if (comp.type === true || comp.type === 'true') {
                        //special case...
                        comp.type = null;
                    }
                    if (!comp.mounting) {
                        readAccounts(comp, function() {
                            comp.updateCaption();
                        });
                    }
                },
                region: function () {
                    var comp = this;
                    if (comp.region === true || comp.region === 'true') {
                        //special case...
                        comp.region = null;
                    }
                    if (!comp.mounting) {
                        readAccounts(comp, function() {
                            comp.cities = [];
                            comp.city = null;
                            if (comp.region != null) {
                                var cityMapping = {};
                                comp.accounts.forEach(function(account) {
                                    if (account.city != null) {
                                        cityMapping[account.city.id.toString()] = account.city;
                                    }
                                });
                                for (var rawCityId in cityMapping) {
                                    var city = cityMapping[rawCityId];
                                    comp.cities.push({
                                        id:  city.id,
                                        name: city.name
                                    });
                                }
                                comp.cities.sort(function(c1, c2) {
                                    return c1.name.localeCompare(c2.name);
                                });
                            }
                            sportChanged(comp);
                            comp.updateCaption();
                        });
                    } else {
                        comp.updateCaption();
                    }
                },
                season: function () {
                    var comp = this;
                    if (!comp.mounting) {
                        Vue.http.post('/api/v2/cache', {
                            key: 'season',
                            value: comp.season
                        });
                        utils.autoSelect();
                        readAccounts(comp, function () {
                            sportChanged(comp);
                            removeUnusedRegions(comp);
                        });
                    }
                },
                city: function () {
                    var comp = this;
                    if (!comp.mounting) {
                        var gotCity = comp.city != null;
                        comp.accounts.forEach(function(account) {
                            var show = true;
                            if (gotCity) {
                                if (account.city != null) {
                                    show = account.city.id == comp.city;
                                }
                            }
                            account.hidden = !show;
                        });
                    }
                },
                sport: function() {
                    sportChanged(this);
                },
                championship: function() {
                    var comp = this;
                    if (comp.sport == null) {
                        //nothing to do
                        return;
                    }
                    if (!comp.mounting) {
                        var gotChampionship = comp.championship != null;
                        comp.categories = [];
                        comp.category = null;
                        comp.accounts.forEach(function(account) {
                            var matchingSport = account.sports.find(function (sport) {
                                return sport.id == comp.sport;
                            });
                            var matchingChampionship = null;
                            var hidden = false;
                            if (matchingSport != null) {
                                if (gotChampionship) {
                                    if (matchingSport.championships != null) {
                                        matchingChampionship = matchingSport.championships.find(function (championship) {
                                            return championship.id == comp.championship;
                                        });
                                        hidden = matchingChampionship == null;
                                    }
                                }
                            } else {
                                hidden = true;
                            }
                            account.hidden = hidden;
                            if (matchingChampionship == null) {
                                if (matchingSport != null) {
                                    account.totalAmount = matchingSport.totalAmount;
                                    account.paidAmount = matchingSport.paidAmount;
                                    account.remainingAmount = matchingSport.remainingAmount;
                                }
                            } else {
                                account.totalAmount = matchingChampionship.totalAmount;
                                account.paidAmount = matchingChampionship.paidAmount;
                                account.remainingAmount = matchingChampionship.remainingAmount;
                                if (matchingChampionship.categories != null) {
                                    matchingChampionship.categories.forEach(function(category) {
                                        comp.categories.push(category);
                                    });
                                }
                            }
                        });
                        comp.categories = utils.distinctArray(comp.categories, 'id');
                    }
                },
                category: function() {
                    var comp = this;
                    if (comp.sport == null || comp.championship == null) {
                        //nothing to do
                        return;
                    }
                    if (!comp.mounting) {
                        var gotCategory = comp.category != null;
                        comp.accounts.forEach(function(account) {
                            var matchingSport = account.sports.find(function (sport) {
                                return sport.id == comp.sport;
                            });
                            var matchingChampionship = matchingSport == null ? null :
                                matchingSport.championships.find(function (championship) {
                                    return championship.id == comp.championship;
                                });
                            var matchingCategory = null;
                            var hidden = false;
                            if (matchingSport != null && matchingChampionship != null) {
                                if (gotCategory) {
                                    if (matchingChampionship.categories != null) {
                                        matchingCategory = matchingChampionship.categories.find(function (category) {
                                            return category.id == comp.category;
                                        });
                                        hidden = matchingCategory == null;
                                    }
                                }
                            } else {
                                hidden = true;
                            }
                            account.hidden = hidden;
                            if (matchingCategory == null) {
                                if (matchingChampionship != null) {
                                    account.totalAmount = matchingChampionship.totalAmount;
                                    account.paidAmount = matchingChampionship.paidAmount;
                                    account.remainingAmount = matchingChampionship.remainingAmount;
                                }
                            } else {
                                account.totalAmount = matchingCategory.totalAmount;
                                account.paidAmount = matchingCategory.paidAmount;
                                account.remainingAmount = matchingCategory.remainingAmount;
                            }
                        });
                    }
                }
            },
            methods: {
                handleSelectionChange: function () {
                    this.selectedRows = this.accounts.filter(function(account) {
                        return account.selected == true;
                    });
                },
                handleSearchChange: function() {
                    this.$forceUpdate();
                },
                sumAll: function(propertyName) {
                    var comp = this;
                    return utils.sumDataRows(comp.accounts, propertyName, comp.selectedRows.length);
                },
                updateCaption: function () {
                    var comp = this;
                    var caption = 'חשבונות';
                    var season = utils.findById(comp.seasons, comp.season);
                    var region = utils.findById(comp.regions, comp.region);
                    var sport = utils.findById(comp.sports, comp.sport);
                    if (season != null) {
                        caption += ' - ' + season.name;
                    }
                    if (region != null) {
                        caption += ' - ' + region.name;
                    }
                    if (sport != null) {
                        caption += ' - ' + sport.name;
                    }
                    comp.caption = caption;
                },
                logout: function() {
                    Access.logout();
                },
                showPaymentRequests: function(account, index) {
                    Views.openView('finance/payment-requests', {account: account.id});
                },
                showReceipts: function(account, index) {
                    Views.openView('finance/receipts', {account: account.id});
                }
            }
        });

        return FinanceAccountsComponent;
    });