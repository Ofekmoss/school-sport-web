define(["templates/competitions"], function (templates) {
    function getError(comp) {
        var errMsg = '';
        if (comp.teamA === -1 || comp.teamB === -1) {
            errMsg = 'יש לבחור קבוצות';
            if (!comp.date)
                errMsg += ' ותאריך';
        } else {
            if (comp.teamA == comp.teamB) {
                errMsg = 'לא ניתן לבחור אותה קבוצה';
            } else if (!comp.date) {
                errMsg = 'יש לבחור תאריך';
            }
        }
        return errMsg;
    }

    function revalidate(comp) {
        comp.error = getError(comp);
    }

    var EditGameDialogComponent = Vue.extend({
        template: templates["edit-game"],
        data: function() {
            return  {
                teams: [],
                teamA: null,
                teamB: null,
                date: null,
                facility: null,
                groupName: '',
                error: ''
            };
        },
        methods: {
            teamChanged: function() {
                var comp = this;
                revalidate(comp);
            },
            dateChanged: function(newDate) {
                var comp = this;
                comp.date = newDate;
                revalidate(comp);
            },
            confirm: function () {
                var comp = this;
                var err = getError(comp);
                if (err.length > 0) {
                    comp.error = err;
                    return;
                }
                var gameObject = {
                    teamA: comp.teamA,
                    teamB: comp.teamB,
                    date: comp.date
                };
                this.$emit("close", gameObject );
            },
            cancel: function () {
                this.$emit("close");
            }
        },
        mounted: function(){
            var comp = this;
            if (comp.teamA == null)
                comp.teamA = -1;
            if (comp.teamB == null)
                comp.teamB = -1;
            revalidate(comp);
        }
    });

    return EditGameDialogComponent;
});