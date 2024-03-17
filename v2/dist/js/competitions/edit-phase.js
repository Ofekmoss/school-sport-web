define(["templates/competitions"], function (templates) {


    var EditPhaseDialogComponent = Vue.extend({
        template: templates["edit-phase"],
        data: function() {
            return  {
                name: '',
                showDelete: true
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
            deletePhase: function() {
                this.$emit("close", { action: 'delete' });
            }
        },
        mounted: function(){
            var comp = this;
            window.setTimeout(function() {
                $('#txtPhaseName').focus();
            }, 500);
        }
    });

    return EditPhaseDialogComponent;
});