define(["templates/registration", "dialog", "utils", "consts"], function (templates, Dialog, utils, consts) {

    function getById(list, id) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.id === id) {
                return item;
            }
        }
        return null;
    }

    function getName(sport, category, teams) {
        var names = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז' ];
        var similarTeams = teams.filter(function(team) {
            return team.sport.id == sport && team.category.id == category;
        });

        var nameIndex = similarTeams.length;
        var newName = names[nameIndex];

        while (similarTeams.find(function (team) {
            return team.teamNumber == newName;
        })) {
            nameIndex++;
            newName = names[nameIndex];
        }

        return newName;
    }

    function isActivityValid(activity) {
        var result = true;

        for (var index = 0; index < activity.length; index++) {
            if (!activity[index] || !activity[index].day || !activity[index].startTime || !activity[index].endTime) {
                result =  false;
                break;
            }
        }

        return result;
    }

    function isHostingDayValid(hostingHours) {
        var result = true;

        for (var index = 0; index < hostingHours.length; index++) {
            var hostingHour = hostingHours[index];
            if (hostingHour && hostingHour.day) {
                var minutesDiff = 0;
                if (hostingHour.startTime && hostingHour.endTime) {
                    minutesDiff = hostingHour.endTime - hostingHour.startTime;
                }
                if (minutesDiff < 180) {
                    result = false;
                    break;
                }
            }
        }

        return result;
    }

    var ClubTeamDialogComponent = Vue.extend({
        template: templates["club-team-dialog"],
        el: '#validated-form',
        data: function () {
            return {
                team: null,
                newTeam: false,
                originalTeamJSON: '',
                teamDataChanged: false,
                facilities: [],
                sports: [],
                championships: [],
                newFacilityName: "",
                newFacilityAddress: "",
                editingFacility: false,
                sportIndex: null,
                categoryIndex: null,
                championshipIndex: null,
                teams: [],
                startHours: utils.getStartHours(),
                activityEndHours: utils.getEndHours(),
                hostingEndHours: utils.getEndHours(),
                duplicate: false,
                teamNumberExists: false,
                coachCertifications: []
            };
        },
        watch: {
            sportIndex: function () {
                this.team.sport = this.sportIndex == null ? null : this.sports[this.sportIndex];
                var categoryIndex = null;
                if (this.team.sport && this.team.category) {
                    for (var i = 0; i < this.team.sport.categories.length; i++) {
                        var c = this.team.sport.categories[i];
                        if (c.category === this.team.category.category) {
                            categoryIndex = i;
                            break;
                        }
                    }
                }
                this.categoryIndex = categoryIndex;
            },
            categoryIndex: function () {
                this.team.category = this.team.sport == null || this.categoryIndex == null ? null :
                    this.team.sport.categories[this.categoryIndex];

                if (this.duplicate || this.newTeam) {
                    //set team number only when adding new team or duplicating an existing one
                    this.team.teamNumber = this.team.sport == null || this.categoryIndex == null ? null :
                        getName(this.team.sport.id, this.team.category.id, this.teams);
                }
            },
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
        mounted: function () {
            var comp = this;
            var certifications = consts.coachCertifications;
            comp.coachCertifications = utils.flattenComplexObject(certifications, false, function(key, value) {
                return {
                    Id: key,
                    Name: value
                };
            });
            comp.coachCertifications.sort(function(c1, c2) {
                return c1.Id - c2.Id;
            });
            if (comp.team == null) {
                comp.newTeam = true;
                comp.team = {
                    coach: {},
                    activity: [{}],
                    hostingHours: [{}]
                };
            } else  {
                if (comp.team.activity == null || !comp.team.activity.length) {
                    comp.team.activity = [{}];
                }
                if (comp.team.hostingHours == null || !comp.team.hostingHours.length) {
                    comp.team.hostingHours = [{}];
                }
            }
            if (!comp.newTeam) {
                for (var i = 0; i < comp.sports.length; i++) {
                    var sport = comp.sports[i];
                    if (sport.id === comp.team.sport.id) {
                        comp.sportIndex = i;
                        comp.team.sport = sport;
                        for (var a = 0; a < sport.categories.length; a++) {
                            var category = sport.categories[a];
                            if (category.id === comp.team.category.id) {
                                comp.team.category = category;
                                comp.categoryIndex = a;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
            utils.activityMethods.computeEndTime(comp.team.activity);
            utils.activityMethods.computeEndTime(comp.team.hostingHours);
            if (comp.duplicate) {
                comp.team.teamNumber = getName(comp.team.sport.id, comp.team.category.id, comp.teams);
            }

            if (comp.team.sport && comp.team.sport.championships && comp.team.category) {
                var championshipId = comp.team.category.championship;
                var categoryId = comp.team.category.id;
                var index = comp.team.sport.championships.findIndex(function(c) {
                    return c.id === championshipId;
                });
                if (index >= 0) {
                    comp.championshipIndex = index;
                    window.setTimeout(function() {
                        index = comp.team.sport.categories.findIndex(function(c) {
                            return c.id === categoryId;
                        });
                        if (index >= 0) {
                            comp.categoryIndex = index;
                        }
                    }, 200);
                }
            }
            //console.log(comp.team);
            comp.activityMethods = utils.activityMethods;
            if (!comp.team.coach.certificationTypes)
                comp.team.coach.certificationTypes = [];
            window.setTimeout(function() {
                //force validation to run
                var coachName = comp.team.coach.name;
                comp.team.coach.name = '---';
                comp.team.coach.name = coachName;
                comp.originalTeamJSON = JSON.stringify(comp.team);
            }, 500);
            //console.log(comp.teams);
        },
        methods: {
            //activityMethods: utils.activityMethods,
            cancel: function () {
                this.$emit("close");
            },
            isHostingDayValid: function(hostingHours) {
                return isHostingDayValid(hostingHours);
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
            confirm: function () {
                var comp = this;
                comp.teamNumberExists = false;
                if (comp.teams) {
                    var categoryId = comp.team.category.id;
                    var teamNumber = comp.team.teamNumber.replace('"', '').replace("'", "");
                    var matchingTeams = comp.teams.filter(function(team) {
                        var sameCategory = team.category.id === categoryId;
                        var currentNumber = team.teamNumber ? team.teamNumber.replace('"', '').replace("'", "") : '';
                        return team.id !== comp.team.id && sameCategory  && currentNumber  === teamNumber;
                    });
                    if (matchingTeams.length > 0) {
                        comp.teamNumberExists = true;
                        return;
                    }
                }

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
                                comp.$emit("close", comp.team);
                            },
                            function (err) {
                                Dialog.open('general/error-message', {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "שגיאה בהגדרת מתקן"
                                });
                            }
                        )
                    } else {
                        if (!comp.team.sport.isGroup) {
                            this.$emit("close", this.team);
                        }
                    }
                }
                else {
                    this.$emit("close", this.team);
                }
            },
            validateForm: function () {
                var formId = 'validated-form';
                var nodes = document.querySelectorAll('#' + formId + ' :invalid');
                //console.log(nodes);
                return nodes.length == 0 &&
                        this.team.sport && this.team.category && this.team.coach.phoneNumber && this.team.coach.email &&
                    isActivityValid(this.team.activity) && isHostingDayValid(this.team.hostingHours)
                    ? true : false;

            }
            /*
            hostingEndTimeChanged: function() {
                var comp = this;
                if (comp.team.activity && comp.team.activity.length > 0) {
                    var selectedActivity = comp.team.activity[0].day;
                    comp.team.activity[0].day = ((selectedActivity || 0) + 1) % 5;
                    window.setTimeout(function () {
                        comp.team.activity[0].day = selectedActivity;
                    }, 100);
                }
            }
            */
        }
    });

    return ClubTeamDialogComponent;
});