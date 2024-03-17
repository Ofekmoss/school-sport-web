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
            name: 'תאריך רישום',
            active: false,
            type: 'text',
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
                selectedRecord: [],
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
            //console.log(this.team);
            this.sport = this.sport ? parseInt(this.sport) : '';
            this.region = this.region ? parseInt(this.region) : '';
            this.championship = this.championship ? parseInt(this.championship) : '';
            this.category = this.category ? parseInt(this.category) : '';
            this.team = this.team? parseInt(this.team) : '';

            this.initFilters = {
                sport: this.sport,
                region: this.region,
                championship: this.championship,
                category: this.category,
                team: this.team
            };
            //console.log(this.initFilters);
        },
        methods: {
            updateCaption: function (caption) {
                this.caption = caption;
            },
            saveRecord: function() {
                console.log('saving... ', this.selectedRecord);
            },
            refresh: function(filters) {
                if (filters) {
                    this.updateCaption(filters.description);
                    this.championship = filters.championship && filters.championship.id != -1 ? filters.championship.id : '';
                    this.category = filters.category && filters.category.id != -1 ? filters.category.id : '';
                    this.region = filters.region && filters.region.id != -1 ? filters.region.id : '';
                    this.sport = filters.sport && filters.sport.id != -1 ? filters.sport.id : '';
                    this.team = filters.team && filters.team.id != -1 ? filters.team.id : '';
                }

                if (filters && !filters.team) {
                    this.records.splice();
                    return;
                }

                var params = {
                    championship : this.championship,
                    region : this.region,
                    sport : this.sport,
                    category : this.category,
                    team : this.team,
                };

                var comp = this;
                dal.getPlayers(params).then(function(res) {
                    comp.records = res;
                });
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
            onMoreInfo: function(records) {
                this.onRecordSelect(records);
                Dialog.open("manage/new-player2", {
                    record: this.selectedRecord,
                    state: states.edit,
                    disableClickOutside: true
                });
            },
            onRecordSelect: function(records){
                this.selectedRecord = records;
            },
            newPlayer: function() {
                Dialog.open("manage/new-player2", {
                    record: getEmptyPlayer(),
                    state: states.new,
                    disableClickOutside: true
                });
            },
            removePlayer: function(){
                var comp = this;
                Dialog.open('general/message-box', {
                    caption: "מחיקת שחקן",
                    message: "האם למחוק את השחקן?",
                    alert: true,
                    confirmText: "כן",
                    cancelText: "לא"
                }, function(err, isDelete){
                    if (!isDelete) {
                        return;
                    }

                    dal.deletePlayer(comp.selectedRecord[0].Player.Id).then(function(res, err){
                        if (err) {
                            // show error
                        } else {
                            comp.updateRemovedPlayer(comp.selectedRecord[0]);
                        }
                    })
                });
            },
            approvePlayers: function () {

            },
            updateRemovedPlayer: function(record) {
                if (this.records.length <= 0) {
                    return;
                }

                this.records = this.records.filter(function(player){
                    return player.Player.Id != record.Player.Id;
                });
            },
            onActiveColumns: function() {
                var comp = this;
                var copy  = comp.columns.map(function(c) {
                    return Object.assign({}, c);
                });
                Dialog.open("manage/columns-select-dialog", {
                    columns: copy,
                    max: 15
                }, function(err, columns) {
                    if (!columns) {
                        return;
                    }

                    comp.columns = columns.map(function(c) {
                        return Object.assign({}, c);
                    });
                });
            },
        }
    });

    return Players;
});