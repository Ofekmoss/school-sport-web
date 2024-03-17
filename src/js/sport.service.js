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