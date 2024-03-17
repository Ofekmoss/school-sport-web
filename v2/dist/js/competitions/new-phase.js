define(["templates/competitions"], function (templates) {


    var NewPhaseDialogComponent = Vue.extend({
        template: templates["new-phase"],
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
                    this.$emit("close", this.name );
                }
            },
            cancel: function () {
                this.$emit("close");
            }
        },
        mounted: function(){
            var comp = this;
            window.setTimeout(function() {
                $('#txtNewPhaseName').focus();
            }, 500);
        }
    });

    return NewPhaseDialogComponent;
});