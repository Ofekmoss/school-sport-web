define(["templates/registration", "services/access", "dialog", "components/selectex", "consts", "utils"], function (
    templates, Access, Dialog, selectEx, consts, utils) {

    function readCompetitions(comp, callback) {
        Vue.http.get('/api/v2/registration/club/competitions')
            .then(
                function (resp) {
                    var sports = [];
                    for (var i = 0; i < resp.body.sports.length; i++) {
                        sports.push(resp.body.sports[i]);
                    }
                    comp.sports = sports;
                    callback();
                },
                function (err) {
                    callback(err);
                }
            );
    }

    function parsePlayerStatus(playerStatus) {
        switch (playerStatus) {
            case 1:
                return 'רשום';
            case 2:
                return 'מאושר';
            case 3:
                return 'לא מאושר';
        }
        return '';
    }

    function readTransfers(team) {
        Vue.http.get('/api/v2/registration/club/teams/'+ encodeURIComponent(team.id) + '/transfers')
            .then(function(resp) {
                var transfers = resp.body.map(function (t) {
                    t.transfer = true;
                    return t;
                });

                transfers = transfers.filter(function(t) {
                    return team.players.find(function(p) {
                        return p.idNumber == t.idNumber;
                    }) == null;
                });

                if (transfers.length > 0) {
                    team.players = team.players.concat(transfers);
                }
            })
            .catch(function(err){
                console.log(err);
            });
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

    function readTeams(comp, callback) {
        function buildRange(item) {
            return item != null ? {
                start:utils.parseDate(item.rangeStart),
                end: utils.parseDate(item.rangeEnd)
            } : null;
        }

        function checkInRange(range, birthday) {
            return range != null && (birthday >= range.start && birthday <= range.end);
        }

        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        readCompetitions(comp, function (err) {
            if (!err) {
                Vue.http.get('/api/v2/registration/club/teams')
                    .then(
                        function (resp) {
                            var togglePanelState;
                            togglePanelState = {};
                            comp.teams.forEach( function(t){
                                togglePanelState[t.id] = t.__panelOpen;
                            });

                            var currentTeamId = comp.team ? comp.team.id : null;
                            comp.teams.splice(0, comp.teams.length);
                            // console.log(resp.body);
                            for (var i = 0; i < resp.body.length; i++) {
                                var team = resp.body[i];
                                team.sport = getById(comp.sports, team.sport);
                                if (team.sport) {
                                    team.category = getById(team.sport.categories, team.competition);
                                }
                                if (team.category) {
                                    if (team.payment != null) {
                                        comp.paidTeams++;
                                    }
                                    team.createdAt = new Date(team.createdAt);

                                    if (team.id === currentTeamId) {
                                        comp.team = team;
                                    }

                                    team.selectionCount = 0;
                                    team.__panelOpen = togglePanelState[team.id];
                                    comp.teams.push(team);
                                }

                                if (!team.players) {
                                    team.players = [];
                                }

                                if (team.maxStudentBirthday) {
                                    team.maxStudentBirthday = new Date(team.maxStudentBirthday);
                                    team.players = team.players.map(function(player){
                                        if (player.birthDate != null && new Date(player.birthDate) < team.maxStudentBirthday){
                                            player.aboveMaxAge = true;
                                        }
                                        return player;
                                    });
                                }
                                team.gotStudentWithoutGrade = team.players.filter(function(p) {
                                    return comp.getGrade(p.grade).length === 0;
                                }).length > 0;
                                readTransfers(team);

                                team.sportsmanCount = 0;
                                team.players.forEach(function(player) {
                                    player.parsedStatus = parsePlayerStatus(player.status);
                                    if (player.birthDate != null && new Date(player.birthDate).getFullYear() < 1990)
                                        player.birthDate = null;
                                    if (player.sportsman)
                                        team.sportsmanCount++;
                                });
                                team.gotStudentWithoutBirthday = team.players.filter(function(p) {
                                    return p.birthDate == null;
                                }).length > 0;
                                //console.log(team.players);
                                callback();
                            }

                            var season = comp.user.season;
                            utils.readServerCache(['isf-overage', 'overage'], true, function (err, responseMapping) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    //console.log(responseMapping);
                                    var isfOverageRawData = responseMapping['isf-overage'];
                                    var overageRawData = responseMapping['overage'];
                                    var isfOverageItems = utils.parseIsfOverageItems(isfOverageRawData);
                                    var overageItems = utils.parseIsfOverageItems(overageRawData);
                                    comp.teams.forEach(function (team) {
                                        if (team.players && team.players.length > 0) {
                                            var sport = team.sport.id;
                                            var category = team.category.category;
                                            var matchingIsfItem = isfOverageItems.find(function (isfOverageItem) {
                                                return isfOverageItem.season == season &&
                                                    isfOverageItem.sport == sport &&
                                                    isfOverageItem.category == category;
                                            });
                                            var matchingItem = overageItems.find(function (overageItem) {
                                                return overageItem.season == season &&
                                                    (overageItem.sport == 0 || overageItem.sport == sport) &&
                                                    overageItem.category == category;
                                            });
                                            if (matchingIsfItem != null || matchingItem != null) {
                                                var isfRange = buildRange(matchingIsfItem);
                                                var range = buildRange(matchingItem);
                                                team.players.forEach(function (player) {
                                                    if (player.birthDate != null && player.birthDate.toString().length > 0) {
                                                        var birthday = new Date(player.birthDate);
                                                        player.isfOverage = checkInRange(isfRange, birthday);
                                                        player.aboveMaxAge = range != null ? birthday < range.end : false;
                                                    }
                                                });
                                                comp.$forceUpdate();
                                            }
                                        }
                                    });
                                }
                            });
                        },
                        function (err) {
                            console.log(err);
                            callback();
                        }
                    );
            } else {
                callback();
            }
        });
    }

    function setEditRequestBody(result) {
        var requestBody = new FormData();
        requestBody.append("student", JSON.stringify({
            student: result.student,
            idNumber: result.idNumber,
            firstName: result.firstName,
            lastName: result.lastName,
            birthDate: result.birthDate,
            grade: result.grade,
            gender: result.gender
        }));
        if (result.picture) {
            requestBody.append("picture", result.picture);
        }
        if (result.idSlip) {
            requestBody.append("idSlip", result.idSlip);
        }
        if (result.medicalApproval) {
            requestBody.append("medicalApproval", result.medicalApproval);
        }

        return requestBody;
    }

    function savePlayer(player, id) {
        var requestBody = setEditRequestBody(player);
        Vue.http.post('/api/v2/registration/club/teams/' + encodeURIComponent(id) + '/players', requestBody)
            .then( function(resp){
                player.picture = resp.data.picture;
                player.idSlip = resp.data.idSlip;
                player.medicalApproval = resp.data.medicalApproval;
            });
    }

    function deletePlayer(team, player) {
        if (player.transfer) {
            Vue.http.delete('/api/v2/registration/club/teams/' + encodeURIComponent(team.id) + '/transfers/' + encodeURIComponent(player.idNumber))
                .then(
                    function () {
                        for (var i = 0; i < team.players.length; i++) {
                            if (team.players[i] === player) {
                                team.players.splice(i, 1);
                                break;
                            }
                        }
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        }
        else {
            Vue.http.delete('/api/v2/registration/club/teams/' + encodeURIComponent(team.id) + '/players/' + encodeURIComponent(player.student))
                .then(
                    function () {
                        for (var i = 0; i < team.players.length; i++) {
                            if (team.players[i] === player) {
                                team.players.splice(i, 1);
                                break;
                            }
                        }
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        }
    }
    function deletePlayers(team, players) {
        for ( var i = 0; i < players.length; i++ ) {
            deletePlayer(team, players[i]);
        }
    }



    var RegistrationClubPaymentComponent = Vue.extend({
        template: templates["club-players"],
        data: function () {
            return {
                user: Access.user,
                sports: [],
                teams: [],
                team: null,
                selectionCount: 0,
                maxTeamPlayers: consts.MaxTeamPlayers,
                inactiveSeason: false,
                loginTokenLinks: []
            };
        },
        mounted: function () {
            var comp = this;
            comp.inactiveSeason = utils.inactiveSeason(comp);
            if (comp.inactiveSeason) {
                //check if school is authorized
                utils.checkSeasonAuthorization(comp.user, function(err, authorized) {
                    if (authorized == true) {
                        comp.inactiveSeason = false;
                    }
                });
            }
            Vue.http.get('/api/v2/useChampionshipNameSportFields').then( function(resp){
                var championshipNameSportFields = resp.data || [];
                readTeams(comp, function() {
                    comp.teams.forEach(function(team) {
                        team.showChampionNameInsteadOfSport = (championshipNameSportFields.indexOf(team.sport.id) >= 0);
                    });
                    //console.log(comp.teams);
                    Vue.http.get('/api/v2/tokens').then(function (resp) {
                        if (resp.body != null) {
                            comp.loginTokenLinks = resp.body;
                        }
                    });
                });
            });
        },
        computed: {
        },
        methods: {
            loginTokenLinksClicked: function() {
                utils.openLoginTokenDialog(this.loginTokenLinks, Dialog);
            },
            getTeamName: function (team) {
                var teamName = '';
                if (team.showChampionNameInsteadOfSport) {
                    teamName += team.championship.name.replace('ליגת מועדונים', '');
                } else {
                    teamName += team.sport.name;
                }
                teamName += ' ';
                if (team.sport.name.indexOf('ספיישל') >= 0)
                    teamName += team.championship.name.replace('ליגת מועדונים', '') + " ";
                teamName += team.category.name + " " + team.teamNumber;
                return teamName;
            },
            getGrade: function (grade) {
                var allGrades = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", "י\"א", "י\"ב"];
                if (grade != null && grade >= 0 && grade < allGrades.length) {
                    return allGrades[grade];
                } else {
                    return '';
                }
            },
            handleSelectionChange: function (team) {
                team.selectionCount = 0;
                for (var i = 0; i < team.players.length; i++) {
                    if (team.players[i].selected) {
                        team.selectionCount++;
                    }
                }
            },
            deletePlayers: function (team) {
                function extractPlayerDetails(player) {
                    return player.firstName + ' ' + player.lastName + ' (ת.ז. ' + player.idNumber + ')';
                }
                var comp = this;
                // var team = this.team;
                var toDelete = team.players.filter(function(player){
                    return player.selected;
                });

                if (!toDelete.length) {
                    return;
                }

                var approvedPlayers = toDelete.filter(function(player) {
                    return player.status == 2;
                });

                /*
                toDelete = toDelete.filter(function(player) {
                    return player.status != 2;
                });
                */

                var lines = [];
                if (toDelete.length > 0) {
                    lines.push(toDelete.length === 1 ? 'השחקן הבא יוסר מהקבוצה:' : 'השחקנים הבאים יוסרו מהקבוצה:');
                    lines.push(toDelete.map(extractPlayerDetails).join('<br />'));
                }

                /*
                if (approvedPlayers.length > 0) {
                    lines.push(approvedPlayers.length === 1 ? 'השחקן הבא אושר על ידי רכז התאחדות ולכן לא ניתן להסיר מהקבוצה:' :
                        'השחקנים הבאים אושרו על ידי רכז התאחדות ולכן לא ניתן להסירם מהקבוצה:');
                    lines.push(approvedPlayers.map(extractPlayerDetails).join('<br />'));
                }
                */

                if (toDelete.length > 0) {
                    lines.push('האם להמשיך?');
                }
                var msg = lines.join('<br />');
                Dialog.open("general/message-box",
                    {
                        caption: "מחיקת שחקנים",
                        message: msg,
                        alert: true,
                        confirmText: toDelete.length > 0 ? "כן" : "חזרה למסך שחקנים",
                        cancelText: toDelete.length > 0 ? "לא" : null
                    },
                    function (err, result) {
                        if (result === true) {
                            if (toDelete.length > 0) {
                                deletePlayers(team, toDelete);
                            }
                        }
                    });
            },
            newPlayer: function (team) {
                function addSinglePlayer(comp, players, index) {
                    if (index >= players.length) {
                        readTeams(comp);
                        return;
                    }
                    var player = players[index];
                    var requestBody;
                    if (player.external) {
                        requestBody = {
                            external: true,
                            idNumber: player.idNumber
                        };
                    } else {
                        requestBody = new FormData();
                        requestBody.append("student", JSON.stringify({
                            student: player.student,
                            idNumber: player.idNumber,
                            firstName: player.firstName,
                            lastName: player.lastName,
                            birthDate: player.birthDate,
                            grade: player.grade,
                            gender: player.gender
                        }));
                        if (player.picture) {
                            requestBody.append("picture", player.picture);
                        }
                        if (player.idSlip) {
                            requestBody.append("idSlip", player.idSlip);
                        }
                        if (player.medicalApproval) {
                            requestBody.append("medicalApproval", player.medicalApproval);
                        }
                    }
                    var url = '/api/v2/registration/club/teams/' + encodeURIComponent(team.id) + '/players';
                    Vue.http.post(url, requestBody).then(function (err, result) {
                        addSinglePlayer(comp, players, index + 1);
                    }, function (err) {
                        Dialog.open('general/error-message', {
                            caption: "פעולה נכשלה",
                            message: typeof err.body === "string" ? err.body : "שגיאה בעת הוספת שחקנים"
                        });
                    });
                }
                var comp = this;
                if (team.players.length >= consts.MaxTeamPlayers) {
                    alert('קבוצה מכילה כמות שחקנים מקסימלית, לא ניתן להוסיף');
                    return;
                }
                //console.log(team);
                var dialogParams = {
                    "clubs": true,
                    "team": comp.getTeamName(team),
                    existingTeamPlayers: team.players,
                    sportId: team.sport.id
                };
                Dialog.open("registration/player-dialog", dialogParams, function (err, result) {
                    if (result != null && result.players && result.players.length > 0) {
                        addSinglePlayer(comp, result.players, 0);
                    }
                });
            },
            uploadPicture: function(team, index) {
                var pictureInput = document.getElementById('t-' + (team.team || team.id) + '-picture-input' + index);
                pictureInput.click();
            },
            uploadIdSlip: function(team, index) {
                var idSlipInput = document.getElementById('t-' + (team.team || team.id) + '-id-slip-input' + index);
                idSlipInput.click();

            },
            uploadMedicalApproval: function(team, index) {
                var medicalApprovalInput = document.getElementById('t-' + (team.team || team.id) + '-medical-approval-input' + index);
                medicalApprovalInput.click();

            },
            handlePicture: function(team, index) {
                var player = team.players[index];
                var pictureInput = document.getElementById('t-' + (team.team || team.id) + '-picture-input' + index);
                var rawFile = pictureInput.files[0];
                if (rawFile.type.toLowerCase().indexOf('image/') === 0) {
                    player.picture = rawFile;
                    savePlayer(player, team.id);
                } else {
                    alert('ניתן להעלות קובץ תמונה בלבד, נא לא להעלות PDF או סוגי קבצים אחרים');
                }
            },
            handleIdSlip: function(team, index) {
                var player = team.players[index];
                var idSlipInput = document.getElementById('t-' + (team.team || team.id) + '-id-slip-input'+index);
                player.idSlip = idSlipInput.files[0];
                savePlayer(player, team.id);
            },
            handleMedicalApproval: function(team, index) {
                var player = team.players[index];
                var medicalApprovalInput = document.getElementById('t-' + (team.team || team.id) + '-medical-approval-input' + index);
                player.medicalApproval = medicalApprovalInput.files[0];
                savePlayer(player, team.id);
            },
            editPlayer: function(team) {
                var comp = this;
                // var team = this.team;
                var player = team.players.find(function(p){
                    return p.selected == true;
                });
                var playerToEdit = Object.assign({}, player);
                playerToEdit.state = 3;
                playerToEdit.clubs = true;
                //console.log(playerToEdit);
                Dialog.open("registration/player-dialog", playerToEdit,
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        var requestBody;
                        if (result.external) {
                            requestBody = {
                                external: true,
                                idNumber: result.idNumber
                            };
                        }
                        else {
                            requestBody = setEditRequestBody(result);
                        }

                        Vue.http.post('/api/v2/registration/club/teams/' + encodeURIComponent(team.id) + '/players', requestBody)
                            .then(
                                function (err, result) {
                                    readTeams(comp);
                                },
                                function (err) {
                                    Dialog.open('general/error-message', {
                                        caption: "פעולה נכשלה",
                                        message: typeof err.body === "string" ? err.body : "שגיאה בעדכון שחקן"
                                    });
                                }
                            );

                    });
            },
            openPrint: function(team) {
                var w = window.open('/api/v2/registration/club/teams/' + team.team +'/players/download/team-' + team.team + '-players.pdf');
                w.onload = function(){
                    w.print();
                }
            },
            togglePanel: function(team) {
                team.__panelOpen = !team.__panelOpen;
                this.teams = this.teams.slice();
            },
            validPlayersCount: function(team) {
                var comp = this;
                var valid = 0;
                if (team.players != null) {
                    valid = team.players.filter(function(player) {
                        return player.status == 2 && player.birthDate != null && comp.getGrade(player.grade).length > 0;
                    }).length;
                }
                return valid;
            }
        }
    });

    return RegistrationClubPaymentComponent;
});
