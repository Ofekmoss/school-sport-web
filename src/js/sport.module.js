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

