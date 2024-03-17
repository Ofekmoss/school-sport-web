define(["templates/finance", "dialog", "utils", "components/selectex"], function (templates, Dialog, utils) {
    function readChargeDetails(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        var chargeId = parseInt(comp.charge.id, 10);
        if (!isNaN(chargeId) && chargeId > 0) {
            var url = '/api/v2/finance/charge/' + chargeId;
            Vue.http.get(url).then(function (resp) {
                var chargeData = resp.body;
                comp.account = utils.intOrDefault(chargeData.account);
                comp.paymentRequest = utils.intOrDefault(chargeData.paymentRequest);
                comp.category = utils.intOrDefault(chargeData.category);
                comp.championship = utils.intOrDefault(chargeData.championship);
                comp.charge.creationDate = utils.formatDate(chargeData.date, 'YYYY-MM-DD');
                comp.region = chargeData.region;
                comp.product = chargeData.product;
                comp.charge.sum = chargeData.sum;
                comp.season = chargeData.season;
                comp.sport = chargeData.sport;
                callback();
            }, function(err) {
                console.log(err);
                callback();
            });
        } else {
            callback();
        }
    }

    function readRegions(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        comp.regions = [];
        Vue.http.get('/api/v2/manage/regions').then(function (resp) {
            resp.body.forEach(function (region) {
                comp.regions.push({
                    id: region.Id,
                    name: region.Name
                });
            });
            callback();
        }, function (err) {
            console.log(err);
            callback();
        });
    }

    function loadAccounts(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        var region = parseInt(comp.region, 10);
        if (isNaN(region))
            region = -1;
        comp.accounts = [];
        if (!comp.mounting)
            comp.account = null;
        if (region >= 0) {
            var url = '/api/v2/finance/raw-accounts?region=' + region;
            Vue.http.get(url).then(function (resp) {
                resp.body.forEach(function (account, index) {
                    var curLabel = account.name;
                    var lookFor = ' (בית ספר)';
                    if (curLabel.indexOf(lookFor) > 0) {
                        curLabel = curLabel.replace(lookFor, '');
                        if (account.symbol)
                            curLabel += ' (סמל מוסד ' + account.symbol + ')';
                    }
                    comp.accounts.push({
                        id: account.id,
                        name: account.name,
                        label: curLabel,
                        symbol: account.symbol,
                        school: account.school
                    });
                });
                if (comp.account != null && typeof comp.account === 'number') {
                    var accountId = comp.account;
                    comp.account = comp.accounts.find(function(account) {
                        return account.id == accountId;
                    });
                }
                callback();
            });
        } else {
            callback();
        }
    }

    function loadSchools(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        comp.schools = [];
        comp.school = null;
        var regionId = parseInt(comp.region, 10);
        if (!isNaN(regionId) && regionId >= 0) {
            var existingSchoolMapping = {};
            comp.accounts.forEach(function(account) {
                if (account.school) {
                    existingSchoolMapping[account.school.toString()] = true;
                }
            });
            var url = '/api/v2/manage/schools?region=' + regionId;
            Vue.http.get(url).then(function (resp) {
                resp.body.forEach(function (school) {
                    if (!existingSchoolMapping[school.Id.toString()]) {
                        var label = school.Name + ' (סמל מוסד ' + school.Symbol + ')';
                        comp.schools.push({
                            id: school.Id,
                            name: school.Name,
                            label: label
                        });
                    }
                });
                callback();
            }, function (err) {
                console.log(err);
                callback();
            });
        } else {
            callback();
        }
    }

    function loadProducts(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        comp.products = [];
        if (!comp.mounting)
            comp.product = null;
        Vue.http.get('/api/v2/finance/products').then(function (resp) {
            resp.body.forEach(function (product) {
                comp.products.push({
                    id: product.id,
                    name: product.name,
                    price: product.price
                });
            });
            comp.products.sort(function(p1, p2) {
                return p1.name.localeCompare(p2.name);
            });
            callback();
        }, function (err) {
            console.log(err);
            callback();
        });
    }

    function loadPaymentRequests(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        comp.paymentRequests = [];
        if (!comp.mounting)
            comp.paymentRequest = null;
        Vue.http.get('/api/v2/finance/payment-requests').then(function (resp) {
            resp.body.forEach(function (paymentRequest) {
                console.log(paymentRequest);
                var id = paymentRequest.Id || paymentRequest.id;
                var curLabel = utils.ParsePaymentOrder(id);
                var payerName = paymentRequest.PayerName || paymentRequest.payerName;
                if (!payerName && paymentRequest.account != null)
                    payerName = paymentRequest.account.name;
                if (!payerName)
                    payerName = '';
                payerName = payerName.replace(' (בית ספר)', '')
                curLabel += ' (' + payerName + ')';
                comp.paymentRequests.push({
                    id: id,
                    payerName:payerName,
                    time: paymentRequest.Time || paymentRequest.time,
                    label: curLabel
                });
            });
            //console.log(comp.paymentRequests);
            //console.log('mounting? ' + comp.mounting);
            if (comp.mounting && comp.paymentRequest != null && typeof comp.paymentRequest === 'number') {
                var paymentRequestId = comp.paymentRequest;
                comp.paymentRequest = comp.paymentRequests.find(function(paymentRequest) {
                    return paymentRequest.id == paymentRequestId;
                });
            }
            callback();
        }, function (err) {
            console.log(err);
            callback();
        });
    }

    function loadSeasons(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        comp.seasons = [];
        if (!comp.mounting)
            comp.season = null;
        Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
            resp.body.forEach(function (season) {
                comp.seasons.push({
                    id: season.Id,
                    name: season.Name
                });
            });
            callback();
        }, function (err) {
            console.log(err);
            callback();
        });
    }

    function loadSports(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        comp.sports = [];
        if (!comp.mounting)
            comp.sport = null;
        var season = utils.intOrDefault(comp.season);
        if (season != null && season > 0) {
            var allSports = [];
            Vue.http.get('/api/v2/manage/sports').then(function (resp) {
                resp.body.forEach(function(sport) {
                    allSports.push({
                        id: sport.Id,
                        name: sport.Name
                    });
                });
                Vue.http.get('/api/v2/manage/category-names?season=' + season).then(function (resp) {
                    var sportMapping = {};
                    resp.body.forEach(function (categoryNameData) {
                        if (categoryNameData.Sports) {
                            categoryNameData.Sports.forEach(function(sport) {
                                sportMapping[sport.toString()] = true;
                            });
                        }
                    });
                    for (var rawSportId in sportMapping) {
                        var sportId = parseInt(rawSportId, 10);
                        var matchingSport = allSports.find(function(sport) {
                            return sport.id == sportId;
                        });
                        if (matchingSport != null) {
                            comp.sports.push({
                                id: sportId,
                                name: matchingSport.name
                            });
                        } else {
                            console.log('sport ' + sportId + ' not found');
                        }
                    }
                    comp.sports.sort(function(s1, s2) {
                        return s1.name.localeCompare(s2.name);
                    });
                    callback();
                }, function (err) {
                    console.log(err);
                    callback();
                });
            }, function (err) {
                console.log(err);
                callback();
            });
        } else {
            callback();
        }
    }

    function loadChampionships(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        var season = parseInt(comp.season, 10);
        var sport = parseInt(comp.sport, 10);
        if (isNaN(season) || season <= 0 || isNaN(sport) || sport <= 0) {
            callback();
            return;
        }
        comp.championships = [];
        if (!comp.mounting)
            comp.championship = null;
        var url = '/api/v2/manage/categories/season/' + season + '/sport/' + sport;
        comp.championshipStatus.loading = true;
        comp.championshipStatus.loaded = false;
        comp.championshipStatus.failed = false;
        Vue.http.get(url).then(function (resp) {
            resp.body.forEach(function (category) {
                var curLabel = category.Championship.Name + ' ' + category.Name;
                comp.championships.push({
                    id: category.Id,
                    name: category.Name,
                    label: curLabel
                });
            });
            if (comp.mounting && comp.category != null && typeof comp.category === 'number') {
                var categoryId = comp.category;
                comp.championship = comp.championships.find(function(championship) {
                    return championship.id == categoryId;
                });
            }
            comp.championshipStatus.loading = false;
            comp.championshipStatus.loaded = true;
            window.setTimeout(function() {
                $(".selectex").css("margin-right", "0px");
            }, 200);
            callback();
        }, function (err) {
            console.log(err);
            comp.championshipStatus.loading = false;
            comp.championshipStatus.failed = true;
            callback();
        });
    }

    var ChargeDialogComponent = Vue.extend({
        template: templates['charge-dialog'],
        data: function() {
            return  {
                expandableObjects: {
                    newAccount: false,
                    paymentRequest: false,
                    championships: false
                },
                newAccountExpanded: false,
                charge: {
                    id: null,
                    creationDate: null,
                    sum: 0,
                    new: false,
                    editing: false
                },
                chargeProgress: {
                    creating: false,
                    created: false,
                    failed: false
                },
                accounts: [],
                account: null,
                regions: [],
                region: null,
                schools: [],
                school: null,
                products: [],
                product: null,
                paymentRequests: [],
                paymentRequest: null,
                seasons: [],
                season: null,
                sports: [],
                sport: null,
                championships: [],
                championship: null,
                category: null,
                newAccount: {
                    name: null,
                    school: null
                },
                championshipStatus: {
                    loading: false,
                    loaded: false,
                    failed: false
                },
                mounting: false,
                existingAccountId: null,
                isValid: true,
                changed: false,
                confirmClosure: false,
                overrideInvalidChargeReason: null,
                removeChampionship: false,
                removePaymentRequest: false,
                initialChampionship: null,
                initialPaymentRequest: null
            };
        },
        mounted: function() {
            function checkInitialPaymentRequest(comp, callback) {
                if (comp.paymentRequest != null && comp.paymentRequest > 0) {
                    comp.togglePaymentRequestsPanel(callback);
                } else {
                    callback();
                }
            }

            function checkInitialChampionship(comp, callback) {
                if (comp.category != null && comp.category > 0) {
                    comp.toggleChampionshipsPanel(callback);
                } else {
                    callback();
                }
            }

            function stopMounting(comp) {
                window.setTimeout(function () {
                    comp.mounting = false;
                    comp.$forceUpdate();
                }, 500);
            }

            var comp = this;
            for (var key in comp.charge) {
                if (comp.charge.hasOwnProperty(key) && comp[key] != null) {
                    comp.charge[key] = comp[key];
                }
            }
            if (comp.charge.creationDate == null)
                comp.charge.creationDate = new Date();
            comp.charge.creationDate = utils.formatDate(comp.charge.creationDate, 'YYYY-MM-DD');
            if (comp.charge.id != null) {
                comp.charge.id = utils.intOrDefault(comp.charge.id);
            }
            comp.charge.new = comp.charge.id == null || comp.charge.id <= 0;
            comp.charge.editing = comp.charge.id != null || comp.charge.id > 0;
            comp.mounting = true;
            readChargeDetails(comp, function() {
                readRegions(comp, function() {
                    loadAccounts(comp, function() {
                        loadSchools(comp, function() {
                            loadProducts(comp, function() {
                                checkInitialPaymentRequest(comp, function() {
                                    checkInitialChampionship(comp, function() {
                                        comp.initialChampionship = comp.championship;
                                        comp.initialPaymentRequest = comp.paymentRequest;
                                        stopMounting(comp);
                                    });
                                });
                            });
                        });
                    });
                });
            });
            window.setTimeout(function() {
                $(".selectex").css("margin-right", "0px");
                $(".selectex").css("width", "85%");
            }, 200);
        },
        methods: {
            toggleExpanded: function(objectOrName) {
                var comp = this;
                var expanded = null;
                if (typeof objectOrName === 'string') {
                    var objectName = objectOrName;
                    expanded = !comp.expandableObjects[objectName];
                    comp.expandableObjects[objectName] = expanded;
                } else if (objectOrName != null) {
                    expanded = !objectOrName.expanded;
                    objectOrName.expanded = expanded;
                }
                return expanded;
            },
            isExpanded: function(objectName) {
                return this.expandableObjects[objectName] === true;
            },
            togglePaymentRequestsPanel: function(callback) {
                if (typeof callback === 'undefined' || callback == null)
                    callback = new Function();
                var comp = this;
                var expanded = comp.toggleExpanded('paymentRequest');
                if (expanded) {
                    if (comp.paymentRequests.length === 0) {
                        loadPaymentRequests(comp, callback);
                    } else {
                        callback();
                    }
                    window.setTimeout(function() {
                        $(".selectex").css("margin-right", "0px");
                    }, 200);
                } else {
                    callback();
                }
            },
            toggleChampionshipsPanel: function(callback) {
                if (typeof callback === 'undefined' || callback == null)
                    callback = new Function();
                var comp = this;
                var expanded = comp.toggleExpanded('championships');
                if (expanded && comp.seasons.length === 0) {
                    loadSeasons(comp, function() {
                        loadSports(comp, function() {
                            if (comp.mounting && comp.category != null && comp.category > 0) {
                                loadChampionships(comp, callback);
                            } else {
                                callback();
                            }
                        });
                    });
                } else {
                    callback();
                }
            },
            resetSeason: function() {
                var comp = this;
                comp.season = null;
            },
            resetSport: function() {
                var comp = this;
                comp.sport = null;
            },
            chargeInvalidReason: function() {
                var comp = this;
                if (comp.overrideInvalidChargeReason != null)
                    return comp.overrideInvalidChargeReason;
                if (comp.product == null || comp.product <= 0)
                    return 'יש לבחור סוג חיוב';
                if (!utils.isValidDate(comp.charge.creationDate))
                    return 'יש להזין תאריך יצירת חיוב';
                if (comp.charge.sum <= 0)
                    return 'יש להזין סכום לחיוב';
                if (comp.region == null || comp.region < 0)
                    return 'יש לבחור מחוז';
                if (comp.newAccountExpanded) {
                    var matchingAccount;
                    var newAccountSchool = comp.newAccount.school;
                    if (newAccountSchool != null) {
                        matchingAccount = comp.accounts.find(function(account) {
                            return account.school == newAccountSchool.id;
                        });
                        if (matchingAccount != null) {
                            comp.existingAccountId = matchingAccount.id;
                            return 'כבר קיים חשבון עבור בית ספר זה';
                        }
                    }
                    var newName = (comp.newAccount.name || '').trim();
                    if (newName.length === 0)
                        return 'יש להזין שם חשבון חדש';
                    var nameWithSchool = newName + ' (בית ספר)';
                    matchingAccount = comp.accounts.find(function(account) {
                        return account.name === newName || account.name === nameWithSchool;
                    });
                    if (matchingAccount != null) {
                        comp.existingAccountId = matchingAccount.id;
                        return 'חשבון בעל שם זהה כבר קיים';
                    }
                } else if (comp.account == null || !comp.account.id) {
                    return 'יש לבחור חשבון לחיוב';
                }
                return null;
            },
            dataChanged: function(index) {
                var comp = this;
                if (!comp.mounting) {
                    //console.trace();
                    comp.changed = true;
                }
            },
            newAccountNameChanged: function() {
                var comp = this;
                comp.existingAccountId = null;
                comp.dataChanged();
            },
            productChanged: function() {
                var comp = this;
                comp.dataChanged();
                if (comp.product != null) { //comp.charge.sum == 0 &&
                    var matchingProduct = comp.products.find(function(product) {
                        return product.id == comp.product;
                    })
                    if (matchingProduct != null) {
                        comp.charge.sum = matchingProduct.price;
                    }
                }
            },
            resetProduct: function() {
                this.product = null;
            },
            regionChanged: function() {
                var comp = this;
                loadAccounts(comp, function() {
                    loadSchools(comp);
                });
                comp.dataChanged();
            },
            resetRegion: function() {
                var comp = this;
                comp.region = null;
                comp.dataChanged();
            },
            seasonChanged: function() {
                var comp = this;
                loadSports(comp, function() {
                    loadChampionships(comp);
                });
            },
            sportChanged: function() {
                var comp = this;
                loadChampionships(comp);
            },
            addAccount: function() {
                var comp = this;
                comp.newAccountExpanded = true;
                window.setTimeout(function() {
                    $(".selectex").css("margin-right", "0px");
                    $("#txtNewAccountName").focus();
                }, 200);
            },
            cancelNewAccount: function() {
                var comp = this;
                comp.newAccountExpanded = false;
                window.setTimeout(function() {
                    $(".selectex").css("margin-right", "0px");
                    $(".selectex").css("width", "85%");
                }, 200);
            },
            selectExistingAccount: function() {
                var comp = this;
                if (comp.existingAccountId != null) {
                    comp.cancelNewAccount();
                    comp.account = comp.accounts.find(function(account) {
                        return account.id == comp.existingAccountId;
                    });
                    comp.existingAccountId = null;
                }
            },
            confirmButtonVisible: function() {
                var comp = this;
                var invalidReason = comp.chargeInvalidReason();
                if (invalidReason != null && invalidReason.length > 0) {
                    //something is invalid, don't show the confirm button.
                    return false;
                }
                if (utils.anyTrue(comp.chargeProgress) === true) {
                    //charge creation/edit in progress, don't show the confirm button.
                    return false;
                }
                if (comp.charge.editing && !comp.changed) {
                    //charge in edit mode and nothing changed yet, no point showing the confirm button.
                    return false;
                }
                return true;
            },
            cancelChampionship: function() {
                var comp = this;
                comp.removeChampionship = true;
                comp.dataChanged();
            },
            cancelPaymentRequest: function() {
                var comp = this;
                comp.removePaymentRequest = true;
                comp.dataChanged();
            },
            restoreChampionship: function() {
                var comp = this;
                comp.removeChampionship = false;
                comp.dataChanged();
            },
            restorePaymentRequest: function() {
                var comp = this;
                comp.removePaymentRequest = false;
                comp.dataChanged();
            },
            saveCharge: function() {
                function success(comp, chargeId) {
                    comp.chargeProgress.creating = false;
                    comp.chargeProgress.created = true;
                    window.setTimeout(function() {
                        comp.charge.id = chargeId;
                        comp.confirm();
                    }, 3000);
                }

                function failure(comp, err) {
                    comp.chargeProgress.creating = false;
                    comp.chargeProgress.failed = true;
                    console.log(err);
                    window.setTimeout(function() {
                        comp.chargeProgress.failed = false;
                    }, 3000);
                }

                var comp = this;
                var chargeData = {
                    region: comp.region,
                    date: comp.charge.creationDate,
                    sum: comp.charge.sum,
                    product: comp.product,
                    paymentRequest: comp.paymentRequest ? comp.paymentRequest.id : null,
                    category: comp.championship ? comp.championship.id : null,
                    account: comp.account ? comp.account.id : null,
                    newAccount: comp.newAccount ? {
                        name: comp.newAccount.name,
                        school: comp.newAccount.school ? comp.newAccount.school.id : null
                    } : null
                };
                comp.chargeProgress.creating = true;
                if (comp.charge.editing) {
                    chargeData.id = comp.charge.id;
                    chargeData.removeChampionship = comp.removeChampionship;
                    chargeData.removePaymentRequest = comp.removePaymentRequest;
                    Vue.http.post('/api/v2/finance/charge', chargeData).then(function (resp) {
                        success(comp, comp.charge.id);
                    }, function(err) {
                        failure(comp,err);
                    });
                } else if (comp.charge.new) {
                    Vue.http.put('/api/v2/finance/charge', chargeData).then(function (resp) {
                        success(comp, resp.body.ChargeId);
                    }, function(err) {
                        failure(comp,err);
                    });
                }
            },
            cancel: function () {
                var comp = this;
                if (comp.changed) {
                    comp.confirmClosure = true;
                } else {
                    comp.$emit("close");
                }
            },
            confirm: function () {
                var comp = this;
                this.$emit("close", comp.charge);
            },
            reallyCancel: function() {
                this.$emit("close");
            },
            abortCancel: function() {
                this.confirmClosure = false;
            }
        },
        computed: {

        },
        watch: {

        }
    });

    return ChargeDialogComponent;
});

function getChargeDate() {
    var time = parseInt($("#ChargeCreationDate").text(), 10);
    if (!isNaN(time) && time > 0) {
        return new Date(time);
    } else {
        return new Date();
    }
}