define(["templates/admin", "views", "dialog", "generic/data-table"],
    function (templates, Views, Dialog) {

        var Projects = [
            {
                id: 1,
                name: "זוזו",
                link: "zuzu"
            },
            {
                id: 2,
                name: 'פכ"ל',
                link: "pcl"
            },
            {
                id: 3,
                name: 'פל"א',
                link: "pele"
            },
            {
                id: 5,
                name: 'שווים בספורט',
                link: "sportEqual"
            }
        ];

        function readRegistrations(comp, callback) {
            if (typeof callback === 'undefined')
                callback = null;
            if (comp.project) {
                Vue.http.get('/api/v2/admin/projects/' + comp.project.id + '/registrations?season=' + comp.season)
                    .then(
                        function (resp) {
                            comp.registrations.splice(0, comp.registrations.length);
                            for (var i = 0; i < resp.data.length; i++) {
                                var registration = resp.data[i];
                                if (registration.city != null && registration.city.id && comp.cityMap) {
                                    var city = comp.cityMap[registration.city.id];
                                    if (city) {
                                        registration.city.user = city.user;
                                    }
                                }
                                comp.registrations.push(registration);
                            }

                            comp.registrations.sort(function (a, b) { return a.city.name.localeCompare(b.city.name); });
                            if (callback != null)
                                callback();
                        },
                        function (err) {
                            console.log(err);
                            if (callback != null)
                                callback();
                        });
            }
            else {
                comp.registrations.splice(0, comp.registrations.length);
                if (callback != null)
                    callback();
            }
        }

        function setup(comp, callback) {
            if (typeof callback === 'undefined')
                callback = null;
            comp.seasons = [];
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    comp.seasons.push(resp.body[i]);
                }
                Vue.http.get('/api/v2/season').then(function (resp) {
                    var curSeason = resp.body.season;
                    if (curSeason) {
                        comp.season = curSeason;
                    }
                    Vue.http.get('/api/v2/cities?season=' + comp.season).then(function (resp) {
                        comp.cityMap = {};
                        comp.cities.splice(0, comp.cities.length);
                        for (var i = 0; i < resp.data.length; i++) {
                            var city = resp.data[i];
                            comp.cityMap[city.id] = city;
                            comp.cities.push(city);
                        }
                        comp.cities.sort(function (a, b) { return a.name.localeCompare(b.name); });
                        readRegistrations(comp, callback);
                    }, function (err) {
                        console.log(err);
                        if (callback != null)
                            callback();
                    });
                });
            });
        }

        var ProjectComponent = Vue.extend({
            template: templates["project"],
            props: {
                id: {}
            },
            data: function () {
                return {
                    tabName: "כללי",
                    caption: "תכניות",
                    updating: false,
                    projects: Projects,
                    project: null,
                    mounting: true,
                    columns: [
                        {
                            key: 'city.name',
                            name: 'שם רשות',
                            active: true
                        },
                        {
                            key: 'region.name',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'items',
                            name: 'ענפי ספורט',
                            active: true,
                            width: 20
                        },
                        {
                            key: 'schoolCount',
                            name: 'בתי ספר',
                            active: true
                        },
                        {
                            key: 'teamCount',
                            name: 'כיתות',
                            active: true
                        },
                        {
                            key: 'studentCount',
                            name: 'תלמידים',
                            active: true
                        }
                    ],
                    cities: [],
                    registrations: [],
                    seasons: [],
                    season: null,
                    enableAdd: false,
                    selectedRegistration: null,
                    city: ""
                };
            },
            mounted: function () {
                var comp = this;
                if (comp.id) {
                    for (var i = 0; i < Projects.length; i++) {
                        var project = Projects[i];
                        if (comp.id == project.id) {
                            comp.project = project;
                            break;
                        }
                    }
                }
                this.updateCaption();
                setup(comp, function() {
                    comp.mounting = false;
                });
            },
            methods: {
                updateCaption: function () {
                    var comp = this;
                    if (comp.project) {
                        comp.caption = "תכנית - " + comp.project.name;
                    }
                    else {
                        comp.caption = "תכניות";
                    }
                },
                handleSelectionChange: function (record) {
                    var comp = this;
                    comp.selectedRegistration = record;
                },
                selectProject: function (project) {
                    if (project) {
                        Views.openView("admin/project", {id: project.id});
                    }
                    else {
                        Views.openView("admin/project");
                    }
                },
                goToCities: function () {
                    Views.openView("admin/cities");
                },
                goToGeneralSettings: function () {
                    Views.openView("admin/general-settings", {type: 1});
                },
                goToProjectTeams: function (project) {
                    Views.openView("project-supervisor/project-teams-approval?" + project.link);
                },
                removeRegistration: function () {
                    var comp = this;
                    if (!this.selectedRegistration) {
                        return;
                    }
                    Dialog.open('general/message-box', {
                            caption: "מחיקת רשות מתכנית",
                            message: "האם למחוק רשות <strong>" + this.selectedRegistration.city.name + "</strong> מתכנית " + this.project.name + "?",
                            alert: true,
                            confirmText: "כן",
                            cancelText: "לא"
                        },
                function (err, result) {
                        if (!err && result === true) {
                            comp.updating = true;
                            Vue.http.delete('/api/v2/admin/projects/' + comp.project.id + '/registrations/' + comp.selectedRegistration.id)
                                .then(
                                    function (resp) {
                                        comp.updating = false;
                                        var index = comp.registrations.indexOf(comp.selectedRegistration);
                                        comp.registrations.splice(index, 1);
                                        comp.selectedRegistration = null;
                                    },
                                    function (err) {
                                        comp.updating = false;
                                        console.log(err);
                                    }
                                );
                        }

                    });
                },
                updateProjectColumns: function () {
                    var comp = this;
                    var itemsColumn;
                    var teamsColumn;
                    var schoolsColumn;
                    for (var n = 0; n < comp.columns.length; n++) {
                        var col = comp.columns[n];
                        if (col.key === "items") {
                            itemsColumn = col;
                        }
                        else if (col.key === "teamCount") {
                            teamsColumn = col;
                        }
                        else if (col.key === "schoolCount") {
                            schoolsColumn = col;
                        }
                    }
                    if (comp.project && (comp.project.link === 'pele' || comp.project.link === 'sportEqual')) {
                        teamsColumn.name = 'קבוצות';
                        itemsColumn.name = 'נתוני אוכלוסיה';
                        console.log(comp.project);
                        itemsColumn.getter = function (record) {
                            if (record.items) {
                                try {
                                    var items = JSON.parse(record.items);
                                    //console.log(items);
                                    if (comp.project.id == 5) {
                                        return "תושבים: " + (items.tp == null ? "" : items.tp) + ",  עם מוגבלויות: " +
                                            (items.tmc == null ? "" : items.tmc)
                                    } else {
                                        return "תושבים: " + (items.tp == null ? "" : items.tp) + ", יוצאי אתיופיה:" + (items.ep == null ? "" : items.ep) + "<br/>" +
                                            "ילדים: " + (items.cp == null ? "" : items.cp) + ", יוצאי אתיופיה: " + (items.ecp == null ? "" : items.ecp);
                                    }
                                }
                                catch (err) {
                                }
                            }
                            return null;
                        };
                        Vue.set(schoolsColumn, "disabled", true);
                    }
                    else {
                        teamsColumn.name = 'כיתות';
                        itemsColumn.name = 'ענפי ספורט';
                        delete itemsColumn.getter;
                        Vue.set(schoolsColumn, "disabled", false);
                    }
                },
                addRegistration: function () {
                    var comp = this;
                    var existingCities = {};
                    for (var i = 0; i < this.registrations.length; i++) {
                        var reg = this.registrations[i];
                        existingCities[reg.city.id] = true;
                    }
                    var cities = [];
                    for (var i = 0; i < this.cities.length; i++) {
                        var city = this.cities[i];
                        if (!existingCities[city.id]) {
                            cities.push(city);
                        }
                    }

                    Dialog.open("admin/project/add-city", {cities: cities},
                        function (err, result) {
                        if (!err && result && result.city != null) {
                            comp.updating = true;
                            if (result.user) {
                                var city = comp.cityMap[result.city];
                                if (city) {
                                    city.user = result.user;
                                }
                            }
                            Vue.http.post('/api/v2/admin/projects/' + comp.project.id + '/registrations', {city: result.city})
                                .then(
                                    function (resp) {
                                        comp.updating = false;
                                        comp.registrations.push(resp.data);
                                        comp.registrations.sort(function (a, b) { return a.city.name.localeCompare(b.city.name); });
                                        comp.city = "";
                                    },
                                    function (err) {
                                        comp.updating = false;
                                        console.log(err);
                                    }
                                );
                        }
                    });
                }
            },
            watch: {
                project: function () {
                    this.updateProjectColumns();
                    readRegistrations(this);
                },
                season: function() {
                    var comp = this;
                    if (!comp.mounting) {
                        Vue.http.post('/api/v2/registration/season', {season: comp.season}).then(function (resp) {
                            //console.log('saved');
                        }, function (err) {
                            //console.log('error');
                        });
                        readRegistrations(comp);
                    }
                }
            }
        });

        return ProjectComponent;
    }
);
