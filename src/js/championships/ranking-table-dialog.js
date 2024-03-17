(function() {
    'use strict';

    angular
        .module('sport')
        .controller('RankingTableDialogCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$timeout', '$q', 'messageBox', 'categoryData', RankingTableDialogCtrl]);

    function RankingTableDialogCtrl($scope, $http, $uibModalInstance, $filter, $timeout, $q, messageBox, categoryData) {
        $scope.data = {
            FullCaption: categoryData.Category.Name + ', ' + categoryData.Phase.Name + ', ' + categoryData.Group.Name,
            AllTables: categoryData.RankingTables,
            RankingTable: null
        };

        function ApplyData() {
            if ($scope.data.AllTables == null) {
                $scope.error = 'לא קיימים נתונים עבור אליפות זו';
                return;
            }

            if (categoryData.Phase.Index >= $scope.data.AllTables.length) {
                $scope.error = 'אין נתוני דירוג עבור שלב אליפות נבחר';
                return;
            }

            $scope.data.RankingTable = $scope.data.AllTables[categoryData.Phase.Index];
            $scope.data.RankingTable.GroupRows = [];
            if ($scope.data.RankingTable.Rows) {
                $scope.data.RankingTable.GroupRows = $scope.data.RankingTable.Rows.filter(function (row) {
                    return row.GroupName == categoryData.Group.Name;
                });
                $scope.data.RankingTable.GroupRows.sortByProperty('Position');
            }

            //resize and put back in middle in case the table is big
            window.setTimeout(function() {
                var modalContent = $(".modal-content");
                if (modalContent.length > 0) {
                    var tableWidth = $("#tblRanking").width();
                    var modalWidth = modalContent.width();
                    if (tableWidth > modalWidth) {
                        var diff = Math.floor((tableWidth - modalWidth) / 2);
                        modalContent.css("width", (tableWidth + 50) + "px");
                        modalContent.css("left", diff + "px");
                    }
                }
            }, 500);
        }

        if ($scope.data.AllTables == null) {
            console.log('reading from server...')
            $scope.loading = true;
            $http.get('/api/sportsman/data-gateway').then(function (resp) {
                var url = resp.data;
                url += '?ccid=' + categoryData.Category.Id;
                $http.get(url).then(function (resp) {
                    $scope.loading = false;
                    $scope.data.AllTables = resp.data.RankingTables;
                    ApplyData();
                });
            }, function(err) {
                $scope.loading = false;
                $scope.error = 'שגיאה בעת טעינת נתונים מהשרת, נא לנסות שוב מאוחר יותר';
            });
        } else {
            ApplyData();
        }

        //dots
        window.setInterval(function() {
            var dotsLabel = $("#lbDots");
            var parentDiv = dotsLabel.parents("div").first();
            if (parentDiv.is(":visible")) {
                var dotCount = dotsLabel.text().length;
                dotCount++;
                if (dotCount > 3)
                    dotCount = 1;
                var dots = Array(dotCount + 1).join(".");
                dotsLabel.text(dots);
            }
        }, 1000);

        $scope.close = function () {
            $uibModalInstance.close($scope.data.AllTables);
        };
    }
})();