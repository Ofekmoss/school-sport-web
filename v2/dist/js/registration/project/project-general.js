define(["templates/registration", "dialog", "components/selectex", "generic/data-table"], function (templates, Dialog) {
    var RegistrationProjectGeneralComponent = Vue.extend({
        template: templates["project-general"],
        props: ['project', 'school'],
        data: function () {
            return {
                item1: null,
                item2: null,
                item3: null,
                stage: null,
                schools: null,
                newSchool: null,
                selectedSchool: null,
                projectSchools: [],
                schoolColumns: [
                    {
                        key: 'symbol',
                        name: 'סמל בית ספר',
                        active: true
                    },
                    {
                        key: 'name',
                        name: 'שם בתי ספר',
                        active: true
                    },
                    {
                        key: 'teamCount',
                        name: 'כיתות',
                        active: true
                    },
                    {
                        key: 'studentCount',
                        name: 'תלמידים',
                        active: true
                    }
                ],
                updating: false
            };
        },
        mounted: function () {
            var comp = this;
            if (comp.project) {
                Vue.http.get('/api/v2/schools')
                    .then(
                        function (resp) {
                            comp.schools = resp.data;
                            Vue.http.get('/api/v2/registration/project/' + comp.project.id)
                                .then(
                                    function (resp) {
                                        comp.stage = resp.data.stage || 0;
                                        comp.item1 = resp.data.item1;
                                        comp.item2 = resp.data.item2;
                                        comp.item3 = resp.data.item3;
                                        if (resp.data.schools) {
                                            for (var i = 0; i < resp.data.schools.length; i++) {
                                                var school = resp.data.schools[i];
                                                comp.projectSchools.push(school);
                                                for (var n = 0; n < comp.schools.length; n++) {
                                                    if (comp.schools[n].id == school.id) {
                                                        comp.schools.splice(n, 1);
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    function (err) {
                                        console.log(err);
                                    }
                                );
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
            }
        },
        methods: {
            getSchoolHtml: function (school) {
                return "<small>" + school.symbol + "</small><span> " + school.name + " </span>";
            },
            updateItems: function () {
                if ((this.stage == 0 || (this.stage == 1 && this.schoos.length == 0)) &&
                    this.item1 != null && this.item1.length > 0 && this.item2 != null && this.item2.length > 0 &&
                    this.item3 != null && this.item3.length > 0) {
                    var comp = this;
                    var stage = comp.stage;
                    if (comp.stage == 0) {
                        stage = 1;
                    }
                    comp.updating = true;
                    Vue.http.put('/api/v2/registration/project/' + comp.project.id, {
                        item1: comp.item1,
                        item2: comp.item2,
                        item3: comp.item3,
                        stage: stage,
                    })
                        .then(
                            function (resp) {
                                comp.updating = false;
                                comp.stage = resp.data.stage;
                            },
                            function (err) {
                                comp.updating = false;
                                console.log(err);
                            }
                        );
                }
            },
            editItems: function () {
                if (this.stage == 1 && this.projectSchools.length == 0) {
                    this.stage = 0;
                }
            },
            addSchool: function () {
                if (this.newSchool) {
                    var comp = this;
                    comp.updating = true;
                    Vue.http.post('/api/v2/registration/project/' + comp.project.id + '/schools', {
                        school: this.newSchool.id
                    })
                        .then(
                            function (resp) {
                                comp.updating = false;
                                comp.projectSchools.push(comp.newSchool);
                                for (var n = 0; n < comp.schools.length; n++) {
                                    if (comp.schools[n].id == comp.newSchool.id) {
                                        comp.schools.splice(n, 1);
                                        break;
                                    }
                                }
                                comp.school = comp.newSchool;
                                comp.newSchool = null;
                                comp.$emit("update:school", comp.school);
                            },
                            function (err) {
                                comp.updating = false;
                                console.log(err);
                            }
                        );
                }
            },
            handleSelectionChange: function (school) {
                this.selectedSchool = school;
            },
            editSchool: function () {
                this.school = this.selectedSchool;
                this.$emit("update:school", this.school);
            }
        }
    });

    return RegistrationProjectGeneralComponent;
});