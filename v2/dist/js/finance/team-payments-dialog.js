define(["templates/finance"], function (templates) {

    var FinanceTeamPaymentDialogComponent = Vue.extend({
        template: templates["team-payments-dialog"],
        data: function () {
            return {
                payment: 0
            };
        },
        methods: {
            confirm: function () {
                this.$emit("close", parseFloat(this.payment));
            },
            cancel: function () {
                this.$emit("close");
            },

            isValid: function() {
                return !isNaN(this.payment);
            }
        }
    });

    return FinanceTeamPaymentDialogComponent;
});