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
                            console.log(resp);
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