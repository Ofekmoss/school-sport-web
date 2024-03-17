(function() {
    'use strict';

    angular
        .module('sport.reports')
        .controller('ReportsController',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', ReportsController]);

    function ReportsController($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        var allRows = [];
        var baseFileUrl = '/content/PlayerFile?type=$type&id=$id';
        var fileInterval = 0;
        $scope.error = '';
        $scope.data = {
            SelectedSeason: {
                Name: localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] || '',
                Year: localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year] || 0
            },
            CurrentSeasonYear: 0,
            Search: '',
            Sort: null,
            Loading: false,
            Error: '',
            Views: [],
            Fields: null,
            Rows: null,
            ExcelInProgress: false,
            AvailableColumnsVisible: false,
            HiddenColumnExists: false
        };
        $scope.selected = {
            'View': null
        };

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope);
            window['qL_step_finished'] = true;
        }

        VerifyUser();

        $http.get('/api/sportsman/views').then(function(resp) {
            $scope.data.Views = resp.data.slice(0);
        }, function(err) {
            console.log(err);
            $scope.error = 'failed to load views';
        });

        $http.get('/api/seasons/current').then(function(resp) {
            $scope.data.CurrentSeasonYear = resp.data.Year;
        });

        function filteredRows() {
            var searchTerm = $.trim($scope.data.Search);
            var filtered = allRows.slice(0);
            if (searchTerm.length > 0)
                filtered = $filter('filter')(filtered, searchTerm);
            filtered = reportUtils.applyFilters($scope.data.Fields, filtered);
            if ($scope.data.Sort != null) {
                var sortColumn = $scope.data.Sort.Column || '';
                if (sortColumn.length > 0) {
                    reportUtils.sort(filtered, sortColumn, $scope.data.Fields, $scope.data.Sort.Descending);
                }
            }
            return filtered;
        }

        function HandlePlayerFiles() {
            $(".report-file").each(function() {
                var placeholder = $(this);
                if (placeholder.data("handled") != "1" && placeholder.data("in_progress") != "1") {
                    var idNumber = placeholder.data("idnumber");
                    var url = baseFileUrl.replace("$type", placeholder.data("type")).replace("$id", idNumber);
                    placeholder.data("in_progress", "1");
                    var loadingIcon = placeholder.find(".file-loading-icon");
                    loadingIcon.show();
                    var ajax = $.get(url, function() {
                        placeholder.data("in_progress", "0");
                        loadingIcon.hide();
                        var hasFile = false;
                        var contentType = ajax.getResponseHeader("content-Type");
                        if (contentType) {
                            if (contentType.indexOf("image/") == 0) {
                                var picturePreview = placeholder.find(".file-image");
                                picturePreview.attr("src", url);
                                picturePreview.show();
                                hasFile = true;
                            } else if (contentType.indexOf("/pdf") > 0) {
                                var pdfPreview = placeholder.find(".file-pdf");
                                if (pdfPreview.length == 1) {
                                    pdfPreview.show();
                                    hasFile = true;
                                }
                            }
                        }
                        if (hasFile) {
                            var oLink = placeholder.find("a");
                            oLink.attr("href", url);
                            oLink.show();
                        }
                        placeholder.data("handled", "1");
                    });
                }
            });
        }

        $scope.pagingService = new PagingService(filteredRows(), {pageSize: 20});
        $scope.data.Rows = [];
        $scope.pagingService.applyPaging($scope.data.Rows);

        $scope.$watch('data.Search', function (newval){
            if ($scope.pagingService && allRows.length > 0) {
                $scope.pagingService.setData(filteredRows());
            }
        });

        $scope.viewSelected = function() {
            function MakeFileField(name, type) {
                return {
                    Name: name,
                    Title: name,
                    FileType: type,
                    Visible: true,
                    Index: -1,
                    IsFile: true
                };
            }

            allRows = [];
            var url = '/api/sportsman/views/' + $scope.selected.View.VIEW_ID;
            var selectedSeason = $scope.data.SelectedSeason.Name;
            if (selectedSeason && selectedSeason.length > 0)
                url += '?season=' + selectedSeason;
            $scope.data.Loading = true;
            $scope.data.Fields = [];
            $http.get(url).then(function(resp) {
                $scope.data.Loading = false;
                reportUtils.InitClearFiltersPositionTimer();
                for (var i = 0; i < resp.data.Fields.length; i++) {
                    var curFieldName = resp.data.Fields[i];
                    var fieldObject = {
                        Name: curFieldName,
                        Type: reportUtils.parseFieldType(curFieldName),
                        Title: reportUtils.cleanFieldName(curFieldName),
                        Visible: !curFieldName.startsWithEnglishLetter(),
                        Index: i + 1
                    }
                    $scope.data.Fields.push(fieldObject);
                }
                if ($scope.selected.View.VIEW_NAME == 'ViewPlayers') {
                    $scope.data.Fields.push(MakeFileField('תמונה', 1));
                    $scope.data.Fields.push(MakeFileField('בדיקה רפואית', 2));
                    $scope.data.Fields.push(MakeFileField('ספח ת"ז', 3));
                }
                allRows = resp.data.Rows;
                if ($scope.selected.View.VIEW_NAME == 'ViewPlayers') {
                    allRows.forEach(function(row) {
                        row['IdNumber'] = row['מספר זהות'];
                    });
                }
                reportUtils.applyFieldTypes($scope.data.Fields, allRows, $filter);
                var defaultSort = reportUtils.applySpecialCases($scope.selected.View.VIEW_NAME, allRows, $filter);
                if (defaultSort != null)
                    $scope.data.Sort = defaultSort;
                $scope.pagingService.setData(filteredRows());

                if (fileInterval)
                    window.clearInterval(fileInterval);
                fileInterval = window.setInterval(HandlePlayerFiles, 200);
                window.setTimeout(function() {
                    var chooseTableColumnsLink = $("#lnkChooseTableColumns");
                    var availableColumnsPanel = $("#pnlAvailableColumns");
                    var leftPos = chooseTableColumnsLink.position().left + 10;
                    var totalWidth = chooseTableColumnsLink.outerWidth() - 1;
                    availableColumnsPanel.css({
                        "left": leftPos + "px",
                        "width": totalWidth + "px"
                    });
                    $(".available-columns-title").css("width", (totalWidth - 48) + "px");
                }, 500);
            }, function(err) {
                $scope.data.Loading = false;
                $scope.data.Error = 'שגיאה בעת טעינת דו"ח';
                console.log(err);
                $scope.pagingService.setData(filteredRows());
            });
        };

        $scope.changeSort = function(field) {
            if (field.IsFile)
                return;

            if ($scope.data.Sort != null && $scope.data.Sort.Column == field.Title) {
                $scope.data.Sort.Descending = !$scope.data.Sort.Descending;
            } else {
                $scope.data.Sort = {
                    Column: field.Title,
                    Descending: false
                }
            }
            $scope.pagingService.setData(filteredRows());
        };

        $scope.toggleFilter = function(field) {
            $scope.data.Fields.forEach(function(x) {
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
        };

        $scope.getFilterStyle = function(field) {
            return field.FilterText && field.FilterText.length > 0 ? 'color: #00ADEE;' : '';
        };

        $scope.filterChanged = function(field) {
            $scope.pagingService.setData(filteredRows());
        };

        $scope.clearFilter = function(field) {
            field.FilterText = '';
            field.Filtered = false;
            $scope.filterChanged(field);
        };

        $scope.clearAllFilters = function() {
            $scope.data.Fields.forEach(function(field) {
                $scope.clearFilter(field);
            });
        };

        $scope.gotFilters = function() {
            if ($scope.data.Fields) {
                for (var i = 0; i < $scope.data.Fields.length; i++) {
                    var curField = $scope.data.Fields[i];
                    if (curField.FilterText)
                        return true;
                }
            }
            return false;
        };

        $scope.chooseColumns = function() {
            $scope.data.AvailableColumnsVisible = !$scope.data.AvailableColumnsVisible;
        };

        $scope.availableColumnClicked = function(field) {
            field.IsHidden = !field.IsHidden;
            $scope.data.HiddenColumnExists = $scope.data.Fields.findIndex(function(x) { return x.IsHidden; }) >= 0;
        };

        $scope.undoColumnSelection = function() {
            $scope.data.Fields.setForAll('IsHidden', false);
            $scope.data.HiddenColumnExists = false;
        };

        $scope.exportExcel = function() {
            $scope.data.ExcelInProgress = true;
            var allFields = $scope.data.Fields.filter(function(x) {
                return x.Visible && !x.IsHidden;
            }).map(function(x) {
                return x.Title;
            });
            var fieldMapping = {};
            $scope.data.Fields.forEach(function(field) {
                fieldMapping[field.Title] = field.Name;
            });
            var allRows = $scope.pagingService.getAllData().map(function(row) {
                console.log(row);
                var values = [];
                allFields.forEach(function(fieldTitle) {
                    values.push(row[fieldMapping[fieldTitle]]);
                });
                return values;
            });
            console.log('rows count: ' + allRows.length);
            var date1 = new Date();
            var viewCaption = $scope.selected.View.VIEW_NAME;
            var url = '/api/common/excel?name=' + sportUtils.RemoveSpecialCharacters(viewCaption) + '&sheet=' + encodeURIComponent(viewCaption);
            //console.log(allRows);
            //allRows.forEach(function(arrCells) {
            //    arrCells[12] = '✓';
            //});
            $http.post(url, {Headers: allFields, Rows: allRows}).then(function(resp) {
                $scope.data.ExcelInProgress = false;
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
                $scope.data.ExcelInProgress = false;
                alert('שגיאה בעת  יצירת גיליון אקסל, נא לנסות שוב מאוחר יותר');
                console.log(err);
            });
        };
    }
})();