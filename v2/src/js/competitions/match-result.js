define(["templates/competitions", "services/competitions", "utils"], function (templates, Competitions, utils) {
    var MatchResultDialogComponent = Vue.extend({
        template: templates["match-result"],
        data: function () {
            return {
                gameStructure: null,
                teamA: null,
                teamB: null,
                scoreA: null,
                scoreB: null,
                sets: null,
                setList: null,
                setsPartial: false,
                scoreMismatch: false,
                games: false,
                outcome: null
            };
        },
        mounted: function() {
            if (this.gameStructure && this.gameStructure.sets > 0) {
                this.setList = [];
                if (this.sets) {
                    while (this.setList.length < this.gameStructure.sets && this.setList.length < this.sets.length) {
                        var set = this.sets[this.setList.length];
                        this.setList.push({a: set.a.toString(), b: set.b.toString()});
                    }
                }
                while (this.setList.length < this.gameStructure.sets) {
                    this.setList.push({a: null, b: null});
                }
                if (this.gameStructure.games > 1) {
                    this.games = true;
                }

                this.updateSets(false);
            }
        },
        computed: {
            setsSet: function () {
                var count = 0;
                if (this.setList) {
                     for (var n = 0; n < this.setList.length; n++) {
                         var set = this.setList[n];
                         if (!set.a || !set.b || set.a.trim() === "" || set.b.trim() === "") {
                             break;
                         }
                         count++;
                     }
                }
                return count;
            }
        },
        methods: {
            setOutcome: function (outcome) {
                this.outcome = outcome;
            },
            clearResult: function () {
                this.outcome = null;
                this.scoreA = null;
                this.scoreB = null;
                if (this.setList != null) {
                    for (var n = 0; n < this.setList.length; n++) {
                        var set = this.setList[n];
                        set.a = null;
                        set.b = null;
                    }
                    this.updateSets(false);
                }

            },
            focusInput: function ($event) {
                $event.target.select();
            },
            updateSets: function (updateScore) {
                if (this.setList != null) {
                    var scoreA = 0;
                    var scoreB = 0;
                    this.sets = [];
                    this.setsPartial = false;
                    for (var n = 0; n < this.setList.length; n++) {
                        var set = this.setList[n];
                        var s = {a: null, b: null};
                        if (set.a && set.a.trim().length > 0) {
                            s.a = parseInt(set.a);
                            if (isNaN(s.a)) {
                                s.a = null;
                            }
                        }
                        if (set.b && set.b.trim().length > 0) {
                            s.b = parseInt(set.b);
                            if (isNaN(s.b)) {
                                s.b = null;
                            }
                        }

                        var d = (s.a || 0) - (s.b || 0);
                        if (d < 0) {
                            scoreB++;
                        }
                        else if (d > 0) {
                            scoreA++;
                        }
                        if (s.a == null || s.b == null) {
                            this.setsPartial = s.a != null || s.b != null;
                            break;
                        }

                        this.sets.push(s);
                    }

                    if (updateScore) {
                        // When a set is changed - should update score
                        this.scoreA = scoreA;
                        this.scoreB = scoreB;
                        this.scoreMismatch = false;
                    }
                    else {
                        this.scoreMismatch = this.sets.length > 0 && (scoreA != parseInt(this.scoreA) || scoreB != parseInt(this.scoreB));
                    }
                }
                else {
                    this.sets = null;
                }
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                if (!this.scoreMismatch && !this.setsPartial) {
                    var matchResult = {};
                    if (this.outcome == 3 || this.outcome == 4) {
                        matchResult.outcome = this.outcome;
                    }
                    else {
                        matchResult = {
                            result: {
                                scoreA: parseInt(this.scoreA),
                                scoreB: parseInt(this.scoreB)
                            }
                        };
                        if (this.sets) {
                            matchResult.result.sets = this.sets;
                        }
                    }
                    this.$emit("close", matchResult);
                }
            }
        }
    });

    return MatchResultDialogComponent;
});