define(["templates/generic", "views"], function (templates, Views) {
    function ApplyDataArrays(comp) {
        function BuildDataTable(dataArray) {
            var table = {};
            var firstItem = dataArray[0];
            table.columns = [];
            for (var propertyName in firstItem) {
                if (firstItem.hasOwnProperty(propertyName)) {
                    table.columns.push({
                        key: 'col-' + propertyName,
                        name: propertyName,
                        isMoreInfo: propertyName === 'פרטים נוספים',
                        active: true
                    });
                }
            }
            table.rows = [];
            table.tooltips = [];
            dataArray.forEach(function(dataItem) {
                var row = {};
                var tooltip = {};
                var rowVisible = !comp.searchText || comp.searchText.length === 0;
                for (var propertyName in firstItem) {
                    if (dataItem.hasOwnProperty(propertyName)) {
                        var currentCellText = (dataItem[propertyName] || '').toString();
                        var currentTooltip = '';
                        if (currentCellText.indexOf(' | ') > 0) {
                            var a = currentCellText.split(' | ');
                            currentCellText = a[0];
                            currentTooltip = a[1];
                        }
                        if (comp.searchText && comp.searchText.length > 0) {
                            if (currentCellText.indexOf(comp.searchText) >= 0) {
                                rowVisible = true;
                            }
                        }
                        row['col-' + propertyName] = currentCellText;
                        tooltip['col-' + propertyName] = currentTooltip;
                    }
                }
                if (rowVisible) {
                    table.rows.push(row);
                    table.tooltips.push(tooltip);
                }
            });
            if (table.rows.length > 0) {
                //remove columns where all rows have no value
                table.columns = table.columns.filter(function(column) {
                    var emptyRows = table.rows.filter(function(row) {
                        var curData = row[column.key];
                        return curData == null || curData.toString().length === 0;
                    });
                    return emptyRows.length < table.rows.length;
                });

                //remove columns with ALL CAPS names
                table.columns = table.columns.filter(function(column) {
                    var colName = column.name;
                    var allCAPS = true;
                    for (var i = 0; i < colName.length; i++) {
                        var curLetter = colName.charAt(i);
                        if (curLetter !== '_' && (curLetter < 'A' || curLetter > 'Z')) {
                            allCAPS = false;
                            break;
                        }
                    }
                    return !allCAPS;
                });
            }
            return table;
        }
        comp.tables = [];
        for (var i = 0; i < comp.dataArrays.length; i++) {
            var dataArray = comp.dataArrays[i];
            var table = BuildDataTable(dataArray);
            comp.tables.push(table);
        }
        comp.loading = false;
        window.setTimeout(function() {
            var container = $("#dataContainer");
            if (container.length === 1) {
                var oDialog = container.parents('.dialog').first();
                if (oDialog.length === 1) {
                    var width = container.width();
                    var actualWidth = container[0].scrollWidth;
                    if (actualWidth > width) {
                        var diff = actualWidth - width;
                        var currentDialogWidth = parseInt(oDialog.css("width"), 10);
                        oDialog.css("width", (currentDialogWidth + diff + 20) + "px");
                    }
                }
            }
        }, 500);
    }

    var DataDialogComponent = Vue.extend({
        template: templates["data-dialog"],
        data: function () {
            return {
                caption: "",
                tables: [],
                //columns: [],
                //rows: [],
                //tooltips: [],
                dataArray: null,
                dataArrays: [],
                dataUrl: null,
                hideSearch: false,
                loading: null,
                error: null,
                searchText: ''
            };
        },
        mounted: function () {
            var comp = this;
            comp.loading = true;
            if (comp.dataArrays != null && comp.dataArrays.length > 0) {
                ApplyDataArrays(comp);
            } else if (comp.dataArray != null && comp.dataArray.length > 0) {
                comp.dataArrays = [comp.dataArray];
                ApplyDataArrays(comp);
            } else if (comp.dataUrl != null && comp.dataUrl.length > 0) {
                Vue.http.get(comp.dataUrl).then(function(res) {
                    comp.dataArrays = [];
                    var rawResponse = res.body;
                    if (rawResponse.length > 0 && Array.isArray(rawResponse[0])) {
                        //array of arrays...
                        rawResponse.forEach(function(dataArray) {
                            comp.dataArrays.push(dataArray);
                        });
                    } else {
                        comp.dataArrays.push(rawResponse);
                    }
                    ApplyDataArrays(comp);
                }, function(err) {
                    comp.loading = false;
                    comp.error = 'שגיאה בעת טעינת נתונים מהשרת, נא לנסות שוב מאוחר יותר';
                });
            } else {
                comp.loading = false;
            }
        },
        watch: {
            searchText: function() {
                ApplyDataArrays(this);
            }
        },
        methods: {
            handleMoreInfo: function(row, columnKey) {
                var rawViewData = row[columnKey];
                if (rawViewData != null && rawViewData.length > 0) {
                    var tmp = rawViewData.split('?');
                    var viewRoute = tmp[0];
                    var viewParameters = {};
                    if (tmp.length > 1) {
                        var paramArray = tmp[1].split('&');
                        paramArray.forEach(function(rawParameter) {
                            if (rawParameter.length > 0) {
                                tmp = rawParameter.split('=');
                                if (tmp.length === 2)
                                    viewParameters[tmp[0]] = tmp[1];
                            }
                        });
                    }
                    Views.openView(viewRoute, viewParameters);
                    this.$emit("close");
                }
            },
            close: function () {
                this.$emit("close");
            },
            cancel: function () {
                this.$emit("close");
            }
        }
    });

    return DataDialogComponent;
});