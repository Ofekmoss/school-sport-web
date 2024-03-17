define(["templates/manage", "manage/dal", "utils", "consts", "dialog", "services/access", 'components/doughnut-chart', 'components/bar-chart'],
    function (templates, dal, utils, consts, Dialog, Access) {

        function sameDay(d1, d2) {
            return d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();
        }

        function ApplyPieData(comp, res) {
            if (res.TeamsByGender != null) {
                comp.teamsData.datasets[0].data[0] = res.TeamsByGender.Boys;
                comp.teamsData.datasets[0].data[1] = res.TeamsByGender.Girls;
                comp.teamsData.datasets[0].data[2] = res.TeamsByGender.Unknown;
                comp.teamsData.datasets[0].data = comp.teamsData.datasets[0].data.slice();
                comp.teamsData = Object.assign({}, comp.teamsData);
            }

            if (res.PlayersByGender != null) {
                comp.playersData.datasets[0].data[0] = res.PlayersByGender.Boys;
                comp.playersData.datasets[0].data[1] = res.PlayersByGender.Girls;
                comp.playersData.datasets[0].data[2] = res.PlayersByGender.Unknown;
                comp.playersData.datasets[0].data = comp.playersData.datasets[0].data.slice();
                comp.playersData = Object.assign({}, comp.playersData);
            }

            if (res.Pele != null) {
                comp.peleData.datasets[0].data[0] = res.Pele.PlayersByGender.Boys;
                comp.peleData.datasets[0].data[1] = res.Pele.PlayersByGender.Girls;
                comp.peleData.datasets[0].data[2] = res.Pele.PlayersByGender.Unknown;
                comp.peleData.datasets[0].data = comp.peleData.datasets[0].data.slice();
                comp.peleData = Object.assign({}, comp.peleData);
                comp.pelePercent = res.Pele.Percentage.toFixed(2);
            }
        }

        var Dassboard = Vue.extend({
            template: templates["dashboard"],
            data: function () {
                return {
                    tabName: "לוח בקרה",
                    permanent: true,
                    dataLoading: false,
                    caption: "לוח בקרה",
                    image: 'img/dashboard.svg',
                    sports: [],
                    sport: null,
                    originalSports: [],
                    categories: [],
                    category: null,
                    regions: [],
                    region: null,
                    originalRegion: null,
                    seasons: [],
                    season: null,
                    championships: [],
                    type: null,
                    loggedUser: null,
                    dashboardLatestData: null,
                    lastSportTotalFilter: null,
                    footerData: {},
                    contentSiteUrl: '',
                    calendarDayCaption: '',
                    types: consts.sportTypes,
                    championship: null,
                    date: new Date(),
                    allEvents: [],
                    events: [],
                    totals: {},
                    pelePercent: 0,
                    paymentsData: {
                        plain: true,
                        labels: ['תשלומים'],
                        datasets: [{
                            label: 'שולם',
                            backgroundColor: ["#2ECC40"],
                            data:[]
                        },
                            {
                                label: 'לא שולם',
                                backgroundColor: ["#FF4136"],
                                data:[]
                            }]
                    },
                    teamsData: {
                        labels: ['ספורטאים', 'ספורטאיות', 'מעורבות'],
                        datasets: [{
                            label: 'קבוצות',
                            backgroundColor: ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"],
                            data:[]
                        }]
                    },
                    playersData: {
                        legendBoxWidth: 35,
                        labels: ['ספורטאים', ' ספורטאיות', 'מגדר לא ידוע'],
                        datasets: [{
                            label: 'שחקנים',
                            backgroundColor: ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"],
                            data:[]
                        }]
                    },
                    peleData: {
                        labels: ['ספורטאים', ' ספורטאיות', 'מגדר לא ידוע'],
                        datasets: [{
                            label: 'שחקנים',
                            backgroundColor: ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"],
                            data:[]
                        }]
                    },
                    sportsTotals: {
                        labels: [],
                        datasets: [{
                            label: 'מאושרות',
                            backgroundColor: ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA",
                                "#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA",
                                "#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"],
                            data:[]
                        },
                        {
                            label: 'רשומות',
                            backgroundColor: ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA",
                                "#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA",
                                "#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#7FDBFF", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#85144b", "#F012BE", "#3D9970", "#111111", "#AAAAAA"],
                            data:[]
                        }],
                        singleSportDataSet: {
                            label: 'ניסוי',
                            backgroundColor: ["#0074D9"],
                            data:[0]
                        }
                    },
                    totalDataColumns: {
                        Data: [
                            {
                                Type: null,
                                Columns: [
                                    {
                                        Items: [
                                            {
                                                default: true,
                                                caption: 'קבוצות',
                                                totalsField: 'Teams',
                                                backgroundColor: '#B10DC9',
                                                click: 'getAppliedTeamsBySport'
                                            },
                                            {
                                                caption: 'שחקנים מאושרים',
                                                totalsField: 'Players',
                                                backgroundColor: '#7FDBFF',
                                                click: 'getAppliedPlayersBySport'
                                            },
                                            {
                                                caption: 'קטגוריות אליפות',
                                                totalsField: 'Championships',
                                                backgroundColor: '#FF851B',
                                                click: 'getChampionshipsBySport'
                                            }
                                        ]
                                    },
                                    {
                                        Items: [
                                            {
                                                caption: 'בתי ספר',
                                                totalsField: 'Schools',
                                                backgroundColor: '#2ECC40',
                                                click: 'getAppliedTeamsBySchool'
                                            },
                                            {
                                                caption: 'רשויות',
                                                totalsField: 'Cities',
                                                backgroundColor: '#FF4136',
                                                click: 'getAppliedTeamsByCities'
                                            },
                                            {
                                                caption: 'משחקים',
                                                totalsField: 'Matches',
                                                backgroundColor: '#0074D9',
                                                click: 'getMatchesBySport'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                Type: 13, //PELE
                                Columns: [
                                    {
                                        Items: [
                                            {
                                                default: false,
                                                caption: 'רשויות שהגישו',
                                                totalsField: 'Cities',
                                                backgroundColor: '#A5A5A5',
                                                click: 'getTeamsByCity'
                                            },
                                            {
                                                caption: 'מחוזות שהגישו',
                                                totalsField: 'Regions',
                                                backgroundColor: '#ED7D31',
                                                click: 'getTeamsByRegion'
                                            },
                                            {
                                                caption: 'קבוצות שהוגשו',
                                                totalsField: 'Teams',
                                                backgroundColor: '#5B9BD5',
                                                click: 'getPeleAppliedTeamsBySport'
                                            },
                                            {
                                                caption: 'ספורטאים/ות',
                                                totalsField: 'Players',
                                                backgroundColor: '#ED7D31',
                                                click: 'getApprovedPlayersBySport'
                                            }
                                        ]
                                    },
                                    {
                                        Items: [
                                            {
                                                default: false,
                                                caption: 'רשויות עם קבוצות מאושרות',
                                                totalsField: 'ApprovedCitiesCount',
                                                backgroundColor: '#A5A5A5',
                                                click: 'getCitiesWithApprovedTeams'
                                            },
                                            {
                                                caption: 'מחוזות עם קבוצות מאושרות',
                                                totalsField: 'ApprovedRegionsCount',
                                                backgroundColor: '#ED7D31',
                                                click: 'getRegionsWithApprovedTeams'
                                            },
                                            {
                                                caption: 'קבוצות שאושרו',
                                                totalsField: 'ApprovedTeams',
                                                backgroundColor: '#FFC000',
                                                click: 'getPeleApprovedTeamsBySport'
                                            },
                                            {
                                                caption: 'ספורטאים/ות פל"א',
                                                totalsField: 'PelePlayers',
                                                backgroundColor: '#70AD47',
                                                click: 'getPelePlayersBySport'
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                Type: 15, //Sport Equality
                                Columns: [
                                    {
                                        Items: [
                                            {
                                                default: false,
                                                caption: 'רשויות עם קבוצות',
                                                totalsField: 'Cities',
                                                backgroundColor: '#ff4136',
                                                click: 'getTeamsByCity'
                                            },
                                            {
                                                caption: 'מחוזות עם קבוצות',
                                                totalsField: 'Regions',
                                                backgroundColor: '#2ecc40',
                                                click: 'getTeamsByRegion'
                                            }
                                        ]
                                    },
                                    {
                                        Items: [
                                            {
                                                caption: 'קבוצות שהוגשו',
                                                totalsField: 'Teams',
                                                backgroundColor: '#b10dc9',
                                                click: 'getPeleAppliedTeamsBySport'
                                            },
                                            {
                                                caption: 'ספורטאים/ות',
                                                totalsField: 'Players',
                                                backgroundColor: '#7fdbff',
                                                click: 'getApprovedPlayersBySport'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ],
                        ActiveColumns: []
                    },
                    sportsTotalsCaption: 'הרשמת קבוצות לפי ענף',
                    activePeleFunction: null
                };
            },
            props: {
            },
            computed: {
                highlightedDates: function() {
                    var dates = [];
                    if (this.allEvents && this.allEvents.length > 0) {
                        var firstEvent = this.allEvents[0].date;
                        var year = firstEvent.getFullYear();
                        var month = firstEvent.getMonth();
                        dates = utils.distinctArray(this.allEvents.map(function(event) {
                            return event.date.getDate();
                        })).map(function(day) {
                            return new Date(year, month, day);
                        });
                    }
                    return {
                        dates: dates
                    };
                }
            },
            mounted: function () {
                var comp = this;
                comp.reloadSports();
                Access.get(function (err, user) {
                    comp.loggedUser = user;
                    //console.log(user);
                    dal.getSeasons().then(function (seasons) {
                        comp.seasons = seasons;
                        Vue.http.get('/api/v2/cache?key=season').then(function (resp) {
                            var cachedSeason = resp.body.Value;
                            if (cachedSeason != null) {
                                comp.season = cachedSeason;
                            } else if (user.season) {
                                comp.season = user.season;
                            }
                            dal.getRegions().then(function (res) {
                                comp.regions = res;
                                var userRegion = null;
                                if (user) {
                                    userRegion = user.coordinatedRegionId || user.region;
                                    if (userRegion === 0)
                                        userRegion = null;
                                }
                                comp.region = userRegion;
                                comp.originalRegion = comp.region;
                                comp.reloadCategories();
                                dal.getGeneralData().then(function(generalData) {
                                    comp.contentSiteUrl = generalData.ContentSiteUrl || '/';
                                    dal.getChampionships().then(function(res){
                                        comp.championships = res;
                                        Vue.http.get('/api/v2/cache?key=dashboard-type').then(function (resp) {
                                            var cachedType = resp.body.Value;
                                            if (cachedType != null) {
                                                comp.type = cachedType;
                                            }
                                            comp.getData();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            },
            methods: {
                filterEvents: function(e, changeValue){
                    var comp = this;
                    if (typeof changeValue === 'undefined')
                        changeValue = true;
                    var selectedDate = e || new Date();
                    if (changeValue) {
                        this.date = selectedDate;
                    }
                    var params = {
                        year: selectedDate.getFullYear(),
                        month: selectedDate.getMonth() + 1,
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                    };

                    if (sameDay(new Date(), selectedDate)) {
                        comp.calendarDayCaption = 'היום';
                    } else {
                        var isoDate = selectedDate.toISOString().slice(0,10);
                        var parts = isoDate.split('-');
                        var formatted = [parts[2], parts[1], parts[0]].join('/');
                        comp.calendarDayCaption = 'בתאריך ' + formatted;
                    }

                    dal.getEvents(params).then(function(res) {
                        comp.allEvents = res.map(function (event) {
                            event.date = new Date(event.description);
                            event.scoreLink = comp.contentSiteUrl + 'scores?season=' + comp.season +
                                '&sport=' + event.sportId +
                                '&championship=' + event.championshipId +
                                '&category=' + event.categoryId +
                                '&selectedDate=' + utils.formatDate(event.date, 'yyyy-mm-dd');
                            return event;
                        });
                        comp.events = comp.allEvents.filter(function (event) {
                            return event.date.getDate() == comp.date.getDate();
                        });
                        //merge same category games
                        var categoryMapping = {};
                        comp.events.forEach(function (event) {
                            var key = event.categoryId.toString();
                            if (categoryMapping[key]) {
                                categoryMapping[key]++;
                                event.toRemove = true;
                            } else {
                                categoryMapping[key] = 1;
                            }
                        });
                        comp.events = comp.events.filter(function (event) {
                            return !event.toRemove;
                        });
                        comp.events.forEach(function (event) {
                            var games = categoryMapping[event.categoryId.toString()];
                            if (games && games > 1)
                                event.title += ' (' + games + ' משחקים)';

                        });
                        //console.log(comp.allEvents);
                    });
                },
                reloadSports: function() {
                    var comp = this;
                    dal.getSports(comp.region).then(function(res){
                        comp.sports = res;
                        comp.originalSports = [];
                        comp.sports.forEach(function(sport) {
                            comp.originalSports.push(sport);
                        });
                    });
                },
                reloadCategories: function() {
                    var comp = this;
                    dal.getCategoryNames(this.region, this.sport, this.season).then(function(res){
                        comp.categories = res;
                    });
                },
                refresh: function(filterName){
                    var comp = this;
                    if (typeof  filterName !== 'undefined') {
                        if (filterName === 'type') {
                            this.sportsTotalsCaption = 'הרשמת קבוצות לפי ענף';
                            this.activePeleFunction = null;
                            Vue.http.post('/api/v2/cache', {
                                key: 'dashboard-type',
                                value: comp.type
                            });
                            if (comp.type != 3)
                                comp.region = comp.originalRegion;
                        } else if (filterName === 'season' || filterName === 'region' || filterName === 'sport' || filterName === 'category') {
                            if (this.activePeleFunction != null) {
                                this.activePeleFunction();
                            }
                            if (filterName !== 'category')
                                comp.reloadCategories();
                            if (filterName === 'season') {
                                Vue.http.post('/api/v2/cache', {
                                    key: 'season',
                                    value: comp.season
                                });
                            }
                        }
                    }
                    this.getData();
                },
                getData: function() {
                    var comp = this;
                    if (comp.type === 3 || comp.type === 5) {
                        comp.originalRegion = comp.region;
                        comp.region = 0;
                    }
                    var params = {
                        region: comp.region,
                        sport: comp.sport,
                        category: comp.category,
                        championship: comp.championship,
                        type: comp.type,
                        season: comp.season
                    };
                    comp.dataLoading = true;
                    comp.filterEvents();

                    dal.getDashboardData(params).then(function(res) {
                        if (comp.type != 1 && res.Total) {
                            res.Total.Teams += res.Total.RegistrationTeams || 0;
                            res.Total.Schools += res.Total.RegistrationSchools || 0;
                            res.Total.Cities += res.Total.RegistrationCities || 0;
                        }
                        if (res.TeamsBySportFields) {
                            res.TeamsBySportFields.forEach(function(teamsBySportField) {
                                if (teamsBySportField.TeamsByStatus) {
                                    teamsBySportField.TeamsByStatus.Registered += teamsBySportField.TeamsByStatus.New || 0;
                                }
                            });
                        }
                        if (res.TeamsBySchools) {
                            res.TeamsBySchools.forEach(function(teamsBySchool) {
                                if (teamsBySchool.TeamsByStatus) {
                                    teamsBySchool.TeamsByStatus.Registered += teamsBySchool.TeamsByStatus.New || 0;
                                }
                            });
                        }
                        if (res.TeamsByCities) {
                            res.TeamsByCities.forEach(function(teamsByCity) {
                                if (teamsByCity.TeamsByStatus) {
                                    teamsByCity.TeamsByStatus.Registered += teamsByCity.TeamsByStatus.New || 0;
                                }
                            });
                        }
                        comp.dashboardLatestData = res;
                        if (comp.type >= 10 && comp.dashboardLatestData != null && comp.dashboardLatestData.SportFields) {
                            comp.sports = comp.dashboardLatestData.SportFields.map(function(sportField) {
                                return {
                                    id: sportField.Id,
                                    name: sportField.Name
                                }
                            });
                        } else {
                            // comp.sports = comp.originalSports;
                            if (comp.dashboardLatestData != null && comp.dashboardLatestData.NonEmptySportFields != null) {
                                comp.sports = comp.dashboardLatestData.NonEmptySportFields.map(function(sportField) {
                                    return {
                                        id: sportField.Id,
                                        name: sportField.Name
                                    }
                                });
                                comp.originalSports = [];
                                comp.sports.forEach(function (sport) {
                                    comp.originalSports.push(sport);
                                });
                            }
                        }
                        comp.footerData = res.FooterData || {};

                        if (res.Payments == null)
                            res.Payments = {};

                        //console.log(res.Payments);
                        comp.paymentsData.datasets[0].data[0] = res.Payments.PaidAmount;
                        comp.paymentsData.datasets[1].data[0] = res.Payments.TotalAmount - res.Payments.PaidAmount ;

                        comp.paymentsData.datasets[0].data = comp.paymentsData.datasets[0].data.slice();
                        comp.paymentsData.datasets[1].data = comp.paymentsData.datasets[1].data.slice();
                        comp.paymentsData = Object.assign({}, comp.paymentsData);

                        comp.teamsData.datasets[0].data[0] = res.TeamsByGender.Boys;
                        comp.teamsData.datasets[0].data[1] = res.TeamsByGender.Girls;
                        comp.teamsData.datasets[0].data[2] = res.TeamsByGender.Unknown;

                        comp.teamsData.datasets[0].data = comp.teamsData.datasets[0].data.slice();
                        comp.teamsData = Object.assign({}, comp.teamsData);

                        comp.playersData.datasets[0].data[0] = res.PlayersByGender.Boys;
                        comp.playersData.datasets[0].data[1] = res.PlayersByGender.Girls;
                        comp.playersData.datasets[0].data[2] = res.PlayersByGender.Unknown;

                        comp.playersData.datasets[0].data = comp.playersData.datasets[0].data.slice();
                        comp.playersData = Object.assign({}, comp.playersData);
                        //
                        if (res.Pele) {
                            comp.peleData.datasets[0].data[0] = res.Pele.PlayersByGender.Boys;
                            comp.peleData.datasets[0].data[1] = res.Pele.PlayersByGender.Girls;
                            comp.peleData.datasets[0].data[2] = res.Pele.PlayersByGender.Unknown;
                        }

                        comp.peleData.datasets[0].data = comp.peleData.datasets[0].data.slice();
                        comp.peleData = Object.assign({}, comp.peleData);
                        //
                        if (res.Pele) {
                            comp.pelePercent = res.Pele.Percentage.toFixed(2);
                        }

                        var t = {};
                        if (comp.type == 13 || comp.type == 15) {
                            t = Object.assign(res.Total, {
                                Regions: res.Pele.Total.Regions,
                                Players: res.Pele.Total.Players,
                                PelePlayers: res.Pele.Total.PelePlayers,
                                Cities: res.Pele.Total.Cities,
                                ApprovedTeams: res.Pele.Total.ApprovedTeams,
                            });
                        } else {
                            t = res.Total
                        }
                        comp.totals = t;

                        var activeColumns = comp.totalDataColumns.Data.find(function(x) {
                            return x.Type == comp.type;
                        });
                        if (activeColumns == null) {
                            activeColumns = comp.totalDataColumns.Data.find(function(x) {
                                return x.Type == null;
                            });
                        }
                        comp.totalDataColumns.ActiveColumns = activeColumns.Columns;
                        var defaultItem = null;
                        if (comp.lastSportTotalFilter == null) {
                            for (var i = 0; i < comp.totalDataColumns.ActiveColumns.length; i++) {
                                if (defaultItem != null)
                                    break;
                                for (var j = 0; j < comp.totalDataColumns.ActiveColumns[i].Items.length; j++) {
                                    var curItem = comp.totalDataColumns.ActiveColumns[i].Items[j];
                                    if (curItem.default) {
                                        defaultItem = curItem;
                                        break;
                                    }
                                }
                            }
                        }
                        if (defaultItem != null) {
                            window.setTimeout(function() {
                                comp.dataColumnItemClick(defaultItem);
                            }, 100);
                        } else if (comp.type == 13 || comp.type == 15) {
                            if (comp.activePeleFunction == null) {
                                comp.sportsTotalsCaption = 'קבוצות לפי ענף';
                                comp.sportsTotals.datasets[0].label = 'קבוצות שהוגשו';
                                comp.sportsTotals.datasets[0].data = (comp.dashboardLatestData.Pele.TeamsBySportFields || []).map(function (teamsBySportField) {
                                    return teamsBySportField.ApprovedTeams + teamsBySportField.NonApprovedTeams;
                                });
                                comp.sportsTotals.datasets[1].label = 'קבוצות שאושרו';
                                comp.sportsTotals.datasets[1].data = (comp.dashboardLatestData.Pele.TeamsBySportFields || []).map(function (teamsBySportField) {
                                    return teamsBySportField.ApprovedTeams;
                                });
                                comp.verifySportsTotalsColors();
                                comp.sportsTotals.labels = (comp.dashboardLatestData.Pele.TeamsBySportFields || []).map(function (teamsBySportField) {
                                    return teamsBySportField.Name;
                                });
                                comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                            }
                        }

                        comp.dataLoading = false;

                        if (!res.TeamsBySportFields && comp.sportsTotals.datasets[0].data.length > 0) {
                            return;
                        }

                        if (comp.lastSportTotalFilter != null) {
                            comp.lastSportTotalFilter();
                        }
                    });
                },
                verifySportsTotalsColors: function() {
                    var comp = this;
                    for (var datasetIndex = 0; datasetIndex < 2; datasetIndex++) {
                        var dataSet = comp.sportsTotals.datasets[datasetIndex];
                        if (dataSet.data != null) {
                            if (dataSet.data.length > dataSet.backgroundColor.length) {
                                var originalArray = [];
                                for (var colorIndex = 0; colorIndex < dataSet.backgroundColor.length; colorIndex++) {
                                    originalArray.push(dataSet.backgroundColor[colorIndex]);
                                }
                                while (dataSet.data.length > dataSet.backgroundColor.length) {
                                    originalArray.forEach(function (color) {
                                        dataSet.backgroundColor.push(color);
                                    });
                                }
                            }
                        }
                    }
                },
                dataColumnItemClick: function(dataColumnItem) {
                    var comp = this;
                    if (dataColumnItem.click) {
                        comp[dataColumnItem.click]();
                    }
                },
                getViewParameters: function() {
                    var comp = this;
                    var parameters = {
                        competitionType: ''
                    };
                    if (comp.type != 3 && comp.region != null) {
                        parameters.region = comp.region;
                    }
                    if (comp.sport != null) {
                        parameters.sport = comp.sport;
                    }
                    switch (comp.type) {
                        case 1:
                            parameters.competitionType = 1;
                            break;
                        case 2:
                        case 3:
                            parameters.competitionType = 2;
                            break;
                    }
                    return parameters;
                },
                updateParameters: function(parameters, updates, fieldValue) {
                    var clonedParameters = {};
                    for (var fieldName in parameters) {
                        if (parameters.hasOwnProperty(fieldName)) {
                            clonedParameters[fieldName] = parameters[fieldName];
                        }
                    }
                    if (typeof updates !== 'undefined' && updates != null) {
                        if (typeof updates === 'string') {
                            if (typeof fieldValue !== 'undefined') {
                                clonedParameters[updates] = fieldValue;
                            }
                        } else {
                            for (var fieldName in updates) {
                                if (updates.hasOwnProperty(fieldName)) {
                                    clonedParameters[fieldName] = updates[fieldName];
                                }
                            }
                        }
                    }
                    return clonedParameters;
                },
                prepareBarChart: function() {
                    var comp = this;
                    comp.sportsTotals.datasets.splice(2);
                    comp.verifySportsTotalsColors();
                    if (comp.sportsTotals.labels.length <= 3) {
                        comp.sportsTotals.datasets.push(comp.sportsTotals.singleSportDataSet);
                    }
                    comp.sportsTotals.views = null;
                },
                getDataCounts: function(index) {
                    var comp = this;
                    var dataCounts = ' (' + comp.sportsTotals.datasets[0].data[index] + ')';
                    if (comp.sportsTotals.datasets[1].data != null) {
                        dataCounts += ' (' + comp.sportsTotals.datasets[1].data[index] + ')';
                    }
                    return dataCounts;
                },
                applySportData: function(caption, entityName, viewLink, viewUpdateField, firstLabel, secondLabel) {
                    var comp = this;
                    if (comp.dashboardLatestData != null) {
                        var nameField = '';
                        var sportFieldsData = null;
                        if (comp.sport != null) {
                            caption += ' לפי כיתות';
                            sportFieldsData = comp.dashboardLatestData[entityName + 'ByCategories'];
                            nameField = 'CategoryName';
                            sportFieldsData.forEach(function(sportField) {
                                sportField.SportId = comp.sport;
                            });
                        } else {
                            caption += ' לפי ענף';
                            sportFieldsData = comp.dashboardLatestData[entityName + 'BySportFields'];
                            nameField = 'SportName';
                        }
                        var dataPropertyName = secondLabel == null ? entityName + 'Count' : entityName + 'ByStatus';
                        comp.sportsTotalsCaption = caption;
                        comp.sportsTotals.datasets[0].label = firstLabel;
                        comp.sportsTotals.datasets[0].data = (sportFieldsData || []).map(function (sport) {
                            return secondLabel == null ? sport[dataPropertyName] : sport[dataPropertyName].Confirmed;
                        });
                        if (secondLabel == null) {
                            comp.sportsTotals.datasets[1].data = null;
                        } else {
                            comp.sportsTotals.datasets[1].label = secondLabel;
                            comp.sportsTotals.datasets[1].data = (sportFieldsData || []).map(function (sport) {
                                return sport[dataPropertyName].Registered;
                            });
                        }
                        comp.sportsTotals.labels = (sportFieldsData || []).map(function (sport, index) {
                            return sport[nameField] + comp.getDataCounts(index);
                        });
                        comp.prepareBarChart();
                        if (viewLink) {
                            var viewParameters = comp.getViewParameters();
                            comp.sportsTotals.views = (sportFieldsData || []).map(function (sport) {
                                return {
                                    Link: viewLink,
                                    Parameters: comp.updateParameters(viewParameters, viewUpdateField, sport.SportId)
                                };
                            });
                        } else {
                            comp.sportsTotals.views = null;
                        }
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    }
                },
                getAppliedTeamsBySport: function() {
                    var comp = this;
                    comp.lastSportTotalFilter = comp.getAppliedTeamsBySport;
                    comp.applySportData('הרשמת קבוצות', 'Teams', 'admin/teams', 'sport', 'מאושרות', 'רשומות');
                },
                getAppliedTeamsBySchool: function() {
                    var comp = this;
                    comp.lastSportTotalFilter = comp.getAppliedTeamsBySchool;
                    if (comp.dashboardLatestData != null) {
                        comp.sportsTotalsCaption = 'הרשמת קבוצות לפי בית ספר';
                        comp.sportsTotals.datasets[0].label = 'מאושרות';
                        comp.sportsTotals.datasets[0].data = (comp.dashboardLatestData.TeamsBySchools || []).map(function (school) {
                            return school.TeamsByStatus.Confirmed;
                        });
                        comp.sportsTotals.datasets[1].label = 'רשומות';
                        comp.sportsTotals.datasets[1].data = (comp.dashboardLatestData.TeamsBySchools || []).map(function (school) {
                            return school.TeamsByStatus.Registered;
                        });
                        comp.sportsTotals.labels = (comp.dashboardLatestData.TeamsBySchools || []).map(function (school) {
                            return school.SchoolName;
                        });
                        comp.prepareBarChart();
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    }
                },
                getAppliedTeamsByCities: function() {
                    var comp = this;
                    comp.lastSportTotalFilter = comp.getAppliedTeamsByCities;
                    if (comp.dashboardLatestData != null) {
                        comp.sportsTotalsCaption = 'הרשמת קבוצות לפי רשות';
                        comp.sportsTotals.datasets[0].label = 'מאושרות';
                        comp.sportsTotals.datasets[0].data = (comp.dashboardLatestData.TeamsByCities || []).map(function (city) {
                            return city.TeamsByStatus.Confirmed;
                        });
                        comp.sportsTotals.datasets[1].label = 'רשומות';
                        comp.sportsTotals.datasets[1].data = (comp.dashboardLatestData.TeamsByCities || []).map(function (city) {
                            return city.TeamsByStatus.Registered;
                        });
                        comp.sportsTotals.labels = (comp.dashboardLatestData.TeamsByCities || []).map(function (city) {
                            return city.CityName;
                        });
                        comp.prepareBarChart();
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    }
                },
                getAppliedPlayersBySport: function() {
                    var comp = this;
                    comp.lastSportTotalFilter = comp.getAppliedPlayersBySport;
                    comp.applySportData('הרשמת שחקנים', 'Players', 'admin/players', 'sport', 'מאושרים', 'רשומים');
                },
                getChampionshipsBySport: function() {
                    var comp = this;
                    comp.lastSportTotalFilter = comp.getChampionshipsBySport;
                    comp.applySportData('קטגוריות אליפות', 'Championships', 'admin/championships', 'competitionSport', 'קטגוריות אליפות', null);
                },
                getMatchesBySport: function() {
                    var comp = this;
                    comp.lastSportTotalFilter = comp.getMatchesBySport;
                    comp.applySportData('משחקים', 'Matches', null, null, 'משחקים', null);
                },
                getPeleAppliedTeamsBySport: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'קבוצות שהוגשו לפי ענף';
                    comp.activePeleFunction = comp.getPeleAppliedTeamsBySport;
                    var params = {
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                        season: this.season
                    };

                    dal.getPeleAppliedTeamsBySport(params).then(function(res) {
                        comp.sportsTotals.datasets[0].data = res.Sports.map(function(d){ return d.TeamCount});
                        comp.sportsTotals.datasets[0].label = 'קבוצות';
                        comp.sportsTotals.datasets[1].data = null;

                        comp.sportsTotals.labels = res.Sports.map(function(d){ return d.Sport});
                        comp.sportsTotals.views = null;
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);

                        ApplyPieData(comp, res);
                    });
                },
                getPeleApprovedTeamsBySport: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'קבוצות שאושרו לפי ענף';
                    comp.activePeleFunction = comp.getPeleApprovedTeamsBySport;
                    var params = {
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                        season: this.season
                    };

                    dal.getPeleApprovedTeamsBySport(params).then(function(res) {
                        comp.sportsTotals.datasets[0].data = res.Sports.map(function(d){ return d.TeamCount});
                        comp.sportsTotals.datasets[0].label = 'קבוצות';
                        comp.sportsTotals.datasets[1].data = null;

                        comp.sportsTotals.labels = res.Sports.map(function(d){ return d.Sport});
                        comp.sportsTotals.views = null;
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);

                        ApplyPieData(comp, res);
                    });
                },
                getTeamsByRegion: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'קבוצות לפי מחוז';
                    comp.activePeleFunction = comp.getTeamsByRegion;
                    var params = {
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                        season: this.season
                    };

                    dal.getTeamsByRegion(params).then(function(res) {
                        comp.sportsTotals.datasets[0].data = res.map(function(d){ return d.TeamCount});
                        comp.sportsTotals.datasets[0].label = 'קבוצות';
                        comp.sportsTotals.datasets[1].data = null;

                        comp.sportsTotals.labels = res.map(function(d){ return d.Region});
                        comp.sportsTotals.views = null;
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    });
                },
                getTeamsByCity: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'קבוצות לפי רשות';
                    comp.activePeleFunction = comp.getTeamsByCity;
                    var params = {
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                        season: this.season
                    };

                    dal.getTeamsByCity(params).then(function(res) {
                        comp.sportsTotals.datasets[0].data = res.map(function(d){ return d.TeamCount});
                        comp.sportsTotals.datasets[0].label = 'קבוצות';
                        comp.sportsTotals.datasets[1].data = null;

                        comp.sportsTotals.labels = res.map(function(d){ return d.City});
                        comp.sportsTotals.views = null;
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    });
                },
                getCitiesWithApprovedTeams: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'רשויות שהגישו קבוצות מאושרות';
                    comp.activePeleFunction = comp.getCitiesWithApprovedTeams;
                    comp.sportsTotals.datasets[0].label = 'קבוצות שאושרו';
                    comp.sportsTotals.datasets[0].data = comp.dashboardLatestData.Pele.Total.ApprovedCities.map(function (d) {
                        return d.ApprovedTeams;
                    });
                    comp.sportsTotals.datasets[1].label = 'קבוצות שלא אושרו';
                    comp.sportsTotals.datasets[1].data = comp.dashboardLatestData.Pele.Total.ApprovedCities.map(function (d) {
                        return d.NonApprovedTeams;
                    });
                    comp.sportsTotals.labels = comp.dashboardLatestData.Pele.Total.ApprovedCities.map(function (d) {
                        return d.Name
                    });
                    comp.sportsTotals.views = null;
                    comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                },
                getRegionsWithApprovedTeams: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'מחוזות שהגישו קבוצות מאושרות';
                    comp.activePeleFunction = comp.getRegionsWithApprovedTeams;
                    comp.sportsTotals.datasets[0].label = 'קבוצות שאושרו';
                    comp.sportsTotals.datasets[0].data = comp.dashboardLatestData.Pele.Total.ApprovedRegions.map(function (d) {
                        return d.ApprovedTeams;
                    });
                    comp.sportsTotals.datasets[1].label = 'קבוצות שלא אושרו';
                    comp.sportsTotals.datasets[1].data = comp.dashboardLatestData.Pele.Total.ApprovedRegions.map(function (d) {
                        return d.NonApprovedTeams;
                    });
                    comp.sportsTotals.labels = comp.dashboardLatestData.Pele.Total.ApprovedRegions.map(function (d) {
                        return d.Name
                    });
                    comp.sportsTotals.views = null;
                    comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                },
                getApprovedPlayersBySport: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'ספורטאים לפי ענף';
                    comp.activePeleFunction = comp.getApprovedPlayersBySport;
                    var params = {
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                        season: this.season
                    };

                    dal.getApprovedPlayersBySport(params).then(function(res) {
                        comp.sportsTotals.datasets[0].data = res.map(function(d){ return d.PlayerCount});
                        comp.sportsTotals.datasets[0].label = 'ספורטאים/ות';
                        comp.sportsTotals.datasets[1].data = null;

                        comp.sportsTotals.labels = res.map(function(d){ return d.Sport});
                        comp.sportsTotals.views = null;
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    });
                },
                getPelePlayersBySport: function() {
                    var comp = this;
                    comp.sportsTotalsCaption = 'ספורטאי פל"א לפי ענף';
                    comp.activePeleFunction = comp.getPelePlayersBySport;
                    var params = {
                        region: this.region,
                        sport: this.sport,
                        championship: this.championship,
                        type: this.type,
                        season: this.season
                    };

                    dal.getPelePlayersBySport(params).then(function(res) {
                        comp.sportsTotals.datasets[0].data = res.map(function(d){ return d.PlayerCount});
                        comp.sportsTotals.datasets[0].label = 'ספורטאים';
                        comp.sportsTotals.datasets[1].data = null;

                        comp.sportsTotals.labels = res.map(function(d){ return d.Sport});
                        comp.sportsTotals.views = null;
                        comp.sportsTotals = Object.assign({}, comp.sportsTotals);
                    });
                },
                openUnconfirmedDialog: function(entityName, caption) {
                    var comp = this;
                    var token = null;
                    if (comp.dashboardLatestData != null && comp.dashboardLatestData.FooterData != null) {
                        token = comp.dashboardLatestData.FooterData.Token;
                    }
                    if (token == null) {
                        alert('נתוני לוח בקרה חסרים, נא לנסות שוב מאוחר יותר');
                        return;
                    }
                    var url = '/api/v2/manage/dashboard/unconfirmed-data?token=' + token + '&entity=' + entityName;
                    Dialog.open('generic/data-dialog', {
                        caption: caption,
                        dataUrl: url
                        //dataArray: [{ "עמודה ראשונה": "100", "עמודה שנייה": "ABC", "אחרונה": "שלום"},
                        //    { "עמודה ראשונה": "200", "עמודה שנייה": "ZET", "אחרונה": "עולם"}]
                    }, function () {
                    });
                }
            }
        });

        return Dassboard;
    });