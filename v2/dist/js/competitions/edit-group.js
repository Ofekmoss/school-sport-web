define(["templates/competitions"], function (templates) {


    var EditGroupDialogComponent = Vue.extend({
        template: templates["edit-group"],
        data: function() {
            return  {
                name: ''
            };
        },
        methods: {
            handleKeyDown: function (ev) {
                if (ev.keyCode === 13) {
                    this.confirm();
                }
            },
            confirm: function () {
                if (this.name.length > 0) {
                    this.$emit("close", this.name);
                }
            },
            cancel: function () {
                this.$emit("close");
            },
            deleteGroup: function() {
                this.$emit("close", { action: 'delete' });
            }
        },
        mounted: function(){
            var comp = this;
            window.setTimeout(function() {
                $('#txtGroupName').focus();
            }, 500);
        }
    });

    return EditGroupDialogComponent;
});