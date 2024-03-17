define(["templates/competitions", "services/competitions", "utils"], function (templates, Competitions, utils) {
    var OrganizationLevelsDialogComponent = Vue.extend({
        template: templates["organization-levels"],
        data: function () {
            return {
                phase: null,
                levels: [],
                error: ""
            };
        },
        mounted: function () {
            if (this.phase && this.phase.levels) {
                for (var l = 0; l < this.phase.levels.length; l++) {
                    var level = this.phase.levels[l];
                    this.levels.push({name: level.name, count: level.count == null ? "" : "" + level.count});
                }
            }
            this.levels.push({name: "", count: ""});
        },
        methods: {
            onLevelInput: function () {
                var n = 0;
                while (n < this.levels.length - 1) {
                    if (this.levels[n].name === "") {
                        this.levels.splice(n, 1);
                    }
                    else {
                        n++;
                    }
                }
                if (this.levels[this.levels.length - 1].name !== "") {
                    this.levels.push({name: "", count: ""});
                }
            },
            confirm: function () {
                var levels = this.levels.slice(0, this.levels.length - 1).map(function (level) {
                    var c = level.count == null ? "" : level.count.trim();
                    return {
                        name: level.name,
                        count: (c === "" ? null : parseInt(level.count)) || null
                    };
                });
                this.$emit("close", levels);
            },
            cancel: function () {
                this.$emit("close");
            }
        }
    });

    return OrganizationLevelsDialogComponent;
});