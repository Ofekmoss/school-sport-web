define(["templates/manage"], function (templates) {
    var NewTabDialogComponent = Vue.extend({
        template: templates["columns-select-dialog"],
        data: function () {
            return {
                columns: [],
                reachedMax: false,
                max: null,
                key: null,
                selectionChanged: false,
                totalActive: 0
            };
        },
        mounted: function () {
            var comp = this;
            comp.totalActive = comp.columns.reduce(function(prev, c){
                if (c.active) {
                    prev++;
                    return prev;
                }
                return prev;
            }, 0);
            comp.reachedMax = comp.max ? comp.totalActive >= comp.max : false;
            for (var i = 0; i < comp.columns.length; i++) {
                var column = comp.columns[i];
                if (column.originalActive != null && column.originalActive !== column.active) {
                    comp.selectionChanged = true;
                    break;
                }
            }
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            resetCache: function() {
                var comp = this;
                if (comp.key) {
                    comp.columns.forEach(function (column) {
                        column.active = column.originalActive || false;
                    });
                    /*
                    var cacheKey = comp.key + '-columns';
                    Vue.http.post('/api/v2/cache', {
                        key: cacheKey,
                        value: ''
                    });
                    */
                }
            },
            select: function() {
                var comp = this;
                if (comp.key) {
                    var activeColumns = comp.columns.filter(function(column) {
                        return column.active === true;
                    });
                    if (activeColumns.length > 0) {
                        var keys = activeColumns.map(function(column) {
                            var curColumnKey = column.id;
                            if (curColumnKey == null || curColumnKey.length === 0) {
                                if (Array.isArray(column.key))
                                    curColumnKey = column.key.join('.');
                                else
                                    curColumnKey = column.key.toString();
                            }
                            return curColumnKey;
                        }).filter(function(key) {
                            return key.length > 0;
                        });
                        if (keys.length > 0) {
                            var cacheKey = comp.key + '-columns';
                            Vue.http.post('/api/v2/cache', {
                                key: cacheKey,
                                value: keys.join(',')
                            });
                        }
                    }
                }
                this.$emit("close", comp.columns);
            },
            onColumnChange: function(name) {
                var comp = this;
                comp.totalActive = comp.columns.reduce(function(prev, c){
                    if (c.active) {
                        prev++;
                        return prev;
                    }
                    return prev;
                }, 0);

                comp.reachedMax = comp.max ? comp.totalActive >= comp.max : false;
            }
        }
    });

    return NewTabDialogComponent;
});