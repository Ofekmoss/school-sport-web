define(["templates/general"], function (templates) {
    var PasswordValidationComponent = Vue.extend({
        template: templates["password-validation"],
        data: function () {
            return {
                caption: "",
                password: ""
            };
        },
        mounted: function () {
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                this.$emit("close", this.password);
            }
        }
    });

    return PasswordValidationComponent;
});