define(["templates/general"], function (templates) {
    var MessageBoxComponent = Vue.extend({
        template: templates["message-box"],
        data: function () {
            return {
                caption: "",
                message: "",
                alert: false,
                wide: false,
                confirmText: "אישור",
                cancelText: null
            };
        },
        mounted: function () {
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                this.$emit("close", true);
            }
        }
    });

    return MessageBoxComponent;
});