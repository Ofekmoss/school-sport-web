define(["templates/admin", "utils", "dialog", "consts", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, consts) {

        function readCompetitions(comp, callback) {
            comp.sports.splice(0, comp.sports.length);
            Vue.http.get('/api/v2/admin/competitions?season=' + comp.season)
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

        function getById(list, id) {
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item.id === id) {
                    return item;
                }
            }
            return null;
        }

        function readTransferRequests(comp) {
            readCompetitions(comp, function (err) {
                if (!err) {
                    Vue.http.get('/api/v2/admin/players/transfers?season=' + comp.season)
                        .then(
                            function (resp) {
                                comp.players.splice(0, comp.players.length);
                                for (var i = 0; i < resp.body.length; i++) {
                                    var player = resp.body[i];
                                    player.sport = getById(comp.sports, player.sport);
                                    if (player.sport) {
                                        player.category = getById(player.sport.categories, player.competition);
                                    }
                                    if (consts.coordinators) {
                                        if (player.school.region != null && consts.coordinators[player.school.region]) {
                                            player.school.region = consts.coordinators[player.school.region].areaName;
                                        }
                                        if (player.currentSchool && player.currentSchool.region != null && consts.coordinators[player.currentSchool.region]) {
                                            player.currentSchool.region = consts.coordinators[player.currentSchool.region].areaName;
                                        }
                                    }
                                    comp.players.push(player);
                                }
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                }
            });
        }


        var TransferRequestsComponent = Vue.extend({
            template: templates["transfer-requests"],
            data: function () {
                return {
                    tabName: "שחקנים",
                    caption: "אישורי העברות",
                    players: [],
                    columns: [
                        {
                            key: "idNumber",
                            name: "ת.ז.",
                            active: true
                        },
                        {
                            key: "firstName",
                            name: "שם פרטי",
                            active: true
                        },
                        {
                            key: "lastName",
                            name: "שם משפחה",
                            active: true
                        },{
                            key: "birthDate",
                            name: "תאריך לידה",
                            type: "date",
                            active: true
                        },{
                            key: "grade",
                            name: "כיתה",
                            active: true,
                            lookup: {
                                "0": "א'",
                                "1": "ב'",
                                "2": "ג'",
                                "3": "ד'",
                                "4": "ה'",
                                "5": "ו'",
                                "6": "ז'",
                                "7": "ח'",
                                "8": "ט'",
                                "9": "י'",
                                "10": "י\"א",
                                "11": "י\"ב"
                            }
                        },{
                            key: 'school.name',
                            name: 'בית ספר מבקש',
                            active: true
                        },{
                            key: 'city',
                            name: 'רשות מבקשת',
                            active: true
                        },{
                            key: 'sport.name',
                            name: 'ענף ספורט',
                            active: true
                        },{
                            key: 'championship.name',
                            name: 'אליפות',
                            active: true
                        },
                        {
                            key: 'championship.category.name',
                            name: 'קטגוריית גיל',
                            active: true
                        },
                        {
                            key: 'school.region',
                            name: 'מחוז מבקש',
                            active: true
                        }
                        ,{
                            key: 'school.symbol',
                            name: 'סמל מבקש',
                            active: true
                        },{
                            key: 'school.principal',
                            name: 'מנהל בית ספר מבקש',
                            active: false
                        },{
                            key: 'teacher.name',
                            name: 'מורה',
                            active: false
                        },{
                            key: 'teacher.phoneNumber',
                            name: 'טלפון מורה',
                            active: false
                        },{
                            key: 'teacher.email',
                            name: 'מייל מורה',
                            active: false
                        },{
                            key: 'currentSchool.name',
                            name: 'בית ספר נוכחי',
                            active: true
                        },{
                            key: 'currentCity',
                            name: 'רשות נוכחית',
                            active: true
                        },{
                            key: 'currentSchool.region',
                            name: 'מחוז נוכחי',
                            active: true
                        }
                        ,{
                            key: 'currentSchool.symbol',
                            name: 'סמל נוכחי',
                            active: true
                        }
                    ],
                    sports: [],
                    seasons: [],
                    season: null,
                    searchText: "",
                    isSelectAll: false,
                    selectedStatus: null,
                    selectedPlayers: []
                };
            },
            mounted: function () {
                var comp = this;
                comp.seasons = [];
                Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        comp.seasons.push(resp.body[i]);
                    }
                    Vue.http.get('/api/v2/season').then(function (resp) {
                        var curSeason = resp.body.season;
                        if (curSeason) {
                            comp.season = curSeason;
                        }
                        readTransferRequests(comp);
                    });
                });
            },
            watch: {
                season: function() {
                    readTransferRequests(this);
                }
            },
            methods: {
                handleSelectionChange: function () {
                    this.selectedPlayers.splice(0, this.selectedPlayers.length);
                    for (var i = 0; i < this.players.length; i++) {
                        var player = this.players[i];
                        if (player.selected) {
                            this.selectedPlayers.push(player);
                        }
                    }
                },
                approveTransfer: function() {
                    var comp = this;
                    var approvedPlayers = this.selectedPlayers.slice();

                    Dialog.open('general/message-box', {
                            caption: "העברת שחקנים",
                            message: "האם לבצע העברת שחקנים?",
                            alert: true,
                            confirmText: "כן",
                            cancelText: "לא"
                        },
                        function (err, result) {
                            if (result === true) {
                                var transfers = approvedPlayers.map(function (player) {
                                    return {
                                        team: player.team,
                                        school: player.school.id,
                                        idNumber: player.idNumber
                                    };
                                });

                                if (transfers.length > 0) {
                                    Vue.http.post('/api/v2/admin/players/transfers', transfers)
                                        .then(
                                            function (resp) {
                                                comp.selectedPlayers.splice(0, comp.selectedPlayers.length);
                                                for (var i = 0; i < approvedPlayers.length; i++) {
                                                    var index = comp.players.indexOf(approvedPlayers[i]);
                                                    if (index >= 0) {
                                                        comp.players.splice(index, 1);
                                                    }
                                                }
                                            },
                                            function (err) {
                                                Dialog.open('general/error-message', {
                                                    caption: "פעולה נכשלה",
                                                    message: typeof err.body === "string" ? err.body : "שגיאה בהעברת שחקנים"
                                                });
                                            }
                                        );
                                }
                            }
                        });
                }
            }
        });

        return TransferRequestsComponent;
    });