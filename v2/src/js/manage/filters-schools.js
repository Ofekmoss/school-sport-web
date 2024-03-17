define(["templates/manage", "manage/dal", "utils", "components/multiselect-search", "components/selectex"], function (templates, dal, utils) {

    var FiltersSchools = Vue.extend({
        template: templates["filters-schools"],
        props: {
            initFilters: Object,
            upCount : 0
        },
        data: function () {
            return {
                regions: [],
                cities: [],
                result: {
                    region: null,
                    city: null
                },
            };
        },
        watch: {
        },
        mounted: function () {
            var comp = this;
            utils.promiseAll([dal.getRegions(), dal.getCities()]).then(function(results) {
                comp.regions = results[0].data;
                comp.cities = results[1].data;

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

                comp.upCount++;
                comp.load();
            });
        },
        methods: {
            load: function() {

                this.result.description = "בתי ספר";
                if (this.result.region) {
                    this.result.description += '-' + this.result.region.name;
                }

                if (this.result.city) {
                    this.result.description += '-' + this.result.city.name;
                }

                this.$emit('change', this.result);
            }
        }

    });

    Vue.component('filters-schools', FiltersSchools);
});