define(["templates/registration"], function (templates) {
    var LeagueTeamDialogComponent = Vue.extend({
        template: templates["league-team-dialog"],
        data: function () {
            return {
                team: null,
                newTeam: false,
                facilities: [],
                sports: [],
                sportIndex: null,
                categoryIndex: null,
                hours: []
            };
        },
        watch: {
            sportIndex: function () {
                this.team.sport = this.sportIndex == null ? null : this.sports[this.sportIndex];
                var categoryIndex = null;
                if (this.team.sport && this.team.category) {
                    for (var i = 0; i < this.team.sport.categories.length; i++) {
                        var c = this.team.sport.categories[i];
                        if (c.category === this.team.category.category) {
                            categoryIndex = i;
                            break;
                        }
                    }
                }
                this.categoryIndex = categoryIndex;
            },
            categoryIndex: function () {
                this.team.category = this.team.sport == null || this.categoryIndex == null ? null :
                    this.team.sport.categories[this.categoryIndex];
            }
        },
        computed: {
            endHours: function () {
                if (this.team) {
                    if (this.team.activity.startTime) {
                        var n = 0;
                        while (n < this.hours.length && this.hours[n].value <= this.team.activity.startTime) {
                            n++;
                        }
                        return this.hours.slice(n);
                    }
                    return this.hours;
                }
                return [];
            }
        },
        mounted: function () {
            var comp = this;
            if (comp.team == null) {
                comp.newTeam = true;
                comp.team = { coachHelper: {}, manager: {}, teacher: {}, coach: {}, activity: [{}]};
            }
            else if (comp.team.activity == null || !comp.team.activity.length) {
                comp.team.activity = [{}];
            }
            for (var n = 0; n < 24; n++) {
                this.hours.push({value: n * 60, text: ("0" + n).slice(-2) + ":00"});
                this.hours.push({value: n * 60 + 30, text: ("0" + n).slice(-2) + ":30"});
            }
            if (!comp.newTeam) {
                for (var i = 0; i < comp.sports.length; i++) {
                    var sport = comp.sports[i];
                    if (sport.id === comp.team.sport.id) {
                        comp.sportIndex = i;
                        comp.team.sport = sport;
                        for (var a = 0; a < sport.categories.length; a++) {
                            var category = sport.categories[a];
                            if (category.id === comp.team.category.id) {
                                comp.team.category = category;
                                comp.categoryIndex = a;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        },
        methods: {
            addActivityDay: function () {
                this.team.activity.push({});
            },
            removeActivityDay: function (index) {
                this.team.activity.splice(index, 1);
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                this.$emit("close", this.team);
            }
        }
    });

    return LeagueTeamDialogComponent;
});