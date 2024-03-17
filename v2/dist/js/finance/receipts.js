define(["templates/finance", "utils", "dialog", "services/access", "consts", "views", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts, Views) {
        function readSeasons(comp, callback) {
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            comp.seasons.splice(0, comp.seasons.length);
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
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

        function findById(entities, id) {
            if (id == null) {
                return null;
            } else {
                return entities.find(function(entity) {
                    return entity.id == id;
                });
            }
        }

        function removeUnusedRegions(comp) {
            if (utils.extractEntityId(comp.region) < 0) {
                var usedRegions = {};
                comp.receipts.forEach(function (receipt) {
                    usedRegions[receipt.region.id.toString()] = true;
                });
                comp.regions = comp.allRegions.filter(function (region) {
                    return usedRegions[region.id] === true;
                });
            }
        }

        function readRegions(comp, callback) {
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            comp.regions.splice(0, comp.regions.length);

            Vue.http.get('/api/v2/manage/regions').then(function (resp) {
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

        function readAccounts(comp, callback) {
            comp.accounts = [];
            var accountMapping = {};
            comp.receipts.forEach(function(receipt) {
                if (receipt.account != null) {
                    accountMapping[receipt.account.id.toString()] = receipt.account;
                }
            });
            for (var rawAccountId in accountMapping) {
                var account = accountMapping[rawAccountId];
                comp.accounts.push({
                    id:  account.id,
                    name: account.name
                });
            }
            comp.accounts.sort(function(a1, a2) {
                return a1.name.localeCompare(a2.name);
            });
            callback();
        }

        function extractAccountId(comp) {
            if (comp.account == null)
                return 0;
            if (comp.account.id)
                return parseInt(comp.account.id, 10);
            return parseInt(comp.account, 10);
        }

        function accountChanged(comp) {
            var accountId = extractAccountId(comp);
            var gotAccount = accountId > 0;
            comp.receipts.forEach(function (receipt) {
                var show = true;
                if (gotAccount) {
                    if (receipt.account != null) {
                        show = receipt.account.id == accountId;
                    }
                }
                receipt.hidden = !show;
            });
            comp.updateCaption();
        }

        function readReceipts(comp, callback) {
            function applyReceipts(receipts) {
                comp.receipts = receipts;
                comp.sports = utils.filters.readAccountSports(comp.receipts);
                //console.log(comp.receipts);
                if (comp.mounting && comp.initialAccount == null) {
                    removeUnusedRegions(comp);
                }
                readAccounts(comp, function() {
                    utils.autoSelect();
                    //comp.initialAccount = null;
                    callback();
                });
            }
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            //comp.accounts.splice(0, comp.accounts.length);
            comp.receipts = [];
            var basicFilterFields = ['region', 'season', 'type'];
            var fullFilterFields = ['region', 'season', 'type', 'sport', 'championship', 'category'];
            var query = utils.buildQuerystringByFilters(comp, basicFilterFields);
            comp.receipts = [];
            var accountId = extractAccountId(comp);
            if (accountId <= 0)
                accountId = null;
            if (accountId != null) { //comp.initialAccount != null
                if (query.length === 0)
                    query += '?';
                else
                    query += '&';
                query += 'account=' + accountId; //filters.push('account=' + accountId); //comp.initialAccount);
            }
            Vue.http.get('/api/v2/finance/receipts' + query).then(function (resp) {
                var receipts = [];
                for (var i = 0; i < resp.body.length; i++) {
                    var receipt = resp.body[i];
                    receipt.selected = false;
                    receipts.push(receipt);
                }
                comp.championships = [];
                comp.categories = [];
                var fullQuery = utils.buildQuerystringByFilters(comp, fullFilterFields);
                if (accountId != null) { //comp.initialAccount != null
                    if (fullQuery.length === 0)
                        fullQuery += '?';
                    else
                        fullQuery += '&';
                    fullQuery += 'account=' + accountId;
                }
                if (fullQuery.length > query.length) {
                    receipts = [];
                    Vue.http.get('/api/v2/finance/receipts' + fullQuery).then(function (resp) {
                        // console.log(resp.body);
                        for (var i = 0; i < resp.body.length; i++) {
                            var receipt = resp.body[i];
                            receipt.selected = false;
                            receipts.push(receipt);
                        }
                        applyReceipts(receipts);
                    });
                } else {
                    applyReceipts(receipts);
                }
            }, function (err) {
                comp.receipts = [];
                console.log(err);
                callback();
            });
        }

        var FinanceReceiptsComponent = Vue.extend({
            template: templates["receipts"],
            props: {
                region: {},
                account: {},
                sport: {},
                type: {},
                championship: {},
                category: {}
            },
            data: function () {
                var comp = this;
                return {
                    tabName: "כספים",
                    caption: 'קבלות',
                    image: 'img/finance.svg',
                    user: Access.user,
                    receipts: [],
                    columns: [
                        {
                            key: 'number',
                            name: 'מספר',
                            active: true
                        },
                        {
                            key: 'account.name',
                            name: 'חשבון',
                            active: true
                        },
                        {
                            key: 'region.name',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'city.name',
                            name: 'רשות',
                            active: false
                        },
                        {
                            key: 'sum',
                            name: 'סכום',
                            active: true
                            //getter: function(record) {
                            //    return utils.filters.getAmount(comp, record, 'sum');
                            //}
                        },
                        {
                            key: 'date',
                            name: 'תאריך',
                            type: 'date',
                            active: true
                        },
                        {
                            key: 'remarks',
                            name: 'הערות',
                            active: true
                        },
                        utils.dataTableButton('תשלומים', 'paymentCount', this.showPayments),
                        utils.dataTableButton('זיכוי חשבונות', 'creditedAccounts', this.showCreditedAccounts),
                        utils.dataTableButton('תעודות חיוב', 'paymentRequests', this.showPaymentRequests)
                    ],
                    searchText: "",
                    selectedRows: [],
                    regions: [],
                    allRegions: [],
                    userRegion: null,
                    season: null,
                    seasons: [],
                    accounts: [],
                    initialAccount: null,
                    city: null,
                    cities: [],
                    mounting: null,
                    sports: [],
                    championships: [],
                    categories: [],
                    types: utils.removeProjects(consts.sportTypes),
                    selectedRowCount: 0
                };
            },
            mounted: function () {
                this.userRegion = Access.user.region;
                var comp = this;
                if (comp.account === true || comp.account === 'true') {
                    //special case...
                    comp.account = '-1';
                }
                comp.mounting = true;
                readSeasons(comp, function() {
                    readRegions(comp, function() {
                        utils.autoSelect();
                        utils.filters.checkInitialSport(comp, readReceipts, function() {
                            comp.mounting = false;
                            comp.updateCaption();
                        });
                    });
                });
            },
            watch: {
                region: function () {
                    utils.filters.regionChanged(this, this.receipts, readReceipts);
                },
                season: function () {
                    var comp = this;
                    if (!comp.mounting) {
                        Vue.http.post('/api/v2/cache', {
                            key: 'season',
                            value: comp.season
                        });
                        comp.region = -1;
                        readRegions(comp, function() {
                            utils.autoSelect();
                            readReceipts(comp, function() {
                                removeUnusedRegions(comp);
                            });
                        });
                    }
                },
                city: function () {
                    utils.filters.cityChanged(this, this.receipts);
                },
                account: function () {
                    utils.filters.accountChanged(this, this.receipts, readReceipts);
                },
                type: function() {
                    utils.filters.typeChanged(this, readReceipts);
                },
                sport: function() {
                    utils.filters.sportChanged(this, readReceipts);
                },
                championship: function() {
                    utils.filters.championshipChanged(this, readReceipts);
                },
                category: function() {
                    utils.filters.categoryChanged(this, readReceipts);
                }
            },
            methods: {
                handleSelectionChange: function () {
                    utils.handleSelectionChange(this, this.receipts);
                },
                handleSearchChange: function() {
                    this.$forceUpdate();
                },
                printReceipt: function(isPDF) {
                    var comp = this;
                    if (comp.selectedRows.length !== 1) {
                        var msg = comp.selectedRows.length === 0 ? 'לא נבחרה קבלה' : 'נבחרו מספר קבלות';
                        Dialog.open('general/message-box', {
                            caption: "שגיאה",
                            message: msg
                        });
                        return;
                    }
                    var selectedRow = comp.selectedRows[0];
                    var url = '/api/v2/finance/receipt/' + selectedRow.id + '/print';
                    if (isPDF)
                        url += '?pdf=1';
                    var w = window.open(url, '_blank');
                    w.onload = function(){
                        if (!isPDF) {
                            w.print();
                        }
                    };
                    /*
                    Dialog.open('general/message-box', {
                        caption: "קבלה " + selectedRow.number,
                        message: 'הדפסת קבלה כרגע בשלבי בנייה, תודה על הסבלנות'
                    });
                    */
                },
                sumAll: function() {
                    var comp = this;
                    return utils.sumDataRows(comp.receipts, 'sum', comp.selectedRows.length);
                    //utils.filters.sumRows(comp, comp.receipts, 'sum');
                },
                updateCaption: function () {
                    var comp = this;
                    var caption = 'קבלות';
                    var accountId = extractAccountId(comp);
                    if (accountId > 0) {
                        var matchingAccount = comp.accounts.find(function(account) {
                            return account.id === accountId;
                        });
                        if (matchingAccount != null) {
                            caption += ' - ' + matchingAccount.name;
                        }
                    } else {
                        var extra = utils.filters.buildCaption(comp);
                        if (extra.length > 0)
                            caption += ' - ' + extra.join(' - ');
                    }
                    comp.caption = caption;
                },
                logout: function() {
                    Access.logout();
                },
                showPayments: function(receipt, index) {
                    var url = '/api/v2/finance/receipt/' + receipt.id + '/payments';
                    Dialog.open('generic/data-dialog', {
                        caption: 'תשלומים עבור קבלה ' + receipt.number,
                        dataUrl: url
                    }, function () {
                    });
                },
                showCreditedAccounts: function(receipt, index) {
                    var url = '/api/v2/finance/receipt/' + receipt.id + '/credits';
                    Dialog.open('generic/data-dialog', {
                        caption: 'זיכוי חשבונות -  ' + receipt.number,
                        dataUrl: url
                    }, function () {
                    });
                },
                showPaymentRequests: function(receipt, index) {
                    var url = '/api/v2/finance/receipt/' + receipt.id + '/payment-requests';
                    var dialogCaption = 'תעודות חיוב - ' + receipt.number + ', ' + receipt.account.name;
                    Dialog.open('generic/data-dialog', {
                        caption: dialogCaption,
                        hideSearch: true,
                        dataUrl: url
                    }, function () {
                    });
                },
                getAccountId: function() {
                    return extractAccountId(this);
                }
            }
        });

        return FinanceReceiptsComponent;
    });