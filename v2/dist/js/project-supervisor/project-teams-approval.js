define(["templates/project-supervisor", "utils", "dialog", "services/access", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access) {

        var Approval = {
            Admin: 1,
            SportAdmin: 2
        };

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
                name: 'פלא',
                link: "pele"
            }
        ];

        function getById(list, id) {
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item.id === id) {
                    return item;
                }
            }
            return null;
        }

        function translateTeamStatus(rawStatus) {
            if (rawStatus >= 16)
                return 'לא אושר';
            if (rawStatus >= 8)
                return 'אושר';
            return 'ממתין לאישור';
        }

        function readTeams(comp, callback) {
            if (typeof callback === 'undefined')
                callback = null;
           var url = '/api/v2/admin/projects/' + comp.project.id + "/teams?season=" + comp.season;
           Vue.http.get(url).then(function (resp) {
               comp.teams = [];
               for (var i = 0; i < resp.body.length; i++) {
                   var team = resp.body[i];
                   var percent = Math.round(100 * team.peleCount / team.players.length);
                   team.isOk = team.activity && team.activity.length > 1 &&
                       team.players.length > 9 && team.players.length < 16 &&
                       percent >= 20 && percent <= 40;
                   team.approvedByAdminAndSupervisor = (team.approved & Approval.SportAdmin) !== 0 && (team.approved & Approval.Admin) !== 0;
                   comp.teams.push(team);
               }
               comp.teams.sort(function(a, b){
                   return new Date(b.createdAt) - new Date(a.createdAt);
               });

               comp.totalTeams = comp.teams.length;
               comp.totalOkTeams = comp.teams.filter(function(team){ return team.isOk}).length;
               comp.totalNotOkTeams = comp.teams.filter(function(team){ return !team.isOk}).length;
               comp.totalApprovedTeams = comp.teams.filter(function(team){ return team.approvedByAdminAndSupervisor}).length;
               if (callback != null)
                   callback();
           }, function (err) {
               console.log(err);
               if (callback != null)
                   callback();
           });
       }

       var ProjectTeamsApprovalComponent = Vue.extend({
           template: templates["project-teams-approval"],
           data: function () {
               return {
                   user: Access.user,
                   isAdmin: false,
                   teams: [],
                   seasons: [],
                   season: null,
                   mounting: true,
                   columns: [
                       {
                           key: 'id',
                           name: 'זיהוי',
                           active: true
                       },
                       {
                           key: 'city.name',
                           name: 'רשות',
                           active: true
                       },
                       {
                           key: 'region.name',
                           name: 'מחוז',
                           active: true
                       },
                       {
                           key: 'item1.name',
                           name: 'ענף',
                           getter: function (record) {
                               if (record.item1) {
                                   return record.item1.name +
                                       (record.item1.team ? " (קבוצתי)" : "");
                               }
                               return null;
                           },
                           active: true
                       },
                       {
                           key: 'item1.gender',
                           name: 'מגדר',
                           lookup: {
                               "1": "ספורטאים",
                               "2": "ספורטאיות",
                               "3": "מעורב"
                           },
                           active: true
                       },
                       {
                           key: 'coach.certification',
                           name: 'הסמכת מאמן/ת מדריך/ה',
                           lookup: {
                               "0": "מדריך/ה",
                               "1": "מאמן/ת"
                           },
                           active: true
                       },
                       {
                           name: 'מספר אימונים בשבוע',
                           getter: function (record) {
                               return record.activity ? record.activity.length : "";
                           },
                           active: true
                       },
                       {
                           name: 'סה"כ ספורטאים',
                           getter: function (record) {
                               return record.players.length;
                           },
                           active: true
                       },
                       {
                           name: 'סה"כ ספורטאי פל"א',
                           key: 'peleCount',
                           active: true
                       },
                       {
                           name: 'אחוז ספורטאי פל"א',
                           getter: function (record) {
                               return record.players.length ? Math.round(100 * record.peleCount / record.players.length) + "%" : "0%";
                           },
                           active: true
                       },
                       {
                           name: 'תאריך תחילת פעילות',
                           getter: function (record) {
                               return record.item3.startDate;
                           },
                           active: true
                       },
                       {
                           name: 'תאריך סיום פעילות',
                           getter: function (record) {
                               return record.item3.endDate;
                           },
                           active: true
                       },
                       {
                           name: 'עומד בקריטריון כן/לא',
                           getter: function (record) {
                               var percent = Math.round(100 * record.peleCount / record.players.length);
                               return (record.activity && record.activity.length > 1 &&
                                        record.players.length > 9 && record.players.length < 16 &&
                                   percent >= 20 && percent <= 40) ? 'כן' : 'לא';
                           },
                           active: true
                       },
                       {
                           name: 'אישור מנהל/ת פרוייקט',
                           getter: function (record) {
                               if ((record.approved & Approval.Admin) !== 0) {
                                   var approval = record.approvals ? record.approvals["project-team:" + Approval.Admin] : null;
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
                           },
                           active: true
                       },
                       {
                           name: 'אישור מפקח/ת מחוז',
                           getter: function (record) {
                               if ((record.approved & Approval.SportAdmin) !== 0) {
                                   var approval = record.approvals ? record.approvals["project-team:" + Approval.SportAdmin] : null;
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
                           },
                           active: true
                       },
                       {
                           name: 'האם הקבוצה מאושרת?',
                           getter: function (record) {
                               if (record.approvedByAdminAndSupervisor) {
                                   return ' כן';
                               } else {
                                   return 'לא';
                               }
                           },
                           active: true
                       }],
                    loggedUser: null,
                    searchText: "",
                    isSelectAll: false,
                    selectedTeams: [],
                    selectedStatus: null,
                    totalTeams: 0,
                    totalOkTeams: 0,
                    totalNotOkTeams: 0,
                    totalApprovedTeams: 0,
                    selectedTeamsCount: 0
                };
            },
            mounted: function () {
                var comp = this;
                comp.isAdmin = this.user.roles.indexOf('admin') >= 0;
                comp.project = Projects[2]; // only pele for now
                comp.caption = "קבוצות";
                if (comp.project) {
                    comp.caption += " - " + comp.project.name;
                }
                comp.seasons = [];
                var error = function(err) {
                    console.log(err);
                    comp.mounting = false;
                };
                Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        comp.seasons.push(resp.body[i]);
                    }
                    Vue.http.get('/api/v2/season').then(function (resp) {
                        var curSeason = resp.body.season;
                        if (curSeason) {
                            comp.season = curSeason;
                        }
                        readTeams(comp, function() {
                            comp.mounting = false;
                        });
                    }, error);
                }, error);
            },
            watch: {
                season: function() {
                    var comp = this;
                    if (!comp.mounting) {
                        Vue.http.post('/api/v2/registration/season', {season: comp.season}).then(function (resp) {
                            //console.log('saved');
                        }, function (err) {
                            //console.log('error');
                        });
                        readTeams(comp);
                    }
                }
            },
            methods: {
                getUserApproval: function () {
                    if (Access.user.roles.indexOf('admin') >= 0) {
                        return Approval.Admin;
                    }
                    else if (Access.user.roles.indexOf('sport-admin') >= 0) {
                        return Approval.SportAdmin;
                    }
                },
                handleSelectionChange: function () {
                    var userApproval = this.getUserApproval();
                    if (userApproval) {
                        this.selectedTeams.splice(0, this.selectedTeams.length);
                        this.selectedStatus = null;
                        for (var i = 0; i < this.teams.length; i++) {
                            var team = this.teams[i];
                            if (team.selected) {
                                if ((team.approved & userApproval) !== 0) {
                                    if (this.selectedStatus == null) {
                                        this.selectedStatus = 1;
                                    }
                                } else {
                                    this.selectedStatus = 0;
                                }
                                this.selectedTeams.push(team);
                            }
                        }
                        this.selectedTeamsCount = this.selectedTeams.length;
                    }
                },
                openTeamDetails: function() {
                    var comp = this;
                    if (comp.selectedTeams != null && comp.selectedTeams.length === 1) {
                        var selectedTeam = comp.selectedTeams[0];
                        var url = '/api/v2/registration/project/' + comp.project.id + '/teams?team=' + selectedTeam.id + '&players=1&season=' + comp.season;
                        Vue.http.get(url).then(function (resp) {
                            if (resp.body && resp.body.length > 0) {
                                var registrationTeam = resp.body[0];
                                registrationTeam.sport = JSON.parse(registrationTeam.item1);
                                registrationTeam.association = JSON.parse(registrationTeam.item2);
                                if (registrationTeam.item3) {
                                    var item3 = JSON.parse(registrationTeam.item3);
                                    registrationTeam.alternativeFacility = item3.alternativeFacility;
                                    registrationTeam.startDate = item3.startDate;
                                    registrationTeam.endDate = item3.endDate;
                                }
                                registrationTeam.approvedByAdminAndSupervisor = (registrationTeam.approved & Approval.SportAdmin) !== 0 && (registrationTeam.approved & Approval.SportAdmin) !== 0;
                                if (registrationTeam.players) {
                                    for (var p = 0; p < registrationTeam.players.length; p++) {
                                        var player = registrationTeam.players[p];
                                        if (player.item1) {
                                            var item1 = JSON.parse(player.item1);
                                            if (item1) {
                                                player.isPele = item1.isPele;
                                                player.peleJoinDate = item1.peleJoinDate;
                                            }
                                        }
                                        if (!player.yearOfBirth && player.birthDate) {
                                            player.yearOfBirth = new Date(player.birthDate).getFullYear();
                                        }
                                    }
                                }
                                Dialog.open("project-supervisor/project-team-details", { team: registrationTeam },
                                    function (err, result) {

                                    }
                                );
                            } else {
                                alert('שגיאה כללית, נא לנסות שוב מאוחר יותר');
                            }
                        });
                    }
                },
                approveTeams: function() {
                    if (this.selectedTeams.length === 0) {
                        return;
                    }
                    var userApproval = this.getUserApproval();
                    if (!userApproval) {
                        return;
                    }
                    var teams = [];
                    for (var n = 0; n < this.selectedTeams.length; n++) {
                        var team = this.selectedTeams[n];
                        if ((team.approved & userApproval) !== 1) {
                            teams.push(team.id);
                        }
                    }
                    var comp = this;
                    Vue.http.post('/api/v2/admin/projects/' + encodeURIComponent(this.project.id) + "/teams/approval", {
                        teams: teams,
                        approve: userApproval
                    })
                        .then(
                            function (resp) {
                                comp.selectedStatus = 1;
                                for (var n = 0; n < resp.body.length; n++) {
                                    var team = getById(comp.teams, resp.body[n]);
                                    console.log(team);
                                    if (team) {
                                        team.approved |= userApproval;
                                        team.approvals["project-team:" + userApproval] = {
                                            time: new Date()
                                        };
                                    }
                                }
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                },
                clearTeamsApprove: function() {
                    if (this.selectedTeams.length === 0) {
                        return;
                    }
                    var userApproval = this.getUserApproval();
                    if (!userApproval) {
                        return;
                    }
                    var teams = [];
                    for (var n = 0; n < this.selectedTeams.length; n++) {
                        var team = this.selectedTeams[n];
                        if ((team.approved & userApproval) !== 0) {
                            teams.push(team.id);
                        }
                    }
                    var comp = this;
                    Vue.http.post('/api/v2/admin/projects/' + encodeURIComponent(this.project.id) + "/teams/approval", {
                        teams: teams,
                        clear: userApproval
                    })
                        .then(
                            function (resp) {
                                comp.selectedStatus = 0;
                                for (var n = 0; n < resp.body.length; n++) {
                                    var team = getById(comp.teams, resp.body[n]);
                                    if (team) {
                                        team.approved = (team.approved || 0) & ~(userApproval);
                                    }
                                }
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                },
                logout: function() {
                    Access.logout();
                }
            }
        });

        return ProjectTeamsApprovalComponent;
    });