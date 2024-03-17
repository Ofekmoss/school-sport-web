define(["templates/registration"], function (templates) {

    var LeagueFirstConfirmationDialogComponent = Vue.extend({
        template: templates["league-first-confirmation-dialog"],
        data: function () {
            return {
                sportName: null,
                dates: null
            };
        },
        methods: {
            confirm: function () {
                this.$emit("close");
            }
        }
    });

    return LeagueFirstConfirmationDialogComponent;
});