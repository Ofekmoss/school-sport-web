define(["templates/finance", "utils", "dialog", "services/access", "consts", "views", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts, Views) {
        function readRegions(comp, callback) {
            if (typeof callback === 'undefined')
                callback = new Function();
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

        function applyExtraFilters(comp, charges) {
            function getMatchingItems(entityPropertyName, extraProperties) {
                if (typeof extraProperties === 'undefined' || extraProperties == null)
                    extraProperties = [];
                var items = [];
                var mapping = {};
                charges.forEach(function(charge) {
                    var currentItem = charge[entityPropertyName];
                    if (currentItem != null && currentItem.id > 0) {
                        mapping[currentItem.id.toString()] = currentItem;
                    }
                });
                for (var rawId in mapping) {
                    var curItem = mapping[rawId];
                    var item = {
                        id:  curItem.id,
                        name: curItem.name
                    };
                    extraProperties.forEach(function(extraProperty) {
                        item[extraProperty] = curItem[extraProperty];
                    });
                    items.push(item);
                }
                items.sort(function(i1, i2) {
                    return i1.name.localeCompare(i2.name);
                });
                return items;
            }
            if (typeof charges === 'undefined' || charges == null)
                charges = comp.charges;
            comp.accounts = getMatchingItems('account', ['region']);
            comp.sports = getMatchingItems('sport');
            comp.chargeChampionships = [];
            var sportId = parseInt(comp.sport, 10);
            if (!isNaN(sportId) && sportId > 0) {
                comp.chargeChampionships = getMatchingItems('championship', ['sport']).filter(function(champ) {
                    return champ.sport == sportId;
                });
            }
            comp.chargeCategories = [];
            var championshipId = parseInt(comp.championship, 10);
            if (!isNaN(championshipId) && championshipId > 0) {
                comp.chargeCategories = getMatchingItems('category', ['championship']).filter(function(category) {
                    return category.championship == championshipId;
                });
            }
        }

        function extractAccountId(comp) {
            if (comp.account == null)
                return 0;
            if (comp.account.id)
                return parseInt(comp.account.id, 10);
            return parseInt(comp.account, 10);
        }

        function readCharges(comp, callback) {
            function applyCharges(charges) {
                comp.charges = charges;
                utils.autoSelect();
                callback();
            }

            if (typeof callback === 'undefined')
                callback = new Function();
            comp.charges = [];
            var accountId = extractAccountId(comp);
            if (accountId != null && accountId > 0 && comp.unlimitedDateRange) {
                Vue.http.get('/api/v2/finance/charges?account=' + accountId).then(function (resp) {
                    var charges = [];
                    for (var i = 0; i < resp.body.length; i++) {
                        var charge = resp.body[i];
                        charge.selected = false;
                        charge.totalCharge = parseInt(charge.totalCharge, 10);
                        charges.push(charge);
                    }
                    applyCharges(charges);
                }, function (err) {
                    comp.charges = [];
                    console.log(err);
                    callback();
                });
            } else {
                var basicFilterFields = ['region', 'type'];
                var fullFilterFields = ['region', 'type', 'sport', 'championship', 'category'];
                if (comp.dateRange.start == null) {
                    window.setTimeout(function() {
                        readCharges(comp, callback);
                    }, 200);
                    return;
                }
                var rangeQuery = 'start=' + utils.formatDate(comp.dateRange.start, 'YYYY-MM-DD') +
                    '&end=' + utils.formatDate(comp.dateRange.end, 'YYYY-MM-DD');
                var query = utils.buildQuerystringByFilters(comp, basicFilterFields);
                query += query.length === 0 ? '?' : '&';
                query += rangeQuery;
                Vue.http.get('/api/v2/finance/charges' + query).then(function (resp) {
                    var charges = [];
                    for (var i = 0; i < resp.body.length; i++) {
                        var charge = resp.body[i];
                        charge.selected = false;
                        charge.totalCharge = parseInt(charge.totalCharge, 10);
                        charges.push(charge);
                    }
                    applyExtraFilters(comp, charges);
                    if (accountId <= 0)
                        accountId = null;
                    var fullQuery = utils.buildQuerystringByFilters(comp, fullFilterFields);
                    fullQuery += fullQuery.length === 0 ? '?' : '&';
                    fullQuery += rangeQuery;
                    if (accountId != null || fullQuery.length > query.length) {
                        var accountParam = accountId != null ? '&account=' + accountId : '';
                        fullQuery += accountParam;
                        charges = [];
                        Vue.http.get('/api/v2/finance/charges' + fullQuery).then(function (resp) {
                            for (var i = 0; i < resp.body.length; i++) {
                                var charge = resp.body[i];
                                charge.selected = false;
                                charge.totalCharge = parseInt(charge.totalCharge, 10);
                                charges.push(charge);
                            }
                            applyCharges(charges);
                        });
                    } else {
                        applyCharges(charges);
                    }
                }, function (err) {
                    comp.charges = [];
                    console.log(err);
                    callback();
                });
            }
        }

        var FinanceChargesComponent = Vue.extend({
            template: templates["charges"],
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
                    caption: 'חיובים',
                    image: 'img/finance.svg',
                    user: Access.user,
                    charges: [],
                    columns: [
                        {
                            key: 'id',
                            name: 'זיהוי',
                            active: false
                        },
                        {
                            key: 'date',
                            name: 'תאריך',
                            type: 'date',
                            active: true
                        },
                        {
                            key: 'account.name',
                            name: 'חשבון',
                            active: true
                        },
                        {
                            key: 'school.symbol',
                            name: 'סמל בית ספר',
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
                            key: 'totalCharge',
                            name: 'סכום לחיוב',
                            active: true
                        },
                        {
                            key: 'product.name',
                            name: 'סוג חיוב',
                            active: true
                        },
                        {
                            key: 'sport.name',
                            name: 'ענף',
                            active: true
                        },
                        {
                            key: 'championship.name',
                            name: 'אליפות',
                            active: true
                        },
                        {
                            key: 'category.name',
                            name: 'קטגורייה',
                            active: true
                        },
                        {
                            key: 'order',
                            name: 'תעודת חיוב',
                            type: "documentNumber",
                            active: true
                        }
                    ],
                    searchText: "",
                    selectedRows: [],
                    regions: [],
                    allRegions: [],
                    userRegion: null,
                    accounts: [],
                    initialAccount: null,
                    city: null,
                    cities: [],
                    mounting: null,
                    sports: [],
                    chargeChampionships: [],
                    chargeCategories: [],
                    defaultStart: null,
                    defaultEnd: null,
                    cachedDateRange: false,
                    dateRange: {
                        start: null,
                        end: null
                    },
                    types: utils.removeProjects(consts.sportTypes),
                    selectedRowCount: 0,
                    newEntityText: 'הוספת חיוב',
                    deleting: false,
                    deleteFailed: false,
                    unlimitedDateRange: false
                };
            },
            mounted: function () {
                var comp = this;
                comp.userRegion = Access.user.region;
                if (comp.account === true || comp.account === 'true') {
                    //special case...
                    comp.account = '-1';
                }
                comp.mounting = true;
                comp.defaultEnd = new Date();
                comp.defaultStart = new Date(comp.defaultEnd.getTime());
                comp.defaultStart.setFullYear(comp.defaultStart.getFullYear() - 1);
                Vue.http.get('/api/v2/cache?key=charges-date-range').then(function (resp) {
                    var cachedRange = resp.body.Value;
                    if (cachedRange == 'UNLIMITED') {
                        if (comp.account == null) {
                            comp.resetDateRange();
                        } else {
                            comp.unlimitedDateRange = true;
                        }
                    } else {
                        if (cachedRange != null && cachedRange.length > 0) {
                            var parts = cachedRange.split(' - ');
                            if (parts.length === 2) {
                                var rawStart = parseInt(parts[0], 10);
                                var rawEnd = parseInt(parts[1], 10);
                                if (!isNaN(rawStart) && rawStart > 0 && !isNaN(rawEnd) && rawEnd > rawStart) {
                                    comp.dateRange.start = new Date(rawStart);
                                    comp.dateRange.end = new Date(rawEnd);
                                    comp.cachedDateRange = true;
                                }
                            }
                        }
                        if (comp.dateRange.end == null) {
                            comp.dateRange.start = comp.defaultStart;
                            comp.dateRange.end = comp.defaultEnd;
                        }
                    }
                });
                readRegions(comp, function () {
                    utils.autoSelect();
                    utils.filters.checkInitialSport(comp, readCharges, function () {
                        comp.mounting = false;
                        comp.updateCaption();
                    });
                });
            },
            watch: {
                region: function () {
                    utils.filters.regionChanged(this, this.charges, readCharges);
                },
                city: function () {
                    utils.filters.cityChanged(this, this.charges);
                },
                account: function () {
                    if (this.unlimitedDateRange && this.account == null) {
                        this.resetDateRange();
                    } else {
                        utils.filters.accountChanged(this, this.charges, readCharges);
                    }
                },
                type: function() {
                    utils.filters.typeChanged(this, readCharges);
                },
                sport: function() {
                    utils.filters.sportChanged(this, readCharges);
                },
                championship: function() {
                    utils.filters.championshipChanged(this, readCharges);
                },
                category: function() {
                    utils.filters.categoryChanged(this, readCharges);
                }
            },
            methods: {
                resetDateRange: function() {
                    var comp = this;
                    comp.dateRange.start = comp.defaultStart;
                    comp.dateRange.end = comp.defaultEnd;
                    comp.unlimitedDateRange = false;
                    comp.cachedDateRange = false;
                    Vue.http.post('/api/v2/cache', {
                        key: 'charges-date-range',
                        value: ''
                    });
                    comp.account = null;
                    comp.sport = null;
                    comp.championship = null;
                    comp.category = null;
                    readCharges(comp, function() {
                        comp.updateCaption();
                    });
                },
                handleSelectionChange: function () {
                    utils.handleSelectionChange(this, this.charges);
                },
                handleSearchChange: function() {
                    this.$forceUpdate();
                },
                updateCaption: function () {
                    var comp = this;
                    var caption = 'חיובים';
                    if (!comp.unlimitedDateRange && comp.dateRange.start != null && comp.dateRange.end != null) {
                        caption += ' - ' + utils.formatDate(comp.dateRange.start, 'dd/mm/yy') +
                            ' עד ' + utils.formatDate(comp.dateRange.end, 'dd/mm/yy');
                    }
                    var accountId = extractAccountId(comp);
                    if (accountId > 0) {
                        var matchingAccount = comp.accounts.find(function(account) {
                            return account.id === accountId;
                        });
                        if (matchingAccount != null) {
                            caption += ' - ' + matchingAccount.name;
                        }
                        if (comp.unlimitedDateRange) {
                            caption += ' - ללא הגבלת זמן';
                        }
                    } else {
                        var mapping ={
                            'championships': 'chargeChampionships',
                            'categories': 'chargeCategories'
                        };
                        var extra = utils.filters.buildCaption(comp, mapping);
                        if (extra.length > 0)
                            caption += ' - ' + extra.join(' - ');
                    }
                    comp.caption = caption;
                },
                logout: function() {
                    Access.logout();
                },
                getAccountId: function() {
                    return extractAccountId(this);
                },
                sumAll: function() {
                    var comp = this;
                    return utils.sumDataRows(comp.charges, 'totalCharge', comp.selectedRows.length);
                },
                dateDisplay: function(date) {
                    return utils.formatDate(date);
                },
                generateReceipt: function() {
                    var comp  = this;
                    if (comp.selectedRows.length === 0) {
                        console.log('No selected charge');
                        return;
                    }
                    if (comp.selectedRows.length > 1) {
                        console.log('More than one charge selected');
                        return;
                    }
                    var selectedCharge = comp.selectedRows[0];
                    var matchingAccount = selectedCharge.account;
                    if (matchingAccount == null) {
                        console.log('No matching account');
                        return;
                    }
                    var selectedPaymentRequests = [{
                        order: selectedCharge.order
                    }];
                    selectedPaymentRequests.forEach(function(paymentRequest) {
                        paymentRequest.expanded = false;
                        paymentRequest.parsedOrder = utils.parseDocumentNumber(paymentRequest.order);
                    });
                    Dialog.open("finance/new-receipt", {
                        account: matchingAccount,
                        region: selectedCharge.region,
                        paymentRequests: selectedPaymentRequests,
                        disableClickOutside: true
                    }, function(err, receipt) {
                        if (typeof receipt !== 'undefined' && receipt != null && receipt.id) {
                            Views.openView('finance/receipts', {account: matchingAccount.id});
                        }
                    });
                },
                openDateSelection: function() {
                    var comp = this;
                    Dialog.open("general/date-range-selection", {
                        maxDaysDiff: 730,
                        startDate: comp.dateRange.start,
                        endDate: comp.dateRange.end,
                        allowUnlimited: comp.account != null
                    }, function (err, result) {
                        if (result != null) {
                            var cacheValue = '';
                            if (result.unlimited) {
                                comp.unlimitedDateRange = true;
                                cacheValue = 'UNLIMITED';
                            } else {
                                comp.dateRange.start = result.start;
                                comp.dateRange.end = result.end;
                                comp.account = null;
                                comp.sport = null;
                                comp.championship = null;
                                comp.category = null;
                                cacheValue = [comp.dateRange.start.getTime(), comp.dateRange.end.getTime()].join(' - ');
                            }
                            comp.cachedDateRange = true;
                            Vue.http.post('/api/v2/cache', {
                                key: 'charges-date-range',
                                value: cacheValue
                            });
                            readCharges(comp, function() {
                                comp.updateCaption();
                            });
                        }
                    });
                },
                editSelectedCharge: function () {
                    var comp = this;
                    if (comp.selectedRows.length < 1) {
                        console.log('no selected rows');
                        return;
                    }
                    if (comp.selectedRows.length > 1) {
                        console.log('more than one row selected');
                        return;
                    }
                    var selectedCharge = comp.selectedRows[0];
                    Dialog.open("finance/charge-dialog", {
                        id: selectedCharge.id,
                        disableClickOutside: true
                    }, function (err, result) {
                        if (err == null && result != null) {
                            comp.selectedRows = [];
                            readCharges(comp, function() {
                                comp.updateCaption();
                            });
                        }
                    });
                },
                deleteSelectedCharges: function() {
                    function deleteSingleCharge(comp, chargeIds, index) {
                        if (index >= chargeIds.length) {
                            comp.deleting = false;
                            comp.selectedRows = [];
                            return;
                        }
                        var chargeId = chargeIds[index];
                        var url = '/api/v2/finance/charge?id=' + chargeId;
                        Vue.http.delete(url).then(function (resp) {
                            comp.charges = comp.charges.filter(function(charge) {
                                return charge.id != chargeId;
                            });
                            deleteSingleCharge(comp, chargeIds, index + 1);
                        }, function(err) {
                            console.log(err);
                            comp.deleteFailed = true;
                            comp.deleting = false;
                            window.setTimeout(function() {
                                comp.deleteFailed = false;
                            }, 2500);
                        });
                    }
                    var comp = this;
                    if (comp.selectedRows.length < 1) {
                        console.log('no selected rows');
                        return;
                    }
                    if (comp.selectedRows.length > 5) {
                        console.log('can delete only up to 5 rows at a time');
                        return;
                    }
                    var caption = "מחיקת " + ((comp.selectedRows.length > 1) ? "חיובים" : "חיוב");
                    var lines = [];
                    lines.push("נא לאשר את מחיקת " + ((comp.selectedRows.length > 1) ? "החיובים הבאים:" : "החיוב הבא"));
                    comp.selectedRows.forEach(function(charge) {
                        lines.push(charge.account.name + " מתאריך " +
                            utils.formatDate(charge.date) + " על סך " + charge.totalCharge + " ש\"ח");
                    });
                    var dialogParams = {
                        caption: caption,
                        message: lines.join("<br />"),
                        alert: true,
                        confirmText: "אישור",
                        cancelText: "ביטול"
                    };
                    Dialog.open('general/message-box', dialogParams, function(err, isDelete) {
                        if (isDelete) {
                            comp.deleting = true;
                            comp.deleteFailed = false;
                            var ids = comp.selectedRows.map(function(charge) {
                                return charge.id;
                            });
                            deleteSingleCharge(comp, ids, 0);
                        }
                    });
                },
                newCharge: function() {
                    var comp = this;
                    var regionId = utils.intOrDefault(comp.region);
                    var accountId = utils.intOrDefault(comp.account);
                    if (regionId == null && accountId != null && accountId > 0) {
                        var matchingAccount = comp.accounts.find(function(account) {
                            return account.id == accountId;
                        });
                        if (matchingAccount != null) {
                            regionId = matchingAccount.region;
                        }
                    }
                    Dialog.open("finance/charge-dialog", {
                        region: regionId,
                        account: accountId,
                        disableClickOutside: true
                    }, function (err, result) {
                        if (err == null && result != null) {
                            var date = new Date(result.creationDate);
                            var year = date.getFullYear();
                            if (year >= 2000 && year < 2100) {
                                var end = new Date(date.getTime() + (1000 * 60 * 60 * 24));
                                var start = new Date(end.getTime() - (1000 * 60 * 60 * 24 * 365));
                                comp.dateRange.start = start;
                                comp.dateRange.end = end;
                                comp.selectedRows = [];
                                readCharges(comp, function() {
                                    comp.updateCaption();
                                });
                            }
                        }
                    });
                }
            }
        });

        return FinanceChargesComponent;
    });