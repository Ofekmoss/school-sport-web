(function() {
    'use strict';

    angular
        .module('sport.register', ['ui.router'])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('register', {
                    url: '/register',
                    views: {
                        "main@": {
                            templateUrl: 'views/register.html',
                            controller: 'RegisterController'
                        }
                    }
                })
        }])
})();

