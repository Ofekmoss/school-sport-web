(function() {
    'use strict';

    angular
        .module('sport.flowers', [
            'components',
            'ui.router',
            'sport.content',
            'sport.events',
            'sport.championships'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('flowers', {
                    url: '/flowers',
                    views: {
                        "main@": {
                            templateUrl: 'views/flowers.html',
                            controller: 'FlowersController'
                        }
                    }
                });
        }]);
})();

