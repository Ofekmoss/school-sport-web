(function() {
    'use strict';

    angular
        .module('sport.mobile')
        .controller('HomeMobileController',
        ['$scope', '$state', '$http', '$filter', '$timeout', 'ContentService', 'EventsService', 'SportService', HomeMobileController]);

    function HomeMobileController($scope, $state, $http, $filter, $timeout, ContentService, EventsService, SportService) {
        $scope.firstFeaturedArticle = null;
        $scope.firstFeaturedGallery = null;
        $scope.categoriesData = [];
        $scope.links = null;
        $scope.sponsorAutoSlideInterval = 5;
        $scope.partnersAutoSlideInterval = 5;

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);

        var qs = sportUtils.ParseQueryString();
        var autoSelectionCategoryId = qs['c'] || 0;

        function FinishStep(caption) {
            $scope[caption + 'LoadFinished'] = true;
        }

        function LoadError(caption, callback) {
            if (typeof callback == 'undefined')
                callback = null;
            return function() {
                if (caption && caption.length > 0)
                    $scope[caption + 'LoadError'] = true;
                FinishStep(caption);
                if (callback != null) {
                    callback();
                }
            };
        }

        function ReadCroppedImages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            contentUtils.InitCroppedImages($http, function() {
                if (callback != null) {
                    callback();
                }
            });
        }

        function ReadRecentPages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            ContentService.recent([3, 1, 2]).then(function(combinedPages) {
                $scope.recentVideos = combinedPages.Type_3;
                contentUtils.ApplyPagesData($scope.recentVideos);
                $scope.recentGalleries = combinedPages.Type_1;
                contentUtils.ApplyPagesData($scope.recentGalleries);
                $scope.recentArticles = combinedPages.Type_2;
                contentUtils.ApplyPagesData($scope.recentArticles);
                if (callback != null)
                    callback();
            }, LoadError('recentPages', callback));
        }

        function LoadContentMapping(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            $scope.contentMapping = sportUtils.shallowCopy($scope.globalData.contentMapping);
            var roadTripPartnersSeq = $scope.contentMapping.RoadTripPartners;
            contentUtils.ReadContentDescriptionAndImages(roadTripPartnersSeq, ContentService).then(function (resp) {
                $scope.contentMapping.RoadTripPartners = {
                    Seq: roadTripPartnersSeq,
                    Images: resp.Images,
                    Description: resp.Description
                };
                window.setTimeout(function () {
                    contentUtils.CarouselAutoSlide('mobileSponsorsCarousel');
                }, 1000);

                var businessPartnersSeq = $scope.contentMapping.BusinessPartners;
                contentUtils.ReadContentDescriptionAndImages(businessPartnersSeq, ContentService).then(function (resp) {
                    $scope.contentMapping.BusinessPartners = {
                        Seq: businessPartnersSeq,
                        Images: resp.Images,
                        Description: resp.Description
                    };
                    window.setTimeout(function () {
                        contentUtils.CarouselAutoSlide('mobilePartnersCarousel');
                    }, 1000);
                    if (callback != null) {
                        callback();
                    }
                }, LoadError('BusinessPartners', callback));
            }, LoadError('RoadTripPartners', callback));
        }

        function ReadAdvertisements(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var cacheBuster = (new Date()).getTime();
            $http.get('/api/Banners?type=1&randomize=1&nnn=' + cacheBuster).then(function(resp) {
                if (resp.data && resp.data.Seq) {
                    $scope.advertisementBanner = resp.data;
                    $scope.advertisementBanner.VideoPath = '/content/Banners/' + $scope.advertisementBanner.Seq + '/' + $scope.advertisementBanner.FileName;
                }
                FinishStep('advertisements');
                if (callback != null)
                    callback();
            }, LoadError('advertisements', callback));
        }

        function ReadFeaturedPages(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            $http.get('/api/pages').then(function(resp) {
                var allPages = resp.data.slice(0);
                var featuredPages = allPages.filter(function(x) {
                    return x.FeaturedIndex > 0 && x.IsHidden != 1;
                });
                var indexedPages = allPages.filter(function(x) {
                    return x.PageIndex > 0 && x.IsHidden != 1;
                });
                featuredPages.sort(function(p1, p2) { return p1.FeaturedIndex - p2.FeaturedIndex; });
                indexedPages.sort(function(p1, p2) { return p1.PageIndex - p2.PageIndex; });
                var allFeaturedArticles = featuredPages.filter(function(x) { return x.Type == 2; });
                var allFeaturedGalleries = featuredPages.filter(function(x) { return x.Type == 1; });
                if (allFeaturedArticles.length == 0 && indexedPages.length > 0) {
                    var indexedArticle = indexedPages.findItem(function(x) { return x.Type == 2; });
                    if (indexedArticle != null)
                        allFeaturedArticles.push(indexedArticle);
                }
                if (allFeaturedGalleries.length == 0 && indexedPages.length > 0) {
                    var indexedGallery = indexedPages.findItem(function(x) { return x.Type == 1; });
                    if (indexedGallery != null)
                        allFeaturedGalleries.push(indexedGallery);
                }
                var firstPage = null;
                if (allFeaturedArticles.length > 0) {
                    firstPage = allFeaturedArticles[0];
                    contentUtils.ApplyPagesData([firstPage]);
                    $scope.firstFeaturedArticle = {
                        Seq: firstPage.Seq,
                        Title: firstPage.Description,
                        ImagePath: firstPage.CroppedImage_Slider || firstPage.DefaultImagePath
                    };
                }
                if (allFeaturedGalleries.length > 0) {
                    firstPage = allFeaturedGalleries[0];
                    contentUtils.ApplyPagesData([firstPage]);
                    $scope.firstFeaturedGallery = {
                        Seq: firstPage.Seq,
                        Title: firstPage.Description,
                        ImagePath: firstPage.CroppedImage_Slider || firstPage.DefaultImagePath
                    };
                }
                //curPage.BannerCssClass = 'button banner_button ' + contentUtils.GetBannerType(curPage.Type);
                //curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                FinishStep('featuredPages');
                if (callback != null)
                    callback();
            }, LoadError('featuredPages', callback))
        }

        function ApplyColumnStyle(columnObject, dataObj, totalItemCount, baseClass, itemsPerColumnPropertyName) {
            if (typeof itemsPerColumnPropertyName == 'undefined')
                itemsPerColumnPropertyName = '';
            var curValidCount = dataObj.ValidItems;
            var itemsInColumn = totalItemCount > 4 ? 3 : 2;
            var itemClassName = (itemsInColumn == 2) ? 'mobile-wide-button-half' : 'mobile-wide-button-third';
            if (baseClass.length > 0)
                itemClassName += ' ' + baseClass;
            dataObj.ValidItems++;
            columnObject.ClassName = itemClassName;
            if (itemsPerColumnPropertyName.length > 0)
                columnObject[itemsPerColumnPropertyName] = itemsInColumn;
            columnObject.Top = dataObj.CurrentTop;
            columnObject.Right = null;
            columnObject.Left = null;
            if (totalItemCount < 5) {
                if ((curValidCount % 2) == 0)
                    columnObject.Right = 15;
                else
                    columnObject.Left = 15;
            } else {
                switch (curValidCount % 3) {
                    case 0:
                        columnObject.Right = 15;
                        break;
                    case 1:
                        var thirdWindow = Math.floor($(window).width() / 3);
                        columnObject.Left = thirdWindow + 7;
                        break;
                    case 2:
                        columnObject.Left = 15;
                        break;
                }
            }
            if ((dataObj.ValidItems % itemsInColumn) == 0)
                dataObj.CurrentTop += 65;
        }

        function ApplyCategoryGradeAndGender(categoryObject, championshipCategoriesCount, dataObj) {
            if (categoryObject.CATEGORY_NAME) {
                var categoryParts = categoryObject.CATEGORY_NAME.split(' ');
                if (categoryParts.length == 2) {
                    categoryObject.CategoryGrades = categoryParts[0];
                    var rawGender = categoryParts[1];
                    if (rawGender == 'תלמידות')
                        categoryObject.CategoryGenderClass = 'flaticon-female-silhouette';
                    else if (rawGender == 'תלמידים')
                        categoryObject.CategoryGenderClass = 'flaticon-man-standing-up';
                    if (categoryObject.PermanentChampionshipTitle) {
                        if (categoryObject.PermanentChampionshipTitle.indexOf('ישיבות') >= 0) {
                            categoryObject.CategoryGrades = 'ישיבות';
                        }
                        if (categoryObject.PermanentChampionshipTitle.indexOf('גליל') >= 0) {
                            categoryObject.CategoryGrades = 'גליל';
                        }
                    }
                    ApplyColumnStyle(categoryObject, dataObj, championshipCategoriesCount, 'mobile-category-grade-and-gender-panel', 'CategoriesInColumn');
                }
            }
        }

        function BuildPermanentChampionships(sportFieldCategories) {
            var permanentChampionships = sportFieldCategories.filter(function(x) {
                return x.PermanentChampionshipIndex != null;
            });
            permanentChampionships = sportUtils.DistinctArray(permanentChampionships, 'CHAMPIONSHIP_CATEGORY_ID');
            permanentChampionships.sortByProperty('PermanentChampionshipIndex');
            var dataObj = {
                ValidItems: 0,
                CurrentTop: 0
            };
            permanentChampionships.forEach(function(permanentChampionship) {
                ApplyCategoryGradeAndGender(permanentChampionship, permanentChampionships.length, dataObj);
            });
            permanentChampionships.ValidItems = dataObj.ValidItems;
            permanentChampionships.Height = dataObj.CurrentTop;
            return permanentChampionships;
        }

        function BuildChampionshipMapping(sportFieldCategories, filterFunction, mappedProperty, clearPermanentChampionships) {
            if (typeof clearPermanentChampionships == 'undefined')
                clearPermanentChampionships = true;
            var rawCategories = sportFieldCategories.filter(filterFunction);
            rawCategories = sportUtils.DistinctArray(rawCategories, 'CHAMPIONSHIP_CATEGORY_ID');
            var championshipMapping = {};
            rawCategories.forEach(function(category) {
                var key = (category[mappedProperty] || '').toString();
                if (key.length > 0) {
                    if (!championshipMapping[key])
                        championshipMapping[key] = [];
                    var clone = sportUtils.shallowCopy(category);
                    if (clearPermanentChampionships)
                        clone.PermanentChampionshipTitle = null;
                    championshipMapping[key].push(clone);
                }
            });
            return championshipMapping;
        }

        function BuildChampionshipCategories(championshipMapping) {
            var championshipIDs = sportUtils.FlattenAssociativeArray(championshipMapping);
            var championships = [];
            var currentTop = 0;
            if (championshipIDs.length > 0) {
                championshipIDs.forEach(function (championshipId) {
                    var championshipCategories = championshipMapping[championshipId];
                    var championshipName = championshipCategories[0].CHAMPIONSHIP_NAME;
                    var dataObj = {
                        ValidItems: 0,
                        CurrentTop: 25
                    };
                    championshipCategories.forEach(function(championshipCategory) {
                        ApplyCategoryGradeAndGender(championshipCategory, championshipCategories.length, dataObj);
                    });
                    championships.push({
                        ChampionshipName: championshipName,
                        Categories: championshipCategories,
                        Top: currentTop
                    });
                    var categoriesHeight = dataObj.CurrentTop - 25;
                    if ((championshipCategories.length < 5 && dataObj.ValidItems % 2 != 0) ||
                        (championshipCategories.length >= 5 && dataObj.ValidItems % 3 != 0))
                        categoriesHeight += 65;
                    currentTop += (35 + categoriesHeight);
                });
                championships.sortByProperty('ChampionshipName');
            }
            championships.Height = currentTop;
            return championships;
        }

        function BuildRegionalChampionships(sportFieldCategories, isClubs) {
            var regionMapping = BuildChampionshipMapping(sportFieldCategories, function(x) {
                if (isClubs)
                    return x.IS_CLUBS == 1;
                return x.IS_CLUBS != 1 && x.REGION_ID > 0;
            }, 'REGION_ID');
            var regions = sportUtils.FlattenAssociativeArray(regionMapping);
            var regionalChampionships = [];
            var dataObj = {
                ValidItems: 0,
                CurrentTop: 0
            };
            if (regions.length > 0) {
                regions.forEach(function (regionId) {
                    var regionCategories = regionMapping[regionId];
                    var championshipMapping = BuildChampionshipMapping(regionCategories, function(x) {
                        return true;
                    }, 'CHAMPIONSHIP_ID');
                    var regionName = regionCategories[0].REGION_NAME;
                    var regionChampionships = BuildChampionshipCategories(championshipMapping);
                    var regionItem = {
                        RegionName: regionName,
                        Championships: regionChampionships
                    };
                    ApplyColumnStyle(regionItem, dataObj, regions.length, 'mobile-region-panel');
                    regionalChampionships.push(regionItem);
                });
                regionalChampionships.sortByProperty('RegionName');
            }
            regionalChampionships.Height = dataObj.CurrentTop;
            if ((regions.length < 5 && dataObj.ValidItems % 2 != 0) ||
                (regions.length >= 5 && dataObj.ValidItems % 3 != 0))
                regionalChampionships.Height += 65;
            return regionalChampionships;
        }

        function BuildCentralRegionChampionships(sportFieldCategories) {
            var championshipMapping = BuildChampionshipMapping(sportFieldCategories, function(x) {
                return x.IS_CLUBS != 1 && x.REGION_ID == 0;
            }, 'CHAMPIONSHIP_ID');
            var centralRegionChampionships = BuildChampionshipCategories(championshipMapping);
            return centralRegionChampionships;
        }

        function ReadAllCategories(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var selectedSeason = localStorage[sportGlobalSettings.LocalStorageKeys.CurrentSeason.Name] || '';
            var url = '/api/sportsman/championship-categories-data?season=' + selectedSeason;
            $http.get(url).then(function(resp) {
                $scope.categoriesLoadFinished = true;
                var sportFieldCategoriesMapping = BuildChampionshipMapping(resp.data, function(x) { return true; }, 'SPORT_NAME', false);
                var sportFieldNames = sportUtils.FlattenAssociativeArray(sportFieldCategoriesMapping);
                sportFieldNames.sort();
                sportFieldNames.forEach(function(sportFieldName) {
                    var wordCount = sportFieldName.split(' ').length;
                    var sportFieldNameClass = 'mobile-category-panel-sport-field-name';
                    if (wordCount > 2)
                        sportFieldNameClass += ' sport-field-name-small-font';
                    var sportFieldCategories = sportFieldCategoriesMapping[sportFieldName];
                    var sportFieldSeq = sportFieldCategories[0].SPORT_ID;
                    var permanentChampionships = BuildPermanentChampionships(sportFieldCategories);
                    var clubChampionships = BuildRegionalChampionships(sportFieldCategories, true);
                    clubChampionships.OriginalHeight = clubChampionships.Height;
                    var regionalChampionships = BuildRegionalChampionships(sportFieldCategories, false);
                    regionalChampionships.OriginalHeight = regionalChampionships.Height;
                    var centralRegionChampionships = BuildCentralRegionChampionships(sportFieldCategories);
                    if (permanentChampionships.ValidItems % 2 != 0)
                        permanentChampionships.Height += 65;
                    $scope.categoriesData.push({
                        SportFieldName: sportFieldName,
                        SportFieldSeq: sportFieldSeq,
                        SportFieldClass: sportFieldNameClass,
                        IconClass: $scope.globalData.sportFieldIcons[sportFieldSeq.toString()] || '',
                        PermanentChampionships: permanentChampionships,
                        ClubChampionships: clubChampionships,
                        RegionalChampionships: regionalChampionships,
                        CentralRegionChampionships: centralRegionChampionships
                    });
                });
                if (callback != null)
                    callback();
                if (autoSelectionCategoryId) {
                    $timeout(function() {
                        $scope.ToggleGamePlans();
                    }, 500);
                }
            }, function(err) {
                console.log('Error loading categories');
                $scope.categoriesLoadError = true;
                if (callback != null)
                    callback();
            });
        }

        function ReadLinks(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var url = '/api/links';
            $http.get(url).then(function(resp) {
                $scope.linksLoadFinished = true;
                $scope.links = resp.data;
                if (callback != null)
                    callback();
            }, function(err) {
                console.log('Error loading links');
                $scope.linksLoadError = true;
                if (callback != null)
                    callback();
            });
        }

        function LateLoadData() {
            ReadCroppedImages(function() {
                $timeout(function() {
                    ReadFeaturedPages(function() {
                        $timeout(function() {
                            ReadRecentPages(function() {
                                $timeout(function() {
                                    LoadContentMapping(function() {
                                        $timeout(function() {
                                            ReadAdvertisements(function() {
                                                $timeout(function() {
                                                    ReadAllCategories(function() {
                                                        $timeout(function() {
                                                            ReadLinks();
                                                        }, 500);
                                                    });
                                                }, 500);
                                            });
                                        }, 500);
                                    });
                                }, 500);
                            });
                        }, 500);
                    });
                }, 500);
            });
        }

        $scope.MoreArticlesClicked = function() {
            $state.go('articles');
        };

        $scope.MoreGalleriesClicked = function() {
            $state.go('galleries');
        };

        $scope.ToggleMoreLinks = function() {
            $("#mobileMoreLinksPlaceholder").toggle("slow");
        };

        $scope.ToggleGamePlans = function() {
            $("#mobileGamePlansPlaceholder").toggle("slow", function() {
                if (autoSelectionCategoryId) {
                    var found = false;
                    $scope.categoriesData.forEach(function(categoryData) {
                        if (!found && categoryData.CentralRegionChampionships) {
                            categoryData.CentralRegionChampionships.forEach(function (curCentralRegionChampionship) {
                                if (!found) {
                                    curCentralRegionChampionship.Categories.forEach(function (curCategory) {
                                        if (curCategory.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                            $scope.ToggleSportFieldCategories(categoryData, function() {
                                                $scope.ToggleCentralRegionChampionships(categoryData);
                                                autoSelectionCategoryId = 0;
                                            });
                                            found = true;
                                        }
                                    });
                                }
                            });
                        }

                        if (!found && categoryData.ClubChampionships) {
                            categoryData.ClubChampionships.forEach(function (curClubChampionship) {
                                if (!found) {
                                    curClubChampionship.Championships.forEach(function(curChampionship) {
                                        curChampionship.Categories.forEach(function (curCategory) {
                                            if (curCategory.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                                $scope.ToggleSportFieldCategories(categoryData, function() {
                                                    $scope.ToggleClubChampionships(categoryData, function() {
                                                        $timeout(function() {
                                                            $scope.clubRegionClicked(categoryData, curClubChampionship);
                                                            autoSelectionCategoryId = 0;
                                                        }, 500);
                                                    });
                                                });
                                                found = true;
                                            }
                                        });
                                    });
                                }
                            });
                        }

                        if (!found && categoryData.PermanentChampionships) {
                            categoryData.PermanentChampionships.forEach(function (curPermanentChampionship) {
                                if (curPermanentChampionship.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                    $scope.ToggleSportFieldCategories(categoryData);
                                    autoSelectionCategoryId = 0;
                                    found = true;
                                }
                            });
                        }

                        if (!found && categoryData.RegionalChampionships) {
                            categoryData.RegionalChampionships.forEach(function (curRegionalChampionship) {
                                if (!found) {
                                    curRegionalChampionship.Championships.forEach(function(curChampionship) {
                                        curChampionship.Categories.forEach(function (curCategory) {
                                            if (curCategory.CHAMPIONSHIP_CATEGORY_ID == autoSelectionCategoryId) {
                                                $scope.ToggleSportFieldCategories(categoryData, function() {
                                                    $scope.ToggleRegionalChampionships(categoryData, function() {
                                                        $timeout(function() {
                                                            $scope.regionalRegionClicked(categoryData, curRegionalChampionship);
                                                            autoSelectionCategoryId = 0;
                                                        }, 500);
                                                    });
                                                });
                                                found = true;
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };

        $scope.ToggleSportFieldCategories = function(sportFieldCategories, callback) {
            if (typeof callback == 'undefined' || callback == null)
                callback = function() {};
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            var element = $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']");
            if (autoSelectionCategoryId) {
                element.parents("div").first().get(0).scrollIntoView();
            }
            element.toggle("slow", callback);
        };

        $scope.TogglePermanentChampionships = function(sportFieldCategories) {
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-permanent-championships-categories-list").toggle("slow");
        };

        $scope.ToggleCentralRegionChampionships = function(sportFieldCategories) {
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-central-region-championships-list").toggle("slow");
        };

        $scope.ToggleClubChampionships = function(sportFieldCategories, callback) {
            if (typeof callback == 'undefined' || callback == null)
                callback = function() {};
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-club-championships-placeholder").toggle("slow", callback);
        };

        $scope.ToggleRegionalChampionships = function(sportFieldCategories, callback) {
            if (typeof callback == 'undefined' || callback == null)
                callback = function() {};
            var sportFieldSeq = sportFieldCategories.SportFieldSeq;
            $(".mobile-sport-field-category-list[data-sport-field-seq='" + sportFieldSeq + "']").find(".mobile-regional-championships-placeholder").toggle("slow", callback);
        };

        $scope.CategoryClicked = function(category) {
            var categoryId = category.CHAMPIONSHIP_CATEGORY_ID;
            var regionId = category.PermanentChampionshipTitle ? 'p' : category.REGION_ID;
            $state.go('championships.region.championship', {clubs: category.IS_CLUBS, region: regionId, category: categoryId});
        };

        $scope.clubRegionClicked = function(sportFieldCategories, clubChampionshipRegion) {
            if (clubChampionshipRegion.ClassName.indexOf('mobile-region-selected') >= 0) {
                //already selected, nothing to do
            } else {
                sportFieldCategories.ClubChampionships.forEach(function(c) {
                    c.ClassName = c.ClassName.replace('mobile-region-selected', 'mobile-region-panel');
                });
                clubChampionshipRegion.ClassName = clubChampionshipRegion.ClassName.replace('mobile-region-panel', 'mobile-region-selected');
            }
            sportFieldCategories.SelectedClubRegion = clubChampionshipRegion;
            sportFieldCategories.ClubChampionships.Height = sportFieldCategories.ClubChampionships.OriginalHeight + clubChampionshipRegion.Championships.Height + 10;
        };

        $scope.regionalRegionClicked = function(sportFieldCategories, regionalChampionshipRegion) {
            if (regionalChampionshipRegion.ClassName.indexOf('mobile-region-selected') >= 0) {
                //already selected, nothing to do
            } else {
                sportFieldCategories.RegionalChampionships.forEach(function(c) {
                    c.ClassName = c.ClassName.replace('mobile-region-selected', 'mobile-region-panel');
                });
                regionalChampionshipRegion.ClassName = regionalChampionshipRegion.ClassName.replace('mobile-region-panel', 'mobile-region-selected');
            }
            sportFieldCategories.SelectedRegionalRegion = regionalChampionshipRegion;
            sportFieldCategories.RegionalChampionships.Height = sportFieldCategories.RegionalChampionships.OriginalHeight + regionalChampionshipRegion.Championships.Height + 10;
        };

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

        window.setInterval(function() {
            var dotLabels = $(".progress-dot");
            if (dotLabels.length > 0) {
                dotLabels.each(function() {
                    var dotsLabel = $(this);
                    var parentDiv = dotsLabel.parents("div").first();
                    if (parentDiv.is(":visible")) {
                        var dotCount = dotsLabel.text().length;
                        dotCount++;
                        if (dotCount > 3)
                            dotCount = 1;
                        var dots = Array(dotCount + 1).join(".");
                        dotsLabel.text(dots);
                    }
                });
            }

            var imageSliders = $(".mobile-image-slider");
            if (imageSliders.length > 0) {
                var topBarTop = $("#wrapper_container_mobile").offset().top;
                imageSliders.each(function() {
                    var imageSlider = $(this);
                    var sliderTop = imageSlider.offset().top;
                    var images = imageSlider.find(".sponsor-img");
                    if (images.length > 0) {
                        var opacity = topBarTop > sliderTop ? '0.2' : '1';
                        images.css("opacity", opacity);
                    }

                });
            }
        }, 1000);
    }
})();