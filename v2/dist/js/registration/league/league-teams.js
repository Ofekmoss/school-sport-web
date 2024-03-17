define(["templates/registration", "services/access", "services/products", "dialog", "utils"], function (templates, Access, Products, Dialog, utils) {


    function getTimeText(time) {
        var min = time % 60;
        var hour = (time - min) / 60;
        return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
    }

    function readCompetitions(comp, callback) {
        comp.sports.splice(0, comp.sports.length);
        Vue.http.get('/api/v2/registration/league/competitions')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.sports.length; i++) {
                        comp.sports.push(resp.body.sports[i]);
                    }
                    callback();
                },
                function (err) {
                    callback(err);
                }
            );
    }

    function readFacilities(comp) {
        Vue.http.get('/api/v2/facilities?city=' + comp.team.school.cityId)
            .then(
                function (resp) {
                    if (!comp.facilities) {
                        comp.facilities = [];
                    }
                    for (var i = 0; i < resp.body.length; i++) {
                        comp.facilities.push(resp.body[i]);
                    }
                },
                function (err) {
                    console.log(err);
                }
            );
    }

    function getById(list, id) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.id === id) {
                return item;
            }
        }
        return null;
    }

    function readTeams(comp, teamId, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();

        // comp.teams.splice(0, comp.teams.length);
        readCompetitions(comp, function (err) {
            if (!err) {
                Vue.http.get('/api/v2/registration/league/teams/'+ encodeURIComponent(teamId))
                    .then(
                        function (resp) {
                            var team = resp.body;
                            team.sport = getById(comp.sports, team.sport);
                            if (team.sport) {
                                team.category = getById(team.sport.categories, team.competition);
                                if (team.category) {
                                    comp.team = team;
                                    comp.originalTeamJSON = JSON.stringify(comp.team);
                                    //console.log(comp.originalTeamJSON);
                                }
                            }

                            if (team.activity.length == 0) {
                                team.activity.push({});
                            }

                            if (team.id == null) {
                                team.active = true; // By default a team is set to active
                            } else {
                                var matchingForm = 'league-team-' + team.id;
                                Vue.http.get('/api/v2/registration/school-confirmations').then(function(resp) {
                                    for (var i = 0; i < resp.body.length; i++) {
                                        var confirmationData = resp.body[i];
                                        if (confirmationData.Form === matchingForm) {
                                            comp.confirmationA = true;
                                            comp.confirmationB = true;
                                            comp.confirmationC = true;
                                            comp.confirmationD = true;
                                            comp.inactiveConfirmation = true;
                                            comp.confirmedAt = confirmationData.DateConfirmed;
                                            break;
                                        }
                                    }
                                }, function(err) {
                                    console.log(err);
                                });
                            }
                            console.log(team);
                            callback(null, team);
                        },
                        function (err) {
                            console.log(err);
                            callback(err);
                        }
                    );
            } else {
                callback(err);
            }
        });
    }

    function deleteNextTeam(comp, teams) {
        var team = teams[0];
        teams.splice(0, 1);
        Vue.http.delete('/api/v2/registration/league/teams/' + encodeURIComponent(team.id))
            .then(
                function (resp) {
                    for (var i = 0; i < comp.teams.length; i++) {
                        if (comp.teams[i] === team) {
                            comp.teams.splice(i, 1);
                            break;
                        }
                    }
                    deleteNextTeam(comp, teams);
                },
                function (err) {
                    Dialog.open('general/error-message', {
                        caption: "פעולה נכשלה",
                        message: typeof err.body === "string" ? err.body : "שגיאה במחיקת קבוצה"
                    });
                }
            );
    }

    function saveTeam(comp) {
        var t = comp.team;
        var team = {
            id: t.id,
            team: t.team,
            sport: t.sport,
            category: t.category,
            payment: t.payment,
            teamNumber: t.teamNumber,
            active: t.active,
            coach: {
                name: t.coach.name,
                phoneNumber: t.coach.phoneNumber,
                email: t.coach.email,
                certification: t.coach.certification
            },
            coachHelper: {
                name: t.coachHelper.name,
                phoneNumber: t.coachHelper.phoneNumber,
                email: t.coachHelper.email
            },
            manager: {
                name: t.manager.name,
                phoneNumber: t.manager.phoneNumber,
                email: t.manager.email
            },
            teacher: {
                name: t.teacher.name,
                phoneNumber: t.teacher.phoneNumber,
                email: t.teacher.email
            },
            facilityAlternative: {
                name: t.facilityAlternative.name,
                address: t.facilityAlternative.address
            },
            facility: t.facility,
            activity: t.activity.map(function (a) { return { day: a.day, startTime: a.startTime, endTime: a.endTime }; })
        };

        if (comp.confirmedAt) {
            team.confirmedAt = comp.confirmedAt;
        }

        var request = team.id == null
            ? Vue.http.post('/api/v2/registration/league/teams', team)
            : Vue.http.put('/api/v2/registration/league/teams/' + encodeURIComponent(team.id), team);
        request.then(
            function (resp) {
                if (!team.active) {
                    comp.inactiveConfirmation = false;
                    Dialog.open('general/message-box', {
                        caption: "הודעה",
                        message: 'קבוצה אינה פעילה',
                    });
                    comp.$emit("disableNext", resp.data.stage);
                } else {
                    comp.$emit("disableNext", 900);
                    comp.$emit("next", resp.data.stage);
                }
                if (team.id && !comp.confirmedAt) {
                    var requestParams = {
                        Form: 'league-team-' + team.id
                    };
                    Vue.http.post('/api/v2/registration/confirmation', requestParams).then(function (resp) {
                        comp.confirmedAt = new Date();
                    }, function (err) {
                        console.log(err);
                    });
                }
            },
            function (err) {
                Dialog.open('general/error-message', {
                    caption: "פעולה נכשלה",
                    message: typeof err.body === "string" ? err.body : "שגיאה בעריכת קבוצה"
                });
            }
        );
    }

    function setStartHours(comp) {
        for (var n = 13; n <= 17; n++) {
            comp.startHours.push({value: n * 60, text: ("0" + n).slice(-2) + ":00"});
            if (n != 17) {
                comp.startHours.push({value: n * 60 + 15, text: ("0" + n).slice(-2) + ":15"});
                comp.startHours.push({value: n * 60 + 30, text: ("0" + n).slice(-2) + ":30"});
                comp.startHours.push({value: n * 60 + 45, text: ("0" + n).slice(-2) + ":45"});
            }
        }
    }


    var RegistrationLeagueTeamsComponent = Vue.extend({
        template: templates["league-teams"],
        data: function () {
            return {
                user: Access.user,
                team: {
                    sport: {},
                    category: {},
                    coach: {},
                    teacher: {},
                    manager: {},
                    coachHelper: {},
                    activity: [],
                    facilityAlternative: {}
                },
                originalTeamJSON: '',
                teamDataChanged: false,
                facilities: [],
                sports: [],
                newFacilityName: "",
                newFacilityAddress: "",
                editingFacility: false,
                // paidTeams: 0,
                teamPrice: null,
                selectAll: false,
                selectionCount: 0,
                inactiveConfirmation: false,
                confirmationA: false,
                confirmationB: false,
                confirmationC: false,
                confirmationD: false,
                startHours : [],
                days: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"],
                confirmedAt: null,
                seasonName: '',
                inactiveSeason: false
            };
        },
        mounted: function () {
            var comp = this;
            Vue.http.get('/api/common/season-data').then(function(resp) {
                comp.seasonName = resp.body.name;
                var teamId = window.location.hash.split("=")[1];
                Products.getById(200, function (err, product) {
                    comp.teamPrice = product.price;
                    readTeams(comp, teamId, function() {
                        readFacilities(comp);
                    });
                });
                setStartHours(comp);
            });
            comp.inactiveSeason = utils.inactiveSeason(comp);
            if (comp.inactiveSeason) {
                //check if school is authorized
                utils.checkSeasonAuthorization(comp.user, function(err, authorized) {
                    if (authorized == true) {
                        comp.inactiveSeason = false;
                    }
                });
            }
        },
        watch: {
            "team.facility": function () {
                this.editingFacility = false;
                this.newFacilityName = "";
                this.newFacilityAddress = "";
            },
            team: {
                // This will let Vue know to look inside the array
                deep: true,

                // We have to move our method to a handler field
                handler: function() {
                    var comp = this;
                    if (comp.originalTeamJSON.length > 0) {
                        var currentJSON = JSON.stringify(comp.team);
                        comp.teamDataChanged = currentJSON !== comp.originalTeamJSON;
                    }
                }
            }
        },
        methods: {
            handleSelectionChange: function () {
                this.selectionCount = 0;
                for (var i = 0; i < this.teams.length; i++) {
                    if (this.teams[i].selected) {
                        this.selectionCount++;
                    }
                }
                this.selectAll = this.selectionCount == this.teams.length;
            },
            handleSelectAll: function () {
                if (this.selectAll) {
                    for (var i = 0; i < this.teams.length; i++) {
                        this.teams[i].selected = true;
                    }
                    this.selectionCount = this.teams.length;
                }
                else {
                    for (var i = 0; i < this.teams.length; i++) {
                        this.teams[i].selected = false;
                    }
                    this.selectionCount = 0;
                }
            },
            getActivityText: function (activity) {
                return activity.map(function (a) {
                    if (a.day != null) {
                        return days[a.day] +
                            (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                            (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
                    }
                    return "";
                }).join("; ");
            },
            onTeamActiveChange: function () {
                if (this.team.id == null && this.team.active) {
                    this.editTeam();
                }
            },
            editFacility: function (edit) {
                if (edit) {
                    var facility = getById(this.facilities, this.team.facility);
                    if (facility) {
                        this.newFacilityName = facility.name;
                        this.newFacilityAddress = facility.address;
                    }
                }
                this.editingFacility = edit;
            },
            saveAndNext: function () {
                var comp = this;
                // comp.confirmedAt
                if (comp.editingFacility || comp.team.facility == null) {
                    if (comp.newFacilityName.trim().length > 0 &&
                        comp.newFacilityAddress.trim().length > 0) {
                        var request = comp.editingFacility
                            ? Vue.http.put('/api/v2/facilities/-/' + encodeURIComponent(comp.team.facility),
                                {
                                    name: comp.newFacilityName,
                                    address: comp.newFacilityAddress
                                })
                            : Vue.http.post('/api/v2/facilities/-',
                                {
                                    name: comp.newFacilityName,
                                    address: comp.newFacilityAddress
                                });
                        request.then(
                            function (resp) {
                                if (comp.editingFacility) {
                                    var facility = getById(comp.facilities, comp.team.facility);
                                    facility.name = comp.newFacilityName;
                                    facility.address = comp.newFacilityAddress;
                                }
                                else {
                                    var facility = {
                                        id: resp.body.id,
                                        name: comp.newFacilityName,
                                        address: comp.newFacilityAddress
                                    };
                                    comp.facilities.push(facility);
                                    comp.team.facility = facility.id;
                                }
                                comp.newFacilityName = "";
                                comp.newFacilityAddress = "";
                                saveTeam(comp);
                            },
                            function (err) {
                                Dialog.open('general/error-message', {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "שגיאה בהגדרת מתקן"
                                });
                            }
                        )
                    }
                }
                else {
                    saveTeam(this);
                }
            },
            getFacilityName: function (id) {
                for (var i = 0; i < this.facilities.length; i++) {
                    var f = this.facilities[i];
                    if (f.id === id) {
                        return f.name;
                    }
                }
                return null;
            },
            getTotalPayment: function() {
                var comp = this;
                // return  comp.teams.reduce(function(total, team) {
                //     if (team.active && !team.payment) {
                //         return total + comp.teamPrice;
                //     } else {
                //         return total;
                //     }
                // }, 0);
            },
            stopTheEvent: function(event) {
                event.stopPropagation()
            },
            // next: function () {
            //     var comp = this;
            //     Vue.http.post('/api/v2/registration/league/teams/approve')
            //         .then(
            //             function (resp) {
            //                 comp.$emit("next", resp.data.stage);
            //             },
            //             function (err) {
            //                 Dialog.open("general/error-message", {
            //                     caption: "פעולה נכשלה",
            //                     message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
            //                 });
            //             }
            //         );
            // },
            isValid: function() {
                if (!this.team.active)
                    return this.inactiveConfirmation;

                var nodes = document.querySelectorAll('#form :invalid');

                return (
                    this.confirmationA &&
                    this.confirmationB &&
                    this.confirmationC &&
                    ( this.hasBasketballTeam() ? this.confirmationD : true ) &&
                    nodes.length === 0
                )
            },
            hasBasketballTeam: function() {
                return this.team.sport.id == 15
            }
        }
    });

    return RegistrationLeagueTeamsComponent;
});