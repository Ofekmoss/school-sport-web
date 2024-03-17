define(["templates/registration", "dialog"], function (templates, Dialog) {

    function getFacilities() {
        return Vue.http.get('/api/v2/facilities');
    }

    function getAges(ages){
        var result = 0;
        if (ages.a10) {
            result = result | 1;
        }
        if (ages.a11) {
            result = result | 2;
        }
        if (ages.a12) {
            result = result | 4;
        }
        if (ages.a13) {
            result = result | 8;
        }if (ages.a14) {
            result = result | 16;
        }
        if (ages.a15) {
            result = result | 32;
        }
        if (ages.a16) {
            result = result | 64;
        }
        if (ages.a17) {
            result = result | 128;
        }
        if (ages.a18) {
            result = result | 256;
        }
        return result;
    }

    function setAges(ages, dec) {
        if (dec) {
            var base2 = dec.toString(2);

            for (var i = base2.length - 1; i >= 0; i--) {
                if (base2[i] == '1') {
                    ages['a1' + (base2.length - i - 1)] = true;
                }
            }
        }
    }

    function isActivityValid(activity) {
        if (activity.length < 2) {
            return false;
        }

        var result = true;

        for (var index in activity) {
            if (!activity[index].day || !activity[index].startTime || !activity[index].endTime) {
                result =  false;
                break;
            }
        }

        return result;
    }

    var SportEqualityTeamDialogComponent = Vue.extend({
        template: templates["sport-equality-team-dialog"],
        el: '#validated-form',
        data: function () {
            return {
                team: {
                    coach: {},
                    activity: [{}, {}],
                    facility: {},
                    sport: {
                        name: "",
                        team: false,
                        gender: 0,
                        sportType: 0
                    },
                    association: {
                        name: null
                    }
                },
                ages: {
                    a10: false,
                    a11: false,
                    a12: false,
                    a13: false,
                    a14: false,
                    a15: false
                },
                newTeam: false,
                selectedSport: null,
                selectedFacility: null,
                selectedFacilityType: null,
                otherFacilityType: '',
                newSport: false,
                sports: [],
                startHours: [],
                endHours: [],
                duplicate: false,
                facilityTypes: [],
                facilities: [],
                newFacility: false,
                newFacilityType: false,
                endDate: '',
                startDate: '',
                validationError: ''
            };
        },
        watch: {
            selectedSport: function () {
                if (this.selectedSport === -1) {
                    this.newSport = true;
                    this.team.sport = {name: "", team: false};
                } else {
                    this.newSport = false;
                    //console.log(this.sports[this.selectedSport]);
                    this.team.sport = this.sports[this.selectedSport];
                }
            },
            selectedFacility: function() {
                if (this.selectedFacility ==  -1) {
                    this.newFacility = true;
                } else {
                    this.newFacility = false;
                    this.team.facility.id = this.facilities[this.selectedFacility].id;
                }
            },
            selectedFacilityType: function() {
                if (this.selectedFacilityType ==  this.facilityTypes.length - 1) {
                    this.newFacilityType = true;
                } else {
                    this.newFacilityType = false;
                    this.team.facility.type = this.facilityTypes[this.selectedFacilityType].id;
                }
            },
            otherFacilityType: function() {
                this.team.facility.type = this.otherFacilityType;
            },
            ages: {
                handler: function() {
                    this.validateForm();
                },
                deep: true
            }
        },
        mounted: function () {
            var minHourStart = 15;
            var maxHourStart = 23;
            var minHourEnd = 16;
            var maxHourEnd = 23;
            var comp = this;
            comp.sports = comp.sports.slice();
            if (comp.team.sport) {
                comp.sports.forEach(function(sport) {
                    if (sport.name === comp.team.sport.name) {
                        if (comp.team.sport.gender) {
                            sport.gender = comp.team.sport.gender;
                        }
                        if (comp.team.sport.sportType) {
                            sport.sportType = comp.team.sport.sportType;
                        }
                    }
                });
            }

            comp.newTeam = comp.team.id == null;
            for (var n = minHourStart; n <= maxHourStart; n++) {
                this.startHours.push({value: n * 60, text: ("0" + n).slice(-2) + ":00"});
                if (n != maxHourStart) {
                    this.startHours.push({value: n * 60 + 30, text: ("0" + n).slice(-2) + ":30"});
                }
            }
            for (var n = minHourEnd; n <= maxHourEnd; n++) {
                this.endHours.push({value: n * 60, text: ("0" + n).slice(-2) + ":00"});
                if (n != maxHourEnd) {
                    this.endHours.push({value: n * 60 + 30, text: ("0" + n).slice(-2) + ":30"});
                }
            }
            if (!comp.newTeam) {
                comp.team = {
                    activity: comp.team.activity.slice().map(function(a){ return Object.assign({}, a)}),
                    ages: comp.team.ages,
                    association: Object.assign({}, comp.team.association),
                    coach: Object.assign({}, comp.team.coach),
                    facility: Object.assign({}, comp.team.facility),
                    alternativeFacility: comp.team.alternativeFacility,
                    startDate: comp.team.startDate,
                    endDate: comp.team.endDate,
                    id: comp.team.id,
                    sport: Object.assign({}, comp.team.sport)
                };
                setAges(comp.ages, comp.team.ages);
                for (var i = 0; i < comp.sports.length; i++) {
                    var sport = comp.sports[i];
                    if (sport.name === comp.team.sport.name && !!sport.team === !!comp.team.sport.team) {
                        comp.selectedSport = i;
                        break;
                    }
                }
                if (comp.team.association.name && comp.team.association.name.trim().length > 0) {
                    comp.team.associationApprove = true;
                }
            }

            this.team.activity.forEach(function(activity, index) {
                comp.computeEndTime(index);
            });

            getFacilities().then(function (res) {
                comp.facilities = res.body;
                for (var i = 0; i < comp.facilities.length; i++){
                    if (comp.facilities[i].id === comp.team.facility.id) {
                        comp.selectedFacility = i;
                    }
                }
            });
        },
        methods: {
            addActivityDay: function () {
                this.team.activity.push({});
            },
            removeActivityDay: function (index) {
                this.team.activity.splice(index, 1);
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                var facility = {};
                if (!comp.newFacility) {
                    facility.id = comp.team.facility.id;
                } else {
                    facility.name = comp.team.facility.name;
                    facility.address = comp.team.facility.address;
                    facility.type = comp.team.facility.type;
                }
                var item1 = {
                    name:  comp.team.sport.name,
                    team: comp.team.sport.team,
                    gender: comp.team.sport.gender,
                    sportType: comp.team.sport.sportType
                };
                var item2 = {
                    name:  comp.team.association.name,
                    type: comp.team.association.type
                };
                var item3 = {
                    alternativeFacility: comp.team.alternativeFacility,
                    startDate: comp.team.startDate,
                    endDate: comp.team.endDate
                };
                var data = {
                    team: {
                        isGroupSport: comp.team.isGroupSport,
                        ages: comp.team.agesResult,
                        item1: JSON.stringify(item1),
                        item2: JSON.stringify(item2),
                        item3: JSON.stringify(item3),
                        facility: facility,
                        activity: comp.team.activity.map(function(a){return {day: a.day, endTime: a.endTime, startTime: a.startTime, }}),
                        coach: {
                            name: comp.team.coach.name,
                            phoneNumber: comp.team.coach.phoneNumber,
                            email: comp.team.coach.email,
                            gender: comp.team.coach.gender,
                            certification: comp.team.coach.certification
                        },
                        id: comp.team.id
                    } //isGroupSport, ages, item1, item2, item3, facility, activity, coach
                };

                Vue.http.put('/api/v2/registration/project/5/teams', data)
                    .then(function(resp) {
                        comp.$emit("close", comp.team);
                    })
                    .catch( function (err) {
                        Dialog.open('general/error-message', {
                            caption: "פעולה נכשלה",
                            message: typeof err.body === "string" ? err.body : "שגיאה בשמירת קבוצה"
                        });
                    });

            },
            validateForm: function () {
                function isFormValid(comp, team) {
                    function verifyFields(object, fields) {
                        var valid = true;
                        for (var i = 0; i < fields.length; i++) {
                            var field = fields[i];
                            var curValue = object[field];
                            if (typeof curValue === 'undefined' || curValue == null) {
                                valid = false;
                                break;
                            }
                            if (curValue.toString().length === 0) {
                                valid = false;
                                break;
                            }
                        }
                        return valid;
                    }
                    if (team.sport.name.trim() === '') {
                        comp.validationError = 'יש לבחור ענף ספורט';
                        return false;
                    }
                    if (team.sport.gender == null || team.sport.gender < 1) {
                        comp.validationError = 'יש לבחור מגדר';
                        return false;
                    }
                    if (team.agesResult === 0) {
                        comp.validationError = 'יש לבחור גילאים';
                        return false;
                    }
                    if (team.association.type == null) {
                        comp.validationError = 'יש לבחור שיוך לאגודה';
                        return false;
                    }
                    if (team.association.type == 5 && (!team.association.name || team.association.name.trim() === '')) {
                        comp.validationError = 'יש להזין שם אגודה';
                        return false;
                    }
                    if (team.association.type > 0 && !team.associationApprove) {
                        comp.validationError = 'יש להצהיר שהקבוצה שייכת לאגודה';
                        return false;
                    }
                    if (!verifyFields(team.coach, ['phoneNumber', 'email', 'name', 'gender', 'certification'])) {
                        comp.validationError = 'יש להזין פרטי מאמן מלאים';
                        return false;
                    }
                    var validActivity = isActivityValid(team.activity);
                    if (!validActivity) {
                        comp.validationError = 'יש להזין זמני פעילות תקינים';
                    } else {
                        comp.validationError = '';
                    }
                    return validActivity;
                }

                var comp = this;
                var team = comp.team;
                team.agesResult = getAges(comp.ages);
                return isFormValid(comp,team);

            },
            computeEndTime: function(index) {
                var activity = this.team.activity[index];
                var startIndex = this.startHours.findIndex(function(hour){
                    return hour.value == activity.startTime;
                });
                activity.endHours =  this.endHours.slice(startIndex);
            }
        }
    });

    return SportEqualityTeamDialogComponent;
});