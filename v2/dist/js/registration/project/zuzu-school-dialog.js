define(["templates/registration", "utils", "dialog", "consts"], function (templates, utils, Dialog, consts) {
    var states = {
        notLoaded: 1,
        new: 2,
        edit: 3,
        import: 4,
        loading: 5
    };

    function getRegionSchools(region) {
        return Vue.http.get('/api/v2/schools?region=' + region);
    }

    function registerSchoolsToProject(schools) {
        var apiCalls = [];
        schools.forEach(function(school) {
            apiCalls.push(Vue.http.post('/api/v2/registration/project/1/schools', { school: school.id, city: school.city.id}));
        });
        return utils.promiseAll(apiCalls);
    }

    function updateSchool(school) {
        return Vue.http.put('/api/v2/registration/project/1/schools/'+ school.id, school);
    }

    function insertSchool(school) {
        return Vue.http.post('/api/v2/registration/project/1/schools', school);
    }

    var ZuzuSchoolDialogComponent = Vue.extend({
        template: templates["zuzu-school-dialog"],
        data: function() {
            return {
                symbol:'',
                name:'',
                fax:'',
                email:'',
                id:'',
                city:'',
                classes:'',
                address:'',
                phoneNumber :'',
                school: {},
                coordinator: {},
                principal: {},
                schemeDescription: '',
                scheme: '',
                state: states.notLoaded,
                states: states,
                availableSchools: [],
                filteredSchools: [],
                selectedSchools : [],
                search: "",
            };
        },
        mounted: function() {
            var comp = this;

            if (comp.state != states.edit) {

                getRegionSchools().then(function (resp) {
                    comp.availableSchools = resp.data;
                    comp.filteredSchools = resp.data;
                }, function (err) {
                    console.log(err);
                });
            } else {
                this.symbol = this.school.symbol;
                this.name = this.school.name;
                this.fax = this.school.details.fax;
                this.email = this.school.details.email;
                this.id = this.school.id;
                this.classes = '';
                this.address = this.school.details.address;
                this.phoneNumber = this.school.details.phoneNumber;
                this.coordinator = this.school.coordinator;
                this.principal = this.school.principal;
                this.scheme = this.school.scheme;
                this.schemeDescription = this.school.schemeDescription;
            }
        },
        watch: {
        },
        methods: {
            symbolValid: function() {
                return true;
            },
            searchButtonClicked: function(e) {
                e.preventDefault();
                var searchTerm = this.search;

                var comp = this;
                comp.filteredSchools = [];

                if (!searchTerm) {
                    comp.filteredSchools = comp.availableSchools;
                    return
                }

                comp.availableSchools.forEach(function (school) {
                    if (school.symbol.toString().indexOf(searchTerm) >= 0) {
                        comp.filteredSchools.push(school);
                    }
                });

                comp.filteredSchools = comp.filteredSchools.slice();
            },
            handleSelectionChange: function () {
                var comp = this;

                comp.selectedSchools = [];
                comp.availableSchools.forEach(function(sc) {
                    if (sc.selected) {
                        comp.selectedSchools.push(sc);
                    }
                });
                comp.selectedSchools = comp.selectedSchools.slice();
            },
            cancel: function() {
                this.$emit("close");
            },
            sendSelectedSchools: function() {
                var comp = this;
                if (comp.selectedSchools.length > 0) {

                    registerSchoolsToProject(comp.selectedSchools).then(function(res) {
                        comp.$emit("close", {
                            schools: comp.selectedSchools
                        });
                    }, function(err){
                        console.log(err)
                    });
                }
            },
            addButtonClicked: function(){
                this.state = states.new;
            },
            save: function() {
                var comp = this;
                var data = {
                    symbol: this.symbol,
                    id: this.id,
                    name: this.name,
                    fax: this.fax,
                    email: this.email,
                    classes: this.classes,
                    address:this.address,
                    phoneNumber : this.phoneNumber,
                    coordinator: this.coordinator,
                    principal: this.principal,
                    scheme: this.scheme,
                    schemeDescription: this.scheme == 2 ? this.schemeDescription : null
                };

                var func = data.id ? updateSchool : insertSchool;

                func(data).then(function(){
                    comp.$emit("close", data);
                });
            },
            validateForm: function() {
                return document.querySelectorAll('#dialog-form :invalid').length == 0;
            }
        }
    });

    return ZuzuSchoolDialogComponent;
});