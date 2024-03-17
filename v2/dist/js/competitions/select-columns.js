define(["templates/competitions"], function (templates) {
    var SelectColumnsDialogComponent = Vue.extend({
        template: templates["select-columns"],
        data: function () {
            return {
                columns: [
                    {id: "number", name: "#", selected: false, order: 1},
                    {id: "opponentA", name: "קבוצה א", selected: false, order: 2},
                    {id: "opponentB", name: "קבוצה ב", selected: false, order: 3},
                    {id: "time", name: "תאריך", selected: false, order: 4},
                    {id: "venue", name: "מתקן", selected: false, order: 5},
                    {id: "score", name: "תוצאה", selected: false, order: 6}
                ],
                setColumns: {},
                functionaries: []
            };
        },
        mounted: function() {
            var cols = {};
            for (var c = 0; c < this.columns.length; c++) {
                var col = this.columns[c];
                cols[col.id] = col;
            }

            if (this.functionaries) {
                for (var f = 0; f < this.functionaries.length; f++) {
                    var func = this.functionaries[f];
                    var col = {
                        id: "func" + func.type,
                        name: func.description,
                        selected: false,
                        order: this.columns.length + 1
                    };
                    this.columns.push(col);
                    cols[col.id] = col;
                }
            }

            for (var id in this.setColumns) {
                var col = cols[id];
                if (col) {
                    var order = this.setColumns[id];
                    if (order < 0) {
                        col.selected = false;
                        col.order = -order;
                    }
                    else {
                        col.selected = true;
                        col.order = order;
                    }
                }
            }
            this.columns.sort(function (a, b) {
                if (a.order == null) {
                    if (b.order == null) {
                        return 0;
                    }
                    return 1;
                }
                else if (b.order == null) {
                    return -1;
                }
                return a.order - b.order;
            });
        },
        methods: {
            toggleColumn: function (column) {
                column.selected = !column.selected;
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                var setColumn = {};
                for (var n = 0; n < this.columns.length; n++) {
                    var col = this.columns[n];
                    if (col.selected) {
                        setColumn[col.id] = n + 1;
                    }
                    else {
                        setColumn[col.id] = -(n + 1);
                    }
                }
                this.$emit("close", setColumn);
            }
        }
    });

    return SelectColumnsDialogComponent;
});