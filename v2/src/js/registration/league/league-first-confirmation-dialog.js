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
            getMonthRange: function() {
                var comp = this;
                if (comp.sportName == 'כדורסל')
                    return 'ספטמבר 2023 ועד ינואר 2024';
                if (comp.sportName.indexOf('כדורעף') >= 0 || comp.sportName.indexOf('כדוריד') >= 0)
                    return 'ספטמבר 2023 ועד מרץ 2024';
                return '';
            },
            confirm: function () {
                this.$emit("close");
            }
        }
    });

    return LeagueFirstConfirmationDialogComponent;
});