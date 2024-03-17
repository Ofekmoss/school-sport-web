angular.module('sport')
    .directive('calendar', function() {
        return {
            restrict: 'E',
            scope: {
                calendar: "=source"
            },
            templateUrl: 'views/calendar.html'
        };
    });
