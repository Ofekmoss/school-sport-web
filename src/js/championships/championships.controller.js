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