define(["templates/manage", "manage/dal", "utils", "components/multiselect-search", "components/selectex"], function (templates, dal, utils) {

    var FiltersChampionships = Vue.extend({
        template: templates["filters-championships"],
        props: {
            initFilters: Object,
            upCount : 0
        },
        data: function () {
            return {
                regions: [],
                sports: [],
                changed: false,
                loaded: false,
                result: {
                    region: null,
                    sport: null
                },
            };
        },
        watch: {
        },
        mounted: function () {
            var comp = this;
            utils.promiseAll([dal.getRegions(), dal.getSports()]).then(function(results) {
                comp.regions = results[0];
                comp.sports = results[1];

                if (!comp.initFilters) {
                    return;
                }

                if (comp.initFilters.region) {
                    var r = utils.getById(comp.regions, comp.initFilters.region);
                    comp.result.region = r ? r : null;
                }

                if (comp.initFilters.sport) {
                    var c = utils.getById(comp.sports, comp.initFilters.sport);
                    comp.result.sport = c ? c : null;
                }

                comp.upCount++;
                comp.load();
            });
        },
        methods: {
            load: function() {

                this.result.description = "אליפויות";
                if (this.result.region) {
                    this.result.description += '-' + this.result.region.name;
                }

                if (this.result.sport) {
                    this.result.description += '-' + this.result.sport.name;
                }

                this.$emit('change', this.result);
            }
        }

    });

    Vue.component('filters-championships', FiltersChampionships);
});