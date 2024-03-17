define(["templates/manage", "manage/dal", "utils", "dialog",
    "manage/filters-teams", "manage/new-team", "manage/data-table2", "components/multiselect"],
    function (templates, dal, utils, Dialog) {

    var states = {
        edit: 1,
        new: 2,
        view: 3,
        duplicate: 4
    };

    function applyMaxTableHeight() {
        window.setTimeout(function() {
            var tabContent = $('.tab-content');
            var parentHeight = tabContent.parents('div').first().height();
            var maxHeight = parentHeight - 100;
            tabContent.css('max-height', maxHeight);
        }, 1000);
    }

    function confirmAndRefresh(comp, teamId, record) {
        var url = '/api/v2/admin/teams/status';
        var requestParams = {
            teams: [{id: teamId}],
            status: 2
        };
        Vue.http.post(url, requestParams).then(function (resp) {
            // Returns team ids for inserted teams
            if (resp.body.length > 0) {
                var update = resp.body[0];
                record.TeamId = update.team;
                record.AdminStatus = 2;
            }
            comp.refresh(comp.latestFilters);
        }, function (err) {
            console.log(err);
        });
    }

    var columns = [
        {
            key: 'School.SYMBOL',
            name: 'סמל בית ספר',
            filter: true,
            active: true,
            type: 'text'
        },{
            key: 'School.SCHOOL_NAME',
            name: 'שם בית ספר',
            filter: true,
            active: true,
            type: 'text'
        },
        {
            key: 'Region.Name',
            name: 'מחוז',
            active: true,
            filter: true,
            type: 'text'
        },
        {
            key: 'CityData.Name',
            name: 'רשות',
            active: false,
            filter: true,
            type: 'text'
        },
        {
            key: 'Sport.Name',
            name: 'ענף ספורט',
            active: true,
            filter: true,
            type: 'text',
            options: 'sports'
        },
        {
            key: 'Championship.Name',
            name: 'אליפות',
            filter: true,
            active: true,
            type: 'text',
        },
        {
            key: 'Category.Name',
            name: 'קטגוריה',
            filter: true,
            active: true,
            type: 'text',
        },
        {
            key: 'TeamNumberDisplay',
            name: 'קבוצה',
            active: true,
            type: 'text'
        },
        {
            key: 'PlayerCount',
            name: 'מספר שחקנים',
            active: false,
            type: 'text',
            openTab: {
                route: 'manage/players',
                params: {
                    region: 'Region.Id',
                    sport: 'Sport.Id',
                    championship : 'Championship.Id',
                    category : 'Category.Id',
                    team: 'Id'
                }
            }
        },
        {
            key: 'Payment.Order',
            name: 'דרישת תשלום',
            type: 'documentNumber',
            active: true
        },
        {
            key: 'AdminStatus', //_value'
            name: 'סטטוס',
            filter: true,
            active: true,
            type: '',
            lookup: {
                "1": "רשומה",
                "2": "מאושרת"
            }
        },
        {
            id: 'Approved1',
            key: 'Approved',
            name: 'אישור נציג',
            active: true,
            type: 'func',
            func: function(value){
                var roles = Number(value).toString(2);
                while(roles.length < 4) {
                    roles = "0" + roles;
                }

                if (roles[roles.length - 3] == 1) {
                    return 'נציג אישר';
                }

                return 'נציג לא אישר';
            },
            link: function(team) {
                return team.RepresentativeLoginLink || null;
            }
        },{
            id: 'Approved2',
            key: 'Approved',
            name: 'אישור מנהל',
            active: true,
            type: 'func',
            func: function(value){
                var roles = Number(value).toString(2);
                while(roles.length < 4) {
                    roles = "0" + roles;
                }

                if (roles[roles.length - 2] == 1) {
                    return 'מנהל אישר';
                }

                return 'מנהל לא אישר';
            },
            link: function(team) {
                return team.PrincipalLoginLink || null;
            }
        },
        {
            id: 'Approved3',
            key: 'Approved',
            name: 'אישור מפקח',
            active: true,
            type: 'func',
            func: function(value){
                var roles = Number(value).toString(2);
                while(roles.length < 4) {
                    roles = "0" + roles;
                }

                if (roles[roles.length - 4] == 1) {
                    return 'מפקח אישר';
                }

                return 'מפקח לא אישר';
            }
        },
        {
            key: 'Coach.Email',
            name: 'אימייל מאמן',
            active: false,
            type: 'text'
        },{
            key: 'Coach.PhoneNumber',
            name: 'טלפון מאמן',
            active: false,
            type: 'text'
        },{
            key: 'Coach.Name',
            name: 'שם מאמן',
            filter: true,
            active: false,
            type: 'text',
        },{
            key: 'Coach.certification',
            name: 'הסמכה',
            active: false,
            filter: true,
            type: 'text',
        },
        {
            key: 'Facility.Name',
            name: 'מתקן',
            filter: false,
            active: false
        },
        {
            key: 'Facility.Id',
            name: 'מזהה מתקן',
            active: false,
            type: 'text'
        },{
            key: 'AlternativeFacility.Name',
            name: 'מתקן חלופי',
            active: false,
            type: 'text'
        },{
            key: 'AlternativeFacility.Address',
            name: 'כתובת מתקן חלופי',
            active: false,
            type: 'text'
        },
        {
            key: 'Teacher.Name',
            name: 'מורה אחראי',
            filter: true,
            active: false,
            type: 'text'
        },{
            key: 'Teacher.PhoneNumber',
            name: 'טלפון מורה אחראי',
            active: false,
            type: 'text'
        },{
            key: 'Teacher.Email',
            name: 'מייל מורה אחראי',
            active: false,
            type: 'text'
        },
        {
            key: 'ActivityTimes',
            name: 'ימים ושעות פעילות',
            active: false,
            type: 'activity'
        },
        {
            key: 'HostingHours',
            name: 'ימים ושעות אירוח',
            active: false,
            type: 'activity'
        },
        {
            key: 'Manager.Name',
            name: 'מנהל מקצועי',
            active: false,
            filter: true,
            type: 'text'
        },{
            key: 'Manager.Email',
            name: 'אימייל מנהל מקצועי',
            active: false,
            type: 'text'
        },{
            key: 'Manager.PhoneNumber',
            name: 'טלפון מנהל מקצועי',
            active: false,
            type: 'text'
        },
        {
            key: 'Principal.Name',
            name: 'מנהל בי"ס',
            active: false,
            filter: true,
            type: 'text'
        },{
            key: 'Principal.Email',
            name: 'אימייל מנהל בי"ס',
            active: false,
            type: 'text'
        },{
            key: 'Principal.PhoneNumber',
            name: 'טלפון מנהל בי"ס',
            active: false,
            type: 'text'
        },
        {
            key: 'Representative.Name',
            name: 'נציג רשות מקומית',
            active: false,
            filter: true,
            type: 'text'
        },{
            key: 'Representative.Email',
            name: 'אימייל נציג רשות',
            active: false,
            type: 'text'
        },{
            key: 'Representative.PhoneNumber',
            name: 'טלפון נציג רשות',
            active: false,
            type: 'text'
        },
        {
            key: 'CreatedAt',
            name: 'תאריך הקמה',
            active: false,
            type: 'date',
            format: 'dd/MM/yyyy'
        },
        {
            key: 'RegistrationDate',
            name: 'תאריך רישום',
            active: false,
            type: 'date',
            format: 'dd/MM/yyyy'
        },
        {
            key: 'ConfirmationDate',
            name: 'תאריך אישור',
            active: false,
            type: 'date',
            format: 'dd/MM/yyyy'
        },
        {
            key: 'PlayerNumberFrom',
            name: 'מספר חולצה מינימום',
            active: false,
            type: 'text'
        },
        {
            key: 'PlayerNumberTo',
            name: 'מספר חולצה מקסימום',
            active: false,
            type: 'text'
        }
    ];

    function getEmptyTeam() {
        return {
            school : null,
            championship : null,
            status: null,
            teamNumber: null,
            supervisor: null,
            registrationDate: null,
            shirtNumberFrom : null,
            shirtNumberTo : null
        }
    }

    function prepareParams(filters) {
        var result = {
            championship : filters.championship ? filters.championship.id : null,
            region : filters.region ? filters.region.id : null,
            sport : filters.sport ? filters.sport.id : null,
            category : filters.category ? filters.category.id : null
        };

        return result;
    }

    function changeStatus(comp, status) {
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
    }

    var Teams = Vue.extend({
        template: templates["teams"],
        data: function () {
            return {
                tabName: "קבוצות",
                caption: "קבוצות",
                image: 'img/icon-teams.svg',
                records: [],
                columns: columns,
                selectedTeams: [],
                initFilters: {},
                title: '12',
                state: null,
                loading: false,
                latestFilters: null
            };
        },
        props: {
            sport: {},
            region: {},
            championship: {},
            category: {}
        },
        mounted: function () {
            var comp = this;
            comp.sport = comp.sport ? parseInt(comp.sport) : '';
            comp.region = comp.region ? parseInt(comp.region) : '';
            comp.championship = comp.championship ? parseInt(comp.championship) : '';
            comp.category = comp.category ? parseInt(comp.category) : '';
            comp.initFilters = {
                sport: comp.sport,
                region: comp.region,
                championship: comp.championship,
                category: comp.category
            };
            Vue.http.get('/api/v2/cache?key=manage-teams-columns').then(function(resp) {
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
        },
        methods: {
            updateCaption: function (caption) {
                this.caption = caption;
            },
            updateNewTeam: function(record) {
                this.refresh();
            },
            refresh: function(filters) {
                var comp = this;
                comp.latestFilters = filters;
                if (filters) {
                    comp.updateCaption(filters.description);
                    comp.championship = filters.championship ? filters.championship.id : '';
                    comp.category = filters.category ? filters.category.id : '';
                    comp.region = filters.region ? filters.region.id : '';
                    comp.sport = filters.sport ? filters.sport.id : '';
                }

                var params = {
                    championship : comp.championship,
                    region : comp.region,
                    sport : comp.sport,
                    category : comp.category,
                };

                comp.loading = true;
                dal.getTeams(params).then(function(teams) {
                    teams.forEach(function(team) {
                        if (team.Tokens && team.Tokens.Principal) {
                            team.PrincipalLoginLink = 'https://www.schoolsport.org.il/v2/#/login?token=' + team.Tokens.Principal;
                        }

                        if (team.Tokens && team.Tokens.Representative) {
                            team.RepresentativeLoginLink = 'https://www.schoolsport.org.il/v2/#/login?token=' + team.Tokens.Representative;
                        }
                    });
                    teams.forEach(function(team) {
                        team.TeamNumberDisplay = team.TeamNumber;
                        if (team.AdditionalTeamNumber != null && team.AdditionalTeamNumber.length > 0) {
                            team.TeamNumberDisplay += ' (' + team.AdditionalTeamNumber + ')';
                        }
                    });
                    comp.records = teams;
                    comp.loading = false;
                    //applyMaxTableHeight();
                });
            },
            onEditTeam: function(duplicate) {
                if (typeof duplicate === 'undefined' || duplicate == null)
                    duplicate = false;
                var comp = this;
                var caption = duplicate ? 'duplicate' : 'edit';
                if (comp.selectedTeams == null || comp.selectedTeams.length !== 1) {
                    console.log('Can ' + caption + ' a team only with one row selected');
                    return;
                }
                var record = comp.selectedTeams[0];
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
            },
            duplicateTeam: function() {
                var comp = this;
                comp.onEditTeam(true);
            },
            onRecordSelect: function(records){
                this.selectedTeams = records;
            },
            newTeam: function() {
                var comp = this;
                if (comp.latestFilters == null || comp.latestFilters.championship == null || comp.latestFilters.category == null) {
                    console.log("can't add team without a selected championship and category");
                    return;
                }
                var description = comp.latestFilters.championship.name + ' ' + comp.latestFilters.category.name;
                Dialog.open("manage/new-team", {
                    record: getEmptyTeam(),
                    region: comp.latestFilters.region ? comp.latestFilters.region.id : null,
                    championship: comp.latestFilters.championship ? comp.latestFilters.championship.id : null,
                    category: comp.latestFilters.category ? comp.latestFilters.category.id : null,
                    state: states.new,
                    description: description,
                    disableClickOutside: true
                }, function(err, res) {
                    if (res != null) {
                        comp.refresh(comp.latestFilters);
                    }
                });
            },
            removeTeam: function(){
                var comp = this;
                /*if (comp.selectedTeams.length > 5) {
                    console.log("can't delete more than 5 in same time.");
                    return;
                }*/
                var msg = 'נא לאשר את מחיקת ';
                msg += (comp.selectedTeams.length === 1) ? 'הקבוצה הבאה:' : comp.selectedTeams.length + ' ' + 'הקבוצות הבאות:';
                msg += '<br />' + comp.selectedTeams.map(function(selectedTeam) {
                    return selectedTeam.School.SCHOOL_NAME + ' ' +
                        selectedTeam.Sport.Name + ' ' +
                        selectedTeam.Category.Name + ' ' +
                        selectedTeam.TeamNumber;
                }).join('<br />');
                Dialog.open('general/message-box', {
                    caption: "מחיקת קבוצה",
                    message: msg,
                    alert: true,
                    confirmText: "אישור",
                    cancelText: "ביטול"
                }, function(err, isDelete){
                    if (!isDelete) {
                        return;
                    }
                    var promises = [];
                    comp.selectedTeams.forEach(function(r) {
                        var params = {
                            TeamId: r.TeamId,
                            Id: r.Id
                        };
                        promises.push(dal.deleteTeam(params));
                    });

                    utils.promiseAll(promises)
                        .then(function(res){
                            comp.refresh();
                    }).catch(function(err){
                        var errorMessage = err.body;
                        if (errorMessage.indexOf('יש להסיר') > 0) {
                            var msg = comp.selectedTeams.length === 1 ? 'לקבוצה זו יש שחקנים רשומים' : 'לאחת או יותר מהקבוצות יש שחקנים רשומים';
                            msg += ', האם למחוק בכל זאת? שחקנים יימחקו גם כן'
                            Dialog.open('general/message-box', {
                                caption: "מחיקת קבוצה",
                                message:  msg,
                                alert: true,
                                confirmText: "אישור",
                                cancelText: "ביטול"
                            }, function(err, isConfirmed) {
                                if (!isConfirmed) {
                                    return;
                                }
                                promises = [];
                                comp.selectedTeams.forEach(function(r) {
                                    var params = {
                                        TeamId: r.TeamId,
                                        Id: r.Id,
                                        confirmed: 1
                                    };
                                    promises.push(dal.deleteTeam(params));
                                });

                                utils.promiseAll(promises).then(function(res) {
                                    comp.refresh();
                                }).catch(function(err){
                                    Dialog.open('general/message-box', {
                                        caption: "שגיאה",
                                        message: err.body,
                                        alert: true,
                                    });
                                });
                            });
                        } else {
                            Dialog.open('general/message-box', {
                                caption: "שגיאה",
                                message: err.body,
                                alert: true,
                            });
                        }
                    })
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
                    key: 'manage-teams'
                }, function(err, columns) {
                    if (!columns) {
                        return;
                    }

                    comp.columns = columns.map(function(c) {
                        return Object.assign({}, c);
                    });
                });
            },
            onExport: function() {
                var comp = this;
                var copy  = comp.columns.map(function(c) {
                    return Object.assign({}, c);
                });

                utils.excelReport('data', 'headerTable');
            },
            approveTeams: function() {
                var comp = this;
                changeStatus(comp, 2);
            },
            disApproveTeams: function() {
                var comp = this;
                changeStatus(comp, 1);
            },
            resetSelection: function() {
                var comp = this;
                comp.records.forEach(function(team) {
                    team.selected = false;
                });
                comp.selectedTeams = [];
                comp.records = comp.records.slice();
                comp.$forceUpdate();
            },
        }
    });

    return Teams;
});