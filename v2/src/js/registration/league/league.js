define(["templates/registration", "services/access", "registration/league/league-details",
        "registration/league/league-teams", "registration/league/league-payment",
        "registration/league/league-players", "utils"],
    function (templates, Access, RegistrationLeagueDetailsComponent, RegistrationLeagueTeamsComponent,
              RegistrationLeaguePaymentComponent, RegistrationLeaguePlayersComponent, utils) {

        function getStagePageNumber(stage) {
            return stage;
        }

        function readTeam(teamId, callback) {
            Vue.http.get('/api/v2/registration/league/teams/'+ encodeURIComponent(teamId))
                .then(
                    function (resp) {
                        callback(null, resp.body);
                    },
                    function (err) {
                        console.log(err);
                        callback();
                    }
                );
        }

        function readStage(teamId, callback) {
            Vue.http.get('/api/v2/registration/league')
                .then(
                    function (resp) {
                        var stage = resp.data.stage;
                        if (stage > 0) {
                            readTeam(teamId, function (err, result) {
                                var stage = 1;
                                if (result.payment != null) {
                                    stage = 3;
                                }
                                else if (result.approved && (result.approved & 1) === 1) {
                                    stage = 2;
                                }
                                callback(null, stage);
                            });

                        }
                        else {
                            callback(null, stage);
                        }
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }

        var RegistrationLeagueComponent = Vue.extend({
            template: templates.league,
            data: function () { 
                return {
                    user: Access.user,
                    pages: [
                        RegistrationLeagueDetailsComponent,
                        RegistrationLeagueTeamsComponent,
                        RegistrationLeaguePaymentComponent,
                        RegistrationLeaguePlayersComponent
                    ],
                    teamId: null,
                    page: null,
                    pageNumber: 1,
                    disable: 900,
                    seasons: null,
                    seasonAuthorized: false
                };
            },
            computed: {
                "currentPage": function () {
                    return this.page == null ? -1 : this.pages.indexOf(this.page);
                }
            },
            mounted: function () {
                var comp = this;
                Vue.http.get('/api/v2/seasons').then(function(resp) {
                    comp.seasons = resp.data;
                });
                Vue.http.get('/api/v2/login')
                    .then(
                        function (resp) {
                            comp.username = resp.data.name;
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
                utils.checkSeasonAuthorization(comp.user, function(err, authorized) {
                    if (authorized == true) {
                        comp.seasonAuthorized = true;
                    }
                });
                readStage(this.team, function (err, result) {
                    comp.pageNumber = getStagePageNumber(result);
                    comp.page = comp.pages[comp.pageNumber];
                });
            },
            methods: {
                getSeason: function() {
                    var comp = this;
                    if (comp.user && comp.user.season && comp.seasons) {
                        var matchingSeason = comp.seasons.find(function(season) {
                            return season.id === comp.user.season;
                        });
                        if (matchingSeason != null) {
                            return matchingSeason.name;
                        }
                    }
                    return '';
                },
                inactiveSeason: function () {
                    return utils.inactiveSeason(this);
                },
                goToPage: function (pageNumber) {
                    if (pageNumber <= this.pageNumber && this.disable > pageNumber) {
                        this.page = this.pages[pageNumber];
                    }
                },
                handleNext: function (stage) {
                    this.pageNumber = getStagePageNumber(stage);
                    this.page = this.pages[this.pageNumber];
                },
                logout: function() {
                    Access.logout();
                },
                disableNext: function(stage) {
                    this.disable = stage;
                }
            }
        });

        return RegistrationLeagueComponent;
    });