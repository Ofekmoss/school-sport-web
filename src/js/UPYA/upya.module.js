(function() {
    'use strict';

    angular
        .module('sport.UPYA', [
            'components',
            'ui.router'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('UPYA', {
                    url: '/UPYA',
                    views: {
                        "main@": {
                            templateUrl: 'views/UPYA.html',
                            controller: 'UPYA_Controller'
                        }
                    }
                })
                .state('upya-manage', {
                    url: '/upya-manage',
                    views: {
                        "main@": {
                            templateUrl: 'views/upya-manage.html',
                            controller: 'UPYA_Manage_Controller'
                        }
                    }
                });
        }]);
})();

