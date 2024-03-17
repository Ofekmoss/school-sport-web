define(["templates/admin", "dialog", "utils", "components/selectex"], function (templates, Dialog, utils) {
    function readCategoryDetails(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        var url = '/api/v2/manage/categories/' + comp.category;
        Vue.http.get(url).then(function (resp) {
            var categoryData = resp.body;
            if (categoryData == null || categoryData.Id == null) {
                comp.error = 'לא נמצאו נתוני תחרות';
            } else {
                comp.chargeSeason = categoryData.ChargeSeason != null ? categoryData.ChargeSeason.Id : null;
                comp.price = categoryData.RegistrationPrice;
                comp.name = categoryData.Name;
                comp.championship = {
                    id: categoryData.Championship.Id,
                    name: categoryData.Championship.Name
                };
            }
            callback();
        }, function(err) {
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

    var CategoryDialogComponent = Vue.extend({
        template: templates['category-dialog'],
        data: function() {
            return  {
                category: null,
                error: null,
                chargeSeason: null,
                price: 0,
                name: '',
                championship: null,
                categoryProgress: {
                    editing: false,
                    edited: false,
                    failed: false
                },
                seasons: [],
                season: null,
                mounting: false,
                isValid: true,
                changed: false,
                confirmClosure: false
            };
        },
        mounted: function() {
            function stopMounting(comp) {
                window.setTimeout(function () {
                    comp.mounting = false;
                    comp.$forceUpdate();
                }, 500);
            }

            var comp = this;
            comp.error = '';
            comp.mounting = true;
            if (utils.intOrDefault(comp.category, 0) <= 0) {
                comp.error = 'זיהוי תחרות חסר או שגוי';
            } else {
                loadSeasons(comp, function() {
                    readCategoryDetails(comp, function() {
                        stopMounting(comp);
                    });
                });
            }
        },
        methods: {
            resetChargeSeason: function() {
                var comp = this;
                comp.chargeSeason = null;
            },
            dataChanged: function(index) {
                var comp = this;
                if (!comp.mounting) {
                    //console.trace();
                    comp.changed = true;
                }
            },
            saveCategory: function() {
                function success(comp) {
                    comp.categoryProgress.editing = false;
                    comp.categoryProgress.edited = true;
                    comp.changed = false;
                    window.setTimeout(function() {
                        comp.confirm();
                    }, 3000);
                }

                function failure(comp, err) {
                    comp.categoryProgress.editing = false;
                    comp.categoryProgress.failed = true;
                    console.log(err);
                    window.setTimeout(function() {
                        comp.categoryProgress.failed = false;
                    }, 3000);
                }

                var comp = this;
                var categoryData = {
                    id: comp.category,
                    chargeSeason: comp.chargeSeason,
                    price: comp.price
                };
                comp.categoryProgress.editing = true;
                Vue.http.post('/api/v2/manage/categories', categoryData).then(function (resp) {
                    success(comp);
                }, function(err) {
                    failure(comp,err);
                });
            },
            cancel: function () {
                var comp = this;
                if (comp.categoryProgress.edited) {
                    comp.confirm();
                } else {
                    if (comp.changed) {
                        comp.confirmClosure = true;
                    } else {
                        comp.$emit("close");
                    }
                }
            },
            confirm: function () {
                var comp = this;
                var seasonData = comp.seasons.find(function(season) {
                    return season.id == comp.chargeSeason;
                });
                this.$emit("close", {
                    id: comp.category,
                    chargeSeason: seasonData,
                    price: comp.price
                });
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

    return CategoryDialogComponent;
});