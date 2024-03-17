define(["templates/manage", "manage/dal", "dialog", "utils"], function (templates, dal, Dialog, utils) {

    function isShirtNumbersValid(from , to) {
        if (from === null || to === null || from === '' || to === ''  ) {
            return true;
        }

        return from < to;
    }

    function readSchools(comp) {
        var requestParams = {};
        if (comp.region >= 0)
            requestParams.region = comp.region;
        dal.getSchools(requestParams).then(function (res) {
            comp.schools = res.map(function(sc) {
                sc.label = sc.name + ' ' + sc.Symbol;
                return sc;
            });
            comp.record.School = null;
        });
    }

    function checkTeamNumberValidity(comp, rawNumber) {
        var teamNumber = (rawNumber || '').replace("'", "");
        if (comp.teamNumbersInUse != null && comp.teamNumbersInUse.length > 0) {
            return comp.teamNumbersInUse.map(function(teamNumber) {
                return teamNumber.replace("'", "");
            }).indexOf(teamNumber) === -1;
        }
        return true;
    }

    var NewTeam = Vue.extend({
        template: templates['new-team'],
        data: function() {
            return  {
                schools: [],
                facilities: [],
                // status: '',
                // teamNumber: '',
                // supervisor: '',
                // registrationDate: '',
                // shirtNumberFrom: null,
                // shirtNumberTo: null,
                schoolId: {},
                isValid: false,
                states:{
                    edit: 1,
                    new: 2,
                    view: 3,
                    duplicate: 4,
                },
                roles: [
                    {
                        id: 2,
                        name: 'מנהל',
                    },
                    {
                        id: 4,
                        name: 'נציג רשות',
                    },
                    {
                        id: 8,
                        name: 'מפקח',
                    }
                ],
                adminStatuses: [{
                    Id: 0,
                    Name: '[ללא סטטוס]',
                }, {
                    Id: 1,
                    Name: 'רשומה',
                }, {
                    Id: 2,
                    Name: 'מאושרת',
                }],
                record: {},
                region: -1,
                regions: [],
                chargeSeason: -1,
                chargeSeasons: [],
                state: 0,
                teamInfoOpen: true,
                rolesInfoOpen: false,
                facilityOpen: false,
                changed: false,
                teamNumbersInUse: [],
                description: '',
                category: 0,
                existingTeamNumbers: [],
                generalErrorMessage: '',
                schoolData: null,
                schoolPanelOpen: true,
                activityTimesPanelOpen: false,
                hostingHoursPanelOpen: false,
                startHours: utils.getStartHours(),
                activityEndHours: utils.getEndHours(),
                hostingEndHours: utils.getEndHours(),
                facilityRegion: -1,
                facilityCities: [],
                facilityCity: -1,
                regionFacilities: [],
                teamFacility: null,
                maxTeams: 4,
                overMaxTeams: false,
                addingNewFacility: false,
                newFacility: {
                    Name: '',
                    Address: ''
                }
            };
        },
        mounted: function() {
            var comp = this;
            dal.getSeasons().then(function(seasons) {
                comp.chargeSeasons = seasons;
                utils.sortByName(comp.chargeSeasons);
                dal.getRegions().then(function(regions) {
                    comp.regions = regions;
                    utils.sortByName(comp.regions);
                });
            });
            readSchools(comp);
            comp.record.School = comp.record.School || {};
            comp.schoolId = {
                value: comp.record.School.School,
                key: 'Id',
            };
            comp.record.City = comp.record.City || {};
            comp.record.Region = comp.record.Region || {};
            comp.record.Championship = comp.record.Championship || {};
            comp.record.Coach = comp.record.Coach || {};
            comp.record.CoachHelper = comp.record.CoachHelper || {};
            comp.record.Manager = comp.record.Manager || {};
            comp.record.Teacher = comp.record.Teacher || {};
            comp.record.Facility = comp.record.Facility || {};
            comp.record.AlternativeFacility = comp.record.AlternativeFacility || '';
            if (comp.state === comp.states.new) {
                comp.record.AdminStatus = comp.adminStatuses[2].Id;
            } else {
                comp.record.isAthletics = comp.isAthletics();
            }
            if (comp.state === comp.states.duplicate) {
                comp.record.AdminStatus = comp.adminStatuses[0].Id;
            }
            if (comp.record.RegistrationDate != null && comp.record.RegistrationDate.getFullYear() < 2000) {
                comp.record.RegistrationDate = null;
            }
            if (comp.state !== comp.states.new && comp.record.TeamId == null) {
                //can only confirm registration team
                comp.adminStatuses = comp.adminStatuses.filter(function(adminStatus) {
                    return adminStatus.Id === 2;
                });
            }
            comp.schoolData = {
                representativeLoginLink: comp.record.RepresentativeLoginLink,
                principalLoginLink: comp.record.PrincipalLoginLink,
                gotData: false
            };
            comp.schoolData.gotData = comp.schoolData.representativeLoginLink != null || comp.schoolData.principalLoginLink != null;
            if (comp.record && comp.record.School && comp.record.IsClub) {
                dal.getSchoolRegistrationData(comp.record.School.School).then(function (registrationData) {
                    comp.schoolData.registration = registrationData;
                    if (comp.schoolData.registration != null) {
                        comp.schoolData.registration.coordinatorDisplay = '';
                        if (comp.schoolData.registration.Coordinator != null) {
                            comp.schoolData.registration.coordinatorDisplay = [
                                comp.schoolData.registration.Coordinator.Name,
                                comp.schoolData.registration.Coordinator.PhoneNumber,
                                comp.schoolData.registration.Coordinator.Email
                            ].join(', ');
                            comp.schoolData.gotData = true;
                            comp.$forceUpdate();
                        }
                    }
                });
            }
            if (comp.record.ActivityTimes == null || !comp.record.ActivityTimes.length)
                comp.record.ActivityTimes = [{}];
            if (comp.record.HostingHours == null || !comp.record.HostingHours.length)
                comp.record.HostingHours = [{}];
            utils.activityMethods.computeEndTime(comp.record.ActivityTimes);
            utils.activityMethods.computeEndTime(comp.record.HostingHours);

            comp.teamFacility = comp.record.Facility ? comp.record.Facility.Id : null;
            if (comp.record.Region != null) {
                var regionId = comp.record.Region.Id;
                comp.facilityRegion = regionId;
                comp.facilityRegionChanged(function() {
                    comp.facilityCity = comp.record.City;
                    comp.facilityCityChanged(function() {
                        if (comp.record.Facility != null) {
                            comp.record.Facility.Id = comp.teamFacility;
                        }
                    });
                });
            }
            comp.overMaxTeams = comp.teamNumbersInUse != null &&
                comp.state == comp.states.duplicate &&
                comp.teamNumbersInUse.length >= comp.maxTeams;
            if (comp.state == comp.states.duplicate) {
                var teamNumber = comp.record.TeamNumber == null || comp.record.TeamNumber.length === 0 ? 'א' : comp.record.TeamNumber;
                var nextTeamNumber = String.fromCharCode(teamNumber.charCodeAt(0) + 1);
                while (!checkTeamNumberValidity(comp, nextTeamNumber))
                    nextTeamNumber = String.fromCharCode(nextTeamNumber.charCodeAt(0) + 1);
                comp.record.TeamNumber = nextTeamNumber;
                comp.record.RegistrationDate = new Date();
                comp.record.AdminStatus = comp.adminStatuses[2].Id;
            }
            //console.log(comp.record);
        },
        methods: {
            activityMethods: function() {
                return utils.activityMethods;
            },
            toggleTeamInfo: function() {
                this.teamInfoOpen = !this.teamInfoOpen;
            },
            toggleSchoolPanel: function() {
                this.schoolPanelOpen = !this.schoolPanelOpen;
            },
            toggleActivityTimesPanel: function() {
                this.activityTimesPanelOpen = !this.activityTimesPanelOpen;
            },
            toggleHostingHoursPanel: function() {
                this.hostingHoursPanelOpen = !this.hostingHoursPanelOpen;
            },
            resetChargeSeason: function() {
                this.chargeSeason = -1;
            },
            invalidFormReason: function() {
                var comp = this;
                var reason = null;
                if (comp.state === comp.states.new) {
                    if (comp.record == null || comp.record.School == null || !comp.record.School.Id) {
                        reason = 'יש לבחור בית ספר';
                    } else {
                        if (comp.existingTeamNumbers != null && comp.existingTeamNumbers.length > 0) {
                            var currentNumber = (comp.record.TeamNumber || '').replace("'", "");
                            if (comp.existingTeamNumbers.indexOf(currentNumber) >= 0) {
                                reason = currentNumber.length > 0 ?
                                    'מספר קבוצה כבר בשימוש נא להזין מספר אחר' :
                                    'קיימות קבוצות נוספות, יש להזין מספר קבוצה ייחודי';
                            }
                        }
                    }
                }
                return reason;
            },
            isValidTeamNumber: function() {
                var comp = this;
                return checkTeamNumberValidity(comp, comp.record.TeamNumber);
            },
            toggleRoles: function() {
                this.rolesInfoOpen = !this.rolesInfoOpen;
            },
            toggleFacility: function() {
                this.facilityOpen = !this.facilityOpen;
            },
            validateTeam: function(){
                this.isValid = this.record.School !== null &&
                    this.record.Championship !== null &&
                    //this.record.TeamNumber !== null &&
                    (!this.record.isAthletics ||
                        this.record.isAthletics && isShirtNumbersValid(this.record.PlayerNumberFrom, this.record.PlayerNumberTo));
            },
            saveRecord: function() {
                var comp = this;
                comp.generalErrorMessage = '';
                comp.record.ChargeSeason = comp.chargeSeason;
                if (comp.state == comp.states.duplicate) {
                    if (comp.record.School == null && comp.schoolId != null)
                        comp.record.School = comp.schoolId.value;
                    //console.log(comp.record);
                    dal.addTeam(comp.record).then(function (res) {
                        comp.record.Id = res.body.newTeamId;
                        comp.confirm();
                    }, function(err) {
                        comp.generalErrorMessage = err.bodyText || err.body || '';
                        window.setTimeout(function() {
                            comp.resetGeneralErrorMessage();
                            comp.$forceUpdate();
                        }, 10000);
                    });
                } else if (comp.state == comp.states.edit) {
                    comp.record.addingNewFacility = comp.addingNewFacility;
                    comp.record.newFacility = comp.newFacility;
                    dal.editTeam(comp.record).then(function (res) {
                        comp.confirm();
                    }, function(err) {
                        comp.generalErrorMessage = err.bodyText || err.body || err || '';
                        window.setTimeout(function() {
                            comp.resetGeneralErrorMessage();
                            comp.$forceUpdate();
                        }, 10000);
                    });
                } else {
                    //console.log(comp.record);
                    var teamObject = {
                        TeamNumber: comp.record.TeamNumber,
                        ChargeSeason: comp.chargeSeason,
                        School: comp.record.School.Id,
                        Category: {
                            Id: comp.category
                        },
                        AdminStatus: comp.record.AdminStatus
                    };
                    dal.addTeam(teamObject).then(function (res) {
                        //console.log(res);
                        comp.confirm();
                    }, function(err) {
                        comp.generalErrorMessage = err.bodyText || err.body || '';
                        window.setTimeout(function() {
                            comp.resetGeneralErrorMessage();
                            comp.$forceUpdate();
                        }, 10000);
                    });
                }
            },
            setRegistrationDate: function(event) {
                var comp = this;
                comp.changed = true;
                comp.record.RegistrationDate = event;
            },
            setRoleApproval: function() {
                var approve = 1;

                this.roles.forEach(function(role){
                    if (role.value) {
                        approve |= role.id;
                    }
                });

                this.record.Approved = approve;
            },
            setRoleOptions: function() {
                if (!this.record.Approved) {
                    return;
                }

                var roles = this.record.Approved.toString(2);
                while(roles.length < 4) {
                    roles = "0" + roles;
                }

                if (roles[roles.length - 2] == 1) {
                    this.roles[0].value = true;
                }

                if (roles[roles.length - 3] == 1) {
                    this.roles[1].value = true;
                }

                if (roles[roles.length - 4] == 1) {
                    this.roles[2].value = true;
                }
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                //console.log(this.record);
                this.$emit("close", this.record);
            },
            isAthletics: function() {
                var athleticsSports = [82, 86, 24];
                return athleticsSports.indexOf(this.record.Sport.Id) >= 0;
            },
            handleRecordChange: function() {
                this.validateTeam();
                this.changed = true;
                if (this.record.Id) {
                    this.setRoleOptions();
                }
            },
            teamNumberChanged: function() {
                var comp = this;
                comp.changed = true;
                comp.$forceUpdate();
            },
            teamStatusChanged: function() {
                var comp = this;
                comp.changed = true;
            },
            setSchool: function(school) {
                var comp = this;
                comp.existingTeamNumbers = [];
                comp.record = Object.assign(comp.record, {});
                if (comp.record != null && comp.record.School != null && comp.record.School.Id) {
                    //console.log('reading team numbers for ' + comp.record.School.Id);
                    dal.getTeamNumbers(comp.category, comp.record.School.Id).then(function(teamNumbers) {
                        comp.existingTeamNumbers = teamNumbers;
                        if (comp.existingTeamNumbers != null && comp.existingTeamNumbers.length > 0) {
                            var possibleNumbers = ["א", "ב", "ג", "ד"];
                            for (var i = 0; i < possibleNumbers.length; i++) {
                                var curPossibleNumber = possibleNumbers[i];
                                if (comp.existingTeamNumbers.indexOf(curPossibleNumber) < 0) {
                                    comp.record.TeamNumber = curPossibleNumber;
                                    break;
                                }
                            }
                        }
                        comp.$forceUpdate();
                    });
                }
                if (typeof school !== 'undefined')
                    comp.handleRecordChange();
            },
            regionChanged: function() {
                var comp = this;
                readSchools(comp);
            },
            facilityRegionChanged: function(callback) {
                if (typeof callback === 'undefined' || callback == null)
                    callback = new Function();
                var comp = this;
                var regionId = comp.facilityRegion;
                if (regionId != null) {
                    dal.getFacilities({region: regionId}).then(function (res) {
                        var facilities = res.slice(0);
                        comp.regionFacilities = res.slice(0);
                        utils.sortByName(facilities);
                        comp.facilities = facilities;

                        var cities = utils.distinctArray(facilities.map(function(facility) {
                            return facility.City || {};
                        }).filter(function(city) {
                            return city.Id != null && city.Id > 0;
                        }), 'Id');
                        utils.sortByName(cities);
                        comp.facilityCities = [
                            {
                                Id: -1,
                                Name: 'כל הרשויות'
                            }
                        ];
                        comp.facilityCity = -1;
                        cities.forEach(function(city) {
                            comp.facilityCities.push(city);
                        });
                        if (comp.record.Facility != null) {
                            comp.record.Facility.Id = null;
                        }

                        callback();
                    });
                } else {
                    callback();
                }
            },
            facilityCityChanged: function(callback) {
                if (typeof callback === 'undefined' || callback == null)
                    callback = new Function();
                var comp = this;
                var cityId = comp.facilityCity;
                if (comp.record.Facility != null) {
                    comp.record.Facility.Id = null;
                }
                if (cityId != null && cityId > 0) {
                    dal.getFacilities({city: cityId}).then(function (res) {
                        var facilities = res.slice(0);
                        utils.sortByName(facilities);
                        comp.facilities = facilities;
                        callback();
                    });
                } else {
                    comp.facilities = comp.regionFacilities;
                    callback();
                }
            },
            resetFacility: function() {
                var comp = this;
                if (comp.record.Facility != null) {
                    comp.record.Facility.Id = null;
                }
            },
            addFacility: function() {
                var comp = this;
                comp.addingNewFacility = true;
            },
            abortAddingFacility: function() {
                var comp = this;
                comp.addingNewFacility = false;
            },
            resetGeneralErrorMessage: function() {
                var comp = this;
                comp.generalErrorMessage = '';
            }
        },
        watch: {
            record : {
                handler: function() {
                    this.handleRecordChange();
                },
                deep: true
            }
        }
    });

    return NewTeam;
});