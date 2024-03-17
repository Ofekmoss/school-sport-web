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