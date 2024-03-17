define(["templates/registration", "services/access", "dialog", "utils"], function (templates, Access, Dialog, utils) {

    var Approval = {
        Admin: 1,
        SportAdmin: 2
    };

    function getTeams(comp) {
        Vue.http.get('/api/v2/registration/project/5/teams?players=1').then(function(result) {
            comp.teams = result.body;
            comp.selectionCount = 0;
            comp.selectAll = false;
            //console.log(comp.teams);
            comp.teams.forEach(function(team, index) {
                team.index = index + 1;
                team.sport = JSON.parse(team.item1);
                team.association = JSON.parse(team.item2);
                if (team.item3) {
                    var item3 = JSON.parse(team.item3);
                    team.alternativeFacility = item3.alternativeFacility;
                    team.startDate = item3.startDate;
                    team.endDate = item3.endDate;
                }
                var percent = Math.round(100 * team.peleCount / team.players.length);
                team.isOk = team.activity && team.activity.length > 1 &&
                    team.players.length > 9 && team.players.length < 16 &&
                    percent >= 20 && percent <= 40;
                team.approvedByAdminAndSupervisor = (team.approved & Approval.SportAdmin) !== 0 && (team.approved & Approval.SportAdmin) !== 0;
            });

            comp.totalTeams = comp.teams.length;
            comp.totalOkTeams = comp.teams.filter(function(team){ return team.isOk}).length;
            comp.totalNotOkTeams = comp.teams.filter(function(team){ return !team.isOk}).length;
            comp.totalApprovedTeams = comp.teams.filter(function(team){ return team.approvedByAdminAndSupervisor}).length;
        })
    }

    function deleteTeams(teams) {
        return Vue.http.post('/api/v2/registration/project/5/teams/delete', teams);
    }

    function getTimeText(time) {
        var min = time % 60;
        var hour = (time - min) / 60;
        return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
    }

    function getTeamApproval(team, approvalValue) {
        if ((team.approved & approvalValue) !== 0) {
            var approval = team.approvals ? team.approvals["project-team:" + approvalValue] : null;
            if (approval) {
                var value = new Date(approval.time);
                return ('0' + value.getDate()).slice(-2) + "/" +
                    ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
                    ('000' + value.getFullYear()).slice(-4) + " " +
                    ('0' + value.getHours()).slice(-2) + ":" +
                    ('0' + value.getMinutes()).slice(-2) +
                    ' ' +
                    approval.firstName +
                    ' ' +
                    approval.lastName;
            }
            return "אושר";
        }
        return "";
    }


    var RegistrationProjectSportEqualityTeamsComponent = Vue.extend({
        template: templates["sport-equality-teams"],
        data: function () {
            return {
                user: Access.user,
                teams: [],
                selectionCount: 0,
                selectAll: false,
                days: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"],
                sports: [
                    {name: 'אופני טנדם'},
                    {name: 'אופנים'},
                    {name: 'אתלטיקה'},
                    {name: 'באולינג'},
                    {name: 'בדמינטון'},
                    {name: 'בוצ\'ה'},
                    {name: 'הליכה'},
                    {name: 'התעמלות במים'},
                    {name: 'כדורגל'},
                    {name: 'כדורסל'},
                    {name: 'כדורשת'},
                    {name: 'כש"ג'},
                    {name: 'ספורט ימי'},
                    {name: 'פלדנקרייז'},
                    {name: 'קטרגל'},
                    {name: 'ריצה'},
                    {name: 'שחייה'},
                    {name: 'שיעורי סטודיו'}
                ],
                facilityTypes: [
                    { id: 0, name: 'מגרש'},
                    { id: 1, name: 'אולם'},
                    { id: 2, name: 'סטודיו'},
                    { id: 3, name: 'בריכה'},
                    { id: 4, name: 'אצטדיון'},
                    { id: 999, name: 'אחר...'}
                ],
                totalTeams: 0,
                totalOkTeams: 0,
                totalNotOkTeams: 0,
                totalApprovedTeams: 0,
                currentSeasonName: '',
                teamRegistrationDisabled: false
            }
        },
        mounted: function () {
            var comp = this;
            var url = '/api/v2/seasons';
            Vue.http.get(url).then(function(resp) {
                var seasons = resp.body;
                if (seasons != null) {
                    for (var i = 0; i < seasons.length; i++) {
                        var season = seasons[i];
                        if (season.id == comp.user.season) {
                            comp.currentSeasonName = season.name;
                            break;
                        }
                    }
                }
                /*
                utils.readServerCache('sport-equality-team-registration', true, function(err, value) {
                    comp.teamRegistrationDisabled = !utils.isTrue(value);
                });
                */
            });
            getTeams(comp);
        },
        methods: {
            handleSelectionChange: function(team) {
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
            isFormValid: function() {
                return true;
            },
            next: function () {
                console.log("next");
            },
            getActivityText: function (activity) {
                var d = this.days;
                return activity.map(function (a) {
                    if (a.day != null) {
                        return d[a.day] +
                            (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                            (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
                    }
                    return "";
                }).join("; ");
            },
            getAgesText: function(ages) {
                var base2 = ages.toString(2);
                var agesText = ['12-16', '17-21', '21-40', '40+', '60+', '80+', '', '', ''];
                var result = [];

                for (var i = base2.length - 1; i >= 0; i--) {
                    if (base2[i] == '0') {
                        continue;
                    }

                    result.push(agesText[base2.length - 1 - i]);
                }
                return result.join(', ');
            },
            getSportName: function(sportId) {
                if (this.sports.length == 0) {
                    return;
                }

                return this.sports.find(function(s){
                    return s.id === sportId;
                }).name;
            },
            getCertificationText: function(cert) {
                return cert === 0 ? 'מדריך' : 'מאמן'
            },
            getGender: function (gender) {
                switch (parseInt(gender, 10)) {
                    case 1:
                        return  "ספורטאים";
                    case 2:
                        return "ספורטאיות";
                    case 3:
                        return "מעורב";
                    default:
                        return "";
                }
            },
            getSportType: function(sportType) {
                switch (parseInt(sportType, 10)) {
                    case 1:
                        return  "תחרותי";
                    case 2:
                        return "עממי";
                    default:
                        return "";
                }
            },
            newTeam: function() {
                var comp = this;
                Dialog.open("registration/project/sport-equality-team-dialog", {facilityTypes: comp.facilityTypes, sports: comp.sports},
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        getTeams(comp);
                    });
            },
            editTeam: function(){
                var comp = this;
                var team = this.teams.find(function(t){return t.selected});
                Dialog.open("registration/project/sport-equality-team-dialog", {facilityTypes: comp.facilityTypes, sports: comp.sports, team: team},
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        getTeams(comp);
                    });
            },
            deleteTeam: function() {
                var comp = this;
                var teams = comp.teams.filter(function(t) { return t.selected; }).map(function(x) { return x.id; });
                if (teams.length === 0) {
                    return;
                }
                Dialog.open("general/message-box",
                    {
                        caption: "מחיקת קבוצה",
                        message: teams.length === 1 ? "האם להסיר את רישום הקבוצה מהרשות?" : "האם להסיר את רישום הקבוצות מהרשות?",
                        alert: true,
                        confirmText: "כן",
                        cancelText: "לא"
                    }, function (err, result) {
                        if (result === true) {
                            deleteTeams(teams)
                                .then(function() {
                                    getTeams(comp);
                                })
                                .catch(function(err) {
                                    Dialog.open("general/message-box",
                                        {
                                            caption: "מחיקת קבוצה",
                                            message: "אירעה שגיאה במחיקת קבוצה, יש לוודא שלא משויכים שחקנים לקבוצה לפני מחיקתה",
                                            alert: true
                                        });
                                });
                        }
                    });
            },
            next: function () {
                // go to next page
                Vue.http.put('/api/v2/registration/project/5/status/2', {});
                this.$emit('next')
            },
            isApprovedByAdmin: function(team) {
                return getTeamApproval(team, Approval.Admin);
            },
            isApprovedBySportAdmin: function(team) {
                return getTeamApproval(team, Approval.SportAdmin);
            },
            isApproved: function (team) {
                if (team.approvedByAdminAndSupervisor) {
                    return ' כן';
                } else {
                    return 'לא';
                }
            }
        },
        watch: {

        }
    });

    return RegistrationProjectSportEqualityTeamsComponent;
});