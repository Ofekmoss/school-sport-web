define(["templates/registration", "services/access", "registration/project/zuzu-details", "registration/project/zuzu-schools", "registration/project/zuzu-classes"],
    function (templates, Access, RegistrationProjectZuzuDetailsComponent, RegistrationProjectZuzuSchoolsComponent, RegistrationProjectZuzuClassesComponent) {

        var RegistrationProjectZuzuComponent = Vue.extend({
            template: templates["zuzu-info"],
            data: function () {
                return {
                    user: Access.user,
                    currentPage: 0,
                    pages : [
                        RegistrationProjectZuzuDetailsComponent,
                        RegistrationProjectZuzuSchoolsComponent,
                        RegistrationProjectZuzuClassesComponent
                    ],
                    page: null,
                    stage: null
                };
            },
            computed: {
            },
            mounted: function () {
                var comp = this;
                Vue.http.get('/api/v2/login')
                    .then(
                        function (resp) {

                            comp.username = resp.data.name;
                            Vue.http.get('/api/v2/registration/project/1').then(function(project){
                                comp.stage = project.data.status;
                                comp.goToPage(project.data.status);
                            });
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
            },
            methods: {
                logout: function() {
                    Access.logout();
                },
                goToPage: function(page) {
                    if (page > this.stage) {
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
                        Vue.http.put('/api/v2/registration/project/1', { id: id, status: newPageIndex}).then(function(){
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

        return RegistrationProjectZuzuComponent;
    });