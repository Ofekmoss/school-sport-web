define(["templates/registration", "services/access", "dialog", "consts", "utils"], function (templates, Access, Dialog, consts, utils) {

    var states = {
        notLoaded: 1,
        new: 2,
        edit: 3,
        import: 4,
        loading: 5
    };

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
        Vue.http.post('/api/v2/registration/league/teams/' + encodeURIComponent(id) + '/players', requestBody)
            .then( function(resp){
                player.picture = resp.data.picture;
                player.idSlip = resp.data.idSlip;
                player.medicalApproval = resp.data.medicalApproval;
            });
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

    function readTransfers(teamId, callback) {
        Vue.http.get('/api/v2/registration/league/teams/'+ encodeURIComponent(teamId) + '/transfers')
            .then(function(resp) {
                callback(null, resp.body);
            })
            .catch(function(err){
                callback(err);
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

    function readTeam(comp, teamId, callback) {
        function DoReadTeam() {
            comp.teams.splice(0, comp.teams.length);
            readCompetitions(comp, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                Vue.http.get('/api/v2/registration/league/teams/'+ encodeURIComponent(teamId))
                    .then(
                        function (resp) {
                            var team = resp.body;
                            team.selectionCount = 0;
                            team.sport = getById(comp.sports, team.sport);
                            if (team.sport) {
                                team.category = getById(team.sport.categories, team.competition);
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

                            if (team.category) {
                                comp.teams.push(team);
                            }

                            team.players.forEach(function(player) {
                                player.parsedStatus = parsePlayerStatus(player.status);
                                if (player.birthDate != null && new Date(player.birthDate).getFullYear() < 1990)
                                    player.birthDate = null;
                            });

                            team.gotStudentWithoutGrade = team.players.filter(function(p) {
                                return comp.getGrade(p.grade).length === 0;
                            }).length > 0;

                            team.gotStudentWithoutBirthday = team.players.filter(function(p) {
                                return p.birthDate == null;
                            }).length > 0;

                            readTransfers(team.id, function(err, transfers) {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                transfers = transfers.filter(function(t) {
                                    return team.players.find(function(p) {
                                        return p.idNumber == t.idNumber;
                                    }) == null;
                                }).map(function (t) {
                                    t.transfer = true;
                                    return t;
                                });

                                if (transfers.length > 0) {
                                    team.players = team.players.concat(transfers);
                                }

                                // remove players with invalid grade
                                team.players = team.players.filter(function(player) {
                                    return !player.transfer || (player.transfer && player.grade < 12);
                                });

                                comp.transfers = transfers;
                                callback(null, '');
                            });
                        },
                        function (err) {
                            console.log(err);
                            callback(err);
                        }
                    );
            });
        }
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        if (typeof teamId === 'undefined' || teamId == null || !teamId) {
            Vue.http.get('/api/v2/cache?key=latest-league-team').then(function (resp) {
                teamId = resp.body.Value;
                if (teamId != null) {
                    window.location.hash = '#/registration/league/league?team=' + teamId;
                    DoReadTeam();
                } else {
                    console.log('read teams called without team id');
                    //console.trace();
                }
            });
            return;
        }
        Vue.http.post('/api/v2/cache', {
            key: 'latest-league-team',
            value: teamId
        });
        DoReadTeam();
    }

    function deletePlayer(team, player) {
        if (player.transfer) {
            Vue.http.delete('/api/v2/registration/league/teams/' + encodeURIComponent(team.id) + '/transfers/' + encodeURIComponent(player.idNumber))
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
            Vue.http.delete('/api/v2/registration/league/teams/' + encodeURIComponent(team.id) + '/players/' + encodeURIComponent(player.student))
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

    var RegistrationLeaguePlayersComponent = Vue.extend({
        template: templates["league-players"],
        data: function () {
            return {
                user: Access.user,
                sports: [],
                teams: [],
                teamId: null,
                states: states,
                maxTeamPlayers: consts.MaxTeamPlayers,
                inactiveSeason: false,
                loginTokenLinks: []
            };
        },
        mounted: function () {
            function buildRange(item) {
                return item != null ? {
                    start:utils.parseDate(item.rangeStart),
                    end: utils.parseDate(item.rangeEnd)
                } : null;
            }

            function checkInRange(range, birthday) {
                return range != null && (birthday >= range.start && birthday <= range.end);
            }

            this.teamId = window.location.hash.split("=")[1];
            var comp = this;
            Vue.http.get('/api/v2/login').then(function (resp) {
                comp.region = resp.data.region;
                readTeam(comp, comp.teamId, function () {
                    if (comp.teams && comp.teams.length > 0) {
                        var season = comp.user.season;

                        utils.readServerCache(['isf-overage', 'overage'], true, function (err, responseMapping) {
                            if (err) {
                                console.log(err);
                            } else {
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
                                Vue.http.get('/api/v2/tokens').then(function (resp) {
                                    if (resp.body != null) {
                                        comp.loginTokenLinks = resp.body;
                                    }
                                });
                            }
                        });
                    }
                });
            }, function (err) {
                console.log(err);
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
        methods: {
            loginTokenLinksClicked: function() {
                utils.openLoginTokenDialog(this.loginTokenLinks, Dialog);
            },
            getTeamName: function (team) {
                return team.sport.name + " " + team.category.name + " " + team.teamNumber;
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
                            deletePlayers(team, toDelete);
                        }
                    });
            },
            newPlayer: function (team) {
                function addSinglePlayer(comp, players, index) {
                    if (index >= players.length) {
                        readTeam(comp, comp.teamId);
                        return;
                    }
                    var player = players[index];
                    var requestBody;
                    if (player.external) {
                        requestBody = {
                            external: true,
                            idNumber: player.idNumber
                        };
                    }
                    else {
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

                    Vue.http.post('/api/v2/registration/league/teams/' + encodeURIComponent(team.id) + '/players', requestBody)
                        .then(
                            function (err, result) {
                                addSinglePlayer(comp, players, index + 1);
                            },
                            function (err) {
                                Dialog.open('general/error-message', {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "שגיאה בעדכון שחקן"
                                });
                            }
                        );
                }

                var comp = this;
                if (team.players.length >= consts.MaxTeamPlayers) {
                    alert('קבוצה מכילה כמות שחקנים מקסימלית, לא ניתן להוסיף');
                    return;
                }
                var dialogParams = {
                    "clubs": false,
                    "team": comp.getTeamName(team),
                    "teamStatus": team.adminStatus,
                    sportId: team.sport.id,
                    existingTeamPlayers: team.players
                };
                Dialog.open("registration/player-dialog", dialogParams, function (err, result) {
                    if (result != null && result.players && result.players.length > 0) {
                        addSinglePlayer(comp, result.players, 0);
                    }
                });
            },
            uploadPicture: function(player) {
                // var player = this.teams[0].players[index];
                //console.log('upload clicked');
                //console.log(player);
                var pictureInput = document.getElementById('picture-input-' + player.idNumber);
                pictureInput.click();
            },
            /*
            uploadIdSlip: function(index) {
                // var player = this.teams[0].players[index];
                var idSlipInput = document.getElementById('id-slip-input'+index);
                idSlipInput.click();

            },
            uploadMedicalApproval: function(index) {
                // var player = this.teams[0].players[index];
                var medicalApprovalInput = document.getElementById('medical-approval-input'+index);
                medicalApprovalInput.click();

            },
            */
            handlePicture: function(player) {
                //var player = this.teams[0].players[index];
                //console.log('handle picture');
                //console.log(player);
                var pictureInput = document.getElementById('picture-input-' + player.idNumber);
                var rawFile = pictureInput.files[0];
                if (rawFile.type.toLowerCase().indexOf('image/') === 0) {
                    player.picture = rawFile;
                    savePlayer(player, this.teams[0].id);
                } else {
                    alert('ניתן להעלות קובץ תמונה בלבד, נא לא להעלות PDF או סוגי קבצים אחרים');
                }
            },
            /*
            handleIdSlip: function(index) {
                var player = this.teams[0].players[index];
                var idSlipInput = document.getElementById('id-slip-input'+index);
                player.idSlip = idSlipInput.files[0];
                savePlayer(player, this.teams[0].id);
            },
            handleMedicalApproval: function(index) {
                var player = this.teams[0].players[index];
                var medicalApprovalInput = document.getElementById('medical-approval-input'+index);
                player.medicalApproval = medicalApprovalInput.files[0];
                savePlayer(player, this.teams[0].id);
            },
            */
            editPlayer: function(team) {
                var comp = this;
                var player = team.players.find(function(p){
                    return p.selected == true;
                });
                var playerToEdit = Object.assign({}, player);
                playerToEdit.state = 3;
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

                        Vue.http.post('/api/v2/registration/league/teams/' + encodeURIComponent(team.id) + '/players', requestBody)
                            .then(
                                function (err, result) {
                                    readTeam(comp, comp.teamId);
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
                var w = window.open('/api/v2/registration/league/teams/' + team.team +'/players/download/team-' + team.team + '-players.pdf');
                w.onload = function(){
                    w.print();
                }
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

    return RegistrationLeaguePlayersComponent;
});