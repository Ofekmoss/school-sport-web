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