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

        function readRegions(comp, callback) {
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            comp.regions.splice(0, comp.regions.length);

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

        function readAccounts(comp, callback) {
            comp.accounts = [];
            var accountMapping = {};
            comp.paymentRequests.forEach(function(paymentRequest) {
                if (paymentRequest.account != null) {
                    accountMapping[paymentRequest.account.id.toString()] = paymentRequest.account;
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

        function readPaymentRequests(comp, callback) {
            function applyPaymentRequests(paymentRequests) {
                comp.paymentRequests = paymentRequests;
                comp.sports = utils.filters.readAccountSports(comp.paymentRequests);
                readAccounts(comp, function() {
                    if (comp.initialAccount != null) {
                        accountChanged(comp);
                        comp.initialAccount = null;
                    }
                    utils.autoSelect();
                    callback();
                });
            }
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();

            //wait for season...
            if (!comp.season) {
                window.setTimeout(function() {
                    readPaymentRequests(comp, callback);
                }, 100);
                return;
            }
            comp.paymentRequests.splice(0, comp.paymentRequests.length);
            var basicFilterFields = ['region', 'season', 'type'];
            var fullFilterFields = ['region', 'season', 'type', 'sport', 'championship', 'category'];
            var query = utils.buildQuerystringByFilters(comp, basicFilterFields);
            var paymentRequests = [];
            Vue.http.get('/api/v2/finance/payment-requests' + query).then(function (resp) {
                // console.log(resp.body);
                for (var i = 0; i < resp.body.length; i++) {
                    var paymentRequest = resp.body[i];
                    paymentRequest.green = paymentRequest.remainingAmount === 0;
                    paymentRequest.selected = false;
                    paymentRequests.push(paymentRequest);
                }
                comp.championships = [];
                comp.categories = [];
                var fullQuery = utils.buildQuerystringByFilters(comp, fullFilterFields);
                if (fullQuery.length > query.length) {
                    paymentRequests = [];
                    Vue.http.get('/api/v2/finance/payment-requests' + fullQuery).then(function (resp) {
                        // console.log(resp.body);
                        for (var i = 0; i < resp.body.length; i++) {
                            var paymentRequest = resp.body[i];
                            paymentRequest.green = paymentRequest.remainingAmount === 0;
                            paymentRequest.selected = false;
                            paymentRequests.push(paymentRequest);
                        }
                        applyPaymentRequests(paymentRequests);
                    });
                } else {
                    applyPaymentRequests(paymentRequests);
                }
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        function accountChanged(comp) {
            var accountId = extractAccountId(comp);
            var gotAccount = accountId > 0;
            comp.paymentRequests.forEach(function (paymentRequest) {
                var show = true;
                if (gotAccount) {
                    if (paymentRequest.account != null) {
                        show = paymentRequest.account.id === accountId;
                    }
                }
                paymentRequest.hidden = !show;
            });
            comp.toggleFiltersClicked();
            comp.updateCaption();
        }

        function extractAccountId(comp) {
            if (comp.account == null)
                return 0;
            if (comp.account.id)
                return comp.account.id;
            return parseInt(comp.account, 10);
        }

        function getMatchingAccount(comp) {
            var accountId = parseInt(comp.account, 10);
            if (isNaN(accountId) || accountId <= 0) {
                accountId = 0;
                for (var i = 0; i < comp.selectedRows.length; i++) {
                    var selectedRow = comp.selectedRows[i];
                    if (selectedRow.account) {
                        var currentId = parseInt(selectedRow.account.id, 10);
                        if (currentId != accountId) {
                            if (accountId === 0) {
                                accountId = currentId;
                            } else {
                                accountId = 0; //more than one account selected
                                break;
                            }
                        }
                    }
                }
            }
            var matchingAccount = null;
            if (!isNaN(accountId) && accountId > 0) {
                matchingAccount = comp.accounts.find(function(account) {
                    return account.id == accountId;
                });
            }
            return matchingAccount;
        }

        var PaymentRequestsComponent = Vue.extend({
            template: templates["payment-requests"],
            props: {
                account: {},
                region: {},
                sport: {},
                type: {},
                championship: {},
                category: {}
            },
            data: function () {
                var comp = this;
                return {
                    tabName: "כספים",
                    caption: 'תעודות חיוב',
                    image: 'img/finance.svg',
                    user: Access.user,
                    paymentRequests: [],
                    columns: [
                        {
                            key: 'order',
                            name: 'מספר תעודת חיוב',
                            type: "documentNumber",
                            active: true
                        },
                        {
                            key: 'account.name',
                            name: 'חשבון / גורם משלם',
                            active: true
                        },
                        {
                            key: 'region.name',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'totalAmount',
                            name: 'סכום',
                            active: true,
                            getter: function(record) {
                                return utils.filters.getAmount(comp, record, 'totalAmount');
                            }
                        },
                        {
                            key: 'time',
                            name: 'תאריך יצירה',
                            type: 'date',
                            active: true
                        },
                        {
                            key: 'paidAmount',
                            name: 'שולם',
                            active: true,
                            getter: function(record) {
                                return utils.filters.getAmount(comp, record, 'paidAmount');
                            }
                        },
                        {
                            key: 'remainingAmount',
                            name: 'נותר לתשלום',
                            active: true,
                            getter: function(record) {
                                return utils.filters.getAmount(comp, record, 'remainingAmount');
                            }
                        }
                        /*,
                        {
                            key: "order",
                            name: 'צפייה בתעודת חיוב',
                            type: 'openFile',
                            active: true
                        }*/
                    ],
                    searchText: "",
                    isSelectAll: false,
                    selectedRows: [],
                    regions: [],
                    allRegions: [],
                    userRegion: null,
                    season: null,
                    seasons: [],
                    mounting: null,
                    accounts: [],
                    initialAccount: null,
                    sports: [],
                    championships: [],
                    categories: [],
                    types: utils.removeProjects(consts.sportTypes),
                    filtersOpen: false,
                    toggleFilterTimer: 0
                };
            },
            mounted: function () {
                var comp = this;
                comp.userRegion = Access.user.region;
                comp.mounting = true;
                //sanity check
                if (comp.sport == null && comp.championship != null)
                    comp.championship = null;
                if (comp.championship == null && comp.category != null)
                    comp.category = null;
                readSeasons(comp, function() {
                    readRegions(comp, function() {
                        utils.filters.checkInitialSport(comp, readPaymentRequests, function() {
                            comp.mounting = false;
                            comp.updateCaption();
                        });
                    });
                });
            },
            watch: {
                region: function () {
                    var comp = this;
                    if (!comp.mounting) {
                        readPaymentRequests(comp, function() {
                            comp.toggleFiltersClicked();
                        });
                    }
                },
                season: function () {
                    var comp = this;
                    if (!comp.mounting) {
                        readPaymentRequests(comp, function() {
                            comp.toggleFiltersClicked();
                        });
                    }
                },
                account: function() {
                    var comp = this;
                    if (comp.paymentRequests.length === 0 && comp.account != null) {
                        comp.initialAccount = comp.account;
                    } else {
                        accountChanged(comp);
                    }
                },
                type: function() {
                    utils.filters.typeChanged(this, readPaymentRequests);
                },
                sport: function() {
                    utils.filters.sportChanged(this, readPaymentRequests);
                },
                championship: function() {
                    utils.filters.championshipChanged(this, readPaymentRequests);
                },
                category: function() {
                    utils.filters.categoryChanged(this, readPaymentRequests);
                }
            },
            methods: {
                handleSelectionChange: function () {
                    var comp = this;
                    comp.selectedRows = comp.paymentRequests.filter(function(paymentRequest) {
                        return paymentRequest.selected == true;
                    });
                    comp.filtersOpen = comp.selectedRows.length === 0;
                    comp.$forceUpdate();
                },
                handleMoreInfo: function(record) {
                    Views.openView('finance/payment-request-details', {paymentRequestId: record.order});
                },
                toggleFiltersClicked: function() {
                    var comp = this;
                    comp.filtersOpen = !comp.filtersOpen;
                },
                toggleFiltersMouseOver: function() {
                    var comp = this;
                    if (comp.toggleFilterTimer)
                        window.clearTimeout(comp.toggleFilterTimer);
                    comp.toggleFilterTimer = window.setTimeout(function() {
                        comp.toggleFiltersClicked();
                    }, 5000);
                },
                toggleFiltersMouseOut: function() {
                    var comp = this;
                    if (comp.toggleFilterTimer)
                        window.clearTimeout(comp.toggleFilterTimer);
                },
                searchChanged: function() {
                    this.$forceUpdate();
                },
                sumAll: function(propertyName) {
                    var comp = this;
                    return utils.filters.sumRows(comp, comp.paymentRequests, propertyName);
                },
                updateCaption: function () {
                    var comp = this;
                    var caption = 'תעודות חיוב';
                    var accountId = extractAccountId(comp);
                    var matchingAccount = null;
                    if (accountId > 0) {
                        matchingAccount = comp.accounts.find(function (account) {
                            return account.id === accountId;
                        });
                        if (matchingAccount != null) {
                            caption += ' - ' + matchingAccount.name;
                        }
                    }
                    if (matchingAccount == null) {
                        var extra = utils.filters.buildCaption(comp);
                        if (extra.length > 0)
                            caption += ' - ' + extra.join(' - ');
                    }
                    comp.caption = caption;
                },
                editPaymentRequest: function() {
                    var comp = this;
                    if (comp.selectedRows != null && comp.selectedRows.length === 1) {
                        var selectedPaymentRequest = utils.clone(comp.selectedRows[0]);
                        selectedPaymentRequest.parsedOrder = utils.parseDocumentNumber(selectedPaymentRequest.order);
                        Dialog.open("finance/edit-payment-request", {
                            paymentRequest: selectedPaymentRequest,
                            regions: comp.regions,
                            disableClickOutside: true
                        }, function(err, resp) {
                            if (typeof resp !== 'undefined' && resp != null) {
                                //reload
                                var accountId = extractAccountId(comp);
                                if (accountId != resp.account) {
                                    //add account if doesn't exist:
                                    var existingAccount = comp.accounts.find(function(account) {
                                        return account.id == resp.account;
                                    });
                                    if (existingAccount == null) {
                                        existingAccount = {
                                            id: resp.account,
                                            name: resp.accountName
                                        };
                                        comp.accounts.push(existingAccount);
                                        comp.accounts.sort(function(a1, a2) {
                                            return a1.name.localeCompare(a2.name);
                                        });
                                    }
                                    comp.initialAccount = existingAccount;
                                    readPaymentRequests(comp);
                                    /*
                                    //remove from list:
                                    comp.paymentRequests = comp.paymentRequests.filter(function(paymentRequest) {
                                        return paymentRequest.order != selectedPaymentRequest.order;
                                    });
                                    */
                                } else {
                                    //update amount:
                                    var matchingPaymentRequest = comp.paymentRequests.find(function(paymentRequest) {
                                        return paymentRequest.order == selectedPaymentRequest.order;
                                    });
                                    matchingPaymentRequest.totalAmount = resp.totalAmount;
                                    matchingPaymentRequest.remainingAmount = matchingPaymentRequest.totalAmount - matchingPaymentRequest.paidAmount;
                                }
                            }
                        });
                    }
                },
                generateReceipt: function() {
                    var comp  = this;
                    var matchingAccount = getMatchingAccount(comp);
                    if (matchingAccount == null) {
                        console.log('No matching account');
                        return;
                    }
                    var selectedPaymentRequests = utils.clone(comp.selectedRows);
                    selectedPaymentRequests.forEach(function(paymentRequest) {
                        paymentRequest.expanded = false;
                        paymentRequest.parsedOrder = utils.parseDocumentNumber(paymentRequest.order);
                    });
                    Dialog.open("finance/new-receipt", {
                        account: matchingAccount,
                        region: selectedPaymentRequests[0].region,
                        paymentRequests: selectedPaymentRequests,
                        disableClickOutside: true
                    }, function(err, receipt) {
                        if (typeof receipt !== 'undefined' && receipt != null && receipt.id) {
                            Views.openView('finance/receipts', {account: matchingAccount.id});
                        }
                    });
                },
                receiptButtonDisabled: function() {
                    var comp = this;
                    return getMatchingAccount(comp) == null;
                },
                logout: function() {
                    Access.logout();
                }
            }
        });

        return PaymentRequestsComponent;
    });