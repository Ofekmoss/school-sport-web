(function() {
    'use strict';

    angular
        .module('sport.content')
        .controller('ContentController',
            ['$scope', '$state', '$http', '$stateParams', '$sce', '$rootScope', '$cookies', '$location', 'ContentService', ContentController]);

    function ContentController($scope, $state, $http, $stateParams, $sce, $rootScope, $cookies, $location, ContentService) {
        var pageSeq = $stateParams.page;
        $scope.pageData = null;
        $scope.loggedInUser = null;
        $scope.pageType = $state.current.data.contentType;
        $scope.pluralCaption = contentUtils.HebrewPageType($scope.pageType, true);
        $scope.singularCaption = contentUtils.HebrewPageType($scope.pageType, false);

        $rootScope.$on('$locationChangeSuccess', function() {
            $rootScope.actualLocation = $location.path();
        });

        $rootScope.$watch(function () {return $location.path()}, function (newLocation, oldLocation) {
            if($rootScope.actualLocation === newLocation) {
                if ($cookies.get('scs_pages.manage') == $state.current.name) {
                    //should be back to manage screen
                    var allCookies = $cookies.getAll();
                    for (var key in allCookies) {
                        if (key.indexOf('scs_') == 0) {
                            $cookies.remove(key);
                        }
                    }
                    $cookies.put('content.controller.abort', '1');
                    $state.go('pages.manage');
                }
                //console.log('Why did you use history back?');
            }
        });

        function HandleSection(section) {
            if (section.Type == 1 || section.Type == 5) {
                section.Attachments = (section.Data || []).slice(0);
                if (section.Type == 5) {
                    section.Attachments = section.Attachments.filter(function (x) {
                        return x.Description && x.Description.length > 0;
                    });
                }
                for (var i = 0; i < section.Attachments.length; i++) {
                    var curAttachment = section.Attachments[i];
                    curAttachment.Index = i;
                    if (curAttachment.DateUploaded)
                        curAttachment.DateUploaded = new Date(curAttachment.DateUploaded);
                    if (section.Type == 5)
                        curAttachment.FileType = contentUtils.ParseFileType(curAttachment.FileName);
                }
            }
            switch (section.Type) {
                case 2:
                    //text
                    section.EncodedData = sportUtils.EncodeHTML(section.Data);
                    break;
                case 3:
                    //video
                    var response = {};
                    if (contentUtils.TryParseVideo(section.Data, response)) {
                        section.VideoUrl = $sce.trustAsResourceUrl(response.embed);
                    } else {
                        section.VideoUrl = '';
                    }
                    break;
                case 6:
                    //contact
                    if (section.Data.AboutMe)
                        section.Data.AboutMe = sportUtils.EncodeHTML(section.Data.AboutMe);
                    break;
            }
        }

        function ReadPageData() {
            window['qL_steps_amount'] = 3;
            ContentService.read(pageSeq).then(function (contentPage) {
                window['qL_step_finished'] = true;

                //type mismatch?
                if (contentPage.Type && contentPage.Type != contentUtils.ParsePageType($scope.pageType)) {
                    if ($cookies.get('edit.controller.abort') == '1') {
                        //abort
                        $cookies.remove('edit.controller.abort');
                        window['qL_Finish_Now'] = true;
                        return;
                    }
                    $state.go(contentUtils.ParsePageType(contentPage.Type), {page: pageSeq});
                    return;
                }

                if (typeof contentPage.Sections == 'undefined' || contentPage.Sections == null) {
                    $state.go('home');
                    return;
                }

                for (var i = 0; i < contentPage.Sections.length; i++) {
                    var curSection = contentPage.Sections[i];
                    HandleSection(curSection);
                    if (curSection.Type == 6) {
                        //merge contacts into groups
                        var firstContactSection = curSection;
                        for (var j = i - 1; j >= 0; j--) {
                            var prevSection = contentPage.Sections[j];
                            if (prevSection.Type == 6)
                                firstContactSection = prevSection;
                        }
                        if (!firstContactSection.Contacts)
                            firstContactSection.Contacts = [];
                        curSection.Data.SectionIndex = curSection.Index;
                        firstContactSection.Contacts.push(curSection.Data);
                    }
                }

                //contact rows
                for (var i = 0; i < contentPage.Sections.length; i++) {
                    var curSection = contentPage.Sections[i];
                    if (curSection.Type == 6 && curSection.Contacts) {
                        curSection.Contacts.sort(function(c1, c2) {
                            return c1.SectionIndex - c2.SectionIndex;
                        });
                        curSection.ContactRows =  sportUtils.SplitArray(curSection.Contacts, 2);

                        //put blank sport fields to make it 6
                        var lastRow = curSection.ContactRows[curSection.ContactRows.length - 1];
                        var blankItemsCount = 2 - lastRow.length;
                        for (var j = 0; j < blankItemsCount; j++) {
                            lastRow.push({'Name': ''});
                        }
                    }
                }

                window['qL_step_finished'] = true;

                if (contentPage.Author) {
                    if (contentPage.Author.AboutMe) {
                        contentPage.Author.AboutMe = sportUtils.EncodeHTML(contentPage.Author.AboutMe);
                    }
                }

                $scope.pageData = contentPage;
                $scope.pageData.Seq = pageSeq;
                //console.log($scope.pageData.Sections);

                $http.get('/api/common/contacts?type=2&apply=pages').then(function(resp) {
                    window['qL_step_finished'] = true;
                    var allContacts = [];
                    for (var i = 0; i < resp.data.length; i++)
                        allContacts.push(resp.data[i]);
                    for (var i = 0; i < contentPage.Sections.length; i++) {
                        var curSection = contentPage.Sections[i];
                        if (curSection.Type == 6 && curSection.ContactRows && curSection.ContactRows.length > 0) {
                            //apply correct page
                            for (var j = 0; j < curSection.ContactRows.length; j++) {
                                var curContactRow = curSection.ContactRows[j];
                                for (var k = 0; k < curContactRow.length; k++) {
                                    var curContactData = curContactRow[k];
                                    if (curContactData.Picture) {
                                        var pictureSeq = curContactData.Picture.Seq;
                                        var matchingItem = allContacts.findItem(function (x) {
                                            return x.PictureSeq == pictureSeq;
                                        });
                                        if (matchingItem != null && matchingItem.PicturePageSeq)
                                            curContactData.Picture.PageSeq = matchingItem.PicturePageSeq;
                                    }
                                }
                            }

                        }
                    }
                    window['qL_Finish_Now'] = true;
                });
                ChainFactory.Next();
            }, function (err) {
                alert('שגיאה בעת טעינת נתונים מהשרת');
                ChainFactory.Next();
            });
        }

        function ReadRecentPages() {
            ContentService.list(null, null).then(function (contentPages) {
                var relevantPages = contentPages.filter(function(x) {
                    return x.Seq != $scope.pageData.Seq && x.SportFieldSeq == $scope.pageData.SportFieldSeq && x.DefaultImageSeq;
                });
                $scope.recentPages = relevantPages.take(2);
                contentUtils.InitCroppedImages($http, function() {
                    for (var i = 0; i < $scope.recentPages.length; i++) {
                        var curPage = $scope.recentPages[i];
                        curPage.HebrewType = contentUtils.HebrewPageType(curPage.Type, false);
                        curPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(curPage);
                        contentUtils.BuildCroppedImages(curPage);
                    }
                });
                ChainFactory.Next();
            }, function(err) {
                console.log('error reading recent pages');
                console.log(err);
                ChainFactory.Next();
            });
        }

        function ReadGalleryImages() {
            if ($scope.pageType == 'gallery') {
                $scope.pageData.GalleryImages = $scope.pageData.Sections[0].Data.slice(0);
                for (var i = 0; i < $scope.pageData.GalleryImages.length; i++) {
                    var curImage = $scope.pageData.GalleryImages[i];
                    curImage.Index = i;
                }
                $scope.pageData.GalleryImageRows = contentUtils.BuildImageRows($scope.pageData.GalleryImages, 4);
                ChainFactory.Next();
            } else {
                ChainFactory.Next();
            }
        }

        function InitJackbox() {
            // jackbox
            window.setTimeout(function() {
                sportUtils.InitJackbox();
            }, 1000);
            ChainFactory.Next();
        }

        var date = new Date();
        $http.get('/api/common/logged-user?nnn=' + date.getTime()).then(function(resp) {
            $scope.loggedInUser = resp.data;
        }, function(err) {
            console.log('error reading logged in user');
            console.log(err);
        });

        ChainFactory.Execute(ReadPageData, ReadRecentPages, ReadGalleryImages, InitJackbox);

        $scope.croppedContactPicturePath = function(pictureData) {
            var pictureSeq = pictureData.Seq;
            var croppedImage = contentUtils.getCroppedImage(pictureSeq, '1x1');
            if (croppedImage.File.length > 0) {
                return '/content/Cropped/' + pictureSeq + '/' + croppedImage.File;
            } else {
                return '/content/Contacts/' + pictureData.PageSeq + '/' + pictureData.FileName;
            }
        };

        $scope.canEditContent = function() {
            return $scope.loggedInUser != null && ($scope.loggedInUser.Role == 1 || $scope.loggedInUser.Role == 3);
        };
    }
})();