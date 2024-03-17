(function() {
    'use strict';

    angular
        .module('sport.club-register', [
            'components',
            'ui.router'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('club-register', {
                    url: '/club-register',
                    views: {
                        "main@": {
                            templateUrl: 'views/club-register.html',
                            controller: 'ClubRegisterController'
                        }
                    }
                });
        }]);
})();

