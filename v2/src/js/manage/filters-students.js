define(["templates/manage", "manage/dal", "utils", "components/multiselect-search", "components/selectex"], function (templates, dal, utils) {

    var FiltersStudents = Vue.extend({
        template: templates["filters-students"],
        props: {
            initFilters: Object,
            upCount : 0
        },
        data: function () {
            return {
                regions: [],
                cities: [],
                schools: [],
                grades: [],
                genders: [{id: 0, name: 'לא ידוע'}, {id: 1, name: 'בן'}, {id: 2, name: 'בת'}],
                categories: [],
                result: {
                    region: null,
                    city: null,
                    school: null,
                    grade: null,
                    gender: null
                }
            };
        },
        watch: {
        },
        mounted: function () {
            var comp = this;
            comp.grades = dal.getGrades();
            utils.promiseAll([dal.getRegions(), dal.getCities(), dal.getSchools()]).then(function(results) {
                comp.regions = results[0].data;
                comp.cities = results[1].data;
                comp.schools = results[2];

                if (!comp.initFilters) {
                    return;
                }

                if (comp.initFilters.region) {
                    var r = utils.getById(comp.regions, comp.initFilters.region);
                    comp.result.region = r ? r : null;
                }

                if (comp.initFilters.city) {
                    var c = utils.getById(comp.cities, comp.initFilters.city);
                    comp.result.city = c ? c : null;
                }

                if (comp.initFilters.school) {
                    var sc = utils.getById(comp.schools, comp.initFilters.school);
                    comp.result.school = sc ? sc : {};
                }

                if (comp.initFilters.gender) {
                    var g = utils.getById(comp.genders, comp.initFilters.gender);
                    comp.result.gender = g ? g : {};
                }

                if (comp.initFilters.grade) {
                    var gr = utils.getById(comp.grades, comp.initFilters.grade);
                    comp.result.grade = gr ? gr : {};
                }


                comp.upCount++;
                comp.load();
            });
        },
        methods: {
            load: function() {
                this.result.description = 'תלמידים';
                if (this.result.region) {
                    this.result.description += '-' + this.result.region.name;
                }

                if (this.result.city) {
                    this.result.description += '-' +  this.result.city.name;
                }

                if (this.result.school) {
                    this.result.description += '-' +  this.result.school.name;
                }

                if (this.result.grade) {
                    this.result.description += '-' + this.result.grade.name;
                }

                if (this.result.gender) {
                    this.result.description += '-' +  this.result.gender.name;
                }

                this.$emit('change', this.result);
            }
        },
        watch: {
            'result.school': function(curr) {
                if (curr !== null) {
                    return;
                    var comp = this;
                    comp.grades = dal.getGrades();
                } else {
                    this.grades = [];
                }
            }
        }

    });

    Vue.component('filters-students', FiltersStudents);
});