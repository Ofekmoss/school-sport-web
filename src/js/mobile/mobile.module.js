(function() {
    'use strict';

    angular
        .module('sport.mobile', [
            'components',
            'ui.router',
            'sport.content',
            'sport.events',
            'sport.championships'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('home-mobile', {
                    url: '/m',
                    views: {
                        "main@": {
                            templateUrl: 'views/home-mobile.html',
                            controller: 'HomeMobileController'
                        }
                    }
                });
        }]);
})();

