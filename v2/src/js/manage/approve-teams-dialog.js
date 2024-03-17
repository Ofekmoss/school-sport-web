define(["templates/manage"], function (templates) {
    var NewTabDialogComponent = Vue.extend({
        template: templates["approve-teams-dialog"],
        data: function () {
            return {
                teams: [],
                status: 0,
                alreadyInStatus: []
            };
        },
        mounted: function () {
            var comp = this;
            if (comp.status == null || comp.status === 0)
                comp.status = 2; //approved by default
            var mapping = {};
            comp.alreadyInStatus = [];
            comp.teams.forEach(function(team) {
                if (team.AdminStatus == comp.status) {
                    var key = (team.Id || team.TeamId).toString();
                    mapping[key] = true;
                    comp.alreadyInStatus.push(team);
                }
            });
            comp.teams = comp.teams.filter(function(t) {
                return mapping[(t.Id || t.TeamId).toString()] !== true;
            });
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            select: function() {
                this.$emit("close", true);
            },
            getTeamName: function(t) {
                return 'הקבוצה ' +  t.School.SCHOOL_NAME + ' ' +
                    t.Sport.Name + ' ' +
                    (t.Category.Name || '' ) + ' ' +
                    (t.TeamNumber || '');
            }
        }
    });

    return NewTabDialogComponent;
});