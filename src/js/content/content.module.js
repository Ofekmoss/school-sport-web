(function() {
    'use strict';

    angular
        .module('sport.content', ['ui.router', 'ui.select', 'ngTagsInput'])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('page', {
                    url: '/page/:page',
                    views: {
                        "main@": {
                            templateUrl: 'views/content.html',
                            controller: 'ContentController'
                        }
                    },
                    data: {
                        contentType: 'page'
                    }
                })
                .state('page.edit', {
                    url: '/edit',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-edit.html',
                            controller: 'ContentEditController'
                        }
                    },
                    data: {
                        contentType: null
                    }
                })
                .state('videos', {
                    url: '/videos',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-list.html',
                            controller: 'ContentListController'
                        }
                    },
                    data: {
                        contentType: 'video'
                    }
                })
                .state('galleries', {
                    url: '/galleries',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-list.html',
                            controller: 'ContentListController'
                        }
                    },
                    data: {
                        contentType: 'gallery'
                    }
                })
                .state('articles', {
                    url: '/articles',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-list.html',
                            controller: 'ContentListController'
                        }
                    },
                    data: {
                        contentType: 'article'
                    }
                })
                .state('pages', {
                    url: '/pages',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-list.html',
                            controller: 'ContentListController'
                        }
                    },
                    data: {
                        contentType: null
                    }
                })
                .state('pages.manage', {
                    url: '/manage',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-manage.html',
                            controller: 'ContentManageController'
                        }
                    }
                })
                .state('pages.regions', {
                    url: '/regions',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-regions.html',
                            controller: 'ContentRegionsController'
                        }
                    }
                })
                .state('files', {
                    url: '/files/:page',
                    views: {
                        "main@": {
                            templateUrl: 'views/content.html',
                            controller: 'ContentController'
                        }
                    },
                    data: {
                        contentType: 'files'
                    }
                })
                .state('files.edit', {
                    url: '/edit',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-edit.html',
                            controller: 'ContentEditController'
                        }
                    },
                    data: {
                        contentType: 'files'
                    }
                })
                .state('event', {
                    url: '/event/:page',
                    views: {
                        "main@": {
                            templateUrl: 'views/content.html',
                            controller: 'ContentController'
                        }
                    },
                    data: {
                        contentType: 'event'
                    }
                })
                .state('event.edit', {
                    url: '/edit',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-edit.html',
                            controller: 'ContentEditController'
                        }
                    },
                    data: {
                        contentType: 'event'
                    }
                })
                .state('video', {
                    url: '/video/:page',
                    views: {
                        "main@": {
                            templateUrl: 'views/content.html',
                            controller: 'ContentController'
                        }
                    },
                    data: {
                        contentType: 'video'
                    }
                })
                .state('video.edit', {
                    url: '/edit',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-edit.html',
                            controller: 'ContentEditController'
                        }
                    },
                    data: {
                        contentType: 'video'
                    }
                })
                .state('gallery', {
                    url: '/gallery/:page',
                    views: {
                        "main@": {
                            templateUrl: 'views/content.html',
                            controller: 'ContentController'
                        }
                    },
                    data: {
                        contentType: 'gallery'
                    }
                })
                .state('gallery.edit', {
                    url: '/edit',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-edit.html',
                            controller: 'ContentEditController'
                        }
                    },
                    data: {
                        contentType: 'gallery'
                    }
                    //abstract: true
                })
                .state('article', {
                    url: '/article/:page',
                    views: {
                        "main@": {
                            templateUrl: 'views/content.html',
                            controller: 'ContentController'
                        }
                    },
                    data: {
                        contentType: 'article'
                    }
                })
                .state('article.edit', {
                    url: '/edit',
                    views: {
                        "main@": {
                            templateUrl: 'views/content-edit.html',
                            controller: 'ContentEditController'
                        }
                    },
                    data: {
                        contentType: 'article'
                    }
                })
        }]);
})();

