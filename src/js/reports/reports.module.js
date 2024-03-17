(function() {
    'use strict';

    angular
        .module('sport.reports', [
            'components',
            'ui.router'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('reports', {
                    url: '/reports',
                    views: {
                        "main@": {
                            templateUrl: 'views/reports.html',
                            controller: 'ReportsController'
                        }
                    }
                });
        }]);
})();

