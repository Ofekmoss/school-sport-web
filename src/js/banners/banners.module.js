(function() {
    'use strict';

    angular
        .module('sport.banners', [
            'components',
            'ui.router'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('banners', {
                    url: '/banners',
                    views: {
                        "main@": {
                            templateUrl: 'views/banners.html',
                            controller: 'BannersController'
                        }
                    }
                });
        }]);
})();

