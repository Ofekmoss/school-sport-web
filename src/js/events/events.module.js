(function() {
    'use strict';

    angular
        .module('sport.events', ['ui.router', 'ui.select'])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('events', {
                    url: '/events',
                    views: {
                        "main@": {
                            templateUrl: 'views/events.html',
                            controller: 'EventsController'
                        }
                    }
                })
                .state('events.date', {
                    url: '/:date',
                    views: {
                        "main@": {
                            templateUrl: 'views/events.html',
                            controller: 'EventsController'
                        }
                    }
                })
        }]);
})();

