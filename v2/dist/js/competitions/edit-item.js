define(["templates/competitions"], function (templates) {


    var EditItemDialogComponent = Vue.extend({
        template: templates["edit-item"],
        data: function() {
            return  {
                name: '',
                defaultName: null,
                showDelete: true,
                deleteCaption: "מחיקה",
                title: "עריכה",
                caption: "שם"
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
                else if (this.defaultName) {
                    this.$emit("close", {action: "default"});
                }
            },
            cancel: function () {
                this.$emit("close");
            },
            deleteItem: function() {
                this.$emit("close", { action: 'delete' });
            }
        },
        mounted: function(){
            var comp = this;
            window.setTimeout(function() {
                $('#txtName').focus();
            }, 500);
        }
    });

    return EditItemDialogComponent;
});