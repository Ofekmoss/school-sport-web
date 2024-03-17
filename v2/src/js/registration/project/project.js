define(["templates/registration", "services/access", "registration/project/project-general", "registration/project/project-school-details", "registration/project/project-teams"],
    function (templates, Access, RegistrationProjectGeneralComponent, RegistrationProjectSchoolDetailsComponent, RegistrationProjectTeamsComponent) {

        var Projects = [
            {
                id: 1,
                name: "זוזו",
                link: "zuzu"
            },
            {
                id: 2,
                name: 'פכ"ל',
                link: "pcl"
            },
            {
                id: 3,
                name: 'פלא',
                link: "pele"
            }
        ];

        var RegistrationProjectComponent = Vue.extend({
            template: templates.project,
            data: function () {
                return {
                    user: Access.user,
                    project: null,
                    pages: [
                        RegistrationProjectGeneralComponent,
                        RegistrationProjectSchoolDetailsComponent,
                        RegistrationProjectTeamsComponent
                    ],
                    page: null,
                    pageNumber: 0,
                    school: null,
                    seasons: null
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
                for (var i = 0; i < Projects.length; i++) {
                    var project = Projects[i];
                    if (this[project.link]) {
                        this.project = project;
                        break;
                    }
                }

                if (this.project) {
                    comp.page = comp.pages[0];
                }
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
                goToPage: function (pageNumber) {
                    if (pageNumber > 0) {
                        if (!this.school) {
                            return;
                        }
                    }
                    if (pageNumber > 1) {
                        if (!this.school.stage) {
                            return;
                        }
                    }
                    this.pageNumber = pageNumber;
                    this.page = this.pages[pageNumber];
                },
                handlePage: function (pageNumber) {
                    this.pageNumber = pageNumber;
                    this.page = this.pages[this.pageNumber];
                },
                logout: function() {
                    Access.logout();
                }
            },
            watch: {
                school: {
                    handler: function () {
                        if (this.school) {
                            if (this.school.stage > 0) {
                                this.pageNumber = 2;
                            } else {
                                this.pageNumber = 1;
                            }
                        } else {
                            this.pageNumber = 0;
                        }
                        this.page = this.pages[this.pageNumber];
                    },
                    deep: true
                }
            }
        });

        return RegistrationProjectComponent;
    });