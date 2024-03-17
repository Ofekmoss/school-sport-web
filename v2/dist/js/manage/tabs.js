define(["templates/manage", "utils", "dialog", "services/access", "consts", "manage/dal",
        "manage/new-team",
        "manage/filters-teams",
        "manage/filters-players",
        "components/multiselect", "components/multiselect-search"],
    function (templates, utils, Dialog, Access, consts, dal) {

        function saveState(tabs) {
            var data = [];
            tabs.forEach(function(tab){
                if (tab.type === 0) {
                    return;
                }

                data.push({
                    title: tab.title,
                    type: tab.type,
                    filters: tab.activeFilters
                });
            });
            localStorage.setItem(consts.stateStr, JSON.stringify(data));
        }

        function loadState(){
            var state = localStorage.getItem(consts.stateStr);
            return JSON.parse(state);
        }

        function updateColumns(tab) {
            if (tab.columns) {
                tab.totalWidth = 0;
                for (var i = 0; i < tab.columns.length; i++) {
                    var column = tab.columns[i];
                    if (column.width == null) {
                        column.width = 10;
                    }
                    if (column.active) {
                        tab.totalWidth += column.width;
                    }
                }
                if (tab.totalWidth === 0) {
                    tab.totalWidth = 10;
                }
            }
        }

        function getEmptyRecordType( columns) {
            var result = {};
            for (var i = 0; i <  columns.length; i++) {
                var prev = result;
                for (var k = 0; k < columns[i].key.length; k++) {
                    if (k === columns[i].key.length - 1) {
                        prev[columns[i].key[k]] = '';
                    } else {
                        if (!prev[columns[i].key[k]]) {
                            prev[columns[i].key[k]] = {};
                        }

                        prev = prev[columns[i].key[k]];
                    }
                }
            }

            return result;
        }

        function getDashboardData(tab) {

        }

        function readTeamsData(filters) {
            return dal.getTeams(filters)
                .then(
                    function (resp) {
                        var result = [];
                        for (var i = 0; i < resp.body.length; i++) {
                            var team = resp.body[i];

                            if (team.teamStatus == 2 && team.approved == 15) {
                                team.green = true;
                            }

                            result.push(team);
                        }

                        result.sort(function(a, b){
                            return new Date(b.createdAt) - new Date(a.createdAt);
                        });

                        return result;
                    }
                );
        }

        function readPlayersData(filters) {
            return Vue.http.get('/api/v2/admin/players' ).then(
                function (resp) {

                    var result = [];
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
                        result.push(player);

                        return result;
                    }
                });

        }

        function getSchoolsData(tab) {

        }

        function readChampionshipsData(tab) {

        }

        function getData(type, filters) {
            var func;
            if (type === consts.tabTypes.DASHBOARD) {
                console.log('get dashboard data')
                func = getDashboardData;
            } else if (type === consts.tabTypes.TEAMS) {
                console.log('get teams data')
                func = readTeamsData;
            } else if (type === consts.tabTypes.PLAYERS) {
                console.log('get players data')
                func = readPlayersData;
            } else if (type === consts.tabTypes.SCHOOLS) {
                console.log('get schools data')
                func = getSchoolsData;
            } else if (type === consts.tabTypes.CHAMPIONSHIPS) {
                console.log('get championships data')
                func = readChampionshipsData;
            }

            return func(filters).then(function(data) {
                data = data.map( function(row) {
                    row.__show = true;
                    return row;
                });
                return data;
            })
        }

        function readRegions() {
            return Vue.http.get('/api/v2/regions')
                .then(
                    function (resp) {
                        var result = [];
                        for (var i = 0; i < resp.body.length; i++) {
                            result.push(resp.body[i]);
                        }
                        return result;
                    }
                );
        }

        function readChampionships() {

        }

        function readSchools() {
            return Vue.http.get('/api/v2/admin/schools?region=' + Access.user.region).then(
                function (resp) {
                    var result = [];
                    for (var i = 0; i < resp.body.length; i++) {
                        result.push(resp.body[i]);
                    }
                    return result;
                }
            );
        }

        function isShowRecord(getValue, record, columns) {
            var result = columns.filter(function(col) {
                return col.isFilterActive;
            });
            result = result.reduce(function(prev, col) {

                var accOptions = col.textFilterOptions.reduce(function(p, option) {
                    return p || option.value && getValue(record, col) == option.title;
                }, false);

                return prev && accOptions;

            }, true);

            return result;
        }

        function saveTeam(record) {

            // TODO add fields that you can update
            Vue.http.put('/api/v2/admin/teams/' + encodeURIComponent(record.id), {
                sport: record.sport,
                competition: record.competition,
                teamNumber: record.teamNumber,
                coach: record.coach,
                facility: record.facility,
                activity: record.activity
            })
                .then(function(){

                })
                .catch(function() {

                });
        }

        var TabsComponent = Vue.extend({
            template: templates["tabs"],
            data: function () {
                return {
                    user: Access.user,
                    tabs: consts.tabDefinitions.slice(0, 1),
                    selectedTab: 0,
                    isShowAddOptions: false,
                    newTabTypes: consts.tabDefinitions,
                    drawerState: true,
                    regions: [],
                    championships: [],
                    competitions: [],
                    newEmptyRecord: null
                };
            },
            mounted: function () {
                var comp = this;
                this.regions = readRegions().then(function(res) {
                    comp.regions = res;
                });

                this.schools = readSchools().then(function(res) {
                    comp.schools = res;
                });

                var openTabs = loadState();
                if (!openTabs){
                    return;
                }
                openTabs.forEach(function(tab){
                    comp.openTab(tab.type, tab.filters);
                });
            },
            computed: {
            },
            watch: {
            },
            methods: {
                logout: function() {
                    Access.logout();
                },
                selectTab: function(tabIndex) {
                    this.selectedTab = tabIndex;
                },
                openNewTabDialog: function() {
                    var comp = this;
                    Dialog.open("manage/new-tab-dialog",
                        { types: this.newTabTypes.filter(function(tab){ return tab.canInstantiate == true}) },
                        function (err, result) {
                            if (result === undefined) {
                                return;
                            }

                            comp.openTab(result);
                        });
                },
                openTab: function(type, filters){
                    var comp = this;
                    this.selectedTab++;
                    this.getTab(type, filters).then(function(newTab) {
                        newTab.initFilters = filters;
                        comp.tabs.push(newTab);
                    });
                },
                getTab: function(type, filters) {
                    var comp = this;
                    var newTab = Object.assign({}, consts.tabDefinitions.find(function(t) {
                        return t.type == type
                    }));

                    newTab.columns = newTab.columns.map(function(col){
                        col.activeField = col.active;
                        return col;
                    });

                    newTab.records.splice();
                    if (!filters || !filters[newTab.minimumFilter]) {
                        newTab.allRecords = [];
                        newTab.records = [];
                        return Promise.resolve(newTab);
                    }
                    return getData(newTab.type, filters).then(function(data) {
                        newTab.allRecords = data;
                        newTab.records = data.slice();

                        newTab.columns.forEach(function(column) {
                            var textFilterOptions = [];
                            newTab.records.forEach(function(record) {
                                textFilterOptions.push({ title: comp.getValue(record, column), value: false, isActive: true });
                            });

                            textFilterOptions = textFilterOptions.filter(function(item, index) {
                                for (var i = 0; i < textFilterOptions.length; i++) {
                                    if (textFilterOptions[i].title === item.title) {
                                        return i == index;
                                    }
                                }});

                            column.textFilterOptions = textFilterOptions;
                        });

                        return newTab;
                    });

                },
                refreshData: function(filters) {
                    var comp = this;

                    if (!filters[this.tabs[this.selectedTab].minimumFilter]) {
                        comp.tabs[comp.selectedTab].allRecords = [];
                        comp.tabs[comp.selectedTab].records = [];
                        return;
                    }

                    this.tabs[this.selectedTab].activeFilters = filters;
                    saveState(this.tabs);
                    getData(this.tabs[this.selectedTab].type, filters).then(function(data) {
                        comp.tabs[comp.selectedTab].allRecords = data;
                        comp.tabs[comp.selectedTab].records = data.slice();

                        comp.tabs[comp.selectedTab].columns.forEach(function(column) {
                            var textFilterOptions = [];
                            comp.tabs[comp.selectedTab].records.forEach(function(record) {
                                textFilterOptions.push({ title: comp.getValue(record, column), value: false, isActive: true });
                            });

                            textFilterOptions = textFilterOptions.filter(function(item, index) {
                                for (var i = 0; i < textFilterOptions.length; i++) {
                                    if (textFilterOptions[i].title === item.title) {
                                        return i == index;
                                    }
                                }});

                            column.textFilterOptions = textFilterOptions;
                        });

                    });
                },
                toggleDrawer: function () {
                    this.drawerState = !this.drawerState;
                },
                selectAll: function(tab) {
                    if (tab.selectionType == 2) {
                        tab.records.forEach(function(record) {
                            record.selected = tab.isSelectAll;
                        });
                        tab.records = tab.records.slice();
                    }
                },
                sort: function (tab, col) {
                    getValue = this.getValue;
                    tab.columns.forEach(function(c) {
                        if (c != col) {
                            c.sort = null;
                        }
                    });

                    if (col.sort == 'a') {
                        col.sort = 'd';
                        tab.columns = tab.columns.slice();

                        if (!tab.records) {
                            return;
                        }
                        tab.records.sort(function (item1, item2) {
                            getValue(item1, col) < getValue(item2, col) ? 1 : -1;
                        });
                    }
                    else {
                        col.sort = 'a';
                        tab.columns = tab.columns.slice();
                        if (!tab.records) {
                            return;
                        }
                        tab.records.sort(function (item1, item2) {
                            return getValue(item1, col) > getValue(item2, col) ? -1 : 1
                        });
                    }
                },
                exportExcel: function () {
                    utils.excelReport('download', 'headerTable');
                },
                closeTab: function(tabIndex) {

                    var closedTab;
                    if (this.selectedTab > tabIndex) {
                        closedTab = this.tabs.splice(tabIndex, 1);
                        this.selectedTab--;
                    } else if (this.selectedTab < tabIndex) {
                        closedTab = this.tabs.splice(tabIndex, 1);
                    } else {
                        this.selectedTab = 0;
                        closedTab = this.tabs.splice(tabIndex, 1);
                    }

                    this.resetTab(closedTab[0]);
                    saveState(this.tabs);
                },
                resetTab: function(tab) {
                    tab.columns.forEach( function(col) {
                        delete col.sort;
                    });
                },
                handleColumnChange: function (tab) {
                    updateColumns(tab);
                },
                getValue: function(record, column) {
                    if (typeof column.key === "string") {
                        column.key = column.key.split('.');
                    }
                    var value = record;
                    for (var i = 0; i < column.key.length; i++) {
                        if (value == null) {
                            break;
                        }

                        var columnKey = column.key[i];
                        if (value.constructor === Array) {
                            value = value.map(function (x) { return x[columnKey]; });
                        }
                        else {
                            value = value[columnKey];
                        }
                    }

                    if (value != null && value.constructor === Array) {
                        if (column.lookup) {
                            value = value.map(function (x) {
                                return column.lookup[x];
                            });
                        }

                        if(column.type === 'activity') {
                            return value.map(function(act){
                                return act.Day + ' ' + act.StartTime + ' - ' + act.EndTime;
                            }).join(', ');
                        }

                        return value.map(function (x) { return x.toString(); }).join(", ");
                    }
                    if (column.type == 'select') {
                        if (column.extras) {
                            var a = this[column.options].find(function(option){
                                return option.id == record[column.extras.key]
                            });

                            var b = a[column.extras.options].find(function(option) {
                                return option.id == value;
                            });

                            return b.name;
                        } else {
                            var option = this[column.options].find(function( option){
                                return option.id == value;
                            });
                            return option.name;
                        }
                    }
                    else {
                        if (column.lookup) {
                            value = column.lookup[value];
                        } else if ( column.type == 'teamApproved') {
                            if (column.extras) {
                                var approvedBitValue = column.extras.approved;
                                var disApprovedBitValue = column.extras.notApproved;
                                if( approvedBitValue && (record[column.key] & approvedBitValue) !== 0) {
                                    value = "מאושר";
                                } else if (disApprovedBitValue && (record[column.key] & disApprovedBitValue) !== 0) {
                                    value = "לא מאושר";
                                } else {
                                    value = "ממתין לאישור";
                                }
                            }
                        }
                        return value;
                    }
                },
                toggleRecordSelect: function(tab, record) {

                    // this.newEmptyRecord = null;
                    // disable multiple
                    var tabType = this.tabs[this.selectedTab].type;
                    tab.records = tab.records.map( function(r, index) {
                        r.__id = index;
                        r.selected = false;
                        r.__editedRecord = utils.mergeDeep({}, r);
                        return r;
                    });

                    if (record) {
                        record.selected = !record.selected;
                    }
                    tab.selectedRecords = tab.records.filter(function(record) {
                        return record.selected;
                    });

                    this.newEmptyRecord = null;

                    tab.records = tab.records.slice();
                },
                filter: function(tab, column) {

                    if (!column.openFilter) {
                        tab.columns.forEach(function(col) {
                            col.openFilter = false;
                        });
                    }
                    column.openFilter = !column.openFilter;
                    tab.columns = tab.columns.slice();
                },
                filterRecords: function(tab, column) {
                    var getValue = this.getValue;
                    column.isFilterActive = column.textFilterOptions.reduce(function(prev, option) {
                        return prev || option.value;
                    }, false);

                    var filteredRecords = [];

                    // if no filters active return all records
                    if (!tab.columns.reduce(function(prev, curr) {
                            return prev || curr.isFilterActive;
                        }, false)) {
                        filteredRecords = tab.allRecords.slice();
                    } else {
                        tab.allRecords.forEach(function(record) {
                            if (isShowRecord(getValue, record, tab.columns)) {
                                filteredRecords.push(record);
                            }
                        });
                    }

                    tab.records = filteredRecords;
                    tab.columns = tab.columns.slice();
                },
                onFilterSearch: function (tab,  column) {
                    if (!column.searchText) {
                        column.textFilterOptions = column.textFilterOptions.map(function(option) {
                            option.isActive = true;
                            return option;
                        });
                    } else {
                        column.textFilterOptions.forEach(function(option){
                            if (option.title.indexOf(column.searchText) < 0) {
                                option.isActive = false;
                            } else {
                                option.isActive = true;
                            }
                        });
                    }

                    tab.columns = tab.columns.slice();
                },
                saveRecord: function() {
                    var toSave = utils.mergeDeep({}, this.tabs[this.selectedTab].selectedRecords[0].__editedRecord);
                    var newEmpty = getEmptyRecordType(this.tabs[this.selectedTab].columns);
                    var records = this.tabs[this.selectedTab].records;
                    for (var i = 0; i < records.length; i++) {
                        if (records[i].__id == toSave.__id) {
                            this.tabs[this.selectedTab].records[i] = toSave;
                            this.tabs[this.selectedTab].records[i].__editedRecord = newEmpty;
                            break;
                        }
                    }

                    // TODO save to API
                    saveTeam(toSave);

                    this.tabs[this.selectedTab].records = this.tabs[this.selectedTab].records.slice();
                },
                updateTab: function(tab) {
                    tab.columns = tab.columns.slice();
                },
                getOptions: function(options, optionsFunc, field) {
                    if (Array.isArray(options)) {
                        return options;
                    }

                    if (options && !optionsFunc) {
                        return this[options];
                    } else {
                        return optionsFunc(this[options], field);
                    }
                },
                getModelFromKey: function(record, column){
                    var keys = column.key;
                    var val = record;
                    for (var i = 0; i < keys.length - 1; i++) {
                        val = val[keys[i]];
                    }

                    return val;
                },
                onColumnClick: function(record, column) {
                    if (!column.linkToTab) {
                        return;
                    }

                    this.openTab(column.linkToTab, record[column.linkParams]);
                },
                newRecord: function(record) {

                    var tab = this.tabs[this.selectedTab];
                    // remove selected row if there is any
                    this.toggleRecordSelect(tab);

                    if (this.tabs[this.selectedTab].type === consts.tabTypes.TEAMS) {
                        // show in drawer form for a new team

                        if (!record) {
                            this.newEmptyRecord = {
                                Coach: {},
                                School: {},
                                Facility: {},
                                Championship: {},
                                Category: {},
                                AlternativeFacility: {},
                                Manager: {},
                                Sport: {},
                                Activity: [{}]
                            };
                        } else {
                            this.newEmptyRecord = record;
                        }
                    }
                }
            }
        });

        return TabsComponent;
    });