define(["templates/registration", "dialog"], function (templates, Dialog) {

    var Approval = {
        Admin: 1,
        SportAdmin: 2
    };

    function getTeamsAndPlayers(comp, callback) {
        Vue.http.get('/api/v2/registration/project/3/teams?players=true').
        then(function (resp) {
            var teams = resp.body;
            var playerTeamsMapping = {};
            comp.totalPlayers = 0;
            for (var n = 0; n < teams.length; n++) {
                var team = teams[n];
                team.approvedByAdminAndSupervisor = (team.approved & Approval.SportAdmin) !== 0 && (team.approved & Approval.SportAdmin) !== 0;
                if (team.item1) {
                    var item1 = JSON.parse(team.item1);
                    team.sport = item1.name;
                    team.gender = item1.gender;
                    team.isGroup = item1.team;
                }
                comp.totalPlayers += team.players.length;
                for (var p = 0; p < team.players.length; p++) {
                    var player = team.players[p];
                    var item1 = null;
                    if (player.item1) {
                        item1 = JSON.parse(player.item1);
                    }
                    if (item1) {
                        player.isPele = item1.isPele;
                        player.peleJoinDate = item1.peleJoinDate;
                    }
                    if (!player.yearOfBirth && player.birthDate) {
                        player.yearOfBirth = new Date(player.birthDate).getFullYear();
                    }
                    if (player.idNumber) {
                        var key = player.idNumber.toString();
                        if (!playerTeamsMapping[key])
                            playerTeamsMapping[key] = [];
                        var matchingTeam = playerTeamsMapping[key].find(function (playerTeam) {
                            return playerTeam.id === team.id;
                        });
                        if (matchingTeam == null) {
                            playerTeamsMapping[key].push(team);
                        }
                    }
                }
            }
            for (var playerIdNumber in playerTeamsMapping) {
                var playerTeams = playerTeamsMapping[playerIdNumber];
                if (playerTeams.length > 1) {
                    var teamNames = playerTeams.map(function (playerTeam) {
                        return playerTeam.sport + ' ' + comp.getTeamGender(playerTeam.gender) + ' - ' + playerTeam.id;
                    });
                    playerTeams.forEach(function (playerTeam) {
                        playerTeam.players.forEach(function (player) {
                            if (player.idNumber == playerIdNumber) {
                                var isMale = player.gender == 1;
                                player.multipleTeams = true;
                                player.tooltip = (isMale ? 'ספורטאי זה רשום ' : 'ספורטאית זו רשומה') +
                                    'לקבוצות הבאות: ' +
                                    teamNames.join(', ');
                            }
                        });
                    });
                }
            }
            $(".cloned-table").remove();
            window.setTimeout(function () {
                var playersTable = $(".pele-players").first()
                //console.log('players: ' + playersTable.find("tr").length);
                var clonedTable = playersTable.clone(true);
                clonedTable.css("max-width", "600px");
                clonedTable.css("margin-right", "150px");
                clonedTable.addClass("cloned-table");
                clonedTable.insertAfter($("#target"));
                //console.log('cloned: ' + clonedTable.find("tr").length);
                clonedTable.find("tr").not(":last").hide();
                playersTable.find("tr").last().hide();
                window.setInterval(function() {
                    if (playersTable.is(":visible")) {
                        clonedTable.show();
                        $(".cloned-table").last().find("tr").last().show();
                    } else {
                        clonedTable.hide();
                    }
                }, 200);
            }, 500);
            callback(null, teams);
        });
    }

    function deletePlayers(team, players) {
        return Vue.http.post('/api/v2/registration/project/3/teams/' + encodeURIComponent(team) + "/players/delete", players);
    }

    var RegistrationProjectPelePlayersComponent = Vue.extend({
        template: templates["pele-players"],
        data: function () {
            return {
                teams: [],
                maxTeamPlayers: 15,
                selectionCount: 0,
                totalPlayers: 0
            };
        },
        computed: {
        },
        mounted: function () {
            var comp = this;
            getTeamsAndPlayers(comp, function (err, teams) {
                comp.teams = teams;
                //console.log(comp.teams);
            });
        },
        methods: {
            togglePanel: function(team) {
                team.__panelOpen = !team.__panelOpen;
                this.teams = this.teams.slice();
            },
            toggleAllPanels: function() {
                var comp = this;
                comp.teams.forEach(function(team) {
                    comp.togglePanel(team);
                });
            },
            getIdType: function(val) {
                return val == 1 ? 'תעודת זהות': 'דרכון'
            },
            getGender: function(val) {
                return val == 1 ? 'זכר' : 'נקבה';
            },
            getTeamGender: function(gender) {
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
            getIsPele: function(val) {
                return val === 1 ? 'כן' : 'לא'
            },
            handleSelectionChange: function(team) {
                team.selectionCount = 0;
                for (var i = 0; i < team.players.length; i++) {
                    if (team.players[i].selected) {
                        team.selectionCount++;
                    }
                }
                team.selectAll = team.selectionCount == team.players.length;
            },
            handleSelectAll: function (team) {
                if (team.selectAll) {
                    for (var i = 0; i < team.players.length; i++) {
                        team.players[i].selected = true;
                    }
                    team.selectionCount = team.players.length;
                }
                else {
                    for (var i = 0; i < team.players.length; i++) {
                        team.players[i].selected = false;
                    }
                    team.selectionCount = 0;
                }
            },
            newPlayer: function(team) {
                var comp = this;
                Dialog.open("registration/project/pele-player-dialog", { team: team },
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        result.player.yearOfBirth = result.player.birthDate.getFullYear();
                        team.players.push(result.player);
                    });
            },
            editPlayer: function(team) {
                var comp = this;
                var player = team.players.find(function(p) {
                    return p.selected;
                });
                Dialog.open("registration/project/pele-player-dialog", { team: team, player: player },
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        result.player.yearOfBirth = result.player.birthDate.getFullYear();
                        for (var n = 0; n < team.players.length; n++) {
                            var p = team.players[n];
                            if (p.id == result.player.id) {
                                team.players.splice(n, 1, result.player);
                                break;
                            }
                        }
                    });
            },
            deletePlayers: function(team) {
                var comp = this;
                var players = team.players.filter(function(t) { return t.selected; }).map(function (x) { return x.id; });
                if (players.length === 0) {
                    return;
                }
                Dialog.open("general/message-box",
                    {
                        caption: "מחיקת שחקן",
                        message: players.length === 1 ? "האם להסיר את רישום השחקן מהקבוצה?" : "האם להסיר את רישום השחקנים מהקבוצה?",
                        alert: true,
                        confirmText: "כן",
                        cancelText: "לא"
                    }, function (err, result) {
                        if (result === true) {
                            deletePlayers(team.id, players).then(function() {
                                var n = 0;
                                while (n < team.players.length) {
                                    if (players.indexOf(team.players[n].id) >= 0) {
                                        team.players.splice(n, 1);
                                    }
                                    else {
                                        n++;
                                    }
                                }
                            });
                        }
                    });
            },
            getPelePercentPopulation: function (team) {
                var countAll = team == null ? this.totalPlayers : team.players.length;
                var countPele = this.peleCount(team);

                if (countAll > 0) {
                    var r = (countPele / countAll * 100).toFixed(2);
                    return r;
                } else {
                    return -1;
                }
            },
            peleCount: function (team) {
                var comp = this;
                if (team == null) {
                    //all teams
                    var totalCount = 0;
                    if (comp.teams) {
                        comp.teams.forEach(function(curTeam) {
                            totalCount += comp.peleCount(curTeam);
                        });
                    }
                    return totalCount;
                }
                return team.players.filter(function(player) {
                    return player.isPele;
                }).length;
            },
            checkAges: function(team) {
                var currentYear = new Date().getFullYear();
                var ageGroup1 = [10, 12];
                var ageGroup2 = [13, 18];
                var res = { ageGroup1 : 0, ageGroup2: 0};
                team.players.forEach(function(player){
                    var age = currentYear - player.yearOfBirth;
                    if (age >= ageGroup1[0] && age <= ageGroup1[1]) {
                        res.ageGroup1++;
                    } else if (age >= ageGroup2[0] && age <= ageGroup2[1]){
                        res.ageGroup2++;
                    }
                });

                //console.log(res);
                return  res.ageGroup1 > 0 && res.ageGroup2 > 0;
            },
            isApprovedBySportAdmin: function(record) {
                if ((record.approved & Approval.SportAdmin) !== 0) {
                    return true;
                }

                return false;
            },
            isApprovedByAdmin: function(record) {
                if ((record.approved & Approval.Admin) !== 0) {
                    return true;
                }
                return false;
            },
            isApproved: function (record) {
                return record.approvedByAdminAndSupervisor;
            }
        },
        watch: {

        }
    });

    return RegistrationProjectPelePlayersComponent;
});