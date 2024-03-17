(function() {
    'use strict';

    angular
        .module('components')
        .controller('DateSelectorCtrl', ['$scope', '$uibModalInstance', 'calendar', 'options', DateSelectorCtrl])
        .factory('dateSelector', ['$uibModal', dateSelector]);

    function DateSelectorCtrl($scope, $uibModalInstance, calendar, options) {
        $scope.calendar = calendar;
        $scope.selectedDate = new Date();
        $scope.title = options && options.title ? options.title : 'בחירת תאריך';

        if (options) {
            $scope.subTitle = options.subTitle;
            $scope.info = options.info;
            if (options.selectedDate)
                $scope.selectedDate = options.selectedDate;
        }
        $scope.cancelCaption = options && options.cancelCaption ? options.cancelCaption : 'ביטול';
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';

        if (!$scope.calendar.selectedMonth) {
            $scope.calendar.selectMonth();
        }

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            if ($scope.calendar.selectedDay) {
                $uibModalInstance.close($scope.calendar.selectedDay);
            }
        };

        $scope.getDaysDiff = function (day) {
            var date = new Date();
            date.setDate(day.day);
            date.setMonth(day.month);
            date.setFullYear(day.year);
            var now = new Date();
            var diff = date.getTime() - now.getTime();
            var daysDiff = parseInt(diff / (1000 * 3600 * 24));
            return daysDiff;
        };

        $scope.dayClicked = function (day) {
            calendar.selectDay(day);
        };

        $scope.generateDayClass = function (day) {
            var arrClasses = [];
            if (day.currentMonth)
                arrClasses.push('current');
            if (day.selected) {
                arrClasses.push('bg-primary');
            } else {
                if (day.day == $scope.selectedDate.getDate() && day.month == $scope.selectedDate.getMonth() && day.year == $scope.selectedDate.getFullYear()) {
                    arrClasses.push('bg-info');
                } else if (day.currentSelection && !day.selected) {
                    arrClasses.push('bg-success');
                }
            }
            if (day.currentMonth && day.items.length > 0)
                arrClasses.push('enabled');
            return arrClasses.join(' ');
        }
    }

    function dateSelector($uibModal) {
        function select(calendar, options) {
            return $uibModal.open({
                templateUrl: 'views/date-selector.html',
                controller: 'DateSelectorCtrl',
                resolve: {
                    calendar: function () {
                        return calendar;
                    },
                    options: function () {
                        return options;
                    }
                }
            }).result;
        }

        return {
            select: select
        }
    }
})();