define(["templates/admin", "dialog", "utils", "components/selectex"], function (templates, Dialog, utils) {
    var LinkLogligDialogComponent = Vue.extend({
        template: templates['link-loglig-dialog'],
        data: function() {
            return  {
                category: null,
                categoryName: null,
                seasons: [{Id: 1395, Name: "2022-2023"}],
                events: [], // Championship category competitions
                competitions: [],
                disciplines: [],
                loading: false,
                season: null,
                event: null,
                competition: null,
                discipline: null,
                competitionSelected: false,
                changed: false
            };
        },
        mounted: function() {
            var comp = this;
            Vue.http.get("/api/v2/admin/competitions/" + this.category + "/events")
                .then(function (res) {
                        comp.events.splice(0, comp.events.length);
                        for (var n = 0; n < res.body.length; n++) {
                            comp.events.push(res.body[n]);
                        }
                    },
                    function (err) {
                        console.log(err);
                    });

            Vue.http.get("https://loglig.com:8443/api/Leauges/AthleticsSeasons/49").then(function(res) {
                if (res) {
                    comp.seasons.splice(0, comp.seasons.length);
                    for (var n = 0; n < res.body.length; n++) {
                        comp.seasons.push(res.body[n]);
                    }
                    comp.seasons.sort(function (a, b) {
                        return a.Name.localeCompare(b.Name);
                    });
                    comp.season = comp.seasons[comp.seasons.length - 1].Id;
                }
            }, function(err) {
                console.log("error:");
                console.log(err);
            });
        },
        methods: {
            toggleCompetition: function (competition) {
                if (this.competition == competition) {
                    this.competition = null;
                }
                else {
                    this.competition = competition;
                }
            },
            toggleDiscipline: function (id) {
                if (this.discipline == id) {
                    this.discipline = null;
                }
                else {
                    this.discipline = id;
                }
            },
            cancel: function () {
                if (this.competitionSelected) {
                    this.competitionSelected = false;
                    this.competition = null;
                }
                else {
                    this.$emit("close");
                }
            },
            next: function () {
                if (this.competition) {
                    var comp = this;
                    comp.competitionSelected = true;
                    comp.loading++;
                    Vue.http.get("https://loglig.com:8443/api/Leauges/" + comp.competition.Id + "?ln=1").then(function (res) {
                        comp.loading--;
                        if (res) {
                            comp.disciplines.splice(0, comp.disciplines.length);
                            if (res.body.CompetitionDisciplines) {
                                for (var n = 0; n < res.body.CompetitionDisciplines.length; n++) {
                                    comp.disciplines.push(res.body.CompetitionDisciplines[n]);
                                }

                                comp.disciplines.sort(function (a, b) {
                                    return a.DisciplineName.localeCompare(b.DisciplineName) ||
                                        a.CategoryName.localeCompare(b.CategoryName);
                                });
                            }
                        }
                    }, function (err) {
                        comp.loading--;
                        console.log("error:");
                        console.log(err);
                    });
                }
            },
            save: function () {
                var comp = this;
                if (this.event) {
                    Vue.http.post("/api/v2/admin/competitions/loglig", {
                        competition: this.event.CompetitionId,
                        logligId: this.discipline
                    })
                        .then(function () {
                            comp.event.LogligId = comp.discipline;
                            comp.discipline = null;
                            comp.competition = null;
                            comp.competitionSelected = false;
                        },
                        function (err) {
                            console.log(err);
                        });
                }
            },
            clear: function () {
                var comp = this;
                if (this.event) {
                    Vue.http.post("/api/v2/admin/competitions/loglig", {
                        competition: this.event.CompetitionId,
                        logligId: null
                    })
                        .then(function () {
                                comp.event.LogligId = null;
                                comp.discipline = null;
                                comp.competition = null;
                                comp.competitionSelected = false;
                            },
                            function (err) {
                                console.log(err);
                            });
                }
            }
        },
        watch: {
            season: function () {
                var comp = this;
                comp.loading++;
                Vue.http.get("https://loglig.com:8443/api/Leauges/AthleticsCompetitions/49/1395").then(function(res) {
                    comp.loading--;
                    if (res) {
                        comp.competitions.splice(0, comp.competitions.length);
                        for (var n = 0; n < res.body.length; n++) {
                            var competition = res.body[n];
                            competition.date = new Date(competition.StartDate_datetime);
                            comp.competitions.push(competition);
                        }
                        comp.competitions.sort(function (a, b) {
                            var d = a.Title.localeCompare(b.Title);
                            if (!d) {
                                d = a.date - b.date;
                            }
                            return d;
                        });
                    }
                }, function(err) {
                    comp.loading--;
                    console.log("error:");
                    console.log(err);
                });
            },
            event: function () {
                this.discipline = this.event ? this.event.LogligId : null;
            }
        }
    });

    return LinkLogligDialogComponent;
});