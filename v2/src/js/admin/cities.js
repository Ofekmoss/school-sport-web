define(["templates/admin", "dialog", "generic/data-table"],
    function (templates, Dialog) {

        function readRegions(comp, callback) {
            comp.regions.splice(0, comp.regions.length);
            Vue.http.get('/api/v2/regions')
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.length; i++) {
                            var region = resp.body[i];
                            if (region.id > 0) {
                                comp.regions.push(region);
                            }
                        }

                        callback();
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }


        function setup(comp) {
            readRegions(comp, function () {
                Vue.http.get('/api/v2/cities')
                    .then(
                        function (resp) {
                            comp.cityMap = {};
                            comp.cities.splice(0, comp.cities.length);
                            for (var i = 0; i < resp.data.length; i++) {
                                var city = resp.data[i];
                                if (!city.user) {
                                    city.user = null;
                                }
                                comp.cityMap[city.id] = city;
                                comp.cities.push(city);
                            }
                            comp.cities.sort(function (a, b) {
                                return a.name.localeCompare(b.name);
                            });
                            comp.updateCaption();
                        },
                        function (err) {
                            console.log(err);
                        });
            });
        }

        var CitiesComponent = Vue.extend({
            template: templates["cities"],
            props: {
                region: {}
            },
            data: function () {
                return {
                    tabName: "כללי",
                    caption: "רשויות",
                    image: 'img/cities.svg',
                    updating: false,
                    columns: [
                        {
                            key: 'name',
                            name: 'שם רשות',
                            active: true
                        },
                        {
                            key: 'region.name',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'user.login',
                            name: 'שם משתמש',
                            active: true
                        }
                    ],
                    cities: [],
                    regions: [],
                    filter: null,
                    city: null
                };
            },
            mounted: function () {
                setup(this);
            },
            methods: {
                updateCaption: function () {
                    var caption = "רשויות";
                    var comp = this;
                    if (comp.region > 0 && comp.regions) {
                        for (var n = 0; n < comp.regions.length; n++) {
                            var region = comp.regions[n];
                            if (region.id == comp.region) {
                                caption += " - " + region.name;
                                break;
                            }
                        }
                    }
                    comp.caption = caption;
                },
                handleSelectionChange: function (record) {
                    var comp = this;
                    comp.city = record;
                },
                editUser: function () {
                    var comp = this;
                    if (comp.city) {
                        Dialog.open("admin/edit-city-user", {city: comp.city},
                            function (err, user) {
                                if (!err && user) {
                                    comp.city.user = user;
                                }
                            });
                    }
                }
            },
            watch: {
                region: function () {
                    var comp = this;
                    if (comp.region == null || comp.region === "") {
                        comp.filter = null;
                    }
                    else {
                        comp.filter = (function (region) {
                            return function (record) {
                                return record.region && record.region.id === region;
                            };
                        })(parseInt(comp.region));
                    }
                    this.updateCaption();
                }
            }
        });

        return CitiesComponent;
    }
);
