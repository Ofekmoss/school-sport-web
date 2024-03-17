define(["templates/competitions", "services/competitions"], function (templates, Competitions) {
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

    var NewGameDialogComponent = Vue.extend({
        template: templates["new-game"],
        data: function() {
            return  {
                teams: [],
                teamA: null,
                teamB: null,
                groupName: '',
                error: '',
                date: null
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
                /*
                var teams = [];
                for (var team in comp.teams) {
                    if (comp.teams.hasOwnProperty(team)) {
                        teams.push(comp.teams[team]);
                    }
                }
                var teamA = teams.find(function(t) {
                    return t.id === comp.teamA;
                });
                var teamB = teams.find(function(t) {
                    return t.id === comp.teamB;
                });
                if (teamA == null) {
                    comp.error = "קבוצה א' לא נמצאה";
                    return;
                }
                if (teamB == null) {
                    comp.error = "קבוצה ב' לא נמצאה";
                    return;
                }
                */
                var gameObject = {
                    teamA: comp.teamA,
                    teamB: comp.teamB,
                    time: comp.date ? Competitions.time(comp.date.getFullYear(), comp.date.getMonth() + 1, comp.date.getDate()) : null
                };
                this.$emit("close", gameObject );
            },
            cancel: function () {
                this.$emit("close");
            }
        },
        mounted: function(){
            var comp = this;
            comp.teamA = -1;
            comp.teamB = -1;
            revalidate(comp);
        }
    });

    return NewGameDialogComponent;
});