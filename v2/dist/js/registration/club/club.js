define(["templates/registration", "services/access", "registration/club/club-details", "registration/club/club-teams",
        "registration/club/club-payment", "registration/club/club-players", "utils"],
    function (templates, Access, RegistrationClubDetailsComponent, RegistrationClubTeamsComponent,
              RegistrationClubPaymentComponent, RegistrationClubPlayersComponent, utils) {

        function getStagePageNumber(stage) {
            return stage;
        }

        var RegistrationClubComponent = Vue.extend({
            template: templates.club,
            data: function () {
                return {
                    user: Access.user,
                    pages: [
                        RegistrationClubDetailsComponent,
                        RegistrationClubTeamsComponent,
                        RegistrationClubPaymentComponent,
                        RegistrationClubPlayersComponent
                    ],
                    page: null,
                    pageNumber: 1,
                    school: null,
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
                window.setTimeout(function() {
                    if (!comp.user.season) {
                        document.location.reload();
                    }
                }, 1000);
                Vue.http.get('/api/v2/seasons').then(function(resp) {
                    comp.seasons = resp.data;
                });
                Vue.http.get('/api/v2/login')
                    .then(
                        function (resp) {
                            comp.school = resp.data.school;
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
                Vue.http.get('/api/v2/registration/club')
                    .then(
                        function (resp) {
                            var stage = resp.data.stage;
                            //when missing details, force back to first step:
                            if (stage > 0) {
                                Vue.http.get('/api/v2/registration/club/details').then(function (resp) {
                                    var rawData = {};
                                    rawData.school = resp.data.school || {};
                                    rawData.principal = resp.data.principal || {};
                                    rawData.chairman = resp.data.chairman || {};
                                    rawData.coordinator = resp.data.coordinator || {};
                                    rawData.representative = resp.data.representative || {};
                                    rawData.association = resp.data.association || {};
                                    var missingDetails = !rawData.school.name ||
                                        !rawData.school.phoneNumber ||
                                        !rawData.school.email ||
                                        !rawData.school.address ||
                                        !rawData.principal.name ||
                                        !rawData.chairman.name ||
                                        !rawData.coordinator.name ||
                                        !rawData.representative.name ||
                                        !rawData.principal.phoneNumber ||
                                        !rawData.chairman.phoneNumber ||
                                        !rawData.coordinator.phoneNumber ||
                                        !rawData.representative.phoneNumber ||
                                        !rawData.principal.email ||
                                        !rawData.chairman.email ||
                                        !rawData.coordinator.email ||
                                        !rawData.representative.email;
                                    if (missingDetails) {
                                        stage = 0;
                                    }
                                    comp.pageNumber = getStagePageNumber(stage);
                                    comp.page = comp.pages[comp.pageNumber];
                                }, function (err) {
                                    console.log(err);
                                    comp.pageNumber = getStagePageNumber(stage);
                                    comp.page = comp.pages[comp.pageNumber];
                                });
                            } else {
                                comp.pageNumber = getStagePageNumber(stage);
                                comp.page = comp.pages[comp.pageNumber];
                            }
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
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
                    var comp = this;
                    if (comp.user && comp.user.season && comp.user.activeSeason) {
                        return comp.user.season !== comp.user.activeSeason;
                    }
                    return false;
                },
                goToPage: function (pageNumber) {
                    if (pageNumber <= this.pageNumber) {
                        this.page = this.pages[pageNumber];
                    }
                    var comp = this;
                    if (pageNumber === 4) {
                        //summary
                        var w = window.open('/api/v2/registration/club/summary/download/school-' + comp.school + '-summary.pdf');
                        w.onload = function(){
                            //w.print();
                        }
                    }
                },
                handleNext: function (stage) {
                    this.pageNumber = getStagePageNumber(stage);
                    this.page = this.pages[this.pageNumber];
                },
                logout: function() {
                    Access.logout();
                }
            }
        });

        return RegistrationClubComponent;
    });