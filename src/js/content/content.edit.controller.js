(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentEditController',
            ['$scope', '$state', '$stateParams', '$http', '$q', '$filter', '$timeout', '$interval', '$sce', '$cookies', '$rootScope', '$location', '$uibModal', 'messageBox', 'ContentService', 'SportService', ContentEditController]);

    function ContentEditController($scope, $state, $stateParams, $http, $q, $filter, $timeout, $interval, $sce, $cookies, $rootScope, $location, $uibModal,
            messageBox, ContentService, SportService) {
        var allTags = [];
        var allAuthors = [];
        var allSportFields = [];
        var pageSeq = $stateParams.page;
        var sectionUniqueCounter = 0;
        var attachmentSectionsData = {
            MaxImages: 20,
            MaxFiles: 20,
            MaxContacts: 1,
            DropZoneCounter: 0,
            MaxFileSize: 5242880, //5MB
            UploadContactUrl: '/content/Contacts/' + pageSeq,
            UploadImageUrl: '/content/Images/' + pageSeq,
            UploadFileUrl: '/content/Files/' + pageSeq,
            ImagesPerRow: 6,
            ActiveSectionId: '',
            FileSizeMapping: {},
            ImageUploadMapping: {},
            FileUploadMapping: {},
            ContactUploadMapping: {},
            GetAllFiles: function() {
                var fileNames = [];
                for (var i = 0; i < $('.dz-filename').length; i++) {
                    var curElement = $('.dz-filename').eq(i);
                    fileNames.push(curElement.find('span').text());
                }
                return sportUtils.DistinctArray(fileNames);
            }
        };

        $rootScope.$on('$locationChangeSuccess', function() {
            $rootScope.actualLocation = $location.path();
        });

        $rootScope.$watch(function () {return $location.path()}, function (newLocation, oldLocation) {
            /*
            if($rootScope.actualLocation === newLocation) {
                if ($cookies.get('scs_pages.manage') == $state.current.name) {
                    //should be back to manage screen
                    var allCookies = $cookies.getAll();
                    for (var key in allCookies) {
                        if (key.indexOf('scs_') == 0) {
                            $cookies.remove(key);
                        }
                    }
                    $cookies.put('edit.controller.abort', '1');
                    $state.go('pages.manage');
                }
                //console.log('Why did you use history back?');
            }
             */
        });

        contentUtils.InitSportFieldColors($http);

        $scope.pageData = {'Tags': [], 'Sections': [], 'CroppedImages': {}};
        $scope.pageType = $state.current.data.contentType;
        if ($scope.pageType == null || !$scope.pageType)
            $scope.pageType = '';
        $scope.pageTypeHebrew = contentUtils.HebrewPageType($scope.pageType);
        $scope.pageTypeIsHebrewMale = contentUtils.IsHebrewMalePageType($scope.pageType);
        $scope.generalData = {'sportFields': [], 'Tags': [], 'Authors': [], 'Seasons': [], 'Regions': [], 'Contacts': []};
        $scope.selected = {'AuthorName': '', 'AuthorDetails': {'Seq': 0}};
        $scope.sectionTypes = contentUtils.GetSectionTypes();
        $scope.submitting = false;
        $scope.deleting = false;
        $scope.validationErrors = [];
        $scope.Unauthorized = false;
        $scope.flowersFieldSeq = sportGlobalSettings.FlowersFieldSeq;
        var allowedTypeMapping = {
            'article': 'all',
            'event': 'all' //,
            //'gallery': [1, 2]
        };

        function IsTypeAllowed(sectionType) {
            var allowedTypes = allowedTypeMapping[$scope.pageType];
            if (allowedTypes == null || !allowedTypes)
                return false;
            if (allowedTypes == 'all')
                return true;
            return allowedTypes.indexOf(sectionType.Id) >= 0;
        }

        $scope.sectionTypes.forEach(function(curType) {
            curType.Allowed = IsTypeAllowed(curType);
        });

        function AssignDefaultAuthor() {
            var firstAuthor = allAuthors.filter(function(x) { return x.Seq == 1; });
            if (firstAuthor.length > 0)
                $scope.selected.AuthorName = firstAuthor[0].Name;
        }

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3]);
        }

        function ReadAllSports() {
            $scope.generalData.sportFields = [];
            $http.get('/api/common/sports').then(function(resp) {
                allSportFields = resp.data;
                for (var i = 0; i < allSportFields.length; i++) {
                    $scope.generalData.sportFields.push(allSportFields[i]);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading sports: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllTags() {
            $scope.generalData.Tags = [];
            $http.get('/api/common/tags?type=1').then(function(resp) {
                allTags = resp.data;
                for (var i = 0; i < allTags.length; i++) {
                    $scope.generalData.Tags.push(allTags[i]);
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading tags: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllCroppedImages() {
            contentUtils.InitCroppedImages($http, function() {
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadAllAuthors() {
            $scope.generalData.Authors = [];
            $http.get('/api/common/contacts?type=1').then(function(resp) {
                allAuthors = resp.data;
                for (var i = 0; i < allAuthors.length; i++) {
                    var curAuthor = allAuthors[i];
                    if (curAuthor.AboutMe)
                        curAuthor.AboutMe = sportUtils.EncodeHTML(curAuthor.AboutMe);
                    $scope.generalData.Authors.push(curAuthor.Name);
                }
                if (pageSeq == 'new')
                   AssignDefaultAuthor();
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading authors: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadExistingContacts() {
            $scope.generalData.Contacts = [];
            $http.get('/api/common/contacts?type=2&apply=pages').then(function(resp) {
                $scope.generalData.Contacts = [];
                for (var i = 0; i < resp.data.length; i++)
                    $scope.generalData.Contacts.push(resp.data[i]);
                for (var i = 0; i < $scope.generalData.Contacts.length; i++) {
                    var curContact = $scope.generalData.Contacts[i];
                    if (curContact.PictureName && curContact.PicturePageSeq) {
                        curContact.Picture = {
                            'Seq': curContact.PictureSeq,
                            'FileName': curContact.PictureName,
                            'PageSeq': curContact.PicturePageSeq
                        };
                    }
                    curContact.DisplayName = curContact.Name;
                    if (curContact.Role)
                        curContact.DisplayName += ' (' + curContact.Role + ')';
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                alert('error loading contacts: ' + err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadSeasons() {
            $scope.generalData.Seasons = [];
            SportService.seasons.inUse().then(function(seasonsInUse) {
                if (seasonsInUse.length > 0) {
                    $scope.generalData.Seasons = seasonsInUse.slice(0);
                    $scope.generalData.Seasons.sort(function (s1, s2) {
                        return s1.Season - s2.Season;
                    });
                }
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error getting seasons');
                console.log(err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function ReadRegions() {
            $scope.generalData.Regions = [];
            $http.get('/api/sportsman/regions').then(function(resp) {
                $scope.generalData.Regions = resp.data.filter(function (x) {
                    return x.REGION_ID > 0;
                });
                $scope.generalData.Regions.forEach(function (region) {
                    region.Id = region.REGION_ID;
                    region.Name = region.REGION_NAME;
                });
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            }, function(err) {
                console.log('error getting regions');
                console.log(err);
                window['qL_step_finished'] = true;
                ChainFactory.Next();
            });
        }

        function GetDefaultImage(pageData) {
            var allImages = contentUtils.ExtractAllAttachments(pageData);
            var matchingImages = allImages.filter(function(x) {
                return x.IsDefault;
            });
            var defaultImage = matchingImages.length > 0 ? matchingImages[0] : {'Seq': 0, 'FileName': ''};
            if (defaultImage.Seq == 0 && allImages.length > 0) {
                //assign first image as default
                defaultImage = allImages[0];
            }
            return defaultImage;
        }

        function ApplyCroppedImage(pageData, imageSeq, croppedImageType, aspectRatio, thumbnailImage) {
            if (typeof thumbnailImage == 'undefined')
                thumbnailImage = '';
            var fileName = contentUtils.getCroppedImage(imageSeq, aspectRatio).File;
            var croppedImagePath = '';
            if (fileName.length > 0) {
                croppedImagePath = '/content/Cropped/' + imageSeq + '/' + fileName;
            } else {
                if (thumbnailImage && thumbnailImage.length > 0) {
                    croppedImagePath = '/content/Images/' + pageData.Seq + '/' + thumbnailImage;
                }
            }
            if (croppedImagePath.length > 0)
                pageData.CroppedImages[croppedImageType] = croppedImagePath;
        }

        function ApplyCroppedImages(pageData) {
            pageData.CroppedImages = {'Slider': '', 'Homepage': ''};
            var defaultImage = GetDefaultImage(pageData);
            var sliderThumbSeq = pageData.SliderThumbnailSeq || defaultImage.Seq;
            var homepageThumbSeq = pageData.HomepageThumbnailSeq || defaultImage.Seq;
            if (sliderThumbSeq) {
                console.log(sliderThumbSeq);
                ApplyCroppedImage(pageData, sliderThumbSeq, 'Slider', '214x234', pageData.SliderThumbnailImage); //58x39
            }
            if (homepageThumbSeq) {
                ApplyCroppedImage(pageData, homepageThumbSeq, 'Homepage', '383x100', pageData.HomepageThumbnailImage);
            }
        }

        function ReadPageData() {
            function GetCategoriesData() {
                function GetSingleCategory(deferred, championshipCategoriesData, index) {
                    if (!championshipCategoriesData || championshipCategoriesData.length == 0 || index >= championshipCategoriesData.length) {
                        deferred.resolve(championshipCategoriesData);
                        return;
                    }
                    var championshipCategoryData = championshipCategoriesData[index];
                    var categoryId = championshipCategoryData.CategoryId;
                    if (categoryId.indexOf('sf-') == 0) {
                        var activitySeq = categoryId.replace('sf-', '');
                        $http.get('/api/flowers/events?activity=' + activitySeq).then(function (resp) {
                            if (resp.data && resp.data.length > 0) {
                                var sportFlowersChampionship = championshipsUtils.convertSportFlowersChampionships([resp.data[0]], $filter)[0];
                                championshipCategoryData.CategoryId = activitySeq;
                                championshipCategoryData.Championship = sportFlowersChampionship.CHAMPIONSHIP_NAME;
                                championshipCategoryData.Name = sportFlowersChampionship.CATEGORY_NAME;
                                GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                            }
                        }, function(err) {
                            GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                        });
                    } else {
                        $http.get('/api/sportsman/category-data?category=' + categoryId).then(function (resp) {
                            var categorySportFieldId = resp.data.SPORT_ID;
                            if (categorySportFieldId == $scope.selected.sportField.Seq) {
                                var champName = resp.data.CHAMPIONSHIP_NAME;
                                var categoryName = resp.data.CATEGORY_NAME;
                                championshipCategoryData.Championship = champName;
                                championshipCategoryData.Name = categoryName;
                                GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                            } else {
                                GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                            }
                        }, function(err) {
                            GetSingleCategory(deferred, championshipCategoriesData, index + 1);
                        });
                    }
                }
                var deferred = $q.defer();
                //console.log($scope.pageData.ChampionshipCategoryIds);
                if ($scope.pageData.ChampionshipCategoryIds && $scope.pageData.ChampionshipCategoryIds.length > 0  && $scope.selected.sportField) {
                    var championshipCategoriesData = [];
                    $scope.pageData.ChampionshipCategoryIds.forEach(function(categoryId) {
                        championshipCategoriesData.push({
                            CategoryId: categoryId,
                            Championship: '',
                            Name: ''
                        });
                    });
                    GetSingleCategory(deferred, championshipCategoriesData, 0);
                } else {
                    deferred.resolve(null);
                }
                return deferred.promise;
            }



            if (pageSeq != 'new') {
                ContentService.read(pageSeq).then(function (contentPage) {
                    //type mismatch?
                    if (contentPage.Type && contentPage.Type != contentUtils.ParsePageType($scope.pageType)) {
                        $state.go(contentUtils.ParsePageType(contentPage.Type) + '.edit', {page: pageSeq});
                        return;
                    }
                    var sportFieldSeq = contentPage.SportFieldSeq;
                    if (sportFieldSeq) {
                        var matchingSportFields = $scope.generalData.sportFields.filter(function (x) {
                            return x.Seq == sportFieldSeq;
                        });
                        if (matchingSportFields.length > 0)
                            $scope.selected.sportField = matchingSportFields[0];
                    }
                    if (contentPage.Sections && contentPage.Sections.length > 0) {
                        for (var i = 0; i < contentPage.Sections.length; i++) {
                            var curSection = contentPage.Sections[i];
                            HandleSection(contentPage, curSection);
                        }
                    }

                    ApplyCroppedImages(contentPage);

                    //console.log(contentPage.Sections);
                    $scope.pageData = contentPage;
                    if ($scope.pageData.Sections) {
                        for (var i = 0; i < $scope.pageData.Sections.length; i++) {
                            var curSection = $scope.pageData.Sections[i];
                            if (curSection.Index == null)
                                curSection.Index = i;
                            sectionUniqueCounter++;
                            curSection.UniqueId = 'section_' + sectionUniqueCounter;
                            if (curSection.Type == 6 && curSection.Data && curSection.Data.Picture) {
                                //apply correct page
                                var pictureSeq = curSection.Data.Picture.Seq;
                                var matchingItem = $scope.generalData.Contacts.findItem(function(x) {
                                    return x.PictureSeq == pictureSeq;
                                });
                                if (matchingItem != null && matchingItem.PicturePageSeq)
                                    curSection.Data.Picture.PageSeq = matchingItem.PicturePageSeq;
                            }
                        }
                    }
                    if ($scope.pageData.ShowAuthorDetails)
                        $('#chkAuthorDetails').prop('checked', true);
                    if ($scope.pageData.AuthorSeq) {
                        $scope.selected.AuthorName = $scope.pageData.AuthorName;
                    } else {
                        AssignDefaultAuthor();
                    }
                    GetCategoriesData().then(function(categoriesData) {
                        if (categoriesData != null && categoriesData.length > 0) {
                            $scope.pageData.ChampionshipCategories = categoriesData;
                        }
                        $http.get('/api/pages/region-pages').then(function(resp) {
                            var regionPages = resp.data.slice(0);
                            var matchingItem = regionPages.findItem(function(x) {
                                return x.ContentPageSeq == $scope.pageData.Seq;
                            });
                            if (matchingItem != null) {
                                var regionID = matchingItem.REGION_ID;
                                $scope.pageData.OriginalRegion = regionID;
                                $scope.pageData.Region = regionID;
                                $scope.selected.region = $scope.generalData.Regions.findItem(function(x) {
                                    return x.REGION_ID == regionID;
                                });
                            }
                        });
                    });
                    window['qL_Finish_Now'] = true;
                    ChainFactory.Next();
                }, function() {
                    window['qL_Finish_Now'] = true;
                    alert('שגיאה בעת טעינת נתונים');
                    ChainFactory.Next();
                });
            } else {
                //$scope.pageData.ShowAuthorDetails = true;
                //$('#chkAuthorDetails').prop('checked', true);
                window['qL_Finish_Now'] = true;
                ChainFactory.Next();
            }
        }

        function HandleSection(contentPage, section) {
            var defaultImageSeq = contentPage.DefaultImageSeq;
            section.HebrewType = contentUtils.HebrewSectionType(section.Type);
            section.Title = contentUtils.HebrewSectionTitle(section.Type);
            if (section.Type == 1 || section.Type == 5 || section.Type == 6) {
                //images, files, or contact
                if (section.Data) {
                    if (section.Type == 6) {
                        if (section.Data.Picture) {
                            if (section.Data.Picture.DateUploaded)
                                section.Data.Picture.DateUploaded = new Date(section.Data.Picture.DateUploaded);
                            section.Data.Picture.PageSeq = pageSeq;
                        }
                    } else {
                        section.Attachments = section.Data.slice(0);
                        for (var i = 0; i < section.Attachments.length; i++) {
                            var curAttachment = section.Attachments[i];
                            curAttachment.Index = i;
                            if (curAttachment.DateUploaded)
                                curAttachment.DateUploaded = new Date(curAttachment.DateUploaded);
                            if (section.Type == 1)
                                curAttachment.IsDefault = (!defaultImageSeq && $scope.pageType == 'gallery' && i == 0) || (curAttachment.Seq == defaultImageSeq);
                        }
                        if (section.Type == 1)
                            section.ImageRows = contentUtils.BuildImageRows(section.Attachments, attachmentSectionsData.ImagesPerRow);
                    }
                }
            }
        }

        function GetSelectedAuthor() {
            var selectedAuthor = $.trim($scope.selected.AuthorName).toLowerCase();
            var matchingAuthors = allAuthors.filter(function(x) { return x.Name.toLowerCase() == selectedAuthor; });
            if (matchingAuthors.length > 0) {
                return matchingAuthors[0];
            } else {
                return {
                    'Seq': 0,
                    'Name': selectedAuthor
                };
            }
        }

        ChainFactory.Execute(VerifyUser, ReadAllSports, ReadAllTags, ReadAllCroppedImages, ReadAllAuthors, ReadExistingContacts, ReadSeasons, ReadRegions, ReadPageData);

        window['qL_steps_amount'] = 8;

        $scope.getSportFieldColor = contentUtils.getSportFieldColor;
        $scope.getRoundedRectangleClass = sportUtils.getRoundedRectangleClass;

        $scope.allowedSectionTypeCount = function() {
            return $scope.sectionTypes.map(function(x) { return x.Allowed ? 1 : 0; }).reduce(function(a, b) { return a + b; });
        };

        $scope.gotCroppedContactPicture = function(pictureSeq) {
            var croppedImage = contentUtils.getCroppedImage(pictureSeq, '1x1');
            return croppedImage.File.length > 0;
        };

        $scope.croppedContactPicturePath = function(pictureData) {
            var pictureSeq = pictureData.Seq;
            var croppedImage = contentUtils.getCroppedImage(pictureSeq, '1x1');
            if (croppedImage.File.length > 0) {
                return '/content/Cropped/' + pictureSeq + '/' + croppedImage.File;
            } else {
                return '/content/Contacts/' + pictureData.PageSeq + '/' + pictureData.FileName;
            }
        };

        $scope.canApplyChampionships = function() {
            if ($scope.selected.sportField) {
                var sportFieldSeq = $scope.selected.sportField.Seq;
                //sportFieldSeq != sportGlobalSettings.FlowersFieldSeq &&
                return sportFieldSeq != sportGlobalSettings.GeneralSportFieldSeq &&
                    sportFieldSeq != sportGlobalSettings.YoungSportsmenSeq;
            }
            return false;
        };

        $scope.getApplyChampionshipText = function() {
            if ($scope.selected.sportField && $scope.selected.sportField.Seq == $scope.flowersFieldSeq) {
                return 'הוספת אירוע משוייך';
            } else {
                return 'הוספת אליפות משוייכת';
            }
        };

        $scope.getSportFieldFilterStyle = function(sportField) {
            sportField.Selected = true;
            var bgColor = contentUtils.getSportFieldColor(sportField.Seq);
            var style = sportUtils.getRoundedRectangleStyle(sportField, bgColor);
            if (style.length > 0)
                style += '; ';
            style += 'margin-bottom: 5px; position: relative;';
            return style;
        };

        //handle video
        if ($scope.pageType != 'gallery') {
            $interval(function() {
                contentUtils.ApplyVideoData($scope.pageData.Sections, $sce);
            }, 1000);
        }

        //handle author details
        if ($scope.pageType == 'article') {
            $interval(function() {
                $scope.pageData.ShowAuthorDetails = ($('#chkAuthorDetails').prop('checked') == true) ? 1 : 0;
                $scope.selected.AuthorDetails = GetSelectedAuthor();
            }, 500);
        }

        /*
        $("#page-dropzone").sortable({
            items:'.dz-complete',
            cursor: 'move',
            opacity: 0.5,
            containment: '#page-dropzone',
            distance: 20,
            tolerance: 'pointer'
        });
        */

        function RemoveAllDropZoneFiles() {
            var ids = [];
            $('.dropzone').each(function() {
                var currentElement = $(this);
                var currentId = currentElement.attr('id');
                if (!currentId) {
                    attachmentSectionsData.DropZoneCounter++;
                    currentId = 'dropzone_' + attachmentSectionsData.DropZoneCounter;
                    currentElement.attr('id', currentId);
                }
                ids.push(currentId);
            });
            for (var i = 0; i < ids.length; i++) {
                Dropzone.forElement("#" + ids[i]).removeAllFiles(true);
            }
        }

        function ApplyAttachmentIndices(section) {
            switch (section.Type) {
                case 1:
                    section.ImageRows = contentUtils.BuildImageRows(section.Attachments, attachmentSectionsData.ImagesPerRow);
                    break;
                case 5:
                    section.Attachments.sort(function (a1, a2) {
                        return a1.Index - a2.Index;
                    });
                    break;
            }
        }

        function ChangeSectionIndex(section, diff) {
            var newIndex = section.Index + diff;
            if (newIndex >= 0 && newIndex  < $scope.pageData.Sections.length) {
                var matchingSections = $scope.pageData.Sections.filter(function(x) {
                    return x.Index == newIndex;
                });
                if (matchingSections.length > 0)
                    matchingSections[0].Index = section.Index;
                section.Index = newIndex;
            }
        }

        function openCropDialog(imageData, existingImages, sourceDir, pageSeq, ratioWidth, ratioHeight, title, fixedSize, callback) {
            if (imageData && imageData.Seq) {
                var aspectRatio = ratioWidth + 'x' + ratioHeight;
                var cropData = null;
                var rawData = contentUtils.getCroppedImage(imageData.Seq, aspectRatio).Data;
                if (rawData && rawData.length > 0) {
                    var parts = rawData.split(',');
                    if (parts.length > 3) {
                        cropData = {
                            X: parseInt(parts[0]),
                            Y: parseInt(parts[1]),
                            Width: parseInt(parts[2]),
                            Height: parseInt(parts[3])
                        };
                    }
                }
                $uibModal.open({
                    templateUrl: 'views/image-cropper.html',
                    controller: 'ImageCropperCtrl',
                    resolve: {
                        title: function () {
                            return title;
                        },
                        pageSeq: function () {
                            return pageSeq;
                        },
                        sourceDirectory: function() {
                            return sourceDir;
                        },
                        imageData: function () {
                            return imageData;
                        },
                        ratio: function () {
                            return {
                                Width: ratioWidth,
                                Height: ratioHeight
                            };
                        },
                        canvas: function () {
                            if (fixedSize > 0) {
                                return {
                                    Width: fixedSize,
                                    Height: fixedSize
                                };
                            } else {
                                return {
                                    Width: ratioWidth * 5,
                                    Height: ratioHeight * 5
                                };
                            }
                        },
                        metaData: function() {
                            return cropData;

                        },
                        existingImages: function() {
                            return existingImages;
                        }
                    }
                }).result.then(function (resp) {
                        if (resp.ChangeCroppedImage) {
                            if (callback) {
                                callback(resp.ChangeCroppedImage);
                            }
                        } else {
                            var croppedImageName = resp.ImageName;
                            var fileName = croppedImageName.split('/').slice(-1);
                            var metaData = [resp.X, resp.Y, resp.Width, resp.Height].join(',');
                            contentUtils.setCroppedImage(imageData.Seq, ratioWidth + 'x' + ratioHeight, fileName, metaData);
                            if (callback) {
                                callback(imageData);
                            }
                        }
                    });
            } else {
                console.log('no image to crop');
            }
        };

        function GetUploadMapping(sectionType) {
            switch (sectionType) {
                case 1:
                    return attachmentSectionsData.ImageUploadMapping;
                case 5:
                    return attachmentSectionsData.FileUploadMapping;
                case 6:
                    return attachmentSectionsData.ContactUploadMapping;
            }
            return {};
        }

        function HandleImageUpload(dropZone, file) {
            function ValidateAttachment(sectionType) {
                switch (sectionType) {
                    case 1:
                        if (dropZone.files.length > attachmentSectionsData.MaxImages)
                            return 'ניתן להעלות עד ' + attachmentSectionsData.MaxImages + ' תמונות בלבד';
                        break;
                    case 5:
                        if (dropZone.files.length > attachmentSectionsData.MaxFiles)
                            return 'ניתן להעלות עד ' + attachmentSectionsData.MaxFiles + ' קבצים בלבד';
                        break;
                    case 6:
                        if (dropZone.files.length > 1)
                            return 'ניתן להעלות תמונה אחת בלבד';
                        break;
                }

                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var isImage = (isEmpty) ? false : fileType.split('/')[0].toLowerCase() == 'image';
                //var isPDF = (isEmpty) ? false : fileType.split('/')[1].toLowerCase() == 'pdf';
                if ((sectionType == 1 || sectionType == 6) && !isImage)
                    return 'ניתן להעלות קובץ תמונה בלבד';

                if (file.size > attachmentSectionsData.MaxFileSize)
                    return 'גודל קובץ מקסימלי הוא ' + (attachmentSectionsData.MaxFileSize / (1024 * 1024)).toFixed(1) + ' מגהבייט';

                return '';
            }

            function GetErrorMessage() {
                var sectionType = 1;
                var matchingSection = $scope.pageData.Sections.findItem(function (x) {
                    return x.UniqueId == attachmentSectionsData.ActiveSectionId;
                });
                if (matchingSection != null)
                    sectionType = matchingSection.Type;

                //check existing images or files
                var allAttachments = contentUtils.ExtractAllAttachments($scope.pageData);
                var existingAttachments = allAttachments.filter(function (x) {
                    return x.SectionType == sectionType && x.FileName.toLowerCase() == file.name.toLowerCase();
                });
                if (existingAttachments.length > 0) {
                    var existingAttachment = existingAttachments[0];
                    dropZone.cancelUpload(file);
                    return (sectionType == 1 || sectionType == 6) ?
                        'תמונה בעלת שם זהה כבר קיימת במקטע מספר ' + (existingAttachment.SectionIndex + 1) + ' (אינדקס תמונה ' + (existingAttachment.Index + 1) + ')' :
                        'קובץ בעל שם זהה כבר קיים במקטע מספר ' + (existingAttachment.SectionIndex + 1) + ' (אינדקס קובץ ' + (existingAttachment.Index + 1) + ')';
                }

                //check uploaded images
                var fileNames = attachmentSectionsData.GetAllFiles();
                var uploadMapping = GetUploadMapping(sectionType);
                var matchingNames = fileNames.filter(function (x) {
                    return uploadMapping[x] != attachmentSectionsData.ActiveSectionId && x.toLowerCase() == file.name.toLowerCase();
                });
                if (matchingNames.length > 0) {
                    var firstMatch = matchingNames[0];
                    var matchingSectionId = uploadMapping[firstMatch];
                    matchingSection = $scope.pageData.Sections.findItem(function (x) {
                        return x.UniqueId == matchingSectionId;
                    });
                    if (matchingSection != null) {
                        return (sectionType == 1) ?
                            'תמונה בעלת שם זהה כבר הועלתה למקטע מספר ' + (matchingSection.Index + 1) :
                            'קובץ בעל שם זהה כבר הועלה למקטע מספר ' + (matchingSection.Index + 1);
                    }
                }

                return ValidateAttachment(sectionType);
            }

            function ApplyUploadError(sectionId, errorMsg) {
                var matchingSections = $scope.pageData.Sections.filter(function (x) {
                    return x.UniqueId == sectionId;
                });
                if (matchingSections.length == 0)
                    matchingSections = $scope.pageData.Sections.slice(0);
                for (var i = 0; i < matchingSections.length; i++)
                    matchingSections[i].attachmentUploadError = errorMsg;
            }

            var errorMsg = GetErrorMessage();
            if (errorMsg.length > 0) {
                $scope.$apply(function () {
                    ApplyUploadError(attachmentSectionsData.ActiveSectionId, errorMsg);
                });
                window.setTimeout(function () {
                    dropZone.removeFile(file);
                }, 200);
                $timeout(function () {
                    ApplyUploadError(attachmentSectionsData.ActiveSectionId, '');
                }, 5000);
                return false;
            }

            //remove files with same name:
            var nameMapping = {};
            for (var i = 0; i < dropZone.files.length - 1; i++) {
                var curFile = dropZone.files[i];
                var curName = curFile.name.toLowerCase();
                if (nameMapping[curName]) {
                    console.log('removing file with same name: ' + curFile.name);
                    dropZone.removeFile(curFile);
                }
                nameMapping[curName] = true;
            }

            return true;
        }

        $scope.dropzoneContactsConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': attachmentSectionsData.MaxContacts,
                'url': attachmentSectionsData.UploadContactUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן תמונה, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת תמונה',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    attachmentSectionsData.ActiveSectionId = $(this.element).parents('.content-section').first().data('uniqueid');
                    if (HandleImageUpload(this, file)) {
                        attachmentSectionsData.FileSizeMapping[file.name] = file.size;
                        attachmentSectionsData.ContactUploadMapping[file.name] = attachmentSectionsData.ActiveSectionId;
                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        $scope.dropzoneImagesConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': attachmentSectionsData.MaxImages,
                'url': attachmentSectionsData.UploadImageUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן תמונה, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת תמונה',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true //,
                //'acceptedFiles': 'image/*'
            },
            'eventHandlers': {
                'sending': function (file, xhr, formData) {

                },
                'success': function (file, response) {
                    attachmentSectionsData.ActiveSectionId = $(this.element).parents('.content-section').first().data('uniqueid');
                    if (HandleImageUpload(this, file)) {
                        attachmentSectionsData.FileSizeMapping[file.name] = file.size;
                        attachmentSectionsData.ImageUploadMapping[file.name] = attachmentSectionsData.ActiveSectionId;
                    }
                },
                'removedfile': function(file) {

                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
            //'existingFiles': ReadPageImages
        };

        $scope.dropzoneFilesConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': attachmentSectionsData.MaxFiles,
                'url': attachmentSectionsData.UploadFileUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן קובץ, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת קובץ',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    attachmentSectionsData.ActiveSectionId = $(this.element).parents('.content-section').first().data('uniqueid');
                    if (HandleImageUpload(this, file)) {
                        attachmentSectionsData.FileSizeMapping[file.name] = file.size;
                        attachmentSectionsData.FileUploadMapping[file.name] = attachmentSectionsData.ActiveSectionId;
                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        var authorPromise = null;
        $scope.getAuthors = function(userInput) {
            var allAuthors = $scope.generalData.Authors.slice();
            if (userInput && userInput.length > 0 && allAuthors.filter(function(x) { return x.toLowerCase() == userInput.toLowerCase(); }).length == 0) {
                allAuthors.unshift(userInput);
                if (authorPromise)
                    $timeout.cancel(authorPromise);
                authorPromise = $timeout(function() {
                    $scope.generalData.Authors.push(userInput);
                }, 1500);
            }
            return allAuthors;
        }

        $scope.OpenCropDialog = function(thumbnailType) {
            var thumbTypeData = contentUtils.GetThumbnailType(thumbnailType);
            var ratioWidth = thumbTypeData.RatioWidth;
            var ratioHeight = thumbTypeData.RatioHeight;
            var title = thumbTypeData.Title;
            var thumbnailImageData = {
                Seq: 0,
                FileName: ''
            };
            switch (thumbnailType) {
                case 1:
                    thumbnailImageData.Seq = $scope.pageData.SliderThumbnailSeq;
                    thumbnailImageData.FileName = $scope.pageData.SliderThumbnailImage;
                    break;
                case 2:
                    thumbnailImageData.Seq = $scope.pageData.HomepageThumbnailSeq;
                    thumbnailImageData.FileName = $scope.pageData.HomepageThumbnailImage;
                    break;
            }
            if (!thumbnailImageData.Seq)
                thumbnailImageData = GetDefaultImage($scope.pageData);
            var existingImages = contentUtils.ExtractAllAttachments($scope.pageData).filter(function(x) {
                return x.SectionType == 1;
            }).map(function(x) {
                return {
                    'FileName': x.FileName,
                    'Seq': x.Seq
                }
            });
            if ($scope.pageData.SliderThumbnailSeq) {
                if (existingImages.findItem(function(x) { return x.FileName == $scope.pageData.SliderThumbnailImage; }) == null) {
                    existingImages.push({'FileName': $scope.pageData.SliderThumbnailImage, 'Seq': $scope.pageData.SliderThumbnailSeq});
                }
            }
            if ($scope.pageData.HomepageThumbnailSeq) {
                if (existingImages.findItem(function(x) { return x.FileName == $scope.pageData.HomepageThumbnailImage; }) == null) {
                    existingImages.push({'FileName': $scope.pageData.HomepageThumbnailImage, 'Seq': $scope.pageData.HomepageThumbnailSeq});
                }
            }
            openCropDialog(thumbnailImageData, existingImages, null, $scope.pageData.Seq, ratioWidth, ratioHeight, title, 0, function(changeCroppedImage) {
                if (changeCroppedImage) {
                    var url = '/api/pages/' + pageSeq + '/thumbnail';
                    $http.post(url, {
                        ThumbnailType: thumbnailType,
                        ThumbnailSeq: changeCroppedImage.Seq || 0,
                        FileName: changeCroppedImage.FileName,
                        FileSize: changeCroppedImage.FileSize
                    }).then(function(resp) {
                        var thumbnailImageSeq = resp.data.Seq;
                        var thumbnailImageName = changeCroppedImage.FileName;
                        switch (thumbnailType) {
                            case 1:
                                $scope.pageData.SliderThumbnailSeq = thumbnailImageSeq;
                                $scope.pageData.SliderThumbnailImage = thumbnailImageName;
                                break;
                            case 2:
                                $scope.pageData.HomepageThumbnailSeq = thumbnailImageSeq;
                                $scope.pageData.HomepageThumbnailImage = thumbnailImageName;
                                break;
                        }
                        ApplyCroppedImages($scope.pageData);
                        $scope.OpenCropDialog(thumbnailType);

                    }, function(err) {
                        console.log('error setting thumbnail image');
                        console.log(err);
                    });
                } else {
                    ApplyCroppedImages($scope.pageData);
                    var cacheBuster = (new Date()).getTime();
                    $('#imgCroppedHomepage').attr('src', $('#imgCroppedHomepage').attr('src') + '?nnn=' + cacheBuster);
                    $('#imgCroppedSlider').attr('src', $('#imgCroppedSlider').attr('src') + '?nnn=' + cacheBuster);
                }
            });
        };

        $scope.CropContactPicture = function(contact) {
            var contactPicture = contact.Picture;
            if (!contactPicture || !contactPicture.Seq)
                return;

            var imageData = {
                'Seq': contactPicture.Seq,
                'FileName': contactPicture.FileName
            };
            openCropDialog(imageData, null, 'Contacts', contactPicture.PageSeq, 1, 1, contact.Name, 120, function() {
                var cacheBuster = (new Date()).getTime();
                $('.contact-picture').each(function() {
                    var img = $(this);
                    img.attr('src', img.attr('src') + '?nnn=' + cacheBuster);
                });
            });
        };

        $scope.loadTags = function(query) {
            var deferred = $q.defer();
            var arrExactMatches = allTags.filter(function(x) { return x.Name == query; });
            var arrGotMatch = allTags.filter(function(x) { return x.Name.indexOf(query) >= 0; });
            var arrNoMatch = allTags.filter(function(x) { return x.Name.indexOf(query) < 0; });
            var exactMatch = arrExactMatches.length > 0 ? arrExactMatches[0] : {'Seq': -1, 'Name': query, 'Temporary': true};
            arrGotMatch.sort(function(t1, t2) {
                return t1.Name.indexOf(query) - t2.Name.indexOf(query);
            });
            arrNoMatch.sort(function(t1, t2) {
                return t2.Name.compareTo(t1.Name);
            });
            var autoCompleteTags = [exactMatch];
            for (var i = 0; i < arrGotMatch.length; i++) {
                var currentTag = arrGotMatch[i];
                if (currentTag.Name != query)
                    autoCompleteTags.push(currentTag);
            }
            for (var i = 0; i < arrNoMatch.length; i++)
                autoCompleteTags.push(arrNoMatch[i]);
            deferred.resolve(autoCompleteTags);
            return deferred.promise;
        };

        $scope.assignChampionship = function(championshipCategory) {
            if (typeof championshipCategory == 'undefined')
                championshipCategory = null;
            if ($scope.selected.sportField) {
                var selectedCategory = championshipCategory != null ? championshipCategory.CategoryId : 0;
                var eventName = championshipCategory != null ? championshipCategory.Championship : '';
                $uibModal.open({
                    templateUrl: 'views/championship-selection.html',
                    controller: 'ChampionshipSelectionCtrl',
                    resolve: {
                        sportField: function () {
                            return $scope.selected.sportField;
                        },
                        allSeasons: function () {
                            return $scope.generalData.Seasons;
                        },
                        allRegions: function () {
                            return $scope.generalData.Regions;
                        },
                        schoolData: function() {
                            return null;
                        },
                        options: function () {
                            return {
                                category: selectedCategory,
                                EventName: eventName
                            };
                        }
                    }
                }).result.then(function (selectedChampCategory) {
                        if (!$scope.pageData.ChampionshipCategories)
                            $scope.pageData.ChampionshipCategories = [];
                        $scope.pageData.ChampionshipCategories.push(selectedChampCategory);
                    });
            }
        };

        $scope.removeChampionship = function(championshipCategory) {
            $scope.pageData.ChampionshipCategories = $scope.pageData.ChampionshipCategories.filter(function(x) {
                return x.CategoryId != championshipCategory.CategoryId;
            });
        };

        $scope.GetLinkTooltip = function(imageCell) {
            var tooltip = 'הגדרת קישור. מצב קיים: ';
            var existingAction = 'פתיחה בגלריה';
            if (imageCell.CustomLink != null) {
                switch (imageCell.CustomLink.Type) {
                    case 1:
                        existingAction = 'קישור חיצוני';
                        break;
                    case 2:
                        existingAction = 'קישור לקובץ';
                        break;
                }
            }
            tooltip += existingAction;
            return tooltip;
        };

        $scope.GetLinkStyle = function(imageCell) {
            var styles = ['cursor: pointer;'];
            var color = '';
            if (imageCell.CustomLink) {
                switch (imageCell.CustomLink.Type) {
                    case 1:
                        color = '#197bbe';
                        break;
                    case 2:
                        color = '#ec2913';
                        break;
                }
            }
            if (color.length > 0)
                styles.push('color: ' + color + ';');
            return styles.join(' ');
        };

        $scope.OpenLinkSelection = function(section, imageCell) {
            function BuildCustomLink(dialogResult) {
                var linkType = dialogResult ? dialogResult.Type : 0;
                switch (linkType) {
                    case 1:
                        return {
                            'Type': linkType,
                            'ExternalUrl': dialogResult.ExternalUrl
                        };
                    case 2:
                        return {
                            'Type': linkType,
                            'FileName': dialogResult.FileName
                        };
                }
                return null;
            }

            $uibModal.open({
                templateUrl: 'views/image-link-selection.html',
                controller: 'ImageLinkSelectionCtrl',
                resolve: {
                    pageSeq: function () {
                        return pageSeq;
                    },
                    imageSeq: function () {
                        return imageCell.Seq;
                    },
                    imageFileName: function () {
                        return imageCell.FileName;
                    },
                    options: function () {
                        return {};
                    },
                    existingLink: function () {
                        return imageCell.CustomLink;
                    }
                }
            }).result.then(function (selection) {
                imageCell.CustomLink = BuildCustomLink(selection);
            });
        };

        $scope.clearChampionships = function() {
            $scope.pageData.ChampionshipCategories = [];
        };

        $scope.clearRegion = function() {
            $scope.pageData.Region = null;
            $scope.selected.region = null;
        };

        $scope.removeContactPicture = function(section) {
            section.Data.Picture = null;
        };

        $scope.applyExistingContact = function(section) {
            section.Data = section.selectedContact;
        };

        $scope.clearSelectedContact = function(section) {
            section.selectedContact = null;
            $scope.applyExistingContact(section);
        };

        $scope.changeIndex = function(section, attachment, diff) {
            var oldIndex = attachment.Index, newIndex = attachment.Index + diff;
            if (newIndex >= section.Attachments.length || newIndex < 0)
                return;

            var existingCells = section.Attachments.filter(function(x) { return x.Index == newIndex; });
            if (existingCells.length > 0)
                existingCells[0].Index = oldIndex;
            attachment.Index = newIndex;
            ApplyAttachmentIndices(section);
        };

        $scope.MakeDefaultImage = function(section, imageCell) {
            var attachmentSeq = imageCell.Seq;
            var allImageSections = $scope.pageData.Sections.filter(function(x) { return x.Type == 1 && x.Attachments; });
            for (var i = 0; i < allImageSections.length; i++) {
                var curSection = allImageSections[i];
                for (var j = 0; j < curSection.Attachments.length; j++) {
                    var curImage = curSection.Attachments[j];
                    curImage.IsDefault = (curImage.Seq == attachmentSeq);
                }
            }
            ApplyCroppedImages($scope.pageData);
        };

        $scope.deleteAttachment = function(section, attachment) {
            var msg = '';
            switch (section.Type) {
                case 1:
                case 6:
                    msg = 'האם להסיר תמונה זו?';
                    break;
                case 5:
                    msg = 'האם להסיר קובץ זה?';
                    break;
            }
            if (msg.length > 0) {
                messageBox.ask(msg).then(function () {
                    if (section.Type == 6) {
                        //contact
                        section.Attachments = [];
                        section.Data.Picture = null;
                    } else {
                        section.Attachments = section.Attachments.filter(function (curAttachment) {
                            return curAttachment.Seq != attachment.Seq;
                        });
                        for (var i = 0; i < section.Attachments.length; i++) {
                            section.Attachments[i].Index = i;
                        }
                        ApplyAttachmentIndices(section);
                    }
                });
            }
        };

        $scope.AddSection = function(sectionType) {
            if (!$scope.pageData.Sections)
                $scope.pageData.Sections = [];
            var sectionIndex = $scope.pageData.Sections.length;
            sectionUniqueCounter++;
            $scope.pageData.Sections.push({
                'Type': sectionType,
                'Index': sectionIndex,
                'HebrewType': contentUtils.HebrewSectionType(sectionType),
                'Title': contentUtils.HebrewSectionTitle(sectionType),
                'UniqueId': 'section_' + sectionUniqueCounter
            });
        };

        $scope.MoveSectionDown = function(section) {
            ChangeSectionIndex(section, 1);
        };

        $scope.MoveSectionUp = function(section) {
            ChangeSectionIndex(section, -1);
        };

        $scope.DeleteSection = function(section) {
            function deleteSection() {
                $scope.pageData.Sections = $scope.pageData.Sections.filter(function(x) {
                    return x.Index != section.Index;
                });
                contentUtils.RearrangeSections($scope.pageData);

            }

            //need to ask only when there is data or images
            var needToConfirm = $.trim(section.Data || '').length > 0;
            if (!needToConfirm) {
                if (section.Type == 1) {
                    for (var key in attachmentSectionsData.ImageUploadMapping) {
                        if (attachmentSectionsData.ImageUploadMapping[key] == section.UniqueId) {
                            needToConfirm = true;
                            break;
                        }
                    }
                } else if (section.Type == 5) {
                    for (var key in attachmentSectionsData.FileUploadMapping) {
                        if (attachmentSectionsData.FileUploadMapping[key] == section.UniqueId) {
                            needToConfirm = true;
                            break;
                        }
                    }
                }  else if (section.Type == 6) {
                    for (var key in attachmentSectionsData.ContactUploadMapping) {
                        if (attachmentSectionsData.ContactUploadMapping[key] == section.UniqueId) {
                            needToConfirm = true;
                            break;
                        }
                    }
                }
            }
            if (needToConfirm) {
                var msg = 'האם להסיר את מקטע מספר ' + (section.Index + 1) + ' מה' + $scope.pageTypeHebrew + '?';
                messageBox.ask(msg).then(function () {
                    deleteSection();
                });
            } else {
                deleteSection();
            }
        };

        //apply default sections
        if (pageSeq == 'new') {
            $scope.pageData.Date = new Date();
            if (!$scope.pageData.Sections)
                $scope.pageData.Sections = [];
            switch ($scope.pageType) {
                case 'gallery':
                    $scope.AddSection(1);
                    break;
                case 'article':
                    $scope.AddSection(2);
                    break;
                case 'video':
                    $scope.AddSection(3);
                    break;
                case 'files':
                    $scope.AddSection(2);
                    $scope.AddSection(5);
                    break;
            }
        }

        $scope.buildImageCellClass = function(imageData) {
            //col-md-4 col-md-offset-4
            var className = 'col-md-' + imageData.ColWidth;
            if (imageData.ColOffset)
                className += ' col-md-offset-' + imageData.ColOffset;
            return className;
        };

        $scope.Delete = function() {
            var msg = 'האם למחוק ' + $scope.pageTypeHebrew + ' זו מהמערכת?'
            messageBox.ask(msg).then(function () {
                ContentService.delete(pageSeq).then(function(resp) {
                    $state.go('home');
                }, function(err) {
                    alert('שגיאה בעת מחיקה, אנא נסו שוב מאוחר יותר');
                });
            });
        };

        $scope.Submit = function() {
            function GetValidationErrors() {
                function MissingDataError(section, moreThanOne, isEmpty) {
                    var msg = 'יש להזין ';
                    switch (section.Type) {
                        case 1:
                            msg = 'יש להעלות לפחות תמונה אחת';
                            break;
                        case 2:
                            msg += 'טקסט';
                            break;
                        case 3:
                            msg += 'כתובת URL';
                            if (!isEmpty)
                                msg += ' חוקית ';
                            break;
                        case 5:
                            msg = 'יש להעלות לפחות קובץ אחד';
                            break;
                        case 6:
                            msg += ' שם איש קשר';
                            break;
                    }
                    if (moreThanOne)
                        msg += ' במקטע מספר ' + (section.Index + 1);
                    return msg;
                }
                var errors = [];
                var description = $.trim($scope.pageData.Description);
                var sportFieldName = ($scope.selected.sportField) ? $scope.selected.sportField.Name : '';
                var dateTimestamp = Date.parse($scope.pageData.Date);
                var tags = $scope.pageData.Tags || [];
                if (description.length == 0)
                    errors.push({Message: 'תיאור ' + $scope.pageTypeHebrew + ' חסר'});
                if (sportFieldName.length == 0)
                    errors.push({Message: 'יש לבחור ענף ספורט'});
                if (isNaN(dateTimestamp) || (new Date(dateTimestamp)).getFullYear() < 1900)
                    errors.push({Message: 'תאריך חסר או שגוי'});
                if (tags.length == 0)
                    errors.push({Message: 'יש להזין לפחות תגית אחת'});
                if ($scope.pageData.Sections) {
                    $scope.pageData.Sections = $scope.pageData.Sections.filter(function(x) {
                        return (x.SectionType || x.Type) > 0;
                    });
                    var moreThanOne = $scope.pageData.Sections.length > 1;
                    for (var i = 0; i < $scope.pageData.Sections.length; i++) {
                        var curSection = $scope.pageData.Sections[i];
                        if (!contentUtils.GotValidData(curSection)) {
                            var errorMsg = MissingDataError(curSection, moreThanOne, (!curSection.Data || curSection.Data.length == 0));
                            errors.push({Message: errorMsg});
                        }
                    }
                }
                if ($scope.pageData.Seq && $scope.pageType != 'files' && $scope.pageData.DefaultImageSeq) {
                    //got images?
                    var allImages = contentUtils.ExtractAllAttachments($scope.pageData).filter(function(x) {
                        return x.SectionType == 1;
                    });
                    if (allImages.length > 0 && sportUtils.isNullOrEmpty($scope.pageData.CroppedImages.Slider)) {
                        errors.push({Message: 'יש להגדיר תמונת סליידר ממוזערת'});
                    }
                }
                return errors;
            }

            function SubmitError(err) {
                $scope.submitting = false;
                $scope.submitError = 'שגיאה בעת שמירת נתונים';
            }

            function ApplyNewAttachments(imageSection, updatedSection) {
                var updatedImages = updatedSection.NewAttachments || [];
                if (imageSection.NewAttachments && imageSection.NewAttachments.length > 0) {
                    if (!imageSection.Attachments)
                        imageSection.Attachments = [];
                    var imageSeqMapping = {};
                    for (var i = 0; i < updatedImages.length; i++)
                        imageSeqMapping[updatedImages[i].Name] = updatedImages[i].Seq;
                    var imageIndex = imageSection.Attachments.length;
                    for (var i = 0; i < imageSection.NewAttachments.length; i++) {
                        var curImage = imageSection.NewAttachments[i];
                        var curSeq = imageSeqMapping[curImage.Name] || 0;
                        imageSection.Attachments.push({
                            'Seq': curSeq,
                            'FileName': curImage.Name,
                            'FileSize': curImage.Size,
                            'DateUploaded': curImage.DateUploaded,
                            'Description': '',
                            'Index': imageIndex
                        });
                        imageIndex++;

                    }
                    imageSection.ImageRows = contentUtils.BuildImageRows(imageSection.Attachments, attachmentSectionsData.ImagesPerRow);
                }
            }

            function ApplyRegion(callback) {
                if (typeof callback == 'undefined' || callback == null)
                    callback = function() {};
                function ExecuteAction(actions, index) {
                    function NextAction() {
                        ExecuteAction(actions, index + 1);
                    }

                    if (index >= actions.length) {
                        $scope.pageData.OriginalRegion = $scope.pageData.Region;
                        callback();
                        return;
                    }

                    var curAction = actions[index];
                    switch (curAction.Method) {
                        case 'delete':
                            $http.delete(curAction.Url).then(NextAction, NextAction);
                            break;
                        case 'put':
                            $http.put(curAction.Url, curAction.Params).then(NextAction, NextAction);
                            break;
                    }
                }

                var originalRegion = $scope.pageData.OriginalRegion || null;
                var currentRegion = $scope.pageData.Region || null;
                if (originalRegion != currentRegion) {
                    var actions = [];
                    if (originalRegion != null) {
                        actions.push({
                            Method: 'delete',
                            Url: '/api/pages/region-page?page=' + $scope.pageData.Seq + '&region=' + originalRegion,
                            Params: null
                        });
                    }
                    if (currentRegion != null) {
                        actions.push({
                            Method: 'put',
                            Url: '/api/pages/region-page',
                            Params: {
                                PageSeq: $scope.pageData.Seq,
                                Region: currentRegion
                            }
                        });
                    }
                    ExecuteAction(actions, 0);
                } else {
                    callback();
                }
            }

            if (!$scope.pageData.Sections)
                $scope.pageData.Sections = [];
            var imageNames = attachmentSectionsData.GetAllFiles();
            //console.log(imageNames);
            for (var i  = 0; i < $scope.pageData.Sections.length; i++) {
                var curSection = $scope.pageData.Sections[i];
                if (curSection.Type == 1 || curSection.Type == 5 || curSection.Type == 6) {
                    var uploadMapping = GetUploadMapping(curSection.Type);
                    curSection.PageSeq = (pageSeq == 'new') ? 0 : pageSeq;
                    if (curSection.Type == 6) {
                        var matchingFiles = imageNames.filter(function(x) {
                            return uploadMapping[x] == curSection.UniqueId;
                        });
                        if (matchingFiles.length > 0) {
                            curSection.NewContactPicture = matchingFiles.map(function (fileName) {
                                return {
                                    'Name': fileName,
                                    'Size': attachmentSectionsData.FileSizeMapping[fileName],
                                    'DateUploaded': new Date()
                                };
                            })[0];
                        }
                    } else {
                        var rawData = '';
                        if (curSection.Attachments) {
                            curSection.Attachments.sort(function (a1, a2) {
                                return a1.Index - a2.Index;
                            });
                            rawData = curSection.Attachments.map(function (x) {
                                return x.Seq;
                            }).join(',');
                        }
                        curSection.Data = rawData;
                        curSection.AttachmentsData = (curSection.Attachments || []).map(function (x) {
                            return {
                                'Seq': x.Seq,
                                'Description': x.Description,
                                'CustomLink': x.CustomLink
                            };
                        });
                        curSection.NewAttachments = imageNames.filter(function(x) {
                            return uploadMapping[x] == curSection.UniqueId;
                        }).map(function (fileName) {
                            return {
                                'Name': fileName,
                                'Size': attachmentSectionsData.FileSizeMapping[fileName],
                                'DateUploaded': new Date()
                            };
                        });
                    }
                }
            }

            $scope.validationErrors = GetValidationErrors();
            $scope.showSubmitSuccessMessage = false;
            if ($scope.validationErrors.length == 0) {
                $scope.submitting = true;
                var selectedAuthor = GetSelectedAuthor();
                var allImages = contentUtils.ExtractAllAttachments($scope.pageData).filter(function(x) {
                    return x.SectionType == 1;
                });
                contentUtils.RearrangeSections($scope.pageData);
                $scope.pageData.SportFieldSeq = $scope.selected.sportField.Seq;
                $scope.pageData.Type = contentUtils.ParsePageType($scope.pageType);
                if (allImages.length == 0) {
                    $scope.pageData.DefaultImageSeq = null;
                } else {
                    $scope.pageData.DefaultImageSeq = ($scope.pageData.Type == 5 || $scope.pageData.Type == 6) ? null : GetDefaultImage($scope.pageData).Seq;
                }
                $scope.pageData.CreatorSeq = $scope.LoggedInUser ? $scope.LoggedInUser.seq : 1;
                $scope.pageData.ShowAuthorDetails = ($('#chkAuthorDetails').prop('checked') == true) ? 1 : 0;
                $scope.pageData.AuthorSeq = selectedAuthor.Seq;
                $scope.pageData.AuthorName = selectedAuthor.Name;
                $scope.pageData.Region = ($scope.selected.region == null) ? null : $scope.selected.region.REGION_ID;
                if ($scope.pageData.ChampionshipCategories && $scope.pageData.ChampionshipCategories.length > 0) {
                    $scope.pageData.ChampionshipCategoryIds = $scope.pageData.ChampionshipCategories.map(function(x) {
                        var categoryId = x.CategoryId;
                        if ($scope.pageData.SportFieldSeq == sportGlobalSettings.FlowersFieldSeq) {
                            categoryId = 'sf-' + categoryId;
                        }
                        return categoryId;
                    });
                }  else {
                    $scope.pageData.ChampionshipCategoryIds = null;
                }
                if (pageSeq == 'new') {
                    ContentService.create($scope.pageData).then(function (result) {
                        ApplyRegion(function() {
                            $scope.submitting = false;
                            var newSeq = result.Seq;
                            $state.go($scope.pageType + '.edit', {page: newSeq});
                        });
                    }, SubmitError);
                } else {
                    ContentService.update($scope.pageData).then(function (result) {
                        $scope.submitting = false;
                        $scope.showSubmitSuccessMessage = true;
                        for (var i = 0; i < $scope.pageData.Sections.length; i++) {
                            var curSection = $scope.pageData.Sections[i];
                            if (curSection.Type == 1 || curSection.Type == 5) {
                                ApplyNewAttachments(curSection, result.Sections[i]);
                            } else if (curSection.Type == 6) {
                                if (curSection.NewContactPicture) {
                                    curSection.Data.Picture = {
                                        'Seq': result.Sections[i].NewContactPicture.Seq,
                                        'FileName': curSection.NewContactPicture.Name,
                                        'PageSeq': pageSeq
                                    };
                                }
                            }
                        }
                        RemoveAllDropZoneFiles();
                        ApplyRegion(function() {
                            $timeout(function () {
                                $scope.showSubmitSuccessMessage = false;
                            }, 5000);
                        });
                    }, SubmitError);
                }
            }
        };
    }
})();