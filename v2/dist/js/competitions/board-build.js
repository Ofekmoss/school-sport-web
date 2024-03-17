define(["templates/competitions", "services/competitions", "utils"], function (templates, Competitions, utils) {
    var BoardBuildDialogComponent = Vue.extend({
        template: templates["board-build"],
        data: function () {
            return {
                boards: [],
                participants: [],
                participant: null,
                boardId: null,
                cycleNames: [],
                rounds: [],
                board: null,
                error: ""
            };
        },
        mounted: function () {
            var comp = this;
            Vue.http.get('/api/v2/competitions/matches/boards?participants=' + encodeURIComponent(this.participants.length)).then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    comp.boards.push(resp.body[i]);
                }
                comp.boards.sort(function (a, b) { return a.name.localeCompare(b.name); });
                if (comp.boardId) {
                    comp.onBoardChanged();
                }
            });
        },
        methods: {
            onBoardChanged: function () {
                var comp = this;
                if (this.boardId) {
                    Vue.http.get('/api/v2/competitions/matches/boards/' +
                        encodeURIComponent(this.boardId) + "/" + encodeURIComponent(this.participants.length)).then(function (resp) {
                        comp.cycleNames.splice(0, comp.cycleNames.length);
                        comp.rounds.splice(0, comp.rounds.length);
                        if (resp.body) {
                            comp.board = resp.body;
                            var cycles = resp.body.levels[1];
                            for (var n = 0; n < cycles.length; n++) {
                                comp.cycleNames.push(cycles[n]);
                            }
                            var rounds = resp.body.levels[0];
                            for (var n = 0; n < rounds.length; n++) {
                                comp.rounds.push({
                                    name: rounds[n],
                                    cycles: []
                                });
                            }
                            for (var n = 0; n < resp.body.matches.length; n++) {
                                var match = resp.body.matches[n];
                                var round = comp.rounds[match.sequence[0]];
                                if (!round) {
                                    comp.rounds[round] = {name: round, cycles: []};
                                }
                                var c = match.sequence[1];
                                while (c >= round.cycles.length) {
                                    round.cycles.push({matches: []});
                                }
                                var cycle = round.cycles[c];
                                cycle.matches.push({
                                    a: {number: match.a, name: comp.participants[match.a]},
                                    b: {number: match.b, name: comp.participants[match.b]}
                                });
                            }
                        }
                        else {
                            comp.board = null;
                        }
                    });
                }
            },
            toggleParticipant: function (participant) {
                if (this.participant === participant) {
                    this.participant = null;
                }
                else {
                    this.participant = participant;
                }
            },
            confirm: function () {
                if (this.board) {
                    this.$emit("close", this.board);
                }
            },
            cancel: function () {
                this.$emit("close");
            }
        }
    });

    return BoardBuildDialogComponent;
});