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