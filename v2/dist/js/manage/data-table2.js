define(["templates/manage", "utils", "views"], function (templates, utils, views) {

    function isShowRecord(getValue, record, columns) {
        var result = columns.filter(function(col) {
            return col.isFilterActive;
        });
        result = result.reduce(function(prev, col) {

            var accOptions = col.textFilterOptions.reduce(function(p, option) {
                return p || option.value && getValue(record, col) == option.title;
            }, false);

            return prev && accOptions;

        }, true);

        return result;
    }


    var DataTable2 = Vue.extend({
        template: templates["data-table2"],
        props: {
            records: Array,
            columns: Array,
            showSummary: Number,
            showMoreInfo: Number
        },
        data: function () {
            return {
                selectedRecords: [],
                rawData: [],
                allRawData: [],
                hasHiddenColumns: false
            }
        },
        mounted: function () {
            for (var i= 0; i < this.columns.length; i++) {
                if (!this.columns[i].active) {
                    this.hasHiddenColumns = true;
                    break;
                }
            }
        },
        watch: {
            records: function() {
                this.allRawData = this.records.map(function(row){
                    row.__show = true;
                    return row;
                });
                this.rawData = this.allRawData.slice();
            },
            columns: function() {
                var comp = this;

                this.columns.forEach(function(column) {
                    if (column.textFilterOptions) {
                        return;
                    }
                    var textFilterOptions = [];
                    comp.allRawData.forEach(function(record) {
                        textFilterOptions.push({ title: comp.getValue(record, column), value: false, isActive: true });
                    });

                    // remove duplicates
                    textFilterOptions = textFilterOptions.filter(function(item, index) {
                        for (var i = 0; i < textFilterOptions.length; i++) {
                            if (textFilterOptions[i].title === item.title) {
                                return i == index;
                            }
                        }});

                    column.textFilterOptions = textFilterOptions;
                });
            }
        },
        methods: {
            filter: function(column) {
                if (!column.openFilter) {
                    this.columns.forEach(function(col) {
                        col.openFilter = false;
                    });
                }
                column.openFilter = !column.openFilter;
                this.columns = this.columns.slice().map(function(col) {
                    return utils.mergeDeep({}, col);
                });
            },
            onFilterSearch: function (column) {
                if (!column.searchText) {
                    column.textFilterOptions = column.textFilterOptions.map(function(option) {
                        option.isActive = true;
                        return option;
                    });
                } else {
                    column.textFilterOptions.forEach(function(option){
                        var t = option.title + '';
                        if (t.indexOf(column.searchText) < 0) {
                            option.isActive = false;
                        } else {
                            option.isActive = true;
                        }
                    });
                }

                this.columns = this.columns.slice();

            },
            applyToAll: function(column, state){
                column.textFilterOptions = column.textFilterOptions.map(function (option) {
                    if (option.isActive) {
                        option.value = state;
                    }
                    return option;
                });

                this.filterRecords(column);

            },
            filterRecords: function(column) {
                var comp = this;
                var getValue = this.getValue;
                column.isFilterActive = column.textFilterOptions.reduce(function(prev, option) {
                    return prev || option.value;
                }, false);

                var filteredRecords = [];

                // if no filters active return all records
                if (!column.isFilterActive) {
                    filteredRecords = this.allRawData.slice();
                } else {
                    this.allRawData.forEach(function(record) {
                        if (isShowRecord(getValue, record, comp.columns)) {
                            filteredRecords.push(record);
                        }
                    });
                }

                // column.hasActiveFilters = filteredRecords.length > 0 ? 1 : 0;

                comp.rawData = filteredRecords;
                comp.columns = comp.columns.slice().map(function(col) {
                    col.textFilterOptions = col.textFilterOptions.slice();
                    return utils.mergeDeep({}, col);
                });
            },

            sort: function (col) {
                var getValue = this.getValue;
                this.columns.forEach(function(c) {
                    if (c != col) {
                        c.sort = null;
                    }
                });
                if (!this.rawData) {
                    return;
                }

                this.columns = this.columns.slice();


                if (col.sort == 'a') {
                    col.sort = 'd';


                    this.rawData.sort(function (item1, item2) {
                        var i1 = getValue(item1, col);
                        var i2 = getValue(item2, col);
                        if (i1 == i2) {
                            return 0;
                        }

                        return i2 > i1 ? 1 : -1;
                    });
                }
                else {
                    col.sort = 'a';
                    this.rawData.sort(function (item1, item2) {
                        var i1 = getValue(item1, col);
                        var i2 = getValue(item2, col);
                        if (i1 == i2) {
                            return 0;
                        }
                        return i1 > i2 ? 1 : -1;
                    });
                }
            },
            exportExcel: function () {
                utils.excelReport('download', 'headerTable');
            },
            getValue: function(record, column) {
                if (typeof column.key === "string") {
                    column.key = column.key.split('.');
                }
                var value = record;
                for (var i = 0; i < column.key.length; i++) {
                    if (value == null) {
                        break;
                    }

                    var columnKey = column.key[i];
                    if (value.constructor === Array) {
                        value = value.map(function (x) { return x[columnKey]; });
                    }
                    else {
                        value = value[columnKey];
                    }
                }

                if (column.type == 'activity') {
                    return value;
                }

                if (column.type == 'func' && typeof column.func === 'function') {
                    return column.func(value);
                }

                if (column.type == 'date') {
                    return utils.formatDate(value, column.format);
                }

                if (value != null && value.constructor === Array) {
                    if (column.lookup) {
                        value = value.map(function (x) {
                            return column.lookup[x];
                        });
                    }
                    value = value.map(function (x) { return x.toString(); }).join(", ");
                } else {
                    if (column.lookup) {
                        value = column.lookup[value];
                    }
                }

                return value;

            },
            toggleRecordSelect: function(record) {
                this.setSelected(record);
                this.$emit("record-select", this.selectedRecords);

            },
            moreInfo: function(e, record) {
                e.stopPropagation();
                this.$emit("record-more-info", record);
            },
            getPaymentRequestUrl: function(record, column) {
                var comp = this;
                var rawOrderNumber = comp.getValue(record, column);
                var parsedOrderNumber = utils.ParsePaymentOrder(rawOrderNumber);
                var pdfName = 'תעודת חיוב ' + parsedOrderNumber.replace('/', '-') + '.pdf';
                return '/content/PaymentNotifications/' + encodeURIComponent(pdfName);
            },
            setSelected: function(record){

                // this.rawData = this.rawData.map( function(r, index) {
                //     r.__id = index;
                //     r.selected = false;
                //     return r;
                // });

                if (record) {
                    record.selected = !record.selected;
                }

                this.selectedRecords = this.rawData.filter(function(record) {
                    return record.selected;
                });

                this.rawData = this.rawData.slice();
            },
            openTab: function(record, column){
                if (!column.openTab || !column.openTab.route) {
                    return;
                }

                var params = {};

                if (column.openTab.params) {
                    Object.keys(column.openTab.params).forEach(function(key){
                        var index = column.openTab.params[key].split('.');
                        var value = record;
                        for (var i = 0; i < index.length; i++) {
                            if (value == null) {
                                break;
                            }

                            var columnKey = index[i];
                            if (value.constructor === Array) {
                                value = value.map(function (x) { return x[columnKey]; });
                            }
                            else {
                                value = value[columnKey];
                            }
                            params[key] = value; //column.openTab.params[index]
                        }
                    });
                }

                views.openView(column.openTab.route, params);
            },
            openChampionshipCategory: function(id) {
                views.openView('competitions/competition', { id: id});
            }
        }
    });

    Vue.component('data-table2', DataTable2);
});