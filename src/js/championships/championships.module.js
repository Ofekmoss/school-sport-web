(function() {
    'use strict';

    angular
        .module('sport.championships', ['ui.router', 'ui.select'])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('championships', {
                    url: '/championships/:clubs',
                    views: {
                        "main@": {
                            templateUrl: 'views/championships.html',
                            controller: 'ChampionshipsController'
                        }
                    }
                })
                .state('championships.region', {
                    url: '/:region',
                    views: {
                        "main@": {
                            templateUrl: 'views/championships.html',
                            controller: 'ChampionshipsController'
                        }
                    }
                })
                .state('championships.region.championship', {
                    url: '/:category',
                    views: {
                        "main@": {
                            templateUrl: 'views/championships.html',
                            controller: 'ChampionshipsController'
                        }
                    }
                })
                .state('edit-results', {
                    url: '/edit-results',
                    views: {
                        "main@": {
                            templateUrl: 'views/edit-results.html',
                            controller: 'EditResultsController'
                        }
                    }
                })
        }])
        .directive('championshipCategory', function () {
            return {
                restrict: 'E',
                scope: {
                    category: '=category'
                },
                templateUrl: 'views/championship-category.html',
                controller: 'ChampionshipCategoryCtrl'
            };
        })
        .directive('finalsTree', function () {
            return {
                restrict: 'E',
                scope: {
                    tree: '=tree'
                },
                templateUrl: 'views/finals-tree.html',
                controller: 'ChampionshipCategoryFinalsTreeCtrl'
            };
        });
})();

