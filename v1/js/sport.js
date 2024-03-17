(function() {
    'use strict';

    //'ngRoute',

    //640086
    //640086

    //444455
    //444455

    //800078
    //800078

    //441360
    //shkim


    angular
        .module('sport', [
            'sport.home',
            'sport.mobile',
            'sport.flowers',
            'sport.content',
            'sport.register',
            'sport.banners',
            'sport.UPYA',
            'sport.club-register',
            'sport.reports',
            'sport.events',
            'sport.championships',
            'ui.bootstrap',
            'ngSanitize',
            'ngCookies'
        ])
        .config(['$urlRouterProvider', function ($urlRouterProvider) {
            if ((document.location.href || '').toLowerCase().indexOf('players-register-form.html') < 0 &&
                (document.location.href || '').toLowerCase().indexOf('club-register-form.html') < 0) {
                $urlRouterProvider.otherwise('/home');
            }
        }])
        .config( [
            '$compileProvider',
            function( $compileProvider )
            {
                $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|waze|chrome-extension):/);
            }
        ])
        .controller('SportMainCtrl', ['$scope', '$http', '$q', '$timeout', '$interval', '$state', '$rootScope', 'SportService', SportMainCtrl])
        .controller('ManageBreadcrumbsCtrl', ['$scope', ManageBreadcrumbsCtrl])
        .controller('ManageTabsCtrl', ['$scope', '$http', '$state', ManageTabsCtrl])
        .filter('reverse', function() {
            return function(items) {
                return items.slice().reverse();
            };
        })
        .filter('isNull', function() {
            return function(value, defaultValue) {
                return ((typeof value == 'undefined') || value == null) ? defaultValue : value;
            };
        })
        .filter('teamName', function() {
            return function(teamObject, teamLetter) {
                return eventsUtils.BuildTeamName(teamObject, teamLetter);
            };
        })
        .filter('formatDateTime', ['$filter', function ($filter) {
            return function(rawDate, format) {
                //2017-11-01T13:00:56.000Z
                if (rawDate == null || !rawDate)
                    return '';
                if (!rawDate.toISOString) {
                    rawDate = new Date(rawDate);
                    if (!rawDate.toISOString)
                        return rawDate;
                }
                var dateString = rawDate.toISOString();
                if (dateString.indexOf('-') > 3 && dateString.indexOf('T') > 9) {
                    var parts = dateString.split('T');
                    var dateParts = parts[0].split('-');
                    var timeParts = parts[1].split(':');
                    timeParts[2] = timeParts[2].substring(0, 2);
                    var year = dateParts[0];
                    var month = dateParts[1];
                    var day = dateParts[2];
                    var hours = timeParts[0];
                    var minutes = timeParts[1];
                    var seconds = timeParts[2];
                    var replaceMapping = {
                        'dd': day,
                        'MM': month,
                        'yyyy': year,
                        'HH': hours,
                        'mm': minutes,
                        'ss': seconds
                    };
                    var formattedDate = format + '';
                    for (var key in replaceMapping) {
                        var value = replaceMapping[key];
                        while (formattedDate.indexOf(key) >= 0)
                            formattedDate = formattedDate.replace(key, value);
                    }
                    return formattedDate;
                } else {
                    return $filter('date')(rawDate, format);
                }
            };
        }])
        .directive('manageBreadcrumbs', function () {
            return {
                restrict: 'E',
                scope: {
                    description: '@?'
                },
                templateUrl: 'views/manage-breadcrumbs.html',
                controller: 'ManageBreadcrumbsCtrl'
            };
        })
        .directive('manageTabs', function () {
            return {
                restrict: 'E',
                scope: {
                    sender: '@?'
                },
                templateUrl: 'views/manage-tabs.html',
                controller: 'ManageTabsCtrl'
            };
        })
        .directive('fbComments', function() {
            return {
                restrict: 'C',
                link: function(scope, element, attributes) {
                    element[0].dataset.href = document.location.href;
                    return typeof FB !== "undefined" && FB !== null ? FB.XFBML.parse(element.parent()[0]) : void 0;
                }
            };
        })
        .directive('changeBackground', ['$animate', function ($animate) {
            return {
                restrict: 'EA',
                scope: {
                    colorcode: '@?',
                    selected: '@?'
                },
                link: function ($scope, element, attr) {
                    element.on('mouseenter', function () {
                        if (!$scope.selected || $scope.selected == false || ($scope.selected && $scope.selected.toString() == 'false')) {
                            element.addClass('change-color');
                            element.css('background-color', $scope.colorcode);
                        }
                    });
                    element.on('mouseleave', function () {
                        if (!$scope.selected || $scope.selected == false || ($scope.selected && $scope.selected.toString() == 'false')) {
                            element.removeClass('change-color');
                            element.css('background-color', 'transparent');
                        }
                    });
                }
            };
        }])
        .directive('dropzone', ['$q', DropZoneDirective]);

    function DropZoneDirective($q) {
        return function (scope, element, attrs) {
            function UploadAttachment(url, fileObject) {
                var deferred = $q.defer();
                var request = new XMLHttpRequest();
                var formData = new FormData();
                formData.append("attachment", fileObject);
                request.open("POST", url);
                request.onload = function (ev) {
                    if (ev.target.status == 200) {
                        deferred.resolve('ok');
                    } else {
                        deferred.reject("שגיאה בעת העלאת  קובץ לשרת");
                    }
                };
                request.onerror = function (ev) {
                    deferred.reject("שגיאה בעת העלאת  קובץ לשרת");
                };
                request.send(formData);
                return deferred.promise;
            }

            function ExtractFileName(fullPath) {
                var index = fullPath.lastIndexOf('/');
                if (index < 0)
                    index = fullPath.lastIndexOf('\\');
                if (index < 0)
                    return fullPath;
                if (index == fullPath.length - 1)
                    return '';
                return fullPath.substring(index + 1);
            }

            var readFilesCounter = 0;
            function ReadFiles(func, callback) {
                readFilesCounter++;
                if (readFilesCounter > 100)
                    callback([]);
                var files = func();
                if (files != null) {
                    callback(files);
                } else {
                    window.setTimeout(function() {
                        ReadFiles(func, callback);
                    }, 50);
                }
            }


            var config, dropzone;
            config = scope[attrs.dropzone];

            // create a Dropzone for the element with the given options
            //config.options.clickable = false;
            dropzone = new Dropzone(element[0], config.options);

            window.setTimeout(function() {
                var playerId = element.data('player-id');
                var fileType = element.data('file-type');
                if (playerId && fileType) {
                    var key = playerId + '_' + fileType;
                    if (!window['_AllDropZones_'])
                        window['_AllDropZones_'] = {};
                    window['_AllDropZones_'][key] = dropzone;
                }
            }, 500);

            var minSteps = 6, maxSteps = 60, timeBetweenSteps = 100, bytesPerStep = 100000;
            dropzone.uploadFiles = function(files) {
                var self = this;
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    if (config.eventHandlers.sending) {
                        config.eventHandlers.sending(self, file);
                    }
                    var url = config.options.url;
                    var playerId = element.data('player-id');
                    if (playerId)
                        url = url.replace('$id', playerId);
                    UploadAttachment(url, file).then(function(resp) {
                        console.log('File ' + file.name + ' uploaded successfully (' + file.size + ' bytes)');
                    }, function(err) {
                        console.log('Error uploading file ' + file.name + ': ' + err);
                    });
                    
                    var totalSteps = Math.round(Math.min(maxSteps, Math.max(minSteps, file.size / bytesPerStep)));
                    for (var step = 0; step < totalSteps; step++) {
                        var duration = timeBetweenSteps * (step + 1);
                        setTimeout(function(file, totalSteps, step) {
                            return function() {
                                file.upload = {
                                    progress: 100 * (step + 1) / totalSteps,
                                    total: file.size,
                                    bytesSent: (step + 1) * file.size / totalSteps
                                };

                                self.emit('uploadprogress', file, file.upload.progress, file.upload.bytesSent);
                                if (file.upload.progress == 100) {
                                    file.status = Dropzone.SUCCESS;
                                    self.emit("success", file, 'success', null);
                                    self.emit("complete", file);
                                    self.processQueue();
                                }
                            };
                        }(file, totalSteps, step), duration);
                    }
                }
            };

            // bind the given event handlers
            angular.forEach(config.eventHandlers, function (handler, event) {
                dropzone.on(event, handler);
            });

            if (config.existingFiles) {
                ReadFiles(config.existingFiles, function(files) {
                    if (files.length > 0) {
                        for (var i = 0; i < files.length; i++) {
                            var existingFile = files[i];
                            var mockFile = {name: ExtractFileName(existingFile.Path), size: existingFile.Size};
                            dropzone.options.addedfile.call(dropzone, mockFile);
                            dropzone.options.thumbnail.call(dropzone, mockFile, existingFile.Path);
                            dropzone.files.push(mockFile);
                        }
                        window.setTimeout(function () {
                            $('.dz-preview').each(function () {
                                var oPreview = $(this);
                                if (!oPreview.hasClass('dz-complete'))
                                    oPreview.addClass('dz-complete');
                            });
                        }, 500);
                    }
                });
            }
        };
    }

    function SportMainCtrl($scope, $http, $q, $timeout, $interval, $state, $rootScope, SportService) {
        $rootScope.globalData = {
            regions: [],
            loggedUser: null,
            pinnedChampionships: [],
            contentMapping: {},
            sportFieldIcons: {},
            seasons: [],
            currentSeason: sportUtils.getCurrentSeason(),
            selectedSeason: {
                'Name': '',
                'Season': 0
            },
            defaultSeason: {
                'Name': '',
                'Season': 0
            },
            feedbackResult: null
        };
        $rootScope.globalMethods = {};
        $rootScope.globalModel = {
            feedback: {}
        };
        $rootScope.IsMobileDevice = sportUtils.IsMobile();
        $rootScope.homeState = $rootScope.IsMobileDevice ? 'home-mobile' : 'home';

        $http.get('/api/common/all-global-data').then(function(resp) {
            var allGlobalData = resp.data;
            if (allGlobalData.Login != null) {
                $rootScope.globalData.loggedUser = {
                    'Login': allGlobalData.Login.name,
                    'DisplayName': allGlobalData.Login.displayName,
                    'Role': allGlobalData.Login.role
                };
            } else {
                ClearLoginData();
            }
            if (allGlobalData.Sportsman != null) {
                $rootScope.globalData.regions = allGlobalData.Sportsman.Regions;
                $rootScope.globalData.pinnedChampionships = allGlobalData.Sportsman.PermanentChampionships;
                if (allGlobalData.Sportsman.SeasonsInUse.length > 0) {
                    $rootScope.globalData.seasons = allGlobalData.Sportsman.SeasonsInUse.slice(0);
                    $rootScope.globalData.seasons.sort(function (s1, s2) {
                        return s1.Season - s2.Season;
                    });
                    var currentSeasons = $rootScope.globalData.seasons.filter(function (x) {
                        return x.IsCurrent;
                    });
                    if (currentSeasons.length == 0)
                        currentSeasons = [$rootScope.globalData.seasons.lastItem()];
                    $rootScope.globalData.defaultSeason = currentSeasons[0];
                    if (!$rootScope.globalData.currentSeason.Season) {
                        $rootScope.globalData.currentSeason = sportUtils.shallowCopy($rootScope.globalData.defaultSeason);
                    } else {
                        var matchingSeason = allGlobalData.Sportsman.SeasonsInUse.findItem(function(x) { return x.Season == $rootScope.globalData.currentSeason.Season; });
                        if (matchingSeason != null) {
                            $rootScope.globalData.currentSeason.FirstDay = matchingSeason.FirstDay;
                            $rootScope.globalData.currentSeason.LastDay = matchingSeason.LastDay;
                        }
                    }
                    $rootScope.globalData.selectedSeason = sportUtils.shallowCopy($rootScope.globalData.currentSeason);
                }
            }
            $rootScope.globalData.contentMapping = allGlobalData.ContentMapping;
            $rootScope.globalData.sportFieldIcons = allGlobalData.SportFieldIcons;
            contentUtils.InitPageTypes(allGlobalData.PageTypes);
            var pageTypeMapping = contentUtils.GetPageTypeMapping();
            var mappingClone = {};
            for (var pageSeq in pageTypeMapping) {
                var curData = pageTypeMapping[pageSeq];
                mappingClone[pageSeq.toString()] = curData.Name;
            }
            window['page_type_mapping'] = mappingClone;

        }, function(err) {
            console.log('error loading global data');
            ClearLoginData();
        });

        function ClearLoginData() {
            localStorage.removeItem('logged_username');
            localStorage.removeItem('logged_display_name');
            localStorage.removeItem('logged_role');
        }

        function SelectedSeasonIndex() {
            return $rootScope.globalData.seasons.findIndex(function(x) { return x.Season == $rootScope.globalData.selectedSeason.Season; });
        }


        $rootScope.$on('$stateChangeSuccess', function (ev, to, toParams, from, fromParams) {
            var newStateName = to ? to.name : '';
            if (newStateName && newStateName.length > 0) {
                sportUtils.InitiateScrollToTopProcess();
            }
            window['CropperImagePath'] = '';
            window['CropperImageRatio'] = null;
            sportUtils.AttachAutoClick();
            window.setTimeout(function() {
                //console.log(window['ga']);
                if (window['google-analytics-page-hit']) {
                    //already sent a hit via page load, don't send twice
                    window['google-analytics-page-hit'] = null;
                } else {
                    if (window['ga']) {
                        window['ga']('send', 'pageview', document.location.hash);
                    }
                }
            }, 500);
        });

        $rootScope.globalMethods.loginPanelClicked = function() {
            $scope.globalData.showLogin = !$scope.globalData.showLogin;
        };

        $rootScope.mobileLoginClicked = function() {
            $scope.globalData.showLogin = !$scope.globalData.showLogin;
        };

        $rootScope.globalMethods.gotNextSeason = function() {
            return SelectedSeasonIndex() < ($rootScope.globalData.seasons.length - 1);
        };

        $rootScope.globalMethods.gotPrevSeason = function() {
            return SelectedSeasonIndex() > 0;
        };

        $rootScope.globalMethods.changeSeason = function(diff) {
            var currentIndex = SelectedSeasonIndex();
            var newIndex = currentIndex + diff;
            if (newIndex >= 0 && newIndex < $rootScope.globalData.seasons.length) {
                var selected = $rootScope.globalData.seasons[newIndex];
                $rootScope.globalData.selectedSeason = sportUtils.shallowCopy(selected);
            }
        };

        $rootScope.globalMethods.applySeason = function() {
            sportUtils.setCurrentSeason($rootScope.globalData.selectedSeason);
            document.location.reload(true);
        };

        $rootScope.globalMethods.resetSeason = function() {
            sportUtils.setCurrentSeason(null);
            document.location.reload(true);
        };

        $rootScope.globalMethods.gotoYoungSportsmenEvents = function() {
            localStorage['EventsSportFieldFilter'] = sportGlobalSettings.YoungSportsmenSeq;
            $state.go('events');
        };

        $rootScope.globalMethods.register = function() {
            /*
            $http.get('/api/common/Sportsman').then(function(resp) {
                $state.go('club-register');
            });
            */
            $state.go('register');
        };

        $rootScope.globalMethods.SendFeedback = function() {
            $rootScope.globalData.feedbackSending = true;
            $rootScope.globalData.feedbackResult = null;
            $http.post('/api/mails/feedback', $rootScope.globalModel.feedback).then(function(resp) {
                $rootScope.globalData.feedbackSending = false;
                $rootScope.globalData.feedbackResult = {
                    Token: resp.data.Token || ''
                };
            }, function(err) {
                $rootScope.globalData.feedbackSending = false;
                $rootScope.globalData.feedbackResult = {
                    Error: err.data || 'שגיאה כללית בעת שליחת משוב'
                };
                $timeout(function() {
                    $rootScope.globalData.feedbackResult = null;
                }, 5000);
            });
        };

        $rootScope.globalMethods.manageClicked = function() {
            var state = sportUtils.IsMobile() ? 'edit-results' : 'pages.manage';
            $state.go(state);
        };

        $rootScope.globalMethods.logout = function () {
            var promise = $http.post('/api/logout').
                then(function () {
                    ClearLoginData();
                    //$state.go('home');
                    document.location.href = document.location.pathname;
                }, function (resp) {
                    alert('שגיאה בעת התנתקות');
                    document.location.reload(true);
                });
        };

        $rootScope.globalMethods.login = function () {
            $rootScope.globalData.errorMessage = null;
            sportUtils.Login($q, $http, $rootScope.globalModel.username, $rootScope.globalModel.password).then(function(user) {
                document.location.reload(true);
            }, function(err) {
                $rootScope.globalData.errorMessage = err;
            });
        };
    }

    function ManageBreadcrumbsCtrl($scope) {

    }

    function ManageTabsCtrl($scope, $http, $state) {
        $scope.tabs = [];
        $scope.IsMobileDevice = sportUtils.IsMobile();

        function AddTab(state, description, authorizedRoles) {
            if ($scope.LoggedInUser && $scope.LoggedInUser.role && authorizedRoles.indexOf($scope.LoggedInUser.role) >= 0) {
                var listItemStyle = 'padding: 5px 5px 5px 5px;';
                var linkStyle = '';
                if (state == $scope.sender) {
                    listItemStyle += ' background-color: #00ADEE;';
                    linkStyle = 'color: white;';
                }
                var link = '';
                if (state.indexOf('#page-') == 0) {
                    var pageSeq = parseInt(state.replace('#page-', ''));
                    if (!isNaN(pageSeq)) {
                        link = '#/page/' + pageSeq;
                        state = '';
                    }
                }
                $scope.tabs.push({
                    ListItemStyle: listItemStyle,
                    LinkStyle: linkStyle,
                    State: state,
                    Link: link,
                    Description: description
                });
            }
        }

        sportUtils.VerifyUser($http, $scope, [2, 3], function(resp) {
            if ($scope.Unauthorized != true) {
                $http.get('/api/common/content-mapping').then(function(resp) {
                    var downloadSeq = 0;
                    if (resp.data && resp.data.Admin) {
                        downloadSeq = resp.data.Admin.Downloads || 0;
                    }
                    AddTab('pages.manage', 'ניהול עמודי תוכן', [1, 3]);
                    AddTab('register', 'רישום קבוצות ושחקנים', [2]);
                    AddTab('banners', 'ניהול פרסומות', [1, 3]);
                    AddTab('reports', 'דו"חות', [1]);
                    AddTab('edit-results', 'הזנת תוצאות משחקים', [1, 2]);
                    AddTab('upya-manage', 'מחנות אימון', [1]);
                    if ($scope.LoggedInUser.isClubUser)
                        AddTab('club-register', 'טופס רישום מועדון', [2]);
                    AddTab('pages.regions', 'מחוזות', [1]);
                    if (downloadSeq > 0) {
                        // AddTab('#page-' + downloadSeq, 'הורדות', [1]);
                        AddTab('article({page: ' + downloadSeq + '})', 'הורדות', [1]);
                    }
                    var selectedIndex = $scope.tabs.findIndex(function(x) {
                        return x.LinkStyle == 'color: white;';
                    });
                    window.setTimeout(function() {
                        document.getElementById('ddlMobileManageMenu').selectedIndex = selectedIndex + 1;
                    }, 500);
                });
            }

            //http://localhost:5000/sport/club-register-form.html?s=640086
        });

        $scope.mobileMenuChanged = function() {
            var selectedItem = $('#ddlMobileManageMenu').find(":selected");
            var state = selectedItem.data('state');
            var link = selectedItem.data('link');
            if (state) {
                $state.go(state);
            } else if (link) {
                document.location.href = link;
            }
        };
    }
})();


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


(function() {
    'use strict';

    angular
        .module('components', []);
})();


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


(function() {
    'use strict';

    angular
        .module('sport.reports', [
            'components',
            'ui.router'
        ])
        .config(['$stateProvider', function ($stateProvider) {
            $stateProvider
                .state('reports', {
                    url: '/reports',
                    views: {
                        "main@": {
                            templateUrl: 'views/reports.html',
                            controller: 'ReportsController'
                        }
                    }
                });
        }]);
})();


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


angular.module('sport')
    .directive('calendar', function() {
        return {
            restrict: 'E',
            scope: {
                calendar: "=source"
            },
            templateUrl: 'views/calendar.html'
        };
    });

(function() {
    'use strict';

    angular
        .module('sport')
        .factory('calendarService', [calendarService]);

    function calendarService() {
        var monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי",
            "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        var monthMapping = {};

        function getItemDate(item) {
            if (item.getDate) {
                return item.getDate();
            }
            if (item.date) {
                return item.date;
            }
            if (item.Date) {
                return item.Date;
            }

            return null;
        }

        function CalendarMonth(year, month) {
            this.year = year;
            this.month = month;
            this.monthName = monthNames[month];
            this.weeks = [];
            this.hasItems = false;
            this.itemsCount = 0;

            var d = new Date(year, month, 1);
            d.setDate(d.getDate() - d.getDay());
            var dayMonth = d.getMonth();
            for (var w = 0; w < 6; w++) {
                var week = {
                    days: [],
                    currentMonth: false
                };

                for (var i = 0; i < 7; i++) {
                    if (dayMonth == month) {
                        week.currentMonth = true;
                    }
                    var day = d.getDate();
                    week.days.push({
                        year: year,
                        month: month,
                        day: day,
                        items: [],
                        currentMonth: dayMonth == month
                    });
                    d.setDate(d.getDate() + 1);
                    dayMonth = d.getMonth();
                }
                this.weeks.push(week);
            }
        }

        Calendar.prototype.BuildDayEvents = function(day, month, year) {
            function BuildEventTitle(dailyEvent)  {
                var name = '', details = '';
                if (dailyEvent.SPORT_ID == sportGlobalSettings.FlowersFieldSeq) {
                    name = 'פרחי ספורט ' + dailyEvent.SportFieldName;
                    details = dailyEvent.FacilityName;
                } else {
                    name = dailyEvent.CHAMPIONSHIP_NAME + ' ' + dailyEvent.CATEGORY_NAME;
                    details = eventsUtils.BuildSportsmanDetails(dailyEvent);
                }
                return [name, details].join(', ');
            }

            var sportFieldMapping = {};
            this.events.filter(function(x) {
                return x.Date.getDate() == day && x.Date.getMonth() == month && x.Date.getFullYear() == year;
            }).forEach(function(curEvent) {
                var key = curEvent.SPORT_ID.toString();
                var existingEvent = sportFieldMapping[key];
                if (existingEvent) {
                    existingEvent.DailyEvents.push(curEvent);
                } else {
                    curEvent.DailyEvents = [curEvent];
                    sportFieldMapping[key] = curEvent;
                }
            });

            var dailyEvents = [];
            var eventsCounter = 0;
            for (var sportField in sportFieldMapping) {
                var curBgColor = contentUtils.getSportFieldColor(parseInt(sportField));
                var curRight = 3 + (eventsCounter * 10);
                var curDailyEvent = sportFieldMapping[sportField];
                curDailyEvent.style = 'right: ' + curRight + 'px; background-color: ' + curBgColor + ';';
                curDailyEvent.title = BuildEventTitle(curDailyEvent);
                dailyEvents.push(curDailyEvent);
                eventsCounter++;
            }

            return dailyEvents;
        };

        CalendarMonth.prototype.getDay = function (day) {
            for (var w = 0; w < this.weeks.length; w++) {
                var week = this.weeks[w];
                for (var d = 0; d < week.days.length; d++) {
                    if (week.days[d].currentMonth && week.days[d].day == day) {
                        return week.days[d];
                    }
                }
            }
        };

        CalendarMonth.prototype.addItem = function (item) {
            var date = getItemDate(item);
            if (!date || date.getFullYear() !== this.year || date.getMonth() !== this.month) {
                return false;
            }

            this.hasItems = true;
            this.itemsCount++;

            var dateDay = date.getDate();
            var day = this.getDay(dateDay);
            if (day) {
                day.items.push(item);
                return day;
            }

            return null;
        };

        function CalendarYear(year) {
            this.year = year;
            this.months = [];
        }

        CalendarYear.prototype.makeMonth = function (month) {
            if (this.months.length == 0) {
                var calendarMonth = new CalendarMonth(this.year, month);
                this.months = [calendarMonth];
                return calendarMonth;
            }

            while (this.months[0].month > month) {
                this.months.splice(0, 0, new CalendarMonth(this.year, this.months[0].month - 1));
            }

            while (this.months[this.months.length - 1].month < month) {
                this.months.push(new CalendarMonth(this.year, this.months[this.months.length - 1].month + 1));
            }

            return this.months[month - this.months[0].month];
        };

        function Calendar(events, selectedDate) {
            this.years = [];
            this.events = events.filter(function(x) { return true; });
            this.selectedDate = selectedDate;
        }

        Calendar.prototype.makeMonth = function (year, month) {
            if (this.years.length == 0) {
                var calendarYear = new CalendarYear(year);
                this.years = [calendarYear];
                return calendarYear.makeMonth(month);
            }

            while (this.years[0].year > year) {
                this.years[0].makeMonth(0);
                var calendarYear = new CalendarYear(this.years[0].year - 1);
                calendarYear.makeMonth(11);
                this.years.splice(0, 0, calendarYear);
            }

            while (this.years[this.years.length - 1].year < year) {
                this.years[this.years.length - 1].makeMonth(11);
                var calendarYear = new CalendarYear(this.years[this.years.length - 1].year + 1);
                calendarYear.makeMonth(0);
                this.years.push(calendarYear);
            }

            var calendarYear = this.years[year - this.years[0].year];
            return calendarYear.makeMonth(month);
        };

        Calendar.prototype.getMonth = function (yearOrIndex, month) {
            if (this.years.length > 0) {
                if (month !== undefined) {
                    if (yearOrIndex >= this.years[0].year &&
                        yearOrIndex <= this.years[this.years.length - 1].year) {
                        var calendarYear = this.years[yearOrIndex - this.years[0].year];
                        if (calendarYear.months.length > 0 &&
                            month >= calendarYear.months[0].month &&
                            month <= calendarYear.months[calendarYear.months.length - 1].month) {
                            return calendarYear.months[month - calendarYear.months[0].month];
                        }
                    }
                }
                else {
                    var index = 0;
                    while (index < this.years.length && yearOrIndex >= 0) {
                        if (yearOrIndex < this.years[index].months) {
                            return this.years[index].months[yearOrIndex];
                        }
                        yearOrIndex -= this.years[index].months;
                        index++;
                    }
                }
            }
            return null;
        };

        Calendar.prototype.addItem = function (item) {
            var date = getItemDate(item);
            if (date) {
                return this.makeMonth(date.getFullYear(), date.getMonth()).addItem(item);
            }
            return null;
        };

        Calendar.prototype.addItems = function (items, callback) {
            for (var i = 0; i < items.length; i++) {
                var day = this.addItem(items[i]);
                if (day) {
                    callback(day, items[i]);
                }
            }
            for (var y = 0; y < this.years.length; y++) {
                var curYear = this.years[y];
                for (var m = 0; m < curYear.months.length; m++) {
                    var curMonth = curYear.months[m];
                    var key = curMonth.month.toString() + '_' + curMonth.year.toString();
                    monthMapping[key] = curMonth;
                    for (var w = 0; w < curMonth.weeks.length; w++) {
                        var curWeek = curMonth.weeks[w];
                        for (var d = 0; d < curWeek.days.length; d++) {
                            var curDay = curWeek.days[d];
                            curDay.events = curDay.currentMonth ? this.BuildDayEvents(curDay.day, curDay.month, curDay.year) : [];
                        }
                    }
                }
            }
        };

        Calendar.prototype.selectMonth = function (calendarMonthOrYear, month) {
            if (month !== undefined) {
                var calendarMonth = this.getMonth(calendarMonthOrYear, month);
                if (calendarMonth) {
                    this.selectMonth(calendarMonth);
                }
            }
            else if (calendarMonthOrYear) {
                if (this.selectedMonth) {
                    this.selectedMonth.selected = false;

                    if (this.selectedDay) {
                        this.selectedDay.selected = false;
                        this.selectedDay = null;
                    }
                }
                this.selectedMonth = calendarMonthOrYear;
                calendarMonthOrYear.selected = true;
            }
            else {
                if (this.selectedDate) {
                    var dateToSelect = this.selectedDate;
                    var year = dateToSelect.getFullYear();
                    var month = dateToSelect.getMonth();
                    var monthForSelection = this.getMonth(year, month);
                    if (!monthForSelection) {
                        monthForSelection = this.getMonth(0);
                    }
                    if (monthForSelection) {
                        this.selectMonth(monthForSelection);
                    }
                }
            }
        };

        Calendar.prototype.selectDay = function (day) {
            if (!this.selectedMonth || this.selectedMonth.year != day.year || this.selectedMonth.month != day.month) {
                this.selectMonth(day.year, day.month);
            }
            if (this.selectedDay) {
                this.selectedDay.selected = false;
            }
            this.selectedDay = day;
            day.selected = true;
        };

        Calendar.prototype.clearDaySelection = function () {
            if (this.selectedDay) {
                this.selectedDay.selected = false;
                this.selectedDay = null;
            }
        };

        Calendar.prototype.nextMonth = function () {
            var monthItem = {'year': 0};
            if (this.selectedMonth) {
                var month = this.selectedMonth.month + 1;
                var year = this.selectedMonth.year;
                if (month >= 12) {
                    month = 0;
                    year++;
                }
                var key = month.toString() + '_' + year.toString();
                if (monthMapping[key])
                    monthItem = monthMapping[key];
            }
            return monthItem;
        };

        Calendar.prototype.selectNextMonth = function () {
            var monthItem = this.nextMonth();
            if (monthItem.year > 0)
                this.selectMonth(monthItem);
        };

        Calendar.prototype.prevMonth = function () {
            var monthItem = {'year': 0};
            if (this.selectedMonth) {
                var month = this.selectedMonth.month - 1;
                var year = this.selectedMonth.year;
                if (month < 0) {
                    month = 11;
                    year--;
                }
                var key = month.toString() + '_' + year.toString();
                if (monthMapping[key])
                    monthItem = monthMapping[key];
            }
            return monthItem;
        };

        Calendar.prototype.selectPrevMonth = function () {
            var monthItem = this.prevMonth();
            if (monthItem.year > 0)
                this.selectMonth(monthItem);
        };

        Calendar.prototype.setCurrent = function (day) {
            if (this.currentMonth) {
                this.currentMonth.currentSelection = false;
            }
            if (this.currentDay) {
                this.currentDay.currentSelection = false;
            }
            this.currentMonth = this.getMonth(day.year, day.month);
            if (this.currentMonth) {
                this.currentMonth.currentSelection = true;
            }
            this.currentDay = day;
            this.currentDay.currentSelection = true;
        };

        function createCalendar(events, selectedDate) {
            return new Calendar(events, selectedDate);
        }

        return {
            create: createCalendar
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ChampionshipSelectionCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$q', 'messageBox', 'sportField', 'schoolData', 'allSeasons', 'allRegions', 'options', 'ChampionshipsService', 'SportService', 'EventsService', ChampionshipSelectionCtrl]);

    function ChampionshipSelectionCtrl($scope, $http, $uibModalInstance, $filter, $q, messageBox, sportField, schoolData, allSeasons, allRegions, options,
            ChampionshipsService, SportService, EventsService) {
        var CHAMPIONSHIP_TYPE = {Empty: 0, Clubs: 1, NonClub: 2};
        var championshipsPerRow = 3, categoriesPerRow = 3;
        var loadOnce = {Championship: '', Category: 0};
        var flowersFieldSeq = sportGlobalSettings.FlowersFieldSeq;
        var isFlowers = sportField != null && sportField.Seq == flowersFieldSeq;
        if (sportField != null) {
            $scope.title = 'בחירת ';
            $scope.title += sportField.Seq == sportGlobalSettings.FlowersFieldSeq ? 'אירוע' : 'אליפות';
            $scope.title += ' ' + sportField.Name;
        } else if (schoolData != null) {
            $scope.title = 'בחירת אליפות ';
            if (schoolData.ClubsOnly)
                $scope.title += 'מועדונים ';
            $scope.title += 'עבור ' + schoolData.Name
        }
        $scope.selected = {Season: 0, Type: 0, Region: 0, Championship: 0, Category: 0, SportField: 0};
        $scope.loading = false;
        $scope.flowersFieldSeq = flowersFieldSeq;
        $scope.isFlowers = isFlowers;
        $scope.schoolTeamSelection = (sportField == null && schoolData != null);
        $scope.data = {
            'Seasons': allSeasons,
            'Regions': allRegions,
            'Championships': {'All': [], 'Rows': []},
            'Categories': {'All': [], 'Rows': []},
            'Types': [
                {Name: 'מועדון ספורט בית סיפרי', Value: CHAMPIONSHIP_TYPE.Clubs},
                {Name: 'אירועי ספורט משרד החינוך', Value: CHAMPIONSHIP_TYPE.NonClub}
            ]
        };
        $scope.cancelCaption = options && options.cancelCaption ? options.cancelCaption : 'ביטול';
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';
        if (allRegions != null && allRegions.findIndex(function(x) { return x.Id == 0; }) < 0) {
            allRegions.push({
                'Id': 0,
                'Name': 'אליפויות ארציות'
            });
            allRegions.sort(function(r1, r2) {
                return r1.Id - r2.Id;
            });
        }

        contentUtils.InitSportFieldColors($http);

        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;

        if (schoolData != null && sportField == null) {
            $scope.data.Types = null;
        }

        if (options.amount) {
            window.setTimeout(function () {
                $(".rating-" + options.amount).click();
            }, 500);
        }

        function ApplyDefaultCategory() {
            var deferred = $q.defer();
            if (options.category) {
                if (isFlowers) {
                    deferred.resolve({
                        Championship: options.EventName,
                        Category: options.category
                    });
                } else {
                    $http.get('/api/sportsman/category-data?category=' + options.category).then(function (resp) {
                        var seasonCode = resp.data.SEASON;
                        var champType = resp.data.IS_CLUBS == 1 ? CHAMPIONSHIP_TYPE.Clubs : CHAMPIONSHIP_TYPE.NonClub;
                        var categoryRegion = resp.data.REGION_ID;
                        var categoryChampName = resp.data.CHAMPIONSHIP_NAME;
                        var categorySportID = resp.data.SPORT_ID;
                        SportService.seasons.inUse().then(function (seasonsInUse) {
                            var categorySeason = seasonsInUse.findItem(function (x) {
                                return x.SeasonCode == seasonCode;
                            }).Season;
                            if ($scope.data.Seasons) {
                                $scope.selected.Season = $scope.data.Seasons.findItem(function (x) {
                                    return x.Season == categorySeason;
                                });
                            }
                            if ($scope.data.Types) {
                                $scope.selected.Type = $scope.data.Types.findItem(function (x) {
                                    return x.Value == champType;
                                });
                            }
                            if ($scope.data.Regions) {
                                $scope.selected.Region = $scope.data.Regions.findItem(function (x) {
                                    return x.Id == categoryRegion;
                                });
                            }
                            deferred.resolve({
                                Championship: categoryChampName,
                                SportField: categorySportID,
                                Category: options.category
                            });
                        });
                    }, function(err) {
                        deferred.reject(err);
                    });
                }
            } else {
                deferred.resolve(null);
            }
            return deferred.promise;
        }

        ApplyDefaultCategory().then(function(catData) {
            if (catData != null) {
                loadOnce.Championship = catData.Championship;
                loadOnce.Category = catData.Category;
                loadOnce.SportId = catData.SportField;
                ReloadChampionships();
            }
        });

        function ApplyChampionshipCategories() {
            $scope.data.Categories.Rows = [];
            if ($scope.selected.Championship && $scope.selected.Championship.Name) {
                var matchingCategories = $scope.data.Categories.All.filter(function (x) {
                    return x.Championship == $scope.selected.Championship.Name;
                });
                var categoryRows = sportUtils.SplitArray(matchingCategories, categoriesPerRow);
                if (categoryRows.length > 0) {
                    var lastRow = categoryRows[categoryRows.length - 1];
                    var blankItemsCount = categoriesPerRow - lastRow.length;
                    for (var i = 0; i < blankItemsCount; i++) {
                        lastRow.push({
                            'SportField': 0,
                            'Name': 'Blank_' + (i + 1)
                        });
                    }

                    for (var i = 0; i < categoryRows.length; i++) {
                        var currentRow = categoryRows[i];
                        currentRow.sort(function (c1, c2) {
                            return c1.SportField - c2.SportField;
                        });
                    }
                }
                $scope.data.Categories.Rows = categoryRows;
                if (loadOnce.Category > 0) {
                    var matchingCategory = $scope.data.Categories.All.findItem(function(x) { return x.CategoryId == loadOnce.Category; });
                    if (matchingCategory != null) {
                        $scope.selectCategory(matchingCategory);
                    }
                    loadOnce.Category = 0;
                }
            }
        }

        function AssignChampionshipRows() {
            var matchingChampionships = [];
            if (schoolData == null) {
                matchingChampionships = $scope.data.Championships.All;
            } else {
                var selectedSportField = $scope.selected.SportField ? $scope.selected.SportField.Seq : 0;
                matchingChampionships = $scope.data.Championships.All.filter(function(x) {
                    return x.SportField == selectedSportField;
                });
            }
            var championshipRows = sportUtils.SplitArray(matchingChampionships, championshipsPerRow);
            if (championshipRows.length > 0) {
                var lastRow = championshipRows[championshipRows.length - 1];
                var blankItemsCount = championshipsPerRow - lastRow.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    lastRow.push({
                        'SportField': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                for (var i = 0; i < championshipRows.length; i++) {
                    var currentRow = championshipRows[i];
                    currentRow.sort(function (c1, c2) {
                        return c1.SportField - c2.SportField;
                    });
                }
            }
            $scope.data.Championships.Rows = championshipRows;
            if (loadOnce.Championship.length > 0) {
                if (loadOnce.SportId) {
                    var matchingSportField = $scope.data.SportFields.All.findItem(function (x) {
                        return x.Seq == loadOnce.SportId;
                    });
                    loadOnce.SportId = 0;
                    if (matchingSportField != null) {
                        $scope.selectSportField(matchingSportField);
                    }
                }
                var matchingChampionship = $scope.data.Championships.All.findItem(function (x) {
                    return x.Name == loadOnce.Championship;
                });
                if (matchingChampionship != null) {
                    $scope.selectChampionship(matchingChampionship);
                }
                loadOnce.Championship = '';
            }
        }

        function ReloadChampionships()  {
            function GetAllChampionships(champType, season, region) {
                var deferred = $q.defer();
                if (isFlowers) {
                    EventsService.sportFlowersEvents().then(function(sportFlowersEvents) {
                        var sportFlowersChampionships = championshipsUtils.convertSportFlowersChampionships(sportFlowersEvents, $filter);
                        deferred.resolve(sportFlowersChampionships);
                    }, function(err) {
                        deferred.reject(err);
                    });
                } else {
                    if (schoolData != null) {
                        ChampionshipsService.read({
                            'school': schoolData.Symbol
                        }).then(function (championships) {
                            var allChampionships = championships.slice(0);
                            if (schoolData.ClubsOnly) {
                                allChampionships = allChampionships.filter(function(x) {
                                    return x.IS_CLUBS == 1;
                                });
                            } else {
                                allChampionships = allChampionships.filter(function(x) {
                                    return x.IS_CLUBS != 1;
                                });
                            }
                            if (schoolData.ExcludedCategories) {
                                var excludeMapping = schoolData.ExcludedCategories.toAssociativeArray();
                                allChampionships = allChampionships.filter(function(x) {
                                    var key = x.CHAMPIONSHIP_CATEGORY_ID.toString();
                                    return !excludeMapping[key];
                                });
                            }
                            deferred.resolve(allChampionships);
                        }, function (err) {
                            deferred.reject(err);
                        });
                    } else if (sportField != null) {
                        if (season && champType && region != null) {
                            ChampionshipsService.read({
                                'season': season,
                                'region': region,
                                'omitEmpty': 0
                            }).then(function (championships) {
                                var clubsValue = champType == CHAMPIONSHIP_TYPE.Clubs ? 1 : 0;
                                var allChampionships = championships.slice(0).filter(function (x) {
                                    return x.SPORT_ID == sportField.Seq && x.IS_CLUBS == clubsValue;
                                });
                                deferred.resolve(allChampionships);
                            }, function (err) {
                                deferred.reject(err);
                            });
                        } else {
                            deferred.resolve([]);
                        }
                    } else {
                        deferred.resolve([]);
                    }
                }
                return deferred.promise;
            }

            $scope.data.Championships.All = [];
            $scope.data.Championships.Rows = [];
            $scope.data.Categories.All = [];
            $scope.data.Categories.Rows = [];
            var season = $scope.selected.Season ? $scope.selected.Season.Season : 0;
            var champType = $scope.selected.Type ? $scope.selected.Type.Value : CHAMPIONSHIP_TYPE.Empty;
            var region = $scope.selected.Region ? $scope.selected.Region.Id : null;
            $scope.loading = true;
            GetAllChampionships(champType, season, region).then(function(allChampionships) {
                $scope.loading = false;
                if (allChampionships && allChampionships.length > 0) {
                    if (schoolData != null) {
                        $scope.data.SportFields = {All: [], Rows: []};
                        for (var i = 0; i < allChampionships.length; i++) {
                            var curChamp = allChampionships[i];
                            if ($scope.data.SportFields.All.findItem(function (x) {
                                    return x.Seq == curChamp.SPORT_ID;
                                }) == null) {
                                $scope.data.SportFields.All.push({
                                    Seq: curChamp.SPORT_ID,
                                    Name: curChamp.SPORT_NAME
                                });
                            }
                        }
                        var sportFieldRows = sportUtils.SplitArray($scope.data.SportFields.All, championshipsPerRow);
                        if (sportFieldRows.length > 0) {
                            var lastRow = sportFieldRows[sportFieldRows.length - 1];
                            var blankItemsCount = championshipsPerRow - lastRow.length;
                            for (var i = 0; i < blankItemsCount; i++) {
                                lastRow.push({
                                    'Seq': 0,
                                    'Name': 'Blank_' + (i + 1)
                                });
                            }

                            for (var i = 0; i < sportFieldRows.length; i++) {
                                var currentRow = sportFieldRows[i];
                                currentRow.sort(function (c1, c2) {
                                    return c1.Seq - c2.Seq;
                                });
                            }
                        }
                        $scope.data.SportFields.Rows = sportFieldRows;
                    }
                    var championshipSportFieldMapping = allChampionships.toAssociativeArray(true, 'CHAMPIONSHIP_NAME', 'SPORT_ID');
                    var categoryMapping = {};
                    $scope.data.Championships.All = sportUtils.DistinctArray(allChampionships.map(function (x) {
                        return x.CHAMPIONSHIP_NAME;
                    })).map(function (champName) {
                        return {
                            'Name': champName,
                            'SportField': championshipSportFieldMapping[champName]
                        };
                    });
                    if (options.show_championship_remarks) {
                        var championshipIDs = allChampionships.map(function(x) {
                            return x.CHAMPIONSHIP_ID;
                        }).distinct();
                        var url = '/api/sportsman/championship-remarks?championships=' + championshipIDs.join(',');
                        $http.get(url).then(function(resp) {
                            var remarkMapping = resp.data.toAssociativeArray(null, 'CHAMPIONSHIP_NAME', 'REMARKS');
                            $scope.data.Championships.All.forEach(function(championship) {
                                championship.Remarks = remarkMapping[championship.Name];
                            });
                        }, function(err) {
                            console.log('error reading championship remarks');
                        });
                    }
                    for (var i = 0; i < allChampionships.length; i++) {
                        var curChampionship = allChampionships[i];
                        var curName = curChampionship.CATEGORY_NAME;
                        var champName = curChampionship.CHAMPIONSHIP_NAME;
                        var key = curChampionship.CHAMPIONSHIP_ID + '_' + curName;
                        if (!categoryMapping[key]) {
                            $scope.data.Categories.All.push({
                                'Name': curName,
                                'Championship': champName,
                                'ChampionshipId': curChampionship.CHAMPIONSHIP_ID,
                                'SportField': curChampionship.SPORT_ID,
                                'CategoryId': curChampionship.CHAMPIONSHIP_CATEGORY_ID,
                                'Remarks': curChampionship.Remarks
                            });
                            categoryMapping[key] = true;
                        }
                    }
                    AssignChampionshipRows();
                }
            }, function(err) {
                $scope.loading = false;
                console.log('error loading championships')
                console.log(err);
            });
        }

        function ApplyCurrentSeason() {
            if ($scope.data.Seasons) {
                var currentSeasons = $scope.data.Seasons.filter(function (x) {
                    return x.IsCurrent;
                });
                if (currentSeasons.length == 0)
                    currentSeasons = [$scope.data.Seasons.lastItem()];
                $scope.selected.Season = currentSeasons[0];
            }
            ReloadChampionships();
        }

        if (!options.category) {
            ApplyCurrentSeason();
        }

        if (sportField != null && sportField.Seq == flowersFieldSeq) {
            ReloadChampionships();
        }

        $scope.getSportFieldFilterStyle = function(champOrSportField) {
            var sportFieldSeq = champOrSportField.SportField || champOrSportField.Seq;
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            return sportUtils.getRoundedRectangleStyle(champOrSportField, bgColor);
        };

        $scope.dataChanged = function(sender) {
            ReloadChampionships();
        };

        $scope.selectChampionship = function(championship) {
            if ($scope.selected.Championship)
                $scope.selected.Championship.Selected = false;
            if ($scope.selected.Category) {
                $scope.selected.Category.Selected = false;
                $scope.selected.Category = 0;
            }
            $scope.data.RegisteredTeamsCount = 0;
            championship.Selected = true;
            $scope.selected.Championship = championship;
            ApplyChampionshipCategories();
        };

        $scope.selectSportField = function(sportField) {
            if ($scope.selected.SportField)
                $scope.selected.SportField.Selected = false;
            if ($scope.selected.Championship) {
                $scope.selected.Championship.Selected = false;
                $scope.selected.Championship = 0;
            }
            if ($scope.selected.Category) {
                $scope.selected.Category.Selected = false;
                $scope.selected.Category = 0;
            }
            $scope.data.RegisteredTeamsCount = 0;
            $scope.data.Categories.Rows = [];
            sportField.Selected = true;
            $scope.selected.SportField = sportField;
            AssignChampionshipRows();
        };

        $scope.selectCategory = function(category) {
            if ($scope.selected.Category)
                $scope.selected.Category.Selected = false;
            category.Selected = true;
            $scope.selected.Category = category;
            if (schoolData != null && schoolData.Teams) {
                var key = category.CategoryId.toString();
                var registeredTeams = schoolData.Teams[key] || [];
                $scope.data.RegisteredTeamsCount = registeredTeams.length;
            }
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            function HebrewTeamCount(teamsAmount) {
                if (teamsAmount == 1)
                    return 'קבוצה אחת';
                return teamsAmount + ' קבוצות';
            }

            function GetTeamsAmount() {
                var teamsAmount = parseInt($('#TeamsAmount').find('.selected-rating').text());
                if (isNaN(teamsAmount) || teamsAmount <= 0)
                    teamsAmount = 1;
                if (teamsAmount > 5)
                    teamsAmount = 5;
                return teamsAmount;
            }

            if ($scope.selected.Category) {
                if (schoolData == null) {
                    $uibModalInstance.close($scope.selected.Category);
                } else {
                    var teamsAmount = GetTeamsAmount();
                    if (schoolData.NoConfirmation) {
                        $uibModalInstance.close({
                            Category: $scope.selected.Category,
                            Amount: teamsAmount
                        });
                    } else {
                        var msg = 'נא לאשר רישום ' + HebrewTeamCount(teamsAmount) + ' ל' + $scope.selected.Championship.Name + ', ' + $scope.selected.Category.Name;
                        messageBox.ask(msg).then(function () {
                            $uibModalInstance.close({
                                Category: $scope.selected.Category,
                                Amount: teamsAmount
                            });
                        });
                    }
                }

            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('components')
        .controller('DateSelectorCtrl', ['$scope', '$uibModalInstance', 'calendar', 'options', DateSelectorCtrl])
        .factory('dateSelector', ['$uibModal', dateSelector]);

    function DateSelectorCtrl($scope, $uibModalInstance, calendar, options) {
        $scope.calendar = calendar;
        $scope.selectedDate = new Date();
        $scope.title = options && options.title ? options.title : 'בחירת תאריך';

        if (options) {
            $scope.subTitle = options.subTitle;
            $scope.info = options.info;
            if (options.selectedDate)
                $scope.selectedDate = options.selectedDate;
        }
        $scope.cancelCaption = options && options.cancelCaption ? options.cancelCaption : 'ביטול';
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';

        if (!$scope.calendar.selectedMonth) {
            $scope.calendar.selectMonth();
        }

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            if ($scope.calendar.selectedDay) {
                $uibModalInstance.close($scope.calendar.selectedDay);
            }
        };

        $scope.getDaysDiff = function (day) {
            var date = new Date();
            date.setDate(day.day);
            date.setMonth(day.month);
            date.setFullYear(day.year);
            var now = new Date();
            var diff = date.getTime() - now.getTime();
            var daysDiff = parseInt(diff / (1000 * 3600 * 24));
            return daysDiff;
        };

        $scope.dayClicked = function (day) {
            calendar.selectDay(day);
        };

        $scope.generateDayClass = function (day) {
            var arrClasses = [];
            if (day.currentMonth)
                arrClasses.push('current');
            if (day.selected) {
                arrClasses.push('bg-primary');
            } else {
                if (day.day == $scope.selectedDate.getDate() && day.month == $scope.selectedDate.getMonth() && day.year == $scope.selectedDate.getFullYear()) {
                    arrClasses.push('bg-info');
                } else if (day.currentSelection && !day.selected) {
                    arrClasses.push('bg-success');
                }
            }
            if (day.currentMonth && day.items.length > 0)
                arrClasses.push('enabled');
            return arrClasses.join(' ');
        }
    }

    function dateSelector($uibModal) {
        function select(calendar, options) {
            return $uibModal.open({
                templateUrl: 'views/date-selector.html',
                controller: 'DateSelectorCtrl',
                resolve: {
                    calendar: function () {
                        return calendar;
                    },
                    options: function () {
                        return options;
                    }
                }
            }).result;
        }

        return {
            select: select
        }
    }
})();
var eventsUtils = {
    BuildTeamName: function(sportsmanEvent, teamLetter) {
        var schoolProp = teamLetter ? 'Team' + teamLetter + '_School' : 'SCHOOL_NAME';
        var cityProp = teamLetter ? 'Team' + teamLetter + '_City' : 'CITY_NAME';
        var indexProp = teamLetter ? 'Team' + teamLetter + '_Index' : 'TEAM_INDEX';
        var schoolName = sportsmanEvent[schoolProp];
        var cityName = sportsmanEvent[cityProp];
        var teamIndex = indexProp.length > 0 ? sportUtils.GetHebrewLetter(sportsmanEvent[indexProp]) : '';
        var teamName = schoolName + '';
        if (cityName && cityName.length > 0 && teamName.indexOf(cityName) < 0)
            teamName += ' ' + cityName;
        if (teamIndex.length > 0)
            teamName += " " + teamIndex + "'";
        if (teamName.indexOf('-') > 0)
            teamName = teamName.replace('-', ' - ');
        return teamName;
    },
    BuildGameDetails: function(sportsmanEvent) {
        //, sportsmanEvent.GROUP_NAME
        return [
            sportsmanEvent.PHASE_NAME, sportsmanEvent.ROUND_NAME, sportsmanEvent.CYCLE_NAME,
            sportsmanEvent.SPORT_FIELD_NAME
        ].filter(function (x) {
                return x != null && x.length > 0;
            }).join(', ');
    },
    BuildSportsmanDetails: function(sportsmanEvent) {
        if (sportsmanEvent.ChampionshipType == 2) {
            return sportsmanEvent.SPORT_FIELD_NAME;
        }

        if (!sportsmanEvent.DailyEvents || sportsmanEvent.DailyEvents.length < 2) {
            var team_A = eventsUtils.BuildTeamName(sportsmanEvent, 'A');
            var team_B = eventsUtils.BuildTeamName(sportsmanEvent, 'B');
            return team_A + ' מול ' + team_B;
        }

        var firstMatch = sportsmanEvent.DailyEvents[0];
        var firstPhase = firstMatch.PHASE_NAME, firstRound = firstMatch.ROUND_NAME, firstCycle = firstMatch.CYCLE_NAME;
        var samePhase = true, sameRound = true, sameCycle = true;
        for (var i = 1; i < sportsmanEvent.DailyEvents.length; i++) {
            var curDailyEvent = sportsmanEvent.DailyEvents[i];
            if (curDailyEvent.PHASE_NAME != firstPhase)
                samePhase = false;
            if (curDailyEvent.ROUND_NAME != firstRound)
                sameRound = false;
            if (curDailyEvent.CYCLE_NAME != firstCycle)
                sameCycle = false;
        }
        if (samePhase && sameRound && sameCycle)
            return [firstPhase, firstRound, firstCycle].join(', ');
        else if (samePhase && sameRound)
            return [firstPhase, firstRound].join(', ');
        else if (samePhase)
            return firstPhase;
        var lastPhase = sportsmanEvent.DailyEvents.lastItem().PHASE_NAME;
        return firstPhase + ' עד ' + lastPhase;
    }
};

(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ImageCropperCtrl', ['$scope', '$http', '$uibModal', '$uibModalInstance', 'title', 'pageSeq', 'sourceDirectory', 'imageData', 'ratio', 'canvas', 'metaData', 'existingImages', ImageCropperCtrl]);

    function ImageCropperCtrl($scope, $http, $uibModal, $uibModalInstance, title, pageSeq, sourceDirectory, imageData, ratio, canvas, metaData, existingImages) {
        if (typeof sourceDirectory == 'undefined' || sourceDirectory == null || !sourceDirectory)
            sourceDirectory = 'Images';
        $scope.existingImages = existingImages.map(function(x) { return x.FileName; });
        window['CropperImageRatio'] = {Width: ratio.Width, Height: ratio.Height};
        window['CropperImagePath'] = '/content/' + sourceDirectory + '/' + pageSeq + '/' + imageData.FileName;
        window['CropperImageData'] = (metaData && metaData.Width) ? metaData : null;
        if (canvas && canvas.Width > 0 && canvas.Height > 0) {
            window['CropperCanvasWidth'] = canvas.Width;
            window['CropperCanvasHeight'] = canvas.Height;
        }

        $scope.title = title;
        $scope.loading = false;

        function StoreCroppedImage(rawData, X, Y, Width, Height) {
            var aspectRatio = ratio.Width + 'x' + ratio.Height;
            var metaData = [X, Y, Width, Height].join(',');
            window['CropperImage_Crop_Now'] = null;
            $http.post('/api/images/crop', {
                Data: rawData,
                Seq: imageData.Seq,
                AspectRatio: aspectRatio,
                MetaData: metaData
            }).then(function(resp) {
                var croppedImageName = (resp.data && resp.data.length > 0) ? resp.data[0] : '';
                $scope.loading = false;
                $uibModalInstance.close({'ImageName': croppedImageName, 'X': X, 'Y': Y, 'Width': Width, 'Height': Height});
            }, function(err) {
                $scope.loading = false;
                console.log('error cropping image:');
                console.log(err);
                alert('שגיאה בעת שמירת נתונים, נא לנסות שוב מאוחר יותר');
            });
        }

        $scope.changePicture = function() {
            $uibModal.open({
                templateUrl: 'views/thumbnail-selection.html',
                controller: 'ThumbnailSelectionCtrl',
                resolve: {
                    pageSeq: function() {
                        return pageSeq;
                    },
                    images: function () {
                        return $scope.existingImages;
                    }
                }
            }).result.then(function (resp) {
                    var selectedFileName = resp.FileName;
                    if (selectedFileName == imageData.FileName) {
                        console.log('Same image selected, nothing to do');
                    } else {
                        var changeCroppedImage = {'Seq': 0};
                        var matchingImage = existingImages.findItem(function(x) {
                            return x.FileName == selectedFileName;
                        });
                        if (matchingImage == null) {
                            changeCroppedImage.FileName = selectedFileName;
                            changeCroppedImage.FileSize = resp.FileSize;
                        } else {
                            changeCroppedImage.Seq = matchingImage.Seq;
                            changeCroppedImage.FileName = matchingImage.FileName;
                        }
                        $uibModalInstance.close({'ChangeCroppedImage': changeCroppedImage});
                    }
                });
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $scope.loading = true;
            window['CropperImage_Crop_Now'] = StoreCroppedImage;
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ImageLinkSelectionCtrl', ['$scope', '$uibModalInstance', 'messageBox', 'pageSeq', 'imageSeq', 'options', 'imageFileName', 'existingLink', ImageLinkSelectionCtrl]);

    function ImageLinkSelectionCtrl($scope, $uibModalInstance, messageBox, pageSeq, imageSeq, options, imageFileName, existingLink) {
        $scope.title = 'בחירת קישור עבור תמונה';
        $scope.selected = {LinkType: 0, ExternalUrl: '', UploadedFileName: ''};
        $scope.pageSeq = pageSeq;
        $scope.imageSeq = imageSeq;
        $scope.imageFileName = imageFileName;
        $scope.existingLink = existingLink;
        $scope.data = {
            'LinkTypes': [
                {Name: 'פתיחה בגלרייה', Value: 0},
                {Name: 'קישור חיצוני', Value: 1},
                {Name: 'קובץ מצורף', Value: 2}
            ]
        };
        $scope.cancelCaption = options && options.cancelCaption ? options.cancelCaption : 'ביטול';
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';

        //console.log(existingLink);

        $scope.selected.LinkType = $scope.data.LinkTypes[0];
        if ($scope.existingLink) {
            switch ($scope.existingLink.Type) {
                case 1:
                    $scope.selected.LinkType = $scope.data.LinkTypes[1];
                    $scope.selected.ExternalUrl = $scope.existingLink.ExternalUrl;
                    break;
                case 2:
                    $scope.selected.LinkType = $scope.data.LinkTypes[2];
                    $scope.selected.UploadedFileName = $scope.existingLink.FileName;
                    $scope.existingLink.IsImage = contentUtils.IsImageFile($scope.existingLink.FileName);
                    if ($scope.existingLink.IsImage == false) {
                        $scope.existingLink.PreviewClass = contentUtils.GeneratePreviewClass($scope.existingLink.FileName);
                    }
                    break;
            }
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': '/content/ImageAttachments/' + imageSeq,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן קובץ, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת קובץ',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    $scope.selected.UploadedFileName = file.name;
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        $scope.isInputValid = function() {
            if ($scope.selected.LinkType.Value) {
                switch ($scope.selected.LinkType.Value) {
                    case 1:
                        return sportUtils.ValidateUrl($scope.selected.ExternalUrl + '').length > 0;
                    case 2:
                        return $scope.selected.UploadedFileName && $scope.selected.UploadedFileName.length > 0;
                }
            }
            return true;
        };

        $scope.Delete = function() {
            messageBox.ask('האם להסיר קישור מתמונה זו?').then(function () {
                $uibModalInstance.close({
                    'Remove': true
                });
            });
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $uibModalInstance.close({
                'Type': $scope.selected.LinkType.Value,
                'FileName': $scope.selected.UploadedFileName,
                'ExternalUrl': sportUtils.ValidateUrl($scope.selected.ExternalUrl)
            });
        };
    }
})();
(function() {
    'use strict';

    angular.module('sport')
        .controller('MessageCtrl', ['$scope', '$uibModalInstance', '$sce', 'message', 'options', MessageController])
        .factory('messageBox', ['$uibModal', MessageBoxFactory]);

    function MessageBoxFactory($uibModal) {
        function show(message, options) {
            return $uibModal.open({
                templateUrl: 'message.html',
                controller: 'MessageCtrl',
                resolve: {
                    message: function () {
                        return message;
                    },
                    options: function () {
                        return options;
                    }
                }
            }).result;
        }

        function ask(message, options) {
            if (!options) {
                options = {};
            }

            if (!options.cancelCaption) {
                options.cancelCaption = 'ביטול';
            }

            if (options.prompt) {
                window.setTimeout(function () {
                    $('#userInput').focus();
                }, 1000);
            }

            return show(message, options);
        }

        function warn(message, options) {
            if (!options) {
                options = {};
            }
            options.isWarning = true;
            return show(message, options);
        }

        return {
            show: show,
            ask: ask,
            warn: warn
        }
    }

    function MessageController($scope, $uibModalInstance, $sce, message, options) {
        $scope.message = message;
        $scope.prompt = false;
        $scope.htmlContents = false;

        if (options) {
            $scope.title = options.title;
            $scope.isWarning = options.isWarning;
            $scope.subTitle = options.subTitle;
            $scope.info = options.info;
            $scope.cancelCaption = options.cancelCaption;
            $scope.prompt = options.prompt;
            $scope.htmlContents = options.htmlContents;
            if (options.backgroundImage) {
                $scope.style = "background-image: url('" + options.backgroundImage + "');";
            }
        }
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';

        if ($scope.htmlContents) {
            $scope.message = $sce.trustAsHtml($scope.message);
        }

        $scope.confirm = function () {
            $uibModalInstance.close($('#userInput').val());
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
var __psAvailablePageSizes = [5, 10, 20, 50, 100];
var __psDefaultPageSize = 50;
var __psDefaultOptions = {
    pageSize: __psDefaultPageSize,
    applyDataCallback: null
};
var __psUniqueCounter = 0;

function PagingService(data, options) {
    var _this = this;
    this.options = typeof options == 'undefined' ? __psDefaultOptions : options;
    for (var key in __psDefaultOptions) {
        if (!this.options.hasOwnProperty(key)) {
            this.options[key] = __psDefaultOptions[key];
        }
    }
    this.__source = null;
    this.rawData = data;

    this.itemsCount = function() {
        return (this.rawData || []).length;
    };

    this.getAllData = function() {
        return (this.rawData || []).slice(0);
    };

    this.parsePageSize = function(rawValue) {
        var size = parseInt(rawValue, 10);
        if (isNaN(size))
            size = this.options.pageSize;
        var exists = false;
        var allSizes = this.availablePageSizes();
        for (var i = 0; i < allSizes.length; i++) {
            var curSize = allSizes[i];
            if (size == curSize) {
                exists = true;
                break;
            }
        }
        if (!exists)
            size = this.options.pageSize;
        return size;
    };

    this.availablePageSizes = function() {
        var sizes = [];
        for (var i = 0; i < __psAvailablePageSizes.length; i++)
            sizes.push(__psAvailablePageSizes[i]);
        var itemCount = (this.rawData || []).length;
        var lastIndex = 0;
        for (var i = 0; i < sizes.length; i++) {
            if (sizes[i] >= itemCount) {
                lastIndex = i + 1;
                break;
            }
        }
        if (lastIndex > 0 && lastIndex < sizes.length)
            sizes.splice(lastIndex);
        return sizes;
    };

    this.getPageCount = function(size) {
        var totalItems = this.itemsCount();
        var pageCount = Math.ceil(totalItems / size);
        return pageCount > 0 ? pageCount : 1;
    };

    this.isPageIncluded = function(page, curPage, pageCount) {
        if (page == 1 || page == pageCount)
            return true;
        var medianPage = curPage;
        if (medianPage < 3)
            medianPage = 3;
        if (medianPage > (pageCount - 2))
            medianPage = (pageCount - 2);
        return (page == medianPage) || (page == (medianPage - 1)) || (page == (medianPage + 1));
    };

    this.getPages = function(size, curPage) {
        var pageCount = this.getPageCount(size);
        var pages = [];
        for (var i = 1; i <= pageCount; i++) {
            var page = i;
            if (this.isPageIncluded(page, curPage, pageCount))
                pages.push(page);
        }
        return pages;
    };

    this.parseCurrentPage = function(rawValue, size) {
        if (typeof rawValue == 'undefined' || typeof size == 'undefined')
            return 1;
        var page = parseInt(rawValue, 10);
        var pageCount =  this.getPageCount(size);
        return (isNaN(page) || page < 1 || page > pageCount) ? 1 : page;
    };

    this.changePageSize = function(newSize) {
        _this.pageSize = newSize;
        _this.applyPaging(_this.__source);
        if (_this.currentPage > 1)
            _this.changePage(1);
    };

    this.changePage = function(newPage) {
        _this.currentPage = newPage;
        _this.applyPaging(_this.__source);
    };

    this.nextPage = function() {
        if (this.pagingData.isLastPage)
            return;

        var newPage = _this.currentPage + 1;
        _this.changePage(newPage);
    };

    this.previousPage = function() {
        if (this.pagingData.isFirstPage)
            return;

        var newPage = parseInt(_this.currentPage || 0) - 1;
        _this.changePage(newPage);
    };

    this.setData = function(data, source) {
        this.rawData = data;
        if (typeof source != 'undefined' && source)
            this.__source = source;
        this.applyPaging(this.__source);
        if (this.currentPage > 1)
            this.changePage(1);
    }

    this.applyPaging = function(source) {
        if (!this.rawData)
            this.rawData = [];

        if (source == null)
            source = [];

        this.__source = source;
        source.splice(0, source.length);

        var size = this.parsePageSize(this.pageSize);
        var curPage = this.parseCurrentPage(this.currentPage, size);
        this.currentPage = curPage;
        this.pageSize = size;
        var items = [];
        var firstIndex = (this.currentPage - 1) * size;
        var lastIndex = firstIndex + size;
        if (lastIndex > this.rawData.length)
            lastIndex = this.rawData.length

        if (this.rawData.length > 0) {
            for (var i = firstIndex; i < lastIndex; i++) {
                items.push(this.rawData[i]);
            }
        }

        this.pagingData = {
            gotPaging: items.length < this.itemsCount(),
            firstRecord: firstIndex + 1,
            lastRecord: firstIndex + items.length,
            totalRecords: this.itemsCount(),
            pageSizes: this.availablePageSizes(),
            selectedPage: this.currentPage,
            selectedPageSize: this.pageSize,
            isFirstPage: this.currentPage == 1,
            isLastPage: this.currentPage == this.getPageCount(this.pageSize),
            pages: this.getPages(this.pageSize, this.currentPage),
            pageCount: this.getPageCount(this.pageSize)
        };

        for (var i = 0; i < items.length; i++) {
            source.push(items[i]);
        }

        if (this.options.applyDataCallback)
            this.options.applyDataCallback();
    };
}
var sportCustomizeMethods = {
    AccessibilityComponent: {
        Customize: function() {
            var accessibilityLink = $(".accessibility_component .btn_accessibility");
            if (accessibilityLink.length == 1) {
                if (accessibilityLink.text().length > 0) {
                    var oImage = accessibilityLink.find("img");
                    accessibilityLink.text("");
                    accessibilityLink.append(oImage);
                }
                var totalHeight = $(window).height();
                accessibilityLink.css({"width": "40px", "top": (totalHeight - 60) + "px"});
            }
        }
    },
    OwlCarousel: {
        SetArrowLocation: function(arrowElement, top, right, left) {
            var styles = [];
            if (top != null && !isNaN(top))
                styles.push('top: ' + top + 'px !important;');
            if (right != null && !isNaN(right))
                styles.push('right: ' + right + 'px !important;');
            if (left != null && !isNaN(left))
                styles.push('left: ' + left + 'px !important;');
            if (styles.length > 0)
                arrowElement.css("cssText", styles.join(" "));
            return styles;
        },
        SetArrowDisplay: function(arrowElement, existingStyles, displayValue) {
            var newStyles = existingStyles.slice(0);
            newStyles.push('display: ' + displayValue + ' !important;');
            arrowElement.css("cssText", newStyles.join(" "));
        },
        Customize: function() {
            $("owl-carousel").each(function() {
                var carousel = $(this);
                if (carousel.data('handled') != '1') {
                    var arrowPrev = carousel.find('.owl-prev');
                    var arrowNext = carousel.find('.owl-next');
                    var arrowsTop = parseInt(carousel.data('arrows-top'));
                    var arrowRight = parseInt(carousel.data('arrow-right'));
                    var arrowLeft = parseInt(carousel.data('arrow-left'));
                    var prevArrowStyles = sportCustomizeMethods.OwlCarousel.SetArrowLocation(arrowPrev, arrowsTop, arrowRight, null);
                    var nextArrowStyles = sportCustomizeMethods.OwlCarousel.SetArrowLocation(arrowNext, arrowsTop, null, arrowLeft);
                    carousel.bind("mouseover", function() {
                        sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowPrev, prevArrowStyles, 'block');
                        sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowNext, nextArrowStyles, 'block');
                        if (carousel.mouseOutTimer) {
                            window.clearTimeout(carousel.mouseOutTimer);
                        }
                    }).bind("mouseout", function() {
                        if (carousel.mouseOutTimer)
                            window.clearTimeout(carousel.mouseOutTimer);
                        carousel.mouseOutTimer = window.setTimeout(function() {
                            sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowPrev, prevArrowStyles, 'none');
                            sportCustomizeMethods.OwlCarousel.SetArrowDisplay(arrowNext, nextArrowStyles, 'none');
                        }, 500);
                    });
                    carousel.data('handled', '1');
                }
            });
        }
    },
    TeamPunch: {
        Mobile: {
            Customize: function() {
                var bannerContainer = $(".tp-banner-container");
                if (bannerContainer.length > 0) {
                    var revCaption = bannerContainer.find(".rev_caption");
                    revCaption.css("margin-right", "15px");
                    revCaption.find("p").css("font-size", "12px");
                    bannerContainer.find(".event_date").css("margin-bottom", "10px");
                }
            }
        }
    },
    TopMenu: {
        Customize: function(bodyWidth, mobileScreen) {
            function ApplyMobileMenu() {
                var menuId = "schoolSportSideNav";
                var oMobileMenu = $("#" + menuId);
                var subMenuCounter = 0;
                var toggleSign = $("<i></i>").addClass("fa").addClass("fa-plus-square-o").css("margin-left", "5px");
                var createSubMenuPanel = function(subMenu, oLink, additionalClass) {
                    if (typeof additionalClass == "undefined" || additionalClass == null)
                        additionalClass = "";
                    subMenuCounter++;
                    var subMenuId = menuId + "_" + subMenuCounter;
                    oLink.data("menu-id", subMenuId);
                    oLink.attr("href", "javascript:void(0)");
                    oLink.attr("onclick", "OpenSubMenu(this);");
                    oLink.prepend(toggleSign.clone());
                    var subMenuPanel = $("<div></div>");
                    subMenuPanel.addClass("sub-menu");
                    if (additionalClass.length > 0)
                        subMenuPanel.addClass(additionalClass);
                    subMenuPanel.attr("id", subMenuId);
                    var subMenuItems = subMenu.find("> ul > li");
                    subMenuItems.each(function() {
                        var currentSubMenuItem = $(this);
                        var currentSubMenuLink = currentSubMenuItem.find("> a").first();
                        if (currentSubMenuLink.length == 1) {
                            var subMenuLevel2 = currentSubMenuItem.find("> .sub_menu_inner");
                            var subMenuLevel2_Panel = null;
                            if (subMenuLevel2.length == 1) {
                                subMenuLevel2_Panel = createSubMenuPanel(subMenuLevel2, currentSubMenuLink, "sub-menu-level2");
                            } else {
                                currentSubMenuLink.bind("click", closeNav);
                            }
                            subMenuPanel.append(currentSubMenuLink);
                            if (subMenuLevel2_Panel != null)
                                subMenuPanel.append(subMenuLevel2_Panel);
                        }
                    });
                    return subMenuPanel;
                }

                $(".main_menu>ul>li").each(function() {
                    var oItem = $(this);
                    var oLink = oItem.find("a").first();
                    oLink.find("i").remove();
                    var subMenu = oItem.find("> .sub_menu_wrap");
                    var subMenuPanel = null;
                    if (subMenu.length == 1) {
                        subMenuPanel = createSubMenuPanel(subMenu, oLink);
                    } else {
                        oLink.bind("click", closeNav);
                    }
                    oMobileMenu.append(oLink);
                    if (subMenuPanel != null)
                        oMobileMenu.append(subMenuPanel);

                });
            }

            function AdjustForMobile(pnlMainMenu, lnkHome) {
                console.log('mobile screen detected');
                window['qL_Finish_Now'] = true;
                window.setInterval(function () {
                    $(".accessibility_div_wrap").hide();
                }, 1000);
                window.setTimeout(function() {
                    $(window).scrollTop(0);
                }, 2000);
                $(".main_menu > ul > li > a").css({
                    "background-color": "transparent",
                    "border-color": "transparent",
                    "line-height": "auto",
                    width: "100%",
                    "text-align": "right"
                });
                $(".main_menu > ul > li > a > br").replaceWith("<span>&nbsp;</span>");
                ApplyMobileMenu();

                /*
                $('head').append("<style>#menu_button:after {color: #383e44; font-size: 30px; </style>");
                $('body').css('margin-top', '70px');
                var mainMenuList = pnlMainMenu.children("ul").first();
                pnlMainMenu.css("width", Math.floor(0.9 * bodyWidth) + "px");
                lnkHome.parents(".row").first().children("div").removeClass();
                if (bodyWidth < 345) {
                    var diff = 345 - bodyWidth;
                    lnkHome.find("img").css("width", (240 - diff) + "px");
                }
                lnkHome.css("margin-left", "60px");
                lnkHome.find("img").css({
                    "height": "65px",
                    "float": "right"
                });
                $(".main_menu > ul > li > a").css({
                    "background-color": "transparent",
                    "border-color": "transparent",
                    "line-height": "auto",
                    width: "100%",
                    "text-align": "right"
                });
                $(".main_menu > ul > li > a > br").replaceWith("<span>&nbsp;</span>");
                ApplyMobileMenu();
                $("header").css("position", "fixed");
                pnlMainMenu.find("a").bind("click", function () {
                    var clickedLink = $(this);
                    var linkHref = clickedLink.attr("href");
                    if (linkHref && linkHref.length > 0 && linkHref != '#') {
                        window.setTimeout(function () {
                            window.location.reload(false);
                        }, 200);
                    }
                });
                sportUtils.DoWhenReady(".login_block", function (loginBlock) {
                    loginBlock.find(".top_menu_button:visible").slice(1).each(function () {
                        $(this).appendTo("<li></li>").appendTo(mainMenuList);
                    });
                    loginBlock.hide();
                });
                sportUtils.DoWhenReady(".h_top_part", function (topPart) {
                    topPart.hide();
                });
                sportUtils.DoWhenReady("#pnlLogin", function (loginPanel) {
                    var totalWidth = $("body").width();
                    loginPanel.css({"right": "-60px", "left": "", "width": totalWidth + "px"});
                });
                sportUtils.CssWhenReady("#pnlTopHeaderLogoContainer", "float", "left");
                sportUtils.CssWhenReady("#pnlTopHeaderMenuContainer", {"float": "right", "margin-right": "10px", "margin-top": "0px"});
                sportUtils.CssWhenReady("#imgTopHeaderLogo", "height", "50px");
                sportUtils.CssWhenReady("#MenuContainer", "left", "0px");
                sportUtils.CssWhenReady(".menu_wrap", "height", "40px");
                sportUtils.CssWhenReady(".wrapper_container", "margin-top", "40px");
                var userLoggedIn = false;
                var userLoginItem = null;
                var mangerToolsItem = null;
                var loggedInUserName = "";
                sportUtils.DoWhenReady("#lbLoggedInUserName", function (loggedInUserLabel) {
                    loggedInUserName = loggedInUserLabel.text().trim();
                    userLoggedIn = loggedInUserName.length > 0;
                    loggedInUserLabel.text("");
                    sportUtils.DoWhenReady("#liManagerTools", function (element) {
                        mangerToolsItem = element;
                        sportUtils.DoWhenReady("#mobileHeaderPlaceholder_2", function (placeholder) {
                            placeholder.replaceWith(mangerToolsItem);
                        });
                        if (userLoggedIn) {
                            mangerToolsItem.show();
                            mangerToolsItem.find("a").find("span").text("");
                            mangerToolsItem.find("i").css("color", "black");
                            mangerToolsItem.css({
                                "list-style-type": "none",
                                "font-size": "30px",
                                "position": "absolute",
                                "right": "60px",
                                "top": "20px"
                            });
                        }
                    });
                });
                sportUtils.DoWhenReady("#liUserLogin", function (element) {
                    userLoginItem = element;
                    sportUtils.DoWhenReady("#mobileHeaderPlaceholder_1", function (placeholder) {
                        placeholder.replaceWith(userLoginItem);
                    });
                    var userNameSpan = userLoginItem.find("a").find("span");
                    if (loggedInUserName.length == 0) {
                        var overrideValue = userNameSpan.text().trim();
                        if (overrideValue.length > 0)
                            loggedInUserName = overrideValue;
                    }
                    userNameSpan.text("");
                    sportUtils.DoWhenReady("#lbAboveLogOffButton", function (label) {
                        label.text(loggedInUserName);
                    });
                    userLoginItem.find("i").css("color", "black");
                    userLoginItem.css({
                        "list-style-type": "none",
                        "font-size": "30px",
                        "position": "absolute",
                        "right": "25px",
                        "top": "20px"
                    });
                });
                */
            }

            function ResizeMenu(pnlMainMenu, lnkHome) {
                var menuWidth = pnlMainMenu.width();
                if ((menuWidth + lnkHome.width()) > bodyWidth && lnkHome.position().left < 0)
                    lnkHome.parents("div").first().css("width", "100%");
                if (bodyWidth && menuWidth > bodyWidth) {
                    console.log("menu resize");
                    $("#MenuContainer").css("left", "0%")
                    var sanityCheck = 0;
                    while (sanityCheck <= 20) {
                        var totalWidth = 0;
                        $(".main_menu > ul > li > a").each(function () {
                            var curLink = $(this);
                            var currentWidth = parseInt(curLink.css("width"));
                            if (!isNaN(currentWidth) && currentWidth >= 70) {
                                currentWidth -= 3;
                                curLink.css("width", currentWidth + "px");
                                totalWidth += currentWidth + 12;
                            }
                        });
                        if (totalWidth < bodyWidth)
                            break;
                        sanityCheck++;
                    }
                }
            }

            if (mobileScreen)
                $(".top_menu_button > .popup").css({"right": "0px", "left": "0px"});
            var pnlMainMenu = $(".main_menu");
            if (pnlMainMenu.length == 1) {
                var lnkHome = $("#lnkHome");
                var oFrame = $("#GoogleMapsFrame");
                if (mobileScreen) {
                    oFrame.hide();
                    AdjustForMobile(pnlMainMenu, lnkHome);
                } else {
                    oFrame.attr("src", oFrame.data("src"));
                    ResizeMenu(pnlMainMenu, lnkHome);
                }
                return;
            }
            window.setTimeout(function() {
                sportCustomizeMethods.TopMenu.Customize(bodyWidth, mobileScreen);
            }, 100);
        }
    },
    ScreenSize: {
        Customize: function() {
            var body = $("body");
            if (body.length == 1) {
                var bodyWidth = $("body").width();
                if (bodyWidth > 0) {
                    var mobileScreen = sportUtils.IsMobile(); //bodyWidth <= 992;
                    if (mobileScreen) {
                        window.setInterval(sportCustomizeMethods.TeamPunch.Mobile.Customize, 1500);
                    }
                    window.setTimeout(function() {
                        sportCustomizeMethods.TopMenu.Customize(bodyWidth, mobileScreen);
                    }, 100);
                    return;
                }
            }
            window.setTimeout(sportCustomizeMethods.ScreenSize.Customize, 100);
        }
    }
};

window.setInterval(sportCustomizeMethods.AccessibilityComponent.Customize, 1000);
window.setInterval(sportCustomizeMethods.OwlCarousel.Customize, 1000);
window.setTimeout(sportCustomizeMethods.ScreenSize.Customize, 100);
(function() {
    'use strict';

    angular
        .module('sport')
        .factory('SportService',
        ['$http', '$httpParamSerializer', '$filter', '$q', SportService]);

    function SportService($http, $httpParamSerializer, $filter, $q) {
        function onReadSeason(seasonData) {
            if (seasonData.FirstDay)
                seasonData.FirstDay = new Date(seasonData.FirstDay);
            if (seasonData.LastDay)
                seasonData.LastDay = new Date(seasonData.LastDay);
        }

        function readAllSeasons() {
            var url = '/api/seasons?season=all';
            return $http.get(url).then(function(resp) {
                for (var i = 0; i < resp.data.length; i++)
                    onReadSeason(resp.data[i]);
                return resp.data;
            });
        }

        function readSeasonsInUse() {
            var url = '/api/sportsman/seasons-in-use';
            return $http.get(url).then(function(resp) {
                for (var i = 0; i < resp.data.length; i++)
                    onReadSeason(resp.data[i]);
                return resp.data;
            });
        }

        return {
            sportFields: function (includeShort) {
                if (typeof includeShort == 'undefined')
                    includeShort = false;
                var url = '/api/common/sports';
                return $http.get(url).then(function(resp) {
                    var allSportFields = resp.data;
                    var sportFieldsMapping = {};
                    var shortNameMapping = {};
                    for (var i = 0; i < allSportFields.length; i++) {
                        var curSportField = allSportFields[i];
                        sportFieldsMapping[curSportField.Seq.toString()] = curSportField.Name;
                        shortNameMapping[curSportField.Seq.toString()] = curSportField.ShortName;
                    }
                    if (includeShort) {
                        return {
                            Full: sportFieldsMapping,
                            Short: shortNameMapping
                        }
                    } else {
                        return sportFieldsMapping;
                    }
                });
            },
            seasons: {
                all: readAllSeasons,
                inUse: readSeasonsInUse
            },
            currentSeason: function(overrideSeason) {
                if (typeof overrideSeason == 'undefined')
                    overrideSeason = 0;
                var deferred = $q.defer();
                var currentSeason = sportUtils.getCurrentSeason().Season;
                if (overrideSeason) {
                    deferred.resolve(overrideSeason);
                } else {
                    if (currentSeason && currentSeason > 0) {
                        deferred.resolve(currentSeason);
                    } else {
                        readSeasonsInUse().then(function (seasonsInUse) {
                            if (seasonsInUse.length > 0) {
                                currentSeason = seasonsInUse.findItem(function(x) {
                                    return x.IsCurrent;
                                });
                                if (currentSeason == null) {
                                    seasonsInUse.sort(function (s1, s2) {
                                        return s1.Season - s2.Season;
                                    });
                                    currentSeason = seasonsInUse.lastItem();
                                }
                                deferred.resolve(currentSeason.Season);
                            } else {
                                deferred.reject('אין עונות בשימוש');
                            }
                        }, function (err) {
                            deferred.reject(err);
                        });
                    }
                }
                return deferred.promise;
            }
        };
    }
})();
String.prototype.compareTo = function(s) {
    return (this == s) ? 0 : ((this > s) ? -1 : 1);
};

String.prototype.endsWith = function(s) {
    return this.toLowerCase().lastIndexOf(s.toLowerCase()) == this.length - s.length;
};

String.prototype.startsWith = function(s) {
    return this.toLowerCase().indexOf(s.toLowerCase()) == 0;
};

String.prototype.startsWithEnglishLetter = function() {
    if (this.length > 0) {
        var firstLetter = this.charAt(0).toLowerCase();
        return firstLetter >= 'a' && firstLetter <= 'z';
    }
    return false;
};

Array.prototype.sortByProperty = function(propertyName) {
    this.sort(function(item1, item2) {
        var value1 = item1[propertyName];
        var value2 = item2[propertyName];
        if (value1 < value2)
            return -1;
        if (value1 > value2)
            return 1;
        return 0;
    });
};

Array.prototype.setForAll = function(propertyName, value) {
    this.forEach(function(item) {
        item[propertyName] = value;
    });
};

Array.prototype.take = function(amount) {
    var items = [];
    var array = this;
    for (var i = 0; i < array.length; i++) {
        if (items.length >= amount)
            break;
        items.push(array[i]);
    }
    return items;
};

Array.prototype.partialJoin = function(delimeter, indices) {
    var items = [];
    var array = this;
    for (var i = 0; i < indices.length; i++) {
        var curIndex = indices[i];
        if (curIndex >= 0 && curIndex < array.length)
            items.push(array[curIndex]);
    }
    return items.join(delimeter);
};

Array.prototype.skip = function(amount) {
    var items = [];
    var array = this;
    for (var i = amount; i < array.length; i++) {
        items.push(array[i]);
    }
    return items;
};

Array.prototype.SplitByProperty = function(propertyName) {
    if (typeof propertyName == 'undefined' || !propertyName)
        return {};

    var array = this;
    var mapping = {};
    for (var i = 0; i < array.length; i++) {
        var curItem = array[i];
        var key = curItem[propertyName].toString();
        if (!mapping[key])
            mapping[key] = [];
        mapping[key].push(curItem);
    }
    return mapping;
};

Array.prototype.expand = function(item, amount, complex) {
    if (typeof complex == 'undefined')
        complex = false;
    function GetClone() {
        if (complex) {
            var clone = {};
            for (var prop in item) {
                clone[prop] = item[prop];
            }
            return clone;
        } else {
            return item;
        }
    }
    for (var i = this.length; i < amount; i++) {
        this.push(GetClone());
    }
};

Array.prototype.trimAfter = function(amount) {
    this.splice(amount);
};

Array.prototype.removeItem = function(value, index) {
    var array = this;
    if (typeof index == 'undefined')
        index = array.indexOf(value);
    if (index >= 0) {
        array.splice(index, 1);
    }
};

Array.prototype.indexOf = function(item) {
    var array = this;
    var index = -1;
    for (var i = 0; i < array.length; i++) {
        if (array[i] == item) {
            index = i;
            break;
        }
    }
    return index;
};

Array.prototype.moveItem = function(oldIndex, newIndex) {
    var array = this;
    array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
};

Array.prototype.appendArray = function(otherArray) {
    if (otherArray != null && otherArray.hasOwnProperty('length')) {
        for (var i = 0; i < otherArray.length; i++) {
            this.push(otherArray[i]);
        }
    }
};

Array.prototype.mergeWith = function(otherArray) {
    var array = this;
    var mergedArray = [];
    for (var i = 0; i < array.length; i++)
        mergedArray.push(array[i]);
    if (typeof otherArray != 'undefined' && otherArray.length) {
        for (var i = 0; i < otherArray.length; i++) {
            mergedArray.push(otherArray[i]);
        }
    }
    return mergedArray;
};

Array.prototype.lastItem = function() {
    var array = this;
    return array.length == 0 ? null : array[array.length - 1];
};

Array.prototype.firstOrDefault = function(defaultValue) {
    var array = this;
    return array.length == 0 ? defaultValue : array[0];
};

if (![].findIndex) {
    Array.prototype.findIndex = function(callback) {
        var array = this;
        for (var i = 0; i < array.length; i++) {
            if (callback(array[i]) == true) {
                return i;
            }
        }
        return -1;
    };
}

if (![].findItem) {
    Array.prototype.findItem = function(callback) {
        var array = this;
        for (var i = 0; i < array.length; i++) {
            var curItem = array[i];
            if (callback(curItem) == true) {
                return curItem;
            }
        }
        return null;
    };
}

Array.prototype.toAssociativeArray = function(value, sourceProperty, targetProperty) {
    var array = this;
    if (typeof value == 'undefined')
        value = true;
    if (typeof sourceProperty == 'undefined')
        sourceProperty = '';
    if (typeof targetProperty == 'undefined')
        targetProperty = '';
    var mapping = {};
    for (var i = 0; i < array.length; i++) {
        var curItem = array[i];
        var key = (sourceProperty.length > 0 && curItem.hasOwnProperty(sourceProperty)) ?
            curItem[sourceProperty].toString() : curItem.toString();
        var currentValue = (targetProperty.length > 0 && curItem.hasOwnProperty(targetProperty)) ?
            curItem[targetProperty] : value;
        mapping[key] = currentValue;
    }
    return mapping;
};

Array.prototype.distinct = function() {
    var array = this;
    var mapping = {};
    var distinctItems = [];
    for (var i = 0; i < array.length; i++) {
        var x = array[i] == null ? '' : array[i];
        var key = x.toString();
        if (!mapping[key]) {
            distinctItems.push(x);
            mapping[key] = true;
        }
    }
    return distinctItems;
};

Array.prototype.Sum = function(propName) {
    if (typeof propName == 'undefined')
        propName = '';
    var array = this;
    if (propName.length > 0)
        array = array.map(function(x) { return x[propName]; });
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
        var n = array[i] == null ? 0 : parseInt(array[i], 10);
        if (!isNaN(n))
            sum += n;
    }
    return sum;
};

Date.prototype.withoutTime = function () {
    var d = new Date(this);
    d.setHours(0, 0, 0, 0, 0);
    return d;
}

Date.prototype.isSameDate = function (otherDate) {
    var date = this;
    return date.getFullYear() == otherDate.getFullYear() && date.getMonth() == otherDate.getMonth() && date.getDate() == otherDate.getDate();
}

function getBooleanValue(value) {
    return typeof value === "string"
        ? ["1", "yes", "true"].indexOf(value.toLowerCase()) >= 0
        : !!value;
}

function IntegerTextboxKeyPress(evt) {
    var c = String.fromCharCode(evt.which);
    var n = parseInt(c);
    if (isNaN(n)) {
        evt.preventDefault();
    }
}

function IntegerTextboxBlur(evt) {
    var textbox = $(this);
    var curValue = textbox.val();
    if (curValue.length > 0) {
        var n = parseInt(curValue);
        if (!isNaN(n))
            textbox.val(n.toString());
    }
}

var sportGlobalSettings = {
    RecentAmount: 999,
    RecentFlowersContent: 8,
    YoungSportsmenSeq: 998,
    FlowersFieldSeq: 999,
    GeneralSportFieldSeq: 1000,
    LocalStorageKeys: {
        CurrentSeason: {
            Name: 'school_sport_season_name',
            Year: 'school_sport_season_hebrew_year'
        }
    }
};

var sportUtils = {
    scrollToTopInterval: 0,
    scrollToTopEventsAttached: false,
    scrollToTopCounter: 0,
    hebrewLetters: ['א','ב','ג', 'ד', 'ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'],
    grades: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", 'י"א', 'י"ב'],
    hebrewNumbers: {
        Asarot: ['', 'עשרים', 'שלושים', 'ארבעים', 'חמישים', 'שישים', 'שבעים', 'שמונים', 'תשעים'],
        OneToTenMale: ['אחד', 'שני', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה', 'עשרה'],
        OneToTenFemale: ['אחת', 'שתי', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר']
    },
    IsMobile: function() {
        var check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    },
    GetCurrentDate: function() {
        return new Date(); //(2016, 10, 3);
    },
    FocusElement: function(selector) {
        var element = $(selector).first();
        if (element.length == 1) {
            var oTextbox = $("input").attr("type", "text");
            oTextbox.prependTo(element);
            oTextbox.focus();
            oTextbox.remove();
            return window.scrollY;
        }
        return 0;
    },
    HideWhenFramed: function(elementsToHide) {
        var qs = sportUtils.ParseQueryString();
        if (qs['iframe'] == '1') {
            elementsToHide.forEach(function (elementToHide) {
                if (elementToHide.length > 0) {
                    $(elementToHide).hide();
                }
            });
        }
    },
    ApplyEnglishChampionship: function() {
        function SwitchThreeCells(row) {
            row.children("div").eq(0).appendTo(row);
            row.children("div").eq(1).prependTo(row);
        }

        function DelayedActions() {
            function ApplyItemsPosition(chooseFilterLabels) {
                for (var labelId in chooseFilterLabels) {
                    var oLabel = $("#" + labelId);
                    oLabel.parents(".col-lg-4").first().find(".tabs_nav>li").each(function() {
                        var oItem = $(this);
                        oItem.css("float", "left");
                    });
                }
            }

            var chooseFilterLabels = {
                "lblChoosePhase": "Choose phase",
                "lblChooseGroup": "Choose group",
                "lblChooseRound": "Choose round",
                "lblGamesPlan": "Games Plan",
                "lblTeamsList": "Teams List",
                "lblFacilitiesList": "Facilities List"
            };
            if ($("#pnlCategoryChooseFilters>div").length == 3) {
                $("#pnlCategoryChooseFilters>div").eq(0).appendTo($("#pnlCategoryChooseFilters"));
                $("#pnlCategoryChooseFilters>div").eq(1).prependTo($("#pnlCategoryChooseFilters"));
                $("#pnlGamesAndTeams>div").eq(0).appendTo($("#pnlGamesAndTeams"));
                $("#pnlTeamsList").css("text-align", "left");
                $("#pnlFacilitiesList").css("text-align", "left");
                $("#lblRankingTable").text("Ranking Table");
                $("#lblRankingTable").css("text-transform", "none");
                $("#pnlFullTableButton").removeClass("pull-left").addClass("pull-right");
                $("#lblFullTableButton").text("Full table");
                $("#lblRankingTableTeamName").text("Team Name");
                $("#lblRankingTableScore").text("Score");
                $("#lblFullTableButton")[0].style.setProperty("margin-left", "50px", "important");
                $("#lblFullTableButton").parents("a").first().css({"width": "200px", "height": "32px"});
                $(".tabs_container").each(function() {
                    this.style.setProperty("float", "left", "important")
                });
                for (var labelId in chooseFilterLabels) {
                    var oLabel = $("#" + labelId);
                    oLabel.text(chooseFilterLabels[labelId]);
                    oLabel.css({"text-align": "left", "text-transform": "none"});
                    oLabel.parents(".col-lg-4").first().find(".tabs_nav>li").each(function(index) {
                        if (labelId == "lblChoosePhase" && index == 0) {
                            $(this).text("All phases");
                        }
                        $(this).bind("click", function() {
                            window.setTimeout(function() {
                                ApplyItemsPosition(chooseFilterLabels);
                            }, 500);
                        });
                    });
                }
                ApplyItemsPosition(chooseFilterLabels);
                var arrWords = $("#lblFullChampionshipName").text().split(" ");
                if (arrWords.length > 2) {
                    var wordsWithoutHebrew = arrWords.take(arrWords.length - 2);
                    $("#lblFullChampionshipName").text(wordsWithoutHebrew.join(" "));
                }
                return;
            }
            window.setTimeout(DelayedActions, 100);
        }

        var qs = sportUtils.ParseQueryString();
        if (qs['English'] == '1' || qs['english'] == '1') {
            $(".section_title").css("text-align", "left");
            window.setTimeout(DelayedActions, 100);
            window.setInterval(function() {
                $("h3").css("text-align", "left");
                $(".match-group").css("direction", "ltr");
                $(".match-row").each(function() {
                    var oRow = $(this);
                    if (oRow.data("switched-cells") != "1") {
                        SwitchThreeCells(oRow);
                        oRow.data("switched-cells", "1");
                        oRow.find(".match-facility-container").css("text-align", "left");
                        oRow.find(".facility-label").text("Facility:");
                        oRow.find(".match-time-container").css("text-align", "left");
                        oRow.find(".time-label").text("Time:");
                        oRow.find(".match-delayed-game").hide();
                    }
                });
                $(".match-date-label").each(function() {
                    var oLabel = $(this);
                    if (oLabel.data("replaced-text") != "1") {
                        oLabel.text(oLabel.text().replace("תאריך:", "Date:"));
                        oLabel.data("replaced-text", "1");
                    }
                });
            }, 1000);
        }
    },
    MobileStyle: function(fullViewOnly, mobileOnly, showInBoth) {
        function StyleToAppend(originalStyle, newStyle) {
            var toAppend = '';
            if (newStyle.length > 0) {
                if (originalStyle.length > 0)
                    toAppend += ' ';
                toAppend += newStyle;
            }
            return toAppend;
        }

        if (typeof mobileOnly == 'undefined')
            mobileOnly = '';
        if (typeof showInBoth == 'undefined')
            showInBoth = '';
        var style = showInBoth;
        style += StyleToAppend(style, sportUtils.IsMobile() ? mobileOnly : fullViewOnly);
        return style;
    },
    TranslateGrade: function(rawGrade, latestSeason) {
        if (rawGrade != null && rawGrade > 0 && latestSeason != null) {
            var index = latestSeason - rawGrade;
            if (index >= 0 && index < sportUtils.grades.length)
                return sportUtils.grades[index];
        }
        return '';
    },
    WaitForElements: function(selectors, timeoutSeconds) {
        function CheckIfExists(deferred, numOfTries) {
            if ((numOfTries * 200) > (timeoutSeconds * 1000)) {
                deferred.reject('timeout');
            } else {
                var elements = {};
                var counter = 0;
                selectors.forEach(function(selector) {
                    var element = $(selector);
                    if (element.length > 0) {
                        elements[selector] = element;
                        counter++;
                    }
                });
                if (counter >= selectors.length) {
                    deferred.resolve(elements);
                } else {
                    window.setTimeout(function () {
                        CheckIfExists(deferred, numOfTries + 1);
                    }, 200);
                }
            }
        }

        var deferred = jQuery.Deferred();
        CheckIfExists(deferred, 0);
        return deferred.promise();
    },
    DoWhenReady: function(selector, action, tryCount) {
        if (typeof tryCount == 'undefined')
            tryCount = 0;

        //sanity check
        if (tryCount > 10000)
            return;

        var element = $(selector);
        if (element.length > 0) {
            action(element);
            return;
        }
        window.setTimeout(function() {
            sportUtils.DoWhenReady(selector, action, tryCount + 1);
        }, 2000);
    },
    CssWhenReady: function(selector, cssPropertyOrObject, cssValue) {
        sportUtils.DoWhenReady(selector, function(element) {
            var cssParams = null;
            if (typeof cssValue == 'undefined') {
                cssParams = cssPropertyOrObject;
            } else {
                cssParams = {};
                cssParams[cssPropertyOrObject] = cssValue;
            }
            element.css(cssParams);
        });
    },
    Login: function($q, $http, username, password) {
        var deferred = $q.defer();
        var userLogin = $.trim(username || '');
        var userPassword = password || '';
        if (userLogin.length > 0 && userPassword.length > 0) {
            $http.post("/api/login", {
                username: userLogin,
                password: userPassword
            }).then(function (resp) {
                var data = resp.data;
                window.localStorage.setItem('logged_username', userLogin);
                window.localStorage.setItem('logged_display_name', data.displayName);
                window.localStorage.setItem('logged_role', data.role);
                window.localStorage.setItem('logged_user_seq', data.seq);
                deferred.resolve(resp.data);
            }, function (data) {
                if (data && data.status == 401) {
                    deferred.reject('שם משתמש ו/או סיסמה שגויים');
                } else {
                    deferred.reject('שגיאה בעת התחברות');
                }
            });
        } else {
            deferred.reject('יש להזין שם  וסיסמא');
        }
        return deferred.promise;
    },
    IsValidEmail: function(rawEmail) {
        var email = $.trim((rawEmail ||'').toString());
        if (email.length == 0)
            return true;
        var parts = email.split('@');
        if (parts.length != 2)
            return false;
        var name = $.trim(parts[0]), domain = $.trim(parts[1]);
        if (name.length == 0 || domain.length == 0)
            return false;
        if (domain.substr(0, 1) == '.' || domain.substr(domain.length - 1, 1) == '.' || domain.indexOf('.') < 0)
            return false;
        return true;
    },
    ParseHebrewCurrency: function(rawSum) {
        function ParseParts(parts) {
            var parsed = '';
            parts = parts.filter(function(p) { return p.length > 0; });
            for (var i = 0; i < parts.length; i++) {
                var curPart = parts[i];
                if (i > 0) {
                    parsed += ' ';
                    if (parts.length > 1 && i == (parts.length - 1)) {
                        parsed += 'ו';
                        if (curPart == 'שני' || curPart == 'שתי')
                            curPart += 'ם';
                    }
                }
                parsed += curPart;
            }
            return parsed;
        }

        function ParseNumber(num, isMale, parts) {
            if (typeof parts == 'undefined')
                parts = [];

            num = Math.floor(num);
            if (num >= 100000)
                return num.toString();

            var thousands = Math.floor(num / 1000);
            if (thousands > 0) {
                var remainder = num % 1000;
                var hebrewThousands = '';
                if (thousands == 1)
                    hebrewThousands = 'אלף';
                else if (thousands == 2)
                    hebrewThousands = 'אלפיים';
                else
                    hebrewThousands = ParseNumber(thousands, false) + ' אלף';
                parts.push(hebrewThousands);
                var hebrewReminder = ParseNumber(remainder, isMale);
                parts.push(hebrewReminder);
                return ParseParts(parts);
            }

            var hundreds = Math.floor(num / 100);
            if (hundreds > 0) {
                var remainder = num % 100;
                var hebrewHundreds = '';
                if (hundreds == 1)
                    hebrewHundreds = 'מאה';
                else if (hundreds == 2)
                    hebrewHundreds = 'מאתיים';
                else
                    hebrewHundreds = ParseNumber(hundreds, false) + ' מאות';
                parts.push(hebrewHundreds);
                var hebrewReminder = ParseNumber(remainder, isMale);
                parts.push(hebrewReminder);
                return ParseParts(parts);
            }

            if (num <= 0)
                return ParseParts(parts);

            if (num == 1) {
                parts.push(isMale ? 'אחד' : 'אחת');
                return ParseParts(parts);
            }

            var oneToTenArray = isMale ? sportUtils.hebrewNumbers.OneToTenMale : sportUtils.hebrewNumbers.OneToTenFemale;
            if (num <= 10) {
                parts.push(oneToTenArray[num - 1]);
                return ParseParts(parts);
            }

            if (num % 10 == 0) {
                var asarot = Math.floor(num / 10);
                parts.push(sportUtils.hebrewNumbers.Asarot[asarot - 1]);
                return ParseParts(parts);
            }

            if (num < 20) {
                num -= 10;
                var hebrewWord = oneToTenArray[num - 1];
                if (num == 2)
                    hebrewWord += 'ם';
                var tenWord = isMale ? sportUtils.hebrewNumbers.OneToTenFemale[9] : sportUtils.hebrewNumbers.OneToTenMale[9];
                parts.push(hebrewWord + ' ' + tenWord);
                return ParseParts(parts);
            }

            var asarotReminder = num % 10;
            var asarotHebrew = ParseNumber(num - asarotReminder, false);
            parts.push(asarotHebrew);
            parts.push(ParseNumber(asarotReminder, isMale));
            return ParseParts(parts);
        }
        while (rawSum.indexOf(',') > 0)
            rawSum = rawSum.replace(',', '');
        rawSum = rawSum.replace('/', '.');
        rawSum = rawSum.replace('\\', '.');
        rawSum = rawSum.replace('|', '.');
        var totalShekels = parseFloat(rawSum);
        if (!isNaN(totalShekels)) {
            var integerPart = parseInt(totalShekels);
            var decimalPart = parseInt(((totalShekels % 1) * 100) + 0.5);
            if (integerPart > 0 && decimalPart >= 0) {
                var shkalimHebrew = ParseNumber(integerPart, true);
                if (integerPart == 1)
                    shkalimHebrew = 'שקל ' + shkalimHebrew;
                else
                    shkalimHebrew  += ' שקלים';
                var agorotHebrew = ParseNumber(decimalPart, false);
                var hebrewResult = shkalimHebrew + '';
                if (agorotHebrew.length > 0) {
                    if (decimalPart == 1)
                        agorotHebrew = 'אגורה ' + agorotHebrew;
                    else
                        agorotHebrew  += ' אגורות';
                    hebrewResult += ' ו' + agorotHebrew;
                }
                return hebrewResult + ' בלבד';
            }
        }
        return '';
    },
    IsValidInteger: function(rawValue) {
        return !isNaN(Number(rawValue)) && rawValue % 1 === 0;
    },
    IsValidPhoneNumber: function(rawPhoneNumber) {
        var phoneNumber = $.trim((rawPhoneNumber ||'').toString()).replace('+', '').replace('972', '').replace('-', '');
        if (phoneNumber.length == 0)
            return true;

        if (phoneNumber.length < 9)
            return false;

        return sportUtils.IsValidInteger(phoneNumber);
    },
    ParseQueryString: function(strQS) {
        if (typeof strQS == 'undefined' || strQS == null) {
            strQS = window.location.search || ''
            if (strQS.length == 0) {
                var strHash = window.location.hash || '';
                var index = strHash.indexOf('?');
                if (index >= 0) {
                    strQS = strHash.substr(index);
                }
            }
        }
        var mapping = {};
        if (strQS.indexOf('?') == 0) {
            var pairs = strQS.substr(1).split('&');
            for (var i = 0; i < pairs.length; i++) {
                var curPair = pairs[i];
                if (curPair.length > 0) {
                    var keyValue = curPair.split('=');
                    if (keyValue.length == 2 && keyValue[0].length > 0)
                        mapping[keyValue[0]] = keyValue[1] || '';
                }
            }
        }
        return mapping;
    },
    RemoveSpecialCharacters: function(rawValue) {
        var specialCharacters = '`~!@#$%^&*()-=_+/\\[]{};:\'"|,<>?';
        var cleanValue = '';
        for (var i = 0; i < rawValue.length; i++) {
            var curChar = rawValue.charAt(i);
            if (specialCharacters.indexOf(curChar) < 0)
                cleanValue += curChar;
        }
        return cleanValue;
    },
    GetHebrewLetter: function(letterIndex) {
        if (letterIndex != null && letterIndex) {
            var index = letterIndex - 1;
            if (index >= 0 && index < sportUtils.hebrewLetters.length)
                return sportUtils.hebrewLetters[index];
        }
        return '';
    },
    InitCustomSelect: function() {
        $('.custom_select').each(function () {
            var list = $(this).children('ul'),
                select = $(this).find('select'),
                title = $(this).find('.select_title');


            // select items to list items

            if ($(this).find('[data-filter]').length) {
                for (var i = 0, len = select.children('option').length; i < len; i++) {
                    list.append('<li data-filter="' + select.children('option').eq(i).data('filter') + '">' + select.children('option').eq(i).text() + '</li>')
                }
            }
            else {
                for (var i = 0, len = select.children('option').length; i < len; i++) {
                    list.append('<li>' + select.children('option').eq(i).text() + '</li>')
                }
            }
            select.hide();

            // open list

            title.on('click', function () {
                list.slideToggle(400);
                $(this).toggleClass('active');
            });

            // selected option

            list.on('click', 'li', function () {
                var val = $(this).text();
                title.text(val);
                list.slideUp(400);
                select.val(val);
                title.toggleClass('active');
            });

        });
    },
    ValidateUrl: function(rawUrl) {
        if (typeof rawUrl == 'undefined' || rawUrl == null || !rawUrl || rawUrl.toString().length == 0)
            return '';
        if (rawUrl.indexOf('.') < 1)
            return '';
        rawUrl = rawUrl.toLowerCase();
        if (rawUrl.indexOf('http://') < 0 && rawUrl.indexOf('https://') < 0)
            rawUrl = 'http://' + rawUrl;
        return rawUrl;
    },
    countWords: function(rawValue) {
        if (rawValue == null || !rawValue || rawValue.toString().length == 0)
            return 0;
        var stringValue = rawValue.toString();
        while (stringValue.indexOf('  ') > 0)
            stringValue = stringValue.replace('  ', ' ');
        return stringValue.split(' ').length;
    },
    parseDate: function(rawDate) {
        if (rawDate != null && rawDate.toString().length == 8) {
            var day =  parseInt(rawDate.substr(0, 2));
            var month = parseInt(rawDate.substr(2, 2));
            var year = parseInt(rawDate.substr(4, 4));
            if (!isNaN(day) && day > 0 && day <= 31 &&
                !isNaN(month) && month > 0 && month <= 12 &&
                !isNaN(year) && year > 1900 && year <= 2100) {
                return new Date(year, month - 1, day);
            }
        }
        return null;
    },
    isNullOrEmpty: function(obj) {
        if (typeof obj == 'undefined')
            return true;
        if (obj == null)
            return true;
        return $.trim(obj.toString()).length == 0;
    },
    shallowCopy: function(obj) {
        var clone = {};
        if (obj != null) {
            for (var prop in obj) {
                clone[prop] = obj[prop];
            }
        }
        return clone;
    },
    VerifyUser: function($http, $scope, extraRoles, callback) {
        function ApplyUnauthorized() {
            $scope.Unauthorized = true;
            window['qL_Finish_Now'] = true;
            if (callback != null) {
                callback(false);
            }
        }

        function UserAuthorized() {
            if (callback != null) {
                callback(true);
            } else {
                ChainFactory.Next();
            }
        }

        if (typeof extraRoles == 'undefined')
            extraRoles = [];

        if (typeof callback == 'undefined')
            callback = null;

        $http.get("/api/login").then(function (resp) {
            if (resp && resp.data) {
                $scope.LoggedInUser = sportUtils.shallowCopy(resp.data);
                if (resp.data.role == 1) {
                    //admin can do anything
                    UserAuthorized();
                } else {
                    //maybe fits extra role?
                    if (extraRoles.indexOf(resp.data.role) >= 0) {
                        UserAuthorized();
                    } else {
                        ApplyUnauthorized();
                    }
                }
            } else {
                ApplyUnauthorized();
            }
        }, function(err) {
            console.log('error verifying user');
            console.log(err);
            ApplyUnauthorized();

        });
    },
    AttachAutoClick: function() {
        $('.auto-click').off('keypress');
        $('.auto-click').keypress(function(evt) {
            var element = $(this);
            var targetId = element.data('button-id');
            if (targetId) {
                var keyCode = evt.keyCode || evt.which;
                if (keyCode == 13) {
                    evt.preventDefault();
                    $('#' + targetId).trigger('click');
                    element.trigger('change');
                }
            }
        });
    },
    AddIfDoesNotExist: function(mapping, rawKey, value) {
        var key = rawKey.toString();
        if (!mapping[key])
            mapping[key] = value;
    },
    FlattenAssociativeArray: function(mapping, matchingValue) {
        if (typeof matchingValue == 'undefined')
            matchingValue = null;
        var flatArray = [];
        for (var key in mapping) {
            if (matchingValue == null || mapping[key] == matchingValue) {
                flatArray.push(key);
            }
        }
        return flatArray;
    },
    SplitArray: function(arr, numOfItems) {
        if (typeof numOfItems == 'undefined' || numOfItems < 1)
            numOfItems = 1;
        var arrayOfArrays = [], buffer = [];
        for (var i = 0; i < arr.length; i++) {
            var curItem = arr[i];
            if (i > 0 && (i % numOfItems) == 0) {
                arrayOfArrays.push(buffer);
                buffer = [];
            }
            buffer.push(curItem);
        }
        if (buffer.length > 0)
            arrayOfArrays.push(buffer);
        return arrayOfArrays;
    },
    CopyArray: function(source, target) {
        if (source && target) {
            for (var i = 0; i < source.length; i++) {
                var curItem = source[i];
                target.push(curItem);
            }
        }
    },
    InsertIntoArray: function(array, item) {
        var newArray = [item];
        for (var i = 0; i < array.length; i++) {
            newArray.push(array[i]);
        }
        return newArray;
    },
    DistinctArray: function(array, propName) {
        if (typeof propName == 'undefined')
            propName = '';
        var mapping = {};
        var distinctItems = [];
        for (var i = 0; i < array.length; i++) {
            var x = array[i] == null ? '' : array[i];
            var key = (propName.length > 0) ? (x[propName] || '').toString() : x.toString();
            if (!mapping[key]) {
                distinctItems.push(x);
                mapping[key] = true;
            }
        }
        return distinctItems;
    },
    IsArray: function(obj) {
        return !!obj && obj.constructor === Array;
    },
    EncodeHTML: function(rawText) {
        if (typeof rawText == 'undefined' || rawText == null)
            rawText = '';
        var encodedText = rawText.toString();
        while (encodedText.indexOf('\r\n') >= 0)
            encodedText = encodedText.replace('\r\n', '\n')
        while (encodedText.indexOf('\n\r') >= 0)
            encodedText = encodedText.replace('\n\r', '\n')
        while (encodedText.indexOf('\n') >= 0)
            encodedText = encodedText.replace('\n', '<br />')
        return encodedText;
    },
    StripHtmlTags: function(rawValue) {
        var stripped = '';
        if (rawValue && rawValue.length > 0) {
            var insideTag = false;
            var tagBuffer = '';
            for (var i = 0; i < rawValue.length; i++) {
                var curChar = rawValue.charAt(i);
                if (insideTag && curChar == '>') {
                    insideTag = false;
                    tagBuffer = '';
                    continue;
                } else if (curChar == '<') {
                    insideTag = true;
                    tagBuffer = '';
                }
                if (insideTag) {
                    tagBuffer +=  curChar;
                } else {
                    stripped += curChar;
                }
            }
        }
        if (tagBuffer.length > 0)
            stripped += tagBuffer;
        return stripped;
    },
    CreateShortVersion: function(fullText, maxLength, addDots) {
        var _this = this;
        if (fullText == null || !fullText || fullText.length == 0)
            return  '';

        if (typeof addDots == 'undefined')
            addDots = true;

        var shortVersion = _this.StripHtmlTags(fullText);
        if (shortVersion.length > maxLength) {
            var breakingChars = ' ,.-()[]{}?!';
            var index = maxLength;
            while (index >= 0) {
                if (breakingChars.indexOf(shortVersion.charAt(index)) >= 0)
                    break;
                index--;
            }
            if (index > 0) {
                shortVersion = shortVersion.substr(0, index);
                if (addDots)
                    shortVersion += '...';
            }
        }
        return shortVersion;
    },
    HebrewMonthName: function(month) {
        switch (month) {
            case 1:
                return 'ינואר';
            case 2:
                return 'פברואר';
            case 3:
                return 'מרץ';
            case 4:
                return 'אפריל';
            case 5:
                return 'מאי';
            case 6:
                return 'יוני';
            case 7:
                return 'יולי';
            case 8:
                return 'אוגוסט';
            case 9:
                return 'ספטמבר';
            case 10:
                return 'אוקטובר';
            case 11:
                return 'נובמבר';
            case 12:
                return 'דצמבר';
        }
        return  '';
    },
    InitJackbox: function() {
        //console.log('init jackbox called, groups: ' + $(".jackbox[data-group]").length)
        if($(".jackbox[data-group]").length){
            $(".jackbox[data-group]").each(function() {
                var curItem = $(this);
                var timerTime = 10;

                //remove if already exists due to state change
                try {
                    curItem.jackBox("removeItem");
                } catch (err) {
                    //console.log('error removing jackbox for ' + curItem.attr('href') + ': ' + err);
                    timerTime = 1000;
                }

                window.setTimeout(function() {
                    curItem.jackBox("init", {
                        showInfoByDefault: false,
                        //defaultShareImage: '',
                        deepLinking: false,
                        preloadGraphics: false,
                        fullscreenScalesContent: true,
                        autoPlayVideo: false,
                        flashVideoFirst: false,
                        defaultVideoWidth: 960,
                        defaultVideoHeight: 540,
                        baseName: ".jackbox",
                        className: ".jackbox",
                        useThumbs: true,
                        thumbsStartHidden: false,
                        thumbnailWidth: 75,
                        thumbnailHeight: 50,
                        useThumbTooltips: false,
                        showPageScrollbar: false,
                        useKeyboardControls: true
                    });
                }, timerTime);
            });

            window.setInterval(function() {
                var imageDescription = '';
                var oContent = $('.jackbox-content');
                if (oContent.length > 0) {
                    var imageSrc = oContent.attr('src');
                    var matchingImage = null;
                    var allImages = $('#galleryContainer').find('img');
                    for (var i = 0; i < allImages.length; i++) {
                        var currentImage = allImages.eq(i);
                        if (currentImage.attr('src') == imageSrc) {
                            matchingImage = currentImage;
                            break;
                        }
                    }
                    if (matchingImage != null) {
                        var description = $.trim(matchingImage.parents('li').find('.image-description').text());
                        $('.jackbox-custom-title').text(description);
                    }
                }

            }, 1000);
        }
    },
    autoSizeFrames: [],
    autoSizeTimer: 0,
    FrameAutoSize: function(frameData) {
        if (sportUtils.IsMobile())
            return;

        if (frameData && frameData.Id && frameData.Id.length > 0 && sportUtils.autoSizeFrames.indexOf(frameData.Id) < 0) {
            sportUtils.autoSizeFrames.push(frameData);
            if (!sportUtils.autoSizeTimer) {
                sportUtils.autoSizeTimer = window.setInterval(function() {
                    for (var i = 0; i < sportUtils.autoSizeFrames.length; i++) {
                        var curFrameData = sportUtils.autoSizeFrames[i];
                        var frameId = curFrameData.Id;
                        var frameElement = $('#' + frameId);
                        if (frameElement.length == 1) {
                            var parentElement = frameElement.parent();
                            if (parentElement.length > 0) {
                                var parentWidth = parentElement.width();
                                if (parentWidth > 0) {
                                    var lastWidth = parseInt(frameElement.data('previousParentWidth'));
                                    if (isNaN(lastWidth) || lastWidth != parentWidth) {
                                        var frameSrc = curFrameData.Src.replace('$width', parentWidth.toString());
                                        frameElement.attr('src', frameSrc);
                                        frameElement.data('previousParentWidth', parentWidth)
                                        //http://www.facebook.com/plugins/likebox.php?href=http%3A%2F%2Fwww.facebook.com%2Fisrschspo&width=408&colorscheme=light&show_faces=true&border_color&stream=true&height=435
                                    }
                                }
                            }
                        }
                    }
                }, 1000);
            }
        }
    },
    IsInteger: function(n) {
        return parseInt(n, 10) == n;
    },
    getRoundedRectangleClass: function(item, additionalClass) {
        var classArray = ['common_rounded_rectangle'];
        if (item.Selected)
            classArray.push('selected_rounded_rectangle');
        else
            classArray.push('transparent_rounded_rectangle');
        if (typeof additionalClass != 'undefined' && additionalClass)
            classArray.push(additionalClass);
        return classArray.join(' ');
    },
    getRoundedRectangleStyle: function(item, bgColor) {
        var style = 'border-color: ' + bgColor + ';';
        if (item.Selected)
            style += ' background-color: ' + bgColor + ';';
        return style;
    },
    getCurrentSeason: function() {
        return {
            'Name': localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] || '',
            'Season': localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year] || 0
        };
    },
    setCurrentSeason: function(season) {
        if (season != null && season.Season > 0) {
            localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] = season.Name;
            localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year] = season.Season;
        } else {
            localStorage.removeItem(sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name);
            localStorage.removeItem(sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year);
        }
    },
    IsValidIdNumber: function(str) {
        // Just in case -> convert to string
        var idNumber = String(str);

        // Validate correct input
        if (idNumber.length > 9 || idNumber.length < 5 || isNaN(idNumber))
            return false;

        // The number is too short - add leading 0000
        while (idNumber.length < 9)
            idNumber = '0' + idNumber;

        // CHECK THE ID NUMBER
        var mone = 0, incNum;
        for (var i = 0; i < 9; i++) {
            incNum = Number(idNumber.charAt(i));
            incNum *= (i % 2) + 1;
            if (incNum > 9)
                incNum -= 9;
            mone += incNum;
        }

        return (mone % 10 == 0);
    },
    HandleFinalsTree: function() {
        function ExtractTeamName(oTeam) {
            return $.trim(oTeam.find(".team-name").text());
        }

        function ExtractTeamScore(oTeam) {
            return parseInt($.trim(oTeam.find(".team-score").text()));
        }

        if ($(".quarter-finals-right-side").length > 0) {
            var firstRightSide = $(".quarter-finals-right-side").first();
            var treeContainer = $(".FinalsTreeContainer");
            var rightMost = firstRightSide.position().left + firstRightSide.width();
            var parentWidth = $(".FinalsTreeContainer").parents(".row").first().width();
            if (parentWidth > rightMost) {
                var leftPos = Math.floor((parentWidth - rightMost) / 2);
                treeContainer.css("left", leftPos + "px");
            }
            var allFinalTeams = $(".team-box.finals");
            if (allFinalTeams.length == 2) {
                var finalsTeamA = allFinalTeams.eq(0), finalsTeamB = allFinalTeams.eq(1);
                var finalsTeamMapping = {}, semiFinalsTeamMapping = {};
                finalsTeamMapping[ExtractTeamName(finalsTeamA)] = true;
                finalsTeamMapping[ExtractTeamName(finalsTeamB)] = true;
                var finalsTeamA_Score = ExtractTeamScore(finalsTeamA), finalsTeamB_Score = ExtractTeamScore(finalsTeamB);
                if (!isNaN(finalsTeamA_Score) && !isNaN(finalsTeamA_Score)) {
                    if (finalsTeamA_Score > finalsTeamB_Score) {
                        finalsTeamA.addClass("winner-team");
                    } else if (finalsTeamB_Score > finalsTeamA_Score) {
                        finalsTeamB.addClass("winner-team");
                    }
                }
            }

            $(".team-box.semi-finals-right-side,.team-box.semi-finals-left-side").each(function() {
                var oTeam = $(this);
                var curTeamName = ExtractTeamName(oTeam);
                semiFinalsTeamMapping[curTeamName] = true;
                if (finalsTeamMapping[curTeamName] == true)
                    oTeam.addClass("winner-team");
            });

            $(".team-box.quarter-finals-left-side,.team-box.quarter-finals-right-side").each(function() {
                var oTeam = $(this);
                var curTeamName = ExtractTeamName(oTeam);
                if (semiFinalsTeamMapping[curTeamName] == true) {
                    oTeam.addClass("winner-team");
                }
            });
        }
        window.setTimeout(sportUtils.HandleFinalsTree, 500);
    },
    InitiateScrollToTopProcess: function() {
        function ClearInterval(event) {
            if (sportUtils.scrollToTopInterval) {
                if (!event.target || event.target.id != 'qLoverlay') {
                    window.clearInterval(sportUtils.scrollToTopInterval);
                    sportUtils.scrollToTopInterval = 0;
                    $(document).unbind('mousemove keyup keydown touchstart touchmove mousewheel', ClearInterval);
                }
            }
        }

        if (sportUtils.scrollToTopInterval == 0) {
            sportUtils.scrollToTopInterval = window.setInterval(function () {
                if (sportUtils.scrollToTopCounter >= 50) {
                    window.clearInterval(sportUtils.scrollToTopInterval);
                    return;
                }
                if (document && document.body) {
                    if (document.body.scrollTop > 0) {
                        document.body.scrollTop = 0;
                        sportUtils.scrollToTopCounter++;
                        if (!sportUtils.scrollToTopEventsAttached) {
                            $(document).bind('mousemove keyup keydown touchstart touchmove mousewheel', ClearInterval);
                            sportUtils.scrollToTopEventsAttached = true;
                        }
                    }
                }
            }, 100);
        }
    },
    IntegerOnlyTextbox: function(textboxID) {
        var element = $('#' + textboxID);
        if (element.length == 1) {
            element.unbind('keypress', IntegerTextboxKeyPress).unbind('blur', IntegerTextboxBlur);
            element.bind('keypress', IntegerTextboxKeyPress).bind('blur', IntegerTextboxBlur);
        }
    },
    SerializeForQueryString: function(obj, prefix, numbersOnly) {
        if (typeof numbersOnly == 'undefined')
            numbersOnly = false;
        var qsParts = [];
        for (var prop in obj) {
            var value = obj[prop];
            if (value != null) {
                if (numbersOnly == false || (numbersOnly == true && !isNaN(parseInt(value)))) {
                    var key = prefix + prop.toString();
                    qsParts.push(key + '=' + encodeURIComponent(value));
                }
            }
        }
        return qsParts.join('&');
    }
};

var ChainFactory = {
    Callbacks: [],
    CurrentIndex: 0,
    Next: function() {
        if (this.CurrentIndex < this.Callbacks.length) {
            var index = this.CurrentIndex;
            this.CurrentIndex++;
            this.Callbacks[index]();
        }
    },
    Execute: function() {
        this.Callbacks = [];
        this.CurrentIndex = 0;
        for (var i = 0; i < arguments.length; i++) {
            var curArg = arguments[i];
            if (typeof curArg == 'function')
                this.Callbacks.push(curArg);
        }
        this.Next();
    }
};

function _sportUtilMisc_ParseColors(rawValue) {
    var commaIndex = (rawValue || '').indexOf(',');
    if (commaIndex > 0) {
        var evenColor = rawValue.substr(0, commaIndex);
        var oddColor = rawValue.substring(commaIndex + 1);
        if (evenColor.length > 0 && oddColor.length > 0) {
            return {
                'Valid': true,
                'Even': evenColor,
                'Odd': oddColor
            };
        }
    }
    return {
        'Valid': false
    }
}

var _sportUtilMiscTimer_Counter = 0;

function TimedFunctions() {
    function HandleProgressDots() {
        if ((_sportUtilMiscTimer_Counter % 5) != 0)
            return;

        var dotLabels = $(".progress-dot");
        if (dotLabels.length == 0)
            return;

        dotLabels.each(function () {
            var dotsLabel = $(this);
            var parentDiv = dotsLabel.parents("div").first();
            if (parentDiv.is(":visible")) {
                var dotCount = dotsLabel.text().length;
                dotCount++;
                if (dotCount > 3)
                    dotCount = 1;
                var dots = Array(dotCount + 1).join(".");
                dotsLabel.text(dots);
            }
        });
    }

    function HandleAlternatingColors() {
        var alternatingColors = $('.alternating-colors');
        if (alternatingColors.length == 0)
            return;

        var validItemsCounter = 0;
        alternatingColors.each(function () {
            var currentElement = $(this);
            var colors = _sportUtilMisc_ParseColors(currentElement.data('colors'));
            if (colors.Valid) {
                var curColor = ((validItemsCounter % 2) == 0) ? colors.Even : colors.Odd;
                currentElement.css('background-color', curColor);
                validItemsCounter++;
            }
        });
    }

    function HandleDependantHeight() {
        var dependantHeightElements = $('.dependant-height');
        if (dependantHeightElements.length == 0)
            return;

        dependantHeightElements.each(function () {
            var element = $(this);
            var sourceElementId = element.data("source-element");
            if (sourceElementId) {
                var sourceElement = $("#" + sourceElementId);
                if (sourceElement.length == 1) {
                    var totalHeight = sourceElement[0].offsetHeight;
                    if (totalHeight > 0) {
                        element.css("height", totalHeight + "px");
                        element.css("line-height", totalHeight + "px");
                        element.css("vertical-alignment", "middle");
                    }
                }
            }
        });
    }

    function CheckDirty() {
        var checkDirtyElements = $(".check-dirty");
        if (checkDirtyElements.length == 0)
            return;

        checkDirtyElements.each(function () {
            var oForm = $(this);
            if (oForm.data("check-dirty-attached") != "1") {
                oForm.find("input").each(function () {
                    var oInput = $(this);
                    oInput.change(function () {
                        oForm.data("is-dirty", "1");
                    });
                });
                oForm.data("check-dirty-attached", "1");
            }
        });
    }

    function HandlePageTypeMapping() {
        var pageTypeMapping = window['page_type_mapping'];
        if (pageTypeMapping && pageTypeMapping != null) {
            var pageLinks = $('a[href*="/page/"]');
            if (pageLinks.length > 0) {
                pageLinks.each(function () {
                    var oLink = $(this);
                    var curHref = oLink.attr("href");
                    var index = curHref.lastIndexOf('/');
                    if (index > 0 && index < (curHref.length - 1)) {
                        var pageSeq = curHref.substr(index + 1);
                        var pageType = pageTypeMapping[pageSeq];
                        if (pageType) {
                            var newHref = curHref.replace('/page/', '/' + pageType + '/');
                            oLink.attr('href', newHref);
                            oLink.onclick = null;
                        }
                    }
                });
            }
        }
    }

    function HandleMobile() {
        if (!sportUtils.IsMobile())
            return;

        var reverseOrderElements = $(".mobile-reverse-order");
        if (reverseOrderElements.length == 0)
            return;

        reverseOrderElements.each(function() {
            var curElement = $(this);
            if (curElement.data("reversed") != "1") {
                var children = curElement.find("> div");
                curElement.append(children.get().reverse());
                curElement.data("reversed", "1");
            }
        });
    }

    function HandleSameFacilities() {
        $(".match-group").each(function() {
            var oMatchGroup = $(this);
            if (oMatchGroup.data("applied-same-facility") != "1") {
                oMatchGroup.data("applied-same-facility", "1");
                var oDateLabel = oMatchGroup.find(".match-date-label").first();
                var arrFacilities = oMatchGroup.find(".category-facility");
                var prevFacilityName = "";
                var sameFacilityCount = 0;
                for (var i = 0; i < arrFacilities.length; i++) {
                    var currentFacilityName = $.trim(arrFacilities.eq(i).text());
                    if (currentFacilityName.length > 0) {
                        if (prevFacilityName.length > 0 && currentFacilityName != prevFacilityName) {
                            if (sameFacilityCount > 1) {
                                var oMatch = arrFacilities.eq(i - 1).parents(".group-match").first();
                                var dateLabelClone = oDateLabel.clone();
                                dateLabelClone.insertAfter(oMatch);
                                oMatch.find(".alternating-colors").css("margin-bottom", "10px");
                            }
                            sameFacilityCount = 0;
                        }
                        sameFacilityCount++;
                        prevFacilityName = currentFacilityName;
                    }
                }
            }
        });
    }

    function HandleMiscStuff() {
        var vodRow = document.getElementById("VOD_row");
        var pnlSales = document.getElementById("pnlSales");
        if (vodRow && vodRow != null && pnlSales != null) {
            var bottom = vodRow.offsetTop + vodRow.offsetHeight;
            var height = bottom - pnlSales.offsetTop;
            $("#pnlSales").css("height", height + "px");
        }
    }

    if (_sportUtilMiscTimer_Counter > 1000000)
        _sportUtilMiscTimer_Counter = 0;
    _sportUtilMiscTimer_Counter++;
    HandleProgressDots();
    HandleAlternatingColors();
    HandleDependantHeight();
    CheckDirty();
    HandlePageTypeMapping();
    HandleMobile();
    HandleSameFacilities();
    HandleMiscStuff();
}

var _sportUtilMiscTimer = window.setInterval(TimedFunctions, 200);
(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ThumbnailSelectionCtrl', ['$scope', '$http', '$uibModalInstance', '$timeout', 'pageSeq', 'images', ThumbnailSelectionCtrl]);

    function ThumbnailSelectionCtrl($scope, $http, $uibModalInstance, $timeout, pageSeq, images) {
        $scope.imageFileNames = images;
        $scope.pageSeq = pageSeq;
        $scope.imageUploadError = '';

        function HandleImageUpload(dropZone, file) {
            var maxFileSize = 5242880;
            function ValidateFile() {
                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var isImage = (isEmpty) ? false : fileType.split('/')[0].toLowerCase() == 'image';
                if (!isImage)
                    return 'ניתן להעלות קובץ תמונה בלבד';

                if (file.size > maxFileSize)
                    return 'גודל קובץ מקסימלי הוא ' + (maxFileSize / (1024 * 1024)).toFixed(1) + ' מגהבייט';

                return '';
            }

            var errorMsg = ValidateFile();
            if (errorMsg.length > 0) {
                $scope.$apply(function () {
                    $scope.imageUploadError = errorMsg;
                });
                window.setTimeout(function () {
                    dropZone.removeFile(file);
                }, 200);
                $timeout(function () {
                    $scope.imageUploadError = '';
                }, 5000);
                return false;
            }

            return true;
        }

        $scope.selectImage = function(imageName, fileSize) {
            if (typeof fileSize == 'undefined')
                fileSize = 0;
            $uibModalInstance.close({
                'FileName': imageName,
                'FileSize': fileSize
            });
        };

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': '/content/Images/' + pageSeq,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'אפשר לגרור לכאן תמונה חדשה, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת תמונה',
                'dictCancelUploadConfirmation': 'ביטול העלאת תמונה',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    if (HandleImageUpload(this, file)) {
                        $scope.selectImage(file.name, file.size);
                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
var bannerUtils = {
    ApplyFrequencyPercentage: function(matchingBanners) {
        if (matchingBanners.length > 0) {
            var totalFrequency = matchingBanners.Sum('Frequency');
            if (matchingBanners.length == 1 || totalFrequency == 0) {
                matchingBanners[0].FrequencyPercentage = 100;
                for (var i = 1; i < matchingBanners.length; i++)
                    matchingBanners[i].FrequencyPercentage = 0;
            } else {
                matchingBanners.forEach(function (curBanner) {
                    var percentage = Math.floor(((curBanner.Frequency / totalFrequency) * 100) + 0.5);
                    curBanner.FrequencyPercentage = percentage;
                });
            }
        }
    },
    ApplyDirtyState: function(banner) {
        if (banner.Seq) {
            if (!banner.original_Seq) {
                var props = [];
                for (var prop in banner) {
                    if (prop.indexOf('$') == -1 && prop != 'FrequencyPercentage' && prop != 'Submitting') {
                        props.push(prop);
                    }
                }
                banner.OriginalProperties = props;
                props.forEach(function(prop) {
                    banner['original_' + prop] = banner[prop];
                });
            }
            if (banner.OriginalProperties && banner.OriginalProperties.length > 0) {
                var isDirty = false;
                for (var j = 0; j < banner.OriginalProperties.length; j++) {
                    var prop = banner.OriginalProperties[j];
                    var originalProp = 'original_' + prop;
                    if (banner[originalProp] != banner[prop]) {
                        //console.log('banner ' + banner.Seq + ' dirty (' + prop + ')');
                        isDirty = true;
                        break;
                    }
                }
                banner.IsDirty = isDirty;
            }
        }
    }
};


(function() {
    'use strict';

    angular
        .module('sport.banners')
        .controller('BannersController',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', BannersController]);

    function BannersController($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        var attachmentBannerData = {
            'ActiveBannerSeq': 0
        };
        var dropZoneBannerMapping = {};
        $scope.banners = [];
        $scope.Unauthorized = false;
        $scope.generalData = {
            possibleLocations: [{BannerType: 1, Name: 'עמוד הבית'}]
        };

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3]);
            window['qL_step_finished'] = true;
        }

        function SetNewBanner() {
            $scope.generalData.NewBanner = {
                CanSave: false,
                Frequency: 10
            };
            $scope.generalData.NewBanner.Location = $scope.generalData.possibleLocations[0];
        }

        SetNewBanner();

        function CalculateFrequencyPercentages(bannerType) {
            var matchingBanners = $scope.banners.filter(function(x) { return x.BannerType == bannerType; });
            bannerUtils.ApplyFrequencyPercentage(matchingBanners);
        }

        function HandleBanners() {
            for (var i = 0; i < $scope.banners.length; i++) {
                var curBanner = $scope.banners[i];
                curBanner.VideoPath = '/content/Banners/' + curBanner.Seq + '/' + curBanner.FileName;
                curBanner.Location = $scope.generalData.possibleLocations.findItem(function(x) { return x.BannerType == curBanner.BannerType; });
            }
            $scope.banners.map(function(x) { return x.BannerType; }).distinct().forEach(function(bannerType) {
                CalculateFrequencyPercentages(bannerType);
            });
            window['qL_step_finished'] = true;
            window['qL_Finish_Now'] = true;
        }

        function ReadBanners() {
            $scope.error = false;
            $http.get('/api/banners').then(function(resp) {
                $scope.banners = [];
                if (resp.data && resp.data.length) {
                    for (var i = 0; i < resp.data.length; i++) {
                        $scope.banners.push(resp.data[i]);
                    }
                }
                HandleBanners();
            }, function(err) {
                console.log('error reading banners');
                console.log(err);
                $scope.error = true;
                window['qL_step_finished'] = true;
                window['qL_Finish_Now'] = true;
            });
        }

        $interval(function() {
            for (var i = 0; i < $scope.banners.length; i++) {
                var curBanner = $scope.banners[i];
                bannerUtils.ApplyDirtyState(curBanner);
            }
            $scope.generalData.NewBanner.CanSave = $scope.generalData.NewBanner.BannerName && $scope.generalData.NewBanner.FileName && $scope.generalData.NewBanner.FileSize;
        }, 1000);

        function HandleFileUpload(dropZone, file) {
            function ValidateAttachment() {
                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var extension = fileType.split('/')[1].toLowerCase();
                var isValid = (isEmpty) ? false : (extension == 'webm' || extension == 'mp4');
                if (!isValid)
                    return 'ניתן להעלות קובץ webm או mp4 בלבד';
                return '';
            }

            function ApplyUploadError(bannerSeq, errorMsg) {
                var matchingBanner = null;
                if (bannerSeq == 'new') {
                    matchingBanner = $scope.generalData.NewBanner;
                } else {
                    matchingBanner = $scope.banners.findItem(function (x) {
                        return x.Seq == bannerSeq;
                    });
                }
                if (matchingBanner != null) {
                    matchingBanner.uploadError = errorMsg;
                }
            }

            var errorMsg = ValidateAttachment();
            if (errorMsg.length > 0) {
                $scope.$apply(function () {
                    ApplyUploadError(attachmentBannerData.ActiveBannerSeq, errorMsg);
                });
                window.setTimeout(function () {
                    dropZone.removeFile(file);
                }, 200);
                $timeout(function () {
                    ApplyUploadError(attachmentBannerData.ActiveBannerSeq, '');
                }, 5000);
                return false;
            }

            return true;
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': '/content/Banners/temp',
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן סרטון, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת סרטון',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    var _this = this;
                    attachmentBannerData.ActiveBannerSeq = $(this.element).parents('.banner-section').first().data('uniqueid');
                    if (HandleFileUpload(this, file)) {
                        var matchingBanner = null;
                        if (attachmentBannerData.ActiveBannerSeq == 'new') {
                            matchingBanner = $scope.generalData.NewBanner;
                        } else {
                            matchingBanner = $scope.banners.findItem(function (x) {
                                return x.Seq == attachmentBannerData.ActiveBannerSeq;
                            });
                        }
                        if (matchingBanner != null) {
                            matchingBanner.FileName = file.name;
                            matchingBanner.FileSize = file.size;
                            dropZoneBannerMapping[attachmentBannerData.ActiveBannerSeq.toString()] = _this;
                        }
                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        ChainFactory.Execute(VerifyUser, ReadBanners);
        window['qL_steps_amount'] = 2;

        $scope.FocusNewBanner = function() {
            var textbox = $("#txtNewBannerName");
            if (textbox.length > 0) {
                var offsetTop = textbox.offset().top;
                document.body.scrollTop = offsetTop - 120;
                textbox.focus();
            }
        };

        $scope.GetNewBannerSaveButtonStyle = function() {
            var styles = ['margin-bottom: 15px;'];
            if ($scope.generalData.NewBanner.CanSave) {
                styles.push('cursor: pointer;');
            } else {
                styles.push('background-color: gray;');
                styles.push('text-decoration: none;');
            }
            return styles.join(' ');
        };

        $scope.GetNewBannerSaveButtonIconStyle = function() {
            return $scope.generalData.NewBanner.CanSave ? '' : 'color: #d0d0d0; background-color: gray;';
        };

        $scope.GetFrequencyClass = function(banner, frequency) {
            var frequencyClass = 'button button_type_icon_small icon button_grey_light';
            if (frequency == 0)
                frequencyClass += ' button_grey_light_zero'
            var hoverClass = 'button_grey_light_hover';
            if (frequency == 0)
                hoverClass += '_zero'
            if (banner.Frequency == frequency)
                frequencyClass += ' ' + hoverClass;
            return frequencyClass;
        };

        $scope.ChooseFrequency = function(banner, frequency) {
            banner.Frequency = frequency;
            CalculateFrequencyPercentages(banner.BannerType);
        };

        $scope.DeleteBanner = function(banner) {
            function NullifyDeletion(banner, success) {
                banner.Deleting.Active = false;
                $timeout(function() {
                    banner.Deleting = null;
                }, 5000);
                if (success) {
                    var index = $scope.banners.findIndex(function(x) { return x.Seq == banner.Seq; });
                    if (index >= 0) {
                        $scope.banners.splice(index, 1);
                        CalculateFrequencyPercentages(banner.BannerType);
                    }
                } else {
                    banner.Deleting.Error = true;
                }
            }

            var msg = 'האם למחוק ';
            msg += (banner.BannerName) ? 'את הפרסומת '  + banner.BannerName
                : 'פרסומת זו';
            msg += '?';
            msg += '<br />' +
            'פעולה זו אינה הפיכה!';
            messageBox.ask(msg).then(function () {
                banner.Deleting = {'Active': true};
                $http.delete('/api/banners/' + banner.Seq).then(function(resp) {
                    NullifyDeletion(banner, true);
                }, function(err) {
                    NullifyDeletion(banner, false);
                });
            });
        };

        $scope.Save = function(banner) {
            function Clean(banner) {
                banner.IsDirty = false;
                if (banner.OriginalProperties) {
                    banner.OriginalProperties.forEach(function (prop) {
                        banner['original_' + prop] = banner[prop];
                    });
                }
            }

            function NullifySubmission(banner, success) {
                banner.Submitting.Active = false;
                $timeout(function() {
                    banner.Submitting = null;
                }, 5000);
                if (success) {
                    banner.Submitting.Success = true;
                    Clean(banner);
                } else {
                    banner.Submitting.Error = true;
                }
            }

            function RemoveFiles(bannerSeq) {
                var dropZone = dropZoneBannerMapping[bannerSeq.toString()];
                if (dropZone) {
                    for (var i = 0; i < dropZone.files.length; i++) {
                        var curFile = dropZone.files[i];
                        dropZone.removeFile(curFile);
                    }
                }
            }

            if (!banner.Seq && !banner.CanSave)
                return;

            if (banner.Location) {
                banner.BannerType = banner.Location.BannerType;
            }
            banner.Submitting = {'Active': true};
            if (banner.Seq) {
                $http.put('/api/banners', banner).then(function (resp) {
                    banner.AttachmentSeq = resp.data.AttachmentSeq;
                    banner.VideoPath = '/content/Banners/' + banner.Seq + '/' + banner.FileName;
                    NullifySubmission(banner, true);
                    RemoveFiles(banner.Seq);
                }, function (err) {
                    NullifySubmission(banner, false);
                });
            } else {
                var clonedBanner = sportUtils.shallowCopy($scope.generalData.NewBanner);
                clonedBanner.BannerType = clonedBanner.Location ? clonedBanner.Location.BannerType : 1;
                $http.post('/api/banners', clonedBanner).then(function (resp) {
                    clonedBanner.Seq = resp.data.BannerSeq;
                    clonedBanner.AttachmentSeq = resp.data.AttachmentSeq;
                    clonedBanner.DateCreated = resp.data.DateCreated;
                    clonedBanner.UploadedBy = {
                        Seq: $scope.LoggedInUser.seq,
                        Login: $scope.LoggedInUser.name,
                        Name: $scope.LoggedInUser.displayName,
                        Role: $scope.LoggedInUser.role
                    };
                    clonedBanner.VideoPath = '/content/Banners/' + clonedBanner.Seq + '/' + clonedBanner.FileName;
                    NullifySubmission(clonedBanner, true);
                    RemoveFiles('new');
                    $scope.banners.push(clonedBanner);
                    SetNewBanner();
                    CalculateFrequencyPercentages(clonedBanner.BannerType);
                    $timeout(function() {
                        Clean(clonedBanner);
                    }, 1200);
                }, function (err) {
                    NullifySubmission(clonedBanner, false);
                });
            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.championships')
        .controller('ChampionshipsController',
            ['$scope', '$state', '$stateParams', '$q', '$http', '$filter', '$interval', '$timeout', 'SportService', 'ChampionshipsService', 'EventsService', 'ContentService', ChampionshipsController])
        .controller('ChampionshipCategoryCtrl',
            ['$scope', '$http', '$filter', '$timeout', '$uibModal', '$rootScope', ChampionshipCategoryCtrl])
        .controller('ChampionshipCategoryFinalsTreeCtrl',
            ['$scope', '$http', '$filter', ChampionshipCategoryFinalsTreeCtrl])
        .controller('EditResultsController',
        ['$scope', '$http', '$filter', '$uibModal', EditResultsController]);

    function ChampionshipsController($scope, $state, $stateParams, $q, $http, $filter, $interval, $timeout, SportService, ChampionshipsService, EventsService, ContentService) {
        var sportFieldsMapping = {};
        var allChampionships = [];
        var allSportFlowersEvents = [];
        var sportFieldsPerRow = 4;
        var championshipsPerRow = 4;
        var categoriesPerRow = 4;
        $scope.championshipsFilters = {'SportField': 0, 'Championship': ''};
        $scope.sportFieldsInUse = {'All': [], 'Rows': []};
        $scope.championshipsInUse = {'All': [], 'Rows': []};
        $scope.categoriesInUse = {'All': [], 'Rows': []};
        $scope.selectedCategory = null;
        $scope.error = '';
        $scope.loading = true;
        $scope.region = null;
        $scope.isClubs = ($stateParams.clubs == 1);
        $scope.showPermanentChampionships = ($stateParams.region == 'p');
        $scope.currentSeason = sportUtils.getCurrentSeason();
        $scope.championshipChoosingTitle = '';
        $scope.categoryChoosingTitle = '';

        if ($stateParams.category && $stateParams.category > 0 && !$scope.showPermanentChampionships) {
            var category = $stateParams.category;
            $http.get('/api/sportsman/category-data?category=' + category).then(function (resp) {
                window['qL_step_finished'] = true;
                var seasonCode = resp.data.SEASON;
                var champName = resp.data.CHAMPIONSHIP_NAME;
                var categoryIsClubs = resp.data.IS_CLUBS;
                var categoryRegion = resp.data.REGION_ID;
                if (seasonCode == null || !seasonCode) {
                    $state.go('championships', {clubs: $stateParams.clubs, region: $stateParams.region});
                }
                SportService.seasons.inUse().then(function(seasonsInUse) {
                    window['qL_step_finished'] = true;
                    var matchingSeasons = seasonsInUse.filter(function(x) { return x.SeasonCode == seasonCode; });
                    if (matchingSeasons.length == 0) {
                        $scope.error = 'לא נמצאה עונה עבור האליפות ' + champName;
                    } else {
                        var categorySeason = matchingSeasons[0].Season;
                        SportService.currentSeason().then(function (currentSeason) {
                            window['qL_Finish_Now'] = true;
                            if (categorySeason != currentSeason) {
                                $state.go('championships', {clubs: $stateParams.clubs, region: $stateParams.region});
                            } else {
                                var stateIsClubs = ($stateParams.clubs == 1) ? 1 : 0;
                                if (categoryIsClubs != stateIsClubs || categoryRegion != $stateParams.region) {
                                    $state.go('championships.region.championship', {clubs: categoryIsClubs, region: categoryRegion, category: category});
                                    return;
                                }
                            }
                        });
                    }
                });
            });
        }

        contentUtils.InitSportFieldColors($http, function() {
            window['qL_step_finished'] = true;
        });

        function ReadAllRegions() {
            $http.get('/api/sportsman/regions').then(function (resp) {
                $scope.allRegions = resp.data.slice(0);
                if ($scope.region != null) {
                    var selectedRegionId = $scope.region.REGION_ID;
                    $scope.allRegions.forEach(function (curRegion) {
                        if (curRegion.REGION_ID == selectedRegionId) {
                            curRegion.Selected = true;
                        }
                    });
                }
            });
        }

        if ($stateParams.region != null) {
            var regionID = $stateParams.region;
            var selectedCategory = $stateParams.category;
            if (regionID == 'p') {
                $http.get('/api/sportsman/permanent-championships').then(function(resp) {
                    $scope.permanentChampionships = resp.data.slice(0);
                    if (selectedCategory) {
                        for (var i = 0; i < $scope.permanentChampionships.length; i++) {
                            var curPermanentChamp = $scope.permanentChampionships[i];
                            if (curPermanentChamp.CHAMPIONSHIP_CATEGORY_ID == selectedCategory) {
                                curPermanentChamp.Selected = true;
                                break;
                            }
                        }
                    }
                });
            } else {
                $http.get('/api/sportsman/regions').then(function (resp) {
                    var matchingRegions = resp.data.filter(function (x) {
                        return x.REGION_ID == regionID;
                    });
                    if (matchingRegions.length > 0) {
                        $scope.region = matchingRegions[0];
                        $http.get('/api/pages?region=' + regionID).then(function(resp) {
                            var allPages = resp.data.slice(0);
                            if (allPages.length > 0) {
                                $scope.regionPages = allPages.take(8);
                                contentUtils.ApplyPagesData($scope.regionPages);
                                $scope.regionPages.forEach(function (page) {
                                    page.Date = new Date(page.Date);
                                    page.HebrewType = contentUtils.HebrewPageType(page.Type);
                                    page.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(page.Type);

                                });
                            }
                            ReadAllRegions();
                        });
                    }
                });
            }
        } else {
            ReadAllRegions();
        }

        function RebuildSportFieldsInUse() {
            $scope.sportFieldsInUse.All = sportUtils.DistinctArray(allChampionships.map(function(x) {
                return x.SPORT_ID;
            })).map(function(sportId) {
                return {
                    'Id': sportId,
                    'Name': sportFieldsMapping[sportId.toString()]
                };
            });

            var sportFieldRows = sportUtils.SplitArray($scope.sportFieldsInUse.All, sportFieldsPerRow);
            if (sportFieldRows.length > 0) {
                var lastRow = sportFieldRows[sportFieldRows.length - 1];
                var blankItemsCount = sportFieldsPerRow - lastRow.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    lastRow.push({
                        'Id': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                for (var i = 0; i < sportFieldRows.length; i++) {
                    var currentRow = sportFieldRows[i];
                    currentRow.sort(function(s1, s2) {
                        return s1.Id - s2.Id;
                    });
                }
            }
            $scope.sportFieldsInUse.Rows = sportFieldRows;
        }

        function ApplyChampionshipRows() {
            if ($scope.championshipsFilters.SportField == 0) {
                $scope.championshipsFilters.Championship = '';
                $scope.championshipsInUse.Rows = [];
                return;
            }

            var matchingChampionships = $scope.championshipsInUse.All.filter(function(x) {
                return x.SportField == $scope.championshipsFilters.SportField;
            });
            var championshipRows = sportUtils.SplitArray(matchingChampionships, championshipsPerRow);
            if (championshipRows.length > 0) {
                var lastRow = championshipRows[championshipRows.length - 1];
                var blankItemsCount = championshipsPerRow - lastRow.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    lastRow.push({
                        'SportField': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                for (var i = 0; i < championshipRows.length; i++) {
                    var currentRow = championshipRows[i];
                    currentRow.sort(function(c1, c2) {
                        return c1.SportField - c2.SportField;
                    });
                }
            }
            $scope.championshipsInUse.Rows = championshipRows;
        }

        function ApplyChampionshipCategories() {
            if ($scope.championshipsFilters.Championship == '') {
                $scope.categoriesInUse.Rows = [];
                return;
            }

            var matchingCategories = $scope.categoriesInUse.All.filter(function(x) {
                return x.Championship == $scope.championshipsFilters.Championship;
            });

            matchingCategories.sortByProperty('Name');
            var categoryRows = sportUtils.SplitArray(matchingCategories, categoriesPerRow);
            if (categoryRows.length > 0) {
                var lastRow = categoryRows[categoryRows.length - 1];
                var blankItemsCount = categoriesPerRow - lastRow.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    lastRow.push({
                        'SportField': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                for (var i = 0; i < categoryRows.length; i++) {
                    var currentRow = categoryRows[i];
                    currentRow.sort(function(c1, c2) {
                        return  c1.SportField - c2.SportField;
                    });
                }
            }
            $scope.categoriesInUse.Rows = categoryRows;
        }

        function ReadSportFields() {
            SportService.sportFields().then(function(mapping) {
                sportFieldsMapping = mapping;
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error reading sport fields: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllChampionships() {
            function GetSportFlowersEvents() {
                var deferred = $q.defer();
                if ($stateParams.region == 0 && $scope.isClubs == 0) {
                    EventsService.sportFlowersEvents().then(function(sportFlowersEvents) {
                        deferred.resolve(sportFlowersEvents);
                    }, function(err) {
                        deferred.reject('שגיאה בעת  טעינת נתונים מהשרת');
                    });
                } else {
                    deferred.resolve([]);
                }
                return deferred.promise;
            }

            var deferred = $q.defer();
            allChampionships = [];
            $scope.loading = true;
            ChampionshipsService.read({'region': $stateParams.region, 'omitEmpty': 0}).then(function(championships) {
                GetSportFlowersEvents().then(function(sportFlowersEvents) {
                    allSportFlowersEvents = sportFlowersEvents.slice(0);
                    $http.get('/api/sportsman/permanent-championships').then(function(resp) {
                        var permanentChampionships = resp.data.slice(0);
                        var permanentChampMapping = {};
                        permanentChampionships.forEach(function(permanentChampionship) {
                            permanentChampMapping[permanentChampionship.CHAMPIONSHIP_CATEGORY_ID.toString()] = true;
                        });
                        $scope.loading = false;
                        var clubsValue = $scope.isClubs == 1 ? 1 : 0;
                        allChampionships = championships.slice(0).filter(function (x) {
                            return x.IS_CLUBS == clubsValue && !permanentChampMapping[x.CHAMPIONSHIP_CATEGORY_ID.toString()];
                        });
                        var sportFlowersChampionships = championshipsUtils.convertSportFlowersChampionships(sportFlowersEvents, $filter);
                        for (var i = 0; i < sportFlowersChampionships.length; i++) {
                            var curSportFlowerChamp = sportFlowersChampionships[i];
                            allChampionships.push(curSportFlowerChamp);
                        }
                        var championshipSportFieldMapping = allChampionships.toAssociativeArray(true, 'CHAMPIONSHIP_NAME', 'SPORT_ID');
                        $scope.championshipsInUse.All = sportUtils.DistinctArray(allChampionships.map(function (x) {
                            return x.CHAMPIONSHIP_NAME;
                        })).map(function (champName) {
                            return {
                                'Name': champName,
                                'SportField': championshipSportFieldMapping[champName]
                            };
                        });
                        ApplyChampionshipRows();

                        $scope.categoriesInUse.All = [];
                        var categoryMapping = {};
                        for (var i = 0; i < allChampionships.length; i++) {
                            var curChampionship = allChampionships[i];
                            var categoryName = curChampionship.CATEGORY_NAME;
                            var champName = curChampionship.CHAMPIONSHIP_NAME;
                            var key = curChampionship.SPORT_ID + '_' + champName + '_' + categoryName;
                            if (curChampionship.SPORT_ID == sportGlobalSettings.FlowersFieldSeq)
                                key += '_' + curChampionship.CHAMPIONSHIP_ID + '_' + curChampionship.CHAMPIONSHIP_CATEGORY_ID;
                            if (!categoryMapping[key]) {
                                $scope.categoriesInUse.All.push({
                                    'Name': categoryName,
                                    'Championship': champName,
                                    'SportField': curChampionship.SPORT_ID,
                                    'CategoryId': curChampionship.CHAMPIONSHIP_CATEGORY_ID,
                                    'SportType': curChampionship.SPORT_TYPE
                                });
                                categoryMapping[key] = true;
                            }
                        }
                        ApplyChampionshipCategories();
                        RebuildSportFieldsInUse();
                        deferred.resolve('done');
                    }, function(err) {
                        $scope.loading = false;
                        deferred.reject(err);
                    });
                }, function(err) {
                    $scope.loading = false;
                    deferred.reject(err);
                });
            }, function(err) {
                $scope.loading = false;
                deferred.reject('שגיאה בעת  טעינת נתונים מהשרת');
            });
            return deferred.promise;
        }

        function ApplySelectedCategory(category) {
            ResetSelectedCategory();
            var catName = BuildCategoryName(category);
            $scope.selectedCategory.Name = catName;
            $scope.selectedCategory.ID = category.CategoryId;
            if (category.SportField == sportGlobalSettings.FlowersFieldSeq) {
                //sport flowers
                var matchingEvent = allSportFlowersEvents.findItem(function(x) {
                    return x.Seq == category.CategoryId;
                });
                if (matchingEvent != null) {
                    $scope.selectedCategory.Name = 'פרחי ספורט - ' + matchingEvent.EventName;
                    var description = matchingEvent.SportFieldName;
                    if (matchingEvent.FacilityName)
                        description += ' ' + matchingEvent.FacilityName;
                    $scope.selectedCategory.SportFlowersData = {
                        Description: description,
                        Date: matchingEvent.DateTime,
                        FacilityName: matchingEvent.FacilityName
                    };
                    ContentService.championship('sf-' + category.CategoryId).then(function(pages) {
                        window['qL_step_finished'] = true;
                        if (pages && pages.length > 0) {
                            $scope.selectedCategory.Pages = pages;
                            $scope.selectedCategory.Pages.forEach(function (page) {
                                page.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(page.Type);
                                page.HebrewType = contentUtils.HebrewPageType(page.Type);
                            });
                            contentUtils.ApplyPagesData($scope.selectedCategory.Pages);
                        }
                    });
                }
                return;
            }
            EventsService.sportsmanEvents({'category': category.CategoryId}).then(function (sportsmanEvents) {
                window['qL_step_finished'] = true;
                sportsmanEvents.sort(function(e1, e2) {
                    return e1.Date.getTime() - e2.Date.getTime();
                });
                ContentService.championship(category.CategoryId).then(function(pages) {
                    window['qL_step_finished'] = true;
                    if (pages && pages.length > 0) {
                        $scope.selectedCategory.Pages = pages;
                        $scope.selectedCategory.Pages.forEach(function(page) {
                            page.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(page.Type);
                            page.HebrewType = contentUtils.HebrewPageType(page.Type);
                        });
                        contentUtils.ApplyPagesData($scope.selectedCategory.Pages);
                    }
                    var timeZoneOffset = (new Date()).getTimezoneOffset() * 60 * 1000;
                    //ugly hack to not show delayed games for volleyball
                    var hideDelayedMessage = category.Championship && category.Championship.indexOf('כדורעף') >= 0;
                    var allCategoryMatches = sportsmanEvents.map(function (curEvent, index) {
                        var isDelayed = false;
                        if (!hideDelayedMessage)
                            isDelayed = (curEvent.DATE_CHANGED_DATE) ? true : false;
                        return {
                            SPORT_ID: curEvent.SPORT_ID,
                            ROUND_NAME: curEvent.ROUND_NAME,
                            CYCLE_NAME: curEvent.CYCLE_NAME,
                            PHASE_NAME: curEvent.PHASE_NAME,
                            GROUP_NAME: curEvent.GROUP_NAME,
                            Date: curEvent.Date,
                            Group: curEvent.NGROUP,
                            Phase: curEvent.PHASE,
                            GameDetails: eventsUtils.BuildGameDetails(curEvent),
                            TeamA: eventsUtils.BuildTeamName(curEvent, 'A'),
                            TeamB: eventsUtils.BuildTeamName(curEvent, 'B'),
                            TeamA_Score: curEvent.TEAM_A_SCORE,
                            TeamB_Score: curEvent.TEAM_B_SCORE,
                            TeamA_Id: curEvent.TEAM_A_ID,
                            TeamB_Id: curEvent.TEAM_B_ID,
                            FacilityName: curEvent.FACILITY_NAME,
                            FacilityAddress: curEvent.FACILITY_ADDRESS,
                            FacilityCity: curEvent.FACILITY_CITY,
                            Result: curEvent.RESULT,
                            TimeWithoutZone: new Date(curEvent.TimeWithoutZone),
                            SecondsSinceEpoch: curEvent.SecondsSinceEpoch,
                            LocalTime: new Date((curEvent.SecondsSinceEpoch * 1000) + timeZoneOffset),
                            FormattedTime: curEvent.FormattedTime,
                            PartsData: championshipsUtils.ConvertPartsResult(curEvent.PARTS_RESULT),
                            HideDelayedMessage: hideDelayedMessage,
                            IsDelayed: isDelayed,
                            Id: index + 1
                        };
                    });
                    $scope.selectedCategory.LoadingPhases = true;
                    ChampionshipsService.teams(category.CategoryId, allCategoryMatches, category.SportType).then(function(data) {
                        var allCategoryTeams = data.Teams;
                        var competitorsMapping = {};
                        if (allCategoryTeams.Competitors) {
                            for (var i = 0; i < allCategoryTeams.Competitors.length; i++) {
                                var competitor = allCategoryTeams.Competitors[i];
                                var curTeamID = competitor.TeamId;
                                if (curTeamID) {
                                    var phaseIndex = competitor.PhaseIndex;
                                    var key = curTeamID + '_' + phaseIndex;
                                    if (!competitorsMapping[key])
                                        competitorsMapping[key] = [];
                                    competitorsMapping[key].push(competitor);
                                }
                            }
                        }
                        var finalsTree = data.Tree;
                        window['qL_step_finished'] = true;

                        ChampionshipsService.selectedPhase(category.CategoryId).then(function(activePhaseIndex) {
                            window['qL_step_finished'] = true;
                            $scope.selectedCategory.LoadingPhases = false;
                            $scope.selectedCategory.FinalsTree = finalsTree;
                            $scope.selectedCategory.Matches = allCategoryMatches;
                            $scope.selectedCategory.SportType = category.SportType;
                            sportUtils.HideWhenFramed(["#main_header", ".breadcrumb", "#pnlRegionSelection", "#pnlChampionshipFiles", "#pnlCategoryChooseFilters", "#pnlChooseRegion", "#pnlChooseSportAndCategory", "#pnlChangeChampionship", ".footer"]);
                            sportUtils.ApplyEnglishChampionship();
                            var showCategoryMatches = function(hideBeforeShowing, callback) {
                                if (typeof callback == 'undefined')
                                    callback = null;
                                if (hideBeforeShowing)
                                    $scope.selectedCategory.ShowMatches = false;
                                $timeout(function() {
                                    $scope.selectedCategory.ShowMatches = true;
                                    if (callback != null)
                                        callback();
                                }, 1000);
                            }
                            var teamsMapping = {};
                            var facilitiesMapping = {};
                            $scope.selectedCategory.Matches.forEach(function(curMatch) {
                                teamsMapping[curMatch.TeamA] = curMatch.TeamA_Id;
                                teamsMapping[curMatch.TeamB] = curMatch.TeamB_Id;
                                if (curMatch.FacilityName && curMatch.FacilityName.length > 0)
                                    facilitiesMapping[curMatch.FacilityName] = {'Address': curMatch.FacilityAddress, 'City': curMatch.FacilityCity};
                            });
                            if (category.SportType != 1) {
                                var allTeams = [];
                                for (var team_name in teamsMapping) {
                                    allTeams.push({
                                        Name: team_name,
                                        Id: teamsMapping[team_name]
                                    });
                                }
                                var allFacilities = [];
                                for (var facility_name in facilitiesMapping) {
                                    var curFacility = facilitiesMapping[facility_name];
                                    var fullAddress = '';
                                    if (curFacility.Address && curFacility.Address.length > 0)
                                        fullAddress = curFacility.Address;
                                    if (curFacility.City && curFacility.City.length > 0 && fullAddress.indexOf(curFacility.City) < 0) {
                                        if (fullAddress.length > 0)
                                            fullAddress += ', ';
                                        fullAddress += curFacility.City;
                                    }
                                    allFacilities.push({
                                        Name: facility_name,
                                        FullAddress: fullAddress
                                    });
                                }

                                $scope.selectedCategory.AllTeams = allTeams.filter(championshipsUtils.actualTeamsFilter);
                                $scope.selectedCategory.AllFacilities = allFacilities;
                                championshipsUtils.InitTeamNamesHeightTimer();
                            }
                            $scope.selectedCategory.selectedTeam = null;
                            $scope.selectedCategory.selectedFacility = null;
                            $scope.selectedCategory.prevSelectedTeam = '';
                            $scope.selectedCategory.prevSelectedFacility = '';
                            $scope.selectedCategory.FilteredMatches = $scope.selectedCategory.Matches;
                            $scope.selectedCategory.setSelectedTeam = function(team, cellIndex) {
                                if (typeof cellIndex != 'undefined') {
                                    var row = team;
                                    if (cellIndex == 1) {
                                        $scope.selectedCategory.selectedTeam = row.Team;
                                        $scope.selectedCategory.selectedFacility = null;
                                        $scope.selectedCategory.selectedPlayers = null;
                                    }
                                } else {
                                    showCategoryMatches(true);
                                    $scope.selectedCategory.selectedTeam = team;
                                    $scope.selectedCategory.selectedFacility = null;
                                    $scope.selectedCategory.selectedPlayers = null;
                                    if (team != null) {
                                        var teamID = teamsMapping[team.Name];
                                        if (teamID) {
                                            var matchingTeam = null;
                                            if ($scope.selectedCategory.SelectedMatchesGroup && $scope.selectedCategory.SelectedMatchesGroup.Teams) {
                                                matchingTeam = $scope.selectedCategory.SelectedMatchesGroup.Teams.findItem(function(x) {
                                                    return x.TEAM_ID == teamID;
                                                });
                                            }
                                            if (matchingTeam == null) {
                                                var matchingPhase = null;
                                                var matchingGroup = null;
                                                $scope.selectedCategory.Phases.forEach(function(curPhase) {
                                                    if (matchingTeam == null && curPhase.AllGroups) {
                                                        curPhase.AllGroups.forEach(function(curGroup) {
                                                            if (matchingTeam == null && curGroup.Teams) {
                                                                matchingTeam = curGroup.Teams.findItem(function(x) {
                                                                    return x.TEAM_ID == teamID;
                                                                });
                                                                if (matchingTeam != null) {
                                                                    matchingPhase = curPhase;
                                                                    matchingGroup = curGroup;
                                                                }
                                                            }
                                                        });
                                                    }
                                                });
                                                if (matchingPhase != null && matchingGroup != null && $scope.selectedCategory.changeMatchesPhase) {
                                                    $scope.selectedCategory.changeMatchesPhase(matchingPhase);
                                                    $scope.selectedCategory.changeGroup(matchingGroup);
                                                }
                                            }
                                            $http.get('/api/sportsman/teams/' + teamID + '/players').then(function (resp) {
                                                $scope.selectedCategory.selectedPlayers = resp.data;
                                            });
                                        }
                                    }
                                }

                                if ($scope.selectedCategory.selectedTeam != null) {
                                    var teamID = $scope.selectedCategory.selectedTeam.Id;
                                    var phaseIndex = $scope.selectedCategory.Phases.findIndex(function(x) { return x.Selected == true; });
                                    var key = teamID + '_' + phaseIndex;
                                    var teamCompetitors = competitorsMapping[key];
                                    if (teamCompetitors)
                                        $scope.selectedCategory.selectedTeam.Competitors = teamCompetitors;
                                }
                            };
                            $scope.selectedCategory.setSelectedCompetitor = function(competitor) {
                                $scope.selectedCategory.selectedCompetitor = competitor;
                            };
                            $scope.selectedCategory.setSelectedCompetition = function(competition, backToTop) {
                                if (typeof backToTop == 'undefined')
                                    backToTop = false;
                                $scope.selectedCategory.setSelectedCompetitor(null);
                                $scope.selectedCategory.selectedCompetition = competition;
                                if (backToTop) {
                                    document.body.scrollTop = 50;
                                }
                            };
                            $scope.selectedCategory.setSelectedFacility = function(facility, match) {
                                if (typeof match == 'undefined')
                                    match = null;
                                if ($scope.selectedCategory.Matches) {
                                    $scope.selectedCategory.Matches.forEach(function(x) {
                                        x.ShowFacilityDetails = false;
                                    });
                                }
                                if (match != null) {
                                    match.ShowFacilityDetails = true;
                                    if (facility == null && $scope.selectedCategory.AllFacilities) {
                                        facility = $scope.selectedCategory.AllFacilities.findItem(function(x) {
                                            return x.Name == match.FacilityName;
                                        });
                                    }
                                }
                                if (facility != null && $scope.selectedCategory.Matches) {
                                    var exists = false;
                                    if ($scope.selectedCategory.SelectedMatchesRound && $scope.selectedCategory.SelectedMatchesRound.Cycles) {
                                        for (var i = 0; i < $scope.selectedCategory.SelectedMatchesRound.Cycles.length; i++) {
                                            var curCycle = $scope.selectedCategory.SelectedMatchesRound.Cycles[i];
                                            if (curCycle.MatchGroups) {
                                                for (var j = 0; j < curCycle.MatchGroups.length; j++) {
                                                    var curMatchGroup = curCycle.MatchGroups[j];
                                                    if (curMatchGroup.Matches) {
                                                        for (var k = 0; k < curMatchGroup.Matches.length; k++) {
                                                            var curMatch = curMatchGroup.Matches[k];
                                                            if (curMatch.FacilityName == facility.Name) {
                                                                exists = true;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if (exists)
                                                        break;
                                                }
                                            }
                                            if (exists)
                                                break;
                                        }
                                    }
                                    if (!exists) {
                                        var matchingMatch = $scope.selectedCategory.Matches.findItem(function (x) {
                                            return x.FacilityName == facility.Name;
                                        });
                                        if (matchingMatch != null && $scope.selectedCategory.Phases) {
                                            var matchingPhase = $scope.selectedCategory.Phases.findItem(function (x) {
                                                return x.Index == matchingMatch.Phase;
                                            });
                                            if (matchingPhase != null) {
                                                $scope.selectedCategory.changeMatchesPhase(matchingPhase);
                                                if (matchingPhase.AllGroups) {
                                                    var matchingGroup = matchingPhase.AllGroups.findItem(function (x) {
                                                        return x.Index == matchingMatch.Group;
                                                    });
                                                    if (matchingGroup != null) {
                                                        $scope.selectedCategory.changeGroup(matchingGroup);
                                                        if (matchingPhase.Rounds) {
                                                            var matchingRound = matchingPhase.Rounds.findItem(function (x) {
                                                                return x.Name == matchingMatch.ROUND_NAME;
                                                            });
                                                            if (matchingRound != null) {
                                                                $scope.selectedCategory.changeMatchesRound(matchingRound);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                showCategoryMatches(true);
                                $scope.selectedCategory.selectedFacility = facility;
                                if (match != null)
                                    match.ShowFacilityDetails = true;
                            };
                            $scope.selectedCategory.IsDateVisible = function(match) {
                                var existingMatchIndex = $scope.selectedCategory.FilteredMatches.findIndex(function(x) { return x.Id == match.Id; });
                                if (existingMatchIndex > 0) {
                                    var previousMatch = $scope.selectedCategory.FilteredMatches[existingMatchIndex - 1];
                                    var previousMatchDate = $filter('date')(previousMatch.Date, 'dd/MM/yyyy')
                                    var existingMatchDate = $filter('date')(match.Date, 'dd/MM/yyyy');
                                    return  previousMatchDate != existingMatchDate;
                                }
                                return true;
                            };
                            $scope.selectedCategory.getTeamRowStyle = function(team, getByTeamName) {
                                var selectedTeam = $scope.selectedCategory.selectedTeam == null ? '' : $scope.selectedCategory.selectedTeam.Name;
                                if (getByTeamName) {
                                    return selectedTeam == team ? 'background-color: #00ADEE;' : '';
                                } else {
                                    return selectedTeam == team.Name ? 'background-color: #00ADEE;' : '';
                                }
                            };
                            $scope.selectedCategory.getCompetitorRowStyle = function(row) {
                                var selectedCompetitorNumber = $scope.selectedCategory.selectedCompetitor == null ? '' : $scope.selectedCategory.selectedCompetitor.ShirtNumber;
                                var currentNumber = row.CellValues[0];
                                return (selectedCompetitorNumber && selectedCompetitorNumber == currentNumber) ? 'background-color: #00ADEE;' : '';
                            };
                            var phases = [];
                            if (category.SportType == 1) {
                                if (allCategoryTeams.RankingTables && allCategoryTeams.RankingTables.length > 0) {
                                    phases = allCategoryTeams.RankingTables.map(function (x) {
                                        return {
                                            'Name': x.PhaseName
                                        }
                                    });
                                }
                            } else {
                                phases = sportUtils.DistinctArray($scope.selectedCategory.Matches, 'PHASE_NAME').map(function(x) {
                                    return {
                                        'Name': x.PHASE_NAME
                                    };
                                });
                            }
                            var selectedPhaseIndex = activePhaseIndex || 0;
                            if (selectedPhaseIndex >= phases.length)
                                selectedPhaseIndex = 0;
                            if (category.SportType == 1) {
                                $scope.selectedCategory.AllTeams = [];
                                $scope.selectedCategory.AllCompetitions = [];
                                if (allCategoryTeams.RankingTables && allCategoryTeams.RankingTables.length > 0) {
                                    var rankingTables = allCategoryTeams.RankingTables[selectedPhaseIndex];
                                    $scope.selectedCategory.AllTeams = rankingTables.Teams;
                                    $scope.selectedCategory.AllCompetitions = rankingTables.Competitions;
                                }
                                $scope.selectedCategory.CompetitorMapping = competitorsMapping;
                            }
                            var allPhaseGroups = [];
                            var allPhaseTeams = [];
                            if (phases.length > 0) {
                                phases[selectedPhaseIndex].Selected = true;
                                for (var i = 0; i < phases.length; i++) {
                                    var curPhase = phases[i];
                                    curPhase.Index = i;
                                    if (category.SportType == 1) {
                                        var allPhaseCompetitions = [];
                                        if (allCategoryTeams.RankingTables && allCategoryTeams.RankingTables.length > 0) {
                                            var rankingTable = allCategoryTeams.RankingTables[i];
                                            var groupMapping = {};
                                            if (rankingTable.Competitions) {
                                                var competitionNameMapping = {};
                                                var uniqueNameCount = 0;
                                                rankingTable.Competitions.forEach(function(competition) {
                                                    groupMapping[competition.GroupName] = competition.GroupIndex;
                                                    var curName = competition.Name;
                                                    if (!competitionNameMapping[curName]) {
                                                        competitionNameMapping[curName] = [];
                                                        uniqueNameCount++;
                                                    }
                                                    competitionNameMapping[curName].push(competition);
                                                });
                                                if (rankingTable.Competitions.length > uniqueNameCount) {
                                                    var newCompetitions = [];
                                                    for (var competitionName in competitionNameMapping) {
                                                        var currentCompetitions = competitionNameMapping[competitionName];
                                                        var groupCompetitions = {};
                                                        currentCompetitions.forEach(function(curCompetition) {
                                                            groupCompetitions[curCompetition.GroupIndex.toString()] = curCompetition;
                                                        });
                                                        newCompetitions.push({
                                                            'Name': competitionName,
                                                            'GroupCompetitions': groupCompetitions
                                                        });
                                                    }
                                                    rankingTable.Competitions = newCompetitions;
                                                } else {
                                                    rankingTable.Competitions.forEach(function(curCompetition) {
                                                        curCompetition.GroupCompetitions = {};
                                                        curCompetition.GroupCompetitions[curCompetition.GroupIndex.toString()] = curCompetition;
                                                    });
                                                }
                                            }
                                            allPhaseTeams = rankingTable.Teams;
                                            allPhaseCompetitions = rankingTable.Competitions;
                                            allPhaseGroups = sportUtils.DistinctArray(rankingTable.Rows.map(function(x) { return x.GroupName; })).map(function (groupName) {
                                                return {
                                                    'Name': groupName,
                                                    'Index': groupMapping[groupName],
                                                    'ColumnTitles': rankingTable.ColumnTitles,
                                                    'Rows': rankingTable.Rows.filter(function(x) { return x.GroupName == groupName; })
                                                };
                                            });
                                        }
                                        curPhase.Teams = allPhaseTeams;
                                        curPhase.Competitions = allPhaseCompetitions;
                                        curPhase.AllGroups = allPhaseGroups;
                                        if (i == selectedPhaseIndex)
                                            $scope.selectedCategory.AllCompetitions = allPhaseCompetitions;
                                    } else {
                                        allPhaseTeams = allCategoryTeams.filter(function (x) {
                                            return x.PHASE_NAME == curPhase.Name;
                                        });
                                        allPhaseGroups = sportUtils.DistinctArray(allPhaseTeams, 'GROUP_NAME').map(function (x) {
                                            return {
                                                'Name': x.GROUP_NAME
                                            };
                                        });
                                        for (var j = 0; j < allPhaseGroups.length; j++) {
                                            var curGroup = allPhaseGroups[j];
                                            curGroup.Teams = allPhaseTeams.filter(function (x) {
                                                return x.GROUP_NAME == curGroup.Name;
                                            });
                                            curGroup.Teams.forEach(function (team) {
                                                team.Name = eventsUtils.BuildTeamName(team, null);
                                            });
                                            curGroup.Index = j;
                                        }
                                        curPhase.AllGroups = allPhaseGroups;
                                    }
                                }
                            }
                            $scope.selectedCategory.Phases = [];
                            if (phases.length > 0) {
                                var allGroups = [];
                                var allTeams = [];
                                phases.forEach(function(phase) {
                                    phase.AllGroups.forEach(function(group) {
                                        allTeams.appendArray(group.Teams);
                                    });
                                });
                                allGroups.push({
                                    Index: -1,
                                    Name: 'כל הבתים',
                                    Selected: false,
                                    Teams: allTeams
                                });
                                phases.forEach(function(phase) {
                                    allGroups.appendArray(phase.AllGroups);
                                });
                                $scope.selectedCategory.Phases.push({
                                    Index: -1,
                                    Name: 'כל השלבים',
                                    Selected: false,
                                    AllGroups: allGroups
                                });
                                $scope.selectedCategory.Phases.appendArray(phases);
                            }
                            if ($scope.selectedCategory.Phases.length > 0) {
                                $scope.selectedCategory.SelectedPhase = $scope.selectedCategory.Phases[selectedPhaseIndex];
                                if ($scope.selectedCategory.FinalsTree) {
                                    championshipsUtils.ApplyFinalsTree($scope.selectedCategory.FinalsTree, $scope.selectedCategory.Phases, $scope.selectedCategory.Matches);
                                    var phaseCount = $scope.selectedCategory.Phases.length;
                                    var finalTreePhase = {
                                        Name: 'משחקי הצלבה',
                                        Index: phaseCount,
                                        TreePhase: true,
                                        Selected: true
                                    };
                                    $scope.selectedCategory.Phases.forEach(function(p) {
                                        p.Selected = false;
                                    });
                                    $scope.selectedCategory.Phases.push(finalTreePhase);
                                    $scope.selectedCategory.SelectedPhase = finalTreePhase;
                                }
                            }

                            var url = '/api/sportsman/championship-category/' + category.CategoryId + '/grades';
                            $http.get(url).then(function(resp) {
                                var gradeMapping = {};
                                for (var i = 0; i < resp.data.length; i++) {
                                    var competitorData = resp.data[i];
                                    var key = (competitorData['TEAM_NUMBER'] || '').toString();
                                    gradeMapping[key] = competitorData['GRADE_NAME'];
                                }
                                $scope.selectedCategory.GradeMapping = gradeMapping;
                            }, function(err) {
                                console.log('error loading grades');
                                console.log(err);
                            });

                            window['qL_Finish_Now'] = true;
                            showCategoryMatches(false, function() {
                                window.setTimeout(function() {
                                    contentUtils.CarouselAutoSlide('matchesCarousel');
                                }, 100);
                            });
                            sportUtils.HandleFinalsTree();
                        }, function (err) {
                            console.log('error loading teams');
                            console.log(err);
                            window['qL_Finish_Now'] = true;
                            $scope.selectedCategory.LoadingPhases = false;
                        });
                    }, function(err) {
                        console.log('error loading active phase');
                        console.log(err);
                        window['qL_Finish_Now'] = true;
                        $scope.selectedCategory.LoadingPhases = false;
                    });
                }, function (err) {
                    console.log('error loading championships');
                    console.log(err);
                    window['qL_Finish_Now'] = true;
                    $scope.selectedCategory.LoadingPhases = false;
                });
            }, function (err) {
                console.log('error loading matches');
                console.log(err);
                window['qL_Finish_Now'] = true;
                $scope.selectedCategory.LoadingPhases = false;
            });
        }

        function InitializeChampionships() {
            function AutoSelectFilters(champCategoryId) {
                var matchingChampionships = allChampionships.filter(function (x) {
                    return x.CHAMPIONSHIP_CATEGORY_ID == champCategoryId;
                });
                if (matchingChampionships.length > 0) {
                    var matchingChamp = matchingChampionships[0];
                    var matchingSportFieldFilters = $scope.sportFieldsInUse.All.filter(function (x) {
                        return x.Id == matchingChamp.SPORT_ID;
                    });
                    if (matchingSportFieldFilters.length > 0) {
                        $scope.toggleSportFieldFilter(matchingSportFieldFilters[0]);
                        var matchingChampionshipFilters = $scope.championshipsInUse.All.filter(function (x) {
                            return x.Name == matchingChamp.CHAMPIONSHIP_NAME;
                        });
                        if (matchingChampionshipFilters.length > 0) {
                            $scope.toggleChampionshipFilter(matchingChampionshipFilters[0]);
                            var matchingCategoryFilters = $scope.categoriesInUse.All.filter(function (x) {
                                return x.CategoryId == champCategoryId;
                            });
                            if (matchingCategoryFilters.length > 0) {
                                var categoryFilter = matchingCategoryFilters[0];
                                categoryFilter.Selected = true;
                                return categoryFilter;
                            }
                        }
                    }
                }
                return null;
            }

            ReadAllChampionships().then(function() {
                window['qL_step_finished'] = true;
                var categoryApplied = false;
                if ($stateParams.category) {
                    var seq = 0;
                    var sportFlowers = false;
                    if ($stateParams.category.indexOf('sf-') == 0) {
                        //sport flowers event
                        seq = parseInt($stateParams.category.replace('sf-', ''));
                        sportFlowers = true;
                    } else if ($stateParams.category > 0) {
                        seq = parseInt($stateParams.category);
                    }
                    if (!isNaN(seq) && seq > 0) {
                        var categoryFilter = null;
                        if ($scope.showPermanentChampionships) {
                            $http.get('/api/sportsman/category-data?category=' + seq).then(function (resp) {
                                categoryFilter =  {
                                    'Name': resp.data.CATEGORY_NAME,
                                    'Championship': resp.data.CHAMPIONSHIP_NAME,
                                    'SportField': resp.data.SPORT_ID,
                                    'SportType': resp.data.SPORT_TYPE,
                                    'CategoryId': seq
                                };
                                categoryApplied = true;
                                ApplySelectedCategory(categoryFilter);
                            });

                        } else {
                            categoryFilter = AutoSelectFilters(seq);
                            if (categoryFilter != null) {
                                if (!sportFlowers)
                                    categoryApplied = true;
                                ApplySelectedCategory(categoryFilter);
                            }
                        }
                    }
                }
                if (!categoryApplied)
                    window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            }, function(err) {
                $scope.error = err;
                window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            });
        }

        function BuildCategoryName(category) {
            if (category.SportField == sportGlobalSettings.FlowersFieldSeq) {
                return 'פרחי ספורט';
            } else {
                var catName = category.Name;
                var fullName = category.Championship;
                if (catName != fullName)
                    fullName += ' ' + catName;
                return fullName;
            }
        }

        function ResetSelectedCategory() {
            $scope.selectedCategory = {
                Name: '',
                Matches: []
            };
        }

        ChainFactory.Execute(ReadSportFields, InitializeChampionships);

        window['qL_steps_amount'] = 7;

        $interval(function() {
            if ($scope.selectedCategory && $scope.selectedCategory.Matches && $scope.selectedCategory.Matches.length > 0) {
                var curSelectedTeam = $scope.selectedCategory.selectedTeam == null ? '' : $scope.selectedCategory.selectedTeam.Name;
                var prevSelectedTeam = $scope.selectedCategory.prevSelectedTeam;
                var curSelectedFacility = $scope.selectedCategory.selectedFacility == null ? '' : $scope.selectedCategory.selectedFacility.Name;
                var prevSelectedFacility = $scope.selectedCategory.prevSelectedFacility;
                if (curSelectedTeam != prevSelectedTeam || curSelectedFacility != prevSelectedFacility) {
                    $scope.selectedCategory.FilteredMatches = [];
                    var filteredMatches = $scope.selectedCategory.Matches.filter(function(curMatch) {
                        var teamFilter = curSelectedTeam.length == 0 || curMatch.TeamA == curSelectedTeam || curMatch.TeamB == curSelectedTeam;
                        var facilityFilter = curSelectedFacility.length == 0 || curMatch.FacilityName == curSelectedFacility;
                        return teamFilter && facilityFilter;
                    });
                    $timeout(function() {
                        $scope.selectedCategory.FilteredMatches = filteredMatches;
                        if ($scope.selectedCategory.OnFilteredMatchesChange)
                            $scope.selectedCategory.OnFilteredMatchesChange();
                    }, 100);
                    $scope.selectedCategory.prevSelectedTeam = curSelectedTeam;
                    $scope.selectedCategory.prevSelectedFacility = curSelectedFacility;
                }
            }
        }, 100);

        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.getRegionColor = contentUtils.getRegionColor;
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            return 'background-color: ' + bgColor + '; border-color: ' + bgColor + ';';
        };

        $scope.totalChampionshipsCount = function() {
            return allChampionships.length;
        };

        $scope.getSportFieldFilterStyle = function(sportFieldOrChampionship) {
            var sportFieldSeq = sportFieldOrChampionship.Id || sportFieldOrChampionship.SportField;
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            var sportFieldFilterStyle = sportUtils.getRoundedRectangleStyle(sportFieldOrChampionship, bgColor);
            if (sportFieldOrChampionship.SportWordCount && sportFieldOrChampionship.SportWordCount > 2)
                sportFieldFilterStyle += ' line-height: inherit;';
            return sportFieldFilterStyle;
        };

        $scope.getRegionFilterStyle = function(region) {
            var bgColor = contentUtils.getRegionColor(region.REGION_ID);
            var sportFieldFilterStyle = sportUtils.getRoundedRectangleStyle(region, bgColor);
            return sportFieldFilterStyle;
        };

        $scope.getPermanentChampionshipFilterStyle = function(permanentChampionship) {
            var bgColor = contentUtils.getSportFieldColor(permanentChampionship.SPORT_ID);
            var sportFieldFilterStyle = sportUtils.getRoundedRectangleStyle(permanentChampionship, bgColor);
            return sportFieldFilterStyle;
        };

        $scope.toggleSportFieldFilter = function(sportField) {
            var sportFieldSeq = sportField.Id;
            $scope.championshipChoosingTitle = sportFieldSeq == sportGlobalSettings.FlowersFieldSeq ? 'אירוע פרחי ספורט:' :'אליפות:';
            $scope.clearChampionshipFilter();
            if ($scope.championshipsFilters.SportField) {
                var matchingSportFields = $scope.sportFieldsInUse.All.filter(function(x) { return x.Id == $scope.championshipsFilters.SportField; });
                if (matchingSportFields.length > 0)
                    matchingSportFields[0].Selected = false;
            }
            sportField.Selected = !sportField.Selected;
            $scope.championshipsFilters.SportField = sportFieldSeq;

            //remove selected championships
            $scope.championshipsInUse.All.filter(function(x) {
                return x.SportField == sportFieldSeq && x.Selected;
            }).forEach(function(championship) {
                $scope.toggleChampionshipFilter(championship);
            });

            ApplyChampionshipRows();
            $scope.championshipsFilters.Championship = '';
            ResetSelectedCategory();
            ApplyChampionshipCategories();
        };

        $scope.toggleChampionshipFilter = function(championship) {
            var champName = championship.Name;
            $scope.categoryChoosingTitle = $scope.championshipsFilters.SportField == sportGlobalSettings.FlowersFieldSeq ? 'פעילות פרחי ספורט:' : 'קטגוריית אליפות:';
            if ($scope.championshipsFilters.Championship.length > 0) {
                var matchingChampionships = $scope.championshipsInUse.All.filter(function(x) { return x.Name == $scope.championshipsFilters.Championship; });
                if (matchingChampionships.length > 0)
                    matchingChampionships[0].Selected = false;
            }
            championship.Selected = !championship.Selected;
            $scope.championshipsFilters.Championship = champName;
            ResetSelectedCategory();
            ApplyChampionshipCategories();
        };

        $scope.ChangeChampionshipClicked = function() {
            document.location.hash = '#/m?c=' + $scope.selectedCategory.ID;
        };

        $scope.RegionClicked = function(region) {
            $state.go('championships.region', {clubs: $stateParams.clubs, region: region.REGION_ID});
        };

        $scope.PermanentChampionshipClicked = function(permanentChampionship) {
            $state.go('championships.region.championship', {clubs: 0, region: 'p', category: permanentChampionship.CHAMPIONSHIP_CATEGORY_ID});
        };

        $scope.JumpToCategory = function(category) {
            var categoryParam = category.SportField == sportGlobalSettings.FlowersFieldSeq ? ('sf-' + category.CategoryId)
                : category.CategoryId;
            $state.go('championships.region.championship', {clubs: $stateParams.clubs, region: $stateParams.region, category: categoryParam});
        };

        $scope.clearSportFieldFilter = function() {
            $scope.championshipsFilters.SportField = 0;
            for (var i = 0; i < $scope.sportFieldsInUse.All.length; i++) {
                $scope.sportFieldsInUse.All[i].Selected = false;
            }
            ApplyChampionshipRows();
            ApplyChampionshipCategories();
            $scope.clearChampionshipFilter();
        };

        $scope.clearChampionshipFilter = function() {
            $scope.championshipsFilters.Championship = '';
            for (var i = 0; i < $scope.championshipsInUse.Rows.length; i++) {
                var currentRow = $scope.championshipsInUse.Rows[i];
                for (var j = 0; j < currentRow.length; j++) {
                    currentRow[j].Selected = false;
                }
            }
        };
    }

    function ChampionshipCategoryCtrl($scope, $http, $filter, $timeout, $uibModal, $rootScope) {
        contentUtils.InitSportFieldColors($http);
        contentUtils.InitRegionColors($http);
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;
        $scope.IsMobileDevice = $rootScope.IsMobileDevice;

        function ListenForMatches() {
            if ($scope.category) {
                if (!$scope.category.changeMatchesPhase)
                    $scope.category.changeMatchesPhase = $scope.changeMatchesPhase;
                if (!$scope.category.changeGroup)
                    $scope.category.changeGroup = $scope.changeGroup;
                if (!$scope.category.changeMatchesRound)
                    $scope.category.changeMatchesRound = $scope.changeMatchesRound;
                if (!$scope.category.OnFilteredMatchesChange) {
                    $scope.category.OnFilteredMatchesChange = function () {
                        var selectedPhase = $scope.category.SelectedMatchesPhase;
                        if (selectedPhase)
                            $scope.changeMatchesPhase(selectedPhase);
                    };
                }
                if ($scope.category.Matches && $scope.category.Matches.length > 0) {
                    $scope.changeMatchesPhase($scope.category.Phases[0]);
                    var today = sportUtils.GetCurrentDate().withoutTime();
                    var relevantMatch = $scope.category.Matches.findItem(function (match) {
                        return match.Date.withoutTime() >= today;
                    });
                    if (relevantMatch != null)
                    {
                        var rawDate = $filter('date')(relevantMatch.Date, 'dd/MM/yyyy');
                        var selector = 'div[data-date="' + rawDate + '"]';
                        var focusedScrollY = 0;
                        window.setTimeout(function() {
                            focusedScrollY = sportUtils.FocusElement(selector);
                            if (focusedScrollY > 0) {
                                var changedOnce = false;
                                var curTime = new Date();
                                $(window).scroll(function () {
                                    if (window.scrollY == 0 && !changedOnce) {
                                        var now = new Date();
                                        if ((now.getTime() - curTime.getTime()) <= 2000) {
                                            changedOnce = true;
                                            window.scrollTo(0, focusedScrollY);
                                        }
                                    }
                                });
                            }
                        }, 200);
                    }
                    /*
                    if (relevantMatch == null)
                        relevantMatch = $scope.category.Matches[$scope.category.Matches.length - 1];
                    var matchingPhase = $scope.category.Phases.findItem(function (phase) {
                        return phase.Index == relevantMatch.Phase;
                    });
                    $scope.changeMatchesPhase(matchingPhase);
                    if ($scope.category.SelectedMatchesPhase.AllGroups && $scope.category.SelectedMatchesPhase.AllGroups.length > 0) {
                        var relevantGroup = $scope.category.SelectedMatchesPhase.AllGroups[relevantMatch.Group];
                        $scope.changeGroup(relevantGroup);
                    }
                    var matchingRound = $scope.category.SelectedMatchesPhase.Rounds.findItem(function (round) {
                        return round.Name == relevantMatch.ROUND_NAME;
                    });
                    $scope.changeMatchesRound(matchingRound);
                    var matchDate = $filter('date')(relevantMatch.Date, 'dd/MM/yyyy');
                    */
                    return;
                }
            }
            $timeout(ListenForMatches, 100);
        }
        $timeout(ListenForMatches, 100);

        $scope.getMatchStyle = function(match, foreColor) {
            var style = 'background-color: ' +
                contentUtils.getSportFieldColor(match.SPORT_ID) + ';';
            if (foreColor && foreColor.length > 0)
                style += ' color: ' + foreColor + ';';
            return style;
        };

        $scope.getScoreStyle = function(match, team, partIndex) {
            if (typeof partIndex != 'undefined' && match.PartsData) {
                var curTeamLetter = team;
                var otherTeamLetter = curTeamLetter == 'A' ? 'B' : 'A';
                var curTeamPoints = match.PartsData['Team' + curTeamLetter][partIndex];
                var otherTeamPoints = match.PartsData['Team' + otherTeamLetter][partIndex];
                return (curTeamPoints < otherTeamPoints) ? 'font-weight: normal;' : 'font-weight: bold;'

            }
            var style = 'font-size: 50px; line-height: 40px; margin-bottom: 10px; text-align: center;';
            if (((match.Result == 1 || match.Result == 3) && team == 'B') ||
                ((match.Result == 2 || match.Result == 4) && team == 'A')) {
                style += ' font-weight: normal;';
            }
            return style;
        };

        $scope.openFullRankingTable = function() {
            //console.log($scope.category);
            if ($scope.category.SelectedMatchesPhase == null || $scope.category.SelectedMatchesGroup == null)
                return;

            $uibModal.open({
                templateUrl: 'views/ranking-table-dialog.html',
                controller: 'RankingTableDialogCtrl',
                resolve: {
                    categoryData: function () {
                        return {
                            Category: {
                                Id: $scope.category.ID,
                                Name: $scope.category.Name
                            },
                            Phase: {
                                Index: $scope.category.SelectedMatchesPhase.Index,
                                Name: $scope.category.SelectedMatchesPhase.Name
                            },
                            Group: {
                                Index: $scope.category.SelectedMatchesGroup.Index,
                                Name: $scope.category.SelectedMatchesGroup.Name
                            },
                            RankingTables: $scope.category.RankingTables || null
                        };
                    }
                }
            }).result.then(function (rankingTables) {
                    $scope.category.RankingTables = rankingTables;
                });
        };

        $scope.changePhase = function(phase) {
            $scope.category.Phases.filter(function(x) { return x.Selected; }).forEach(function(x) {
                x.Selected = false;
            });
            $scope.category.setSelectedCompetition(null);
            $scope.category.setSelectedTeam(null);
            phase.Selected = true;
            $scope.category.SelectedPhase = phase;
            if (phase.Teams)
                $scope.category.AllTeams = phase.Teams;
            if (phase.Competitions)
                $scope.category.AllCompetitions = phase.Competitions;
        };

        $scope.changeGroup = function(rawValue) {
            if (rawValue.hasOwnProperty('Index')) {
                var group = rawValue;
                $scope.category.SelectedMatchesGroup = group;
                $scope.category.SelectedMatchesPhase.AllGroups.forEach(function(x) {
                    x.SelectedForMatches = false;
                });
                group.SelectedForMatches = true;
                if ($scope.category.OnFilteredMatchesChange) {
                    $scope.category.OnFilteredMatchesChange();
                }
            } else {
                var offset = parseInt(rawValue);
                if (!isNaN(offset)) {
                    var currentIndex = $scope.category.SelectedMatchesGroup.Index;
                    var newIndex = currentIndex + offset;
                    if (newIndex >= $scope.category.SelectedMatchesPhase.AllGroups.length)
                        newIndex = 0;
                    if (newIndex < 0)
                        newIndex = $scope.category.SelectedMatchesPhase.AllGroups.length - 1;
                    $scope.changeGroup($scope.category.SelectedMatchesPhase.AllGroups[newIndex]);
                }
            }
        };

        $scope.changeMatchesPhase = function(phase) {
            if ($scope.category.SelectedMatchesPhase == null || !$scope.category.SelectedMatchesPhase || $scope.category.SelectedMatchesPhase.Index != phase.Index) {
                $scope.category.Phases.filter(function (x) {
                    return x.SelectedForMatches;
                }).forEach(function (x) {
                    x.SelectedForMatches = false;
                });
                $scope.category.SelectedMatchesGroup = null;
                $scope.category.setSelectedCompetition(null);
                $scope.category.setSelectedTeam(null);
                phase.SelectedForMatches = true;
                $scope.category.SelectedMatchesPhase = phase;
                if ($scope.category.SelectedMatchesPhase.AllGroups && $scope.category.SelectedMatchesPhase.AllGroups.length > 0) {
                    $scope.category.SelectedMatchesPhase.AllGroups.forEach(function(x) {
                        x.SelectedForMatches = false;
                    });
                    $scope.category.SelectedMatchesGroup = $scope.category.SelectedMatchesPhase.AllGroups[0];
                    $scope.category.SelectedMatchesGroup.SelectedForMatches = true;
                }
            }
            phase.Rounds = [];
            if ($scope.category.FilteredMatches) {
                var selectedGroup = $scope.category.SelectedMatchesGroup ? $scope.category.SelectedMatchesGroup.Index : -1;
                if (phase.Index < 0) {
                    phase.Rounds.push({
                        Index: -1,
                        Name: 'כל הסיבובים'
                    });
                }
                phase.Rounds.appendArray($scope.category.FilteredMatches.filter(function(x) {
                    return (phase.Index < 0 || x.Phase == phase.Index) && (selectedGroup < 0 || x.Group == selectedGroup);
                }).map(function(x) {
                    return x.ROUND_NAME;
                }).distinct().map(function(roundName, roundIndex) {
                    return {
                        Index: roundIndex,
                        Name: roundName
                    };
                }));
                if (phase.Rounds.length > 0) {
                    $scope.changeMatchesRound(phase.Rounds[0]);
                }
            }
        };

        $scope.changeMatchesRound = function(round) {
            function ApplyDelayedState(matchGroup, cycleMapping, index, allGroups, checkSamePropertyName) {
                matchGroup.Matches.forEach(function (match) {
                    if (!match.HideDelayedMessage) {
                        match.IsDelayed = false;
                    }
                });
                var cycleName = matchGroup.CycleName;
                if (!matchGroup[checkSamePropertyName] && cycleMapping[cycleName]) {
                    for (var i = index; i < allGroups.length; i++) {
                        var curGroup = allGroups[i];
                        if (curGroup.CycleName != matchGroup.CycleName)
                            break;
                        curGroup.Matches.forEach(function (match) {
                            if (!match.HideDelayedMessage) {
                                match.IsDelayed = true;
                                match.OriginalDate = cycleMapping[cycleName].Date
                            }
                        });
                    }
                }
                if (!cycleMapping[cycleName])
                    cycleMapping[cycleName] = matchGroup;
            }

            $scope.category.SelectedMatchesPhase.Rounds.filter(function(x) { return x.Selected; }).forEach(function(x) {
                x.Selected = false;
            });
            round.Selected = true;
            $scope.category.SelectedMatchesRound = round;
            round.Cycles = [];
            var phaseIndex = $scope.category.SelectedMatchesPhase.Index;
            var selectedGroup = $scope.category.SelectedMatchesGroup ? $scope.category.SelectedMatchesGroup.Index : -1;
            if ($scope.category.FilteredMatches) {
                $scope.category.FilteredMatches.sort(function(match1, match2) {
                    return match1.Date - match2.Date;
                });
                round.Matches = $scope.category.FilteredMatches.filter(function(match) {
                    return (phaseIndex < 0 || match.Phase == phaseIndex) &&
                        (round.Index < 0 || match.ROUND_NAME == round.Name) &&
                        (selectedGroup < 0 || match.Group == selectedGroup);
                });
                round.MatchGroups = [];
                if (round.Matches.length > 0) {
                    round.Matches.sortByProperty('Date');
                    var allDates = round.Matches.map(function (x) {
                        return $filter('date')(x.Date, 'dd/MM/yyyy');
                    }).distinct();
                    round.MatchGroups = allDates.map(function(rawDate) {
                        var matchingMatches = round.Matches.filter(function(x) {
                            return $filter('date')(x.Date, 'dd/MM/yyyy') == rawDate;
                        });
                        var firstMatchingMatch = matchingMatches[0];
                        //console.log(firstMatchingMatch);
                        //ROUND_NAME

                        return {
                            Date: rawDate,
                            Matches: matchingMatches,
                            CycleName: firstMatchingMatch.CYCLE_NAME,
                            GameDetails: firstMatchingMatch.GameDetails
                        };
                    });
                    var prevGameDetails = '';
                    var prevCycleName = '';
                    round.MatchGroups.forEach(function(matchGroup) {
                        var curGameDetails = matchGroup.GameDetails;
                        var curCycleName = matchGroup.CycleName;
                        if (prevGameDetails.length > 0 && prevGameDetails == curGameDetails)
                            matchGroup.SameDetails = true;
                        if (prevCycleName.length > 0 && prevCycleName == curCycleName)
                            matchGroup.SameCycle = true;
                        prevGameDetails = curGameDetails;
                        prevCycleName = curCycleName;
                    });
                    var cycleMapping = {};
                    if (round.Index < 0) {
                        //all matches, need to split
                        var matchGroupsCycleMapping = {};
                        round.MatchGroups.forEach(function (matchGroup) {
                            var parts = matchGroup.GameDetails.split(', ');
                            var key = parts.partialJoin('_', [0, 1, 3]);
                            if (!matchGroupsCycleMapping[key])
                                matchGroupsCycleMapping[key] = [];
                            matchGroupsCycleMapping[key].push(matchGroup);
                        });
                        for (var key in matchGroupsCycleMapping) {
                            cycleMapping = {};
                            var allMatchGroups = matchGroupsCycleMapping[key];
                            allMatchGroups.forEach(function (matchGroup, index) {
                                ApplyDelayedState(matchGroup, cycleMapping, index, allMatchGroups, 'SameDetails');
                            });
                        }
                    } else {
                        round.MatchGroups.forEach(function (matchGroup, index) {
                            ApplyDelayedState(matchGroup, cycleMapping, index, round.MatchGroups, 'SameCycle');
                        });
                    }
                }
            }
        };

        $scope.getTableSectionTitle = function() {
            if ($scope.category.selectedTeam && $scope.category.selectedTeam.FullReportTables && $scope.category.selectedTeam.FullReportTables.length > 0)
                return 'סיכום קבוצתי מפורט - ' + $scope.category.selectedTeam.Name;

            if ($scope.category.selectedCompetition)
                return 'דירוג אישי למקצוע - ' + $scope.category.selectedCompetition.Name;

            if ($scope.category.SportType == 1)
                return 'טבלת דירוג כללי';

            return  'טבלאות';
        };

        $scope.isTeamFullReportTableVisible = function(dataTable) {
            if (!$scope.category.selectedCompetition)
                return true;
            return dataTable.Caption.indexOf($scope.category.selectedCompetition.Name) >= 0;
        };

        $scope.isGroupVisible = function(group) {
            if (group.Name) {
                if ($scope.category.SportType == 1) {
                    if ($scope.category.selectedTeam)
                        return $scope.category.selectedTeam.GroupIndex == group.Index;
                    return true;
                } else {
                    return true;
                }
            }
            return false;
        };

        $scope.getCompetitorGrade = function(row) {
            if (!$scope.category.GradeMapping)
                return '';
            var shirtNumber = row.CellValues[0];
            return $scope.category.GradeMapping[shirtNumber.toString()] || '';
        };
    }

    function ChampionshipCategoryFinalsTreeCtrl($scope, $http, $filter) {

    }

    function EditResultsController($scope, $http, $filter, $uibModal) {
        var allMatches = [];
        var matchFormInterval = 0;

        $scope.Unauthorized = false;
        $scope.selected = {Region: null, SportField: null, Championship: null, Category: null};
        $scope.data = {Regions: [], Categories: [], Championships: [], SportFields: [], Matches: [], Phases: []};

        $scope.MobileStyle = sportUtils.MobileStyle;

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [2]);
            window['qL_step_finished'] = true;
        }

        function ApplyRegions() {
            var regionMapping = {};
            for (var i = 0; i < allMatches.length; i++) {
                var match = allMatches[i];
                sportUtils.AddIfDoesNotExist(regionMapping, match.REGION_ID, match.REGION_NAME);
            }
            $scope.data.Regions = [];
            for (var regionID in regionMapping) {
                $scope.data.Regions.push({
                    REGION_ID: parseInt(regionID),
                    REGION_NAME: regionMapping[regionID]
                });
            }
            $scope.data.Regions.sort(function(r1, r2) {
                return r2.REGION_ID  - r1.REGION_ID;
            });
            if ($scope.data.Regions.length == 1) {
                $scope.RegionClicked($scope.data.Regions[0]);
            }
            window['qL_Finish_Now'] = true;
            ApplyQueryStringCategory();
        }

        function ApplyPhases() {
            var phaseMapping = {};
            for (var i = 0; i < $scope.data.Matches.length; i++) {
                var match = $scope.data.Matches[i];
                sportUtils.AddIfDoesNotExist(phaseMapping, match.PHASE, match.PHASE_NAME);
            }
            $scope.data.Phases = [];
            for (var rawPhaseIndex in phaseMapping) {
                var phaseIndex = parseInt(rawPhaseIndex);
                var matchingMatches = $scope.data.Matches.filter(function(match) {
                    return match.PHASE == phaseIndex;
                });
                $scope.data.Phases.push({
                    Index: parseInt(phaseIndex),
                    Name: phaseMapping[rawPhaseIndex],
                    Matches: matchingMatches
                });
            }
            $scope.data.Phases.sort(function(p1, p2) {
                return p2.Index  - p1.Index;
            });
            if ($scope.data.Phases.length > 0)
                $scope.PhaseClicked($scope.data.Phases[0]);
        }

        function LoadAllMatches() {
            function ApplyMatches(matchContentMapping) {
                for (var i = 0; i < allMatches.length; i++) {
                    var curMatch = allMatches[i];
                    curMatch.PartsData = championshipsUtils.ConvertPartsResult(curMatch.PARTS_RESULT);
                    if (curMatch.OVERRIDEN_PARTS_RESULT != null)
                        curMatch.PartsData = championshipsUtils.ConvertPartsResult(curMatch.OVERRIDEN_PARTS_RESULT);;
                    if (curMatch.OVERRIDEN_RESULT != null)
                        curMatch.RESULT = curMatch.OVERRIDEN_RESULT;
                    if (curMatch.RESULT == null) {
                        curMatch.TEAM_A_SCORE = null;
                        curMatch.TEAM_B_SCORE = null;
                    } else {
                        if (curMatch.RESULT == 3)
                            curMatch.TechnicalWin_A = true;
                        else if (curMatch.RESULT == 4)
                            curMatch.TechnicalWin_B = true;
                    }
                    if (matchContentMapping != null) {
                        var key = curMatch.CHAMPIONSHIP_CATEGORY_ID + '_' + curMatch.match_number;
                        curMatch.UploadedFileUrl = matchContentMapping[key] || null;
                    }
                }
                ApplyRegions();
            }

            $scope.loading = true;
            $http.get('/api/sportsman/past-matches').then(function(resp) {
                $scope.loading = false;
                allMatches = resp.data.slice(0);
                $http.get('/api/common/match-forms').then(function(resp) {
                    var matchContentMapping = {};
                    if (resp.data) {
                        resp.data.forEach(function(curItem) {
                            var key = curItem['CHAMPIONSHIP_CATEGORY_ID'] + '_' + curItem['match_number'];
                            matchContentMapping[key] = curItem['ContentPath'];
                        });
                    }
                    ApplyMatches(matchContentMapping);
                }, function(err) {
                    console.log('error loading match forms');
                    ApplyMatches(null);
                });
            }, function(err) {
                $scope.loading = false;
                console.log(err);
                $scope.error = 'שגיאה בעת טעינת נתונים';
            });
        }

        function ApplyQueryStringCategory() {
            var oRequest = sportUtils.ParseQueryString();
            var categoryID = oRequest['v'];
            if (categoryID && parseInt(categoryID) > 0) {
                var matchingCategory = allMatches.findItem(function(x) {
                    return x.CHAMPIONSHIP_CATEGORY_ID == categoryID;
                });
                if (matchingCategory != null) {
                    var matchingRegion = $scope.data.Regions.findItem(function(x) {
                        return x.REGION_ID == matchingCategory.REGION_ID;
                    });
                    if (matchingRegion != null) {
                        $scope.RegionClicked(matchingRegion);
                        var matchingSportField = $scope.data.SportFields.findItem(function(x) {
                            return x.SPORT_ID == matchingCategory.SPORT_ID;
                        });
                        if (matchingSportField != null) {
                            $scope.SportFieldClicked(matchingSportField);
                            var matchingChampionship = $scope.data.Championships.findItem(function(x) {
                                return x.CHAMPIONSHIP_ID == matchingCategory.CHAMPIONSHIP_ID;
                            });
                            if (matchingChampionship != null) {
                                $scope.ChampionshipClicked(matchingChampionship);
                                $scope.CategoryClicked(matchingCategory);
                            }
                        }
                    }
                }
            }
        }

        function ApplySportsmanResult(match, updatedResult) {
            if ($scope.LoggedInUser.role == 1) {
                $http.get('/api/sportsman/data-gateway').then(function (resp) {
                    var url = resp.data + '?ccid=' + match.CHAMPIONSHIP_CATEGORY_ID + '&action=set_match_result';
                    url += '&match_number=' + match.match_number;
                    if (updatedResult == 3)
                        url += '&technical_A=1';
                    else if (updatedResult == 4)
                        url += '&technical_B=1';
                    $http.get(url).then(function (resp) {
                        if (!resp.data || !resp.data.Message || resp.data.Message != 'OK') {
                            var error = resp.data.Error || 'failed to set result in sportsman';
                            console.log(error);
                        }
                    }, function(err) {
                        console.log('error while setting result in sportsman');
                    });
                });
            }
        }

        window['qL_steps_amount'] = 2;
        ChainFactory.Execute(VerifyUser, LoadAllMatches);

        contentUtils.InitSportFieldColors($http);
        contentUtils.InitRegionColors($http);
        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.getRegionColor = contentUtils.getRegionColor;
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            return 'background-color: ' + bgColor + '; border-color: ' + bgColor + ';';
        };


        $scope.getMatchStyle = function(match, foreColor) {
            var style = 'background-color: ' +
                contentUtils.getSportFieldColor(match.SPORT_ID) + ';';
            if (foreColor && foreColor.length > 0)
                style += ' color: ' + foreColor + ';';
            return style;
        };

        $scope.getRegionFilterStyle = function(region) {
            var bgColor = contentUtils.getRegionColor(region.REGION_ID);
            var sportFieldFilterStyle = sportUtils.getRoundedRectangleStyle(region, bgColor);
            return sportFieldFilterStyle;
        };

        $scope.getSportFieldFilterStyle = function(sportFieldOrChampionship) {
            var sportFieldSeq = sportFieldOrChampionship.SPORT_ID;
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            var sportFieldFilterStyle = sportUtils.getRoundedRectangleStyle(sportFieldOrChampionship, bgColor);
            if (sportFieldOrChampionship.SportWordCount && sportFieldOrChampionship.SportWordCount > 2)
                sportFieldFilterStyle += ' line-height: inherit;';
            return sportFieldFilterStyle;
        };

        $scope.getScoreStyle = function(match, team, partIndex) {
            if (match.PartsData) {
                var curTeamLetter = team;
                var otherTeamLetter = curTeamLetter == 'A' ? 'B' : 'A';
                var curTeamPoints = match.PartsData['Team' + curTeamLetter][partIndex];
                var otherTeamPoints = match.PartsData['Team' + otherTeamLetter][partIndex];
                var styles = [];
                styles.push(curTeamPoints < otherTeamPoints ? 'font-weight: normal;' : 'font-weight: bold;');
                if ($scope.HasPendingPartScore(match))
                    styles.push('border: 1px dashed black;');
                return styles.join(' ');
            }
            return '';
        };

        $scope.$watch('Unauthorized', function (newval){
            if (newval == true) {
                window.setTimeout(function() {
                    championshipsUtils.BindDummyLogin();
                    $('#txtDummyUserName').focus();
                }, 500);
            }
        });

        $scope.totalChampionshipsCount = function() {
            return allMatches.length;
        };

        $scope.CategoryClicked = function(category) {
            if (category && $scope.selected.Category && $scope.selected.Category.CHAMPIONSHIP_CATEGORY_ID == category.CHAMPIONSHIP_CATEGORY_ID)
                return;

            $scope.selected.Category = category;
            championshipsUtils.InitTeamNamesHeightTimer();
            $scope.data.Categories.forEach(function(curCategory) {
                curCategory.Selected = category ? (curCategory.CHAMPIONSHIP_CATEGORY_ID == category.CHAMPIONSHIP_CATEGORY_ID) : false;
            });
            if (category != null && $scope.selected.Region != null && $scope.selected.SportField != null && $scope.selected.Championship != null) {
                var selectedRegion = $scope.selected.Region.REGION_ID;
                var selectedSportField = $scope.selected.SportField.SPORT_ID;
                var selectedChampionship = $scope.selected.Championship.CHAMPIONSHIP_ID;
                $scope.data.Matches = championshipsUtils.ExtractDistinctMatches(allMatches.filter(function (curMatch) {
                    return curMatch.REGION_ID == selectedRegion && curMatch.SPORT_ID == selectedSportField &&
                        curMatch.CHAMPIONSHIP_ID == selectedChampionship && curMatch.CHAMPIONSHIP_CATEGORY_ID == category.CHAMPIONSHIP_CATEGORY_ID;
                }));
                ApplyPhases();
                championshipsUtils.InitPhaseVisibility();
                if (!category.TechnicalRule && !category.TechnicalRuleLoading) {
                    var url = '/api/sportsman/data-gateway';
                    category.TechnicalRuleLoading = true;
                    $http.get(url).then(function (resp) {
                        url = resp.data;
                        url += '?ccid=' + category.CHAMPIONSHIP_CATEGORY_ID + '&technical=1';
                        $http.get(url).then(function (resp) {
                            category.TechnicalRuleLoading = false;
                            if (resp.data.Winner != null)
                                category.TechnicalRule = sportUtils.shallowCopy(resp.data);
                            else
                                category.TechnicalRule = {};
                        }, function(err) {
                            category.TechnicalRuleLoading = false;
                        });
                    });
                }
            } else {
                $scope.data.Matches = [];
            }
        };

        $scope.ChampionshipClicked = function(championship) {
            if (championship && $scope.selected.Championship && $scope.selected.Championship.CHAMPIONSHIP_ID == championship.CHAMPIONSHIP_ID)
                return;

            $scope.CategoryClicked(null);
            $scope.selected.Championship = championship;
            $scope.data.Championships.forEach(function(curChampionship) {
                curChampionship.Selected = championship ? (curChampionship.CHAMPIONSHIP_ID == championship.CHAMPIONSHIP_ID) : false;
            });
            if (championship != null && $scope.selected.Region != null && $scope.selected.SportField != null) {
                var selectedRegion = $scope.selected.Region.REGION_ID;
                var selectedSportField = $scope.selected.SportField.SPORT_ID;
                $scope.data.Categories = championshipsUtils.ExtractDistinctMatches(allMatches.filter(function (curMatch) {
                    return curMatch.REGION_ID == selectedRegion && curMatch.SPORT_ID == selectedSportField && curMatch.CHAMPIONSHIP_ID == championship.CHAMPIONSHIP_ID;
                }), ['CHAMPIONSHIP_CATEGORY_ID']);
                $scope.data.Categories.forEach(function(cat) { cat.Selected = false; });
                if ($scope.data.Categories.length == 1) {
                    $scope.CategoryClicked($scope.data.Categories[0]);
                }
            } else {
                $scope.data.Categories = [];
            }
        };

        $scope.SportFieldClicked = function(sportField) {
            if (sportField && $scope.selected.SportField && $scope.selected.SportField.SPORT_ID == sportField.SPORT_ID)
                return;

            $scope.ChampionshipClicked(null);
            $scope.selected.SportField = sportField;
            $scope.data.SportFields.forEach(function(curSportField) {
                curSportField.Selected = sportField ? (curSportField.SPORT_ID == sportField.SPORT_ID) : false;
            });
            if (sportField != null && $scope.selected.Region != null) {
                var selectedRegion = $scope.selected.Region.REGION_ID;
                $scope.data.Championships = championshipsUtils.ExtractDistinctMatches(allMatches.filter(function (curMatch) {
                    return curMatch.REGION_ID == selectedRegion && curMatch.SPORT_ID == sportField.SPORT_ID;
                }), ['CHAMPIONSHIP_ID']);
                $scope.data.Championships.forEach(function(champ) { champ.Selected = false; });
                if ($scope.data.Championships.length == 1) {
                    $scope.ChampionshipClicked($scope.data.Championships[0]);
                }
            } else {
                $scope.data.Championships = [];
            }
        };

        $scope.RegionClicked = function(region) {
            if (region && $scope.selected.Region && $scope.selected.Region.REGION_ID == region.REGION_ID)
                return;

            $scope.SportFieldClicked(null);
            $scope.selected.Region = region;
            $scope.data.Regions.forEach(function(curRegion) {
                curRegion.Selected = region ? (curRegion.REGION_ID == region.REGION_ID) : false;
            });
            if (region != null) {
                $scope.data.SportFields = championshipsUtils.ExtractDistinctMatches(allMatches.filter(function (curMatch) {
                    return curMatch.REGION_ID == region.REGION_ID;
                }), ['SPORT_ID']);
                $scope.data.SportFields.forEach(function(sportField) { sportField.Selected = false; });
                if ($scope.data.SportFields.length == 1) {
                    $scope.SportFieldClicked($scope.data.SportFields[0]);
                }
            } else {
                $scope.data.SportFields = [];
            }
        };

        $scope.HasPendingScore = function(match) {
            return championshipsUtils.HasPendingScore(match);
        };

        $scope.HasPendingPartScore = function(match) {
            return championshipsUtils.HasPendingPartScore(match);
        };

        $scope.getEditIconStyle = function(match) {
            var style = 'font-size: 60px; margin-top: 10px;'
            var color = '';
            if (match.OVERRIDEN_TEAM_A_SCORE != null && match.OVERRIDEN_TEAM_B_SCORE != null) {
                color = (match.OverridenScoreApproved != 1) ? '#ED0013' : '#00ADEE';
            }
            if (color.length > 0)
                style += ' color: ' + color + ';';
            return style;
        };

        $scope.getPhaseRowStyle = function(phase) {
            var style = 'margin-bottom: 10px;';
            var bgColor = '';
            if (phase.Expanded) {
                bgColor = '#5bc0de';
            }
            if (bgColor.length > 0)
                style += ' background-color: ' + bgColor + ';';
            return style;
        };

        $scope.getTeamScoreClass = function(match, teamLetter) {
            var hasPendingScore = $scope.HasPendingScore(match);
            if (hasPendingScore || (match.TEAM_A_SCORE != null && match.TEAM_A_SCORE != null)) {
                var classes = ['team-score', 'label', 'label-info'];
                if (hasPendingScore) {
                    classes.push('pending-score');
                } else {
                    var scoreA = match.TEAM_A_SCORE;
                    var scoreB = match.TEAM_B_SCORE;
                    if (scoreA != scoreB) {
                        var winnerTeam = (scoreA > scoreB) ? 'A' : 'B';
                        classes.push((teamLetter == winnerTeam) ? 'winner-team' : 'loser-team');
                    }
                }
                return classes.join(' ');
            }
            return '';
        };

        $scope.editScore = function(match) {
            if (matchFormInterval)
                window.clearInterval(matchFormInterval);
            matchFormInterval = window.setInterval(function() {
                if (window['match_uploaded_file']) {
                    match.UploadedFileUrl = window['match_uploaded_file'] == 'NULL' ? null : window['match_uploaded_file'];
                    window['match_uploaded_file'] = null;
                }
            }, 200);
            $uibModal.open({
                templateUrl: 'views/match-results-dialog.html',
                controller: 'MatchResultDialogCtrl',
                resolve: {
                    match: function () {
                        return sportUtils.shallowCopy(match);
                    },
                    technicalRule: function() {
                        return  $scope.selected.Category.TechnicalRule;
                    }
                }
            }).result.then(function (updatedMatch) {
                    $http.post('/api/sportsman/match-result', {Match: updatedMatch}).then(function(resp) {
                        match.ORIGINAL_SCORE_A = resp.data.ORIGINAL_SCORE_A;
                        match.ORIGINAL_SCORE_B = resp.data.ORIGINAL_SCORE_B;
                        match.OverridenScoreApproved = resp.data.OverridenScoreApproved;
                        match.OVERRIDEN_TEAM_A_SCORE = updatedMatch.OVERRIDEN_TEAM_A_SCORE;
                        match.OVERRIDEN_TEAM_B_SCORE = updatedMatch.OVERRIDEN_TEAM_B_SCORE;
                        match.TEAM_A_SCORE = match.OVERRIDEN_TEAM_A_SCORE;
                        match.TEAM_B_SCORE = match.OVERRIDEN_TEAM_B_SCORE;
                        match.PartsData = championshipsUtils.ConvertPartsResult(updatedMatch.OVERRIDEN_PARTS_RESULT);
                        match.RESULT = updatedMatch.RESULT;
                        if (match.RESULT == 3)
                            match.TechnicalWin_A = true;
                        else if (match.RESULT == 4)
                            match.TechnicalWin_B = true;
                        ApplySportsmanResult(match, updatedMatch.RESULT);
                    }, function(err) {
                        console.log(err);
                        alert('שגיאה בעת עדכון תוצאה, נא לנסות שוב מאוחר יותר');
                    });
                });
        };

        $scope.PhaseClicked = function(phase) {
            phase.Expanded = !phase.Expanded;
            window['toggle-phase-visibility'] = phase.Index;
        };

        $scope.approvePendingScore = function(match) {
            $http.put('/api/sportsman/pending-score', {Match: match}).then(function(resp) {
                match.TEAM_A_SCORE = match.OVERRIDEN_TEAM_A_SCORE;
                match.TEAM_B_SCORE = match.OVERRIDEN_TEAM_B_SCORE;
                match.OverridenScoreApproved = 1;
                ApplySportsmanResult(match, match.RESULT);
            }, function(err) {
                console.log(err);
                alert('שגיאה בעת אישור תוצאה, נא לנסות שוב מאוחר יותר');
            });
        };

        $scope.rejectPendingScore = function(match) {
            var url = '/api/sportsman/pending-score?' + sportUtils.SerializeForQueryString(match, 'Match_');
            $http.delete(url).then(function(resp) {
                match.OverridenScoreApproved = null;
                match.OVERRIDEN_TEAM_A_SCORE = null;
                match.OVERRIDEN_TEAM_B_SCORE = null;
            }, function(err) {
                console.log(err);
                alert('שגיאה בעת מחיקת תוצאה, נא לנסות שוב מאוחר יותר');
            });
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.events')
        .factory('ChampionshipsService',
        ['$http', '$httpParamSerializer', '$filter', 'SportService', ChampionshipsService]);


    function ChampionshipsService($http, $httpParamSerializer, $filter, SportService) {
        function onRead(champData) {

        }

        function onWrite(champData) {

        }

        return {
            read: function (options) {
                if (typeof options == 'undefined')
                    options = {};
                var region = options.region || null;
                var omitEmpty  = options.omitEmpty || 0;
                var selectedSeason = options.season || 0;
                var school = options.school || null;
                return SportService.currentSeason(selectedSeason).then(function(season) {
                    var url = '/api/sportsman/championships';
                    var params = $httpParamSerializer({season: season, region: region, omitEmpty: omitEmpty, school: school});
                    url += '?' + params;
                    return $http.get(url).then(function (resp) {
                        //console.log('season: ' + season + ', champs: ' + resp.data.length);
                        for (var i = 0; i < resp.data.length; i++) {
                            onRead(resp.data[i]);
                        }
                        return resp.data;
                    });
                });
            },
            teams: function (champCategory, allMatches, sportType) {
                if (typeof sportType == 'undefined')
                    sportType = 0;
                function BuildMatchingGroup(allTeams, teamID) {
                    var matchingTeam = allTeams.findItem(function(x) { return x.TEAM_ID == teamID; });
                    if (matchingTeam != null) {
                        var group = matchingTeam.NGROUP;
                        var matchingTeams = allTeams.filter(function(x) { return x.NGROUP == group; });
                        return {
                            TeamA: matchingTeams[0],
                            TeamB: matchingTeams[1]
                        };
                    }
                    return null;
                }

                var matchesMapping = {};
                if (allMatches != null && allMatches.length > 0) {
                    allMatches.forEach(function(curMatch) {
                        var curFacility = curMatch.FacilityName;
                        var curDate = curMatch.Date;
                        var key_A = [curMatch.Phase, curMatch.Group, curMatch.TeamA_Id].join('_');
                        var key_B = [curMatch.Phase, curMatch.Group, curMatch.TeamB_Id].join('_');
                        if (!matchesMapping[key_A])
                            matchesMapping[key_A] = [];
                        if (!matchesMapping[key_B])
                            matchesMapping[key_B] = [];
                        matchesMapping[key_A].push({Score: curMatch.TeamA_Score, Facility: curFacility , Date: curDate});
                        matchesMapping[key_B].push({Score: curMatch.TeamB_Score, Facility: curFacility , Date: curDate});
                    });
                }
                var url = '';
                if (sportType == 1) {
                    url = '/api/sportsman/data-gateway';
                    return $http.get(url).then(function (resp) {
                        url = resp.data;
                        url += '?ccid=' + champCategory;
                        return $http.get(url).then(function (resp) {
                            return {
                                Teams: resp.data,
                                Tree: null
                            };
                        });
                    });
                } else {
                    url = '/api/sportsman/category-teams';
                    var params = $httpParamSerializer({category: champCategory});
                    url += '?' + params;
                    return $http.get(url).then(function (resp) {
                        var rawTeams = resp.data.Tree ? resp.data.Teams : resp.data;
                        var teams = [];
                        for (var i = 0; i < rawTeams.length; i++) {
                            var curTeam = rawTeams[i];
                            teams.push(curTeam);
                        }
                        var finalsTree = resp.data.Tree;
                        if (finalsTree != null && finalsTree) {
                            for (var prop in finalsTree) {
                                var curFinalsTeams = finalsTree[prop];
                                for (var i = 0; i < curFinalsTeams.length; i++) {
                                    var curFinalsTeam = curFinalsTeams[i];
                                    var key = [curFinalsTeam.PHASE, curFinalsTeam.NGROUP, curFinalsTeam.TEAM_ID].join('_');
                                    curFinalsTeam.Matches = matchesMapping[key];
                                    curFinalsTeam.Match = curFinalsTeam.Matches != null ? curFinalsTeam.Matches[0] : null;
                                    curFinalsTeam.Name = eventsUtils.BuildTeamName(curFinalsTeam, null);
                                }
                            }
                            var finalsTeams = finalsTree.Finals.slice(0);
                            finalsTree.Finals = {
                                TeamA: finalsTeams[0],
                                TeamB: finalsTeams[1]
                            };

                            var semiFinalsTeams = finalsTree.SemiFinals.slice(0);
                            finalsTree.SemiFinals = {
                                Group1: BuildMatchingGroup(semiFinalsTeams, finalsTree.Finals.TeamB.TEAM_ID),
                                Group2: BuildMatchingGroup(semiFinalsTeams, finalsTree.Finals.TeamA.TEAM_ID)
                            };

                            var quarterFinalsTeams = finalsTree.QuarterFinals.slice(0);
                            finalsTree.QuarterFinals = {
                                Group1: BuildMatchingGroup(quarterFinalsTeams, finalsTree.SemiFinals.Group1.TeamA.TEAM_ID),
                                Group2: BuildMatchingGroup(quarterFinalsTeams, finalsTree.SemiFinals.Group1.TeamB.TEAM_ID),
                                Group3: BuildMatchingGroup(quarterFinalsTeams, finalsTree.SemiFinals.Group2.TeamA.TEAM_ID),
                                Group4: BuildMatchingGroup(quarterFinalsTeams, finalsTree.SemiFinals.Group2.TeamB.TEAM_ID)
                            };
                        }
                        return {
                            Teams: teams,
                            Tree: finalsTree
                        };
                    });
                }
            },
            selectedPhase: function(champCategory) {
                var url = '/api/sportsman/active-phase';
                var params = $httpParamSerializer({category: champCategory});
                url += '?' + params;
                return $http.get(url).then(function (resp) {
                    return resp.data.ActivePhase;
                });

            }
        };
    }
})();
var championshipsUtils = {
    _dummyLoginTimer: 0,
    _phaseVisibilityTimer: 0,
    _teamNamesHeightTimer: 0,
    convertSportFlowersChampionships: function(sportFlowersEvents, $filter) {
        var sportFlowersChampionships = [];
        for (var i = 0; i < sportFlowersEvents.length; i++) {
            var curSportFlowerEvent = sportFlowersEvents[i];
            var sportFlowerChamp = {
                CHAMPIONSHIP_CATEGORY_ID: curSportFlowerEvent.Seq,
                CATEGORY_NAME: curSportFlowerEvent.FacilityName || $filter('date')(curSportFlowerEvent.DateTime, 'dd/MM'),
                CHAMPIONSHIP_ID: curSportFlowerEvent.EventSeq,
                CHAMPIONSHIP_NAME: curSportFlowerEvent.EventName,
                SPORT_ID: sportGlobalSettings.FlowersFieldSeq,
                IS_CLUBS: 0,
                SPORT_NAME: 'פרחי ספורט',
                TotalTeams: 1
            };
            sportFlowersChampionships.push(sportFlowerChamp);
        }
        return sportFlowersChampionships;
    },
    ConvertPartsResult: function(rawValue) {
        var partsData = null;
        if (rawValue != null && rawValue && rawValue.length > 0) {
            var parts = [];
            rawValue.split('|').forEach(function(rawPart) {
                if (rawPart.length > 0) {
                    var points = rawPart.split('-');
                    if (points.length == 2) {
                        var teamA_score = parseInt(points[0]);
                        var teamB_score = parseInt(points[1]);
                        if (!isNaN(teamA_score) && teamA_score >= 0 && !isNaN(teamB_score) && teamB_score >= 0) {
                            parts.push({
                                TeamA: teamA_score,
                                TeamB: teamB_score
                            });
                        }
                    }
                }
            });
            if (parts.length > 0) {
                partsData = {
                    TeamA: parts.map(function(x) { return x.TeamA; }),
                    TeamB: parts.map(function(x) { return x.TeamB; })
                };
            }
        }
        return partsData;
    },
    CreatePartsResult: function(partScore) {
        var partsResult = null;
        if (partScore != null && partScore.length > 0) {
            partsResult = partScore.map(function (x) {
                if (x.ScoreA != null && x.ScoreB != null) {
                    return [x.ScoreA, x.ScoreB].join('-');
                } else {
                    return '';
                }
            }).filter(function (x) {
                return x.length > 0;
            }).join('|');
        }
        return partsResult;
    },
    HasPendingScore: function(match) {
        return match.OVERRIDEN_TEAM_A_SCORE != null && match.OVERRIDEN_TEAM_B_SCORE != null && match.OverridenScoreApproved != 1;
    },
    HasPendingPartScore: function(match) {
        return match.OVERRIDEN_PARTS_RESULT != null && match.OverridenScoreApproved != 1;
    },
    actualTeamsFilter: function(team) {
        var teamName = team.Name;
        return teamName.indexOf('מנצחת משחק') < 0 &&
            teamName.indexOf('מפסידת משחק') < 0 &&
            teamName.indexOf(' מיקום ') < 0;
    },
    ExtractTreeMatches: function(finalsTree) {
        function AddSingleMatch(teamA, teamB, treeMatches) {
            if (teamA && teamB) {
                treeMatches.push({
                    TeamA_Id: teamA.TEAM_ID,
                    TeamB_Id: teamB.TEAM_ID,
                    PhaseIndex: teamA.PHASE
                });
                return true;
            }
            return false;
        }
        var treeMatches = [];
        for (var phase in finalsTree) {
            var curTreePhase = finalsTree[phase];
            if (!AddSingleMatch(curTreePhase.TeamA, curTreePhase.TeamB, treeMatches)) {
                for (var group in curTreePhase) {
                    var currentGroup = curTreePhase[group];
                    AddSingleMatch(currentGroup.TeamA, currentGroup.TeamB, treeMatches)
                }
            }
        }
        return treeMatches;
    },
    ApplyFinalsTree: function(finalsTree, phases, matches) {
        if (!finalsTree || !phases || phases.length == 0 || !matches || matches.length == 0)
            return;

        var matchMapping = matches.SplitByProperty('Phase');
        var allTreeMatches = championshipsUtils.ExtractTreeMatches(finalsTree);
        var treeMatchesMapping = {};
        allTreeMatches.forEach(function(match) {
            var key = [match.PhaseIndex, match.TeamA_Id, match.TeamB_Id].join('_');
            treeMatchesMapping[key] = true;
        });
        var qs = sportUtils.ParseQueryString();
        if (qs['English'] != '1' && qs['english'] != '1') {
            phases.forEach(function (phase) {
                if (phase.Index >= 0) {
                    var phaseMatches = matchMapping[phase.Index.toString()];
                    var matchesInTree = phaseMatches.filter(function (x) {
                        var key = [x.Phase, x.TeamA_Id, x.TeamB_Id].join('_');
                        var key2 = [x.Phase, x.TeamB_Id, x.TeamA_Id].join('_');
                        return treeMatchesMapping[key] || treeMatchesMapping[key2];
                    });
                    if (matchesInTree.length > 0) {
                        if (matchesInTree.length == phaseMatches.length) {
                            phase.Hidden = true;
                        } else {
                            phase.Name = 'משחקי מבחן';
                        }
                    }
                }
            });
        }
    },
    ExtractDistinctMatches: function(matches, uniqueFields) {
        if (typeof uniqueFields == 'undefined' || uniqueFields == null || uniqueFields.length == 0)
            uniqueFields = ['CHAMPIONSHIP_CATEGORY_ID', 'PHASE', 'NGROUP', 'ROUND', 'MATCH', 'CYCLE'];
        var distinctMatches = [];
        var mapping = {};
        matches.forEach(function(curMatch) {
            var key = uniqueFields.map(function(fieldName) { return curMatch[fieldName]; }).join('_');
            if (!mapping[key]) {
                distinctMatches.push(sportUtils.shallowCopy(curMatch));
                mapping[key] = true;
            }
        });
        return distinctMatches;
    },
    BindDummyLogin: function() {
        sportUtils.AttachAutoClick();
        $('#txtDummyUserName').bind('change', function() {
            $('#username').val($(this).val());
            $('#username').trigger('change');
        });
        $('#txtDummyPassword').bind('change', function() {
            $('#password').val($(this).val());
            $('#password').trigger('change');
        });
        $('#btnDummyLogin').bind('click', function() {
            $('#btnLogin').trigger('click');
        });
        if (championshipsUtils._dummyLoginTimer)
            window.clearInterval(championshipsUtils._dummyLoginTimer);
        var dummyErrorPanel = $('#pnlLoginError');
        championshipsUtils._dummyLoginTimer = window.setInterval(function() {
            var errorContents = $.trim($('#loginErrorPanel').text());
            dummyErrorPanel.text(errorContents);
            if (errorContents.length > 0) {
                dummyErrorPanel.show();
            } else {
                dummyErrorPanel.hide();
            }
        }, 100);
        //
    },
    InitPhaseVisibility: function() {
        if (championshipsUtils._phaseVisibilityTimer)
            window.clearInterval(championshipsUtils._phaseVisibilityTimer);
        championshipsUtils._phaseVisibilityTimer = window.setInterval(function() {
            var phaseIndex = window['toggle-phase-visibility'];
            if (phaseIndex != null) {
                window['toggle-phase-visibility'] = null;
                var element = $('.phase-contents[data-phase-index="' + phaseIndex + '"]');
                if (element.length == 1) {
                    var isCurrentlyVisible = element.is(":visible");
                    if (isCurrentlyVisible) {
                        element.hide("slow");
                    } else {
                        element.show("slow");
                    }
                }
            }
        }, 100);
    },
    InitTeamNamesHeightTimer: function() {
        if (championshipsUtils._teamNamesHeightTimer)
            window.clearInterval(championshipsUtils._teamNamesHeightTimer);
        championshipsUtils._teamNamesHeightTimer = window.setInterval(function() {
            var matchRows = $(".match-row");
            if (matchRows.length > 0) {
                matchRows.each(function() {
                    var matchRow = $(this);
                    var teamNames = matchRow.find(".team_name");
                    if (teamNames.length == 2) {
                        var teamB_Element = teamNames.eq(0);
                        var teamA_Element = teamNames.eq(1);
                        var teamB_Height = teamB_Element.height();
                        var teamA_Height = teamA_Element.height();
                        if (teamB_Height != teamA_Height) {
                            var maxHeight = Math.max(teamB_Height, teamA_Height);
                            var otherTeam = (maxHeight == teamB_Height) ? teamA_Element : teamB_Element;
                            otherTeam.css("height", maxHeight + "px");
                        }
                    }
                });
            }
        }, 200);
    }
};


(function() {
    'use strict';

    angular
        .module('sport')
        .controller('MatchResultDialogCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$timeout', '$q', 'messageBox', 'match', 'technicalRule', MatchResultDialogCtrl]);

    function MatchResultDialogCtrl($scope, $http, $uibModalInstance, $filter, $timeout, $q, messageBox, match, technicalRule) {
        var matchFormExists = match.UploadedFileUrl && match.UploadedFileUrl.length > 0;
        var uploadFolderUrl = '/content/Matches/' + [match.CHAMPIONSHIP_CATEGORY_ID, match.match_number, 'form'].join('/');
        var dropZoneTitle = 'ניתן לגרור לכאן טופס ';
        if (matchFormExists)
            dropZoneTitle += 'חדש ';
        dropZoneTitle += 'או ללחוץ להעלאה';

        $scope.match = match;
        $scope.match.OriginalResult = $scope.match.RESULT;
        $scope.match.OverridenPartScore = null;

        if ($scope.match.PartsData != null)
            $scope.match.ShowPartScore = true;

        window.setTimeout(function() {
            var textboxId_A = sportUtils.IsMobile() ? 'edTeamA_Score_mobile' : 'edTeamA_Score';
            var textboxId_B = sportUtils.IsMobile() ? 'edTeamB_Score_mobile' : 'edTeamB_Score';
            $('#' + textboxId_A).focus();
            sportUtils.IntegerOnlyTextbox(textboxId_A);
            sportUtils.IntegerOnlyTextbox(textboxId_B);
        }, 500);

        function GetTeamScore(teamLetter, index) {
            if ($scope.match.PartsData != null) {
                var arrScore = $scope.match.PartsData['Team' + teamLetter];
                if (index >= 0 && index < arrScore.length)
                    return arrScore[index];
            }
            return null;
        }

        $http.get('/api/sportsman/data-gateway').then(function (resp) {
            var url = resp.data + '?ccid=' + match.CHAMPIONSHIP_CATEGORY_ID;
            $http.get(url).then(function(resp) {
                if (resp.data != null && resp.data.GameStructure != null && resp.data.GameStructure.PartCount) {
                    $scope.match.OverridenPartScore = [];
                    for (var i = 0; i < resp.data.GameStructure.PartCount; i++) {
                        var scoreA = GetTeamScore('A', i);
                        var scoreB = GetTeamScore('B', i);
                        $scope.match.OverridenPartScore.push({
                            ScoreA: scoreA,
                            OriginalScoreA: scoreA,
                            ScoreB: scoreB,
                            OriginalScoreB: scoreB,
                            IsExtension: false
                        });
                    }
                    if (resp.data.GameStructure.ExtensionCount) {
                        for (var i = 0; i < resp.data.GameStructure.ExtensionCount; i++) {
                            var scoreA = GetTeamScore('A', i + resp.data.GameStructure.PartCount);
                            var scoreB = GetTeamScore('B', i + resp.data.GameStructure.PartCount);
                            var curPartScore = {
                                ScoreA: scoreA,
                                OriginalScoreA: scoreA,
                                ScoreB: scoreB,
                                OriginalScoreB: scoreB,
                                IsExtension: true
                            };
                            if (i == 0)
                                curPartScore.FirstExtension = true;
                            $scope.match.OverridenPartScore.push(curPartScore);
                        }
                    }
                }
            });
        });

        function ApplyErrorMessage(errorMsg, dropZone, file) {
            $scope.fileUploadError = errorMsg;
            window.setTimeout(function () {
                dropZone.removeFile(file);
            }, 200);
            $timeout(function () {
                $scope.fileUploadError = '';
            }, 5000);
        }

        function HandleFileUpload(dropZone, file) {
            function ValidateAttachment() {
                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var isImage = (isEmpty) ? false : fileType.split('/')[0].toLowerCase() == 'image';
                var isPDF = (isEmpty) ? false : fileType.split('/')[1].toLowerCase() == 'pdf';
                if (!isImage && !isPDF)
                    return 'ניתן להעלות קובץ תמונה או PDF בלבד';
                return '';
            }

            var errorMsg = ValidateAttachment();
            if (errorMsg.length > 0) {
                ApplyErrorMessage(errorMsg, dropZone, file);
                return false;
            }

            return true;
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': uploadFolderUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': dropZoneTitle,
                'dictRemoveFile': 'הסרת טופס',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    $scope.fileUploadError = '';
                    $scope.fileUploaded = false;
                    var _this = this;
                    if (HandleFileUpload(_this, file)) {
                        var contentPath = uploadFolderUrl + '/' + file.name;
                        var requestParams = {
                            Category: $scope.match.CHAMPIONSHIP_CATEGORY_ID,
                            Match: $scope.match.match_number,
                            Path: contentPath
                        };
                        $http.post('/api/common/match-forms', requestParams).then(function() {
                            $scope.match.UploadedFileUrl = contentPath;
                            $scope.fileUploaded = true;
                            window['match_uploaded_file'] = contentPath;
                        }, function(err) {
                            ApplyErrorMessage('שגיאה בעת העלאת קובץ נא לנסות שוב מאוחר יותר', _this, file);
                        });

                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                },
                'removedfile': function(file) {
                    console.log('file removed: ' + file.name);
                    window['match_uploaded_file'] = 'NULL';
                }
            }
        };

        function ResetScores() {
            if (championshipsUtils.HasPendingScore(match)) {
                $scope.match.NewScore_A = $scope.match.OVERRIDEN_TEAM_A_SCORE;
                $scope.match.NewScore_B = $scope.match.OVERRIDEN_TEAM_B_SCORE;
            } else {
                $scope.match.NewScore_A = $scope.match.TEAM_A_SCORE;
                $scope.match.NewScore_B = $scope.match.TEAM_B_SCORE;
            }
        }

        ResetScores();

        $scope.getPartScoreStyle = function(partScore) {
            return partScore.FirstExtension ? 'margin-bottom: 10px;' : '';
        };

        $scope.getFileUploadIconStyle = function() {
            var style = 'font-size: 70px; margin-top: 20px;';
            if ($scope.fileUploaded) {
                style += ' color: green; margin-top: -10px;'
            }
            return style;
        };

        $scope.isConfirmDisabled = function() {
            if ($scope.match.OverridenPartScore != null) {
                var matchingItem = $scope.match.OverridenPartScore.findItem(function(partScore) {
                    return partScore.OriginalScoreA != partScore.ScoreA || partScore.OriginalScoreB != partScore.ScoreB;
                });
                if (matchingItem != null)
                    return false;
            }

            if ($scope.match.OriginalResult == $scope.match.RESULT) {
                if ($scope.match.NewScore_A == null || $scope.match.NewScore_A == '')
                    return true;

                if ($scope.match.NewScore_B == null || $scope.match.NewScore_B == '')
                    return true;

                if ($scope.match.NewScore_A == $scope.match.TEAM_A_SCORE && $scope.match.NewScore_B == $scope.match.TEAM_B_SCORE)
                    return true;
            }

            return false;
        };

        $scope.TechnicalWinChanged = function(teamLetter) {
            if ($scope.match['TechnicalWin_' + teamLetter]) {
                var otherTeamLetter = teamLetter == 'A' ? 'B' : 'A';
                $scope.match['TechnicalWin_' + otherTeamLetter] = false;
                if (technicalRule != null && technicalRule.Winner != null) {
                    $scope.match['NewScore_' + teamLetter] = technicalRule.Winner;
                    $scope.match['NewScore_' + otherTeamLetter] = technicalRule.Loser;
                }
            } else {
                ResetScores();
            }
            if ($scope.match.TechnicalWin_A)
                $scope.match.RESULT = 3;
            else if ($scope.match.TechnicalWin_B)
                $scope.match.RESULT = 4;
            else
                $scope.match.RESULT = null;
        };

        $scope.deleteMatchForm = function() {
            var msg = 'האם למחוק את טופס המשחק?';
            messageBox.ask(msg).then(function () {
                var url = '/api/common/match-forms?category=' + $scope.match.CHAMPIONSHIP_CATEGORY_ID + '&match=' + $scope.match.match_number;
                $http.delete(url).then(function(resp) {
                    $scope.match.UploadedFileUrl = null;
                    window['match_uploaded_file'] = 'NULL'
                }, function(err) {
                    alert('שגיאה בעת מחיקת טופס משחק מהמערכת, נא לנסות שוב מאוחר יותר');
                    console.log('error deleting match form');
                    console.log(err);
                });
            });
        };

        $scope.clearPartsData = function() {
            if ($scope.match.OverridenPartScore) {
                $scope.match.OverridenPartScore.forEach(function (partScore) {
                    partScore.ScoreA = null;
                    partScore.ScoreB = null;
                });
            }
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $scope.match.OVERRIDEN_TEAM_A_SCORE = $scope.match.NewScore_A;
            $scope.match.OVERRIDEN_TEAM_B_SCORE = $scope.match.NewScore_B;
            $scope.match.OVERRIDEN_PARTS_RESULT = championshipsUtils.CreatePartsResult($scope.match.OverridenPartScore);
            $uibModalInstance.close($scope.match);
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport')
        .controller('RankingTableDialogCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$timeout', '$q', 'messageBox', 'categoryData', RankingTableDialogCtrl]);

    function RankingTableDialogCtrl($scope, $http, $uibModalInstance, $filter, $timeout, $q, messageBox, categoryData) {
        $scope.data = {
            FullCaption: categoryData.Category.Name + ', ' + categoryData.Phase.Name + ', ' + categoryData.Group.Name,
            AllTables: categoryData.RankingTables,
            RankingTable: null
        };

        function ApplyData() {
            if ($scope.data.AllTables == null) {
                $scope.error = 'לא קיימים נתונים עבור אליפות זו';
                return;
            }

            if (categoryData.Phase.Index >= $scope.data.AllTables.length) {
                $scope.error = 'אין נתוני דירוג עבור שלב אליפות נבחר';
                return;
            }

            $scope.data.RankingTable = $scope.data.AllTables[categoryData.Phase.Index];
            $scope.data.RankingTable.GroupRows = [];
            if ($scope.data.RankingTable.Rows) {
                $scope.data.RankingTable.GroupRows = $scope.data.RankingTable.Rows.filter(function (row) {
                    return row.GroupName == categoryData.Group.Name;
                });
                $scope.data.RankingTable.GroupRows.sortByProperty('Position');
            }

            //resize and put back in middle in case the table is big
            window.setTimeout(function() {
                var modalContent = $(".modal-content");
                if (modalContent.length > 0) {
                    var tableWidth = $("#tblRanking").width();
                    var modalWidth = modalContent.width();
                    if (tableWidth > modalWidth) {
                        var diff = Math.floor((tableWidth - modalWidth) / 2);
                        modalContent.css("width", (tableWidth + 50) + "px");
                        modalContent.css("left", diff + "px");
                    }
                }
            }, 500);
        }

        if ($scope.data.AllTables == null) {
            console.log('reading from server...')
            $scope.loading = true;
            $http.get('/api/sportsman/data-gateway').then(function (resp) {
                var url = resp.data;
                url += '?ccid=' + categoryData.Category.Id;
                $http.get(url).then(function (resp) {
                    $scope.loading = false;
                    $scope.data.AllTables = resp.data.RankingTables;
                    ApplyData();
                });
            }, function(err) {
                $scope.loading = false;
                $scope.error = 'שגיאה בעת טעינת נתונים מהשרת, נא לנסות שוב מאוחר יותר';
            });
        } else {
            ApplyData();
        }

        //dots
        window.setInterval(function() {
            var dotsLabel = $("#lbDots");
            var parentDiv = dotsLabel.parents("div").first();
            if (parentDiv.is(":visible")) {
                var dotCount = dotsLabel.text().length;
                dotCount++;
                if (dotCount > 3)
                    dotCount = 1;
                var dots = Array(dotCount + 1).join(".");
                dotsLabel.text(dots);
            }
        }, 1000);

        $scope.close = function () {
            $uibModalInstance.close($scope.data.AllTables);
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.club-register')
        .controller('ClubRegisterController',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', '$uibModal', 'messageBox', ClubRegisterController])
        .controller('ClubRegisterWelcomeDialogCtrl', ['$scope', '$uibModalInstance', '$sce', 'school', ClubRegisterWelcomeDialogCtrl]);

    function ClubRegisterController($scope, $state, $http, $filter, $timeout, $interval, $uibModal, messageBox) {
        var allClubData = null;
        var hebrewFemaleCounting = ['ראשונה', 'שנייה', 'שלישית', 'רביעית', 'חמישית', 'שישית', 'שביעית', 'שמינית', 'תשיעית', 'עשירית'];
        var tabBaseStyles = {
            '1': 'padding: 5px 5px 5px 5px;',
            '2': ''
        };
        var tabActiveStyles = {
            '1': 'background-color: #00ADEE;',
            '2': 'color: white;'
        };
        var tabRequiredFields = {
            '1': [
                {
                    Property: 'HasConfirmedClubTerms',
                    Type: 'boolean',
                    Message: 'אישור קריאת התחייבות'
                }
            ],
            '4': [
                {
                    Property: 'HasConfirmedFacilityTerms',
                    Type: 'boolean',
                    Message: 'אישור קריאת התחייבות'
                }
            ]
        };
        $scope.loggedUser = null;
        $scope.hasConfirmedFinalSubmission = false;
        $scope.data = {
            selectedTab: null,
            authorizationLevels: registerUtils.sharedClubData.authorizationLevels,
            yesNoOptions: registerUtils.sharedClubData.yesNoOptions,
            clubFormTabs: [
                { Index: 1, Caption: 'פרטי ביה"ס' },
                { Index: 2, Caption: 'רישום קבוצות' , NoData: true },
                { Index: 3, Caption: 'דמי רישום' },
                { Index: 4, Caption: 'מתקני פעילות' },
                { Index: 5, Caption: 'חברי הנהלת מועדון' },
                { Index: 6, Caption: 'נתוני מאמנים' }
                //{ Index: 6, Caption: 'ימי אירוח' },
            ],
            facilitySportFields: [
            ],
            hebrewWeekDays: [
                { Index: 1, Name: "א'" },
                { Index: 2, Name: "ב'" },
                { Index: 3, Name: "ג'" },
                { Index: 4, Name: "ד'" },
                { Index: 5, Name: "ה'" }
            ],
            managementBoardMembers: [
                { Id: 1, Caption: 'יו"ר'},
                { Id: 2, Caption: 'סגן יו"ר'},
                { Id: 3, Caption: 'רכז מועדון'},
                { Id: 4, Caption: 'חבר'},
                { Id: 5, Caption: 'חבר'},
                { Id: 6, Caption: 'חבר'},
            ],
            hostingDays: [
                { Id: 1, SportField: 'כדורעף' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 2, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 3, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 4, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 5, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 6, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 2, SportField: 'כדוריד' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' },
                    { Index: 2, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 3, SportField:  'כדורגל', Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 4, SportField: 'כדורסל' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 5, SportField: 'טניס שולחן' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]},
                { Id: 6, SportField: 'בדמינטון' , Categories: [
                    { Index: 1, Name: '', Weekday: '', HostingHour: '' }
                ]}
            ],
            coachesData: []
        };
        $scope.school = {
            OrdersBasket: [],
            Cheque: {}
        };

        function ReloadOrdersBasket() {
            $http.get('/api/school-club/team-orders').then(function(resp) {
                $scope.school.OrdersBasket = resp.data;
                $scope.school.OrdersBasket.forEach(function(order, index) {
                    order.Index = index + 1;
                });
            }, function(err) {
                console.log('error getting orders basket');
            });
        }

        ReloadOrdersBasket();

        function ApplyUserData() {
            var schoolSymbol = $scope.loggedUser.SchoolSymbol;
            $http.get('/api/sportsman/school-data?symbol=' + schoolSymbol).then(function(resp) {
                $scope.isClubSchool = resp.data.CLUB_STATUS == 1;
            });
            if (schoolSymbol) {
                registerUtils.buildSchoolName($http, schoolSymbol).then(function (schoolName) {
                    $scope.loggedUser.SchoolName = schoolName;
                }, function (err) {
                    console.log('error reading school name');
                    console.log(err);
                });
            }
        }

        function ApplyActiveTab(tab) {
            $scope.data.clubFormTabs.forEach(function(curTab) {
                if (curTab.Index != tab.Index) {
                    curTab.Active = false;
                }
            });
            tab.Active = true;
            $scope.data.selectedTab = tab;
        }

        function GetActiveTab() {
            return $scope.data.clubFormTabs.findItem(function(x) {
                return x.Active == true;
            });
        }

        function ApplyTabIndices(array, initialTabIndex, indexProperties, omittedProperties) {
            if (typeof omittedProperties == 'undefined')
                omittedProperties = [];
            if (array.length > 0) {
                if (indexProperties.length == 0) {
                    var omitMapping = {};
                    omittedProperties.forEach(function(propertyName) {
                        omitMapping[propertyName] = true;
                    });
                    for (var propertyName in array[0]) {
                        if (!omitMapping[propertyName]) {
                            indexProperties.push(propertyName);
                        }
                    }
                }
                var tabIndex = initialTabIndex;
                array.forEach(function(item) {
                    indexProperties.forEach(function(propertyName) {
                        item[propertyName + 'TabIndex'] = tabIndex;
                        tabIndex++;
                    });
                });
            }
        }

        function VerifyFields(tab) {
            function VerifySingleField(field) {
                var value = $scope.school[field.Property];
                var valid = false;
                switch (field.Type) {
                    case 'boolean':
                        valid = (value == true);
                        break;
                    case 'not-empty':
                        valid = value && value.toString().length > 0;
                        break;
                }
                return valid;
            }

            var requiredFields = tabRequiredFields[tab.Index.toString()] || [];
            if (requiredFields.length > 0) {
                var missingFields = requiredFields.filter(function(field) {
                    return VerifySingleField(field) == false;
                }).map(function(field) {
                    return field.Message;
                });
                if (missingFields.length > 0) {
                    var title = 'שדות דרושים חסרים';
                    var message = 'יש למלא את השדות הבאים: ' + '<br />' + missingFields.join('<br />');
                    messageBox.warn(message, {title: title, htmlContents: true});
                    return false;
                }
            }
            return true;
        }

        function ReadServerData(callback) {
            function GetMatchingRows(allRows, dataCaption) {
                if (dataCaption.length > 0 && !dataCaption.endsWith('_'))
                    dataCaption += '_';
                return allRows.filter(function(row) {
                    return row.PropertyName.startsWith(dataCaption);
                });
            }

            function ApplyDataObject(dataObject, allRows, dataCaption, specialPropertiesMapping, addNonExistentProperties) {
                function ExtractPropertyValue(propertyName, rawValue) {
                    var specialPropertyData = specialPropertiesMapping[propertyName];
                    if (specialPropertyData && rawValue != null) {
                        if (specialPropertyData.IsBoolean) {
                            return (rawValue == '1') ? true : false;
                        } else if (specialPropertyData.IsArray) {
                            return rawValue.split(',');
                        } else {
                            var matchingItem = specialPropertyData.Items.findItem(function (item) {
                                return item[specialPropertyData.KeyProperty] == rawValue;
                            });
                            if (matchingItem != null)
                                return matchingItem;
                        }
                    }
                    return rawValue;
                }

                if (typeof specialPropertiesMapping == 'undefined' || specialPropertiesMapping == null)
                    specialPropertiesMapping = {};

                if (addNonExistentProperties == 'undefined')
                    addNonExistentProperties = false;

                var dataRows = GetMatchingRows(allRows, dataCaption);
                if (dataRows.length == 0)
                    return;

                dataRows.forEach(function(dataRow) {
                    var parts = dataRow.PropertyName.split('_');
                    var propertyName = parts.lastItem();
                    var actualObject = null;
                    if (parts.length == 3) {
                        var innerObjectName = parts[1];
                        if (dataObject.hasOwnProperty(innerObjectName))
                            actualObject = dataObject[innerObjectName];
                    };
                    if (parts.length > 3)
                        propertyName = parts.skip(2).join('_');
                    if (actualObject == null)
                        actualObject = dataObject;
                    if (propertyName && (actualObject.hasOwnProperty(propertyName) || addNonExistentProperties)) {
                        var propertyValue = dataRow.PropertyValue;
                        actualObject[propertyName] = ExtractPropertyValue(propertyName, propertyValue);
                    }
                });
            }

            function ApplyArrayData(array, allRows, dataCaption, specialPropertiesMapping, addNonExistentProperties) {
                if (typeof specialPropertiesMapping == 'undefined')
                    specialPropertiesMapping = {};
                if (addNonExistentProperties == 'undefined')
                    addNonExistentProperties = false;
                var matchingRows = GetMatchingRows(allRows, dataCaption);
                array.forEach(function(item, index) {
                    var rowIndex = item.Id || item.Index;
                    if (!rowIndex)
                        rowIndex = index + 1;
                    var curItemCaption = dataCaption + '_' + rowIndex;
                    ApplyDataObject(item, matchingRows, curItemCaption, specialPropertiesMapping, addNonExistentProperties);
                });
            }

            function SetIfNotBlank(sourceObject, targetObject, sourcePropertyName, targetPropertyName) {
                var value = sourceObject[sourcePropertyName];
                if (value)
                    targetObject[targetPropertyName] = value;
            }

            if (typeof callback == 'undefined')
                callback = null;

            $http.get('/api/school-club/data').then(function(resp) {
                var allRows = resp.data;
                allClubData = allRows.slice(0);
                ApplyArrayData($scope.data.coachesData, allRows, 'Coach', {
                    'AuthorizationLevel': { Items: $scope.data.authorizationLevels, KeyProperty: 'Id' },
                    'PassedCoachTraining': { Items: $scope.data.yesNoOptions, KeyProperty: 'Id' }
                });
                ApplyDataObject($scope.school, allRows, 'School', {
                    'IsAssociation': { IsBoolean: true },
                    'IsAssociationConfirmed': { IsBoolean: true },
                    'HasConfirmedClubTerms': { IsBoolean: true },
                    'HasConfirmedFacilityTerms': { IsBoolean: true }
                }, true);
                ApplyArrayData($scope.data.managementBoardMembers, allRows, 'ManagementBoardMember', {}, true);
                ApplyArrayData($scope.data.hostingDays, allRows, 'HostingDay', {}, true);
                $scope.data.hostingDays.forEach(function(hostingDay) {
                    hostingDay.Categories.forEach(function(category) {
                        SetIfNotBlank(hostingDay, category, 'Category_' + category.Index + '_Name', 'Name');
                        SetIfNotBlank(hostingDay, category, 'Category_' + category.Index + '_Weekday', 'Weekday');
                        SetIfNotBlank(hostingDay, category, 'Category_' + category.Index + '_HostingHour', 'HostingHour');
                    });
                });
                $http.get('/api/common/school-user-data').then(function(resp) {
                    var schoolUserData = sportUtils.shallowCopy(resp.data);
                    $http.get('/api/common/club-facility-data').then(function(resp) {
                        var regionalFacilityDataItems = resp.data.filter(function(x) {
                            return x.REGION_ID == schoolUserData.REGION_ID;
                        });
                        $scope.data.facilitySportFields = sportUtils.DistinctArray(regionalFacilityDataItems, 'SportFieldSeq').map(function(facilityData) {
                            return {
                                Id: facilityData.SportFieldSeq,
                                Name: facilityData.SportFieldName
                            };
                        });
                        ApplyArrayData($scope.data.facilitySportFields, allClubData, 'FacilitySportField', {}, true); //'Days': { IsArray: true }
                        ApplyTabIndices($scope.data.facilitySportFields, 3, ['Address', 'Contact', 'HostingHours']);
                        /*
                         { Id: 1, Name: 'כדורעף' },
                         { Id: 2, Name: 'כדוריד' },
                         { Id: 3, Name: 'כדורגל 5X5'} //,
                         //{ Id: 4, Name: 'כדורסל' },
                         //{ Id: 5, Name: 'טניס שולחן' },
                         //{ Id: 6, Name: 'כדורעף חופים' },
                         //{ Id: 7, Name: 'בדמינטון' },
                         //{ Id: 8, Name: 'ג\'ודו' }
                         */
                        if (callback != null)
                            callback('SUCCESS');
                    }, function(err) {
                        console.log('error reading facility data');
                        if (callback != null)
                            callback('ERROR');
                    });
                }, function(err) {
                    console.log('error reading school data');
                    if (callback != null)
                        callback('ERROR');
                });
            }, function(err) {
                console.log('error reading school club data');
                if (callback != null)
                    callback('ERROR');
            });
        }

        function ApplyPersonnelData() {
            var url = '/api/sportsman/school/' + $scope.loggedUser.SchoolSymbol + '/personnel';
            $http.get(url).then(function(resp) {
                var schoolPersonnel = resp.data;
                var propertiesMapping = {
                    ManagerEmail: 'SCHOOL_EMAIL',
                    ManagerName: 'SCHOOL_MANAGER_NAME',
                    FaxNumber: 'SCHOOL_FAX',
                    PhoneNumber: 'SCHOOL_PHONE',
                    ChairmanAddress: 'CHAIRMAN_ADDRESS',
                    ChairmanName: 'CHAIRMAN_NAME',
                    ChairmanZipCode: 'CHAIRMAN_ZIP_CODE',
                    ChairmanCity: 'CHAIRMAN_CITY_NAME',
                    ChairmanFax: 'CHAIRMAN_FAX',
                    ChairmanPhoneNumber: 'CHAIRMAN_PHONE',
                    CoordinatorAddress: 'COORDINATOR_ADDRESS',
                    CoordinatorName: 'COORDINATOR_NAME',
                    CoordinatorZipCode: 'COORDINATOR_ZIP_CODE',
                    CoordinatorCity: 'COORDINATOR_CITY_NAME',
                    CoordinatorCellPhone: 'COORDINATOR_CELL_PHONE',
                    CoordinatorPhoneNumber: 'COORDINATOR_PHONE',
                    CoordinatorFax: 'COORDINATOR_FAX',
                    CoordinatorEmailAddress: 'COORDINATOR_EMAIL'
                };
                for (var propertyName in propertiesMapping) {
                    var existingValue = $scope.school[propertyName];
                    if (typeof existingValue == 'undefined' || existingValue == null || existingValue.toString().length == 0)
                        $scope.school[propertyName] = schoolPersonnel[propertiesMapping[propertyName]];
                }
            }, function(err) {
                console.log('error reading school personnel');
            });
        }

        function SaveDataObject(dataObject, prefix, excludedProperties, successCallback, errorCallback) {
            if (typeof excludedProperties == 'undefined')
                excludedProperties = [];
            if (typeof successCallback == 'undefined')
                successCallback = null;
            if (typeof errorCallback == 'undefined')
                errorCallback = null;
            if (excludedProperties.findIndex(function(x) { return x == 'Id'; }) < 0)
                excludedProperties.push('Id');
            if (excludedProperties.findIndex(function(x) { return x == 'Index'; }) < 0)
                excludedProperties.push('Index');
            if (prefix.length > 0 && !prefix.endsWith('_'))
                prefix += '_';
            var requestParams = {
                Data: dataObject,
                Prefix: prefix,
                Excluded: excludedProperties
            };
            $http.post('/api/school-club/data', requestParams).then(function(resp) {
                if (successCallback != null) {
                    successCallback(resp);
                }

            }, function(err) {
                if (errorCallback != null) {
                    errorCallback(err);
                }
            });
        }

        function SaveArrayOfData(array, dataCaption, excludedProperties, currentIndex, successCallback, errorCallback) {
            if (currentIndex >= array.length) {
                successCallback();
                return;
            }

            var currentItem = array[currentIndex];
            var id = currentItem.Id || currentItem.Index;
            if (id) {
                var prefix = dataCaption + '_' + id + '_';
                SaveDataObject(currentItem, prefix, excludedProperties, function () {
                    SaveArrayOfData(array, dataCaption, excludedProperties, currentIndex + 1, successCallback, errorCallback);
                }, function (err) {
                    if (errorCallback != null) {
                        errorCallback(err);
                    }
                });
            } else {
                errorCallback('no id found for item in index ' + currentIndex);
            }
        }

        if ($scope.data.clubFormTabs.length > 0) {
            ApplyActiveTab($scope.data.clubFormTabs[0]);
        }

        for (var i = 0; i <= 6; i++) {
            $scope.data.coachesData.push({
                Id: i + 1,
                SportField: '',
                Name: '',
                IdNumber: '',
                AgeRange: '',
                Gender: '',
                AuthorizationLevel: null,
                PassedCoachTraining: null,
                Cellular: '',
                Address: '',
                Email: ''
            });
        }

        ApplyTabIndices($scope.data.managementBoardMembers, 1, ['Name', 'Role']);
        ApplyTabIndices($scope.data.coachesData, 1, [], ['Id']);
        if ($scope.data.hostingDays.length > 0) {
            var tabIndex = 1;
            $scope.data.hostingDays.forEach(function(hostingDay) {
                ApplyTabIndices(hostingDay.Categories, tabIndex, ['Name', 'Weekday', 'HostingHour'])
                tabIndex += (hostingDay.Categories.length * 3);
                hostingDay.Categories.forEach(function(category) {
                    category.NamePlaceholder = 'קטגוריית ' + hostingDay.SportField;
                    if (hostingDay.Categories.length > 1)
                        category.NamePlaceholder += ' ' + hebrewFemaleCounting[category.Index - 1];
                    category.WeekdayPlaceholder = 'יום פעילות עבור ' ;
                    category.HostingHoursPlaceholder = 'שעות אירוח עבור ';
                    if (hostingDay.Categories.length > 1) {
                        category.WeekdayPlaceholder += category.NamePlaceholder;
                        category.HostingHoursPlaceholder += category.NamePlaceholder;
                    } else {
                        category.WeekdayPlaceholder += hostingDay.SportField;
                        category.HostingHoursPlaceholder += hostingDay.SportField;
                    }
                });
            });
        }

        $interval(function() {
            if (window["reload_orders_basket"] == "1") {
                console.log('reloading orders basket due to trigger...')
                window["reload_orders_basket"] = null;
                ReloadOrdersBasket();
            }
        }, 1000);

        $http.get('/api/login').then(function(resp) {
            if (resp && resp.data && resp.data != null) {
                $scope.loggedUser = {
                    'Seq': resp.data.seq,
                    'Login': resp.data.name,
                    'DisplayName': resp.data.displayName,
                    'Role': resp.data.role,
                    'SchoolSymbol': resp.data.schoolSymbol
                };
                if (resp.data.isClubUser) {
                    /*
                    $uibModal.open({
                        templateUrl: 'views/club-register-welcome-dialog.html',
                        controller: 'ClubRegisterWelcomeDialogCtrl',
                        resolve: {
                            school: function () {
                                return {};
                            }
                        }
                    });
                    */
                    ApplyUserData();
                    ReadServerData(function() {
                        ApplyPersonnelData();
                    });
                } else {
                    $state.go('register');
                }
            }
        }, function(err) {
            console.log('error getting logged in user');
            console.log(err);
        });

        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);

        $interval(function() {
            $("form").each(function() {
                var oForm = $(this);
                if (oForm.data("is-dirty") == "1") {
                    var tabIndex = parseInt(oForm.data("tab-index"));
                    if (!isNaN(tabIndex) && tabIndex > 0) {
                        var matchingTab = $scope.data.clubFormTabs.findItem(function(x) {
                            return x.Index == tabIndex;
                        });
                        if (matchingTab != null) {
                            matchingTab.IsDirty = true;
                        }
                    }
                }
            });
        }, 500);

        $scope.getFormTabStyle = function(tab, type) {
            var style = tabBaseStyles[type.toString()];
            if (tab.Active) {
                style += ' ' + tabActiveStyles[type.toString()];
            }
            return style;
        };

        $scope.tabClicked = function(tab) {
            var curActiveTab = GetActiveTab();
            if (curActiveTab == null) {
                ApplyActiveTab(tab);
                return;
            }
            if (curActiveTab.Index == tab.Index)
                return;
            if (VerifyFields(curActiveTab)) {
                /*
                if (curActiveTab.IsDirty) {
                    var msg = 'נתונים לא נשמרו, האם ברצונך לשמור?';
                    var options = {
                        confirmCaption: 'שמור',
                        cancelCaption: 'אל תשמור'
                    };
                    messageBox.ask(msg, options).then(function () {

                    });
                } else {
                    ApplyActiveTab(tab);
                }
                */
                $scope.saveTab(curActiveTab, function() {
                    ApplyActiveTab(tab);
                });
            }
        };

        $scope.getAuthorizationLevelClass = function(coach, authorizationLevel) {
            return coach.AuthorizationLevel && coach.AuthorizationLevel.Id == authorizationLevel.Id ? 'fa fa-check' : 'fa fa-circle-o';
        };

        $scope.getPassedCoachTrainingClass = function(coach, yesNoOption) {
            return coach.PassedCoachTraining && coach.PassedCoachTraining.Id == yesNoOption.Id ? 'fa fa-check' : 'fa fa-circle-o';
        };

        $scope.getAssociationClass = function() {
            return $scope.school.IsAssociation ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.authorizationLevelClicked = function(authorizationLevel, coach) {
            coach.AuthorizationLevel = authorizationLevel;
        };

        $scope.passedCoachTrainingClicked = function(yesNoOption, coach) {
            coach.PassedCoachTraining = yesNoOption;
        };

        $scope.associationClicked = function() {
            $scope.school.IsAssociation = !$scope.school.IsAssociation;
        };

        $scope.getAssociationConfirmedClass = function() {
            return $scope.school.IsAssociationConfirmed ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.associationConfirmedClicked = function() {
            $scope.school.IsAssociationConfirmed = !$scope.school.IsAssociationConfirmed;
        };

        $scope.getHasConfirmedClubTermsClass = function() {
            return $scope.school.HasConfirmedClubTerms ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.getHasConfirmedFacilityTermsClass = function() {
            return $scope.school.HasConfirmedFacilityTerms ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.getFacilitySportWeekdayClass = function(sportField, weekDay) {
            var checked = sportField.Days && sportField.Days.indexOf(weekDay.Index) >= 0;
            return checked ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.getHasConfirmedFinalSubmissionClass = function() {
            var checked = $scope.hasConfirmedFinalSubmission;
            return checked ? 'fa fa-check-square-o' : 'fa fa-square-o';
        };

        $scope.hasConfirmedClubTermsClicked = function() {
            $scope.school.HasConfirmedClubTerms = !$scope.school.HasConfirmedClubTerms;
        };

        $scope.hasConfirmedFacilityTermsClicked = function() {
            $scope.school.HasConfirmedFacilityTerms = !$scope.school.HasConfirmedFacilityTerms;
        };

        $scope.hasConfirmedFinalSubmissionClicked = function() {
            $scope.hasConfirmedFinalSubmission = !$scope.hasConfirmedFinalSubmission;
        };

        $scope.facilitySportWeekdayClicked = function(sportField, weekDay) {
            if (!sportField.Days)
                sportField.Days = [];
            var existingIndex = sportField.Days.indexOf(weekDay.Index);
            if (existingIndex >= 0) {
                sportField.Days.removeItem(weekDay.Index, existingIndex);
            } else {
                sportField.Days.push(weekDay.Index);
            }
        };

        $scope.ParseChequeSum = function() {
            var rawSum = $scope.school.Cheque.Sum;
            if (rawSum && rawSum.length > 0) {
                return sportUtils.ParseHebrewCurrency(rawSum);
            }
            return '';
        };

        $scope.focusFacilityField = function(sportField, classType) {
            $('.facility-' + classType + '[data-sportfield-id="' + sportField.Id + '"]').find('input').focus();
        };

        $scope.addTeam = function() {
            var existingCategories = $scope.school.OrdersBasket.map(function(x) {
                return x.CHAMPIONSHIP_CATEGORY_ID;
            });
            $uibModal.open({
                templateUrl: 'views/championship-selection.html',
                controller: 'ChampionshipSelectionCtrl',
                resolve: {
                    schoolData: function () {
                        return {
                            Name: $scope.loggedUser.SchoolName,
                            Symbol: $scope.loggedUser.SchoolSymbol,
                            ClubsOnly: true,
                            NoConfirmation: true,
                            ExcludedCategories: existingCategories
                        };
                    },
                    sportField: function () {
                        return null;
                    },
                    allSeasons: function () {
                        return null;
                    },
                    allRegions: function () {
                        return null;
                    },
                    options: function () {
                        return {
                            show_championship_remarks: true
                        };
                    }
                }
            }).result.then(function (data) {
                    var requestParams = {
                        Category: data.Category.CategoryId,
                        Amount: data.Amount
                    };
                    $http.put('/api/school-club/team-order', requestParams).then(function(resp) {
                        ReloadOrdersBasket();
                    }, function(err) {
                        console.log('error posting new order');
                    });
                });
        };

        $scope.coachIdNumberChanged = function(coach) {
            var idNumber = coach.IdNumber ? parseInt(coach.IdNumber) : 0;
            if (!isNaN(idNumber) && idNumber > 0) {
                var matchingCoach = $scope.data.coachesData.findItem(function (x) {
                    return x.Id != coach.Id && x.IdNumber && parseInt(x.IdNumber) == idNumber;
                });
                if (matchingCoach != null) {
                    for (var propertyName in matchingCoach) {
                        if (propertyName != 'Id' && propertyName != 'IdNumber') {
                            var curValue = matchingCoach[propertyName];
                            if (curValue != null && curValue != '')
                                coach[propertyName] = curValue;
                        }
                    }
                }
            }
        };

        $scope.deleteTeamOrder = function(order) {
            var msg = 'האם למחוק הזמנה זו?';
            messageBox.ask(msg).then(function () {
                $http.delete('/api/school-club/team-order?category=' + order.CHAMPIONSHIP_CATEGORY_ID).then(function() {
                    ReloadOrdersBasket();
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת קבוצה, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.editTeamOrder = function(order) {
            var existingCategories = $scope.school.OrdersBasket.map(function(x) {
                return x.CHAMPIONSHIP_CATEGORY_ID;
            });
            var excludedCategories = existingCategories.filter(function(x) {
                return x != order.CHAMPIONSHIP_CATEGORY_ID;
            });
            $uibModal.open({
                templateUrl: 'views/championship-selection.html',
                controller: 'ChampionshipSelectionCtrl',
                resolve: {
                    schoolData: function () {
                        return {
                            Name: $scope.loggedUser.SchoolName,
                            Symbol: $scope.loggedUser.SchoolSymbol,
                            ClubsOnly: true,
                            NoConfirmation: true,
                            ExcludedCategories: excludedCategories
                        };
                    },
                    sportField: function () {
                        return null;
                    },
                    allSeasons: function () {
                        return null;
                    },
                    allRegions: function () {
                        return null;
                    },
                    options: function () {
                        return {
                            category: order.CHAMPIONSHIP_CATEGORY_ID,
                            amount: order.Amount,
                            show_championship_remarks: true
                        };
                    }
                }
            }).result.then(function (data) {
                    var requestParams = {
                        OldCategory: order.CHAMPIONSHIP_CATEGORY_ID,
                        NewCategory: data.Category.CategoryId,
                        Amount: data.Amount
                    };
                    $http.post('/api/school-club/team-order', requestParams).then(function(resp) {
                        ReloadOrdersBasket();
                    }, function(err) {
                        console.log('error updating order');
                        alert('שגיאה בעת עדכון נתוני קבוצה, נא לנסות שוב מאוחר יותר');
                    });
                });
        };

        $scope.saveTab = function(tab, callback) {
            if (typeof tab == 'undefined' || tab == null)
                tab = GetActiveTab();
            if (typeof callback == 'undefined')
                callback = null;
            if (tab == null) {
                console.log('no active tab');
                if (callback != null) {
                    callback();
                }
                return;
            }
            console.log('saving tab ' + tab.Index + '...');
            var arrayOfData = null;
            var dataObject = null;
            var dataCaption = '';
            var excludedProperties = [];
            switch (tab.Index) {
                case 1:
                    dataObject = $scope.school;
                    dataCaption = 'School_Data';
                    excludedProperties.push('OrdersBasket');
                    excludedProperties.push('Cheque');
                    excludedProperties.push('HasConfirmedFacilityTerms');
                    break;
                case 3:
                    dataObject = $scope.school.Cheque;
                    dataCaption = 'School_Cheque';
                    break;
                case 4:
                    arrayOfData = $scope.data.facilitySportFields;
                    dataCaption = 'FacilitySportField';
                    excludedProperties.push('Name');
                    break;
                case 5:
                    arrayOfData = $scope.data.managementBoardMembers;
                    dataCaption = 'ManagementBoardMember';
                    excludedProperties.push('Caption');
                    break;
                case 6:
                    arrayOfData = $scope.data.coachesData;
                    dataCaption = 'Coach';
                    /*
                    arrayOfData = $scope.data.hostingDays;
                    dataCaption = 'HostingDay';
                    excludedProperties.push('SportField');
                    excludedProperties.push('Categories');
                    arrayOfData.forEach(function(hostingDay) {
                        hostingDay.Categories.forEach(function(category) {
                            var prefix = 'Category_' + category.Index;
                            if (category.Name)
                                hostingDay[prefix + '_Name'] = category.Name;
                            if (category.Weekday)
                                hostingDay[prefix + '_Weekday'] = category.Weekday;
                            if (category.HostingHour)
                                hostingDay[prefix + '_HostingHour'] = category.HostingHour;
                        });
                    });
                    */
                    break;
                case 7:

                    break;
            }

            var successCallback = function() {
                if (tab.Index == 4) {
                    SaveDataObject({
                        HasConfirmedFacilityTerms: $scope.school.HasConfirmedFacilityTerms
                    }, 'School_Facility', [], null, null);
                }
                tab.SaveInProgress = false;
                tab.SavedSuccessfully = true;
                tab.IsDirty = false;
                if (callback != null) {
                    callback('success');
                }
                $timeout(function () {
                    tab.SavedSuccessfully = false;
                }, 5000);
            };

            var errorCallback = function() {
                tab.SaveInProgress = false;
                tab.SaveFailed = true;
                if (callback != null) {
                    callback('error');
                }
                $timeout(function () {
                    tab.SaveFailed = false;
                }, 5000);
            };

            if (arrayOfData != null) {
                tab.SaveInProgress = true;
                SaveArrayOfData(arrayOfData, dataCaption, excludedProperties, 0, successCallback, errorCallback);
            } else if (dataObject != null) {
                tab.SaveInProgress = true;
                SaveDataObject(dataObject, dataCaption, excludedProperties, successCallback, errorCallback);
            } else {
                if (callback != null) {
                    callback();
                }
            }
        };

        $scope.saveAndMove = function() {
            var curActiveTab = GetActiveTab();
            if (curActiveTab != null) {
                if (curActiveTab.Index == 6) {
                    if (!$scope.hasConfirmedFinalSubmission) {
                        messageBox.warn('נא לאשר שליחת נתונים ורישום קבוצות', {title: 'הדפסת טופס רישום'});
                    }
                } else {
                    $scope.saveTab(curActiveTab, function () {
                        var nextIndex = curActiveTab.Index + 1;
                        var nextTab = $scope.data.clubFormTabs.findItem(function (x) {
                            return x.Index == nextIndex;
                        });
                        if (nextTab != null) {
                            $scope.tabClicked(nextTab);
                        }
                    });
                }
            }
        };
    }

    function ClubRegisterWelcomeDialogCtrl($scope, $uibModalInstance, $sce, school) {
        $scope.confirm = function () {
            $uibModalInstance.close("OK");
        };
    }
})();

function CheckFinalSubmission() {
    return $("#lblConfirmFinalSubmission").hasClass("fa-check-square-o");
}
(function() {
    'use strict';

    angular
        .module('components')
        .directive('flexItem', ['$timeout', FlexItemDirective])
        .directive('flexSlider', ['$timeout', FlexSliderDirective]);

    function FlexItemDirective($timeout) {
        return {
            link: function (scope, element) {
                var $slider = element.parents('#items-container').first().find('#slider');
                var $carousel = element.parents('#items-container').first().find('#carousel');
                var sliderList =  $slider.find('ul');
                var carouselList =  $carousel.find('ul');
                $timeout(function() {
                    sliderList.append($('<li>' + element.html() + '</li>'));
                    var image = element.find('img.carousel-image');
                    if (image.length == 0) {
                        image = element.find('img');
                    }
                    if (image.length > 0) {
                        carouselList.append($('<li><img src="' + image.attr('src') + '" alt=""></li>'));
                    }
                    else {
                        carouselList.append($('<li><img src="" alt=""></li>'));
                    }

                    // removing jackbox group to prevent showing the same image twice
                    element.find('.jackbox').removeAttr('data-group');

                    var slideCount = sliderList.find('li').length;

                    $carousel.css('display',
                        $carousel.data('flexCarouselHidden') || slideCount <= 1 ? 'none' : 'block'
                    );

                    $slider.removeData("flexslider");
                    $slider.flexslider({
                        animation: "slide",
                        controlNav: false,
                        animationLoop: false,
                        directionNav: slideCount > 1,
                        animationSpeed: 1000,
                        prevText: '',
                        nextText: '',
                        slideshow: false,
                        sync: "#carousel"
                    });
                });
            }
        };
    }

    function FlexSliderDirective($timeout) {
        return {
            template: '<div id="items-container">' +
            '<div id="slider" class="flexslider">' +
            '  <ul class="slides">' +
            '  </ul>' +
            '</div>' +
            '<div id="carousel" class="flexslider">' +
            '  <ul class="slides">' +
            '  </ul>' +
            '</div>' +
            '<div id="items" style="display: none;" ng-transclude>' +
            '</div>' +
            '</div>',
            transclude: true,
            link: function(scope, element, attrs) {
                var $slider = element.find('#slider');
                var $carousel = element.find('#carousel');
                if (attrs.carousel != null && !getBooleanValue(attrs.carousel)) {
                    $carousel.data('flexCarouselHidden', true);
                    $carousel.css('display', 'none');
                }
                $timeout(function () {
                    $carousel.flexslider({
                        animation: "slide",
                        controlNav: false,
                        directionNav: false,
                        animationLoop: false,
                        slideshow: false,
                        prevText:'',
                        nextText:'',
                        itemWidth: 100,
                        asNavFor: '#slider'
                    });

                    $slider.flexslider({
                        animation: "slide",
                        controlNav: false,
                        animationLoop: false,
                        directionNav: false,
                        animationSpeed: 1000,
                        prevText: '',
                        nextText: '',
                        slideshow: false,
                        sync: "#carousel"
                    });
                });
            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('components')
        .directive('owlCarousel', OwlCarouselDirective)
        .directive('owlItem', ['$timeout', OwlItemDirective]);

    var nd = 0;
    function OwlItemDirective($timeout) {
        return {
            link: function (scope, element) {
                $timeout(function() {
                    var $owl = element.parents('#items-container').first().find('.owl-carousel');
                    var e = element.prev();
                    var position = undefined;
                    while (e.length > 0) {
                        var i = e.data('owlPosition');
                        if (i != null) {
                            position = i + 1;
                            break;
                        }
                        e = e.prev();
                    }

                    var max = 0;
                    e = element.next();
                    while (e.length > 0) {
                        var i = e.data('owlPosition');
                        if (i != null) {
                            max = i;
                            if (position === undefined) {
                                position = i;
                            }
                            e.data('owlPosition', i + 1);
                        }
                        e = e.next();
                    }

                    element.data('owlPosition', position || 0);

                    var itemClass = element.find('.owl-video').length > 0
                        ? "item"
                        : "item-video";

                    // Cannot set position out of range in add, if we want to add at the end
                    // position should be 'undefined'
                    $owl.owlCarousel('add', $('<div class="' + itemClass + '">' + element.html() + '</div>'),
                        position > max ? undefined : position);
                    $owl.owlCarousel('refresh');
                });
                element.on('$destroy', function() {
                    var position = element.data('owlPosition');
                    if (position != null) {
                        var $owl = element.parents('#items-container').first().find('.owl-carousel');
                        $owl.owlCarousel('remove', position);
                        $owl.owlCarousel('refresh');
                    }
                });
            }
        };
    }

    function OwlCarouselDirective() {
        return {
            template: '<div id="items-container" class="owl-theme">' +
                '<div class="owl-carousel">' +
                '</div>' +
                '<div id="items" style="display: none;" ng-transclude>' +
                '</div>' +
                '</div>',
            transclude: true,
            link: function(scope, element, attrs) {
                var options = {
                    rtl: attrs.rtl == null ? true : getBooleanValue(attrs.rtl),
                    autoWidth: true,
                    items: attrs.items || 3,
                    navSpeed: attrs.navSpeed || 800,
                    navigation : true,
                    nav: attrs.nav == null ? true : getBooleanValue(attrs.nav),
                    dots: attrs.dots == null ? false : getBooleanValue(attrs.dots),
                    margin: attrs.margin == null ? 12 : attrs.margin,
                    loop: attrs.loop == null ? true : getBooleanValue(attrs.loop),
                    video: attrs.video == null ? true : getBooleanValue(attrs.video),
                    navText: attrs.navText == null ? ['\uf105', '\uf104'] : getBooleanValue(attrs.navText),
                    responsive: {
                        0: {
                            items: attrs.itemsSm || 1
                        },
                        481: {
                            items: attrs.itemsMd || 2
                        },
                        980: {
                            items: attrs.itemsLg || 3
                        }
                    }
                };
                element.find('.owl-carousel').owlCarousel(options);
            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentController',
            ['$scope', '$state', '$http', '$stateParams', '$sce', '$rootScope', '$cookies', '$location', 'ContentService', ContentController]);

    function ContentController($scope, $state, $http, $stateParams, $sce, $rootScope, $cookies, $location, ContentService) {
        var pageSeq = $stateParams.page;
        $scope.pageData = null;
        $scope.loggedInUser = null;
        $scope.pageType = $state.current.data.contentType;
        $scope.pluralCaption = contentUtils.HebrewPageType($scope.pageType, true);
        $scope.singularCaption = contentUtils.HebrewPageType($scope.pageType, false);

        $rootScope.$on('$locationChangeSuccess', function() {
            $rootScope.actualLocation = $location.path();
        });

        $rootScope.$watch(function () {return $location.path()}, function (newLocation, oldLocation) {
            if($rootScope.actualLocation === newLocation) {
                if ($cookies.get('scs_pages.manage') == $state.current.name) {
                    //should be back to manage screen
                    var allCookies = $cookies.getAll();
                    for (var key in allCookies) {
                        if (key.indexOf('scs_') == 0) {
                            $cookies.remove(key);
                        }
                    }
                    $cookies.put('content.controller.abort', '1');
                    $state.go('pages.manage');
                }
                //console.log('Why did you use history back?');
            }
        });

        function HandleSection(section) {
            if (section.Type == 1 || section.Type == 5) {
                section.Attachments = (section.Data || []).slice(0);
                if (section.Type == 5) {
                    section.Attachments = section.Attachments.filter(function (x) {
                        return x.Description && x.Description.length > 0;
                    });
                }
                for (var i = 0; i < section.Attachments.length; i++) {
                    var curAttachment = section.Attachments[i];
                    curAttachment.Index = i;
                    if (curAttachment.DateUploaded)
                        curAttachment.DateUploaded = new Date(curAttachment.DateUploaded);
                    if (section.Type == 5)
                        curAttachment.FileType = contentUtils.ParseFileType(curAttachment.FileName);
                }
            }
            switch (section.Type) {
                case 2:
                    //text
                    section.EncodedData = sportUtils.EncodeHTML(section.Data);
                    break;
                case 3:
                    //video
                    var response = {};
                    if (contentUtils.TryParseVideo(section.Data, response)) {
                        section.VideoUrl = $sce.trustAsResourceUrl(response.embed);
                    } else {
                        section.VideoUrl = '';
                    }
                    break;
                case 6:
                    //contact
                    if (section.Data.AboutMe)
                        section.Data.AboutMe = sportUtils.EncodeHTML(section.Data.AboutMe);
                    break;
            }
        }

        function ReadPageData() {
            window['qL_steps_amount'] = 3;
            ContentService.read(pageSeq).then(function (contentPage) {
                window['qL_step_finished'] = true;

                //type mismatch?
                if (contentPage.Type && contentPage.Type != contentUtils.ParsePageType($scope.pageType)) {
                    if ($cookies.get('edit.controller.abort') == '1') {
                        //abort
                        $cookies.remove('edit.controller.abort');
                        window['qL_Finish_Now'] = true;
                        return;
                    }
                    $state.go(contentUtils.ParsePageType(contentPage.Type), {page: pageSeq});
                    return;
                }

                if (typeof contentPage.Sections == 'undefined' || contentPage.Sections == null) {
                    $state.go('home');
                    return;
                }

                for (var i = 0; i < contentPage.Sections.length; i++) {
                    var curSection = contentPage.Sections[i];
                    HandleSection(curSection);
                    if (curSection.Type == 6) {
                        //merge contacts into groups
                        var firstContactSection = curSection;
                        for (var j = i - 1; j >= 0; j--) {
                            var prevSection = contentPage.Sections[j];
                            if (prevSection.Type == 6)
                                firstContactSection = prevSection;
                        }
                        if (!firstContactSection.Contacts)
                            firstContactSection.Contacts = [];
                        curSection.Data.SectionIndex = curSection.Index;
                        firstContactSection.Contacts.push(curSection.Data);
                    }
                }

                //contact rows
                for (var i = 0; i < contentPage.Sections.length; i++) {
                    var curSection = contentPage.Sections[i];
                    if (curSection.Type == 6 && curSection.Contacts) {
                        curSection.Contacts.sort(function(c1, c2) {
                            return c1.SectionIndex - c2.SectionIndex;
                        });
                        curSection.ContactRows =  sportUtils.SplitArray(curSection.Contacts, 2);

                        //put blank sport fields to make it 6
                        var lastRow = curSection.ContactRows[curSection.ContactRows.length - 1];
                        var blankItemsCount = 2 - lastRow.length;
                        for (var j = 0; j < blankItemsCount; j++) {
                            lastRow.push({'Name': ''});
                        }
                    }
                }

                window['qL_step_finished'] = true;

                if (contentPage.Author) {
                    if (contentPage.Author.AboutMe) {
                        contentPage.Author.AboutMe = sportUtils.EncodeHTML(contentPage.Author.AboutMe);
                    }
                }

                $scope.pageData = contentPage;
                $scope.pageData.Seq = pageSeq;
                //console.log($scope.pageData.Sections);

                $http.get('/api/common/contacts?type=2&apply=pages').then(function(resp) {
                    window['qL_step_finished'] = true;
                    var allContacts = [];
                    for (var i = 0; i < resp.data.length; i++)
                        allContacts.push(resp.data[i]);
                    for (var i = 0; i < contentPage.Sections.length; i++) {
                        var curSection = contentPage.Sections[i];
                        if (curSection.Type == 6 && curSection.ContactRows && curSection.ContactRows.length > 0) {
                            //apply correct page
                            for (var j = 0; j < curSection.ContactRows.length; j++) {
                                var curContactRow = curSection.ContactRows[j];
                                for (var k = 0; k < curContactRow.length; k++) {
                                    var curContactData = curContactRow[k];
                                    if (curContactData.Picture) {
                                        var pictureSeq = curContactData.Picture.Seq;
                                        var matchingItem = allContacts.findItem(function (x) {
                                            return x.PictureSeq == pictureSeq;
                                        });
                                        if (matchingItem != null && matchingItem.PicturePageSeq)
                                            curContactData.Picture.PageSeq = matchingItem.PicturePageSeq;
                                    }
                                }
                            }

                        }
                    }
                    window['qL_Finish_Now'] = true;
                });
                ChainFactory.Next();
            }, function (err) {
                alert('שגיאה בעת טעינת נתונים מהשרת');
                ChainFactory.Next();
            });
        }

        function ReadRecentPages() {
            ContentService.list(null, null).then(function (contentPages) {
                var relevantPages = contentPages.filter(function(x) {
                    return x.Seq != $scope.pageData.Seq && x.SportFieldSeq == $scope.pageData.SportFieldSeq && x.DefaultImageSeq;
                });
                $scope.recentPages = relevantPages.take(2);
                contentUtils.InitCroppedImages($http, function() {
                    for (var i = 0; i < $scope.recentPages.length; i++) {
                        var curPage = $scope.recentPages[i];
                        curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                        curPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(curPage);
                        contentUtils.BuildCroppedImages(curPage);
                    }
                });
                ChainFactory.Next();
            }, function(err) {
                console.log('error reading recent pages');
                console.log(err);
                ChainFactory.Next();
            });
        }

        function ReadGalleryImages() {
            if ($scope.pageType == 'gallery') {
                $scope.pageData.GalleryImages = $scope.pageData.Sections[0].Data.slice(0);
                for (var i = 0; i < $scope.pageData.GalleryImages.length; i++) {
                    var curImage = $scope.pageData.GalleryImages[i];
                    curImage.Index = i;
                }
                $scope.pageData.GalleryImageRows = contentUtils.BuildImageRows($scope.pageData.GalleryImages, 4);
                ChainFactory.Next();
            } else {
                ChainFactory.Next();
            }
        }

        function InitJackbox() {
            // jackbox
            window.setTimeout(function() {
                sportUtils.InitJackbox();
            }, 1000);
            ChainFactory.Next();
        }

        var date = new Date();
        $http.get('/api/common/logged-user?nnn=' + date.getTime()).then(function(resp) {
            $scope.loggedInUser = resp.data;
        }, function(err) {
            console.log('error reading logged in user');
            console.log(err);
        });

        ChainFactory.Execute(ReadPageData, ReadRecentPages, ReadGalleryImages, InitJackbox);

        $scope.croppedContactPicturePath = function(pictureData) {
            var pictureSeq = pictureData.Seq;
            var croppedImage = contentUtils.getCroppedImage(pictureSeq, '1x1');
            if (croppedImage.File.length > 0) {
                return '/content/Cropped/' + pictureSeq + '/' + croppedImage.File;
            } else {
                return '/content/Contacts/' + pictureData.PageSeq + '/' + pictureData.FileName;
            }
        };

        $scope.canEditContent = function() {
            return $scope.loggedInUser != null && ($scope.loggedInUser.Role == 1 || $scope.loggedInUser.Role == 3);
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentEditController',
            ['$scope', '$state', '$stateParams', '$http', '$q', '$filter', '$timeout', '$interval', '$sce', '$cookies', '$rootScope', '$location', '$uibModal', 'messageBox', 'ContentService', 'SportService', ContentEditController]);

    function ContentEditController($scope, $state, $stateParams, $http, $q, $filter, $timeout, $interval, $sce, $cookies, $rootScope, $location, $uibModal,
            messageBox, ContentService, SportService) {
        var allTags = [];
        var allAuthors = [];
        var allSportFields = [];
        var pageSeq = $stateParams.page;
        var sectionUniqueCounter = 0;
        var attachmentSectionsData = {
            MaxImages: 20,
            MaxFiles: 20,
            MaxContacts: 1,
            DropZoneCounter: 0,
            MaxFileSize: 5242880, //5MB
            UploadContactUrl: '/content/Contacts/' + pageSeq,
            UploadImageUrl: '/content/Images/' + pageSeq,
            UploadFileUrl: '/content/Files/' + pageSeq,
            ImagesPerRow: 6,
            ActiveSectionId: '',
            FileSizeMapping: {},
            ImageUploadMapping: {},
            FileUploadMapping: {},
            ContactUploadMapping: {},
            GetAllFiles: function() {
                var fileNames = [];
                for (var i = 0; i < $('.dz-filename').length; i++) {
                    var curElement = $('.dz-filename').eq(i);
                    fileNames.push(curElement.find('span').text());
                }
                return sportUtils.DistinctArray(fileNames);
            }
        };

        $rootScope.$on('$locationChangeSuccess', function() {
            $rootScope.actualLocation = $location.path();
        });

        $rootScope.$watch(function () {return $location.path()}, function (newLocation, oldLocation) {
            /*
            if($rootScope.actualLocation === newLocation) {
                if ($cookies.get('scs_pages.manage') == $state.current.name) {
                    //should be back to manage screen
                    var allCookies = $cookies.getAll();
                    for (var key in allCookies) {
                        if (key.indexOf('scs_') == 0) {
                            $cookies.remove(key);
                        }
                    }
                    $cookies.put('edit.controller.abort', '1');
                    $state.go('pages.manage');
                }
                //console.log('Why did you use history back?');
            }
             */
        });

        contentUtils.InitSportFieldColors($http);

        $scope.pageData = {'Tags': [], 'Sections': [], 'CroppedImages': {}};
        $scope.pageType = $state.current.data.contentType;
        if ($scope.pageType == null || !$scope.pageType)
            $scope.pageType = '';
        $scope.pageTypeHebrew = contentUtils.HebrewPageType($scope.pageType);
        $scope.pageTypeIsHebrewMale = contentUtils.IsHebrewMalePageType($scope.pageType);
        $scope.generalData = {'sportFields': [], 'Tags': [], 'Authors': [], 'Seasons': [], 'Regions': [], 'Contacts': []};
        $scope.selected = {'AuthorName': '', 'AuthorDetails': {'Seq': 0}};
        $scope.sectionTypes = contentUtils.GetSectionTypes();
        $scope.submitting = false;
        $scope.deleting = false;
        $scope.validationErrors = [];
        $scope.Unauthorized = false;
        $scope.flowersFieldSeq = sportGlobalSettings.FlowersFieldSeq;
        var allowedTypeMapping = {
            'article': 'all',
            'event': 'all' //,
            //'gallery': [1, 2]
        };

        function IsTypeAllowed(sectionType) {
            var allowedTypes = allowedTypeMapping[$scope.pageType];
            if (allowedTypes == null || !allowedTypes)
                return false;
            if (allowedTypes == 'all')
                return true;
            return allowedTypes.indexOf(sectionType.Id) >= 0;
        }

        $scope.sectionTypes.forEach(function(curType) {
            curType.Allowed = IsTypeAllowed(curType);
        });

        function AssignDefaultAuthor() {
            var firstAuthor = allAuthors.filter(function(x) { return x.Seq == 1; });
            if (firstAuthor.length > 0)
                $scope.selected.AuthorName = firstAuthor[0].Name;
        }

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3]);
        }

        function ReadAllSports() {
            $scope.generalData.sportFields = [];
            $http.get('/api/common/sports').then(function(resp) {
                allSportFields = resp.data;
                for (var i = 0; i < allSportFields.length; i++) {
                    $scope.generalData.sportFields.push(allSportFields[i]);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading sports: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllTags() {
            $scope.generalData.Tags = [];
            $http.get('/api/common/tags?type=1').then(function(resp) {
                allTags = resp.data;
                for (var i = 0; i < allTags.length; i++) {
                    $scope.generalData.Tags.push(allTags[i]);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading tags: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllCroppedImages() {
            contentUtils.InitCroppedImages($http, function() {
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllAuthors() {
            $scope.generalData.Authors = [];
            $http.get('/api/common/contacts?type=1').then(function(resp) {
                allAuthors = resp.data;
                for (var i = 0; i < allAuthors.length; i++) {
                    var curAuthor = allAuthors[i];
                    if (curAuthor.AboutMe)
                        curAuthor.AboutMe = sportUtils.EncodeHTML(curAuthor.AboutMe);
                    $scope.generalData.Authors.push(curAuthor.Name);
                }
                if (pageSeq == 'new')
                   AssignDefaultAuthor();
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading authors: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadExistingContacts() {
            $scope.generalData.Contacts = [];
            $http.get('/api/common/contacts?type=2&apply=pages').then(function(resp) {
                $scope.generalData.Contacts = [];
                for (var i = 0; i < resp.data.length; i++)
                    $scope.generalData.Contacts.push(resp.data[i]);
                for (var i = 0; i < $scope.generalData.Contacts.length; i++) {
                    var curContact = $scope.generalData.Contacts[i];
                    if (curContact.PictureName && curContact.PicturePageSeq) {
                        curContact.Picture = {
                            'Seq': curContact.PictureSeq,
                            'FileName': curContact.PictureName,
                            'PageSeq': curContact.PicturePageSeq
                        };
                    }
                    curContact.DisplayName = curContact.Name;
                    if (curContact.Role)
                        curContact.DisplayName += ' (' + curContact.Role + ')';
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading contacts: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadSeasons() {
            $scope.generalData.Seasons = [];
            SportService.seasons.inUse().then(function(seasonsInUse) {
                if (seasonsInUse.length > 0) {
                    $scope.generalData.Seasons = seasonsInUse.slice(0);
                    $scope.generalData.Seasons.sort(function (s1, s2) {
                        return s1.Season - s2.Season;
                    });
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error getting seasons');
                console.log(err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadRegions() {
            $scope.generalData.Regions = [];
            $http.get('/api/sportsman/regions').then(function(resp) {
                $scope.generalData.Regions = resp.data.filter(function (x) {
                    return x.REGION_ID > 0;
                });
                $scope.generalData.Regions.forEach(function (region) {
                    region.Id = region.REGION_ID;
                    region.Name = region.REGION_NAME;
                });
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error getting regions');
                console.log(err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function GetDefaultImage(pageData) {
            var allImages = contentUtils.ExtractAllAttachments(pageData);
            var matchingImages = allImages.filter(function(x) {
                return x.IsDefault;
            });
            var defaultImage = matchingImages.length > 0 ? matchingImages[0] : {'Seq': 0, 'FileName': ''};
            if (defaultImage.Seq == 0 && allImages.length > 0) {
                //assign first image as default
                defaultImage = allImages[0];
            }
            return defaultImage;
        }

        function ApplyCroppedImage(pageData, imageSeq, croppedImageType, aspectRatio, thumbnailImage) {
            if (typeof thumbnailImage == 'undefined')
                thumbnailImage = '';
            var fileName = contentUtils.getCroppedImage(imageSeq, aspectRatio).File;
            var croppedImagePath = '';
            if (fileName.length > 0) {
                croppedImagePath = '/content/Cropped/' + imageSeq + '/' + fileName;
            } else {
                if (thumbnailImage && thumbnailImage.length > 0) {
                    croppedImagePath = '/content/Images/' + pageData.Seq + '/' + thumbnailImage;
                }
            }
            if (croppedImagePath.length > 0)
                pageData.CroppedImages[croppedImageType] = croppedImagePath;
        }

        function ApplyCroppedImages(pageData) {
            pageData.CroppedImages = {'Slider': '', 'Homepage': ''};
            var defaultImage = GetDefaultImage(pageData);
            var sliderThumbSeq = pageData.SliderThumbnailSeq || defaultImage.Seq;
            var homepageThumbSeq = pageData.HomepageThumbnailSeq || defaultImage.Seq;
            if (sliderThumbSeq) {
                console.log(sliderThumbSeq);
                ApplyCroppedImage(pageData, sliderThumbSeq, 'Slider', '214x234', pageData.SliderThumbnailImage); //58x39
            }
            if (homepageThumbSeq) {
                ApplyCroppedImage(pageData, homepageThumbSeq, 'Homepage', '383x100', pageData.HomepageThumbnailImage);
            }
        }

        function ReadPageData() {
            function GetCategoriesData() {
                function GetSingleCategory(deferred, championshipCategoriesData, index) {
                    if (!championshipCategoriesData || championshipCategoriesData.length == 0 || index >= championshipCategoriesData.length) {
                        deferred.resolve(championshipCategoriesData);
                        return;
                    }
                    var championshipCategoryData = championshipCategoriesData[index];
                    var categoryId = championshipCategoryData.CategoryId;
                    if (categoryId.indexOf('sf-') == 0) {
                        var activitySeq = categoryId.replace('sf-', '');
                        $http.get('/api/flowers/events?activity=' + activitySeq).then(function (resp) {
                            if (resp.data && resp.data.length > 0) {
                                var sportFlowersChampionship = championshipsUtils.convertSportFlowersChampionships([resp.data[0]], $filter)[0];
                                championshipCategoryData.CategoryId = activitySeq;
                                championshipCategoryData.Championship = sportFlowersChampionship.CHAMPIONSHIP_NAME;
                                championshipCategoryData.Name = sportFlowersChampionship.CATEGORY_NAME;
                                GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                            }
                        }, function(err) {
                            GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                        });
                    } else {
                        $http.get('/api/sportsman/category-data?category=' + categoryId).then(function (resp) {
                            var categorySportFieldId = resp.data.SPORT_ID;
                            if (categorySportFieldId == $scope.selected.sportField.Seq) {
                                var champName = resp.data.CHAMPIONSHIP_NAME;
                                var categoryName = resp.data.CATEGORY_NAME;
                                championshipCategoryData.Championship = champName;
                                championshipCategoryData.Name = categoryName;
                                GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                            } else {
                                GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                            }
                        }, function(err) {
                            GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                        });
                    }
                }
                var deferred = $q.defer();
                //console.log($scope.pageData.ChampionshipCategoryIds);
                if ($scope.pageData.ChampionshipCategoryIds && $scope.pageData.ChampionshipCategoryIds.length > 0  && $scope.selected.sportField) {
                    var championshipCategoriesData = [];
                    $scope.pageData.ChampionshipCategoryIds.forEach(function(categoryId) {
                        championshipCategoriesData.push({
                            CategoryId: categoryId,
                            Championship: '',
                            Name: ''
                        });
                    });
                    GetSingleCategory(deferred, championshipCategoriesData, 0);
                } else {
                    deferred.resolve(null);
                }
                return deferred.promise;
            }



            if (pageSeq != 'new') {
                ContentService.read(pageSeq).then(function (contentPage) {
                    //type mismatch?
                    if (contentPage.Type && contentPage.Type != contentUtils.ParsePageType($scope.pageType)) {
                        $state.go(contentUtils.ParsePageType(contentPage.Type) + '.edit', {page: pageSeq});
                        return;
                    }
                    var sportFieldSeq = contentPage.SportFieldSeq;
                    if (sportFieldSeq) {
                        var matchingSportFields = $scope.generalData.sportFields.filter(function (x) {
                            return x.Seq == sportFieldSeq;
                        });
                        if (matchingSportFields.length > 0)
                            $scope.selected.sportField = matchingSportFields[0];
                    }
                    if (contentPage.Sections && contentPage.Sections.length > 0) {
                        for (var i = 0; i < contentPage.Sections.length; i++) {
                            var curSection = contentPage.Sections[i];
                            HandleSection(contentPage, curSection);
                        }
                    }

                    ApplyCroppedImages(contentPage);

                    //console.log(contentPage.Sections);
                    $scope.pageData = contentPage;
                    if ($scope.pageData.Sections) {
                        for (var i = 0; i < $scope.pageData.Sections.length; i++) {
                            var curSection = $scope.pageData.Sections[i];
                            if (curSection.Index == null)
                                curSection.Index = i;
                            sectionUniqueCounter++;
                            curSection.UniqueId = 'section_' + sectionUniqueCounter;
                            if (curSection.Type == 6 && curSection.Data && curSection.Data.Picture) {
                                //apply correct page
                                var pictureSeq = curSection.Data.Picture.Seq;
                                var matchingItem = $scope.generalData.Contacts.findItem(function(x) {
                                    return x.PictureSeq == pictureSeq;
                                });
                                if (matchingItem != null && matchingItem.PicturePageSeq)
                                    curSection.Data.Picture.PageSeq = matchingItem.PicturePageSeq;
                            }
                        }
                    }
                    if ($scope.pageData.ShowAuthorDetails)
                        $('#chkAuthorDetails').prop('checked', true);
                    if ($scope.pageData.AuthorSeq) {
                        $scope.selected.AuthorName = $scope.pageData.AuthorName;
                    } else {
                        AssignDefaultAuthor();
                    }
                    GetCategoriesData().then(function(categoriesData) {
                        if (categoriesData != null && categoriesData.length > 0) {
                            $scope.pageData.ChampionshipCategories = categoriesData;
                        }
                        $http.get('/api/pages/region-pages').then(function(resp) {
                            var regionPages = resp.data.slice(0);
                            var matchingItem = regionPages.findItem(function(x) {
                                return x.ContentPageSeq == $scope.pageData.Seq;
                            });
                            if (matchingItem != null) {
                                var regionID = matchingItem.REGION_ID;
                                $scope.pageData.OriginalRegion = regionID;
                                $scope.pageData.Region = regionID;
                                $scope.selected.region = $scope.generalData.Regions.findItem(function(x) {
                                    return x.REGION_ID == regionID;
                                });
                            }
                        });
                    });
                    window['qL_Finish_Now'] = true;
                    ChainFactory.Next();
                }, function() {
                    window['qL_Finish_Now'] = true;
                    alert('שגיאה בעת טעינת נתונים');
                    ChainFactory.Next();
                });
            } else {
                //$scope.pageData.ShowAuthorDetails = true;
                //$('#chkAuthorDetails').prop('checked', true);
                window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            }
        }

        function HandleSection(contentPage, section) {
            var defaultImageSeq = contentPage.DefaultImageSeq;
            section.HebrewType = contentUtils.HebrewSectionType(section.Type);
            section.Title = contentUtils.HebrewSectionTitle(section.Type);
            if (section.Type == 1 || section.Type == 5 || section.Type == 6) {
                //images, files, or contact
                if (section.Data) {
                    if (section.Type == 6) {
                        if (section.Data.Picture) {
                            if (section.Data.Picture.DateUploaded)
                                section.Data.Picture.DateUploaded = new Date(section.Data.Picture.DateUploaded);
                            section.Data.Picture.PageSeq = pageSeq;
                        }
                    } else {
                        section.Attachments = section.Data.slice(0);
                        for (var i = 0; i < section.Attachments.length; i++) {
                            var curAttachment = section.Attachments[i];
                            curAttachment.Index = i;
                            if (curAttachment.DateUploaded)
                                curAttachment.DateUploaded = new Date(curAttachment.DateUploaded);
                            if (section.Type == 1)
                                curAttachment.IsDefault = (!defaultImageSeq && $scope.pageType == 'gallery' && i == 0) || (curAttachment.Seq == defaultImageSeq);
                        }
                        if (section.Type == 1)
                            section.ImageRows = contentUtils.BuildImageRows(section.Attachments, attachmentSectionsData.ImagesPerRow);
                    }
                }
            }
        }

        function GetSelectedAuthor() {
            var selectedAuthor = $.trim($scope.selected.AuthorName).toLowerCase();
            var matchingAuthors = allAuthors.filter(function(x) { return x.Name.toLowerCase() == selectedAuthor; });
            if (matchingAuthors.length > 0) {
                return matchingAuthors[0];
            } else {
                return {
                    'Seq': 0,
                    'Name': selectedAuthor
                };
            }
        }

        ChainFactory.Execute(VerifyUser, ReadAllSports, ReadAllTags, ReadAllCroppedImages, ReadAllAuthors, ReadExistingContacts, ReadSeasons, ReadRegions, ReadPageData);

        window['qL_steps_amount'] = 8;

        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;

        $scope.allowedSectionTypeCount = function() {
            return $scope.sectionTypes.map(function(x) { return x.Allowed ? 1 : 0; }).reduce(function(a, b) { return a + b; });
        };

        $scope.gotCroppedContactPicture = function(pictureSeq) {
            var croppedImage = contentUtils.getCroppedImage(pictureSeq, '1x1');
            return croppedImage.File.length > 0;
        };

        $scope.croppedContactPicturePath = function(pictureData) {
            var pictureSeq = pictureData.Seq;
            var croppedImage = contentUtils.getCroppedImage(pictureSeq, '1x1');
            if (croppedImage.File.length > 0) {
                return '/content/Cropped/' + pictureSeq + '/' + croppedImage.File;
            } else {
                return '/content/Contacts/' + pictureData.PageSeq + '/' + pictureData.FileName;
            }
        };

        $scope.canApplyChampionships = function() {
            if ($scope.selected.sportField) {
                var sportFieldSeq = $scope.selected.sportField.Seq;
                //sportFieldSeq != sportGlobalSettings.FlowersFieldSeq &&
                return sportFieldSeq != sportGlobalSettings.GeneralSportFieldSeq &&
                    sportFieldSeq != sportGlobalSettings.YoungSportsmenSeq;
            }
            return false;
        };

        $scope.getApplyChampionshipText = function() {
            if ($scope.selected.sportField && $scope.selected.sportField.Seq == $scope.flowersFieldSeq) {
                return 'הוספת אירוע משוייך';
            } else {
                return 'הוספת אליפות משוייכת';
            }
        };

        $scope.getSportFieldFilterStyle = function(sportField) {
            sportField.Selected = true;
            var bgColor = contentUtils.getSportFieldColor(sportField.Seq);
            var style = sportUtils.getRoundedRectangleStyle(sportField, bgColor);
            if (style.length > 0)
                style += '; ';
            style += 'margin-bottom: 5px; position: relative;';
            return style;
        };

        //handle video
        if ($scope.pageType != 'gallery') {
            $interval(function() {
                contentUtils.ApplyVideoData($scope.pageData.Sections, $sce);
            }, 1000);
        }

        //handle author details
        if ($scope.pageType == 'article') {
            $interval(function() {
                $scope.pageData.ShowAuthorDetails = ($('#chkAuthorDetails').prop('checked') == true) ? 1 : 0;
                $scope.selected.AuthorDetails = GetSelectedAuthor();
            }, 500);
        }

        /*
        $("#page-dropzone").sortable({
            items:'.dz-complete',
            cursor: 'move',
            opacity: 0.5,
            containment: '#page-dropzone',
            distance: 20,
            tolerance: 'pointer'
        });
        */

        function RemoveAllDropZoneFiles() {
            var ids = [];
            $('.dropzone').each(function() {
                var currentElement = $(this);
                var currentId = currentElement.attr('id');
                if (!currentId) {
                    attachmentSectionsData.DropZoneCounter++;
                    currentId = 'dropzone_' + attachmentSectionsData.DropZoneCounter;
                    currentElement.attr('id', currentId);
                }
                ids.push(currentId);
            });
            for (var i = 0; i < ids.length; i++) {
                Dropzone.forElement("#" + ids[i]).removeAllFiles(true);
            }
        }

        function ApplyAttachmentIndices(section) {
            switch (section.Type) {
                case 1:
                    section.ImageRows = contentUtils.BuildImageRows(section.Attachments, attachmentSectionsData.ImagesPerRow);
                    break;
                case 5:
                    section.Attachments.sort(function (a1, a2) {
                        return a1.Index - a2.Index;
                    });
                    break;
            }
        }

        function ChangeSectionIndex(section, diff) {
            var newIndex = section.Index + diff;
            if (newIndex >= 0 && newIndex  < $scope.pageData.Sections.length) {
                var matchingSections = $scope.pageData.Sections.filter(function(x) {
                    return x.Index == newIndex;
                });
                if (matchingSections.length > 0)
                    matchingSections[0].Index = section.Index;
                section.Index = newIndex;
            }
        }

        function openCropDialog(imageData, existingImages, sourceDir, pageSeq, ratioWidth, ratioHeight, title, fixedSize, callback) {
            if (imageData && imageData.Seq) {
                var aspectRatio = ratioWidth + 'x' + ratioHeight;
                var cropData = null;
                var rawData = contentUtils.getCroppedImage(imageData.Seq, aspectRatio).Data;
                if (rawData && rawData.length > 0) {
                    var parts = rawData.split(',');
                    if (parts.length > 3) {
                        cropData = {
                            X: parseInt(parts[0]),
                            Y: parseInt(parts[1]),
                            Width: parseInt(parts[2]),
                            Height: parseInt(parts[3])
                        };
                    }
                }
                $uibModal.open({
                    templateUrl: 'views/image-cropper.html',
                    controller: 'ImageCropperCtrl',
                    resolve: {
                        title: function () {
                            return title;
                        },
                        pageSeq: function () {
                            return pageSeq;
                        },
                        sourceDirectory: function() {
                            return sourceDir;
                        },
                        imageData: function () {
                            return imageData;
                        },
                        ratio: function () {
                            return {
                                Width: ratioWidth,
                                Height: ratioHeight
                            };
                        },
                        canvas: function () {
                            if (fixedSize > 0) {
                                return {
                                    Width: fixedSize,
                                    Height: fixedSize
                                };
                            } else {
                                return {
                                    Width: ratioWidth * 5,
                                    Height: ratioHeight * 5
                                };
                            }
                        },
                        metaData: function() {
                            return cropData;

                        },
                        existingImages: function() {
                            return existingImages;
                        }
                    }
                }).result.then(function (resp) {
                        if (resp.ChangeCroppedImage) {
                            if (callback) {
                                callback(resp.ChangeCroppedImage);
                            }
                        } else {
                            var croppedImageName = resp.ImageName;
                            var fileName = croppedImageName.split('/').slice(-1);
                            var metaData = [resp.X, resp.Y, resp.Width, resp.Height].join(',');
                            contentUtils.setCroppedImage(imageData.Seq, ratioWidth + 'x' + ratioHeight, fileName, metaData);
                            if (callback) {
                                callback(imageData);
                            }
                        }
                    });
            } else {
                console.log('no image to crop');
            }
        };

        function GetUploadMapping(sectionType) {
            switch (sectionType) {
                case 1:
                    return attachmentSectionsData.ImageUploadMapping;
                case 5:
                    return attachmentSectionsData.FileUploadMapping;
                case 6:
                    return attachmentSectionsData.ContactUploadMapping;
            }
            return {};
        }

        function HandleImageUpload(dropZone, file) {
            function ValidateAttachment(sectionType) {
                switch (sectionType) {
                    case 1:
                        if (dropZone.files.length > attachmentSectionsData.MaxImages)
                            return 'ניתן להעלות עד ' + attachmentSectionsData.MaxImages + ' תמונות בלבד';
                        break;
                    case 5:
                        if (dropZone.files.length > attachmentSectionsData.MaxFiles)
                            return 'ניתן להעלות עד ' + attachmentSectionsData.MaxFiles + ' קבצים בלבד';
                        break;
                    case 6:
                        if (dropZone.files.length > 1)
                            return 'ניתן להעלות תמונה אחת בלבד';
                        break;
                }

                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var isImage = (isEmpty) ? false : fileType.split('/')[0].toLowerCase() == 'image';
                //var isPDF = (isEmpty) ? false : fileType.split('/')[1].toLowerCase() == 'pdf';
                if ((sectionType == 1 || sectionType == 6) && !isImage)
                    return 'ניתן להעלות קובץ תמונה בלבד';

                if (file.size > attachmentSectionsData.MaxFileSize)
                    return 'גודל קובץ מקסימלי הוא ' + (attachmentSectionsData.MaxFileSize / (1024 * 1024)).toFixed(1) + ' מגהבייט';

                return '';
            }

            function GetErrorMessage() {
                var sectionType = 1;
                var matchingSection = $scope.pageData.Sections.findItem(function (x) {
                    return x.UniqueId == attachmentSectionsData.ActiveSectionId;
                });
                if (matchingSection != null)
                    sectionType = matchingSection.Type;

                //check existing images or files
                var allAttachments = contentUtils.ExtractAllAttachments($scope.pageData);
                var existingAttachments = allAttachments.filter(function (x) {
                    return x.SectionType == sectionType && x.FileName.toLowerCase() == file.name.toLowerCase();
                });
                if (existingAttachments.length > 0) {
                    var existingAttachment = existingAttachments[0];
                    dropZone.cancelUpload(file);
                    return (sectionType == 1 || sectionType == 6) ?
                        'תמונה בעלת שם זהה כבר קיימת במקטע מספר ' + (existingAttachment.SectionIndex + 1) + ' (אינדקס תמונה ' + (existingAttachment.Index + 1) + ')' :
                        'קובץ בעל שם זהה כבר קיים במקטע מספר ' + (existingAttachment.SectionIndex + 1) + ' (אינדקס קובץ ' + (existingAttachment.Index + 1) + ')';
                }

                //check uploaded images
                var fileNames = attachmentSectionsData.GetAllFiles();
                var uploadMapping = GetUploadMapping(sectionType);
                var matchingNames = fileNames.filter(function (x) {
                    return uploadMapping[x] != attachmentSectionsData.ActiveSectionId && x.toLowerCase() == file.name.toLowerCase();
                });
                if (matchingNames.length > 0) {
                    var firstMatch = matchingNames[0];
                    var matchingSectionId = uploadMapping[firstMatch];
                    matchingSection = $scope.pageData.Sections.findItem(function (x) {
                        return x.UniqueId == matchingSectionId;
                    });
                    if (matchingSection != null) {
                        return (sectionType == 1) ?
                            'תמונה בעלת שם זהה כבר הועלתה למקטע מספר ' + (matchingSection.Index + 1) :
                            'קובץ בעל שם זהה כבר הועלה למקטע מספר ' + (matchingSection.Index + 1);
                    }
                }

                return ValidateAttachment(sectionType);
            }

            function ApplyUploadError(sectionId, errorMsg) {
                var matchingSections = $scope.pageData.Sections.filter(function (x) {
                    return x.UniqueId == sectionId;
                });
                if (matchingSections.length == 0)
                    matchingSections = $scope.pageData.Sections.slice(0);
                for (var i = 0; i < matchingSections.length; i++)
                    matchingSections[i].attachmentUploadError = errorMsg;
            }

            var errorMsg = GetErrorMessage();
            if (errorMsg.length > 0) {
                $scope.$apply(function () {
                    ApplyUploadError(attachmentSectionsData.ActiveSectionId, errorMsg);
                });
                window.setTimeout(function () {
                    dropZone.removeFile(file);
                }, 200);
                $timeout(function () {
                    ApplyUploadError(attachmentSectionsData.ActiveSectionId, '');
                }, 5000);
                return false;
            }

            //remove files with same name:
            var nameMapping = {};
            for (var i = 0; i < dropZone.files.length - 1; i++) {
                var curFile = dropZone.files[i];
                var curName = curFile.name.toLowerCase();
                if (nameMapping[curName]) {
                    console.log('removing file with same name: ' + curFile.name);
                    dropZone.removeFile(curFile);
                }
                nameMapping[curName] = true;
            }

            return true;
        }

        $scope.dropzoneContactsConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': attachmentSectionsData.MaxContacts,
                'url': attachmentSectionsData.UploadContactUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן תמונה, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת תמונה',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    attachmentSectionsData.ActiveSectionId = $(this.element).parents('.content-section').first().data('uniqueid');
                    if (HandleImageUpload(this, file)) {
                        attachmentSectionsData.FileSizeMapping[file.name] = file.size;
                        attachmentSectionsData.ContactUploadMapping[file.name] = attachmentSectionsData.ActiveSectionId;
                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        $scope.dropzoneImagesConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': attachmentSectionsData.MaxImages,
                'url': attachmentSectionsData.UploadImageUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן תמונה, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת תמונה',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true //,
                //'acceptedFiles': 'image/*'
            },
            'eventHandlers': {
                'sending': function (file, xhr, formData) {

                },
                'success': function (file, response) {
                    attachmentSectionsData.ActiveSectionId = $(this.element).parents('.content-section').first().data('uniqueid');
                    if (HandleImageUpload(this, file)) {
                        attachmentSectionsData.FileSizeMapping[file.name] = file.size;
                        attachmentSectionsData.ImageUploadMapping[file.name] = attachmentSectionsData.ActiveSectionId;
                    }
                },
                'removedfile': function(file) {

                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
            //'existingFiles': ReadPageImages
        };

        $scope.dropzoneFilesConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': attachmentSectionsData.MaxFiles,
                'url': attachmentSectionsData.UploadFileUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן קובץ, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת קובץ',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    attachmentSectionsData.ActiveSectionId = $(this.element).parents('.content-section').first().data('uniqueid');
                    if (HandleImageUpload(this, file)) {
                        attachmentSectionsData.FileSizeMapping[file.name] = file.size;
                        attachmentSectionsData.FileUploadMapping[file.name] = attachmentSectionsData.ActiveSectionId;
                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        var authorPromise = null;
        $scope.getAuthors = function(userInput) {
            var allAuthors = $scope.generalData.Authors.slice();
            if (userInput && userInput.length > 0 && allAuthors.filter(function(x) { return x.toLowerCase() == userInput.toLowerCase(); }).length == 0) {
                allAuthors.unshift(userInput);
                if (authorPromise)
                    $timeout.cancel(authorPromise);
                authorPromise = $timeout(function() {
                    $scope.generalData.Authors.push(userInput);
                }, 1500);
            }
            return allAuthors;
        }

        $scope.OpenCropDialog = function(thumbnailType) {
            var thumbTypeData = contentUtils.GetThumbnailType(thumbnailType);
            var ratioWidth = thumbTypeData.RatioWidth;
            var ratioHeight = thumbTypeData.RatioHeight;
            var title = thumbTypeData.Title;
            var thumbnailImageData = {
                Seq: 0,
                FileName: ''
            };
            switch (thumbnailType) {
                case 1:
                    thumbnailImageData.Seq = $scope.pageData.SliderThumbnailSeq;
                    thumbnailImageData.FileName = $scope.pageData.SliderThumbnailImage;
                    break;
                case 2:
                    thumbnailImageData.Seq = $scope.pageData.HomepageThumbnailSeq;
                    thumbnailImageData.FileName = $scope.pageData.HomepageThumbnailImage;
                    break;
            }
            if (!thumbnailImageData.Seq)
                thumbnailImageData = GetDefaultImage($scope.pageData);
            var existingImages = contentUtils.ExtractAllAttachments($scope.pageData).filter(function(x) {
                return x.SectionType == 1;
            }).map(function(x) {
                return {
                    'FileName': x.FileName,
                    'Seq': x.Seq
                }
            });
            if ($scope.pageData.SliderThumbnailSeq) {
                if (existingImages.findItem(function(x) { return x.FileName == $scope.pageData.SliderThumbnailImage; }) == null) {
                    existingImages.push({'FileName': $scope.pageData.SliderThumbnailImage, 'Seq': $scope.pageData.SliderThumbnailSeq});
                }
            }
            if ($scope.pageData.HomepageThumbnailSeq) {
                if (existingImages.findItem(function(x) { return x.FileName == $scope.pageData.HomepageThumbnailImage; }) == null) {
                    existingImages.push({'FileName': $scope.pageData.HomepageThumbnailImage, 'Seq': $scope.pageData.HomepageThumbnailSeq});
                }
            }
            openCropDialog(thumbnailImageData, existingImages, null, $scope.pageData.Seq, ratioWidth, ratioHeight, title, 0, function(changeCroppedImage) {
                if (changeCroppedImage) {
                    var url = '/api/pages/' + pageSeq + '/thumbnail';
                    $http.post(url, {
                        ThumbnailType: thumbnailType,
                        ThumbnailSeq: changeCroppedImage.Seq || 0,
                        FileName: changeCroppedImage.FileName,
                        FileSize: changeCroppedImage.FileSize
                    }).then(function(resp) {
                        var thumbnailImageSeq = resp.data.Seq;
                        var thumbnailImageName = changeCroppedImage.FileName;
                        switch (thumbnailType) {
                            case 1:
                                $scope.pageData.SliderThumbnailSeq = thumbnailImageSeq;
                                $scope.pageData.SliderThumbnailImage = thumbnailImageName;
                                break;
                            case 2:
                                $scope.pageData.HomepageThumbnailSeq = thumbnailImageSeq;
                                $scope.pageData.HomepageThumbnailImage = thumbnailImageName;
                                break;
                        }
                        ApplyCroppedImages($scope.pageData);
                        $scope.OpenCropDialog(thumbnailType);

                    }, function(err) {
                        console.log('error setting thumbnail image');
                        console.log(err);
                    });
                } else {
                    ApplyCroppedImages($scope.pageData);
                    var cacheBuster = (new Date()).getTime();
                    $('#imgCroppedHomepage').attr('src', $('#imgCroppedHomepage').attr('src') + '?nnn=' + cacheBuster);
                    $('#imgCroppedSlider').attr('src', $('#imgCroppedSlider').attr('src') + '?nnn=' + cacheBuster);
                }
            });
        };

        $scope.CropContactPicture = function(contact) {
            var contactPicture = contact.Picture;
            if (!contactPicture || !contactPicture.Seq)
                return;

            var imageData = {
                'Seq': contactPicture.Seq,
                'FileName': contactPicture.FileName
            };
            openCropDialog(imageData, null, 'Contacts', contactPicture.PageSeq, 1, 1, contact.Name, 120, function() {
                var cacheBuster = (new Date()).getTime();
                $('.contact-picture').each(function() {
                    var img = $(this);
                    img.attr('src', img.attr('src') + '?nnn=' + cacheBuster);
                });
            });
        };

        $scope.loadTags = function(query) {
            var deferred = $q.defer();
            var arrExactMatches = allTags.filter(function(x) { return x.Name == query; });
            var arrGotMatch = allTags.filter(function(x) { return x.Name.indexOf(query) >= 0; });
            var arrNoMatch = allTags.filter(function(x) { return x.Name.indexOf(query) < 0; });
            var exactMatch = arrExactMatches.length > 0 ? arrExactMatches[0] : {'Seq': -1, 'Name': query, 'Temporary': true};
            arrGotMatch.sort(function(t1, t2) {
                return t1.Name.indexOf(query) - t2.Name.indexOf(query);
            });
            arrNoMatch.sort(function(t1, t2) {
                return t2.Name.compareTo(t1.Name);
            });
            var autoCompleteTags = [exactMatch];
            for (var i = 0; i < arrGotMatch.length; i++) {
                var currentTag = arrGotMatch[i];
                if (currentTag.Name != query)
                    autoCompleteTags.push(currentTag);
            }
            for (var i = 0; i < arrNoMatch.length; i++)
                autoCompleteTags.push(arrNoMatch[i]);
            deferred.resolve(autoCompleteTags);
            return deferred.promise;
        };

        $scope.assignChampionship = function(championshipCategory) {
            if (typeof championshipCategory == 'undefined')
                championshipCategory = null;
            if ($scope.selected.sportField) {
                var selectedCategory = championshipCategory != null ? championshipCategory.CategoryId : 0;
                var eventName = championshipCategory != null ? championshipCategory.Championship : '';
                $uibModal.open({
                    templateUrl: 'views/championship-selection.html',
                    controller: 'ChampionshipSelectionCtrl',
                    resolve: {
                        sportField: function () {
                            return $scope.selected.sportField;
                        },
                        allSeasons: function () {
                            return $scope.generalData.Seasons;
                        },
                        allRegions: function () {
                            return $scope.generalData.Regions;
                        },
                        schoolData: function() {
                            return null;
                        },
                        options: function () {
                            return {
                                category: selectedCategory,
                                EventName: eventName
                            };
                        }
                    }
                }).result.then(function (selectedChampCategory) {
                        if (!$scope.pageData.ChampionshipCategories)
                            $scope.pageData.ChampionshipCategories = [];
                        $scope.pageData.ChampionshipCategories.push(selectedChampCategory);
                    });
            }
        };

        $scope.removeChampionship = function(championshipCategory) {
            $scope.pageData.ChampionshipCategories = $scope.pageData.ChampionshipCategories.filter(function(x) {
                return x.CategoryId != championshipCategory.CategoryId;
            });
        };

        $scope.GetLinkTooltip = function(imageCell) {
            var tooltip = 'הגדרת קישור. מצב קיים: ';
            var existingAction = 'פתיחה בגלריה';
            if (imageCell.CustomLink != null) {
                switch (imageCell.CustomLink.Type) {
                    case 1:
                        existingAction = 'קישור חיצוני';
                        break;
                    case 2:
                        existingAction = 'קישור לקובץ';
                        break;
                }
            }
            tooltip += existingAction;
            return tooltip;
        };

        $scope.GetLinkStyle = function(imageCell) {
            var styles = ['cursor: pointer;'];
            var color = '';
            if (imageCell.CustomLink) {
                switch (imageCell.CustomLink.Type) {
                    case 1:
                        color = '#197bbe';
                        break;
                    case 2:
                        color = '#ec2913';
                        break;
                }
            }
            if (color.length > 0)
                styles.push('color: ' + color + ';');
            return styles.join(' ');
        };

        $scope.OpenLinkSelection = function(section, imageCell) {
            function BuildCustomLink(dialogResult) {
                var linkType = dialogResult ? dialogResult.Type : 0;
                switch (linkType) {
                    case 1:
                        return {
                            'Type': linkType,
                            'ExternalUrl': dialogResult.ExternalUrl
                        };
                    case 2:
                        return {
                            'Type': linkType,
                            'FileName': dialogResult.FileName
                        };
                }
                return null;
            }

            $uibModal.open({
                templateUrl: 'views/image-link-selection.html',
                controller: 'ImageLinkSelectionCtrl',
                resolve: {
                    pageSeq: function () {
                        return pageSeq;
                    },
                    imageSeq: function () {
                        return imageCell.Seq;
                    },
                    imageFileName: function () {
                        return imageCell.FileName;
                    },
                    options: function () {
                        return {};
                    },
                    existingLink: function () {
                        return imageCell.CustomLink;
                    }
                }
            }).result.then(function (selection) {
                imageCell.CustomLink = BuildCustomLink(selection);
            });
        };

        $scope.clearChampionships = function() {
            $scope.pageData.ChampionshipCategories = [];
        };

        $scope.clearRegion = function() {
            $scope.pageData.Region = null;
            $scope.selected.region = null;
        };

        $scope.removeContactPicture = function(section) {
            section.Data.Picture = null;
        };

        $scope.applyExistingContact = function(section) {
            section.Data = section.selectedContact;
        };

        $scope.clearSelectedContact = function(section) {
            section.selectedContact = null;
            $scope.applyExistingContact(section);
        };

        $scope.changeIndex = function(section, attachment, diff) {
            var oldIndex = attachment.Index, newIndex = attachment.Index + diff;
            if (newIndex >= section.Attachments.length || newIndex < 0)
                return;

            var existingCells = section.Attachments.filter(function(x) { return x.Index == newIndex; });
            if (existingCells.length > 0)
                existingCells[0].Index = oldIndex;
            attachment.Index = newIndex;
            ApplyAttachmentIndices(section);
        };

        $scope.MakeDefaultImage = function(section, imageCell) {
            var attachmentSeq = imageCell.Seq;
            var allImageSections = $scope.pageData.Sections.filter(function(x) { return x.Type == 1 && x.Attachments; });
            for (var i = 0; i < allImageSections.length; i++) {
                var curSection = allImageSections[i];
                for (var j = 0; j < curSection.Attachments.length; j++) {
                    var curImage = curSection.Attachments[j];
                    curImage.IsDefault = (curImage.Seq == attachmentSeq);
                }
            }
            ApplyCroppedImages($scope.pageData);
        };

        $scope.deleteAttachment = function(section, attachment) {
            var msg = '';
            switch (section.Type) {
                case 1:
                case 6:
                    msg = 'האם להסיר תמונה זו?';
                    break;
                case 5:
                    msg = 'האם להסיר קובץ זה?';
                    break;
            }
            if (msg.length > 0) {
                messageBox.ask(msg).then(function () {
                    if (section.Type == 6) {
                        //contact
                        section.Attachments = [];
                        section.Data.Picture = null;
                    } else {
                        section.Attachments = section.Attachments.filter(function (curAttachment) {
                            return curAttachment.Seq != attachment.Seq;
                        });
                        for (var i = 0; i < section.Attachments.length; i++) {
                            section.Attachments[i].Index = i;
                        }
                        ApplyAttachmentIndices(section);
                    }
                });
            }
        };

        $scope.AddSection = function(sectionType) {
            if (!$scope.pageData.Sections)
                $scope.pageData.Sections = [];
            var sectionIndex = $scope.pageData.Sections.length;
            sectionUniqueCounter++;
            $scope.pageData.Sections.push({
                'Type': sectionType,
                'Index': sectionIndex,
                'HebrewType': contentUtils.HebrewSectionType(sectionType),
                'Title': contentUtils.HebrewSectionTitle(sectionType),
                'UniqueId': 'section_' + sectionUniqueCounter
            });
        };

        $scope.MoveSectionDown = function(section) {
            ChangeSectionIndex(section, 1);
        };

        $scope.MoveSectionUp = function(section) {
            ChangeSectionIndex(section, -1);
        };

        $scope.DeleteSection = function(section) {
            function deleteSection() {
                $scope.pageData.Sections = $scope.pageData.Sections.filter(function(x) {
                    return x.Index != section.Index;
                });
                contentUtils.RearrangeSections($scope.pageData);

            }

            //need to ask only when there is data or images
            var needToConfirm = $.trim(section.Data || '').length > 0;
            if (!needToConfirm) {
                if (section.Type == 1) {
                    for (var key in attachmentSectionsData.ImageUploadMapping) {
                        if (attachmentSectionsData.ImageUploadMapping[key] == section.UniqueId) {
                            needToConfirm = true;
                            break;
                        }
                    }
                } else if (section.Type == 5) {
                    for (var key in attachmentSectionsData.FileUploadMapping) {
                        if (attachmentSectionsData.FileUploadMapping[key] == section.UniqueId) {
                            needToConfirm = true;
                            break;
                        }
                    }
                }  else if (section.Type == 6) {
                    for (var key in attachmentSectionsData.ContactUploadMapping) {
                        if (attachmentSectionsData.ContactUploadMapping[key] == section.UniqueId) {
                            needToConfirm = true;
                            break;
                        }
                    }
                }
            }
            if (needToConfirm) {
                var msg = 'האם להסיר את מקטע מספר ' + (section.Index + 1) + ' מה' + $scope.pageTypeHebrew + '?';
                messageBox.ask(msg).then(function () {
                    deleteSection();
                });
            } else {
                deleteSection();
            }
        };

        //apply default sections
        if (pageSeq == 'new') {
            $scope.pageData.Date = new Date();
            if (!$scope.pageData.Sections)
                $scope.pageData.Sections = [];
            switch ($scope.pageType) {
                case 'gallery':
                    $scope.AddSection(1);
                    break;
                case 'article':
                    $scope.AddSection(2);
                    break;
                case 'video':
                    $scope.AddSection(3);
                    break;
                case 'files':
                    $scope.AddSection(2);
                    $scope.AddSection(5);
                    break;
            }
        }

        $scope.buildImageCellClass = function(imageData) {
            //col-md-4 col-md-offset-4
            var className = 'col-md-' + imageData.ColWidth;
            if (imageData.ColOffset)
                className += ' col-md-offset-' + imageData.ColOffset;
            return className;
        };

        $scope.Delete = function() {
            var msg = 'האם למחוק ' + $scope.pageTypeHebrew + ' זו מהמערכת?'
            messageBox.ask(msg).then(function () {
                ContentService.delete(pageSeq).then(function(resp) {
                    $state.go('home');
                }, function(err) {
                    alert('שגיאה בעת מחיקה, אנא נסו שוב מאוחר יותר');
                });
            });
        };

        $scope.Submit = function() {
            function GetValidationErrors() {
                function MissingDataError(section, moreThanOne, isEmpty) {
                    var msg = 'יש להזין ';
                    switch (section.Type) {
                        case 1:
                            msg = 'יש להעלות לפחות תמונה אחת';
                            break;
                        case 2:
                            msg += 'טקסט';
                            break;
                        case 3:
                            msg += 'כתובת URL';
                            if (!isEmpty)
                                msg += ' חוקית ';
                            break;
                        case 5:
                            msg = 'יש להעלות לפחות קובץ אחד';
                            break;
                        case 6:
                            msg += ' שם איש קשר';
                            break;
                    }
                    if (moreThanOne)
                        msg += ' במקטע מספר ' + (section.Index + 1);
                    return msg;
                }
                var errors = [];
                var description = $.trim($scope.pageData.Description);
                var sportFieldName = ($scope.selected.sportField) ? $scope.selected.sportField.Name : '';
                var dateTimestamp = Date.parse($scope.pageData.Date);
                var tags = $scope.pageData.Tags || [];
                if (description.length == 0)
                    errors.push({Message: 'תיאור ' + $scope.pageTypeHebrew + ' חסר'});
                if (sportFieldName.length == 0)
                    errors.push({Message: 'יש לבחור ענף ספורט'});
                if (isNaN(dateTimestamp) || (new Date(dateTimestamp)).getFullYear() < 1900)
                    errors.push({Message: 'תאריך חסר או שגוי'});
                if (tags.length == 0)
                    errors.push({Message: 'יש להזין לפחות תגית אחת'});
                if ($scope.pageData.Sections) {
                    $scope.pageData.Sections = $scope.pageData.Sections.filter(function(x) {
                        return (x.SectionType || x.Type) > 0;
                    });
                    var moreThanOne = $scope.pageData.Sections.length > 1;
                    for (var i = 0; i < $scope.pageData.Sections.length; i++) {
                        var curSection = $scope.pageData.Sections[i];
                        if (!contentUtils.GotValidData(curSection)) {
                            var errorMsg = MissingDataError(curSection, moreThanOne, (!curSection.Data || curSection.Data.length == 0));
                            errors.push({Message: errorMsg});
                        }
                    }
                }
                if ($scope.pageData.Seq && $scope.pageType != 'files' && $scope.pageData.DefaultImageSeq) {
                    //got images?
                    var allImages = contentUtils.ExtractAllAttachments($scope.pageData).filter(function(x) {
                        return x.SectionType == 1;
                    });
                    if (allImages.length > 0 && sportUtils.isNullOrEmpty($scope.pageData.CroppedImages.Slider)) {
                        errors.push({Message: 'יש להגדיר תמונת סליידר ממוזערת'});
                    }
                }
                return errors;
            }

            function SubmitError(err) {
                $scope.submitting = false;
                $scope.submitError = 'שגיאה בעת שמירת נתונים';
            }

            function ApplyNewAttachments(imageSection, updatedSection) {
                var updatedImages = updatedSection.NewAttachments || [];
                if (imageSection.NewAttachments && imageSection.NewAttachments.length > 0) {
                    if (!imageSection.Attachments)
                        imageSection.Attachments = [];
                    var imageSeqMapping = {};
                    for (var i = 0; i < updatedImages.length; i++)
                        imageSeqMapping[updatedImages[i].Name] = updatedImages[i].Seq;
                    var imageIndex = imageSection.Attachments.length;
                    for (var i = 0; i < imageSection.NewAttachments.length; i++) {
                        var curImage = imageSection.NewAttachments[i];
                        var curSeq = imageSeqMapping[curImage.Name] || 0;
                        imageSection.Attachments.push({
                            'Seq': curSeq,
                            'FileName': curImage.Name,
                            'FileSize': curImage.Size,
                            'DateUploaded': curImage.DateUploaded,
                            'Description': '',
                            'Index': imageIndex
                        });
                        imageIndex++;

                    }
                    imageSection.ImageRows = contentUtils.BuildImageRows(imageSection.Attachments, attachmentSectionsData.ImagesPerRow);
                }
            }

            function ApplyRegion(callback) {
                if (typeof callback == 'undefined' || callback == null)
                    callback = function() {};
                function ExecuteAction(actions, index) {
                    function NextAction() {
                        ExecuteAction(actions, index + 1);
                    }

                    if (index >= actions.length) {
                        $scope.pageData.OriginalRegion = $scope.pageData.Region;
                        callback();
                        return;
                    }

                    var curAction = actions[index];
                    switch (curAction.Method) {
                        case 'delete':
                            $http.delete(curAction.Url).then(NextAction, NextAction);
                            break;
                        case 'put':
                            $http.put(curAction.Url, curAction.Params).then(NextAction, NextAction);
                            break;
                    }
                }

                var originalRegion = $scope.pageData.OriginalRegion || null;
                var currentRegion = $scope.pageData.Region || null;
                if (originalRegion != currentRegion) {
                    var actions = [];
                    if (originalRegion != null) {
                        actions.push({
                            Method: 'delete',
                            Url: '/api/pages/region-page?page=' + $scope.pageData.Seq + '&region=' + originalRegion,
                            Params: null
                        });
                    }
                    if (currentRegion != null) {
                        actions.push({
                            Method: 'put',
                            Url: '/api/pages/region-page',
                            Params: {
                                PageSeq: $scope.pageData.Seq,
                                Region: currentRegion
                            }
                        });
                    }
                    ExecuteAction(actions, 0);
                } else {
                    callback();
                }
            }

            if (!$scope.pageData.Sections)
                $scope.pageData.Sections = [];
            var imageNames = attachmentSectionsData.GetAllFiles();
            //console.log(imageNames);
            for (var i  = 0; i < $scope.pageData.Sections.length; i++) {
                var curSection = $scope.pageData.Sections[i];
                if (curSection.Type == 1 || curSection.Type == 5 || curSection.Type == 6) {
                    var uploadMapping = GetUploadMapping(curSection.Type);
                    curSection.PageSeq = (pageSeq == 'new') ? 0 : pageSeq;
                    if (curSection.Type == 6) {
                        var matchingFiles = imageNames.filter(function(x) {
                            return uploadMapping[x] == curSection.UniqueId;
                        });
                        if (matchingFiles.length > 0) {
                            curSection.NewContactPicture = matchingFiles.map(function (fileName) {
                                return {
                                    'Name': fileName,
                                    'Size': attachmentSectionsData.FileSizeMapping[fileName],
                                    'DateUploaded': new Date()
                                };
                            })[0];
                        }
                    } else {
                        var rawData = '';
                        if (curSection.Attachments) {
                            curSection.Attachments.sort(function (a1, a2) {
                                return a1.Index - a2.Index;
                            });
                            rawData = curSection.Attachments.map(function (x) {
                                return x.Seq;
                            }).join(',');
                        }
                        curSection.Data = rawData;
                        curSection.AttachmentsData = (curSection.Attachments || []).map(function (x) {
                            return {
                                'Seq': x.Seq,
                                'Description': x.Description,
                                'CustomLink': x.CustomLink
                            };
                        });
                        curSection.NewAttachments = imageNames.filter(function(x) {
                            return uploadMapping[x] == curSection.UniqueId;
                        }).map(function (fileName) {
                            return {
                                'Name': fileName,
                                'Size': attachmentSectionsData.FileSizeMapping[fileName],
                                'DateUploaded': new Date()
                            };
                        });
                    }
                }
            }

            $scope.validationErrors = GetValidationErrors();
            $scope.showSubmitSuccessMessage = false;
            if ($scope.validationErrors.length == 0) {
                $scope.submitting = true;
                var selectedAuthor = GetSelectedAuthor();
                var allImages = contentUtils.ExtractAllAttachments($scope.pageData).filter(function(x) {
                    return x.SectionType == 1;
                });
                contentUtils.RearrangeSections($scope.pageData);
                $scope.pageData.SportFieldSeq = $scope.selected.sportField.Seq;
                $scope.pageData.Type = contentUtils.ParsePageType($scope.pageType);
                if (allImages.length == 0) {
                    $scope.pageData.DefaultImageSeq = null;
                } else {
                    $scope.pageData.DefaultImageSeq = ($scope.pageData.Type == 5 || $scope.pageData.Type == 6) ? null : GetDefaultImage($scope.pageData).Seq;
                }
                $scope.pageData.CreatorSeq = $scope.LoggedInUser ? $scope.LoggedInUser.seq : 1;
                $scope.pageData.ShowAuthorDetails = ($('#chkAuthorDetails').prop('checked') == true) ? 1 : 0;
                $scope.pageData.AuthorSeq = selectedAuthor.Seq;
                $scope.pageData.AuthorName = selectedAuthor.Name;
                $scope.pageData.Region = ($scope.selected.region == null) ? null : $scope.selected.region.REGION_ID;
                if ($scope.pageData.ChampionshipCategories && $scope.pageData.ChampionshipCategories.length > 0) {
                    $scope.pageData.ChampionshipCategoryIds = $scope.pageData.ChampionshipCategories.map(function(x) {
                        var categoryId = x.CategoryId;
                        if ($scope.pageData.SportFieldSeq == sportGlobalSettings.FlowersFieldSeq) {
                            categoryId = 'sf-' + categoryId;
                        }
                        return categoryId;
                    });
                }  else {
                    $scope.pageData.ChampionshipCategoryIds = null;
                }
                if (pageSeq == 'new') {
                    ContentService.create($scope.pageData).then(function (result) {
                        ApplyRegion(function() {
                            $scope.submitting = false;
                            var newSeq = result.Seq;
                            $state.go($scope.pageType + '.edit', {page: newSeq});
                        });
                    }, SubmitError);
                } else {
                    ContentService.update($scope.pageData).then(function (result) {
                        $scope.submitting = false;
                        $scope.showSubmitSuccessMessage = true;
                        for (var i = 0; i < $scope.pageData.Sections.length; i++) {
                            var curSection = $scope.pageData.Sections[i];
                            if (curSection.Type == 1 || curSection.Type == 5) {
                                ApplyNewAttachments(curSection, result.Sections[i]);
                            } else if (curSection.Type == 6) {
                                if (curSection.NewContactPicture) {
                                    curSection.Data.Picture = {
                                        'Seq': result.Sections[i].NewContactPicture.Seq,
                                        'FileName': curSection.NewContactPicture.Name,
                                        'PageSeq': pageSeq
                                    };
                                }
                            }
                        }
                        RemoveAllDropZoneFiles();
                        ApplyRegion(function() {
                            $timeout(function () {
                                $scope.showSubmitSuccessMessage = false;
                            }, 5000);
                        });
                    }, SubmitError);
                }
            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentListController',
            ['$scope', '$state', '$stateParams', '$sce', '$http', 'ContentService', ContentListController]);

    function ContentListController($scope, $state, $stateParams, $sce, $http, ContentService) {
        var pagesPerRow = 3;
        $scope.pageRows = null;
        $scope.pageType = $state.current.data.contentType;
        $scope.pluralCaption = contentUtils.HebrewPageType($scope.pageType, true);
        $scope.data = {'AllTags': []};

        function ReadPages() {
            function BuildRowPages(pageRow) {
                pageRow.Pages = [];
                for (var i = 0; i < pageRow.length; i++) {
                    var curPage = pageRow[i];
                    curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                    curPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(curPage);
                    pageRow.Pages.push(curPage);
                }

                //insert empty pages
                for (var i = pageRow.length; i < pagesPerRow; i++) {
                    pageRow.Pages.push({
                        'Seq': 0
                    });
                }
            }

            var actualType = contentUtils.ParsePageType($scope.pageType);
            ContentService.list(actualType, null).then(function (contentPages) {
                contentUtils.InitCroppedImages($http, function() {
                    for (var i = 0; i < contentPages.length; i++) {
                        var curPage = contentPages[i];
                        contentUtils.BuildCroppedImages(curPage);
                    }
                });
                $scope.pageRows = sportUtils.SplitArray(contentPages, pagesPerRow);
                for (var i = 0; i < $scope.pageRows.length; i++) {
                    var currentRow = $scope.pageRows[i];
                    BuildRowPages(currentRow);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function (err) {
                alert('שגיאה בעת טעינת נתונים מהשרת');
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllTags() {
            $scope.data.AllTags = [];
            window.setTimeout(function() {
                window['qL_Finish_Now'] = true;
            }, 1000);
            ChainFactory.Next();
            /*
            $http.get('/api/common/tags?type=1').then(function(resp) {
                $scope.data.AllTags = resp.data;
                window.setTimeout(function() {
                    window['qL_Finish_Now'] = true;
                }, 1000);
                ChainFactory.Next();
            }, function(err) {
                alert('error loading tags: ' + err);
                window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            });
            */
        }

        ChainFactory.Execute(ReadPages, ReadAllTags);

        window['qL_steps_amount'] = 2;
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentManageController',
            ['$scope', '$http', '$state', '$timeout', '$interval', '$filter', '$rootScope', '$cookies', 'messageBox', 'ContentService', ContentManageController]);

    function ContentManageController($scope, $http, $state, $timeout, $interval, $filter, $rootScope, $cookies, messageBox, ContentService) {
        var allPages = [];
        var featuredPages = [];
        var recentPages = [];
        var previousData = {'SortBy': '-Date', 'Search': '', 'PageType': 0};
        $scope.recentAmount = sportGlobalSettings.RecentAmount;
        $scope.sortFields = [{'Name': 'תאריך יצירה', 'Value': '-Date'},
            {'Name': 'תיאור', 'Value': '+Description'},
            {'Name': 'ענף ספורט', 'Value': '+SportFieldName'}];
        $scope.pageTypes = contentUtils.GetPageTypes();
        $scope.availablePageTypes = $scope.pageTypes.map(function(x) { return {'Type': x.Id}; });
        $scope.sortColumn = '-Date';
        $scope.selectedPageType = 0;
        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.Unauthorized = false;
        $scope.data = {contentSearch: ''};

        $rootScope.$on('$stateChangeSuccess', function (ev, to, toParams, from, fromParams) {
            contentUtils.storeStateChange($cookies, from, to);
        });

        for (var i = 0; i < $scope.availablePageTypes.length; i++) {
            var curPageType = $scope.availablePageTypes[i];
            curPageType.HebrewType = contentUtils.HebrewPageType(curPageType.Type);
            curPageType.pageTypeIsHebrewMale = contentUtils.IsHebrewMalePageType(curPageType.Type);
            curPageType.PluralHebrewType = contentUtils.HebrewPageType(curPageType.Type, true);
            curPageType.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(curPageType.Type);
            curPageType.IconCss = contentUtils.GetPageIcon(curPageType.Type);
        }

        contentUtils.InitSportFieldColors($http);

        $scope.contentPagingService = new PagingService(filteredPages(), {pageSize: 20});
        $scope.pages = [];
        $scope.contentPagingService.applyPaging($scope.pages);

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3], function(resp) {
                //console.log($scope.LoggedInUser);
                if ($scope.LoggedInUser && $scope.LoggedInUser.role == 2) {
                    //var desiredState = $scope.LoggedInUser.isClubUser ? 'club-register' : 'register';
                    //$state.go(desiredState);
                    $state.go('register');
                }
                ChainFactory.Next();
                window['qL_step_finished'] = true;
            });
        }

        function filteredPages() {
            var searchTerm = $.trim($scope.data.contentSearch);
            function matchingSearch(x) {
                var s = x.Name || x;
                return s.indexOf(searchTerm) >= 0;
            }
            var filtered = allPages.slice(0);
            filtered = $filter('orderBy')(filtered, $scope.sortColumn);
            if (searchTerm.length > 0) {
                filtered = filtered.filter(function(page) {
                    if ([page.SportFieldName, page.Description, page.HebrewType, page.CreatorDisplayName].some(matchingSearch))
                        return true;
                    if (page.Tags && page.Tags.some(matchingSearch))
                        return true;
                    return false;
                });
            }
            if ($scope.selectedPageType > 0) {
                filtered = filtered.filter(function(x) {
                    return x.Type == $scope.selectedPageType;
                });
            }
            return filtered;
        }

        function BuildRecentPages() {
            $scope.recentPageTypes = [];
            recentPages = allPages.filter(function(x) { return x.PageIndex > 0; });
            if (recentPages.length > 0) {
                recentPages.sort(function(p1, p2) { return  p1.PageIndex - p2.PageIndex; });
                var allTypes = sportUtils.DistinctArray(recentPages.map(function(x) { return x.Type; }));
                allTypes.sort(function(t1, t2) { return t1 - t2; });
                for (var i = 0; i < allTypes.length; i++) {
                    var curType = allTypes[i];
                    var curPages = recentPages.filter(function(x) { return x.Type == curType; }).take($scope.recentAmount);
                    $scope.recentPageTypes.push({
                        'Type': curType,
                        'HebrewPluralType': contentUtils.HebrewPageType(curType, true),
                        'Pages': curPages
                    });
                }
            }
            for (var i = 0; i < $scope.recentPageTypes.length; i++) {
                var curPageType = $scope.recentPageTypes[i];
                curPageType.Rows = sportUtils.SplitArray(curPageType.Pages, 3);
            }
        }

        function ApplyCssClasses(contentPage) {
            var baseClass = 'button button_type_icon_small icon button_grey_light';
            var hoverClass = 'button_grey_light_hover';
            contentPage.AddToRecentCssClass = baseClass;
            contentPage.AddToFeaturedCssClass = baseClass;
            contentPage.HidePageCssClass = baseClass;
            if (contentPage.FeaturedIndex > 0)
                contentPage.AddToFeaturedCssClass += ' ' + hoverClass;
            if (contentPage.PageIndex > 0)
                contentPage.AddToRecentCssClass += ' ' + hoverClass;
            if (contentPage.IsHidden)
                contentPage.HidePageCssClass += ' ' + hoverClass;
        }

        function BuildFeaturedRows() {
            featuredPages = allPages.filter(function(x) { return x.FeaturedIndex > 0; });
            featuredPages.sort(function(p1, p2) { return p1.FeaturedIndex - p2.FeaturedIndex; });
            $scope.featuredPageRows = sportUtils.SplitArray(featuredPages, 3);
        }

        function ChangeIndex(page, indexPropName, diff, maxIndex, relatedPages) {
            if (diff == 0)
                return false;
            var currentIndex = page[indexPropName];
            var newIndex = currentIndex + diff;
            if (newIndex < 1 || newIndex > maxIndex)
                return false;
            var matchingPages = relatedPages.filter(function(x) { return x[indexPropName] == newIndex; });
            if (matchingPages.length > 0)
                matchingPages[0][indexPropName] = currentIndex;
            page[indexPropName] = newIndex;
            return true;
        }

        function ApplyRecentPages(pageType, relevantPages, page, originalIndex) {
            if (typeof page == 'undefined')
                page = null;

            if (typeof originalIndex == 'undefined')
                originalIndex = 0;

            var data = relevantPages.map(function(x) {
                return {
                    'Seq': x.Seq,
                    'Index': x.PageIndex
                };
            });
            // console.log(page);
            // console.log('index: ' + originalIndex);
            var successCallback = function (resp) {
                if (page) {
                    page.AddingToRecent = false;
                    ApplyCssClasses(page);
                    BuildRecentPages();
                }
            };
            var errorCallback = function (err) {
                if (page) {
                    page.AddingToRecent = false;
                    alert('פעולה נכשלה, אנא נסו שוב מאוחר יותר');
                    page.PageIndex = originalIndex;
                } else {
                    console.log('error setting recent pages: ' + err)
                }
            };
            if (page && originalIndex > 0) {
                ContentService.removeRecentPage(page.Seq).then(successCallback, errorCallback);
            } else {
                ContentService.setRecentPages(data, pageType).then(successCallback, errorCallback);
            }
        }

        function ApplyFeaturedPages(page, originalIndex) {
            if (typeof page == 'undefined')
                page = null;

            if (typeof originalIndex == 'undefined')
                originalIndex = 0;

            var data = featuredPages.map(function(x) {
                return {
                    'Seq': x.Seq,
                    'Index': x.FeaturedIndex
                };
            });
            ContentService.setFeaturedPages(data).then(function(resp) {
                if (page) {
                    page.AddingToFeatured = false;
                    ApplyCssClasses(page);
                    BuildFeaturedRows();
                }
            }, function(err) {
                if (page) {
                    page.AddingToFeatured = false;
                    alert('פעולה נכשלה, אנא נסו שוב מאוחר יותר');
                    page.FeaturedIndex = originalIndex;
                } else {
                    console.log('error setting featured pages: ' + err)
                }
            });
        }

        function ChangeRecentIndex(page, diff) {
            var relatedPages = $scope.recentPageTypes.filter(function(x) { return x.Type == page.Type; })[0].Pages;
            if (ChangeIndex(page, 'PageIndex', diff, $scope.recentAmount, relatedPages)) {
                BuildRecentPages();
                ApplyRecentPages(page.Type, relatedPages);
            }
        }

        function ChangeFeaturedIndex(page, diff) {
            if (ChangeIndex(page, 'FeaturedIndex', diff, featuredPages.length, featuredPages)) {
                BuildFeaturedRows();
                ApplyFeaturedPages();
            }
        }
        function ReadLists() {
            ContentService.list(null, null, true).then(function (contentPages) {
                window['qL_step_finished'] = true;
                for (var i = 0; i < contentPages.length; i++) {
                    var contentPage = contentPages[i];
                    contentPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(contentPage);
                    contentPage.HebrewType = contentUtils.HebrewPageType(contentPage.Type);
                    contentPage.IsHebrewMale = contentUtils.IsHebrewMalePageType(contentPage.Type);
                    contentPage.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(contentPage.Type);
                    ApplyCssClasses(contentPage);
                }
                allPages = contentPages.slice(0);
                $scope.contentPagingService.setData(filteredPages());
                BuildRecentPages();
                BuildFeaturedRows();
                ChainFactory.Next();
            }, function(err) {
                ChainFactory.Next();
            });
        }

        function GetSelectedSortBy() {
            var rawText = $.trim($('#ddlSortBy').find('.select_title').text());
            var selectedFields = $scope.sortFields.filter(function (x) {
                return x.Name == rawText;
            });
            if (selectedFields.length > 0) {
                var selectedField = selectedFields[0];
                return selectedField.Value;
            }
            return '';
        }

        function GetSelectedPageType() {
            var rawText = $.trim($('#ddlPageType').find('.select_title').text());
            var selectedTypes = $scope.availablePageTypes.filter(function (x) {
                return x.PluralHebrewType == rawText;
            });
            return (selectedTypes.length > 0) ? selectedTypes[0].Type : 0;
        }

        function StartInterval() {
            $interval(function() {
                var selectedSortBy = GetSelectedSortBy();
                var selectedPageType = GetSelectedPageType();
                var sortByChanged = (selectedSortBy.length > 0 && selectedSortBy != previousData.SortBy);
                var pageTypeChanged =  selectedPageType != previousData.PageType;
                var searchTermChanged = ($scope.data.contentSearch != previousData.Search);
                if (sortByChanged || searchTermChanged || pageTypeChanged) {
                    $scope.sortColumn = selectedSortBy;
                    $scope.selectedPageType = selectedPageType;
                    $scope.contentPagingService.setData(filteredPages());
                }
                if (selectedSortBy.length > 0)
                    previousData.SortBy = selectedSortBy;
                previousData.Search = $scope.data.contentSearch;
                previousData.PageType = selectedPageType;
            }, 500);
            ChainFactory.Next();
            window['qL_step_finished'] = true;
            window['qL_Finish_Now'] = true;
        }

        window['qL_steps_amount'] = 3;
        ChainFactory.Execute(VerifyUser, ReadLists, StartInterval);

        $scope.FeaturedPageCount = function() {
            return featuredPages.length;
        };

        $scope.getPageIcon = function(page) {
            return contentUtils.GetPageIcon(page.Type);
        };

        $scope.AddToFeaturedTitle = function(page) {
            return (page.FeaturedIndex > 0) ? 'הסרה מעמוד הבית' : 'הצגה בעמוד הבית';
        };

        $scope.HideTitle = function(page) {
            return (page.IsHidden) ? 'ביטול  מצב מוסתר' : 'הסתרה';
        };

        $scope.AddToRecentTitle = function(page) {
            var hebrewType = contentUtils.HebrewPageType(page.Type, true);
            var isMale = contentUtils.IsHebrewMalePageType(page.Type);
            return ((page.PageIndex > 0) ? 'הסרה מ' : 'הוספה ל') + hebrewType + ' ' + ((isMale) ? 'אחרונים' : 'אחרונות');
        };

        $scope.Delete = function(page) {
            var pageSeq = page.Seq;
            var msg = 'האם למחוק ' + page.HebrewType + ' ' + page.Description + '?';
            messageBox.ask(msg).then(function () {
                page.deleting = true;
                ContentService.delete(pageSeq).then(function(resp) {
                    allPages = allPages.filter(function(x) { return x.Seq != pageSeq; });
                    $scope.contentPagingService.setData(filteredPages());
                    page.deleting = false;
                }, function(err) {
                    page.deleting = false;
                    alert('שגיאה בעת מחיקה, אנא נסו שוב מאוחר יותר');
                });
            });
        };

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            return 'background-color: ' + bgColor + ';';
        };

        $scope.ToggleFeatured = function(page) {
            page.AddingToFeatured = true;
            var originalIndex = page.FeaturedIndex;
            if (page.FeaturedIndex > 0) {
                //remove
                featuredPages = featuredPages.filter(function(x) { return x.Seq != page.Seq; });
                for (var i = 0; i < featuredPages.length; i++) {
                    featuredPages[i].FeaturedIndex = i + 1;
                }
                page.FeaturedIndex = 0;
            } else {
                //add
                for (var i = 0; i < featuredPages.length; i++) {
                    featuredPages[i].FeaturedIndex++;
                }
                page.FeaturedIndex = 1;
                featuredPages.push(page);
            }
            ApplyFeaturedPages(page, originalIndex);
        };

        $scope.ToggleHidden = function(page) {
            page.Hiding = true;
            if (page.IsHidden == 1) {
                ContentService.unhide(page.Seq).then(function (resp) {
                    page.Hiding = false;
                    page.IsHidden = 0;
                    ApplyCssClasses(page);
                }, function (err) {
                    page.Hiding = false;
                    alert('פעולה נכשלה, אנא נסו שוב מאוחר יותר');
                });
            } else {
                ContentService.hide(page.Seq).then(function (resp) {
                    page.Hiding = false;
                    page.IsHidden = 1;
                    ApplyCssClasses(page);
                }, function (err) {
                    page.Hiding = false;
                    alert('פעולה נכשלה, אנא נסו שוב מאוחר יותר');
                });
            }
        };

        $scope.RemoveFromFeatured = function(page) {
            messageBox.ask('האם להסיר מרשימת תוכן מקודם?').then(function () {
                $scope.ToggleFeatured(page);
            });
        };

        $scope.ToggleRecent = function(page) {
            page.AddingToRecent = true;
            var pageType = page.Type;
            var originalIndex = page.PageIndex;
            var relevantPages = recentPages.filter(function(x) { return x.Type == pageType; });
            if (page.PageIndex > 0) {
                //remove
                page.PageIndex = 0;
                relevantPages = relevantPages.filter(function(x) { return x.Seq != page.Seq; });

            } else {
                //add
                page.PageIndex = 1;
                relevantPages = sportUtils.InsertIntoArray(relevantPages, page);
            }
            for (var i = 0; i < relevantPages.length; i++) {
                relevantPages[i].PageIndex = (i >= $scope.recentAmount) ? 0 : i + 1;
            }
            ApplyRecentPages(pageType, relevantPages, page, originalIndex);
        };

        $scope.RemoveFromRecent = function(page) {
            messageBox.ask('האם להסיר מרשימה זו?').then(function () {
                $scope.ToggleRecent(page);
            });
        };

        $scope.MoveRecentRight = function(page) {
            ChangeRecentIndex(page, -1);
        };

        $scope.MoveRecentLeft = function(page) {
            ChangeRecentIndex(page, 1);
        };

        $scope.MoveFeaturedRight = function(page) {
            ChangeFeaturedIndex(page, -1);
        };

        $scope.MoveFeaturedLeft = function(page) {
            ChangeFeaturedIndex(page, 1);
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentRegionsController',
            ['$scope', '$http', '$state', '$timeout', '$interval', '$filter', '$rootScope', '$cookies', 'messageBox', 'ContentService', ContentRegionsController]);

    function ContentRegionsController($scope, $http, $state, $timeout, $interval, $filter, $rootScope, $cookies, messageBox, ContentService) {
        var allPages = [];
        var featuredPages = [];
        var recentPages = [];
        var previousData = {'SortBy': '-Date', 'Search': '', 'PageType': 0, 'Region': -1};
        $scope.recentAmount = sportGlobalSettings.RecentAmount;
        $scope.sortFields = [{'Name': 'תאריך יצירה', 'Value': '-Date'},
            {'Name': 'תיאור', 'Value': '+Description'},
            {'Name': 'ענף ספורט', 'Value': '+SportFieldName'}];
        $scope.pageTypes = contentUtils.GetPageTypes();
        $scope.availablePageTypes = $scope.pageTypes.map(function(x) { return {'Type': x.Id}; });
        $scope.sortColumn = '-Date';
        $scope.selectedPageType = 0;
        $scope.selectedRegion = null;
        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.Unauthorized = false;
        $scope.data = {
            contentSearch: '',
            Regions: []
        };

        for (var i = 0; i < $scope.availablePageTypes.length; i++) {
            var curPageType = $scope.availablePageTypes[i];
            curPageType.HebrewType = contentUtils.HebrewPageType(curPageType.Type);
            curPageType.pageTypeIsHebrewMale = contentUtils.IsHebrewMalePageType(curPageType.Type);
            curPageType.PluralHebrewType = contentUtils.HebrewPageType(curPageType.Type, true);
            curPageType.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(curPageType.Type);
            curPageType.IconCss = contentUtils.GetPageIcon(curPageType.Type);
        }

        contentUtils.InitSportFieldColors($http);

        $scope.contentPagingService = new PagingService(filteredPages(), {pageSize: 20});
        $scope.pages = [];
        $scope.contentPagingService.applyPaging($scope.pages);

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3], function(resp) {
                if ($scope.LoggedInUser && $scope.LoggedInUser.role == 2) {
                    $state.go('register');
                }
                ChainFactory.Next();
                window['qL_step_finished'] = true;
            });
        }

        function ReadAllRegions() {
            $http.get('/api/sportsman/regions').then(function (resp) {
                $scope.data.Regions = resp.data.slice(0);
                window.setTimeout(function() {
                    sportUtils.InitCustomSelect();
                    var userRegion = 0;
                    window.setTimeout(function() {
                        var index = $("#ddlRegion").find("option[value='" + userRegion + "']").index();
                        $("#selected_region").find("li").eq(index).click();
                    }, 500);
                }, 200);
                ChainFactory.Next();
                window['qL_step_finished'] = true;
            }, function(err) {
                ChainFactory.Next();
                window['qL_step_finished'] = true;
            });
        }

        function filteredPages() {
            var searchTerm = $.trim($scope.data.contentSearch);
            function matchingSearch(x) {
                if (x == null || !x)
                    return false;
                var s = x.Name || x;
                return s.indexOf(searchTerm) >= 0;
            }
            var filtered = allPages.slice(0);
            filtered = $filter('orderBy')(filtered, $scope.sortColumn);
            if (searchTerm.length > 0) {
                filtered = filtered.filter(function(page) {
                    if ([page.SportFieldName, page.Description, page.HebrewType, page.CreatorDisplayName].some(matchingSearch))
                        return true;
                    if (page.Tags && page.Tags.some(matchingSearch))
                        return true;
                    return false;
                });
            }
            if ($scope.selectedPageType > 0) {
                filtered = filtered.filter(function(x) {
                    return x.Type == $scope.selectedPageType;
                });
            }
            if ($scope.selectedRegion != null) {
                filtered = filtered.filter(function(x) {
                    return x.Region && x.Region.REGION_ID == $scope.selectedRegion.Id;
                });
            }
            return filtered;
        }

        function ApplyCssClasses(contentPage) {
            var baseClass = 'button button_type_icon_small icon button_grey_light';
            var hoverClass = 'button_grey_light_hover';
            contentPage.AddToRecentCssClass = baseClass;
            contentPage.AddToFeaturedCssClass = baseClass;
            contentPage.HidePageCssClass = baseClass;
            if (contentPage.RegionIndex > 0)
                contentPage.AddToFeaturedCssClass += ' ' + hoverClass;
            if (contentPage.PageIndex > 0)
                contentPage.AddToRecentCssClass += ' ' + hoverClass;
            if (contentPage.IsHidden)
                contentPage.HidePageCssClass += ' ' + hoverClass;
        }

        function BuildFeaturedRows() {
            featuredPages = filteredPages().filter(function(x) { return x.RegionIndex > 0; });
            featuredPages.sort(function(p1, p2) { return p1.RegionIndex - p2.RegionIndex; });
            $scope.featuredPageRows = sportUtils.SplitArray(featuredPages, 3);
        }

        function ChangeFeaturedIndex(page, diff) {
            if ($scope.selectedRegion == null)
                return;

            var region = $scope.selectedRegion.Id;
            var newIndex = (page.RegionIndex || 0) + diff;
            if (newIndex < 1)
                newIndex = 1;
            //update
            var requestParams = {
                PageSeq: page.Seq,
                Region: region,
                PageIndex: newIndex
            };
            $http.post('/api/pages/region-page', requestParams).then(function(resp) {
                if (resp.data && resp.data.OriginalIndex) {
                    var pageToUpdate = filteredPages().findItem(function(x) { return x.Seq == resp.data.PageWithOriginalIndex; });
                    if (pageToUpdate != null)
                        pageToUpdate.RegionIndex = resp.data.OriginalIndex;
                }
                page.RegionIndex = newIndex;
                BuildFeaturedRows();
                ApplyCssClasses(page);
            }, function(err) {
                alert('שגיאה בעת עדכון מיקום, נא לנסות שוב מאוחר יותר');
            });
        }
        function ReadLists() {
            $http.get('/api/pages/region-pages').then(function(resp) {
                var regionMapping = {};
                resp.data.forEach(function(x) {
                    regionMapping[x.ContentPageSeq.toString()] = x.PageIndex;
                });
                ContentService.list(null, null, true).then(function (contentPages) {
                    window['qL_step_finished'] = true;
                    for (var i = 0; i < contentPages.length; i++) {
                        var contentPage = contentPages[i];
                        contentPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(contentPage);
                        contentPage.HebrewType = contentUtils.HebrewPageType(contentPage.Type);
                        contentPage.IsHebrewMale = contentUtils.IsHebrewMalePageType(contentPage.Type);
                        contentPage.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(contentPage.Type);
                        contentPage.RegionIndex = regionMapping[contentPage.Seq.toString()] || null;
                        ApplyCssClasses(contentPage);
                    }
                    allPages = contentPages.slice(0);
                    var allCategories = allPages.map(function(x) { return x.ChampionshipCategoryId; }).filter(function(x) {
                        return x != null;
                    }).distinct();
                    var url = '/api/sportsman/category-regions?categories=' + allCategories.join(',');
                    $http.get(url).then(function(resp) {
                        var categoryRegions = resp.data.slice(0);
                        var categoryRegionMapping = {};
                        categoryRegions.forEach(function(categoryRegion) {
                            categoryRegionMapping[categoryRegion.CHAMPIONSHIP_CATEGORY_ID.toString()] = categoryRegion;
                        });
                        allPages.forEach(function(page) {
                            if (page.ChampionshipCategoryId) {
                                page.Region = categoryRegionMapping[page.ChampionshipCategoryId.toString()];
                            }
                        });
                        $scope.contentPagingService.setData(filteredPages());
                        BuildFeaturedRows();
                        ChainFactory.Next();
                    }, function(err) {
                        $scope.contentPagingService.setData(filteredPages());
                        BuildFeaturedRows();
                        ChainFactory.Next();
                    });

                }, function(err) {
                    ChainFactory.Next();
                });
            }, function(err) {
                ChainFactory.Next();
            });
        }

        function GetSelectedRegion() {
            var rawText = $.trim($('#ddlRegion').find('.select_title').text());
            var selectedFields = $scope.data.Regions.filter(function (x) {
                return x.REGION_NAME == rawText;
            });
            if (selectedFields.length > 0) {
                var selectedField = selectedFields[0];
                return {
                    Id: selectedField.REGION_ID,
                    Name: rawText
                };
            }
            return null;
        }

        function GetSelectedSortBy() {
            var rawText = $.trim($('#ddlSortBy').find('.select_title').text());
            var selectedFields = $scope.sortFields.filter(function (x) {
                return x.Name == rawText;
            });
            if (selectedFields.length > 0) {
                var selectedField = selectedFields[0];
                return selectedField.Value;
            }
            return '';
        }

        function GetSelectedPageType() {
            var rawText = $.trim($('#ddlPageType').find('.select_title').text());
            var selectedTypes = $scope.availablePageTypes.filter(function (x) {
                return x.PluralHebrewType == rawText;
            });
            return (selectedTypes.length > 0) ? selectedTypes[0].Type : 0;
        }

        function StartInterval() {
            $interval(function() {
                var selectedSortBy = GetSelectedSortBy();
                var selectedPageType = GetSelectedPageType();
                var selectedRegion = GetSelectedRegion();
                var sortByChanged = (selectedSortBy.length > 0 && selectedSortBy != previousData.SortBy);
                var pageTypeChanged =  selectedPageType != previousData.PageType;
                var regionChanged = (selectedRegion != null && previousData.Region == null) ||
                                    (selectedRegion != null && previousData.Region != null && selectedRegion.Id != previousData.Region.Id);
                var searchTermChanged = ($scope.data.contentSearch != previousData.Search);
                if (sortByChanged || searchTermChanged || regionChanged || pageTypeChanged) {
                    $scope.sortColumn = selectedSortBy;
                    $scope.selectedPageType = selectedPageType;
                    $scope.selectedRegion = selectedRegion;
                    $scope.contentPagingService.setData(filteredPages());
                    BuildFeaturedRows();
                }
                if (selectedSortBy.length > 0)
                    previousData.SortBy = selectedSortBy;
                previousData.Search = $scope.data.contentSearch;
                previousData.PageType = selectedPageType;
                previousData.Region = selectedRegion;
            }, 500);
            ChainFactory.Next();
            window['qL_step_finished'] = true;
            window['qL_Finish_Now'] = true;
        }

        window['qL_steps_amount'] = 4;
        ChainFactory.Execute(VerifyUser, ReadAllRegions, ReadLists, StartInterval);

        $scope.FeaturedPageCount = function() {
            return featuredPages.length;
        };

        $scope.getPageIcon = function(page) {
            return contentUtils.GetPageIcon(page.Type);
        };

        $scope.AddToFeaturedTitle = function(page) {
            return (page.RegionIndex > 0) ? 'הסרה מעמוד הבית' : 'הצגה בעמוד הבית';
        };

        $scope.HideTitle = function(page) {
            return (page.IsHidden) ? 'ביטול  מצב מוסתר' : 'הסתרה';
        };

        $scope.AddToRecentTitle = function(page) {
            var hebrewType = contentUtils.HebrewPageType(page.Type, true);
            var isMale = contentUtils.IsHebrewMalePageType(page.Type);
            return ((page.PageIndex > 0) ? 'הסרה מ' : 'הוספה ל') + hebrewType + ' ' + ((isMale) ? 'אחרונים' : 'אחרונות');
        };

        $scope.Delete = function(page) {
            var pageSeq = page.Seq;
            var msg = 'האם למחוק ' + page.HebrewType + ' ' + page.Description + '?';
            messageBox.ask(msg).then(function () {
                page.deleting = true;
                ContentService.delete(pageSeq).then(function(resp) {
                    allPages = allPages.filter(function(x) { return x.Seq != pageSeq; });
                    $scope.contentPagingService.setData(filteredPages());
                    page.deleting = false;
                }, function(err) {
                    page.deleting = false;
                    alert('שגיאה בעת מחיקה, אנא נסו שוב מאוחר יותר');
                });
            });
        };

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            return 'background-color: ' + bgColor + ';';
        };

        $scope.ToggleFeatured = function(page) {
            function DoneSending(index) {
                page.AddingToFeatured = false;
                page.RegionIndex = index;
                BuildFeaturedRows();
                ApplyCssClasses(page);
            }

            function ErrorSending() {
                alert('שגיאה בעת שמירת נתונים, נא לנסות שוב מאוחר יותר');
                page.AddingToFeatured = false;
            }

            if ($scope.selectedRegion == null)
                return;

            page.AddingToFeatured = true;
            var originalIndex = page.RegionIndex;
            var region = $scope.selectedRegion.Id;
            if (page.RegionIndex > 0) {
                //remove
                var url = '/api/pages/region-page?page=' + page.Seq + '&region=' + region;
                $http.delete(url).then(function(resp) {
                    DoneSending(0);
                }, ErrorSending);
            } else {
                //add
                var requestParams = {
                    PageSeq: page.Seq,
                    Region: region
                };
                $http.put('/api/pages/region-page', requestParams).then(function(resp) {
                    DoneSending(resp.data.Index);
                }, ErrorSending);
            }
        };

        $scope.RemoveFromFeatured = function(page) {
            messageBox.ask('האם להסיר מרשימת תוכן מקודם?').then(function () {
                $scope.ToggleFeatured(page);
            });
        };

        $scope.MoveFeaturedRight = function(page) {
            ChangeFeaturedIndex(page, -1);
        };

        $scope.MoveFeaturedLeft = function(page) {
            ChangeFeaturedIndex(page, 1);
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.content')
        .factory('ContentService',
        ['$http', '$httpParamSerializer', ContentService]);

    function ContentService($http, $httpParamSerializer) {
        function onRead(contentPage) {
            contentPage.Date = new Date(contentPage.Date);
        }

        function onWrite(contentPage) {

        }

        return {
            list: function (type, recent, includeHidden) {
                // If type is null list all types
                // If recent has a value - list only the amount in recent
                // If both type is null and recent has a value - read the amount of recent for each type
                if (typeof includeHidden == 'undefined')
                    includeHidden = false;
                var url = '/api/pages';
                var params = $httpParamSerializer({type: type, recent: recent});
                if (params) {
                    url += '?' + params;
                }
                return $http.get(url).then(function(resp) {
                    for (var i = 0; i < resp.data.length; i++) {
                        onRead(resp.data[i]);
                    }
                    if (includeHidden) {
                        return resp.data;
                    } else {
                        return resp.data.filter(function(x) {
                            return x.IsHidden != 1;
                        });
                    }
                });
            },
            featured: function() {
                //read all pages, take only those which are featured
                return $http.get('/api/pages').then(function(resp) {
                    var featuredPages = resp.data.slice(0).filter(function(x) { return x.FeaturedIndex > 0; });
                    featuredPages.sort(function(p1, p2) { return p1.FeaturedIndex - p2.FeaturedIndex; });
                    return featuredPages.filter(function(x) {
                        return x.IsHidden != 1;
                    });
                });
            },
            recent: function(pageTypes, options) {
                //read all pages, take only those which got index, i.e. recent
                if (typeof options == 'undefined')
                    options = {};
                var amount = options.amount || sportGlobalSettings.RecentAmount;
                var sportFieldSeq = options.sportField || 0;
                var takeAll = options.takeAll || false;
                if (!pageTypes.hasOwnProperty('length'))
                    pageTypes = [pageTypes];
                var url = '/api/pages?type=0';
                if (sportFieldSeq > 0)
                    url += '&sport=' + sportFieldSeq;
                return $http.get(url).then(function (resp) {
                    var combinedPages = {};
                    var allPages = resp.data.slice(0);
                    pageTypes.forEach(function(curPageType) {
                        var recentPages = allPages.filter(function (x) {
                            return (curPageType == 0 || x.Type == curPageType) && x.IsHidden != 1;
                        });
                        if (!takeAll) {
                            recentPages = recentPages.filter(function (x) {
                                return x.PageIndex > 0
                            });
                        }
                        recentPages = recentPages.take(amount);
                        for (var i = 0; i < recentPages.length; i++) {
                            onRead(recentPages[i]);
                        }
                        recentPages.sort(function (p1, p2) {
                            return takeAll ? p2.Date.getTime() - p1.Date.getTime() : p1.PageIndex - p2.PageIndex;
                        });
                        combinedPages['Type_' + curPageType] = recentPages;
                    });
                    return combinedPages;
                });
            },
            championship: function (championshipCategoryId) {
                var url = '/api/pages/championship/' + championshipCategoryId;
                return $http.get(url).then(function(resp) {
                    for (var i = 0; i < resp.data.length; i++) {
                        onRead(resp.data[i]);
                    }
                    return resp.data;
                });
            },
            create: function (contentPage) {
                onWrite(contentPage);
                return $http.post('/api/pages', {page: contentPage}).then(function (resp) {
                    return resp.data;
                });
            },
            read: function (contentPageSeq) {
                return $http.get('/api/pages/' + contentPageSeq).then(function(resp) {
                    onRead(resp.data);
                    return resp.data;
                });
            },
            update: function (contentPage) {
                onWrite(contentPage);
                return $http.put('/api/pages', {pageData: contentPage}).then(function (resp) {
                    return resp.data;
                });
            },
            delete: function (contentPageSeq) {
                return $http.delete('/api/pages/' + contentPageSeq);
            },
            setFeaturedPages: function(contentPages) {
                return $http.post('/api/pages/featured', {pages: contentPages});
            },
            setRecentPages: function(contentPages, pageType) {
                return $http.post('/api/pages/recent', {pages: contentPages, type: pageType});
            },
            removeRecentPage: function(contentPageSeq) {
                return $http.delete('/api/pages/recent?page=' + contentPageSeq);
            },
            hide: function(contentPageSeq) {
                return $http.put('/api/pages/' + contentPageSeq + '/hide', {});
            },
            unhide: function(contentPageSeq) {
                return $http.put('/api/pages/' + contentPageSeq + '/unhide', {});
            }
        };
    }
})();
var _schoolSportPageTypes = [
    {
        Id: 1,
        Name: 'gallery',
        Hebrew: {
            Singular: 'גלריית תמונות',
            Plural: 'גלריות תמונות',
            Male: false
        },
        Icon: 'fa fa-picture-o',
        Banner: 'business'
    },
    {
        Id: 2,
        Name: 'article',
        Hebrew: {
            Singular: 'כתבה',
            Plural: 'כתבות',
            Male: false
        },
        Icon: 'fa fa-file-text',
        Banner: 'sport'
    },
    {
        Id: 3,
        Name: 'video',
        Hebrew: {
            Singular: 'סרטון',
            Plural: 'ספריית VOD',
            Male: true
        },
        Icon: 'fa fa-video-camera',
        Banner: 'travel'
    },
    {
        Id: 5,
        Name: 'files',
        Hebrew: {
            Singular: 'טבלת קבצים',
            Plural: 'טבלאות קבצים',
            Male: false
        },
        Icon: 'fa fa-files-o',
        Banner: 'education'
    },
    {
        Id: 7,
        Name: 'event',
        Hebrew: {
            Singular: 'אירוע',
            Plural: 'אירועים',
            Male: true
        },
        Icon: 'fa fa-calendar',
        Banner: 'politics'
    }
];

var _schoolSportSectionTypes = [
    {
        Id: 1,
        Name: 'pictures',
        Hebrew: 'תמונות',
        Title: 'הוספת תמונות'
    },
    {
        Id: 2,
        Name: 'text',
        Hebrew: 'טקסט',
        Title: 'נא להזין טקסט'
    },
    {
        Id: 3,
        Name: 'video',
        Hebrew: 'סרטון',
        Title: 'הוספת סרטון'
    },
    {
        Id: 5,
        Name: 'files',
        Hebrew: 'קבצים',
        Title: 'הוספת קבצים'
    },
    {
        Id: 6,
        Name: 'contact',
        Hebrew: 'איש קשר',
        Title: 'הוספת איש קשר',
        Icon: 'fa fa-user'
    }
];

var _schoolSportThumbnailTypes = {
    "1": {
       "RatioWidth": 214, //58,
        "RatioHeight": 234, //39,
        "Title": 'סליידר'
    },
    "2": {
        "RatioWidth": 383,
        "RatioHeight": 100,
        "Title": 'עמוד הבית'
    }
};

var _schoolSportPageTypeMappings = {'MapByName': {}, 'MapById': {}};
for (var i = 0; i < _schoolSportPageTypes.length; i++) {
    var curPageType = _schoolSportPageTypes[i];
    _schoolSportPageTypeMappings.MapByName[curPageType.Name] = curPageType;
    _schoolSportPageTypeMappings.MapById[curPageType.Id.toString()] = curPageType;
}
var _schoolSportSectionMappings = {'BySectionName': {}, 'BySectionId': {}};
for (var i = 0; i < _schoolSportSectionTypes.length; i++) {
    var curSectionType = _schoolSportSectionTypes[i];
    var matchingPage = _schoolSportPageTypeMappings.MapById[curSectionType.Id.toString()];
    if (matchingPage)
        curSectionType.Icon = matchingPage.Icon;
    _schoolSportSectionMappings.BySectionName[curSectionType.Name] = curSectionType;
    _schoolSportSectionMappings.BySectionId[curSectionType.Id.toString()] = curSectionType;
}

var contentUtils = {
    pageTypeMapping: {},
    sportFieldColorMapping: {},
    regionColorMapping: {},
    croppedImagesMapping: {},
    GetThumbnailType: function(type) {
        return _schoolSportThumbnailTypes[type.toString()] || {};
    },
    GetPageTypes: function() {
        var pageTypes = [];
        for (var i = 0; i < _schoolSportPageTypes.length; i++) {
            var curPageType = _schoolSportPageTypes[i];
            var clonedPage = {};
            for (var prop in curPageType)
                clonedPage[prop] = curPageType[prop];
            pageTypes.push(clonedPage);
        }
        return pageTypes;
    },
    GetPageTypeMapping: function() {
        return sportUtils.shallowCopy(contentUtils.pageTypeMapping);
    },
    GetPageTypeBySeq: function(pageSeq) {
        return contentUtils.pageTypeMapping[pageSeq.toString()] || null;
    },
    GetSectionTypes: function() {
        var sectionTypes = [];
        for (var i = 0; i < _schoolSportSectionTypes.length; i++) {
            var curSectionType = _schoolSportSectionTypes[i];
            var clonedSection = {};
            for (var prop in curSectionType)
                clonedSection[prop] = curSectionType[prop];
            sectionTypes.push(clonedSection);
        }
        return sectionTypes;
    },
    HebrewPageType: function (pageType, plural) {
        if (!isNaN(parseInt(pageType)))
            pageType = this.ParsePageType(pageType);
        if (typeof plural == 'undefined')
            plural = false;
        var hebrewPropName = plural ? 'Plural' : 'Singular';
        var matchingItem = _schoolSportPageTypeMappings.MapByName[pageType];
        return  matchingItem ? matchingItem.Hebrew[hebrewPropName] : '';
    },
    IsHebrewMalePageType: function (pageType) {
        if (!isNaN(parseInt(pageType)))
            pageType = this.ParsePageType(pageType);
        var matchingItem = _schoolSportPageTypeMappings.MapByName[pageType];
        return matchingItem ? matchingItem.Hebrew.Male : false;
    },
    HebrewSectionType: function (sectionType) {
        var matchingItem = _schoolSportSectionMappings.BySectionId[sectionType.toString()];
        return  matchingItem ? matchingItem.Hebrew : '';
    },
    HebrewSectionTitle: function (sectionType) {
        var matchingItem = _schoolSportSectionMappings.BySectionId[sectionType.toString()];
        return  matchingItem ? matchingItem.Title : '';
    },
    GetPageIcon: function(pageType) {
        var matchingItem = _schoolSportPageTypeMappings.MapById[pageType.toString()];
        return  matchingItem ? matchingItem.Icon : '';
    },
    GetBannerType: function(pageType) {
        var matchingItem = _schoolSportPageTypeMappings.MapById[pageType.toString()];
        return  matchingItem ? matchingItem.Banner : '';
    } ,
    ParsePageType: function (pageType) {
        if (!isNaN(parseInt(pageType))) {
            var matchingItem = _schoolSportPageTypeMappings.MapById[pageType.toString()];
            return  matchingItem ? matchingItem.Name : '';
        } else {
            var matchingItem = _schoolSportPageTypeMappings.MapByName[pageType];
            return  matchingItem ? matchingItem.Id : 0;
        }
    },
    ExtractAllAttachments: function (pageData) {
        var attachments = [];
        if (pageData.Sections) {
            for (var i = 0; i < pageData.Sections.length; i++) {
                var curSection = pageData.Sections[i];
                var sectionAttachments = curSection.Attachments || curSection.Data;
                if ((curSection.Type == 1 || curSection.Type == 5 || curSection.Type == 6) && sectionAttachments && sectionAttachments.length > 0) {
                    var curAttachments = sectionAttachments.slice(0);
                    for (var j = 0; j < curAttachments.length; j++) {
                        var curAttachment = curAttachments[j];
                        curAttachment.SectionIndex = i;
                        curAttachment.SectionType = curSection.Type;
                        curAttachment.Index = j;
                    }
                    sportUtils.CopyArray(curAttachments, attachments);
                }
            }
        }
        return attachments;
    },
    ExtractFirstVideo: function(pageData) {
        var videoURL = '';
        if (pageData.Sections) {
            var videoSections = pageData.Sections.filter(function(x) { return x.Type == 3; });
            if (videoSections.length > 0)
                videoURL = videoSections[0].Data || '';
        }
        return videoURL;
    },
    BuildImageRows: function (allImages, imagesPerRow) {
        function BuildCells(imageRow) {
            var imageColWidth = imagesPerRow > 0 ? Math.floor(12 / imagesPerRow) : 0;
            imageRow.ImageCells = [];
            var colWidthSum = 0;
            for (var i = 0; i < imageRow.length; i++) {
                var currentImageData = imageRow[i];
                if (imageColWidth > 0) {
                    currentImageData.ColWidth = imageColWidth;
                    colWidthSum += imageColWidth;
                    currentImageData.ColOffset = (i == (imageRow.length - 1)) ? 12 - colWidthSum : 0;
                }
                imageRow.ImageCells.push(currentImageData);
            }
        }

        var imagesRows = allImages.slice(0);
        imagesRows.sort(function (i1, i2) {
            return i1.Index - i2.Index;
        });


        imagesRows = (imagesPerRow > 0) ? sportUtils.SplitArray(imagesRows, imagesPerRow) : [imagesRows];
        for (var i = 0; i < imagesRows.length; i++) {
            var currentRow = imagesRows[i];
            BuildCells(currentRow);
        }

        return imagesRows;
    },
    RearrangeSections: function (pageData) {
        if (pageData.Sections) {
            pageData.Sections.sort(function (s1, s2) {
                return s1.Index - s2.Index;
            });
            for (var i = 0; i < pageData.Sections.length; i++)
                pageData.Sections[i].Index = i;
        }
    },
    GotValidData: function (section) {
        if (section.Type == 6) {
            //contact
            var contactName = (section.Data && section.Data.Name) ? $.trim(section.Data.Name) : '';
            return contactName.length > 0;
        } else {
            var data = $.trim(section.Data || '');
            if (section.Type == 3) {
                if (data.length == 0)
                    return false;

                //video might be invalid
                return section.Video && section.Video.Valid;
            } else {
                if (data.length > 0)
                    return true;

                //gallery or files can have new attachments
                if ((section.Type == 1 || section.Type == 5) && section.NewAttachments && section.NewAttachments.length > 0)
                    return true;
            }
        }
        return false;
    },
    TryParseVideo: function (rawURL, response) {
        function GetLastPart(lookFor) {
            var lastPart = '';
            var lastIndex = rawURL.lastIndexOf(lookFor);
            if (lastIndex >= 0) {
                lastPart = rawURL.substring(lastIndex + lookFor.length);
                var index = (lastPart.indexOf('?') + 1) || (lastPart.indexOf('&') + 1);
                if (index > 0)
                    lastPart = lastPart.substring(0, index - 1);
            }
            return lastPart;
        }

        if (!rawURL || rawURL.length == 0)
            return false;

        if (rawURL.indexOf('youtu.be/') >= 0 || rawURL.indexOf('youtube.com/') >= 0) {
            //YouTube
            var videoID = GetLastPart('?v=');
            if (videoID.length == 0)
                videoID = GetLastPart('/');
            if (videoID.length > 0) {
                response.id = videoID;
                response.url = 'https://www.youtube.com/watch?v=' + videoID;
                response.embed = 'https://www.youtube.com/embed/' + videoID + '?autoplay=1';
                response.thumbnail = 'https://img.youtube.com/vi/' + videoID + '/0.jpg';
                return true;
            }
        } else if (rawURL.indexOf('vimeo.com/') >= 0) {
            //Vimeo
            var videoID = GetLastPart('/');
            if (videoID.length > 0 && parseInt(videoID) == videoID) {
                response.id = videoID;
                response.url = 'https://vimeo.com/' + videoID;
                response.embed = 'https://player.vimeo.com/video/' + videoID + '?autoplay=1';
                response.thumbnail = '';
                return true;
            }
        }

        return false;
    },
    BuildDefaultImagePath: function (contentPage) {
        var _this = this;
        var defaultImagePath = '';
        if (contentPage.Type == 3) {
            //video
            var rawUrl = _this.ExtractFirstVideo(contentPage);
            if (rawUrl.length > 0) {
                var response = {};
                if (_this.TryParseVideo(rawUrl, response))
                    defaultImagePath = response.thumbnail;
            }
        } else if (contentPage.DefaultImage) {
            var cropImageKey = contentPage.DefaultImage.Seq + '_';
            defaultImagePath = '/content/Images/' + contentPage.Seq + '/' + contentPage.DefaultImage.Name;
        }
        return (defaultImagePath.length > 0) ? defaultImagePath : 'images/default_content_image.png';
    },
    BuildCroppedImages: function (contentPage) {
        var _this = this;
        function GetCroppedOrDefault(aspectRatio, thumbnailType) {
            var thumbImageSeq = 0;
            var thumbImageName = '';
            switch (thumbnailType) {
                case 1:
                    thumbImageSeq = contentPage.SliderThumbnailSeq;
                    thumbImageName = contentPage.SliderThumbnailImage;
                    break;
                case 2:
                    thumbImageSeq = contentPage.HomepageThumbnailSeq;
                    thumbImageName = contentPage.HomepageThumbnailImage;
                    break;
            }
            if ((thumbImageSeq == 0 || thumbImageSeq == null) && contentPage.DefaultImage)
                thumbImageSeq = contentPage.DefaultImage.Seq;
            var croppedPath = contentPage.DefaultImagePath;
            if (thumbImageSeq) {
                var key = thumbImageSeq + '_' + aspectRatio;
                var cropData = _this.croppedImagesMapping[key];
                if (cropData) {
                    croppedPath = '/content/Cropped/' + thumbImageSeq + '/' + cropData.File;
                } else if (thumbImageName && thumbImageName.length > 0) {
                    croppedPath = '/content/Images/' + contentPage.Seq + '/' + thumbImageName;
                }
            }
            return croppedPath;
        }
        contentPage.CroppedImage_Slider = GetCroppedOrDefault('214x234', 1); //58x39
        contentPage.CroppedImage_Homepage = GetCroppedOrDefault('383x100', 2);
    },
    ApplyVideoData: function(sections, $sce) {
        var _this = this;
        if (sections) {
            var videoSections = sections.filter(function(x) { return x.Type == 3; });
            for (var i = 0; i < videoSections.length; i++) {
                var curSection = videoSections[i];
                if (!curSection.Video)
                    curSection.Video = {'Valid': false};
                if (curSection.Data) {
                    var response = {};
                    if (_this.TryParseVideo(curSection.Data, response)) {
                        curSection.Data = response.url;
                        curSection.Video.Url = $sce.trustAsResourceUrl(response.embed);
                        curSection.Video.Valid = true;
                    } else {
                        curSection.Video.Url = '';
                        curSection.Video.Valid = false;
                    }
                } else {
                    curSection.Video.Url = '';
                    curSection.Video.Valid = false;
                }
            }
        }
    },
    InitPageTypes: function(pageTypes) {
        if (pageTypes != null) {
            var _this = this;
            for (var i = 0; i < pageTypes.length; i++) {
                var row = pageTypes[i];
                _this.pageTypeMapping[row.Seq.toString()] = _schoolSportPageTypeMappings.MapById[row.Type.toString()];
            }
        }
    },
    InitSportFieldColors: function($http, callback) {
        if (typeof callback == 'undefined')
            callback = null;
        var _this = this;
        $http.get('/api/common/sportFieldColors').then(function(resp) {
            for (var i = 0; i < resp.data.length; i++) {
                var row = resp.data[i];
                _this.sportFieldColorMapping[row.SportFieldSeq.toString()] = row.Color;
            }
            if (callback)
                callback('OK');
        }, function(err) {
            console.log('error loading colors: ' + err);
            if (callback)
                callback('ERROR')
        });
    },
    InitRegionColors: function($http, callback) {
        if (typeof callback == 'undefined')
            callback = null;
        var _this = this;
        $http.get('/api/common/regionColors').then(function(resp) {
            for (var i = 0; i < resp.data.length; i++) {
                var row = resp.data[i];
                _this.regionColorMapping[row.RegionId.toString()] = row.Color;
            }
            if (callback)
                callback('OK');
        }, function(err) {
            console.log('error loading colors: ' + err);
            if (callback)
                callback('ERROR')
        });
    },
    InitCroppedImages: function($http, callback) {
        if (typeof callback == 'undefined')
            callback = null;
        var _this = this;
        _this.croppedImagesMapping = {};
        $http.get('/api/images/cropped').then(function(resp) {
            var allCroppedImages = resp.data;
            if (allCroppedImages) {
                for (var i = 0; i < allCroppedImages.length; i++) {
                    var currentCroppedImage = allCroppedImages[i];
                    var key = currentCroppedImage.ImageSeq + '_' + currentCroppedImage.AspectRatio;
                    _this.croppedImagesMapping[key] = {
                        'File': currentCroppedImage.FileName,
                        'Data': currentCroppedImage.MetaData
                    };
                }
            }
            if (callback)
                callback('OK');
        }, function(err) {
            console.log('error loading cropped images:')
            console.log(err);
            if (callback)
                callback('ERROR');
        });
    },
    getSportFieldColor: function(sportFieldSeq) {
        if (sportFieldSeq) {
            var key = sportFieldSeq.toString();
            return contentUtils.sportFieldColorMapping[key] || '#c0c0c0';
        }
        return 'transparent';
    },
    getRegionColor: function(regionId) {
        var key = regionId.toString();
        return contentUtils.regionColorMapping[key] || 'transparent';
    },
    getCroppedImage: function(imageSeq, aspectRatio) {
        var _this = this;
        var key = imageSeq + '_' + aspectRatio;
        return _this.croppedImagesMapping[key] || {'File': ''};
    },
    setCroppedImage: function(imageSeq, aspectRatio, fileName, metaData) {
        var _this = this;
        var key = imageSeq + '_' + aspectRatio;
        _this.croppedImagesMapping[key] = {
            'File': fileName,
            'Data': metaData
        };
    },
    storeStateChange: function($cookies, from, to) {
        var key = 'scs_' + from.name;
        var value = to.name;
        $cookies.put(key, value);
    },
    ApplyPagesData: function(pages) {
        for (var i = 0; i < pages.length; i++) {
            var curPage = pages[i];
            curPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(curPage);
            contentUtils.BuildCroppedImages(curPage);
            curPage.EncodedSubCaption = sportUtils.EncodeHTML(curPage.SubCaption);
            curPage.ShortSubCaption = sportUtils.EncodeHTML(sportUtils.CreateShortVersion(curPage.SubCaption, 80, false));
        }
    },
    ExtractFileExtension: function(fileName) {
        return (fileName || '').split('.').slice(-1)[0].toLowerCase();
    },
    IsImageFile: function(fileName, extension) {
        if (typeof extension == 'undefined')
            extension = contentUtils.ExtractFileExtension(fileName);
        return extension == 'jpg' || extension == 'jpeg' || extension == 'png' || extension == 'gif' || extension == 'bmp';
    },
    GeneratePreviewClass: function(fileName, extension) {
        if (typeof extension == 'undefined')
            extension = contentUtils.ExtractFileExtension(fileName);
        var classType = '';
        switch (extension) {
            case 'xls':
            case 'xlsx':
                classType = 'excel';
                break;
            case 'pdf':
                classType = 'pdf';
                break;
            case 'ppt':
            case 'pptx':
                classType = 'powerpoint';
                break;
            case 'txt':
                classType = 'text';
                break;
            case 'doc':
            case 'docx':
                classType = 'word';
                break;
            case 'zip':
                classType = 'zip';
                break;
        }
        var awesomeClass = 'fa-file';
        if (classType.length > 0)
            awesomeClass += '-' + classType;
        awesomeClass += '-o'
        return 'fa ' + awesomeClass;
    },
    ParseFileType: function(fileName) {
        var extension = contentUtils.ExtractFileExtension(fileName);
        if (extension == '')
            return  'ללא סיומת';
        if (contentUtils.IsImageFile(fileName, extension))
            return 'תמונה';
        switch (extension) {
            case 'doc':
            case 'docx':
                return 'מסמך וורד';
            case 'xls':
            case 'xlsx':
                return 'גיליון אקסל';
            case 'pdf':
                return 'PDF';
            case 'txt':
                return 'קובץ טקסט';
            case 'zip':
            case '7z':
            case 'rar':
                return 'קובץ מכווץ';
            case 'mp4':
            case 'mpg':
            case 'mpeg':
            case 'avi':
                return 'סרטון';
        }
        return 'אחר';
    },
    CarouselAutoSlide: function(elementId) {
        var carouselElement = $('#' + elementId);
        if (carouselElement.length == 1) {
            var arrowNext = carouselElement.find('.owl-next');
            var arrowPrev = carouselElement.find('.owl-prev');
            var stopAfter = parseInt(carouselElement.data('auto-slide-stop-after'));
            if (!isNaN(stopAfter) && stopAfter >= 0) {
                for (var i = 0; i < stopAfter; i++) {
                    arrowNext.trigger('click');
                }
            } else {
                var intervalSeconds = parseInt(carouselElement.data('auto-slide-seconds'));
                if (isNaN(intervalSeconds) || intervalSeconds <= 0)
                    intervalSeconds = 3;
                var carouselAutoSlideTimer = 0;
                var arrowClick = function () {
                    if (carouselAutoSlideTimer)
                        window.clearTimeout(carouselAutoSlideTimer);
                    carouselAutoSlideTimer = window.setTimeout(function () {
                        arrowNext.trigger('click');
                    }, intervalSeconds * 1000);
                }
                arrowNext.bind('click', arrowClick);
                arrowPrev.bind('click', arrowClick);
                arrowNext.trigger('click');
            }
        } else {
            window.setTimeout(function() {
                contentUtils.CarouselAutoSlide(elementId);
            }, 100);
        }
    },
    ReadContentDescriptionAndImages: function(pageSeq, ContentService) {
        return ContentService.read(pageSeq).then(function(pageData) {
            var allImages = contentUtils.ExtractAllAttachments(pageData).filter(function(x) {
                return x.SectionType == 1;
            });
            return {
                'Description': pageData.Description,
                'Images': allImages
            };
        });
    },
    ApplyPageTypes: function(contentMapping) {
        function ParseSingleValue(value) {
            if (value != null) {
                var gotSeq = value.hasOwnProperty('Seq');
                if (sportUtils.IsInteger(value) || gotSeq) {
                    var pageSeq = gotSeq ? value.Seq : value;
                    var rawType = contentUtils.GetPageTypeBySeq(pageSeq);
                    var pageTypeName = (rawType) ? rawType.Name : 'page';
                    if (gotSeq) {
                        value.Type = pageTypeName;
                        return value;
                    } else {
                        return {
                            Seq: pageSeq,
                            Type: pageTypeName
                        };
                    }
                }

                if (value.hasOwnProperty('length')) {
                    for (var i = 0; i < value.length; i++) {
                        var currentItem = value[i];
                        value[i] = ParseSingleValue(currentItem);
                    }
                } else {
                    for (var prop in value) {
                        if (prop) {
                            var currentSubValue = value[prop];
                            value[prop] = ParseSingleValue(currentSubValue);
                        }
                    }
                }
            }

            return  value;
        }

        for (var prop in contentMapping) {
            var currentValue = contentMapping[prop];
            contentMapping[prop] = ParseSingleValue(currentValue);
        }
    }
};


(function() {
    'use strict';

    angular
        .module('sport.events')
        .controller('EventsController',
            ['$scope', '$state', '$stateParams', '$sce', '$q', '$http', '$filter', '$interval', '$timeout', 'EventsService', 'SportService', 'ContentService', 'calendarService', 'dateSelector', EventsController]);

    function EventsController($scope, $state, $stateParams, $sce, $q, $http, $filter, $interval, $timeout, EventsService, SportService, ContentService, calendarService, dateSelector) {
        var sportFieldsMapping = {};
        var allEvents = [];
        var sportFlowersEventTitle = '';
        var today = (new Date()).withoutTime();
        var flowersSportFieldName = '';
        $scope.eventFilters = {'SportFields': [], 'Championships': [], 'Categories': [], 'Calendar': null, 'Season': 0};
        $scope.sportFieldsInUse = [];
        $scope.championshipsInUse = {'All': [], 'Rows': []};
        $scope.categoriesInUse = {'All': [], 'Rows': []};
        $scope.seasons = [];
        $scope.currentSeason = sportUtils.getCurrentSeason();
        $scope.sortColumn = '+Date';
        $scope.error = '';
        $scope.noEventsInRange = false;
        $scope.sportFlowersSeq = sportGlobalSettings.FlowersFieldSeq;

        contentUtils.InitSportFieldColors($http, function() {
            window['qL_step_finished'] = true;
        });

        function DateRangeFilter(curEvent) {
            var selectedDate = $scope.eventFilters.Calendar ? $scope.eventFilters.Calendar.SelectedDate : null;
            if (selectedDate) {
                return curEvent.DateWithoutTime.isSameDate(selectedDate);
            }
            return true;
        }

        function filteredEvents() {
            var filtered = [];
            var sportFieldsFilterCount = $scope.eventFilters.SportFields.length;
            if (sportFieldsFilterCount > 0) {
                var championshipsFilterCount = $scope.eventFilters.Championships.length;
                var categoriesFilterCount = $scope.eventFilters.Categories.length;
                var sportFieldsFilterMapping = $scope.eventFilters.SportFields.toAssociativeArray();
                var championshipsFilterMapping = $scope.eventFilters.Championships.toAssociativeArray();
                var categoriesFilterMapping = $scope.eventFilters.Categories.toAssociativeArray();
                filtered = allEvents.filter(DateRangeFilter).filter(function(x) {
                    if (categoriesFilterCount > 0)
                        return categoriesFilterMapping[x.Description];
                    if (championshipsFilterCount > 0) {
                        var key = x.CHAMPIONSHIP_NAME;
                        return championshipsFilterMapping[key];
                    }
                    if (sportFieldsFilterCount > 0)
                        return sportFieldsFilterMapping[x.SPORT_ID.toString()];
                    return true;
                });
                filtered = $filter('orderBy')(filtered, $scope.sortColumn);
            }
            return filtered;
        }

        function ApplyEvents() {
            $scope.pagingService.setData(filteredEvents());
        }

        $scope.pagingService = new PagingService(filteredEvents());
        $scope.events = [];
        $scope.pagingService.applyPaging($scope.events);

        function RebuildSportFieldsInUse() {
            $scope.sportFieldsInUse = sportUtils.DistinctArray(allEvents.filter(DateRangeFilter).map(function(x) {
                return x.SPORT_ID;
            })).map(function(sportId) {
                return {
                    'Id': sportId,
                    'Name': sportFieldsMapping.Full[sportId.toString()]
                };
            });

            for (var i = 0; i < $scope.sportFieldsInUse.length; i++) {
                var curSportField = $scope.sportFieldsInUse[i];
                curSportField.SportWordCount = sportUtils.countWords(curSportField.Name);
            }

            //put blank sport fields to make it 12
            if ($scope.sportFieldsInUse.length > 0) {
                var blankItemsCount = 12 - $scope.sportFieldsInUse.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    $scope.sportFieldsInUse.push({
                        'Id': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                $scope.sportFieldsInUse.sort(function (s1, s2) {
                    return s1.Id - s2.Id;
                });
            }

            $scope.noEventsInRange = $scope.sportFieldsInUse.length == 0;
        }

        function ApplyChampionshipRows() {
            if ($scope.eventFilters.SportFields.length == 0) {
                $scope.eventFilters.Championships = [];
                $scope.championshipsInUse.Rows = [];
                return;
            }

            var sportFieldsFilterMapping = $scope.eventFilters.SportFields.toAssociativeArray();
            var matchingChampionships = $scope.championshipsInUse.All.filter(function(x) {
                return sportFieldsFilterMapping[x.SportField.toString()];
            });
            $scope.championshipsInUse.Matching = matchingChampionships;
            var championshipRows = sportUtils.SplitArray(matchingChampionships, 6);
            if (championshipRows.length > 0) {
                //put blank sport fields to make it 6
                var lastRow = championshipRows[championshipRows.length - 1];
                var blankItemsCount = 6 - lastRow.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    lastRow.push({
                        'SportField': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                for (var i = 0; i < championshipRows.length; i++) {
                    var currentRow = championshipRows[i];
                    currentRow.sort(function(c1, c2) {
                        return c1.SportField - c2.SportField;
                    });
                }
            }

            $scope.championshipsInUse.Rows = championshipRows;
        }

        function ApplyChampionshipCategories() {
            if ($scope.eventFilters.Championships.length == 0) {
                $scope.eventFilters.Categories = [];
                $scope.categoriesInUse.Rows = [];
                return;
            }

            var championshipsFilterMapping = $scope.eventFilters.Championships.toAssociativeArray();
            var matchingCategories = $scope.categoriesInUse.All.filter(function(x) {
                return championshipsFilterMapping[x.Championship];
            });
            $scope.categoriesInUse.Matching = matchingCategories;
            var categoryRows = sportUtils.SplitArray(matchingCategories, 6);
            if (categoryRows.length > 0) {
                //put blank sport fields to make it 6
                var lastRow = categoryRows[categoryRows.length - 1];
                var blankItemsCount = 6 - lastRow.length;
                for (var i = 0; i < blankItemsCount; i++) {
                    lastRow.push({
                        'SportField': 0,
                        'Name': 'Blank_' + (i + 1)
                    });
                }

                for (var i = 0; i < categoryRows.length; i++) {
                    var currentRow = categoryRows[i];
                    currentRow.sort(function(c1, c2) {
                        return  c1.SportField - c2.SportField;
                    });
                }
            }
            $scope.eventFilters.Categories = [];
            $scope.categoriesInUse.Rows = categoryRows;
        }

        function BuildEventsCalendar(firstDay, lastDay, selectedDay, applyDayEvents) {
            if (typeof selectedDay == 'undefined' || selectedDay == null)
                selectedDay = firstDay;
            if (typeof applyDayEvents == 'undefined')
                applyDayEvents = false;
            $scope.eventFilters.Calendar = calendarService.create(allEvents, selectedDay);
            var dates = [{'Date': firstDay}, {'Date': lastDay}];
            $scope.eventFilters.Calendar.addItems(dates, function (day, item) {

            });
            $scope.eventFilters.Calendar.selectedDate = selectedDay;
            $scope.eventFilters.Calendar.generateDayClass = function(day) {
                var arrClasses = [];
                if (day.currentMonth)
                    arrClasses.push('current-calendar-month');
                if (day.selected) {
                    arrClasses.push('bg-primary');
                } else if (this.selectedDate) {
                    if (day.currentMonth && day.day == this.selectedDate.getDate() &&
                        day.month == this.selectedDate.getMonth() &&
                        day.year == this.selectedDate.getFullYear()) {
                        arrClasses.push('bg-info');
                    } else if (day.currentSelection && !day.selected) {
                        arrClasses.push('bg-success');
                    }
                }
                if (day.currentMonth && day.items.length > 0)
                    arrClasses.push('enabled');
                return arrClasses.join(' ');
            };
            $scope.eventFilters.Calendar.dayClicked = function(day) {
                if (day == null || !day) {
                    this.clearDaySelection();
                    $scope.eventFilters.Calendar.SelectedDate = null;
                    RebuildSportFieldsInUse();
                    $scope.clearSportFieldFilter();
                    ApplyEvents();
                    return;
                }

                if (day.currentMonth) {
                    this.selectDay(day);
                    $scope.eventFilters.Calendar.SelectedDate = new Date(day.year, day.month, day.day);
                    RebuildSportFieldsInUse();
                    $scope.clearSportFieldFilter();
                    ApplyEvents();
                    for (var i = 0; i < $scope.sportFieldsInUse.length; i++) {
                        $scope.toggleSportFieldFilter($scope.sportFieldsInUse[i]);
                    }
                }
            };
            $scope.eventFilters.Calendar.selectMonth();

            if (applyDayEvents) {
                var selectedYear = selectedDay.getFullYear();
                var selectedMonth = selectedDay.getMonth();
                var selectedDay = selectedDay.getDate();
                $timeout(function() {
                    var found = false;
                    for (var i = 0; i < $scope.eventFilters.Calendar.selectedMonth.weeks.length; i++) {
                        if (found)
                            break;
                        var curWeek = $scope.eventFilters.Calendar.selectedMonth.weeks[i];
                        for (var j = 0; j < curWeek.days.length; j++) {
                            var curWeekDay = curWeek.days[j];
                            if (curWeekDay.currentMonth && curWeekDay.year == selectedYear && curWeekDay.month == selectedMonth && curWeekDay.day == selectedDay) {
                                found = true;
                                $scope.eventFilters.Calendar.dayClicked(curWeekDay);
                                break;
                            }
                        }
                    }
                }, 500);
            }
        }

        function InitializeSeasonTimer() {
            function GetSelectedSeason() {
                if ($scope.seasons && $scope.seasons.length > 0) {
                    var rawText = $.trim($('#ddlSeason').find('.select_title').text());
                    var matchingSeasons = $scope.seasons.filter(function (x) {
                        return x.Name == rawText;
                    });
                    if (matchingSeasons.length > 0) {
                        var selectedSeason = matchingSeasons[0];
                        return selectedSeason;
                    }
                }
                return null;
            }

            $interval(function () {
                var selectedSeason = GetSelectedSeason();
                if (selectedSeason != null && selectedSeason.Season != $scope.eventFilters.Season) {
                    $scope.eventFilters.Season = selectedSeason.Season;
                    ReadAllEvents().then(function() {
                        $scope.eventFilters.Calendar.dayClicked(null);
                        BuildEventsCalendar(selectedSeason.FirstDay, selectedSeason.LastDay, null, false);
                        $scope.clearSportFieldFilter();
                    });
                }
            }, 500);
        }

        function ReadSportFields() {
            SportService.sportFields(true).then(function(mapping) {
                window['qL_step_finished'] = true;
                sportFieldsMapping = mapping;
                ChainFactory.Next();
            }, function(err) {
                console.log('error reading sport fields: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadSeasons() {
            $scope.seasons = [];
            SportService.seasons.inUse().then(function(seasonsInUse) {
                window['qL_step_finished'] = true;
                seasonsInUse.sort(function (s1, s2) {
                    return s1.Season - s2.Season;
                });
                for (var i = 0; i < seasonsInUse.length; i++) {
                    var curSeasonInUse = seasonsInUse[i];
                    if (($scope.currentSeason.Season == 0 && curSeasonInUse.IsCurrent) ||
                        ($scope.currentSeason.Season > 0 && curSeasonInUse.Season == $scope.currentSeason.Season)) {
                        $scope.currentSeason = curSeasonInUse;
                        $scope.eventFilters.Season = $scope.currentSeason.Season;
                    }
                    $scope.seasons.push(curSeasonInUse);
                }
                window.setTimeout(function() {
                    sportUtils.InitCustomSelect();
                }, 100);
                ChainFactory.Next();
            }, function(err) {
                console.log('error getting seasons');
                console.log(err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllEvents() {
            var deferred = $q.defer();
            allEvents = [];
            var selectedSeason = $scope.eventFilters.Season || 0;
            var sportsmanParams = {'mergeSameDayEvents': false};
            if (selectedSeason > 0)
                sportsmanParams.season = selectedSeason;
            var flowersParams = (selectedSeason > 0) ? {'season': selectedSeason} : {};
            EventsService.sportsmanEvents(sportsmanParams).then(function(sportsmanEvents) {
                window['qL_step_finished'] = true;
                for (var i = 0; i < sportsmanEvents.length; i++) {
                    var curEvent = sportsmanEvents[i];
                    curEvent.TeamA = eventsUtils.BuildTeamName(curEvent, 'A');
                    curEvent.TeamB = eventsUtils.BuildTeamName(curEvent, 'B');
                    curEvent.Description = curEvent.CHAMPIONSHIP_NAME + ' ' + curEvent.CATEGORY_NAME;
                    curEvent.GameDetails = eventsUtils.BuildGameDetails(curEvent);
                    curEvent.EventType = 1;
                    allEvents.push(curEvent);
                }

                EventsService.sportFlowersEvents(flowersParams).then(function(sportFlowersEvents) {
                    window['qL_step_finished'] = true;
                    for (var i = 0; i < sportFlowersEvents.length; i++) {
                        var curEvent = sportFlowersEvents[i];
                        curEvent.SPORT_NAME = flowersSportFieldName;
                        curEvent.SPORT_ID = sportGlobalSettings.FlowersFieldSeq;
                        curEvent.Description = curEvent.SportFieldName + ' ' + (curEvent.FacilityName || '');
                        curEvent.FACILITY_NAME = curEvent.FacilityName;
                        curEvent.CHAMPIONSHIP_NAME = sportFlowersEventTitle + ' ' + curEvent.EventName;
                        curEvent.GameDetails = '';
                        curEvent.EventType = 2;
                        allEvents.push(curEvent);
                    }

                    EventsService.practiceCampEvents(flowersParams).then(function(practiceCampEvents) {
                        window['qL_step_finished'] = true;
                        for (var i = 0; i < practiceCampEvents.length; i++) {
                            var curEvent = practiceCampEvents[i];
                            curEvent.SPORT_ID = sportGlobalSettings.YoungSportsmenSeq;
                            curEvent.Description = 'מחנה אימון ' + curEvent.SPORT_NAME;
                            curEvent.GameDetails = '';
                            curEvent.EventType = 3;
                            allEvents.push(curEvent);
                        }

                        ContentService.list(7, 0, false).then(function(customEvents) {
                            window['qL_step_finished'] = true;
                            for (var i = 0; i < customEvents.length; i++) {
                                var curEvent = customEvents[i];
                                curEvent.SPORT_ID = curEvent.SportFieldSeq;
                                curEvent.SPORT_NAME = sportFieldsMapping.Full[curEvent.SPORT_ID.toString()] || 'אירוע';
                                curEvent.GameDetails = '';
                                curEvent.EventType = 5;
                                allEvents.push(curEvent);
                            }

                            allEvents.forEach(function(curEvent) {
                                curEvent.DateWithoutTime = curEvent.Date.withoutTime();
                                curEvent.ShortSportName = sportFieldsMapping.Short[curEvent.SPORT_ID.toString()] || curEvent.SPORT_NAME;
                                curEvent.SportWordCount = sportUtils.countWords(curEvent.ShortSportName);
                            });

                            allEvents.sort(function(e1, e2) {
                                return e1.Date.getTime() - e2.Date.getTime();
                            });

                            var championshipSportFieldMapping = allEvents.toAssociativeArray(true, 'CHAMPIONSHIP_NAME', 'SPORT_ID');
                            $scope.championshipsInUse.All = sportUtils.DistinctArray(allEvents.map(function(x) {
                                return x.CHAMPIONSHIP_NAME;
                            })).map(function(champName) {
                                return {
                                    'Name': champName,
                                    'SportField': championshipSportFieldMapping[champName] || sportGlobalSettings.FlowersFieldSeq
                                };
                            });
                            ApplyChampionshipRows();

                            $scope.categoriesInUse.All = [];
                            var categoryMapping = {};
                            for (var i = 0; i < allEvents.length; i++) {
                                var curEvent = allEvents[i];
                                var curName = (curEvent.SPORT_ID == sportGlobalSettings.FlowersFieldSeq) ? curEvent.Description : curEvent.CATEGORY_NAME;
                                var champName = (curEvent.SPORT_ID == sportGlobalSettings.FlowersFieldSeq) ? curEvent.Description : curEvent.CHAMPIONSHIP_NAME;
                                var key = curEvent.SPORT_ID + '_' + curName;
                                if (!categoryMapping[key]) {
                                    $scope.categoriesInUse.All.push({
                                        'Name': curName,
                                        'Championship': champName,
                                        'SportField': curEvent.SPORT_ID
                                    });
                                    categoryMapping[key] = true;
                                }
                            }
                            ApplyChampionshipCategories();
                            RebuildSportFieldsInUse();
                            ApplyEvents();
                            window['qL_Finish_Now'] = true;
                            deferred.resolve('done');
                        }, function(err) {
                            console.log('error reading custom events');
                            window['qL_Finish_Now'] = true;
                            console.log(err);
                            deferred.reject('שגיאה בעת  טעינת נתונים מהשרת');
                        });
                    }, function(err) {
                        console.log('error reading practice camp events');
                        window['qL_Finish_Now'] = true;
                        console.log(err);
                        deferred.reject('שגיאה בעת  טעינת נתונים מהשרת');
                    });
                }, function(err) {
                    console.log('error reading sportsman events');
                    window['qL_Finish_Now'] = true;
                    console.log(err);
                    deferred.reject('שגיאה בעת  טעינת נתונים מהשרת');
                });
            }, function(err) {
                console.log('error reading sport flowers events');
                window['qL_Finish_Now'] = true;
                console.log(err);
                deferred.reject('שגיאה בעת  טעינת נתונים מהשרת');
            });
            return deferred.promise;
        }

        function InitializeEvents() {
            flowersSportFieldName = sportFieldsMapping.Full[sportGlobalSettings.FlowersFieldSeq.toString()];
            if (sportFlowersEventTitle.length == 0)
                sportFlowersEventTitle =  'אירוע ' + flowersSportFieldName;

            ReadAllEvents().then(function() {
                var stateDate = $stateParams.date;
                var applyDayEvents = true;
                var selectedDate = sportUtils.parseDate(stateDate);
                if (selectedDate == null) {
                    applyDayEvents = false;
                    var today = new Date();
                    selectedDate = (today >= $scope.currentSeason.FirstDay && today <= $scope.currentSeason.LastDay) ? today : $scope.currentSeason.FirstDay;
                }
                BuildEventsCalendar($scope.currentSeason.FirstDay, $scope.currentSeason.LastDay, selectedDate, applyDayEvents);
                InitializeSeasonTimer();
                if (localStorage['EventsSportFieldFilter']) {
                    var sportFieldSeq = parseInt(localStorage['EventsSportFieldFilter']);
                    var matchingSportField = $scope.sportFieldsInUse.findItem(function(x) {
                        return x.Id == sportFieldSeq;
                    });
                    if (matchingSportField != null) {
                        localStorage.removeItem('EventsSportFieldFilter');
                        $scope.toggleSportFieldFilter(matchingSportField);
                    }
                }
                ChainFactory.Next();
            }, function(err) {
                $scope.error = err;
                ChainFactory.Next();
            });
        }

        ChainFactory.Execute(ReadSportFields, ReadSeasons, InitializeEvents);

        window['qL_steps_amount'] = 6;

        $scope.sortBy = function (fieldName) {
            if ($scope.sortColumn === "+" + fieldName) {
                $scope.sortColumn = "-" + fieldName;
            }
            else {
                $scope.sortColumn = "+" + fieldName;
            }
            ApplyEvents();
        };

        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;

        $scope.getDateFilterText = function(filterValue) {
            if (filterValue == null || !filterValue)
                return '[ללא הגבלה]';
            return $filter('date')(filterValue, 'dd/MM/yyyy');
        };

        $scope.sportFlowersChampFilterCount = function() {
            if ($scope.championshipsInUse.Rows.length > 0) {
                var sportFieldItemsCount = 0;
                for (var i = 0; i < $scope.championshipsInUse.Rows.length; i++) {
                    var currentRow = $scope.championshipsInUse.Rows[i];
                    sportFieldItemsCount += currentRow.filter(function(x) {
                        return x.Name.indexOf(sportFlowersEventTitle) == 0;
                    }).length;
                }
                return sportFieldItemsCount;
            }
            return  0;
        };

        $scope.totalChampionshipsInUse = function() {
            var total = 0;
            for (var i = 0; i < $scope.championshipsInUse.Rows.length; i++) {
                total += $scope.championshipsInUse.Rows[i].filter(function(x) {
                    return x.SportField > 0;
                }).length;
            }
            return total;
        };

        $scope.getSportFieldFilterStyle = function(sportFieldOrChampionship) {
            var sportFieldSeq = sportFieldOrChampionship.Id || sportFieldOrChampionship.SportField;
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            var sportFieldFilterStyle = sportUtils.getRoundedRectangleStyle(sportFieldOrChampionship, bgColor);
            if (sportFieldOrChampionship.SportWordCount && sportFieldOrChampionship.SportWordCount > 2)
                sportFieldFilterStyle += ' line-height: inherit;';
            return sportFieldFilterStyle;
        };

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            var bgColor = contentUtils.getSportFieldColor(sportFieldSeq);
            return 'background-color: ' + bgColor + '; border-color: ' + bgColor + ';';
        };

        $scope.toggleSportFieldFilter = function(sportField) {
            var sportFieldSeq = sportField.Id;
            var key = sportFieldSeq.toString();
            var filterMapping = $scope.eventFilters.SportFields.toAssociativeArray();
            filterMapping[key] = !filterMapping[key];
            sportField.Selected = filterMapping[key];
            $scope.eventFilters.SportFields = sportUtils.FlattenAssociativeArray(filterMapping, true);

            //remove selected championships
            $scope.championshipsInUse.All.filter(function(x) {
                return x.SportField == sportFieldSeq && x.Selected;
            }).forEach(function(championship) {
                $scope.toggleChampionshipFilter(championship);
            });

            ApplyChampionshipRows();
            ApplyEvents();
        };

        $scope.toggleChampionshipFilter = function(championship) {
            var champName = championship.Name;
            var filterMapping = $scope.eventFilters.Championships.toAssociativeArray();
            filterMapping[champName] = !filterMapping[champName];
            championship.Selected = filterMapping[champName];
            $scope.eventFilters.Championships = sportUtils.FlattenAssociativeArray(filterMapping, true);
            ApplyChampionshipCategories();
            ApplyEvents();
        };

        $scope.toggleCategoryFilter = function(category) {
            var catName = category.Name;
            var champName = category.Championship;
            var filterKey = champName;
            if (catName != champName)
                filterKey += ' ' + catName;
            var filterMapping = $scope.eventFilters.Categories.toAssociativeArray();
            filterMapping[filterKey] = !filterMapping[filterKey];
            category.Selected = filterMapping[filterKey];
            $scope.eventFilters.Categories = sportUtils.FlattenAssociativeArray(filterMapping, true);
            //console.log(category);
            ApplyEvents();
        };

        $scope.clearSportFieldFilter = function() {
            $scope.eventFilters.SportFields = [];
            for (var i = 0; i < $scope.sportFieldsInUse.length; i++) {
                $scope.sportFieldsInUse[i].Selected = false;
            }
            ApplyChampionshipRows();
            ApplyChampionshipCategories();
            ApplyEvents();
        };

        $scope.clearChampionshipFilter = function() {
            $scope.eventFilters.Championships = [];
            for (var i = 0; i < $scope.championshipsInUse.Rows.length; i++) {
                var currentRow = $scope.championshipsInUse.Rows[i];
                for (var j = 0; j < currentRow.length; j++) {
                    currentRow[j].Selected = false;
                }
            }
            $scope.clearCategoriesFilter();
            ApplyEvents();
        };

        $scope.clearCategoriesFilter = function() {
            $scope.eventFilters.Categories = [];
            for (var i = 0; i < $scope.categoriesInUse.Rows.length; i++) {
                var currentRow = $scope.categoriesInUse.Rows[i];
                for (var j = 0; j < currentRow.length; j++) {
                    currentRow[j].Selected = false;
                }
            }
            ApplyChampionshipCategories();
            ApplyEvents();
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.events')
        .factory('EventsService',
        ['$http', '$httpParamSerializer', '$filter', 'SportService', EventsService]);

    function DateSanityFilter(eventData) {
        if (eventData.Date && eventData.Date.getFullYear) {
            var year = eventData.Date.getFullYear();
            return year >= 2000 && year <= 2100;
        }
        return true;
    }

    function EventsService($http, $httpParamSerializer, $filter, SportService) {
        function onRead(eventData) {
            if (eventData.StartDate)
                eventData.Date = new Date(eventData.StartDate);
            else if (eventData.DateTime)
                eventData.Date = new Date(eventData.DateTime);
            else if (eventData.TIME)
                eventData.Date = new Date(eventData.TIME);
            if (eventData.Date)
                eventData.MonthName = sportUtils.HebrewMonthName(eventData.Date.getMonth() + 1);
            if (eventData.TEAM_A_SCORE || eventData.TEAM_B_SCORE) {
                if (eventData.MatchResult == null) {
                    eventData.TEAM_A_SCORE = null;
                    eventData.TEAM_B_SCORE = null;
                }
            }
        }

        function onWrite(eventData) {

        }

        return {
            sportFlowersEvents: function (options) {
                if (typeof options == 'undefined')
                    options = {};
                var season = options.season;
                var url = '/api/flowers/events';
                if (season) {
                    var params = $httpParamSerializer({season: season});
                    url += '?' + params;
                }
                return $http.get(url).then(function(resp) {
                    for (var i = 0; i < resp.data.length; i++) {
                        onRead(resp.data[i]);
                    }
                    return resp.data.filter(DateSanityFilter);
                });
            },
            sportsmanEvents: function (options) {
                if (typeof options == 'undefined')
                    options = {};
                var mergeSameDayEvents = options.mergeSameDayEvents || false;
                return SportService.currentSeason(options.season).then(function(season) {
                    var category = options.category || 0;
                    var url = '/api/sportsman/events';
                    if (season || category) {
                        var params = $httpParamSerializer({season: season, category: category});
                        url += '?' + params;
                    }
                    return $http.get(url).then(function(resp) {
                        for (var i = 0; i < resp.data.length; i++) {
                            onRead(resp.data[i]);
                        }
                        if (mergeSameDayEvents) {
                            //merge events from same championship in same day
                            var dailyEventsMapping = {};
                            for (var i = 0; i < resp.data.length; i++) {
                                var curEvent = resp.data[i];
                                var curDate = curEvent.Date ? curEvent.Date : new Date();
                                var key = $filter('date')(curDate, 'dd/MM/yyyy') + '_' + (curEvent.CHAMPIONSHIP_NAME + ' ' + curEvent.CATEGORY_NAME);
                                if (!dailyEventsMapping[key])
                                    dailyEventsMapping[key] = [];
                                dailyEventsMapping[key].push(curEvent);
                            }
                            var allEvents = [];
                            for (var key in dailyEventsMapping) {
                                var dailyEvents = dailyEventsMapping[key];
                                if (dailyEvents.length <= 1) {
                                    sportUtils.CopyArray(dailyEvents, allEvents);
                                } else {
                                    var mergedEvent = dailyEvents[0];
                                    mergedEvent.DailyEvents = [];
                                    sportUtils.CopyArray(dailyEvents, mergedEvent.DailyEvents);
                                    allEvents.push(mergedEvent);
                                }
                            }
                            return allEvents.filter(DateSanityFilter);
                        } else {
                            return resp.data.filter(DateSanityFilter);
                        }
                    });
                });
            },
            practiceCampEvents: function (options) {
                if (typeof options == 'undefined')
                    options = {};
                return SportService.currentSeason(options.season).then(function(season) {
                    var url = '/api/sportsman/practice-camps';
                    if (season) {
                        var params = $httpParamSerializer({season: season});
                        url += '?' + params;
                    }
                    return $http.get(url).then(function(resp) {
                        for (var i = 0; i < resp.data.length; i++) {
                            var practiceCamp = resp.data[i];
                            practiceCamp.DATE_START = new Date(practiceCamp.DATE_START);
                            practiceCamp.DATE_FINISH = new Date(practiceCamp.DATE_FINISH);
                            practiceCamp.Date = practiceCamp.DATE_START;
                        }
                        return resp.data;
                    });
                });
            },
            eventsRange: function() {
                var url = '/api/common/eventsRange';
                return $http.get(url).then(function(resp) {
                    for (var prop in resp.data)
                        resp.data[prop] = new Date(resp.data[prop]);
                    return resp.data;
                });
            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.flowers')
        .controller('FlowersController',
            ['$scope', '$state', '$http', '$filter', 'ContentService', 'EventsService', 'SportService', FlowersController]);

    function FlowersController($scope, $state, $http, $filter, ContentService, EventsService, SportService) {
        var sportFieldsMapping = {};
        $scope.upcomingEvents = [];
        $scope.recentContent = [];
        $scope.messages = [];
        $scope.attachments = [];
        $scope.error = false;
        $scope.messageLoadingError = false;
        $scope.attachmentsLoadingError = false;
        $scope.contentAutoSlideInterval = 5;

        function LoadError(err) {
            console.log('general error')
            console.log(err);
            window['qL_Finish_Now'] = true;
            $scope.error = true;
            ChainFactory.Next();
        }

        function ReadSportFieldColors() {
            contentUtils.InitSportFieldColors($http, function() {
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadSportFields() {
            SportService.sportFields().then(function(mapping) {
                sportFieldsMapping = mapping;
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error reading sport fields');
                console.log(err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAttachments() {
            $http.get('/api/flowers/attachments').then(function(resp) {
                $scope.attachments = resp.data;
                for (var i = 0; i < $scope.attachments.length; i++) {
                    var curAttachment = $scope.attachments[i];
                    if (curAttachment.DateUploaded)
                        curAttachment.DateUploaded = new Date(curAttachment.DateUploaded);
                    curAttachment.FileType = contentUtils.ParseFileType(curAttachment.FileName);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error loading attachments');
                console.log(err);
                window['qL_step_finished'] = true;
                $scope.attachmentsLoadingError = true;
                ChainFactory.Next();
            });
        }

        function ReadMessages() {
            $http.get('/api/flowers/messages').then(function(resp) {
                $scope.messages = resp.data;
                for (var i = 0; i < $scope.messages.length; i++) {
                    var curMessage = $scope.messages[i];
                    if (curMessage.DateCreated)
                        curMessage.DateCreated = new Date(curMessage.DateCreated);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error loading messages');
                console.log(err);
                window['qL_step_finished'] = true;
                $scope.messageLoadingError = true;
                ChainFactory.Next();
            });
        }

        function ReadEvents() {
            $scope.upcomingEvents = [];
            var today = (new Date()).withoutTime();
            EventsService.sportFlowersEvents().then(function (sportFlowersEvents) {
                var flowerEvents = [];
                for (var i = 0; i < sportFlowersEvents.length; i++) {
                    var curEvent = sportFlowersEvents[i];
                    if (curEvent.Date.withoutTime() >= today) {
                        curEvent.SportFieldSeq = sportGlobalSettings.FlowersFieldSeq;
                        curEvent.Name = sportFieldsMapping[sportGlobalSettings.FlowersFieldSeq.toString()] + ' ' + curEvent.SportFieldName;
                        curEvent.Details = curEvent.FacilityName;
                        flowerEvents.push(curEvent);
                    }
                }

                flowerEvents.sort(function (e1, e2) {
                    return e1.Date.getTime() - e2.Date.getTime();
                });

                $scope.upcomingEvents = flowerEvents;
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, LoadError);
        }

        function ReadRecentContent() {
            ContentService.recent(0, {
                'amount': sportGlobalSettings.RecentFlowersContent,
                'sportField': sportGlobalSettings.FlowersFieldSeq,
                'takeAll': true
            }).then(function (contentPages) {
                $scope.recentContent = contentPages['Type_0'];
                contentUtils.ApplyPagesData($scope.recentContent);
                for (var i = 0; i < $scope.recentContent.length; i++) {
                    var contentPage = $scope.recentContent[i];
                    contentPage.HebrewType = contentUtils.HebrewPageType(contentPage.Type);
                    contentPage.BannerButtonClass = 'button banner_button ' + contentUtils.GetBannerType(contentPage.Type);
                }
                window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            }, LoadError);
        }

        ChainFactory.Execute(ReadSportFields, ReadSportFieldColors, ReadEvents, ReadMessages, ReadAttachments, ReadRecentContent);

        window['qL_steps_amount'] = 6;

        window.setTimeout(function() {
            contentUtils.CarouselAutoSlide('contentCarousel');
        }, $scope.contentAutoSlideInterval * 1000);

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            return 'background-color: ' + contentUtils.getSportFieldColor(sportFieldSeq) + ';';
        };

        $scope.GoToEvent = function(event) {
            $state.go('events.date', {date: $filter('date')(event.Date, 'ddMMyyyy')});
        };

        $scope.getEventDateStyle = function(eventData, index) {
            var styles = [];
            var marginTop = (index == 0) ? 10 : 0;
            styles.push($scope.getSportFieldStyle(eventData.SportFieldSeq));
            styles.push('width: 60px;');
            styles.push('color: white;');
            styles.push('padding: 5px 5px 5px 5px;');
            styles.push('margin-top: ' + marginTop + 'px;');
            styles.push('border: 2px solid ' + contentUtils.getSportFieldColor(eventData.SportFieldSeq) + ';');
            styles.push('border-radius: 5px;');
            styles.push('cursor: pointer');
            return styles.join(' ');
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.home')
        .controller('HomeController',
            ['$scope', '$state', '$http', '$filter', '$timeout', 'ContentService', 'EventsService', 'SportService', HomeController]);

    function HomeController($scope, $state, $http, $filter, $timeout, ContentService, EventsService, SportService) {
        var allFutureEvents = [];
        var sportFieldsMapping = {};
        var _DEBUG = false;
        $scope.error = false;
        $scope.activeEventsTab = 1;
        $scope.sponsorAutoSlideInterval = 5;
        $scope.partnersAutoSlideInterval = 5;
        $scope.contentMapping = {};
        $scope.sportFlowersSeq = sportGlobalSettings.FlowersFieldSeq;


        if (sportUtils.IsMobile()) {
            $state.go('home-mobile');
            return;
        }

        sportUtils.FrameAutoSize({'Id': 'facebook_likebox_frame', 'Src': 'https://www.facebook.com/plugins/likebox.php?href=http%3A%2F%2Fwww.facebook.com%2Fisrschspo&width=$width&colorscheme=light&show_faces=true&border_color&stream=true&height=462'});

        function DebugProgress(caption, stage) {
            if (_DEBUG) {
                var msg = '';
                switch (stage) {
                    case 1:
                        msg = 'reading ';
                        break;
                    case 2:
                        msg = 'finished to read ';
                        break;
                    case 3:
                        msg = 'error while reading ';
                        break;
                }
                msg += caption + ((stage == 1) ? '...' : '');
                console.log(msg);
            }
        }

        function FinishStep(caption, nextChainBlock) {
            if (typeof nextChainBlock == 'undefined')
                nextChainBlock = true;
            window['qL_step_finished'] = true;
            if (caption && caption.length > 0)
                $scope[caption + 'LoadFinished'] = true;
            if (nextChainBlock)
                ChainFactory.Next();
        }

        function LoadError(caption, callback) {
            if (typeof callback == 'undefined')
                callback = null;
            return function() {
                if (caption && caption.length > 0)
                    $scope[caption + 'LoadError'] = true;
                FinishStep(caption, false);
                ChainFactory.Next();
                if (callback != null) {
                    callback();
                }
            };
        }

        function RebuildUpcomingEvents() {
            $scope.upcomingEvents = allFutureEvents.filter(function(x) {
                return $scope.activeEventsTab == 1 || ($scope.activeEventsTab - 1) == x.Type;
            });
            window.setTimeout(function() {
                if (typeof EventsLoadedHandler != 'undefined') {
                    EventsLoadedHandler();
                }
            }, 500);
        }

        function ReadSportFieldColors(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            DebugProgress('sport field colors', 1);
            contentUtils.InitSportFieldColors($http, function() {
                DebugProgress('sport field colors', 2);
                ChainFactory.Next();
                if (callback != null) {
                    callback();
                }
            });
        }

        function ReadCroppedImages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            DebugProgress('cropped images', 1);
            contentUtils.InitCroppedImages($http, function() {
                DebugProgress('cropped images', 2);
                ChainFactory.Next();
                if (callback != null) {
                    callback();
                }
            });
        }

        function ReadSportFields(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            DebugProgress('sport fields', 1);
            SportService.sportFields().then(function(mapping) {
                DebugProgress('sport fields', 2);
                sportFieldsMapping = mapping;
                FinishStep('sportFields');
                if (callback != null)
                    callback();
            }, LoadError('sportFields', callback));
        }

        function ReadFeaturedPages() {
            DebugProgress('featured pages', 1);
            ContentService.featured().then(function(contentPages) {
                $scope.featuredPages = contentPages;
                contentUtils.ApplyPagesData($scope.featuredPages);
                for (var i = 0; i < $scope.featuredPages.length; i++) {
                    var curPage = $scope.featuredPages[i];
                    curPage.BannerCssClass = 'button banner_button ' + contentUtils.GetBannerType(curPage.Type);
                    curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                }
                DebugProgress('featured pages', 2);
                FinishStep('featuredPages');

                sportUtils.DoWhenReady('.tp-bgimg.defaultimg', function(element) {
                    var bgImage = element.css('background-image');
                    if (bgImage == null || !bgImage || bgImage == 'none') {
                        var dataImage = element.data('src');
                        if (dataImage && dataImage.length > 0)
                            element.css('background-image', 'url("' + dataImage + '")');
                    }
                });
            }, LoadError('featuredPages'));
        }

        function ReadAdvertisements(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            DebugProgress('advertisements', 1);
            var cacheBuster = (new Date()).getTime();
            $http.get('/api/Banners?type=1&randomize=1&nnn=' + cacheBuster).then(function(resp) {
                if (resp.data && resp.data.Seq) {
                    $scope.advertisementBanner = resp.data;
                    $scope.advertisementBanner.VideoPath = '/content/Banners/' + $scope.advertisementBanner.Seq + '/' + $scope.advertisementBanner.FileName;
                }
                DebugProgress('advertisements', 2);
                FinishStep('advertisements');
                if (callback != null)
                    callback();
            }, LoadError('advertisements', callback));
        }

        function ReadRecentPages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            DebugProgress('recent pages', 1);
            ContentService.recent([3, 1, 2]).then(function(combinedPages) {
                $scope.recentVideos = combinedPages.Type_3;
                contentUtils.ApplyPagesData($scope.recentVideos);
                $scope.recentGalleries = combinedPages.Type_1;
                contentUtils.ApplyPagesData($scope.recentGalleries);
                $scope.recentArticles = combinedPages.Type_2;
                contentUtils.ApplyPagesData($scope.recentArticles);
                DebugProgress('recent pages', 2);
                FinishStep('recentPages');
                if (callback != null)
                    callback();
            }, LoadError('recentPages', callback));
        }

        function ReadEvents(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            allFutureEvents = [];
            var today = (new Date()).withoutTime();
            DebugProgress('flowers events', 1);
            EventsService.sportFlowersEvents().then(function (sportFlowersEvents) {
                DebugProgress('flowers events', 2);
                for (var i = 0; i < sportFlowersEvents.length; i++) {
                    var curEvent = sportFlowersEvents[i];
                    if (curEvent.Date.withoutTime() >= today) {
                        curEvent.SportFieldSeq = sportGlobalSettings.FlowersFieldSeq;
                        curEvent.Type = 1;
                        curEvent.Name = sportFieldsMapping[sportGlobalSettings.FlowersFieldSeq.toString()] + ' ' + curEvent.SportFieldName;
                        curEvent.Details = curEvent.FacilityName;
                        allFutureEvents.push(curEvent);
                    }
                }

                DebugProgress('sportsman events', 1);
                EventsService.sportsmanEvents({'mergeSameDayEvents': true}).then(function (sportsmanEvents) {
                    DebugProgress('sportsman events', 2);
                    for (var i = 0; i < sportsmanEvents.length; i++) {
                        var curEvent = sportsmanEvents[i];
                        if (curEvent.Date.withoutTime() >= today) {
                            curEvent.SportFieldSeq = curEvent.SPORT_ID;
                            curEvent.Type = (parseInt(curEvent.IS_CLUBS)  == 1) ? 5 : 4;
                            curEvent.Name = curEvent.CHAMPIONSHIP_NAME + ' ' + curEvent.CATEGORY_NAME;
                            curEvent.Details = eventsUtils.BuildSportsmanDetails(curEvent);
                            allFutureEvents.push(curEvent);
                        }
                    }

                    allFutureEvents.sort(function (e1, e2) {
                        return e1.Date.getTime() - e2.Date.getTime();
                    });

                    RebuildUpcomingEvents();
                    DebugProgress('all events', 2);
                    FinishStep('events');
                    if (callback != null)
                        callback();
                }, LoadError('events', callback));
            }, LoadError('events', callback));
        }

        function ApplySlider() {
            window.setTimeout(function() {
                $('.tp-banner').revolution({
                    delay: 9000,
                    autoStart: false,
                    startwidth: 1170,
                    startheight: 500,
                    fullWidth: "on",
                    hideTimerBar: "on",
                    navigationType: "none",
                    navigationArrows: "solo",
                    navigationStyle: "square",
                    soloArrowLeftVOffset: 80,
                    soloArrowRightVOffset: 80
                });
                //$('.rev_slider').parent().find('.tp-bullets').remove();
            }, 50);
            ChainFactory.Next();
        }

        function LoadContentMapping(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            $http.get('/api/common/content-mapping').then(function(resp) {
                $scope.contentMapping = resp.data;
                var roadTripPartnersSeq = $scope.contentMapping.RoadTripPartners;
                contentUtils.ReadContentDescriptionAndImages(roadTripPartnersSeq, ContentService).then(function(resp) {
                    $scope.contentMapping.RoadTripPartners = {
                        Seq: roadTripPartnersSeq,
                        Images: resp.Images,
                        Description: resp.Description
                    };
                    window.setTimeout(function() {
                        contentUtils.CarouselAutoSlide('sponsorsCarousel');
                    }, 1000);

                    var businessPartnersSeq = $scope.contentMapping.BusinessPartners;
                    contentUtils.ReadContentDescriptionAndImages(businessPartnersSeq, ContentService).then(function(resp) {
                        $scope.contentMapping.BusinessPartners = {
                            Seq: businessPartnersSeq,
                            Images: resp.Images,
                            Description: resp.Description
                        };
                        window.setTimeout(function() {
                            contentUtils.CarouselAutoSlide('partnersCarousel');
                        }, 1000);
                        if (callback != null) {
                            callback();
                        }
                    }, function(err) {
                        console.log('error reading Business Partners images');
                        console.log(err);
                        if (callback != null) {
                            callback();
                        }
                    });
                }, function(err) {
                    console.log('error reading Road Trip Partners images');
                    console.log(err);
                    if (callback != null) {
                        callback();
                    }
                });
            });
        }

        function LateLoadData() {
            ReadSportFields();
            ReadSportFieldColors();
            ReadEvents();
            LoadContentMapping();
            ReadCroppedImages();
            ReadRecentPages();
            ReadAdvertisements();
        }

        var chkReadyState = setInterval(function() {
            if (document.readyState == "complete") {
                // clear the interval
                clearInterval(chkReadyState);

                //late loading
                $timeout(function() {
                    LateLoadData();
                }, 1000);
            }
        }, 100);

        ChainFactory.Execute(ReadFeaturedPages, ApplySlider);
        window['qL_steps_amount'] = 2;

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 5000);

        sportUtils.InitiateScrollToTopProcess();

        $scope.changeEventsTab = function(tab) {
            $scope.activeEventsTab = tab;
            RebuildUpcomingEvents();
        };

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            return 'background-color: ' + contentUtils.getSportFieldColor(sportFieldSeq) + ';';
        };

        $scope.GoToPage = function(pageSeq) {
            $state.go('page', {page: pageSeq});
        };

        $scope.GoToEvent = function(event) {
            $state.go('events.date', {date: $filter('date')(event.Date, 'ddMMyyyy')});
        };

        $scope.getEventDateStyle = function(eventData, index) {
            var styles = [];
            var marginTop = (index == 0) ? 10 : 0;
            styles.push($scope.getSportFieldStyle(eventData.SportFieldSeq));
            styles.push('width: 60px;');
            styles.push('color: white;');
            styles.push('padding: 5px 5px 5px 5px;');
            styles.push('margin-top: ' + marginTop + 'px;');
            styles.push('border: 2px solid ' + contentUtils.getSportFieldColor(eventData.SportFieldSeq) + ';');
            styles.push('border-radius: 5px;');
            styles.push('cursor: pointer');
            return styles.join(' ');
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.mobile')
        .controller('HomeMobileController',
        ['$scope', '$state', '$http', '$filter', '$timeout', 'ContentService', 'EventsService', 'SportService', HomeMobileController]);

    function HomeMobileController($scope, $state, $http, $filter, $timeout, ContentService, EventsService, SportService) {
        $scope.firstFeaturedArticle = null;
        $scope.firstFeaturedGallery = null;
        $scope.categoriesData = [];
        $scope.links = null;
        $scope.sponsorAutoSlideInterval = 5;
        $scope.partnersAutoSlideInterval = 5;

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);

        var qs = sportUtils.ParseQueryString();
        var autoSelectionCategoryId = qs['c'] || 0;

        function FinishStep(caption) {
            $scope[caption + 'LoadFinished'] = true;
        }

        function LoadError(caption, callback) {
            if (typeof callback == 'undefined')
                callback = null;
            return function() {
                if (caption && caption.length > 0)
                    $scope[caption + 'LoadError'] = true;
                FinishStep(caption);
                if (callback != null) {
                    callback();
                }
            };
        }

        function ReadCroppedImages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            contentUtils.InitCroppedImages($http, function() {
                if (callback != null) {
                    callback();
                }
            });
        }

        function ReadRecentPages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            ContentService.recent([3, 1, 2]).then(function(combinedPages) {
                $scope.recentVideos = combinedPages.Type_3;
                contentUtils.ApplyPagesData($scope.recentVideos);
                $scope.recentGalleries = combinedPages.Type_1;
                contentUtils.ApplyPagesData($scope.recentGalleries);
                $scope.recentArticles = combinedPages.Type_2;
                contentUtils.ApplyPagesData($scope.recentArticles);
                if (callback != null)
                    callback();
            }, LoadError('recentPages', callback));
        }

        function LoadContentMapping(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            $scope.contentMapping = sportUtils.shallowCopy($scope.globalData.contentMapping);
            var roadTripPartnersSeq = $scope.contentMapping.RoadTripPartners;
            contentUtils.ReadContentDescriptionAndImages(roadTripPartnersSeq, ContentService).then(function (resp) {
                $scope.contentMapping.RoadTripPartners = {
                    Seq: roadTripPartnersSeq,
                    Images: resp.Images,
                    Description: resp.Description
                };
                window.setTimeout(function () {
                    contentUtils.CarouselAutoSlide('mobileSponsorsCarousel');
                }, 1000);

                var businessPartnersSeq = $scope.contentMapping.BusinessPartners;
                contentUtils.ReadContentDescriptionAndImages(businessPartnersSeq, ContentService).then(function (resp) {
                    $scope.contentMapping.BusinessPartners = {
                        Seq: businessPartnersSeq,
                        Images: resp.Images,
                        Description: resp.Description
                    };
                    window.setTimeout(function () {
                        contentUtils.CarouselAutoSlide('mobilePartnersCarousel');
                    }, 1000);
                    if (callback != null) {
                        callback();
                    }
                }, LoadError('BusinessPartners', callback));
            }, LoadError('RoadTripPartners', callback));
        }

        function ReadAdvertisements(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var cacheBuster = (new Date()).getTime();
            $http.get('/api/Banners?type=1&randomize=1&nnn=' + cacheBuster).then(function(resp) {
                if (resp.data && resp.data.Seq) {
                    $scope.advertisementBanner = resp.data;
                    $scope.advertisementBanner.VideoPath = '/content/Banners/' + $scope.advertisementBanner.Seq + '/' + $scope.advertisementBanner.FileName;
                }
                FinishStep('advertisements');
                if (callback != null)
                    callback();
            }, LoadError('advertisements', callback));
        }

        function ReadFeaturedPages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            $http.get('/api/pages').then(function(resp) {
                var allPages = resp.data.slice(0);
                var featuredPages = allPages.filter(function(x) {
                    return x.FeaturedIndex > 0 && x.IsHidden != 1;
                });
                var indexedPages = allPages.filter(function(x) {
                    return x.PageIndex > 0 && x.IsHidden != 1;
                });
                featuredPages.sort(function(p1, p2) { return p1.FeaturedIndex - p2.FeaturedIndex; });
                indexedPages.sort(function(p1, p2) { return p1.PageIndex - p2.PageIndex; });
                var allFeaturedArticles = featuredPages.filter(function(x) { return x.Type == 2; });
                var allFeaturedGalleries = featuredPages.filter(function(x) { return x.Type == 1; });
                if (allFeaturedArticles.length == 0 && indexedPages.length > 0) {
                    var indexedArticle = indexedPages.findItem(function(x) { return x.Type == 2; });
                    if (indexedArticle != null)
                        allFeaturedArticles.push(indexedArticle);
                }
                if (allFeaturedGalleries.length == 0 && indexedPages.length > 0) {
                    var indexedGallery = indexedPages.findItem(function(x) { return x.Type == 1; });
                    if (indexedGallery != null)
                        allFeaturedGalleries.push(indexedGallery);
                }
                var firstPage = null;
                if (allFeaturedArticles.length > 0) {
                    firstPage = allFeaturedArticles[0];
                    contentUtils.ApplyPagesData([firstPage]);
                    $scope.firstFeaturedArticle = {
                        Seq: firstPage.Seq,
                        Title: firstPage.Description,
                        ImagePath: firstPage.CroppedImage_Slider || firstPage.DefaultImagePath
                    };
                }
                if (allFeaturedGalleries.length > 0) {
                    firstPage = allFeaturedGalleries[0];
                    contentUtils.ApplyPagesData([firstPage]);
                    $scope.firstFeaturedGallery = {
                        Seq: firstPage.Seq,
                        Title: firstPage.Description,
                        ImagePath: firstPage.CroppedImage_Slider || firstPage.DefaultImagePath
                    };
                }
                //curPage.BannerCssClass = 'button banner_button ' + contentUtils.GetBannerType(curPage.Type);
                //curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                FinishStep('featuredPages');
                if (callback != null)
                    callback();
            }, LoadError('featuredPages', callback))
        }

        function ApplyColumnStyle(columnObject, dataObj, totalItemCount, baseClass, itemsPerColumnPropertyName) {
            if (typeof itemsPerColumnPropertyName == 'undefined')
                itemsPerColumnPropertyName = '';
            var curValidCount = dataObj.ValidItems;
            var itemsInColumn = totalItemCount > 4 ? 3 : 2;
            var itemClassName = (itemsInColumn == 2) ? 'mobile-wide-button-half' : 'mobile-wide-button-third';
            if (baseClass.length > 0)
                itemClassName += ' ' + baseClass;
            dataObj.ValidItems++;
            columnObject.ClassName = itemClassName;
            if (itemsPerColumnPropertyName.length > 0)
                columnObject[itemsPerColumnPropertyName] = itemsInColumn;
            columnObject.Top = dataObj.CurrentTop;
            columnObject.Right = null;
            columnObject.Left = null;
            if (totalItemCount < 5) {
                if ((curValidCount % 2) == 0)
                    columnObject.Right = 15;
                else
                    columnObject.Left = 15;
            } else {
                switch (curValidCount % 3) {
                    case 0:
                        columnObject.Right = 15;
                        break;
                    case 1:
                        var thirdWindow = Math.floor($(window).width() / 3);
                        columnObject.Left = thirdWindow + 7;
                        break;
                    case 2:
                        columnObject.Left = 15;
                        break;
                }
            }
            if ((dataObj.ValidItems % itemsInColumn) == 0)
                dataObj.CurrentTop += 65;
        }

        function ApplyCategoryGradeAndGender(categoryObject, championshipCategoriesCount, dataObj) {
            if (categoryObject.CATEGORY_NAME) {
                var categoryParts = categoryObject.CATEGORY_NAME.split(' ');
                if (categoryParts.length == 2) {
                    categoryObject.CategoryGrades = categoryParts[0];
                    var rawGender = categoryParts[1];
                    if (rawGender == 'תלמידות')
                        categoryObject.CategoryGenderClass = 'flaticon-female-silhouette';
                    else if (rawGender == 'תלמידים')
                        categoryObject.CategoryGenderClass = 'flaticon-man-standing-up';
                    if (categoryObject.PermanentChampionshipTitle) {
                        if (categoryObject.PermanentChampionshipTitle.indexOf('ישיבות') >= 0) {
                            categoryObject.CategoryGrades = 'ישיבות';
                        }
                        if (categoryObject.PermanentChampionshipTitle.indexOf('גליל') >= 0) {
                            categoryObject.CategoryGrades = 'גליל';
                        }
                    }
                    ApplyColumnStyle(categoryObject, dataObj, championshipCategoriesCount, 'mobile-category-grade-and-gender-panel', 'CategoriesInColumn');
                }
            }
        }

        function BuildPermanentChampionships(sportFieldCategories) {
            var permanentChampionships = sportFieldCategories.filter(function(x) {
                return x.PermanentChampionshipIndex != null;
            });
            permanentChampionships = sportUtils.DistinctArray(permanentChampionships, 'CHAMPIONSHIP_CATEGORY_ID');
            permanentChampionships.sortByProperty('PermanentChampionshipIndex');
            var dataObj = {
                ValidItems: 0,
                CurrentTop: 0
            };
            permanentChampionships.forEach(function(permanentChampionship) {
                ApplyCategoryGradeAndGender(permanentChampionship, permanentChampionships.length, dataObj);
            });
            permanentChampionships.ValidItems = dataObj.ValidItems;
            permanentChampionships.Height = dataObj.CurrentTop;
            return permanentChampionships;
        }

        function BuildChampionshipMapping(sportFieldCategories, filterFunction, mappedProperty, clearPermanentChampionships) {
            if (typeof clearPermanentChampionships == 'undefined')
                clearPermanentChampionships = true;
            var rawCategories = sportFieldCategories.filter(filterFunction);
            rawCategories = sportUtils.DistinctArray(rawCategories, 'CHAMPIONSHIP_CATEGORY_ID');
            var championshipMapping = {};
            rawCategories.forEach(function(category) {
                var key = (category[mappedProperty] || '').toString();
                if (key.length > 0) {
                    if (!championshipMapping[key])
                        championshipMapping[key] = [];
                    var clone = sportUtils.shallowCopy(category);
                    if (clearPermanentChampionships)
                        clone.PermanentChampionshipTitle = null;
                    championshipMapping[key].push(clone);
                }
            });
            return championshipMapping;
        }

        function BuildChampionshipCategories(championshipMapping) {
            var championshipIDs = sportUtils.FlattenAssociativeArray(championshipMapping);
            var championships = [];
            var currentTop = 0;
            if (championshipIDs.length > 0) {
                championshipIDs.forEach(function (championshipId) {
                    var championshipCategories = championshipMapping[championshipId];
                    var championshipName = championshipCategories[0].CHAMPIONSHIP_NAME;
                    var dataObj = {
                        ValidItems: 0,
                        CurrentTop: 25
                    };
                    championshipCategories.forEach(function(championshipCategory) {
                        ApplyCategoryGradeAndGender(championshipCategory, championshipCategories.length, dataObj);
                    });
                    championships.push({
                        ChampionshipName: championshipName,
                        Categories: championshipCategories,
                        Top: currentTop
                    });
                    var categoriesHeight = dataObj.CurrentTop - 25;
                    if ((championshipCategories.length < 5 && dataObj.ValidItems % 2 != 0) ||
                        (championshipCategories.length >= 5 && dataObj.ValidItems % 3 != 0))
                        categoriesHeight += 65;
                    currentTop += (35 + categoriesHeight);
                });
                championships.sortByProperty('ChampionshipName');
            }
            championships.Height = currentTop;
            return championships;
        }

        function BuildRegionalChampionships(sportFieldCategories, isClubs) {
            var regionMapping = BuildChampionshipMapping(sportFieldCategories, function(x) {
                if (isClubs)
                    return x.IS_CLUBS == 1;
                return x.IS_CLUBS != 1 && x.REGION_ID > 0;
            }, 'REGION_ID');
            var regions = sportUtils.FlattenAssociativeArray(regionMapping);
            var regionalChampionships = [];
            var dataObj = {
                ValidItems: 0,
                CurrentTop: 0
            };
            if (regions.length > 0) {
                regions.forEach(function (regionId) {
                    var regionCategories = regionMapping[regionId];
                    var championshipMapping = BuildChampionshipMapping(regionCategories, function(x) {
                        return true;
                    }, 'CHAMPIONSHIP_ID');
                    var regionName = regionCategories[0].REGION_NAME;
                    var regionChampionships = BuildChampionshipCategories(championshipMapping);
                    var regionItem = {
                        RegionName: regionName,
                        Championships: regionChampionships
                    };
                    ApplyColumnStyle(regionItem, dataObj, regions.length, 'mobile-region-panel');
                    regionalChampionships.push(regionItem);
                });
                regionalChampionships.sortByProperty('RegionName');
            }
            regionalChampionships.Height = dataObj.CurrentTop;
            if ((regions.length < 5 && dataObj.ValidItems % 2 != 0) ||
                (regions.length >= 5 && dataObj.ValidItems % 3 != 0))
                regionalChampionships.Height += 65;
            return regionalChampionships;
        }

        function BuildCentralRegionChampionships(sportFieldCategories) {
            var championshipMapping = BuildChampionshipMapping(sportFieldCategories, function(x) {
                return x.IS_CLUBS != 1 && x.REGION_ID == 0;
            }, 'CHAMPIONSHIP_ID');
            var centralRegionChampionships = BuildChampionshipCategories(championshipMapping);
            return centralRegionChampionships;
        }

        function ReadAllCategories(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var selectedSeason = localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] || '';
            var url = '/api/sportsman/championship-categories-data?season=' + selectedSeason;
            $http.get(url).then(function(resp) {
                $scope.categoriesLoadFinished = true;
                var sportFieldCategoriesMapping = BuildChampionshipMapping(resp.data, function(x) { return true; }, 'SPORT_NAME', false);
                var sportFieldNames = sportUtils.FlattenAssociativeArray(sportFieldCategoriesMapping);
                sportFieldNames.sort();
                sportFieldNames.forEach(function(sportFieldName) {
                    var wordCount = sportFieldName.split(' ').length;
                    var sportFieldNameClass = 'mobile-category-panel-sport-field-name';
                    if (wordCount > 2)
                        sportFieldNameClass += ' sport-field-name-small-font';
                    var sportFieldCategories = sportFieldCategoriesMapping[sportFieldName];
                    var sportFieldSeq = sportFieldCategories[0].SPORT_ID;
                    var permanentChampionships = BuildPermanentChampionships(sportFieldCategories);
                    var clubChampionships = BuildRegionalChampionships(sportFieldCategories, true);
                    clubChampionships.OriginalHeight = clubChampionships.Height;
                    var regionalChampionships = BuildRegionalChampionships(sportFieldCategories, false);
                    regionalChampionships.OriginalHeight = regionalChampionships.Height;
                    var centralRegionChampionships = BuildCentralRegionChampionships(sportFieldCategories);
                    if (permanentChampionships.ValidItems % 2 != 0)
                        permanentChampionships.Height += 65;
                    $scope.categoriesData.push({
                        SportFieldName: sportFieldName,
                        SportFieldSeq: sportFieldSeq,
                        SportFieldClass: sportFieldNameClass,
                        IconClass: $scope.globalData.sportFieldIcons[sportFieldSeq.toString()] || '',
                        PermanentChampionships: permanentChampionships,
                        ClubChampionships: clubChampionships,
                        RegionalChampionships: regionalChampionships,
                        CentralRegionChampionships: centralRegionChampionships
                    });
                });
                if (callback != null)
                    callback();
                if (autoSelectionCategoryId) {
                    $timeout(function() {
                        $scope.ToggleGamePlans();
                    }, 500);
                }
            }, function(err) {
                console.log('Error loading categories');
                $scope.categoriesLoadError = true;
                if (callback != null)
                    callback();
            });
        }

        function ReadLinks(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var url = '/api/links';
            $http.get(url).then(function(resp) {
                $scope.linksLoadFinished = true;
                $scope.links = resp.data;
                if (callback != null)
                    callback();
            }, function(err) {
                console.log('Error loading links');
                $scope.linksLoadError = true;
                if (callback != null)
                    callback();
            });
        }

        function LateLoadData() {
            ReadCroppedImages(function() {
                $timeout(function() {
                    ReadFeaturedPages(function() {
                        $timeout(function() {
                            ReadRecentPages(function() {
                                $timeout(function() {
                                    LoadContentMapping(function() {
                                        $timeout(function() {
                                            ReadAdvertisements(function() {
                                                $timeout(function() {
                                                    ReadAllCategories(function() {
                                                        $timeout(function() {
                                                            ReadLinks();
                                                        }, 500);
                                                    });
                                                }, 500);
                                            });
                                        }, 500);
                                    });
                                }, 500);
                            });
                        }, 500);
                    });
                }, 500);
            });
        }

        $scope.MoreArticlesClicked = function() {
            $state.go('articles');
        };

        $scope.MoreGalleriesClicked = function() {
            $state.go('galleries');
        };

        $scope.ToggleMoreLinks = function() {
            $("#mobileMoreLinksPlaceholder").toggle("slow");
        };

        $scope.ToggleGamePlans = function() {
            $("#mobileGamePlansPlaceholder").toggle("slow", function() {
                if (autoSelectionCategoryId) {
                    var found = false;
                    $scope.categoriesData.forEach(function(categoryData) {
                        if (!found && categoryData.CentralRegionChampionships) {
                            categoryData.CentralRegionChampionships.forEach(function (curCentralRegionChampionship) {
                                if (!found) {
                                    curCentralRegionChampionship.Categories.forEach(function (curCategory) {
                                        if (curCategory.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                            $scope.ToggleSportFieldCategories(categoryData, function() {
                                                $scope.ToggleCentralRegionChampionships(categoryData);
                                                autoSelectionCategoryId = 0;
                                            });
                                            found = true;
                                        }
                                    });
                                }
                            });
                        }

                        if (!found && categoryData.ClubChampionships) {
                            categoryData.ClubChampionships.forEach(function (curClubChampionship) {
                                if (!found) {
                                    curClubChampionship.Championships.forEach(function(curChampionship) {
                                        curChampionship.Categories.forEach(function (curCategory) {
                                            if (curCategory.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                                $scope.ToggleSportFieldCategories(categoryData, function() {
                                                    $scope.ToggleClubChampionships(categoryData, function() {
                                                        $timeout(function() {
                                                            $scope.clubRegionClicked(categoryData, curClubChampionship);
                                                            autoSelectionCategoryId = 0;
                                                        }, 500);
                                                    });
                                                });
                                                found = true;
                                            }
                                        });
                                    });
                                }
                            });
                        }

                        if (!found && categoryData.PermanentChampionships) {
                            categoryData.PermanentChampionships.forEach(function (curPermanentChampionship) {
                                if (curPermanentChampionship.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                    $scope.ToggleSportFieldCategories(categoryData);
                                    autoSelectionCategoryId = 0;
                                    found = true;
                                }
                            });
                        }

                        if (!found && categoryData.RegionalChampionships) {
                            categoryData.RegionalChampionships.forEach(function (curRegionalChampionship) {
                                if (!found) {
                                    curRegionalChampionship.Championships.forEach(function(curChampionship) {
                                        curChampionship.Categories.forEach(function (curCategory) {
                                            if (curCategory.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                                $scope.ToggleSportFieldCategories(categoryData, function() {
                                                    $scope.ToggleRegionalChampionships(categoryData, function() {
                                                        $timeout(function() {
                                                            $scope.regionalRegionClicked(categoryData, curRegionalChampionship);
                                                            autoSelectionCategoryId = 0;
                                                        }, 500);
                                                    });
                                                });
                                                found = true;
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };

        $scope.ToggleSportFieldCategories = function(sportFieldCategories, callback) {
            if (typeof callback == 'undefined' || callback == null)
                callback = function() {};
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            var element = $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']");
            if (autoSelectionCategoryId) {
                element.parents("div").first().get(0).scrollIntoView();
            }
            element.toggle("slow", callback);
        };

        $scope.TogglePermanentChampionships = function(sportFieldCategories) {
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-permanent-championships-categories-list").toggle("slow");
        };

        $scope.ToggleCentralRegionChampionships = function(sportFieldCategories) {
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-central-region-championships-list").toggle("slow");
        };

        $scope.ToggleClubChampionships = function(sportFieldCategories, callback) {
            if (typeof callback == 'undefined' || callback == null)
                callback = function() {};
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-club-championships-placeholder").toggle("slow", callback);
        };

        $scope.ToggleRegionalChampionships = function(sportFieldCategories, callback) {
            if (typeof callback == 'undefined' || callback == null)
                callback = function() {};
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-regional-championships-placeholder").toggle("slow", callback);
        };

        $scope.CategoryClicked = function(category) {
            var categoryId = category.CHAMPIONSHIP_CATEGORY_ID;
            var regionId = category.PermanentChampionshipTitle ? 'p' : category.REGION_ID;
            $state.go('championships.region.championship', {clubs: category.IS_CLUBS, region: regionId, category: categoryId});
        };

        $scope.clubRegionClicked = function(sportFieldCategories, clubChampionshipRegion) {
            if (clubChampionshipRegion.ClassName.indexOf('mobile-region-selected') >= 0) {
                //already selected, nothing to do
            } else {
                sportFieldCategories.ClubChampionships.forEach(function(c) {
                    c.ClassName = c.ClassName.replace('mobile-region-selected', 'mobile-region-panel');
                });
                clubChampionshipRegion.ClassName = clubChampionshipRegion.ClassName.replace('mobile-region-panel', 'mobile-region-selected');
            }
            sportFieldCategories.SelectedClubRegion = clubChampionshipRegion;
            sportFieldCategories.ClubChampionships.Height = sportFieldCategories.ClubChampionships.OriginalHeight + clubChampionshipRegion.Championships.Height + 10;
        };

        $scope.regionalRegionClicked = function(sportFieldCategories, regionalChampionshipRegion) {
            if (regionalChampionshipRegion.ClassName.indexOf('mobile-region-selected') >= 0) {
                //already selected, nothing to do
            } else {
                sportFieldCategories.RegionalChampionships.forEach(function(c) {
                    c.ClassName = c.ClassName.replace('mobile-region-selected', 'mobile-region-panel');
                });
                regionalChampionshipRegion.ClassName = regionalChampionshipRegion.ClassName.replace('mobile-region-panel', 'mobile-region-selected');
            }
            sportFieldCategories.SelectedRegionalRegion = regionalChampionshipRegion;
            sportFieldCategories.RegionalChampionships.Height = sportFieldCategories.RegionalChampionships.OriginalHeight + regionalChampionshipRegion.Championships.Height + 10;
        };

        var chkReadyState = setInterval(function() {
            if (document.readyState == "complete") {
                // clear the interval
                clearInterval(chkReadyState);

                //late loading
                $timeout(function() {
                    LateLoadData();
                }, 1000);
            }
        }, 100);

        window.setInterval(function() {
            var dotLabels = $(".progress-dot");
            if (dotLabels.length > 0) {
                dotLabels.each(function() {
                    var dotsLabel = $(this);
                    var parentDiv = dotsLabel.parents("div").first();
                    if (parentDiv.is(":visible")) {
                        var dotCount = dotsLabel.text().length;
                        dotCount++;
                        if (dotCount > 3)
                            dotCount = 1;
                        var dots = Array(dotCount + 1).join(".");
                        dotsLabel.text(dots);
                    }
                });
            }

            var imageSliders = $(".mobile-image-slider");
            if (imageSliders.length > 0) {
                var topBarTop = $("#wrapper_container_mobile").offset().top;
                imageSliders.each(function() {
                    var imageSlider = $(this);
                    var sliderTop = imageSlider.offset().top;
                    var images = imageSlider.find(".sponsor-img");
                    if (images.length > 0) {
                        var opacity = topBarTop > sliderTop ? '0.2' : '1';
                        images.css("opacity", opacity);
                    }

                });
            }
        }, 1000);
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.register')
        .controller('ClubRegisterFormController',
            ['$scope', '$http', '$q', '$sce', '$uibModal', '$timeout', '$interval', '$filter', '$rootScope', 'messageBox', ClubRegisterFormController]);


    function ClubRegisterFormController($scope, $http, $q, $sce, $uibModal, $timeout, $interval, $filter, $rootScope, messageBox) {
        var qs = sportUtils.ParseQueryString();
        var schoolSymbol = parseInt(qs['s']);
        var unAuthorizedMessage = 'אינך מורשה לראות עמוד זה, נא להתחבר למערכת';

        $scope.now = new Date();
        $scope.schoolOrdersBasket = [];
        $scope.loggedUser = null;

        $http.get('/api/login').then(function(resp) {
            $scope.loggedUser = resp.data;
            if ($scope.loggedUser == null || !$scope.loggedUser.schoolSymbol) {
                $scope.error = unAuthorizedMessage;
            }
        }, function(err) {
            console.log('error getting logged in user');
            console.log(err);
            $scope.error = unAuthorizedMessage;
        });

        function ApplyServerData() {
            function ApplyTextboxValue(selector, propertyMapping, propertyName, calculator) {
                var value = propertyMapping[propertyName] || "";
                if (typeof calculator == 'function') {
                    value = calculator(value);
                }
                $(selector).val(value);
            }

            function ApplyCheckboxValue(checkboxName, propertyMapping, propertyName) {
                var value = propertyMapping[propertyName] == '1' ? '1' : '0';
                $("input[name='" + checkboxName + "'][value='" + value + "']").prop("checked", true);
            }

            function ApplyPhoneNumberWithPrefix(prefixSelector, actualSelector, propertyMapping, propertyName) {
                var rawValue = (propertyMapping[propertyName] || '');
                var phonePrefix = '';
                var phoneNumber = '';
                if (rawValue.indexOf("-") > 0) {
                    var parts = rawValue.split('-').filter(function(x) { return x.length > 0; });
                    if (parts.length > 2) {
                        phonePrefix = parts[0];
                        phoneNumber = parts.skip(1).join('');
                    }
                }
                if (phoneNumber.length == 0)
                    phoneNumber = rawValue;
                $(prefixSelector).val(phonePrefix);
                $(actualSelector).val(phoneNumber);
            }

            function ApplyFacilityDaysAndDetails(propertyMapping, propertyName) {
                function ApplySportFieldDaysCells(clonedRow, sportFieldData) {
                    var allCells = clonedRow.find('td');
                    allCells.first().text(sportFieldData.Name);
                    var daysInUse = [];
                    sportFieldData.WeekdaysData.forEach(function (weekdayData) {
                        var day = weekdayData.WeekDay;
                        if (day > 0) {
                            var rawData = sportUtils.EncodeHTML(weekdayData.RawData);
                            allCells.eq(day).html(rawData);
                            daysInUse.push(day);
                        }
                    });
                    if (daysInUse.length > 0) {
                        var dayMapping = daysInUse.toAssociativeArray();
                        for (var cellIndex = 1; cellIndex < allCells.length; cellIndex++) {
                            if (!dayMapping[cellIndex.toString()]) {
                                allCells.eq(cellIndex).text("");
                            }
                        }
                    }
                }

                function ApplySportFieldFacilitiesCells(clonedRow, sportFieldData, rowIndex) {
                    function ApplySingleCell(cellClass, propertySuffix) {
                        var oInput = clonedRow.find('.facility-' + cellClass).find('input');
                        if (oInput.length == 1) {
                            var propertyName = 'FacilitySportField_' + sportFieldData.Seq + '_' + propertySuffix;
                            var storedValue = propertyMapping[propertyName] || '';
                            oInput.val(storedValue);
                        }
                    }

                    var allCells = clonedRow.find('td');
                    allCells.eq(0).text((rowIndex + 1) + ".");
                    allCells.eq(1).text(sportFieldData.Name);
                    ApplySingleCell('address', 'Address');
                    ApplySingleCell('hours', 'HostingHours');
                    ApplySingleCell('contact', 'Contact');
                }

                //ApplyFacilityDetails("#", propertyMapping, ["FacilitySportField_$sport_Address", "FacilitySportField_$sport_Contact",
                //["FacilitySportField_$sport_Phone", "FacilitySportField_$sport_Fax"]]);
                var oSportFieldDaysTable = $(".SportFieldDays");
                var oFacilityDetailsTable = $("#tblFacilities");
                var daysTemplateRow = $("#sportFieldDaysRowTemplate");
                var facilitiesTemplateRow = $("#sportFieldFacilitiesRowTemplate");
                if (oSportFieldDaysTable.length > 0 && oFacilityDetailsTable.length > 0 && daysTemplateRow.length == 1 && facilitiesTemplateRow.length == 1) {
                    $http.get('/api/common/school-user-data').then(function(resp) {
                        var schoolUserData = sportUtils.shallowCopy(resp.data);
                        $http.get('/api/common/club-facility-data').then(function (resp) {
                            var regionalFacilityDataItems = resp.data.filter(function (x) {
                                return x.REGION_ID == schoolUserData.REGION_ID;
                            });
                            var sportFieldMapping = {};
                            regionalFacilityDataItems.forEach(function(facilityData) {
                                var key = facilityData.SportFieldSeq.toString();
                                if (!sportFieldMapping[key]) {
                                    sportFieldMapping[key] = {
                                        Name: facilityData.SportFieldName,
                                        Seq: facilityData.SportFieldSeq,
                                        WeekdaysData: []
                                    }
                                }
                                sportFieldMapping[key].WeekdaysData.push(facilityData);
                            });
                            var rowIndex = 0;
                            for (var sportFieldSeq in sportFieldMapping) {
                                var clonedDaysRow = daysTemplateRow.clone();
                                var clonedFacilitiesRow = facilitiesTemplateRow.clone();
                                ApplySportFieldDaysCells(clonedDaysRow, sportFieldMapping[sportFieldSeq]);
                                ApplySportFieldFacilitiesCells(clonedFacilitiesRow, sportFieldMapping[sportFieldSeq], rowIndex);
                                clonedDaysRow.show();
                                oSportFieldDaysTable.append(clonedDaysRow);
                                clonedFacilitiesRow.show();
                                oFacilityDetailsTable.append(clonedFacilitiesRow);
                                rowIndex++;
                            }
                        });
                    });

                    /*
                     var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var sportFieldIndex = parseInt(currentRow.data("sportfield-index"));
                        if (!isNaN(sportFieldIndex) && sportFieldIndex > 0) {
                            var key = propertyName.replace("$sport", sportFieldIndex.toString());
                            var rawDays = propertyMapping[key] || "";
                            if (rawDays.length > 0) {
                                var days = rawDays.split(",").filter(function(x) {
                                    var n = parseInt(x);
                                    return !isNaN(n) && n > 0;
                                });
                                if (days.length > 0) {
                                    days.forEach(function(day) {
                                        //var oCell = currentRow.find("td").eq(day);
                                        //oCell.find("input").val("X");
                                    });
                                }
                            }
                        }
                    }
                    */
                }
            }

            function ApplyFacilityDetails(tableSelector, propertyMapping, properties) {
                function ApplySingleCell(allCells, cellIndex, subIndex, propertyName, sportFieldIndex) {
                    var key = propertyName.replace("$sport", sportFieldIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input").eq(subIndex);
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var sportFieldIndex = parseInt(currentRow.data("sportfield-index"));
                        if (!isNaN(sportFieldIndex) && sportFieldIndex > 0) {
                            var allCells = currentRow.find("td");
                            ApplySingleCell(allCells, 2, 0, properties[0], sportFieldIndex);
                            ApplySingleCell(allCells, 3, 0, properties[1], sportFieldIndex);
                            ApplySingleCell(allCells, 4, 0, properties[2][0], sportFieldIndex);
                            ApplySingleCell(allCells, 4, 1, properties[2][1], sportFieldIndex);
                        }
                    }
                }
            }

            function ApplyBoardMembers(tableSelector, propertyMapping, properties) {
                function ApplySingleCell(allCells, cellIndex, propertyName, rowIndex) {
                    var key = propertyName.replace("$index", rowIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input");
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 2; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var allCells = currentRow.find("td");
                        var currentIndex = parseInt(allCells.eq(0).text().replace(".", ""));
                        if (!isNaN(currentIndex) && currentIndex > 0) {
                            ApplySingleCell(allCells, 2, properties[0], currentIndex);
                            ApplySingleCell(allCells, 4, properties[1], currentIndex);
                        }
                    }
                }
            }

            function ApplyCourtHours(tableSelector, propertyMapping, properties) {
                function ApplySingleCell(allCells, cellIndex, propertyName, sportFieldIndex, categoryIndex) {
                    var key = propertyName.replace("$sport", sportFieldIndex.toString()).replace("$category", categoryIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        if (categoryIndex > 1)
                            cellIndex--;
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input");
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var sportFieldIndex = parseInt(currentRow.data("sportfield-index"));
                        if (!isNaN(sportFieldIndex) && sportFieldIndex > 0) {
                            var categoryIndex = parseInt(currentRow.data("category-index"));
                            if (isNaN(categoryIndex) || categoryIndex <= 0)
                                categoryIndex = 1;
                            var allCells = currentRow.find("td");
                            ApplySingleCell(allCells, 1, properties[0], sportFieldIndex, categoryIndex);
                            ApplySingleCell(allCells, 2, properties[1], sportFieldIndex, categoryIndex);
                            ApplySingleCell(allCells, 3, properties[2], sportFieldIndex, categoryIndex);
                        }
                    }
                }
            }

            function ApplyCoaches(tableSelector, propertyMapping, properties, lookupMapping) {
                function ApplySingleCell(allCells, cellIndex, propertyName, rowIndex) {
                    var key = propertyName.replace("$index", rowIndex.toString());
                    var rawValue = propertyMapping[key] || "";
                    if (rawValue.length > 0) {
                        var oCell = allCells.eq(cellIndex);
                        var oInput = oCell.find("input");
                        var lookupTableName = lookupMapping[propertyName] || null;
                        if (lookupTableName != null) {
                            var lookupTable = registerUtils.sharedClubData[lookupTableName];
                            var matchingItem = lookupTable.findItem(function(x) {
                                return x.Id == rawValue;
                            });
                            if (matchingItem != null)
                                rawValue = matchingItem.Caption;
                        }
                        oInput.val(rawValue);
                    }
                }

                var oTable = $(tableSelector);
                if (oTable.length > 0) {
                    var allRows = oTable.find("tr");
                    for (var i = 1; i < allRows.length; i++) {
                        var currentRow = allRows.eq(i);
                        var allCells = currentRow.find("td");
                        properties.forEach(function(propertyName, propertyIndex) {
                            ApplySingleCell(allCells, propertyIndex + 1, propertyName, i);
                        });
                    }
                }
            }

            function ApplyMunicipalityChampionships() {
                function CreateMunicipalityChampionshipCell(rawText) {
                    var oCell = $("<td></td>")
                    oCell.text(rawText.toString());
                    return oCell;
                }
                var schoolTeamOrdersTable = $("#tblSchoolTeamOrders");
                var municipalityChampionshipsTable = $("#tblMunicipalityChampionships");
                if (schoolTeamOrdersTable.length > 0 && municipalityChampionshipsTable.length > 0) {
                    municipalityChampionshipsTable.find("tr:gt(0)").remove();
                    var rowIndex = 0;
                    schoolTeamOrdersTable.find("tr:gt(0)").each(function() {
                        var schoolTeamOrdersRow = $(this);
                        var schoolTeamOrderCells = schoolTeamOrdersRow.find("td");
                        var sportFieldName = schoolTeamOrderCells.eq(1).text();
                        var categoryName = schoolTeamOrderCells.eq(3).text();
                        var municipalityChampionshipRow = $("<tr></tr>");
                        municipalityChampionshipRow.append(CreateMunicipalityChampionshipCell(rowIndex + 1));
                        municipalityChampionshipRow.append(CreateMunicipalityChampionshipCell(sportFieldName));
                        municipalityChampionshipRow.append(CreateMunicipalityChampionshipCell(categoryName));
                        municipalityChampionshipsTable.append(municipalityChampionshipRow);
                        rowIndex++;
                    });
                }
            }

            function InjectOrdersTable() {
                var targetContainer = $("#pnlClubsChampionshipsTable");
                if (targetContainer.length == 1) {
                    var sourceTable = $("#tblSchoolTeamOrders");
                    if (sourceTable.length == 1) {
                        targetContainer.html("");
                        var sourceRows = sourceTable.find("tr");
                        if (sourceRows.length < 2) {
                            targetContainer.html("אין קבוצות מוזמנות");
                        } else {
                            targetContainer.append(sourceTable);
                            sourceTable.show();
                            ApplyMunicipalityChampionships();
                        }
                    }
                    return;
                }
                window.setTimeout(InjectOrdersTable, 100);
            }

            function RegisterSingleTeam(index, callback) {
                if ($scope.schoolOrdersBasket == null || index >= $scope.schoolOrdersBasket.length) {
                    console.log('All teams registered');
                    callback();
                    return;
                }

                var curTeam = $scope.schoolOrdersBasket[index];
                var championshipCategory = {
                    ChampionshipId: curTeam.CHAMPIONSHIP_ID,
                    CategoryId: curTeam.CHAMPIONSHIP_CATEGORY_ID
                };
                registerUtils.registerTeams($http, $scope.loggedUser, championshipCategory, curTeam.Amount, function() {
                    RegisterSingleTeam(index + 1, callback);
                }, function(err) {
                    console.log('error registering team for ' + curTeam.CHAMPIONSHIP_CATEGORY_ID);
                });
            }

            $http.get('/api/school-club/data').then(function(resp) {
                var allRows = resp.data;
                var propertyMapping = allRows.toAssociativeArray(null, 'PropertyName', 'PropertyValue');
                ApplyTextboxValue("#school_manager", propertyMapping, "School_Data_ManagerName")
                ApplyTextboxValue("#school_phone", propertyMapping, "School_Data_PhoneNumber");
                ApplyTextboxValue("#school_fax", propertyMapping, "School_Data_FaxNumber");
                ApplyTextboxValue("#school_email", propertyMapping, "School_Data_ManagerEmail");
                ApplyTextboxValue("#ini_chairman_name", propertyMapping, "School_Data_ChairmanName");
                ApplyTextboxValue("#ini_chairman_address", propertyMapping, "School_Data_ChairmanAddress");
                ApplyTextboxValue("#ini_chairman_city", propertyMapping, "School_Data_ChairmanCity");
                ApplyTextboxValue("#ini_chairman_zipcode", propertyMapping, "School_Data_ChairmanZipCode");
                ApplyTextboxValue("#ini_chairman_phone", propertyMapping, "School_Data_ChairmanPhoneNumber");
                ApplyTextboxValue("#ini_chairman_fax", propertyMapping, "School_Data_ChairmanFax");
                ApplyTextboxValue("#coordinator_name", propertyMapping, "School_Data_CoordinatorName");
                ApplyTextboxValue("#coordinator_address", propertyMapping, "School_Data_CoordinatorAddress");
                ApplyTextboxValue("#ini_coordinator_city", propertyMapping, "School_Data_CoordinatorCity");
                ApplyTextboxValue("#coordinator_zipcode", propertyMapping, "School_Data_CoordinatorZipCode");
                ApplyTextboxValue("#coordinator_phone", propertyMapping, "School_Data_CoordinatorPhoneNumber");
                ApplyTextboxValue("#coordinator_cellphone", propertyMapping, "School_Data_CoordinatorCellPhone");
                ApplyTextboxValue("#coordinator_fax", propertyMapping, "School_Data_CoordinatorFax");
                ApplyTextboxValue("#coordinator_email", propertyMapping, "School_Data_CoordinatorEmailAddress");
                ApplyCheckboxValue("ini_is_association", propertyMapping, "School_Data_IsAssociation");
                ApplyTextboxValue("input[name='ini_txtAssociationNumber']", propertyMapping, "School_Data_AssociationNumber");
                ApplyCheckboxValue("ini_got_confirmation", propertyMapping, "School_Data_IsAssociationConfirmed");
                ApplyTextboxValue("#txtRegisterChequeSum", propertyMapping, "School_Cheque_Sum");
                ApplyTextboxValue("#txtRegisterChequeNumber", propertyMapping, "School_Cheque_Number");
                ApplyTextboxValue("#txtRegisterChequeBank", propertyMapping, "School_Cheque_Bank");
                ApplyTextboxValue("#txtRegisterChequeBranch", propertyMapping, "School_Cheque_Branch");
                ApplyTextboxValue("#txtRegisterChequeWords", propertyMapping, "School_Cheque_Sum", function(rawValue) {
                    return (rawValue.length > 0) ? sportUtils.ParseHebrewCurrency(rawValue) : "";
                });
                ApplyTextboxValue("#txtMunicipalityName", propertyMapping, "School_Data_SchoolMunicipalityName");
                ApplyTextboxValue("#txtMunicipalitySymbol", propertyMapping, "School_Data_MunicipalityNumber");
                ApplyFacilityDaysAndDetails(propertyMapping, "FacilitySportField_$sport_Days");
                ApplyTextboxValue("#txtInspectorName", propertyMapping, "School_Data_SupervisorName");
                ApplyTextboxValue("#txtMunicipalityName", propertyMapping, "School_Data_SchoolMunicipalityName");
                ApplyTextboxValue("#txtMunicipalityAddress", propertyMapping, "School_Data_MunicipalityAddress");
                ApplyTextboxValue("#txtMunicipalityCity", propertyMapping, "School_Data_MunicipalityCityName");
                ApplyTextboxValue("#txtMunicipalityZipCode", propertyMapping, "School_Data_MunicipalityZipCode");
                ApplyTextboxValue("#txtRecommenderFirstName", propertyMapping, "School_Data_RecommenderFirstName");
                ApplyTextboxValue("#txtRecommenderLastName", propertyMapping, "School_Data_RecommenderLastName");
                ApplyTextboxValue("#txtRecommenderRole", propertyMapping, "School_Data_RecommenderRole");
                ApplyPhoneNumberWithPrefix("#txtRecommenderPhonePrefix", "#txtRecommenderPhoneNumber", propertyMapping, "School_Data_RecommenderPhoneNumber");
                ApplyPhoneNumberWithPrefix("#txtRecommenderFaxPrefix", "#txtRecommenderFaxNumber", propertyMapping, "School_Data_RecommenderFax");
                ApplyTextboxValue("#txtRecommenderEmail", propertyMapping, "School_Data_RecommenderEmailAddress");
                ApplyBoardMembers("#tblBoardMembers", propertyMapping, ["ManagementBoardMember_$index_Name", "ManagementBoardMember_$index_Role"]);
                ApplyCourtHours("#tblCourtHours", propertyMapping, ["HostingDay_$sport_Category_$category_Name", "HostingDay_$sport_Category_$category_Weekday", "HostingDay_$sport_Category_$category_HostingHour"]);
                ApplyCoaches("#tblCoaches", propertyMapping, ["Coach_$index_SportField", "Coach_$index_Name", "Coach_$index_AgeRange", "Coach_$index_Gender", "Coach_$index_AuthorizationLevel",
                        "Coach_$index_PassedCoachTraining", "Coach_$index_Cellular", "Coach_$index_Address", "Coach_$index_Email"],
                    {"Coach_$index_AuthorizationLevel": "authorizationLevels", "Coach_$index_PassedCoachTraining": "yesNoOptions"});
                $timeout(function() {
                    var requestParams = {
                        ManagerName: propertyMapping['School_Data_ManagerName'],
                        PhoneNumber: propertyMapping['School_Data_PhoneNumber'],
                        FaxNumber: propertyMapping['School_Data_FaxNumber'],
                        ManagerEmail: propertyMapping['School_Data_ManagerEmail']
                    };
                    $http.post('/api/sportsman/school/personnel', requestParams).then(function() {
                        console.log('Data posted to server successfully');
                        var qs = sportUtils.ParseQueryString();
                        if (qs['preview'] == '1') {
                            console.log('preview mode');
                        } else {
                            RegisterSingleTeam(0, function() {
                                $http.delete('/api/school-club/team-order?category=all').then(function() {
                                    console.log('Orders basket cleared');
                                    if (window.opener) {
                                        window.opener["reload_orders_basket"] = "1";
                                    }
                                    //$("#btnPrint").click();
                                }, function(err) {
                                    console.log(err);
                                });
                            });
                        }
                    });
                }, 1000);

            }, function(err) {
                console.log('error reading school club data');
            });

            $http.get('/api/school-club/team-orders').then(function(resp) {
                $scope.schoolOrdersBasket = resp.data;
                $scope.schoolOrdersBasket.forEach(function(order, index) {
                    order.Index = index + 1;
                });
                window.setTimeout(function() {
                    InjectOrdersTable();
                }, 200);
            }, function(err) {
                console.log('error getting orders basket');
            });
        }

        if (isNaN(schoolSymbol) || schoolSymbol < 0) {
            $scope.error = 'אין סמל בית ספר';
        } else {
            var url = '/api/sportsman/data-gateway';
            $scope.loading = true;
            $http.get(url).then(function (resp) {
                url = resp.data;
                var rootUrl = url.substring(0, url.lastIndexOf("/") + 1);
                url += '?symbol=' + schoolSymbol;
                $http.get(url).then(function (resp) {
                    var rawHTML = resp.data;
                    $scope.loading = false;
                    $scope.RawHTML = $sce.trustAsHtml(rawHTML);
                    window.setTimeout(function() {
                        FixImages(rootUrl);
                    }, 500);
                    window.setTimeout(ApplyServerData, 50);
                }, function(err) {
                    $scope.error = 'שגיאה בעת טעינת נתוני בית ספר';
                    console.log(err);
                    $scope.loading = false;
                });
            }, function(err) {
                $scope.error = 'שגיאה בעת טעינת נתונים';
                console.log(err);
                $scope.loading = false;
            });
        }

        window['qL_steps_amount'] = 1;
        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);
    }

    function FixImages(rootUrl) {
        $("img").each(function() {
            var curImage = $(this);
            var currentSrc = curImage.attr("src");
            if (currentSrc.indexOf("http") != 0) {
                currentSrc = rootUrl + currentSrc;
                curImage.attr("src", currentSrc);
            }
        });
    }
})();
(function() {
    'use strict';

    angular
        .module('sport')
        .controller('PlayerFileCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$q', 'messageBox', 'PlayerInfo', PlayerFileCtrl]);

    function PlayerFileCtrl($scope, $http, $uibModalInstance, $filter, $q, messageBox, PlayerInfo) {
        $scope.FileUrl = '/content/PlayerFile?type=' + PlayerInfo.FileType + '&id=' + PlayerInfo.IdNumber;
        $scope.PlayerIdNumber = PlayerInfo.IdNumber;
        $scope.PlayerName = PlayerInfo.Name;
        $scope.FileTitle = PlayerInfo.FileTitle;
        $scope.PDF = PlayerInfo.PDF;

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $uibModalInstance.close("OK");
        };

        $scope.delete = function() {
            var msg = 'האם למחוק קובץ זה? הפעולה לא הפיכה!';
            messageBox.ask(msg).then(function () {
                $http.delete($scope.FileUrl).then(function() {
                    $uibModalInstance.close("DELETED");
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת קובץ, נא לנסות מאוחר יותר');
                });
            });
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.register')
        .controller('PlayerRegisterFormController',
            ['$scope', '$http', '$q', '$uibModal', '$timeout', '$interval', '$filter', '$rootScope', 'messageBox', PlayerRegisterFormController]);


    function PlayerRegisterFormController($scope, $http, $q, $uibModal, $timeout, $interval, $filter, $rootScope, messageBox) {
        var playerProperties = ['TEAM_NUMBER', 'STATUS', 'REGISTRATION_DATE', 'FIRST_NAME', 'LAST_NAME', 'BIRTH_DATE', 'ID_NUMBER', 'GRADE', 'GRADE_NAME'];
        var emptyPlayer = {};
        playerProperties.forEach(function(p) { emptyPlayer[p] = ''; });
        var qs = sportUtils.ParseQueryString();
        var teamID = parseInt(qs['t']);
        $scope.now = new Date();
        if (isNaN(teamID) || teamID < 0) {
            $scope.error = 'אין זיהוי קבוצה';
        } else {
            var url = '/api/sportsman/team/' + teamID + '/full-details';
            $http.get(url).then(function(resp) {
                if (!resp.data || resp.data.TEAM_ID != teamID) {
                     $scope.error = 'זיהוי קבוצה שגוי או קבוצה לא קיימת';
                } else {
                    $scope.team = resp.data;
                    if ($scope.team.Players.length == 0) {
                        $scope.error = 'לקבוצה זו אין שחקנים רשומים';
                    } else {
                        if ($scope.team.CATEGORY_NAME) {
                            var parts = $scope.team.CATEGORY_NAME.split(' ');
                            if (parts.length > 1) {
                                $scope.team.CategoryGrades = parts[0];
                                $scope.team.CategoryGender = parts[1];
                            }
                        }
                        var maxPlayers = 20;
                        if ($scope.team.Players.length > 20)
                            maxPlayers = 40;
                        $scope.team.Players.trimAfter(maxPlayers);
                        for (var i = 0; i < $scope.team.Players.length; i++) {
                            var player = $scope.team.Players[i];
                            if (player.REGISTRATION_DATE)
                                player.REGISTRATION_DATE = $filter('date')(player.REGISTRATION_DATE, 'dd/MM/yyyy');
                            if (player.BIRTH_DATE)
                                player.BIRTH_DATE = $filter('date')(player.BIRTH_DATE, 'dd/MM/yyyy');
                        }
                        $scope.team.Players.expand(emptyPlayer, maxPlayers, true);
                        window.setTimeout(function() {
                            $("#btnPrint").click();
                        }, 1500);
                    }
                }
            }, function(err) {
                $scope.error = 'שגיאה בעת טעינת נתוני קבוצה';
                console.log(err);
            });
        }


        window['qL_steps_amount'] = 1;
        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);
    }
})();
(function() {
    'use strict';

    angular
        .module('sport')
        .controller('PlayerSelectionCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$timeout', '$q', 'messageBox', 'championshipData', PlayerSelectionCtrl]);

    function PlayerSelectionCtrl($scope, $http, $uibModalInstance, $filter, $timeout, $q, messageBox, championshipData) {
        var allPlayers = [];
        var existingPlayerMapping = {};
        var studentPropertiesMapping = {IdNumber: 'ID_NUMBER', FirstName: 'FIRST_NAME', LastName: 'LAST_NAME', Birthday: 'BIRTH_DATE', Gender: 'SEX_TYPE'};

        $scope.data = {
            'ChampionshipFullName': championshipData.ChampionshipName,
            'AvailablePlayers': [],
            'search': '',
            'matchingStudent': null,
            'NewStudent': null,
            'invalidIdNumber': false,
            'alreadyInTeam': null,
            'Grades': sportUtils.grades.map(function(grade, index) {
                return {
                    Index: index + 1,
                    Name: grade
                };
            })
        };
        $scope.selected = {
            'Players': []
        };
        $scope.latestSeason = championshipData.LatestSeason;

        if (championshipData.ExistingPlayers) {
            for (var i = 0; i < championshipData.ExistingPlayers.length; i++) {
                var curPlayer = championshipData.ExistingPlayers[i];
                var key = curPlayer.ID_NUMBER.toString();
                existingPlayerMapping[key] = curPlayer;
            }
        }

        if (championshipData.EditStudent) {
            $scope.data.NewStudent = {};
            for (var prop in studentPropertiesMapping) {
                var curValue = championshipData.EditStudent[studentPropertiesMapping[prop]];
                $scope.data.NewStudent[prop] = curValue;
                $scope.data.NewStudent['Original_' + prop] = curValue;
            }
            $scope.data.NewStudent.Grade = $scope.data.Grades.findItem(function(x) {
                return x.Name == championshipData.EditStudent.ParsedGrade;
            });
            $scope.data.NewStudent['Original_Grade'] = $scope.data.NewStudent.Grade == null ? 0 : $scope.data.NewStudent.Grade.Index;
            $scope.data.NewStudent.IsEditMode = true;
            var url = '/api/sportsman/student/' + $scope.data.NewStudent.IdNumber + '/candelete';
            $http.get(url).then(function(resp) {
                $scope.data.NewStudent.CanDelete = resp.data.CanDelete;
            }, function(err) {
                console.log('error checking if can delete student');
                console.log(err);
            });
        }

        $scope.parsedSearchTerm = function() {
            var searchTerm = $.trim($scope.data.search);
            if (searchTerm.length > 0 && sportUtils.IsInteger(searchTerm))
                searchTerm = parseInt(searchTerm) + '';
            return searchTerm;
        };

        function ClonePlayer(player) {
            var clone = {};
            for (var prop in player) {
                clone[prop] = player[prop];
            }
            return clone;
        }

        function filteredPlayers() {
            var selectedPlayersMapping = {};
            for (var i = 0; i < $scope.selected.Players.length; i++) {
                var key = $scope.selected.Players[i].ID_NUMBER.toString();
                selectedPlayersMapping[key] = true;
            }
            var filtered = allPlayers.filter(function(x) {
                if (selectedPlayersMapping[x.ID_NUMBER.toString()])
                    return false;
                if (existingPlayerMapping[x.ID_NUMBER.toString()])
                    return false;
                return true;
            });
            var searchTerm = $scope.parsedSearchTerm();
            if (searchTerm.length > 0)
                filtered = $filter('filter')(filtered, searchTerm);
            return filtered;
        }

        $timeout(function() {
            $http.get('/api/sportsman/latest-season').then(function(resp) {
                var latestSeason = resp.data.Season;
                if (latestSeason) {
                    allPlayers.forEach(function(curPlayer) {
                        if (curPlayer.GRADE) {
                            curPlayer.ParsedGrade = sportUtils.TranslateGrade(curPlayer.GRADE, latestSeason);
                        }
                    });
                }
            });
        }, 500);

        function CheckNewStudent(numericId) {
            var idNumber = numericId.toString();
            if (idNumber.length >= 9 && sportUtils.IsValidIdNumber(idNumber)) {
                $scope.data.NewStudent = {
                    IdNumber: idNumber.toString()
                };
                $timeout(function () {
                    if ($scope.data.NewStudent) {
                        $('#txtNewStudentFirstName').focus();
                    }
                }, 500);
            } else {
                $scope.data.invalidIdNumber = idNumber.length == 9;
            }
            $scope.data.matchingStudent = null;
        }

        function ParseRegistrationStatus(rawStatus) {
            if (rawStatus == null || !rawStatus || rawStatus.length == 0)
                return 0;
            var lookFor = '<PlayerRegStatus>';
            var index = rawStatus.indexOf(lookFor);
            if (index >= 0) {
                return rawStatus.substr(index + lookFor.length, 1) == '1' ? 1 : 0;
            } else {
                return 0;
            }
        }

        $scope.pagingService = new PagingService(filteredPlayers(), {pageSize: 20});
        $scope.data.AvailablePlayers = [];
        $scope.pagingService.applyPaging($scope.data.AvailablePlayers);

        if (championshipData.CategoryId) {
            var url = '/api/sportsman/matching-students?category=' + championshipData.CategoryId + '&school=' + championshipData.SchoolSymbol;
            $http.get(url).then(function (resp) {
                allPlayers = resp.data;
                $scope.pagingService.setData(filteredPlayers());
            });
        }

        $scope.$watch('data.search', function (newval){
            if (championshipData.EditStudent)
                return;

            if ($scope.pagingService) {
                $scope.pagingService.setData(filteredPlayers());
            }

            $scope.data.NewStudent = null;
            $scope.data.invalidIdNumber = false;
            $scope.data.alreadyInTeam = null;
            $scope.data.doubleRegistration = null;
            if (newval && newval.length > 0 && sportUtils.IsInteger(newval) && newval.length > 5 && newval.length <= 9) {
                var idNumber = parseInt(newval);
                var alreadySelected = $scope.selected.Players.findIndex(function(x) { return parseInt(x.ID_NUMBER) == idNumber; }) >= 0;
                var playerIndex = allPlayers.findIndex(function(x) { return parseInt(x.ID_NUMBER) == idNumber; });
                $scope.data.alreadyInTeam = existingPlayerMapping[idNumber.toString()];
                var shouldCheckRegistrationStatus = championshipData.ChampionshipName.indexOf("ז'-ח'") >= 0 || championshipData.ChampionshipName.indexOf('ז-ח') >= 0;
                if (!$scope.data.alreadyInTeam && !alreadySelected && playerIndex < 0) {
                    $http.get('/api/sportsman/student?id=' + idNumber + '&sport=' + championshipData.SportID).then(function (resp) {
                        var student = resp.data;
                        var ifaRegisterStatus = ParseRegistrationStatus(student.IfaRegisterStatus);
                        if (shouldCheckRegistrationStatus && ifaRegisterStatus == 1) { //changed 09/01/2019 to allow registration until it can be limited to only specific grades
                            $scope.data.doubleRegistration = "כדורגל";
                        } else {
                            if (student.STUDENT_ID) {
                                $scope.data.matchingStudent = student;
                                if (student.SYMBOL != championshipData.SchoolSymbol) {
                                    $scope.data.matchingStudent.DifferentSchool = {
                                        Symbol: student.SYMBOL,
                                        Name: student.SCHOOL_NAME
                                    };
                                }
                            } else {
                                CheckNewStudent(idNumber);
                            }
                        }
                    }, function (err) {
                        console.log('failed to get matching student');
                        console.log(err);
                        CheckNewStudent(idNumber);
                    });
                } else {
                    $scope.data.matchingStudent = null;
                }
            } else {
                $scope.data.matchingStudent = null;
            }
        });

        $scope.SelectPlayer = function(player) {
            $scope.selected.Players.push(ClonePlayer(player));
            var count = $scope.selected.Players.length;
            $scope.selected.Players.moveItem(count - 1, 0);
            $scope.pagingService.setData(filteredPlayers());
            $scope.data.matchingStudent = null;
            $scope.data.search = '';
            $scope.pagingService.setData(filteredPlayers());
        };

        $scope.RemoveSelectedPlayer = function(player) {
            var matchingIndex = $scope.selected.Players.findIndex(function(x) {
                return x.ID_NUMBER == player.ID_NUMBER;
            });
            if (matchingIndex >= 0) {
                $scope.selected.Players.splice(matchingIndex, 1);
                $scope.pagingService.setData(filteredPlayers());
            }
        };

        $scope.deleteStudent = function() {
            var msg = 'האם למחוק תלמיד מהמערכת? פעולה זו אינה הפיכה!';
            messageBox.ask(msg).then(function () {
                var url = '/api/sportsman/student?id=' + $scope.data.NewStudent.IdNumber;
                $http.delete(url).then(function(resp) {
                    $uibModalInstance.close('DELETED');
                }, function(err) {
                    alert('שגיאה בעת מחיקת שחקן מהמערכת, נא לנסות שוב מאוחר יותר');
                    console.log('error deleting student');
                    console.log(err);
                });
            });
        };

        $scope.isConfirmDisabled = function() {
            if ($scope.data.NewStudent == null) {
                return !$scope.selected.Players || $scope.selected.Players.length == 0;
            } else {
                //Original_
                if (!$scope.data.NewStudent.FirstName || !$scope.data.NewStudent.LastName ||
                    !$scope.data.NewStudent.Birthday || !$scope.data.NewStudent.Grade ||
                    !$scope.data.NewStudent.Grade.Index) {
                    //missing required fields
                    return true;
                }
                if ($scope.data.NewStudent.IsEditMode) {
                    var dirty = false;
                    for (var prop in studentPropertiesMapping) {
                        var curValue = $.trim($scope.data.NewStudent[prop]);
                        var originalValue = $.trim($scope.data.NewStudent['Original_' + prop]);
                        if (curValue != originalValue) {
                            dirty = true;
                            break;
                        }
                    }
                    var curGrade = $scope.data.NewStudent.Grade == null ? 0 : $scope.data.NewStudent.Grade.Index;
                    if (curGrade != $scope.data.NewStudent['Original_Grade'])
                        dirty = true;
                    return !dirty;
                }
                return false;
            }
        };

        $scope.cancel = function () {
            if ($scope.data.NewStudent == null || ($scope.data.NewStudent != null && $scope.data.NewStudent.IsEditMode)) {
                $uibModalInstance.dismiss('cancel');
            } else {
                $scope.data.NewStudent = null;
                $scope.data.search = ''
                $scope.pagingService.setData(filteredPlayers());
            }
        };

        $scope.confirm = function () {
            if ($scope.isConfirmDisabled()) {
                $scope.data.TriedToSubmit = true;
                return;
            }

            if ($scope.data.NewStudent == null) {
                if ($scope.selected.Players && $scope.selected.Players.length > 0) {
                    $uibModalInstance.close($scope.selected.Players);
                }
            } else {
                $scope.data.TriedToSubmit = true;
                if ($scope.data.NewStudent.IsEditMode) {
                    $uibModalInstance.close($scope.data.NewStudent);
                } else {
                    var clonedStudent = {};
                    for (var propertyName in $scope.data.NewStudent) {
                        var value = $scope.data.NewStudent[propertyName];
                        if ($scope.latestSeason != null && propertyName == 'Grade')
                            value = $scope.latestSeason - (value.Index - 1);
                        clonedStudent[propertyName] = value;
                    }
                    $http.post('/api/sportsman/student', {Student: clonedStudent}).then(function(resp) {
                        for (var prop in studentPropertiesMapping)
                            $scope.data.NewStudent[studentPropertiesMapping[prop]] = $scope.data.NewStudent[prop];
                        $scope.data.NewStudent.STUDENT_ID = resp.data.STUDENT_ID;
                        $scope.data.NewStudent.GRADE = clonedStudent.Grade;
                        allPlayers.push(ClonePlayer($scope.data.NewStudent));
                        $scope.SelectPlayer($scope.data.NewStudent);
                        $scope.data.NewStudent = null;
                    }, function(err) {
                        alert('שגיאה בעת הוספת שחקן למערכת, נא לנסות שוב מאוחר יותר');
                        console.log(err);
                    });

                }
            }
        };
    }
})();
(function() {
    'use strict';

    angular
        .module('sport.register')
        .controller('RegisterController',
            ['$scope', '$http', '$q', '$uibModal', '$timeout', '$interval', '$filter', '$rootScope', 'messageBox', RegisterController]);

    //441360
    //shkim

    //640086

    function RegisterController($scope, $http, $q, $uibModal, $timeout, $interval, $filter, $rootScope, messageBox) {
        var abortTeamSelection = false;
        $scope.userInput = {'username': '', 'password': ''};
        $scope.selected = {'team': null};
        $scope.loggedUser = null;
        $scope.schoolTeams = [];
        $scope.isClubSchool = false;
        $scope.latestSeason = null;

        $timeout(function() {
            $("#register_username").focus();
        }, 500);

        window['qL_steps_amount'] = 5;

        $http.get('/api/seasons/current').then(function(resp) {
            var currentSeason = sportUtils.getCurrentSeason();
            if (currentSeason != null && currentSeason.Season) {
                var latestYear = resp.data.Year;
                if (latestYear != currentSeason.Season) {
                    sportUtils.setCurrentSeason(null);
                    document.location.reload(true);
                    return;
                }
            }
        });

        function ParseFileType(type, isFull) {
            if (typeof isFull == 'undefined')
                isFull = false;
            switch (type) {
                case 1:
                    return 'תמונה';
                case 2:
                    return 'טופס בדיקה' + (isFull ? ' רפואית' : '');
                case 3:
                    return 'ספח ת"ז';
            }
        }

        function GetFileData(idNumber, fileType) {
            var fileData = { 'HasFile': false };
            var panels = $(".dropzone[data-player-id='" + idNumber + "']");
            if (panels.length > 0) {
                for (var i = 0; i < panels.length; i++) {
                    var curPanel  = panels.eq(i);
                    if (curPanel.data("file-type") == fileType.toString()) {
                        var filePanel = curPanel.parents(".player-file").first();
                        fileData.HasFile = filePanel.data("has-file") == "1";
                        fileData.PDF = filePanel.data("is-pdf") == "1";
                        fileData.MessagePanel = filePanel.find(".dz-message");
                    }
                }
            }
            return fileData;
        }

        function ValidateFile(fileObj, fileType) {
            var contentType = fileObj.type;
            var isEmpty = !contentType || contentType.length == 0;
            var isImage = (isEmpty) ? false : contentType.split('/')[0].toLowerCase() == 'image';
            var isPDF = (isEmpty) ? false : contentType.split('/')[1].toLowerCase() == 'pdf';
            var message = '';
            switch (fileType) {
                case 1:
                    if (!isImage)
                        message = 'ניתן להעלות קובץ תמונה בלבד';
                    break;
                case 2:
                case 3:
                    if (!isImage && !isPDF)
                        message = 'ניתן להעלות תמונה או קובץ PDF בלבד';
                    break;
            }
            return message;
        }

        function HandleFileUpload(dropZone, file, fileType) {
            var validationResult = ValidateFile(file, fileType);
            if (validationResult.length > 0) {
                dropZone.ValidFile = false;
                if (dropZone.element) {
                    $(dropZone.element).find('.fa').first().hide();
                    var oErrorSpan = $(dropZone.element).find('.upload-error');
                    oErrorSpan.html(validationResult);
                    oErrorSpan.show();
                    window.setTimeout(function () {
                        oErrorSpan.html('');
                        oErrorSpan.hide();
                        $(dropZone.element).find('.fa').first().show();
                    }, 5000);
                }
                window.setTimeout(function () {
                    dropZone.removeAllFiles(true);
                }, 200);
            } else {
                dropZone.ValidFile = true;
            }
        }

        function CreateDropzoneConfig(fileType) {
            var title = ParseFileType(fileType);
            return {
                'options': { // passed into the Dropzone constructor
                    'paramName': 'files',
                    'maxFiles': 1,
                    'url': '/content/PlayerFile?type=' + fileType + '&id=$id',
                    'autoProcessQueue': true,
                    'dictRemoveFile': 'הסרת ' + title,
                    'addRemoveLinks': true
                },
                'eventHandlers': {
                    'sending': function (dropZone, file, xhr, formData) {
                        HandleFileUpload(dropZone, file, fileType)
                    },
                    'success': function (file, response) {
                        var dropZone = this;
                        if (dropZone.ValidFile && dropZone.element) {
                            var element = $(dropZone.element);
                            var messagePanel = element.find('.dz-message');
                            var previewPanel = element.find('.dz-preview');
                            messagePanel.data('handled', '0');
                            window.setTimeout(function() {
                                previewPanel.hide();
                                messagePanel.show();
                            }, 200);
                        }
                    },
                    'maxfilesexceeded': function(file){
                        var _this = this;
                        window.setTimeout(function() {
                            _this.removeFile(file);
                        }, 200);
                    }
                }
            }
        }


        $scope.dropzoneConfig_Picture = CreateDropzoneConfig(1);
        $scope.dropzoneConfig_MedicalForm = CreateDropzoneConfig(2);
        $scope.dropzoneConfig_IdVoucher = CreateDropzoneConfig(3);

        function ApplyUserData(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var schoolSymbol = $scope.loggedUser.SchoolSymbol;
            $http.get('/api/sportsman/school-data?symbol=' + schoolSymbol).then(function(resp) {
                $scope.isClubSchool = resp.data.CLUB_STATUS == 1;
            });
            $scope.selected.team = null;
            if (schoolSymbol) {
                registerUtils.buildSchoolName($http, schoolSymbol).then(function (schoolName) {
                    $scope.loggedUser.SchoolName = schoolName;
                }, function (err) {
                    console.log('error reading school name');
                    console.log(err);
                });
                $http.get('/api/sportsman/school/' + schoolSymbol + '/teams').then(function(resp) {
                    $scope.schoolTeams = resp.data;
                    $scope.schoolTeams.sort(function(t1, t2) {
                        var p = t2.IsPending - t1.IsPending;
                        if (p != 0)
                            return p;
                        var s = t2.SPORT_ID - t1.SPORT_ID;
                        if (s != 0)
                            return s;
                        var c = t2.CHAMPIONSHIP_ID - t1.CHAMPIONSHIP_ID;
                        if (c != 0)
                            return c;
                        return t1.TEAM_INDEX - t2.TEAM_INDEX;
                    });
                    var playerMapping = {};
                    for (var i = 0; i < $scope.schoolTeams.length; i++) {
                        var curTeam = $scope.schoolTeams[i];
                        if (curTeam.TEAM_INDEX)
                            curTeam.HebrewIndex = sportUtils.GetHebrewLetter(curTeam.TEAM_INDEX);
                        if (curTeam.REGISTRATION_DATE)
                            curTeam.REGISTRATION_DATE = new Date(curTeam.REGISTRATION_DATE);
                        if (curTeam.Players) {
                            curTeam.Players.forEach(function(curPlayer) {
                                playerMapping[curPlayer.STUDENT_ID.toString()] = curPlayer;
                                if (curPlayer.BIRTH_DATE)
                                    curPlayer.BIRTH_DATE = new Date(curPlayer.BIRTH_DATE);
                                curPlayer.Status = {
                                    Description: registerUtils.ParsePlayerStatus(curPlayer.STATUS),
                                    Style: registerUtils.PlayerStatusStyle(curPlayer.STATUS),
                                    Tooltip: registerUtils.PlayerStatusTitle(curPlayer)
                                };
                            });
                            curTeam.Players = registerUtils.SplitPlayersByStatus(curTeam.Players);
                            curTeam.RegisteredPlayersCountHebrew = registerUtils.HebrewCount(curTeam.Players.RegisteredPlayers.length,
                                true, 'שחקן רשום', 'שחקנים רשומים');
                            curTeam.ConfirmedPlayersCountHebrew = registerUtils.HebrewCount(curTeam.Players.ConfirmedPlayers.length,
                                true, 'שחקן מאושר', 'שחקנים מאושרים');
                            curTeam.UnConfirmedPlayersCountHebrew = registerUtils.HebrewCount(curTeam.Players.UnConfirmedPlayers.length,
                                true, 'שחקן לא מאושר', 'שחקנים לא מאושרים');
                        }
                    }
                    $http.get('/api/sportsman/latest-season').then(function(resp) {
                        var latestSeason = resp.data.Season;
                        if (latestSeason) {
                            $scope.latestSeason = latestSeason;
                            $scope.schoolTeams.forEach(function(curTeam) {
                                GetAllPlayers(curTeam).forEach(function (curPlayer) {
                                    if (curPlayer.GRADE) {
                                        curPlayer.ParsedGrade = sportUtils.TranslateGrade(curPlayer.GRADE, latestSeason);
                                    }
                                });
                            });
                        }
                    });
                    registerUtils.InitTeamPanelsTimer();
                    $http.get('/api/sportsman/school-change-requests').then(function(resp) {
                        for (var i = 0; i < resp.data.length; i++) {
                            var curItem = resp.data[i];
                            var curStudentId = curItem.STUDENT_ID;
                            var matchingPlayer = playerMapping[curStudentId.toString()];
                            if (matchingPlayer) {
                                matchingPlayer.DifferentSchool = {
                                    Symbol: curItem.SYMBOL,
                                    Name: curItem.SCHOOL_NAME
                                };
                            }
                        }
                        if (callback != null)
                            callback();
                    }, function(err) {
                        console.log('error loading school change requests')
                        console.log(err);
                        if (callback != null) {
                            callback();
                        }
                    });
                }, function(err) {
                    console.log('error reading school teams');
                    console.log(err);
                });
            }
        }

        contentUtils.InitSportFieldColors($http, function() {

        });

        function GetAllPlayers(team) {
            if (team.Players) {
                return team.Players.RegisteredPlayers.concat(team.Players.ConfirmedPlayers).concat(team.Players.UnConfirmedPlayers);
            } else {
                return [];
            }
        }

        function OpenPlayerSelectionDialog(team, editPlayer, callback) {
            $uibModal.open({
                templateUrl: 'views/player-selection.html',
                controller: 'PlayerSelectionCtrl',
                resolve: {
                    championshipData: function () {
                        if (team == null) {
                            return {
                                ChampionshipName: '',
                                LatestSeason: $scope.latestSeason,
                                CategoryId: 0,
                                SchoolSymbol: '0',
                                ExistingPlayers: [],
                                EditStudent: editPlayer
                            }
                        } else {
                            var allPlayers = GetAllPlayers(team);
                            return {
                                ChampionshipName: team.CHAMPIONSHIP_NAME + ', ' + team.CATEGORY_NAME,
                                CategoryId: team.CHAMPIONSHIP_CATEGORY_ID,
                                SchoolSymbol: $scope.loggedUser.SchoolSymbol,
                                LatestSeason: $scope.latestSeason,
                                ExistingPlayers: allPlayers,
                                SportID: team.SPORT_ID
                            };
                        }
                    },
                    options: function () {
                        return {};
                    }
                }
            }).result.then(function (selectedStudents) {
                    if (callback) {
                        callback(selectedStudents);
                    }
                });
        }

        $http.get('/api/login').then(function(resp) {
            if (resp && resp.data && resp.data != null) {
                $scope.loggedUser = {
                    'Seq': resp.data.seq,
                    'Login': resp.data.name,
                    'DisplayName': resp.data.displayName,
                    'Role': resp.data.role,
                    'SchoolSymbol': resp.data.schoolSymbol
                };
                ApplyUserData();
            }
        }, function(err) {
            console.log('error getting logged in user');
            console.log(err);
        });

        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);

        //window['qL_step_finished'] = true;

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            return 'background-color: ' + contentUtils.getSportFieldColor(sportFieldSeq) + ';';
        };

        $scope.deletePlayer = function(player) {
            var playerId = player.PLAYER_ID;
            var teamId = $scope.selected.team.TEAM_ID;
            var msg = 'האם להסיר את ' + player.FIRST_NAME + ' ' + player.LAST_NAME + ' מ' + $scope.selected.team.CHAMPIONSHIP_NAME + '?';
            messageBox.ask(msg).then(function () {
                $http.delete('/api/sportsman/player?player=' + playerId).then(function() {
                    ApplyUserData(function() {
                        $timeout(function() {
                            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == teamId; });
                            if (index >= 0)
                                $scope.selectTeam($scope.schoolTeams[index]);
                        }, 500);
                    });
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת שחקן, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.deleteTeam = function(team) {
            var teamId = team.TEAM_ID;
            var msg = 'האם למחוק קבוצה זו? הפעולה בלתי הפיכה!';
            messageBox.ask(msg).then(function () {
                team.deleting = true;
                $http.delete('/api/sportsman/team?team=' + teamId).then(function() {
                    team.deleting = false;
                    ApplyUserData();
                }, function(err) {
                    team.deleting = false;
                    console.log(err);
                    alert('שגיאה בעת מחיקת קבוצה, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.registerTeam = function() {
            var teamsMapping = {};
            for (var i = 0; i < $scope.schoolTeams.length; i++) {
                var curTeam = $scope.schoolTeams[i];
                var key = curTeam.CHAMPIONSHIP_CATEGORY_ID.toString();
                if (!teamsMapping[key])
                    teamsMapping[key] = [];
                teamsMapping[key].push(curTeam);
            }

            $uibModal.open({
                templateUrl: 'views/championship-selection.html',
                controller: 'ChampionshipSelectionCtrl',
                resolve: {
                    schoolData: function() {
                        return {
                            Name: $scope.loggedUser.SchoolName,
                            Symbol: $scope.loggedUser.SchoolSymbol,
                            Teams: teamsMapping
                        };
                    },
                    sportField: function () {
                        return null;
                    },
                    allSeasons: function () {
                        return null;
                    },
                    allRegions: function () {
                        return null;
                    },
                    options: function () {
                        return {

                        };
                    }
                }
            }).result.then(function (data) {
                    registerUtils.registerTeams($http, $scope.loggedUser, data.Category, data.Amount, function() {
                        ApplyUserData();
                    }, null);
            });
        };

        $scope.registerNewPlayers = function(team) {
            OpenPlayerSelectionDialog(team, null, function(selectedStudents) {
                var teamId = team.TEAM_ID;
                $http.put('/api/sportsman/team/' + teamId + '/players', {Players: selectedStudents}).then(function(resp) {
                    ApplyUserData(function() {
                        $timeout(function() {
                            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == teamId; });
                            if (index >= 0)
                                $scope.selectTeam($scope.schoolTeams[index]);
                        }, 500);
                    });
                }, function(err) {
                    alert('שגיאה בעת הוספת שחקנים לקבוצה, אנא נסו שוב מאוחר יותר');
                    console.log(err);
                });
            });
        };

        $scope.PlayerFileClicked = function(player, fileType) {
            //got file?
            var idNumber = player.ID_NUMBER;
            var fileData = GetFileData(idNumber, fileType);
            if (fileData.HasFile) {
                $uibModal.open({
                    templateUrl: 'views/player-file.html',
                    controller: 'PlayerFileCtrl',
                    resolve: {
                        PlayerInfo: function () {
                            return {
                                IdNumber: player.ID_NUMBER,
                                Name: player.FIRST_NAME + ' ' + player.LAST_NAME,
                                FileTitle: ParseFileType(fileType),
                                FileType: fileType,
                                PDF: fileData.PDF
                            };
                        },
                        options: function () {
                            return {
                            };
                        }
                    }
                }).result.then(function (resp) {
                        if (resp == 'DELETED') {
                            fileData.MessagePanel.data('handled', '0');
                        }
                    });
            }
        };

        $scope.selectTeam = function(team) {
            if (abortTeamSelection) {
                abortTeamSelection = false;
                return;
            }
            $scope.selected.team = team;
            registerUtils.InitPlayerPlaceholdersTimer();
            registerUtils.InitPlayerFilesTimer();
            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == team.TEAM_ID; });
            $scope.schoolTeams.moveItem(index, 0);
            document.documentElement.scrollTop = 50;
        };

        $scope.selectPlayer = function(player) {
            if ($scope.selected.team == null || $scope.selected.team.Players == null)
                return;
            var allPlayers = GetAllPlayers($scope.selected.team);
            allPlayers.forEach(function(p) {
                p.Selected = false;
            });
            player.Selected = true;
            document.body.scrollTop = 50;
        };

        $scope.editPlayer = function(player) {
            OpenPlayerSelectionDialog(null, player, function(editedStudent) {
                if (editedStudent == 'DELETED') {
                    var teamId = $scope.selected.team.TEAM_ID;
                    ApplyUserData(function() {
                        $timeout(function() {
                            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == teamId; });
                            if (index >= 0)
                                $scope.selectTeam($scope.schoolTeams[index]);
                        }, 500);
                    });
                } else {
                    editedStudent.Id = player.PLAYER_ID;
                    var clonedPlayer = {};
                    for (var propertyName in editedStudent) {
                        var value = editedStudent[propertyName];
                        if ($scope.latestSeason != null && propertyName == 'Grade')
                            value = $scope.latestSeason - (value.Index - 1);
                        clonedPlayer[propertyName] = value;
                    }
                    $http.put('/api/sportsman/player', {Player: clonedPlayer}).then(function () {
                        player.FIRST_NAME = editedStudent.FirstName;
                        player.LAST_NAME = editedStudent.LastName;
                        player.BIRTH_DATE = editedStudent.Birthday;
                        player.GRADE = clonedPlayer.Grade;
                        player.ParsedGrade = sportUtils.TranslateGrade(player.GRADE, $scope.latestSeason);
                    }, function (err) {
                        console.log(err);
                        alert('שגיאה בעת עריכת פרטי  שחקן, נא לנסות מאוחר יותר');
                    });
                 }
            });
        };

        $scope.getTeamPanelStyle = function(team) {
            if ($scope.selected.team != null && $scope.selected.team.TEAM_ID == team.TEAM_ID)
                return 'background-color: #AFD2DB;';
            return '';
        };

        $scope.getPlayerPanelStyle = function(player) {
            return (player.Selected) ? 'background-color: #AFD2DB;' : '';
        };

        $scope.removePendingTeam = function(team) {
            abortTeamSelection = true;
            var msg = 'האם לבטל רישום של קבוצה זו?';
            messageBox.ask(msg).then(function () {
                $http.delete('/api/sportsman/pending-team?team=' + team.TEAM_ID).then(function() {
                    $scope.schoolTeams = $scope.schoolTeams.filter(function(x) { return x.TEAM_ID != team.TEAM_ID; });
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת קבוצה, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.login = function () {
            $scope.errorMessage = null;
            sportUtils.Login($q, $http, $scope.userInput.username, $scope.userInput.password).then(function(user) {
                $scope.loggedUser = {
                    'Seq': user.seq,
                    'Login': $scope.username,
                    'DisplayName': user.displayName,
                    'Role': user.role,
                    'SchoolSymbol': user.schoolSymbol
                };
                ApplyUserData();
            }, function(err) {
                $scope.errorMessage = err;
            });
        };
    }
})();
var registerUtils = {
    _playerPlaceholdersTimer: 0,
    _playerFilesTimer: 0,
    _teamPanelsTimer: 0,
    sharedClubData: {
        authorizationLevels: [
            { Id: 1, Caption: 'מורה' },
            { Id: 2, Caption: 'מדריך/ה' },
            { Id: 3, Caption: 'מאמן/ת' }
        ],
        yesNoOptions: [
            { Id: 1, Caption: 'כן' },
            { Id: 2, Caption: 'לא' }
        ]
    },
    registerTeams: function($http, user, championshipCategory, amount, successCallback, errorCallback) {
        function RegisterError(err) {
            console.log('error while registering new team');
            console.log(err);
            alert('כשלון בעת  שמירת נתונים, נא לנסות שוב מאוחר יותר');
            if (errorCallback != null)
                errorCallback();
        }

        function RegisterSingleTeam(requestParameters, index) {
            if (index >= amount) {
                if (successCallback != null)
                    successCallback();
                return;
            }
            $http.post('/api/sportsman/team', requestParameters).then(function(resp) {
                RegisterSingleTeam(requestParameters, index + 1);
            }, RegisterError);
        }

        //sanity check
        if (amount > 2)
            amount = 2;
        var userId = user.Seq || user.seq;
        var schoolSymbol = user.SchoolSymbol || user.schoolSymbol;
        var championshipId = championshipCategory.ChampionshipId;
        var categoryId = championshipCategory.CategoryId;
        var requestParameters = {
            User: userId,
            School: schoolSymbol,
            Championship: championshipId,
            Category: categoryId
        };
        RegisterSingleTeam(requestParameters, 0);
    },
    getSchoolDetails: function($http, schoolSymbol) {
        return $http.get('/api/sportsman/school/' + schoolSymbol + '/details');
    },
    buildSchoolName: function($http, schoolSymbol) {
        return registerUtils.getSchoolDetails($http, schoolSymbol).then(function(resp) {
            var schoolName = resp.data.SCHOOL_NAME;
            var cityName = resp.data.CITY_NAME;
            if (cityName && cityName.length > 0 && schoolName.indexOf(cityName) < 0) {
                schoolName += ' ' + cityName;
            }
            return schoolName;
        });
    },
    SplitPlayersByStatus: function(rawPlayers) {
        var splittedPlayers = {
            length: rawPlayers.length,
            RegisteredPlayers: [],
            ConfirmedPlayers: [],
            UnConfirmedPlayers: []
        };
        for (var i = 0; i < rawPlayers.length; i++) {
            var curPlayer = rawPlayers[i];
            switch (curPlayer.STATUS) {
                case 1:
                    splittedPlayers.RegisteredPlayers.push(curPlayer);
                    break;
                case 2:
                    splittedPlayers.ConfirmedPlayers.push(curPlayer);
                    break;
                case 3:
                    splittedPlayers.UnConfirmedPlayers.push(curPlayer);
                    break;
            }
        }
        return splittedPlayers;
    },
    HebrewCount: function(amount, isMale, singleTitle, pluralTitle) {
        if (amount < 1)
            return 'אין ' + pluralTitle;
        if (amount == 1) {
            var hebSingle = isMale ? 'אחד' : 'אחת';
            return singleTitle + ' ' + hebSingle;
        }
        return amount + ' ' + pluralTitle;
    },
    ParsePlayerStatus: function(playerStatus) {
        switch (playerStatus) {
            case 1:
                return 'רשום';
            case 2:
                return 'מאושר';
            case 3:
                return 'לא מאושר';
        }
        return 'לא ידוע';
    },
    PlayerStatusStyle: function(playerStatus) {
        var bgColor = '';
        switch (playerStatus) {
            case 1:
                bgColor = '#d9edf7';
                break;
            case 2:
                bgColor = '#dff0d8';
                break;
            case 3:
                bgColor = '#f2dede';
                break;
        }
        var style = 'color: #3b5998;';
        if (bgColor.length > 0)
            style += 'background-color: ' + bgColor;
        return style;
    },
    PlayerStatusTitle: function(player) {
        if (player.STATUS == 3)
            return player.RejectReason || '';
        return '';
    },
    InitPlayerPlaceholdersTimer: function() {
        window.clearInterval(registerUtils._playerPlaceholdersTimer);
        registerUtils._playerPlaceholdersTimer = window.setInterval(function() {
            var playerPlaceholders = $(".player-placeholder");
            if (playerPlaceholders.length > 0) {
                playerPlaceholders.each(function() {
                    var playerPlaceholder = $(this);
                    var differentSchoolNotice = playerPlaceholder.find(".different-school-notice");
                    if (playerPlaceholder.width() < 680) {
                        playerPlaceholder.removeClass("player-placeholder-normal");
                        playerPlaceholder.addClass("player-placeholder-small-screen");
                        differentSchoolNotice.addClass("different-school-notice-small-screen");
                    } else {
                        playerPlaceholder.removeClass("player-placeholder-small-screen");
                        playerPlaceholder.addClass("player-placeholder-normal");
                        differentSchoolNotice.removeClass("different-school-notice-small-screen");
                    }
                });
            }
        }, 500);
    },
    InitTeamPanelsTimer: function() {
        window.clearInterval(registerUtils._teamPanelsTimer);
        registerUtils._teamPanelsTimer = window.setInterval(function() {
            var teamPanels = $(".team-panel");
            if (teamPanels.length > 0) {
                teamPanels.each(function() {
                    var teamPanel = $(this);
                    var caption = teamPanel.find("h3").first();
                    if (teamPanel.width() < 360) {
                        teamPanel.addClass("team-panel-small-screen");
                        caption.css("width", "200px");
                    } else {
                        teamPanel.removeClass("team-panel-small-screen");
                        caption.css("width", "inherit");
                    }
                });
            }
        }, 500);
    },
    InitPlayerFilesTimer: function() {
        function LoadFiles(dropZoneMessagePanel) {
            var dropZoneParent = dropZoneMessagePanel.parents(".dropzone").first();
            if (dropZoneParent.length == 1) {
                var playerId = dropZoneParent.data("player-id");
                var fileType = dropZoneParent.data("file-type");
                var defaultIconSpan = dropZoneMessagePanel.find(".fa").first();
                var picturePreview = dropZoneMessagePanel.find(".picture-preview");
                var pdfPreview = dropZoneMessagePanel.find(".file-pdf");
                if (playerId && fileType) {
                    var url = "/content/PlayerFile?type=" + fileType + "&id=" + playerId;
                    var ajax = $.get(url, function() {
                        var filePanel = dropZoneMessagePanel.parents(".player-file").first();
                        var contentType = ajax.getResponseHeader("content-Type");
                        var hasFile = false;
                        var isPDF = "0";
                        if (contentType) {
                            if (contentType.indexOf("image/") == 0) {
                                picturePreview.attr("src", url);
                                picturePreview.show();
                                hasFile = true;
                            } else if (contentType.indexOf("/pdf") > 0) {
                                if (pdfPreview.length == 1) {
                                    pdfPreview.show();
                                    hasFile = true;
                                    isPDF = "1";
                                }
                            }
                        }
                        if (hasFile) {
                            defaultIconSpan.hide();
                            filePanel.data("has-file", "1");
                        } else {
                            defaultIconSpan.show();
                            filePanel.data("has-file", "0");
                        }
                        filePanel.data("is-pdf", isPDF);
                    });
                }
            }
        }
        window.clearInterval(registerUtils._playerFilesTimer);
        registerUtils._playerFilesTimer = window.setInterval(function() {
            var dropZoneMessagePanels = $(".dz-message");
            if (dropZoneMessagePanels.length > 0) {
                dropZoneMessagePanels.each(function() {
                    var dropZoneMessagePanel = $(this);
                    if (dropZoneMessagePanel.data("handled") != "1") {
                        var containerId = dropZoneMessagePanel.parents(".player-file").first().data("file-container");
                        if (containerId && containerId.length > 0) {
                            var oContainer = $("#" + containerId);
                            dropZoneMessagePanel.html(oContainer.html());
                            LoadFiles(dropZoneMessagePanel);
                        }
                        dropZoneMessagePanel.data("handled", "1");
                    }
                });
            }

            var playerFiles = $(".player-file");
            if (playerFiles.length > 0 && window['_AllDropZones_']) {
                playerFiles.each(function() {
                    var playerFile = $(this);
                    var dzElement = playerFile.find(".dropzone");
                    var playerId = dzElement.data("player-id");
                    var fileType = dzElement.data('file-type');
                    if (playerId && fileType) {
                        var hasFile = playerFile.data("has-file") == "1";
                        var key = playerId + '_' + fileType;
                        var dropzone = window['_AllDropZones_'][key];
                        if (dropzone)
                            $(dropzone.hiddenFileInput).prop('disabled', hasFile);
                    }
                });
            }
        }, 200);
    }
};


(function() {
    'use strict';

    angular
        .module('sport.reports')
        .controller('ReportsController',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', ReportsController]);

    function ReportsController($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        var allRows = [];
        var baseFileUrl = '/content/PlayerFile?type=$type&id=$id';
        var fileInterval = 0;
        $scope.error = '';
        $scope.data = {
            SelectedSeason: {
                Name: localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] || '',
                Year: localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Year] || 0
            },
            CurrentSeasonYear: 0,
            Search: '',
            Sort: null,
            Loading: false,
            Error: '',
            Views: [],
            Fields: null,
            Rows: null,
            ExcelInProgress: false,
            AvailableColumnsVisible: false,
            HiddenColumnExists: false
        };
        $scope.selected = {
            'View': null
        };

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope);
            window['qL_step_finished'] = true;
        }

        VerifyUser();

        $http.get('/api/sportsman/views').then(function(resp) {
            $scope.data.Views = resp.data.slice(0);
        }, function(err) {
            console.log(err);
            $scope.error = 'failed to load views';
        });

        $http.get('/api/seasons/current').then(function(resp) {
            $scope.data.CurrentSeasonYear = resp.data.Year;
        });

        function filteredRows() {
            var searchTerm = $.trim($scope.data.Search);
            var filtered = allRows.slice(0);
            if (searchTerm.length > 0)
                filtered = $filter('filter')(filtered, searchTerm);
            filtered = reportUtils.applyFilters($scope.data.Fields, filtered);
            if ($scope.data.Sort != null) {
                var sortColumn = $scope.data.Sort.Column || '';
                if (sortColumn.length > 0) {
                    reportUtils.sort(filtered, sortColumn, $scope.data.Fields, $scope.data.Sort.Descending);
                }
            }
            return filtered;
        }

        function HandlePlayerFiles() {
            $(".report-file").each(function() {
                var placeholder = $(this);
                if (placeholder.data("handled") != "1" && placeholder.data("in_progress") != "1") {
                    var idNumber = placeholder.data("idnumber");
                    var url = baseFileUrl.replace("$type", placeholder.data("type")).replace("$id", idNumber);
                    placeholder.data("in_progress", "1");
                    var loadingIcon = placeholder.find(".file-loading-icon");
                    loadingIcon.show();
                    var ajax = $.get(url, function() {
                        placeholder.data("in_progress", "0");
                        loadingIcon.hide();
                        var hasFile = false;
                        var contentType = ajax.getResponseHeader("content-Type");
                        if (contentType) {
                            if (contentType.indexOf("image/") == 0) {
                                var picturePreview = placeholder.find(".file-image");
                                picturePreview.attr("src", url);
                                picturePreview.show();
                                hasFile = true;
                            } else if (contentType.indexOf("/pdf") > 0) {
                                var pdfPreview = placeholder.find(".file-pdf");
                                if (pdfPreview.length == 1) {
                                    pdfPreview.show();
                                    hasFile = true;
                                }
                            }
                        }
                        if (hasFile) {
                            var oLink = placeholder.find("a");
                            oLink.attr("href", url);
                            oLink.show();
                        }
                        placeholder.data("handled", "1");
                    });
                }
            });
        }

        $scope.pagingService = new PagingService(filteredRows(), {pageSize: 20});
        $scope.data.Rows = [];
        $scope.pagingService.applyPaging($scope.data.Rows);

        $scope.$watch('data.Search', function (newval){
            if ($scope.pagingService && allRows.length > 0) {
                $scope.pagingService.setData(filteredRows());
            }
        });

        $scope.viewSelected = function() {
            function MakeFileField(name, type) {
                return {
                    Name: name,
                    Title: name,
                    FileType: type,
                    Visible: true,
                    Index: -1,
                    IsFile: true
                };
            }

            allRows = [];
            var url = '/api/sportsman/views/' + $scope.selected.View.VIEW_ID;
            var selectedSeason = $scope.data.SelectedSeason.Name;
            if (selectedSeason && selectedSeason.length > 0)
                url += '?season=' + selectedSeason;
            $scope.data.Loading = true;
            $scope.data.Fields = [];
            $http.get(url).then(function(resp) {
                $scope.data.Loading = false;
                reportUtils.InitClearFiltersPositionTimer();
                for (var i = 0; i < resp.data.Fields.length; i++) {
                    var curFieldName = resp.data.Fields[i];
                    var fieldObject = {
                        Name: curFieldName,
                        Type: reportUtils.parseFieldType(curFieldName),
                        Title: reportUtils.cleanFieldName(curFieldName),
                        Visible: !curFieldName.startsWithEnglishLetter(),
                        Index: i + 1
                    }
                    $scope.data.Fields.push(fieldObject);
                }
                if ($scope.selected.View.VIEW_NAME == 'ViewPlayers') {
                    $scope.data.Fields.push(MakeFileField('תמונה', 1));
                    $scope.data.Fields.push(MakeFileField('בדיקה רפואית', 2));
                    $scope.data.Fields.push(MakeFileField('ספח ת"ז', 3));
                }
                allRows = resp.data.Rows;
                if ($scope.selected.View.VIEW_NAME == 'ViewPlayers') {
                    allRows.forEach(function(row) {
                        row['IdNumber'] = row['מספר זהות'];
                    });
                }
                reportUtils.applyFieldTypes($scope.data.Fields, allRows, $filter);
                var defaultSort = reportUtils.applySpecialCases($scope.selected.View.VIEW_NAME, allRows, $filter);
                if (defaultSort != null)
                    $scope.data.Sort = defaultSort;
                $scope.pagingService.setData(filteredRows());

                if (fileInterval)
                    window.clearInterval(fileInterval);
                fileInterval = window.setInterval(HandlePlayerFiles, 200);
                window.setTimeout(function() {
                    var chooseTableColumnsLink = $("#lnkChooseTableColumns");
                    var availableColumnsPanel = $("#pnlAvailableColumns");
                    var leftPos = chooseTableColumnsLink.position().left + 10;
                    var totalWidth = chooseTableColumnsLink.outerWidth() - 1;
                    availableColumnsPanel.css({
                        "left": leftPos + "px",
                        "width": totalWidth + "px"
                    });
                    $(".available-columns-title").css("width", (totalWidth - 48) + "px");
                }, 500);
            }, function(err) {
                $scope.data.Loading = false;
                $scope.data.Error = 'שגיאה בעת טעינת דו"ח';
                console.log(err);
                $scope.pagingService.setData(filteredRows());
            });
        };

        $scope.changeSort = function(field) {
            if (field.IsFile)
                return;

            if ($scope.data.Sort != null && $scope.data.Sort.Column == field.Title) {
                $scope.data.Sort.Descending = !$scope.data.Sort.Descending;
            } else {
                $scope.data.Sort = {
                    Column: field.Title,
                    Descending: false
                }
            }
            $scope.pagingService.setData(filteredRows());
        };

        $scope.toggleFilter = function(field) {
            $scope.data.Fields.forEach(function(x) {
                if (x.Index != field.Index) {
                    x.Filtered = false;
                }
            });
            field.Filtered = !field.Filtered;
            if (field.Filtered) {
                window.setTimeout(function () {
                    $('input[data-field-index="' + field.Index + '"]').focus();
                }, 500);
            }
        };

        $scope.getFilterStyle = function(field) {
            return field.FilterText && field.FilterText.length > 0 ? 'color: #00ADEE;' : '';
        };

        $scope.filterChanged = function(field) {
            $scope.pagingService.setData(filteredRows());
        };

        $scope.clearFilter = function(field) {
            field.FilterText = '';
            field.Filtered = false;
            $scope.filterChanged(field);
        };

        $scope.clearAllFilters = function() {
            $scope.data.Fields.forEach(function(field) {
                $scope.clearFilter(field);
            });
        };

        $scope.gotFilters = function() {
            if ($scope.data.Fields) {
                for (var i = 0; i < $scope.data.Fields.length; i++) {
                    var curField = $scope.data.Fields[i];
                    if (curField.FilterText)
                        return true;
                }
            }
            return false;
        };

        $scope.chooseColumns = function() {
            $scope.data.AvailableColumnsVisible = !$scope.data.AvailableColumnsVisible;
        };

        $scope.availableColumnClicked = function(field) {
            field.IsHidden = !field.IsHidden;
            $scope.data.HiddenColumnExists = $scope.data.Fields.findIndex(function(x) { return x.IsHidden; }) >= 0;
        };

        $scope.undoColumnSelection = function() {
            $scope.data.Fields.setForAll('IsHidden', false);
            $scope.data.HiddenColumnExists = false;
        };

        $scope.exportExcel = function() {
            $scope.data.ExcelInProgress = true;
            var allFields = $scope.data.Fields.filter(function(x) {
                return x.Visible && !x.IsHidden;
            }).map(function(x) {
                return x.Title;
            });
            var fieldMapping = {};
            $scope.data.Fields.forEach(function(field) {
                fieldMapping[field.Title] = field.Name;
            });
            var allRows = $scope.pagingService.getAllData().map(function(row) {
                console.log(row);
                var values = [];
                allFields.forEach(function(fieldTitle) {
                    values.push(row[fieldMapping[fieldTitle]]);
                });
                return values;
            });
            console.log('rows count: ' + allRows.length);
            var date1 = new Date();
            var viewCaption = $scope.selected.View.VIEW_NAME;
            var url = '/api/common/excel?name=' + sportUtils.RemoveSpecialCharacters(viewCaption) + '&sheet=' + encodeURIComponent(viewCaption);
            //console.log(allRows);
            //allRows.forEach(function(arrCells) {
            //    arrCells[12] = '✓';
            //});
            $http.post(url, {Headers: allFields, Rows: allRows}).then(function(resp) {
                $scope.data.ExcelInProgress = false;
                var date2 = new Date();
                var diff = (date2.getTime() - date1.getTime());
                console.log('generating excel took ' + diff + ' miliseconds, which are ' + (diff / 1000) + ' seconds');
                var excelName = resp.data;
                var fullUrl = '/content/Excel/' + excelName;
                window.setTimeout(function() {
                    var oFrame = $('<iframe></iframe>');
                    oFrame.attr('src', fullUrl);
                    $('body').append(oFrame);
                    oFrame.hide();
                }, 1000);
            }, function(err) {
                $scope.data.ExcelInProgress = false;
                alert('שגיאה בעת  יצירת גיליון אקסל, נא לנסות שוב מאוחר יותר');
                console.log(err);
            });
        };
    }
})();
var reportUtils = {
    _clearFiltersPositionTimer: 0,
    FieldType: {
        Ordinary: 1,
        Date: 2
    },
    _possibleFieldTypes: [],
    possibleFieldTypes: function() {
        if (reportUtils._possibleFieldTypes.length == 0) {
            reportUtils._possibleFieldTypes.push({
                Key: 'date',
                Type: reportUtils.FieldType.Date
            });
        }
        return reportUtils._possibleFieldTypes;
    },
    parseFieldType: function(fieldName) {
        for (var i = 0; i < reportUtils.possibleFieldTypes().length; i++) {
            var possibleFieldType = reportUtils.possibleFieldTypes()[i];
            if (fieldName.endsWith('|' + possibleFieldType.Key))
                return possibleFieldType.Type;
        }
        return reportUtils.FieldType.Ordinary;
    },
    cleanFieldName: function(fieldName) {
        var clean = fieldName + '';
        reportUtils.possibleFieldTypes().forEach(function(x) {
            clean = clean.replace('|' + x.Key, '');
        });
        return clean;
    },
    applySpecialCases: function(viewName, rows, $filter) {
        if (viewName == 'ViewTeams' || viewName == 'ViewPlayers') {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                row['שם קבוצה'] = reportUtils.buildTeamName(row);
            }
            return {
                Column: 'תאריך רישום',
                Descending: true
            }
        }
        if (viewName == 'ViewMatches') {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                console.log(row['PreviousGroupName_A']);
                row['קבוצה א\''] = reportUtils.getPreviousPhaseTeam(row, 'A') || eventsUtils.BuildTeamName(row, 'A');
                row['קבוצה ב\''] = reportUtils.getPreviousPhaseTeam(row, 'B') || eventsUtils.BuildTeamName(row, 'B');
                row['תוצאה'] = reportUtils.buildGameResult(row);
                if (row['RawDate']) {
                    var parsedDate = reportUtils.parseRawDate(row['RawDate']);
                    row['תאריך'] = parsedDate.Date;
                    row['שעה'] = parsedDate.Time;
                }
            }
            return {
                Column: 'אליפות',
                Descending: false
            }
        }
        return null;
    },
    getPreviousPhaseTeam: function(row, teamLetter) {
        var groupIndex = row['PreviousGroupIndex_' + teamLetter];
        if (groupIndex != null) {
            var groupName = row['PreviousGroupName_' + teamLetter];
            if (groupName != null && groupName.length > 0)
                return groupName + ' מיקום ' + (groupIndex + 1);
        }
        return null;
    },
    buildGameResult: function(row) {
        var gameResult = '';
        var result = row['RESULT'];
        var scoreA = row['TEAM_A_SCORE'];
        var scoreB = row['TEAM_B_SCORE'];
        var partsResult = row['PARTS_RESULT'];
        if (result != null && scoreA != null && scoreB != null) {
            gameResult = scoreA + ' - ' + scoreB;
            /*
            if (partsResult != null && partsResult.length > 0) {
                while (partsResult.indexOf('|') > 0)
                    partsResult = partsResult.replace('|', ',');
                gameResult += ' (' + partsResult + ')';
            }
            */
        }
        return gameResult;

    },
    parseRawDate: function(rawDate) {
        //2018-05-28T02:00:35.000Z
        var date = '';
        var time = '';
        var mainParts = rawDate.split('T');
        if (mainParts.length == 2) {
            dateParts = mainParts[0].split('-');
            timeParts = mainParts[1].split(':');
            if (dateParts.length == 3) {
                date = [dateParts[2], dateParts[1], dateParts[0]].join('/');
            }
            if (timeParts.length > 2) {
                time = [timeParts[0], timeParts[1]].join(':');
            }
        }
        return {
            Date: date,
            Time: time
        };
    },
    buildTeamName: function(dataRow) {
        var schoolName = dataRow['SCHOOL_NAME'];
        var cityName = dataRow['CITY_NAME'] || '';
        var teamName = schoolName;
        if (teamName.indexOf(cityName) < 0)
            teamName += ' ' + cityName;
        return teamName;
    },
    applyFieldTypes: function(fields, rows, $filter) {
        var dateFields = fields.filter(function(x) {
            return x.Type == reportUtils.FieldType.Date;
        });
        if (dateFields.length > 0) {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                dateFields.forEach(function(dateField) {
                    var dateFieldName = dateField.Name;
                    var curValue = row[dateFieldName];
                    row['original_' + dateFieldName] = curValue;
                    row[dateFieldName] = $filter('date')(curValue, 'dd/MM/yyyy');
                });
            }
        }
    },
    applyFilters: function(fields, rows) {
        if (!fields || fields.length == 0 || !rows || rows.length == 0)
            return [];

        var filteredFields = fields.filter(function(x) {
            return x.FilterText && x.FilterText.length > 0;
        });

        if (filteredFields.length > 0) {
            var filteredRows = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var matchingAll = true;
                for (var j = 0; j < filteredFields.length; j++) {
                    var filteredField = filteredFields[j];
                    var currentValue = (row[filteredField.Name] || '').toString();
                    if (currentValue.indexOf(filteredField.FilterText) < 0) {
                        matchingAll = false;
                        break;
                    }
                }
                if (matchingAll)
                    filteredRows.push(row);
            }
            return filteredRows;
        } else {
            return rows;
        }
    },
    sort: function(rows, sortColumn, fields, isDescending) {
        if (!rows || rows.length == 0 || !sortColumn || !fields || fields.length == 0)
            return;
        if (typeof isDescending == 'undefined')
            isDescending = false;
        var matchingField = fields.findItem(function(x) {
            return x.Title == sortColumn;
        });
        if (matchingField == null)
            return;
        var propName = (matchingField.Type == reportUtils.FieldType.Date) ? 'original_' + matchingField.Name : matchingField.Name;
        var biggerThanReturnValue = isDescending ? -1 : 1;
        var smallerThanReturnValue = isDescending ? 1 : -1;
        rows.sort(function(r1, r2) {
            var v1 = r1[propName];
            var v2 = r2[propName];
            var bigger = (v1 > v2);
            return bigger ? biggerThanReturnValue : ((v1 < v2) ? smallerThanReturnValue : 0);
        });
    },
    InitClearFiltersPositionTimer: function() {
        if (reportUtils._clearFiltersPositionTimer)
            window.clearInterval(reportUtils._clearFiltersPositionTimer);
        reportUtils._clearFiltersPositionTimer = window.setInterval(function() {
            $(".clear-filter:visible").each(function() {
                var oClearFilter = $(this);
                var oSortIcon = oClearFilter.parents("th").find(".sortIcon:visible");
                if (oSortIcon.length == 1) {
                    oClearFilter.css("top", "35px");
                } else {
                    oClearFilter.css("top", "15px");
                }
            });
        }, 500);
    }
};


(function() {
    'use strict';

    angular
        .module('sport.UPYA')
        .controller('UPYA_Controller',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', UPYA_Controller])
        .controller('UPYA_Manage_Controller',
        ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', UPYA_Manage_Controller]);

    function UPYA_Controller($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        var hiddenCampsMapping = {};
        $scope.data = {
            IsLoading: true,
            availableCamps: [],
            genders: [
                {Id: 1, Name: 'זכר'},
                {Id: 2, Name: 'נקבה'}
            ]
        };

        $scope.participant = {};
        window['qL_steps_amount'] = 1;

        function ReadAllData() {
            upyaUtils.ReadPracticeCamps($scope, $http, $filter, function() {
                $scope.data.IsLoading = false;
                $http.get('/api/common/hidden-practice-camps').then(function(resp) {
                    if (resp.data.length > 0) {
                        for (var i = 0; i < resp.data.length; i++)
                            hiddenCampsMapping[resp.data[i].PRACTICE_CAMP_ID.toString()] = true;
                        $scope.data.availableCamps = $scope.data.availableCamps.filter(function(practiceCamp) {
                            return !hiddenCampsMapping[practiceCamp.PRACTICE_CAMP_ID.toString()];
                        });
                    }
                    ChainFactory.Next();
                }, function(err) {
                    ChainFactory.Next();
                });
            });
        }

        ChainFactory.Execute(ReadAllData);

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1500);

        function GetCaptchaResponse() {
            var recaptchaResponse = $('#g-recaptcha-response').val();
            var captchaValid = false;
            if (typeof recaptchaResponse == 'undefined') {
                //missing element
                captchaValid = true;
            } else {
                captchaValid = recaptchaResponse.length > 0;
            }
            return captchaValid ? recaptchaResponse : '';
        }

        $scope.IsPracticeCampHidden = function(practiceCamp) {
            return hiddenCampsMapping[practiceCamp.PRACTICE_CAMP_ID] == true;
        };

        $scope.SubmitForm = function() {
            function ExtractDate(rawDate) {
                if (rawDate && rawDate.getFullYear) {
                    return $filter('date')(rawDate, 'dd/MM/yyyy');
                } else {
                    return rawDate;
                }
            }
            $scope.formValidationErrors = [];
            if (!$scope.participant.practiceCamp)
                $scope.formValidationErrors.push('יש לבחור מחנה אימון');
            if (!$scope.participant.Name)
                $scope.formValidationErrors.push('יש להזין שם');
            if (!$scope.participant.Email) {
                $scope.formValidationErrors.push('יש להזין דואר אלקטרוני');
            } else if (!sportUtils.IsValidEmail($scope.participant.Email)) {
                    $scope.formValidationErrors.push('כתובת דואר אלקטרוני לא תקינה');
            }
            if (!$scope.participant.Address)
                $scope.formValidationErrors.push('יש להזין כתובת');
            var cellularPhone = $scope.participant.Cellular;
            var homePhone = $scope.participant.Phone;
            if (!cellularPhone && !homePhone) {
                $scope.formValidationErrors.push('יש להזין טלפון בית או סלולרי');
            } else {
                if (homePhone && !sportUtils.IsValidPhoneNumber(homePhone))
                    $scope.formValidationErrors.push('טלפון בית לא תקין');
                if (cellularPhone && !sportUtils.IsValidPhoneNumber(cellularPhone))
                    $scope.formValidationErrors.push('טלפון סלולרי לא תקין');
            }
            var captchaResponse = GetCaptchaResponse();
            if (captchaResponse.length == 0)
                $scope.formValidationErrors.push('יש לוודא שהינך לא רובוט');
            if ($scope.formValidationErrors.length == 0) {
                if ($scope.participant.Birthday)
                    $scope.participant.ParsedBirthday = ExtractDate($scope.participant.Birthday);
                $scope.formSending = true;
                var reqBody = {
                    captchaResponse: captchaResponse,
                    Participant: $scope.participant
                };
                $http.post('/api/sportsman/practice-camps', reqBody).then(function(resp) {
                    $scope.formSending = false;
                    $scope.sendResult = {
                        Success: true
                    };
                }, function(err) {
                    $scope.formSending = false;
                    $scope.sendResult = {
                        Error: 'שגיאה בעת שליחת נתונים'
                    };
                });
            }
        };
    }

    function UPYA_Manage_Controller($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        $scope.data = {
            availableCamps: []
        };

        window['qL_steps_amount'] = 2;

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3]);
            window['qL_step_finished'] = true;
        }

        function ApplyCssClass(practiceCamp) {
            practiceCamp.StateClass = 'button button_type_icon_small icon button_grey_light';
            practiceCamp.IconClass = 'fa fa-eye';
            if (practiceCamp.Hidden) {
                practiceCamp.IconClass += '-slash';
                practiceCamp.Tooltip = 'מחנה אימון מוסתר, יש ללחוץ כדי לבטל הסתרה';
            } else {
                practiceCamp.StateClass += ' button_grey_light_hover';
                practiceCamp.Tooltip = 'מחנה אימון גלוי, ניתן ללחוץ על כפתור זה כדי להסתיר את מחנה האימון';
            }
        }

        function ReadAllData() {
            upyaUtils.ReadPracticeCamps($scope, $http, $filter, function() {
                $http.get('/api/common/hidden-practice-camps').then(function(resp) {
                    var hiddenCampsMapping = {};
                    for (var i = 0; i < resp.data.length; i++)
                        hiddenCampsMapping[resp.data[i].PRACTICE_CAMP_ID.toString()] = true;
                    $scope.data.availableCamps.forEach(function(practiceCamp) {
                        practiceCamp.Hidden = hiddenCampsMapping[practiceCamp.PRACTICE_CAMP_ID.toString()];
                        ApplyCssClass(practiceCamp);
                    });
                    ChainFactory.Next();
                }, function(err) {
                    $scope.data.availableCamps.forEach(function(practiceCamp) {
                        ApplyCssClass(practiceCamp);
                    });
                    ChainFactory.Next();
                });
            });
        }

        ChainFactory.Execute(VerifyUser, ReadAllData);

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1500);

        $scope.ToggleState = function(practiceCamp) {
            var reqParams = {
                PRACTICE_CAMP_ID: practiceCamp.PRACTICE_CAMP_ID
            };
            $http.post('/api/common/toggle-practice-camp', reqParams).then(function(resp) {
                practiceCamp.Hidden = !practiceCamp.Hidden;
                ApplyCssClass(practiceCamp);
            }, function(err) {
                console.log('error toggling practice camp');
                alert('שגיאה בעת עדכון נתוני מחנה אימון נא לנסות שוב מאוחר יותר');
            });
        };
    }
})();
var upyaUtils = {
    ReadPracticeCamps: function($scope, $http, $filter, callback) {
        $http.get('/api/sportsman/practice-camps').then(function(resp) {
            window['qL_step_finished'] = true;
            $scope.data.availableCamps = resp.data;
            $scope.data.availableCamps.forEach(function(practiceCamp) {
                var dateStart = $filter('date')(practiceCamp.DATE_START, 'dd/MM/yyyy');
                var dateFinish = $filter('date')(practiceCamp.DATE_FINISH, 'dd/MM/yyyy');
                practiceCamp.Name = 'מחנה אימון ' + practiceCamp.SPORT_NAME + ' מ-'  + dateStart + ' עד ' + dateFinish;
                if (practiceCamp.REMARKS)
                    practiceCamp.Name += ' (' + practiceCamp.REMARKS + ')';
            });
            if (callback != null)
                callback();
        }, function(err) {
            console.log('error reading practice camps');
            console.log(err);
            window['qL_step_finished'] = true;
            window['qL_Finish_Now'] = true;
            ChainFactory.Next();
        });
    }
};

