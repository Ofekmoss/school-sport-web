define(["templates/admin", "utils", "dialog", "consts", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, consts) {

        function readChampionships(comp, callback) {
            comp.championships.splice(0, comp.championships.length);

            Vue.http.get('/api/v2/admin/championships?season=' + comp.season)
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.length; i++) {
                            comp.championships.push(resp.body[i]);
                        }
                        // TODO - work around to prevent change in server
                        Vue.http.get('/api/v2/admin/championships?clubs=1&season=' + comp.season)
                            .then(
                                function (resp) {
                                    for (var i = 0; i < resp.body.length; i++) {
                                        var curChamp = resp.body[i];
                                        var existingIndex = comp.championships.findIndex(function (c) {
                                            return c.id === curChamp.id;
                                        });
                                        if (existingIndex < 0) {
                                            comp.championships.push(curChamp);
                                        }
                                    }
                                    Vue.http.get('/api/v2/admin/championships?league=1&season=' + comp.season)
                                        .then(
                                            function (resp) {
                                                for (var i = 0; i < resp.body.length; i++) {
                                                    var curChamp = resp.body[i];
                                                    var existingIndex = comp.championships.findIndex(function (c) {
                                                        return c.id === curChamp.id;
                                                    });
                                                    if (existingIndex < 0) {
                                                        comp.championships.push(curChamp);
                                                    }
                                                }
                                                callback();
                                            },
                                            function (err) {
                                                callback(err);
                                            }
                                        );
                                },
                                function (err) {
                                    callback(err);
                                }
                            );
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }

        function readSeasons(comp, callback) {
            comp.seasons.splice(0, comp.seasons.length);
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    comp.seasons.push(resp.body[i]);
                }
                Vue.http.get('/api/v2/cache?key=season').then(function (resp) {
                    var cachedSeason = resp.body.Value;
                    if (cachedSeason != null) {
                        comp.season = cachedSeason;
                        callback();
                    } else {
                        Vue.http.get('/api/v2/season').then(function (resp) {
                            var curSeason = resp.body.season;
                            if (curSeason) {
                                comp.season = curSeason;
                            }
                            callback();
                        }, function (err) {
                            callback(err);
                        });
                    }
                }, function (err) {
                    callback(err);
                });
            }, function (err) {
                callback(err);
            });
        }

        function readRegions(comp, callback) {
            comp.regions.splice(0, comp.regions.length);
            Vue.http.get('/api/v2/regions')
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.length; i++) {
                            comp.regions.push(resp.body[i]);
                        }
                        callback();
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }

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

        /**
         * @return {string}
         */
        function AddZero(num) {
            return num >= 0 && num < 10 ? '0' + num : num.toString();
        }

        /**
         * @return {string}
         */
        function ParseDateTime(rawDate, format) {
            var parts = rawDate.split('T');
            var dateParts = parts[0].split('-');
            var timeParts = parts[1].split(':');
            timeParts[2] = timeParts[2].substring(0, 2);
            var year = parseInt(dateParts[0], 10);
            var month = parseInt(dateParts[1], 10)-1;
            var day = parseInt(dateParts[2], 10);
            var hours = parseInt(timeParts[0], 10);
            var minutes = parseInt(timeParts[1], 10);
            var seconds = parseInt(timeParts[2], 10);
            return format.replace('DD', AddZero(day))
                .replace('MM', AddZero(month))
                .replace('YYYY', year)
                .replace('HH', AddZero(hours))
                .replace('mm', AddZero(minutes))
                .replace('ss', AddZero(seconds));
        }

        function readPlayers(comp, callback) {
            if (typeof callback === 'undefined' || callback == null)
                callback = new Function();
            var query = [];
            if (comp.season) {
                query.push("season=" + comp.season);
            }
            if (comp.championship) {
                query.push("championship=" + comp.championship);
            } else {
                if (comp.competitionType) {
                    if (parseInt(comp.competitionType) === 1) {
                        query.push("clubs=1");
                    } else {
                        query.push("league=1");
                    }
                }
                if (comp.region) {
                    query.push("region=" + comp.region);
                }
                if (comp.sport) {
                    query.push("sport=" + comp.sport);
                }
            }
            //comp.players.splice(0, comp.players.length);
            var url = '/api/v2/admin/players' + (query.length > 0 ? '?' + query.join('&') : "");
            //console.log(url);
            Vue.http.get(url).then(function (resp) {
                comp.players = [];
                for (var i = 0; i < resp.body.length; i++) {
                    var player = resp.body[i];
                    if (player.approved == null) {
                        player.approved = 0;
                    }
                    // console.log(player);
                    if (player.TransferRequested) {
                        player.playerStatus = 5;
                    }
                    if (player.maxStudentAge) {
                        var maxStudentBirthday = new Date(player.maxStudentAge);
                        if (new Date(player.student.birthDate) < maxStudentBirthday) {
                            player.highlighted = true;
                        }
                    }
                    if (player.deletedAt) {
                        player.playerStatus = 9;
                        player.red = true;
                        player.highlighted = false;
                        player.tooltip = 'רישום הוסר בתאריך ' +
                            ParseDateTime(player.deletedAt, 'DD/MM/YYYY') +
                            ' בשעה ' +
                            ParseDateTime(player.deletedAt, 'HH:mm');
                    }
                    comp.players.push(player);
                }
                utils.readServerCache(['isf-overage', 'overage'], true, function (err, responseMapping) {
                    if (err) {
                        console.log(err);
                    } else {
                        var season = comp.season;
                        var isfOverageRawData = responseMapping['isf-overage'];
                        var overageRawData = responseMapping['overage'];
                        var isfOverageItems = utils.parseIsfOverageItems(isfOverageRawData);
                        var overageItems = utils.parseIsfOverageItems(overageRawData);
                        var forceUpdate = false;
                        comp.players.forEach(function (player) {
                            if (player.championship && player.championship.sport &&
                                player.student.birthDate != null &&
                                player.student.birthDate.toString().length > 0) {
                                var sport = player.championship.sport.id;
                                var category = player.championship.category.category;
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
                                if (matchingIsfItem != null) {
                                    var rangeStart = utils.parseDate(matchingIsfItem.rangeStart);
                                    var rangeEnd = utils.parseDate(matchingIsfItem.rangeEnd);
                                    var birthday = new Date(player.student.birthDate);
                                    player.isfOverage = (birthday >= rangeStart && birthday <= rangeEnd);
                                    if (player.isfOverage)
                                        forceUpdate = true;
                                }
                                if (matchingItem != null) {
                                    var rangeEnd = utils.parseDate(matchingItem.rangeEnd);
                                    var birthday = new Date(player.student.birthDate);
                                    player.aboveMaxAge = birthday < rangeEnd;
                                    if (player.aboveMaxAge)
                                        forceUpdate = true;
                                }
                            }
                        });
                        if (forceUpdate) {
                            comp.$forceUpdate();
                        }
                    }
                    callback();
                });
            }, function (err) {
                comp.players = [];
                console.log(err);
                callback();
            });
        }


        function setup(comp) {
            readSeasons(comp, function() {
                readRegions(comp, function () {
                    readChampionships(comp, function () {
                        readCompetitions(comp, function () {
                            readPlayers(comp, function () {
                            });
                        });
                    });
                });
            });
        }

        var ClubPlayersApprovalComponent = Vue.extend({
            template: templates["players"],
            props: {
                region: {},
                sport: {},
            },
            data: function () {
                var playerStatusMapping = {
                    "1": "רשום",
                    "2": "אושר",
                    "3": "לא אושר",
                    "5": "ממתין לאישור העברה",
                    "9": "רישום הוסר"
                };
                var gradeMapping = {
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
                };
                return {
                    tabName: "שחקנים",
                    caption: "שחקנים",
                    competitionType: 1,
                    teams: [],
                    players: [],
                    columns: [
                        {
                            key: 'student.firstName',
                            name: 'שם פרטי',
                            active: true
                        },
                        {
                            key: 'student.lastName',
                            name: 'שם משפחה',
                            active: true
                        },
                        {
                            key: 'student.birthDate',
                            name: 'תאריך לידה',
                            type: 'date',
                            maxAge: true,
                            active: true
                        },
                        {
                            key: 'student.grade',
                            name: 'כיתה',
                            active: true,
                            lookup: gradeMapping,
                            getter: function(record) {
                                var grade = record.student.grade;
                                if (grade != null) {
                                    return gradeMapping[grade.toString()] || '';
                                }
                                return '';
                            },
                            getSortValue: function(record) {
                                return record.student.grade || 0;
                            }
                        },
                        {
                            key: 'student.idNumber',
                            name: 'מספר זהות',
                            active: true
                        },
                        {
                            key: 'createdAt',
                            name: 'תאריך הוספה',
                            type: 'date',
                            active: true
                        },
                        /*
                        {
                            key: 'deletedAt',
                            name: 'תאריך הסרה',
                            type: 'date',
                            active: true
                        },
                        */
                        {
                            key: 'team.name',
                            name: 'שם קבוצה',
                            active: true
                        },
                        {
                            key: 'team.number',
                            name: 'קבוצה',
                            active: true
                        },
                        {
                            key: 'championship.region.name',
                            name: 'מחוז',
                            active: true
                        },
                        {
                            key: 'school.symbol',
                            name: 'סימול בית ספר',
                            active: true
                        },
                        {
                            key: 'championship.name',
                            name: 'אליפות',
                            active: true
                        },
                        {
                            key: 'championship.sport.name',
                            name: 'ענף ספורט',
                            active: false
                        },
                        {
                            key: 'championship.category.name',
                            name: 'קטגוריה',
                            active: false,
                            type: ''
                        },
                        {
                            name: 'סטטוס',
                            key: 'playerStatus',
                            active: true,
                            type: '',
                            tooltip: true,
                            lookup: playerStatusMapping,
                            getter: function(record) {
                                var status = record.playerStatus || 0;
                                return playerStatusMapping[status.toString()] || '';
                            }
                        },
                        {
                            name: 'תמונה',
                            key: 'picture',
                            active: true,
                            type: 'imageLink'
                        },
                        {
                            name: 'בדיקה רפואית',
                            key: 'medicalApproval',
                            active: true,
                            type: 'imageLink'
                        },
                        {
                            name: 'ספח ת"ז',
                            key: 'idSlip',
                            active: true,
                            type: 'imageLink'
                        }
                    ],
                    championships: [],
                    competitions: [],
                    sports: [],
                    regions: [],
                    seasons: [],
                    season: null,
                    championship: null,
                    searchText: "",
                    isSelectAll: false,
                    selectedStatus: null,
                    selectedPlayers: []
                };
            },
            mounted: function () {
                setup(this);
            },
            computed: {
                filteredChampionships: function () {
                    var result = [];
                    for (var i = 0; i < this.championships.length; i++) {
                        var championship = this.championships[i];
                        if (this.competitionType) {
                            if (this.competitionType == 1) {
                                if (!championship.clubs) {
                                    continue;
                                }
                            }
                            else if (this.competitionType == 2) {
                                if (!championship.league) {
                                    continue;
                                }
                            }
                        }
                        if (this.region != null && this.region !== "") {
                            if (championship.region.id !== this.region) {
                                continue;
                            }
                        }

                        if (this.sport != null && this.sport !== "") {
                            if (championship.sport.id !== this.sport) {
                                continue;
                            }
                        }
                        result.push(championship);
                    }
                    return result;
                }
            },
            watch: {
                competitionType: function () {
                    readPlayers(this);
                },
                championship: function () {
                    readPlayers(this);
                },
                sport: function () {
                    this.updateCaption();
                    readPlayers(this);
                },
                region: function () {
                    this.updateCaption();
                    readPlayers(this);
                },
                season: function() {
                    var comp = this;
                    readChampionships(comp, function () {
                        readCompetitions(comp, function () {
                            readPlayers(comp);
                        });
                    });
                }
            },
            methods: {
                updateCaption: function () {
                    var caption = "שחקנים";
                    if (this.region != null && this.regions) {
                        for (var n = 0; n < this.regions.length; n++) {
                            var region = this.regions[n];
                            if (region.id == this.region) {
                                caption += " - " + region.name;
                                break;
                            }
                        }
                    }
                    if (this.sport != null && this.sports) {
                        for (var n = 0; n < this.sports.length; n++) {
                            var sport = this.sports[n];
                            if (sport.id == this.sport) {
                                caption += " - " + sport.name;
                                break;
                            }
                        }
                    }
                    this.caption = caption;
                },
                handleSelectionChange: function () {
                    this.selectedPlayers.splice(0, this.selectedPlayers.length);
                    this.selectedStatus = null;
                    for (var i = 0; i < this.players.length; i++) {
                        var player = this.players[i];
                        if (player.selected) {
                            if (this.selectedPlayers.length === 0) {
                                this.selectedStatus = player.playerStatus;
                            }
                            else if (this.selectedStatus != player.playerStatus) {
                                this.selectedStatus = null;
                            }
                            this.selectedPlayers.push(player);
                        }
                    }
                },
                changeStatus: function(status) {
                    var comp = this;
                    var players = [];
                    var i = 0;
                    while (i < comp.selectedPlayers.length) {
                        var player = comp.selectedPlayers[i];
                        if (player.player) {
                            // Player record exists for this player - putting its id
                            players.push({player: player.player});
                            i++;
                        }
                        else if (player.team.team && player.id) {
                            // Team record exists for the player team and player has a student id - putting these ids
                            players.push({team: player.team.team, studentId: player.id});
                            i++;
                        }
                        else {
                            player.selected = false;
                            comp.selectedPlayers.splice(i, 1);
                        }
                    }
                    Vue.http.post('/api/v2/admin/players/status', {
                        players: players,
                        status: status
                    })
                        .then(
                            function (resp) {
                                // Returns player ids for inserted players
                                for (var i = 0; i < resp.body.length; i++) {
                                    var update = resp.body[i];
                                    for (var n = 0; n < comp.selectedPlayers.length; n++) {
                                        var player = comp.selectedPlayers[n];
                                        if (player.id === update.studentId && player.team.team === update.team) {
                                            player.player = update.player;
                                            break;
                                        }
                                    }
                                }
                                comp.selectedStatus = status;
                                for (var i = 0; i < comp.selectedPlayers.length; i++) {
                                    comp.selectedPlayers[i].playerStatus = status;
                                }
                            },
                            function (err) {
                                console.log(err);
                            }
                        );

                }
            }
        });

        return ClubPlayersApprovalComponent;
    });