define(["templates/manage", "manage/dal"], function (templates, dal) {

    var NewPlayer = Vue.extend({
        template: templates["new-player"],
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

        }
    });

    Vue.component('new-player', NewPlayer);

});