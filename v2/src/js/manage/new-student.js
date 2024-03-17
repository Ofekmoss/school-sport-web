define(["templates/manage", "manage/dal"], function (templates, dal) {

    var NewStudent = Vue.extend({
        template: templates["new-student"],
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

    Vue.component('new-student', NewStudent);

});