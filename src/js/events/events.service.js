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