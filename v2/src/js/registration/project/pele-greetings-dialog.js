define(["templates/registration", "consts"], function (templates, consts) {

    var PeleGreetingsDialog = Vue.extend({
        template: templates["pele-greetings-dialog"],
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

    return PeleGreetingsDialog;
});