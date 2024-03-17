define(["templates/manage", "manage/dal", "utils", 'dialog',
    "manage/filters-players", "manage/data-table2", "components/multiselect"], function (templates, dal, utils, Dialog) {

    var states = {
        edit: 1,
        new: 2,
        view: 3,
    };

    var columns = [
        {
            key: 'Student.FirstName',
            name: 'שם פרטי',
            active: true,
            type: 'text',
            filter: true,
        },
        {
            key: 'Student.LastName',
            name: 'שם משפחה',
            active: true,
            type: 'text',
            filter: true,
        },
        {
            key: 'Student.IdNumber',
            name: 'תעודת זהות',
            active: true,
            type: 'text',
            filter: true,
        },
        {
            key: 'BirthDate',
            name: 'תאריך לידה',
            active: true,
            type: 'text',
        },
        {
            key: 'Student.Grade',
            name: 'כיתה',
            active: true,
            type: 'text',
            filter: true,
        },{
            key: 'Student.TeamName',
            name: 'שם קבוצה',
            active: true,
            type: 'text',
            filter: true,
        },{
            key: 'Student.TeamNumber',
            name: 'קבוצה',
            active: true,
            type: 'text',
            filter: true,
        },{
            key: 'Student.City.Name',
            name: 'רשות',
            active: false,
            type: 'text',
            filter: true,
        },
        {
            key: 'Player.RegistrationDate',
            name: 'תאריך אישור',
            active: false,
            type: 'date',
        },
        {
            key: 'CreatedAt',
            name: 'תאריך רישום',
            active: false,
            type: 'date',
        },
        {
            key: 'Player.ShirtNumber',
            name: 'מספר חולצה',
            active: false,
            type: 'text',
            filter: true,
        },{
            key: 'Championship.Name',
            name: 'אליפות',
            active: false,
            type: 'text',
            filter: true,
        },{
            key: 'Sport.Name',
            name: 'ענף ספורט',
            active: false,
            type: 'text',
            filter: true,
        },{
            key: 'Category.Name',
            name: 'קטגוריה',
            active: false,
            type: 'text',
            filter: true,
            openTab: {
                route: 'manage/teams',
                params: {
                    region: 'Region.Id',
                    sport: 'Sport.Id',
                    championship : 'Championship.Id',
                    category : 'Category.Category'
                }
            }
        },{
            key: 'Status',
            name: 'סטטוס',
            active: true,
            type: 'text',
            filter: true,
        },
        {
            key: 'Student.Gender',
            name: 'מין',
            active: true,
            type: 'text',
            filter: true,
        },
        {
            key: 'Student.School.Name',
            name: 'בית ספר',
            active: true,
            type: 'text',
            filter: true,
        },
        {
            key: 'Student.School.Symbol',
            name: 'סמל בית ספר',
            active: false,
            type: 'text',
            filter: true,
        },
        {
            key: 'Student.Region.Name',
            name: 'מחוז',
            active: false,
            type: 'text',
            filter: true,
        }
    ];

    function getEmptyPlayer() {
        return {
            Player : {
            },
            Student: {
                School: {},
                Region: {}
            }
        }
    }

    var Players = Vue.extend({
        template: templates["players"],
        data: function () {
            return {
                tabName: "שחקנים",
                team: 0,
                caption: "שחקנים",
                image: 'img/icon-players.svg',
                records: [],
                columns: columns,
                selectedPlayers: [],
                initFilters: {}
            };
        },
        props: {
            sport: {},
            region: {},
            championship: {},
            category: {},
            team: {}
        },
        mounted: function () {
            var comp = this;
            //console.log(comp.team);
            comp.sport = comp.sport ? parseInt(comp.sport) : '';
            comp.region = comp.region ? parseInt(comp.region) : '';
            comp.championship = comp.championship ? parseInt(comp.championship) : '';
            comp.category = comp.category ? parseInt(comp.category) : '';
            comp.team = comp.team? parseInt(comp.team) : '';

            comp.initFilters = {
                sport: comp.sport,
                region: comp.region,
                championship: comp.championship,
                category: comp.category,
                team: comp.team
            };
            //console.log(this.initFilters);

            Vue.http.get('/api/v2/cache?key=manage-players-columns').then(function(resp) {
                if (resp && resp.body && resp.body.Value) {
                    var activeColumns = resp.body.Value.split(',');
                    if (activeColumns.length > 0) {
                        comp.columns.forEach(function(column) {
                            var curKey = (column.id || column.key).replace(',', '.');
                            column.originalActive = column.active;
                            column.active = activeColumns.indexOf(curKey) >= 0;
                        });
                    }
                }
            });
            window.setTimeout(function() {
                //comp.refresh();
            }, 500);
        },
        methods: {
            updateCaption: function (caption) {
                this.caption = caption;
            },
            saveRecord: function() {
                console.log('saving... ', this.selectedPlayers);
            },
            refresh: function(filters, result) {
                var comp = this;
                //console.log(filters);
                var season = filters && filters.season ? filters.season.id : null;
                if (filters) {
                    comp.updateCaption(filters.description);
                    comp.championship = filters.championship && filters.championship.id != -1 ? filters.championship.id : '';
                    comp.category = filters.category && filters.category.id != -1 ? filters.category.id : '';
                    comp.region = filters.region && filters.region.id != -1 ? filters.region.id : '';
                    comp.sport = filters.sport && filters.sport.id != -1 ? filters.sport.id : '';
                    comp.team = filters.team && filters.team.id != -1 ? filters.team.id : '';
                }

                /*if (filters && !filters.team) {
                    //comp.records.splice();
                    comp.records = [];
                    return;
                }*/

                var params = {
                    championship : comp.championship,
                    region : comp.region,
                    sport : comp.sport,
                    category : comp.category,
                    team : comp.team,
                    season: season
                };

                if (filters.sender == 'click') {
                    dal.getPlayers(params).then(function (res) {
                        comp.records = res;
                    });
                }
            },
            onPlayerCards: function() {
                var url = '/api/v2/registration/teams/' + this.team + '/player-cards';
                var w = window.open(url, '_blank');
                /*
                w.onload = function(){
                    w.print();
                }
                */
            },
            onMoreInfo: function(record) {
                Dialog.open("manage/new-player2", {
                    record: record,
                    state: states.edit,
                    disableClickOutside: true
                });
            },
            onRecordSelect: function(records){
                this.selectedPlayers = records;
            },
            onEditPlayer: function() {
                var comp = this;
                var caption = 'edit';
                if (comp.selectedPlayers == null || comp.selectedPlayers.length !== 1) {
                    console.log('Can ' + caption + ' a player only with one row selected');
                    return;
                }
                var record = comp.selectedPlayers[0];
                console.log('editing player')
                console.log(record);
                /*
                var teamNumbers = comp.records.filter(function(team) {
                    var sameTeam = (record.Id != null && record.Id === team.Id) ||
                        (record.TeamId != null && record.TeamId === team.TeamId);
                    return !sameTeam && team.Category.Id === record.Category.Id && team.School.School === record.School.School;
                }).map(function(team) {
                    return team.TeamNumber || '';
                });
                var originalAdminStatus = record.AdminStatus;
                var state = duplicate ? states.duplicate : states.edit;
                Dialog.open("manage/new-team", {
                    record: utils.deepClone(record),
                    region: comp.region,
                    state: state,
                    disableClickOutside: true,
                    teamNumbersInUse: teamNumbers
                }, function(err, res) {
                    if (res != null) {
                        if (duplicate) {
                            Dialog.open("general/message-box", {
                                caption: "שכפול קבוצה",
                                message: "האם לאשר את הקבוצה החדשה?",
                                alert: true,
                                confirmText: "כן",
                                cancelText: "לא"
                            }, function (err, result) {
                                if (result === true) {
                                    confirmAndRefresh(comp, res.Id, record);
                                } else {
                                    comp.refresh(comp.latestFilters);
                                }
                            });
                        } else {
                            if (originalAdminStatus != 2 && res.AdminStatus == 2) {
                                confirmAndRefresh(comp, record.Id, record);
                            } else {
                                comp.refresh(comp.latestFilters);
                            }
                        }
                    }
                });
                */
            },
            newPlayer: function() {
                var comp = this;
                var dialogParams = {
                    "clubs": true,
                    "team": 'קבוצה טובה מאוד',
                    existingTeamPlayers: [],
                    sportId: comp.sport
                };
                //manage/new-player2
                /*
                {
                    record: getEmptyPlayer(),
                    state: states.new,
                    disableClickOutside: true
                }
                */
                Dialog.open("registration/player-dialog", dialogParams, function (err, result) {
                    if (result != null && result.players && result.players.length > 0) {
                        //addSinglePlayer(comp, result.players, 0);
                        console.log(result.players);
                    }
                });
            },
            deletePlayers: function() {
                function deleteSinglePlayer(comp, index, callback) {
                    if (typeof callback === 'undefined' || callback == null)
                        callback = new Function();
                    if (index >= comp.selectedPlayers.length) {
                        console.log('done deleting ' + comp.selectedPlayers.length + ' players');
                        callback();
                        return;
                    }
                    var curPlayer = comp.selectedPlayers[index];
                    var playerId = curPlayer.Player != null ? curPlayer.Player.Id : null;
                    var studentId = curPlayer.Student != null ? curPlayer.Student.Id : null;
                    dal.deletePlayer(playerId, curPlayer.Team, studentId).then(function(res, err){
                        if (err) {
                            // show error
                            console.log(err);
                        } else {
                            deleteSinglePlayer(comp, index + 1, callback);
                        }
                    })
                }
                var comp = this;
                var single = comp.selectedPlayers.length === 1;
                //console.log(selectedPlayer);
                var msg = 'נא לאשר את מחיקת ';
                msg += single ? 'השחקן הבא:' : 'השחקנים הבאים:';
                msg += '<br />';
                msg += comp.selectedPlayers.map(function(player) {
                        return player.Student.FirstName + ' ' + player.Student.LastName + ' (ת"ז: ' + player.Student.IdNumber + ')';
                }).join('<br />');
                Dialog.open('general/message-box', {
                    caption: "מחיקת שחקן",
                    message: msg,
                    alert: true,
                    confirmText: "אישור",
                    cancelText: "ביטול"
                }, function(err, isDelete){
                    if (!isDelete) {
                        return;
                    }
                    deleteSinglePlayer(comp, 0, function() {
                        for (var i = 0; i < comp.selectedPlayers.length; i++) {
                            comp.updateRemovedPlayer(comp.selectedPlayers[i]);
                        }
                        comp.resetSelection();
                    });
                });
            },
            updateRemovedPlayer: function(removedPlayer) {
                var comp = this;
                if (comp.records.length <= 0) {
                    return;
                }

                comp.records = comp.records.filter(function(record){
                    if (removedPlayer.Player != null) {
                        if (record.Player != null) {
                            return record.Player.Id != removedPlayer.Player.Id;
                        }
                    } else if (removedPlayer.Student != null) {
                        if (record.Student != null) {
                            return record.Student.Id != removedPlayer.Student.Id;
                        }
                    }
                    return true;
                });
            },
            onActiveColumns: function() {
                var comp = this;
                var copy  = comp.columns.map(function(c) {
                    return Object.assign({}, c);
                });
                Dialog.open("manage/columns-select-dialog", {
                    columns: copy,
                    max: 15,
                    key: 'manage-players'
                }, function(err, columns) {
                    if (!columns) {
                        return;
                    }

                    comp.columns = columns.map(function(c) {
                        return Object.assign({}, c);
                    });
                });
            },
            resetSelection: function() {
                var comp = this;
                comp.records.forEach(function(player) {
                    player.selected = false;
                });
                comp.selectedPlayers = [];
                comp.records = comp.records.slice();
                comp.$forceUpdate();
            },
            changeStatus: function(status) {
                var comp = this;
                console.log('changing status of players to ' + status + ':');
                console.log(comp.selectedPlayers);
                /*
                Dialog.open("manage/approve-teams-dialog", {
                    teams: comp.selectedTeams,
                    status: status
                }, function(err, res) {
                    if (err || !res) {
                        // show error
                        return;
                    }

                    // change status of selected records
                    var url = '/api/v2/admin/teams/status';
                    var requestParams = {
                        teams: comp.selectedTeams.map(function (t) { return t.TeamId == null ? {id: t.Id} : {team: t.TeamId}; }),
                        status: status //2 - approved, 1 - registered
                    };
                    Vue.http.post(url, requestParams).then(function (resp) {
                        // Returns team ids for inserted teams
                        for (var i = 0; i < resp.body.length; i++) {
                            var update = resp.body[i];
                            for (var n = 0; n < comp.selectedTeams.length; n++) {
                                var team = comp.selectedTeams[n];
                                if (team.Id === update.id) {
                                    team.TeamId = update.team;
                                    break;
                                }
                            }
                        }
                        comp.selectedTeams.forEach(function(team) {
                            team.AdminStatus = status;
                            if (status === 2) {
                                if (team.ConfirmationDate == null) {
                                    team.ConfirmationDate = new Date();
                                    team.confirmationDate = dal.getDateText(team.ConfirmationDate);
                                }
                            } else {
                                team.ConfirmationDate = null;
                                team.confirmationDate = null;
                            }
                        });
                    }, function (err) {
                        console.log(err);
                    });
                });
                */
            }
        }
    });

    return Players;
});