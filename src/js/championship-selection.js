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