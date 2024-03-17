(function() {
    'use strict';

    angular
        .module('sport.home', [
            'components',
            'ui.router',
            'sport.content',
            'sport.events',
            'sport.championships'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('home', {
                    url: '/home',
                    views: {
                        "main@": {
                            templateUrl: 'views/home.html',
                            controller: 'HomeController'
                        }
                    }
                });
        }]);
})();

