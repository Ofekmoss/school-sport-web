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