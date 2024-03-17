define(["templates/registration", "consts"], function (templates, consts) {

    var SportEqualityGreetingsDialog = Vue.extend({
        template: templates["sport-equality-greetings-dialog"],
        data: function() {
        },
        methods: {
            confirm: function () {
                this.$emit("close");
            }
        },
        mounted: function(){
        }
    });

    return SportEqualityGreetingsDialog;
});