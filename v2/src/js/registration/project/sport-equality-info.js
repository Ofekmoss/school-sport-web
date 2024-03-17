define(["templates/registration", "services/access", "registration/project/sport-equality-details",
        "registration/project/sport-equality-teams", "registration/project/sport-equality-players"],
    function (templates, Access, RegistrationProjectSportEqualityDetailsComponent,
              RegistrationProjectSportEqualityTeamsComponent,
              RegistrationProjectSportEqualityPlayersComponent) {

        var RegistrationProjectSportEqualityComponent = Vue.extend({
            template: templates["sport-equality-info"],
            data: function () {
                return {
                    user: Access.user,
                    currentPage: null,
                    pages : [
                        RegistrationProjectSportEqualityDetailsComponent,
                        RegistrationProjectSportEqualityTeamsComponent,
                        RegistrationProjectSportEqualityPlayersComponent
                    ],
                    page: null,
                    stage: null,
                    seasons: null
                };
            },
            computed: {
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
                            Vue.http.get('/api/v2/registration/project/5').then(function(project){
                                comp.goToPage(project.data.status, true);
                                comp.stage = project.data.status;
                            });
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
                logout: function() {
                    Access.logout();
                },
                goToPage: function(page, blnForce) {
                    if (typeof blnForce === 'undefined')
                        blnForce = false;
                    if (!blnForce && page > this.stage) {
                        return;
                    }
                    this.currentPage = page;
                    this.page = this.pages[page];
                },
                handlePage: function (id) {
                    var comp = this;
                    var newPageIndex = this.currentPage + 1;
                    if (this.stage < newPageIndex) {
                        // set stage
                        Vue.http.put('/api/v2/registration/project/5', { id: id, status: newPageIndex}).then(function(){
                            comp.stage = newPageIndex;
                        });
                    }

                    this.currentPage = newPageIndex;
                    this.page = this.pages[this.currentPage];
                }
            },
            watch: {
            }
        });

        return RegistrationProjectSportEqualityComponent;
    });