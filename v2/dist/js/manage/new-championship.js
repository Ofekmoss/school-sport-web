define(["templates/manage", "manage/dal"], function (templates, dal) {

    var NewChampionship = Vue.extend({
        template: templates["new-championship"],
        props: {
            record: Object
        },
        data: function () {
            return {
            };
        },
        watch: {},
        mounted: function () {
        },
        methods: {
            getByValue: function(array, key, value) {
                for (var i = 0; i < array.length; i++) {
                    if (array[i][key] == value) {
                        return array[i];
                    }
                }
            }
        }
    });

    Vue.component('new-championship', NewChampionship);

});