define(["templates/general"], function (templates) {
    var ErrorMessageComponent = Vue.extend({
        template: templates["error-message"],
        data: function () {
            return {
                caption: "",
                message: ""
            };
        },
        mounted: function () {
        },
        methods: {
            close: function () {
                this.$emit("close");
            }
        }
    });

    return ErrorMessageComponent;
});