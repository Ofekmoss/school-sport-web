define(["templates/registration", "dialog", "utils"], function (templates, Dialog, utils) {

    var Approval = {
        Admin: 1,
        SportAdmin: 2
    };

    function getTeamsAndPlayers(comp, callback) {
        Vue.http.get('/api/v2/registration/project/5/teams?players=true').
        then(function (resp) {
            var teams = resp.body;
            var playerTeamsMapping = {};
            comp.totalPlayers = 0;
            for (var n = 0; n < teams.length; n++) {
                var team = teams[n];
                //console.log(team);
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
                    //console.log(player);
                    if (player.item1) {
                        var item1 = JSON.parse(player.item1);
                        if (item1.projectJoinDate)
                            player.projectJoinDate = new Date(item1.projectJoinDate);
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
                /*
                var playersTable = $(".sport-equality-players").first()
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
                */
            }, 500);
            callback(null, teams);
        });
    }

    function deletePlayers(team, players) {
        return Vue.http.post('/api/v2/registration/project/5/teams/' + encodeURIComponent(team) + "/players/delete", players);
    }

    function openPlayerDialog(comp, team, player, callback) {
        var dialogParams = {
            projectId: 5,
            projectName: 'שווים בספורט',
            projectTeam: team.sport + ' ' + comp.getTeamGender(team.gender),
            existingTeamPlayers: (team.players || [])
        };
        if (player != null) {
            for (var field in player) {
                if (player.hasOwnProperty(field)) {
                    dialogParams[field] = player[field]
                }
            }
        }
        Dialog.open("registration/player-dialog", dialogParams,
            function (err, playerDialogResult) {
                if (playerDialogResult == null) {
                    return;
                }
                var item1 = {
                    projectJoinDate: playerDialogResult.projectJoinDate
                };
                var data = {
                    id: player ? player.id : -1,
                    firstName: playerDialogResult.firstName,
                    lastName: playerDialogResult.lastName,
                    idNumber: player ? player.idNumber : playerDialogResult.idNumber,
                    yearOfBirth: playerDialogResult.yearOfBirth,
                    birthDate: new Date(parseInt(playerDialogResult.yearOfBirth), 0, 1),
                    gender: playerDialogResult.gender,
                    item1: JSON.stringify(item1),
                    projectJoinDate: playerDialogResult.projectJoinDate,
                    picture: playerDialogResult.picture,
                    idSlip: playerDialogResult.idSlip,
                    medicalApproval: playerDialogResult.medicalApproval
                };
                //console.log(data);
                var requestBody = new FormData();
                for (var key in data) {
                    var value = data[key];
                    if (value != null) {
                        if (parseInt(value, 10) === value)
                            value = value.toString();
                        requestBody.append(key, value);
                    }
                }
                //console.log(playerDialogResult);
                var url = '/api/v2/registration/project/5/teams/' + encodeURIComponent(team.id) + '/players';
                Vue.http.put(url, requestBody).then(function(resp) {
                    if (resp.data.id) {
                        data.id = resp.data.id;
                    }
                    //console.log(resp.data);
                    playerDialogResult.id = resp.data.id;
                    playerDialogResult.picture = resp.data.picture;
                    playerDialogResult.idSlip = resp.data.idSlip;
                    playerDialogResult.medicalApproval = resp.data.medicalApproval;
                    //console.log(playerDialogResult);
                    callback(playerDialogResult);
                }).catch( function (err) {
                    Dialog.open('general/error-message', {
                        caption: "פעולה נכשלה",
                        message: typeof err.body === "string" ? err.body : "שגיאה בשמירת קבוצה"
                    });
                });
            });
    }

    var RegistrationProjectSportEqualityPlayersComponent = Vue.extend({
        template: templates["sport-equality-players"],
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
                switch (parseInt(val, 10)) {
                    case 0:
                    case 2:
                        return 'נקבה';
                    case 1:
                        return 'זכר';
                    default:
                        return '';
                }
            },
            formatDate: function(date) {
                return utils.formatDate(date, 'dd/MM/yyyy');
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
                openPlayerDialog(comp, team, null, function(playerDialogResult) {
                    team.players.push(playerDialogResult);
                });
            },
            editPlayer: function(team) {
                var comp = this;
                var matchingPlayer = team.players.find(function(p) {
                    return p.selected;
                });
                if (matchingPlayer != null) {
                    var fileFields = ['picture', 'idSlip', 'medicalApproval'];
                    openPlayerDialog(comp, team, matchingPlayer, function(playerDialogResult) {
                        matchingPlayer.firstName = playerDialogResult.firstName;
                        matchingPlayer.lastName = playerDialogResult.lastName;
                        matchingPlayer.yearOfBirth = playerDialogResult.yearOfBirth;
                        matchingPlayer.gender = playerDialogResult.gender;
                        matchingPlayer.projectJoinDate = playerDialogResult.projectJoinDate;
                        if (playerDialogResult.picture != null && playerDialogResult.picture.length > 0)
                            matchingPlayer.picture = playerDialogResult.picture;
                        if (playerDialogResult.idSlip != null && playerDialogResult.idSlip.length > 0)
                            matchingPlayer.idSlip = playerDialogResult.idSlip;
                        if (playerDialogResult.medicalApproval != null && playerDialogResult.medicalApproval.length > 0)
                            matchingPlayer.medicalApproval = playerDialogResult.medicalApproval;
                    });
                }
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

    return RegistrationProjectSportEqualityPlayersComponent;
});

function imageError(img) {
    $(img).replaceWith("<span>הורדה</span>");
}