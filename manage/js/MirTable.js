/**
 * Created by yahav on 01/04/2019.
 */
var MirTable = {
    createNew: function(fieldNames, defaultSort) {
        if (typeof defaultSort == 'undefined')
            defaultSort = null;
        var table = {
            Fields: fieldNames.map(function(fieldName) {
                return {
                    Name: fieldName,
                    Title: fieldName,
                    Visible: true
                };
            }),
            Rows: []
        };
        for (var i = 0; i < table.Fields.length; i++) {
            table.Fields[i].Index = i + 1;
        }
        if (defaultSort != null) {
            table.Sort = {
                Column: defaultSort,
                Descending: false
            };
        }
        return table;
    },
    parseFeatures: function(id) {
        var rawFeatures = $("#" + id).data("features") || '';
        var features = rawFeatures.split(";");
        var parsedFeatures = {};
        var emptyFeaturesCount = 0;
        features.forEach(function(featureName) {
            switch (featureName) {
                case "sort":
                    parsedFeatures.Sort = true;
                    break;
                case "filtering":
                    parsedFeatures.Filtering = true;
                    break;
                case "paging":
                    parsedFeatures.Paging = true;
                    break;
                case "search":
                    parsedFeatures.Search = true;
                    break;
                case "showTotal":
                    parsedFeatures.ShowTotal = true;
                    break;
                case "excel":
                    parsedFeatures.Excel = true;
                    break;
                case "chooseColumns":
                    parsedFeatures.ChooseColumns = true;
                    break;
                default:
                    if (featureName.length > 0)
                        console.log('Unknown feature detected for table "' + id + '": ' + featureName);
                    else
                        emptyFeaturesCount++;
                    break;
            }
        });
        if (emptyFeaturesCount > 0)
            console.log('Detected ' + emptyFeaturesCount + ' empty feature' + ((emptyFeaturesCount > 1) ? 's' : '') + ' for table "' + id + '"');
        return parsedFeatures;
    },
    applyFilters: function(fields, rows) {
        if (!fields || fields.length == 0 || !rows || rows.length == 0)
            return [];

        var filteredFields = fields.filter(function(x) {
            return x.FilterText && x.FilterText.length > 0;
        });

        if (filteredFields.length > 0) {
            var filteredRows = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var matchingAll = true;
                for (var j = 0; j < filteredFields.length; j++) {
                    var filteredField = filteredFields[j];
                    var currentValue = (row[filteredField.Name] || '').toString();
                    if (currentValue.indexOf(filteredField.FilterText) < 0) {
                        matchingAll = false;
                        break;
                    }
                }
                if (matchingAll)
                    filteredRows.push(row);
            }
            return filteredRows;
        } else {
            return rows;
        }
    },
    sort: function(rows, sortColumn, fields, isDescending) {
        if (!rows || rows.length == 0 || !sortColumn || !fields || fields.length == 0)
            return;
        if (typeof isDescending == 'undefined')
            isDescending = false;
        var matchingField = fields.findItem(function(x) {
            return x.Title == sortColumn;
        });
        if (matchingField == null)
            return;
        var propName = matchingField.Name;
        var biggerThanReturnValue = isDescending ? -1 : 1;
        var smallerThanReturnValue = isDescending ? 1 : -1;
        rows.sort(function(r1, r2) {
            var v1 = r1[propName];
            var v2 = r2[propName];
            var bigger = (v1 > v2);
            return bigger ? biggerThanReturnValue : ((v1 < v2) ? smallerThanReturnValue : 0);
        });
    },
    changeSort: function(field, dataTable) {
        if (field.IsFile ||!dataTable.Features.Sort)
            return;

        if (dataTable.Sort != null && dataTable.Sort.Column == field.Title) {
            dataTable.Sort.Descending = !dataTable.Sort.Descending;
        } else {
            dataTable.Sort = {
                Column: field.Title,
                Descending: false
            }
        }
        dataTable.OnDataChange();
    },
    filterChanged: function(field, dataTable) {
        dataTable.OnDataChange();
    },
    toggleFilter: function(field, dataTable) {
        dataTable.Fields.forEach(function(x) {
            if (x.Index != field.Index) {
                x.Filtered = false;
            }
        });
        field.Filtered = !field.Filtered;
        if (field.Filtered) {
            window.setTimeout(function () {
                $('input[data-field-index="' + field.Index + '"]').focus();
            }, 500);
        }
    },
    getFilterStyle: function(field) {
        return field.FilterText && field.FilterText.length > 0 ? 'color: #00ADEE;' : '';
    },
    clearFilter: function(field, dataTable) {
        field.FilterText = '';
        field.Filtered = false;
        MirTable.filterChanged(field, dataTable);
    },
    gotFilters: function(dataTable) {
        if (dataTable && dataTable.Fields) {
            for (var i = 0; i < dataTable.Fields.length; i++) {
                var curField = dataTable.Fields[i];
                if (curField.FilterText)
                    return true;
            }
        }
        return false;
    },
    clearAllFilters: function(dataTable) {
        dataTable.Fields.forEach(function(field) {
            MirTable.clearFilter(field, dataTable);
        });
    },
    chooseColumns: function(dataTable) {
        dataTable.AvailableColumnsVisible = !dataTable.AvailableColumnsVisible;
    },
    initAvailableColumnsPicker: function(buttonId, panelId, titleClassName) {
        window.setTimeout(function() {
            var chooseTableColumnsLink = $("#" + buttonId);
            var availableColumnsPanel = $("#" + panelId);
            var leftPos = chooseTableColumnsLink.position().left;
            var totalWidth = chooseTableColumnsLink.outerWidth() - 11;
            availableColumnsPanel.css({
                "left": leftPos + "px",
                "width": totalWidth + "px"
            });
            $("." + titleClassName).css("width", (totalWidth - 48) + "px");
        }, 500);
    },
    availableColumnClicked: function(field, dataTable) {
        field.IsHidden = !field.IsHidden;
        dataTable.HiddenColumnExists = dataTable.Fields.findIndex(function(x) { return x.IsHidden; }) >= 0;
    },
    undoColumnSelection: function(dataTable) {
        dataTable.Fields.setForAll('IsHidden', false);
        dataTable.HiddenColumnExists = false;
    },
    exportExcel: function(dataTable, pagingService, excelName) {
        dataTable.ExcelInProgress = true;
        var allFields = dataTable.Fields.filter(function(x) {
            return x.Visible && !x.IsHidden;
        }).map(function(x) {
            return x.Title;
        });
        var fieldMapping = {};
        dataTable.Fields.forEach(function(field) {
            fieldMapping[field.Title] = field.Name;
        });
        var allRows = pagingService.getAllData().map(function(row) {
            var values = [];
            allFields.forEach(function(fieldTitle) {
                values.push(row[fieldMapping[fieldTitle]]);
            });
            return values;
        });
        console.log('rows count: ' + allRows.length);
        var date1 = new Date();
        var url = '/api/common/excel?name=' + excelName; // + '&sheet=' + encodeURIComponent(excelName);
        var requestParams = {
            Headers: allFields,
            Rows: allRows
        };
        dataTable.SendPostData(url, requestParams, function(resp) {
            dataTable.ExcelInProgress = false;
            var date2 = new Date();
            var diff = (date2.getTime() - date1.getTime());
            console.log('generating excel took ' + diff + ' miliseconds, which are ' + (diff / 1000) + ' seconds');
            var excelName = resp.data;
            var fullUrl = '/content/Excel/' + excelName;
            window.setTimeout(function() {
                var oFrame = $('<iframe></iframe>');
                oFrame.attr('src', fullUrl);
                $('body').append(oFrame);
                oFrame.hide();
            }, 1000);
        }, function(err) {
            dataTable.ExcelInProgress = false;
            alert('שגיאה בעת  יצירת גיליון אקסל, נא לנסות שוב מאוחר יותר');
            console.log(err);
        });
    },
    sendPostData: function($http, url, requestParams, successCallback, failureCallback) {
        if (typeof requestParams == 'undefined' || requestParams == null)
            requestParams = {};
        if (typeof successCallback == 'undefined')
            successCallback = null;
        if (typeof failureCallback == 'undefined')
            failureCallback = null;
        $http.post(url, requestParams).then(function(resp) {
            if (successCallback != null) {
                successCallback(resp);
            }
        }, function(err) {
            if (failureCallback != null) {
                failureCallback(err);
            }
        });
    }
};

$(document).ready(function() {
    $(document.body).on('click', ".mir-table tbody tr", function(e){
        var row = $(this);
        if (row.index() > 1) {
            if (row.hasClass("selected")) {
                row.removeClass("selected");
            } else {
                var table = row.parents("table").first();
                table.find("tr").removeClass("selected");
                row.addClass("selected");
            }
        }
    });
});