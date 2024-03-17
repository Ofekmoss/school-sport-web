(function() {
    'use strict';

    angular
        .module('sport.banners')
        .controller('BannersController',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', BannersController]);

    function BannersController($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        var attachmentBannerData = {
            'ActiveBannerSeq': 0
        };
        var dropZoneBannerMapping = {};
        $scope.banners = [];
        $scope.Unauthorized = false;
        $scope.generalData = {
            possibleLocations: [{BannerType: 1, Name: 'עמוד הבית'}]
        };

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3]);
            window['qL_step_finished'] = true;
        }

        function SetNewBanner() {
            $scope.generalData.NewBanner = {
                CanSave: false,
                Frequency: 10
            };
            $scope.generalData.NewBanner.Location = $scope.generalData.possibleLocations[0];
        }

        SetNewBanner();

        function CalculateFrequencyPercentages(bannerType) {
            var matchingBanners = $scope.banners.filter(function(x) { return x.BannerType == bannerType; });
            bannerUtils.ApplyFrequencyPercentage(matchingBanners);
        }

        function HandleBanners() {
            for (var i = 0; i < $scope.banners.length; i++) {
                var curBanner = $scope.banners[i];
                curBanner.VideoPath = '/content/Banners/' + curBanner.Seq + '/' + curBanner.FileName;
                curBanner.Location = $scope.generalData.possibleLocations.findItem(function(x) { return x.BannerType == curBanner.BannerType; });
            }
            $scope.banners.map(function(x) { return x.BannerType; }).distinct().forEach(function(bannerType) {
                CalculateFrequencyPercentages(bannerType);
            });
            window['qL_step_finished'] = true;
            window['qL_Finish_Now'] = true;
        }

        function ReadBanners() {
            $scope.error = false;
            $http.get('/api/banners').then(function(resp) {
                $scope.banners = [];
                if (resp.data && resp.data.length) {
                    for (var i = 0; i < resp.data.length; i++) {
                        $scope.banners.push(resp.data[i]);
                    }
                }
                HandleBanners();
            }, function(err) {
                console.log('error reading banners');
                console.log(err);
                $scope.error = true;
                window['qL_step_finished'] = true;
                window['qL_Finish_Now'] = true;
            });
        }

        $interval(function() {
            for (var i = 0; i < $scope.banners.length; i++) {
                var curBanner = $scope.banners[i];
                bannerUtils.ApplyDirtyState(curBanner);
            }
            $scope.generalData.NewBanner.CanSave = $scope.generalData.NewBanner.BannerName && $scope.generalData.NewBanner.FileName && $scope.generalData.NewBanner.FileSize;
        }, 1000);

        function HandleFileUpload(dropZone, file) {
            function ValidateAttachment() {
                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var extension = fileType.split('/')[1].toLowerCase();
                var isValid = (isEmpty) ? false : (extension == 'webm' || extension == 'mp4');
                if (!isValid)
                    return 'ניתן להעלות קובץ webm או mp4 בלבד';
                return '';
            }

            function ApplyUploadError(bannerSeq, errorMsg) {
                var matchingBanner = null;
                if (bannerSeq == 'new') {
                    matchingBanner = $scope.generalData.NewBanner;
                } else {
                    matchingBanner = $scope.banners.findItem(function (x) {
                        return x.Seq == bannerSeq;
                    });
                }
                if (matchingBanner != null) {
                    matchingBanner.uploadError = errorMsg;
                }
            }

            var errorMsg = ValidateAttachment();
            if (errorMsg.length > 0) {
                $scope.$apply(function () {
                    ApplyUploadError(attachmentBannerData.ActiveBannerSeq, errorMsg);
                });
                window.setTimeout(function () {
                    dropZone.removeFile(file);
                }, 200);
                $timeout(function () {
                    ApplyUploadError(attachmentBannerData.ActiveBannerSeq, '');
                }, 5000);
                return false;
            }

            return true;
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': '/content/Banners/temp',
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן סרטון, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת סרטון',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    var _this = this;
                    attachmentBannerData.ActiveBannerSeq = $(this.element).parents('.banner-section').first().data('uniqueid');
                    if (HandleFileUpload(this, file)) {
                        var matchingBanner = null;
                        if (attachmentBannerData.ActiveBannerSeq == 'new') {
                            matchingBanner = $scope.generalData.NewBanner;
                        } else {
                            matchingBanner = $scope.banners.findItem(function (x) {
                                return x.Seq == attachmentBannerData.ActiveBannerSeq;
                            });
                        }
                        if (matchingBanner != null) {
                            matchingBanner.FileName = file.name;
                            matchingBanner.FileSize = file.size;
                            dropZoneBannerMapping[attachmentBannerData.ActiveBannerSeq.toString()] = _this;
                        }
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

        ChainFactory.Execute(VerifyUser, ReadBanners);
        window['qL_steps_amount'] = 2;

        $scope.FocusNewBanner = function() {
            var textbox = $("#txtNewBannerName");
            if (textbox.length > 0) {
                var offsetTop = textbox.offset().top;
                document.body.scrollTop = offsetTop - 120;
                textbox.focus();
            }
        };

        $scope.GetNewBannerSaveButtonStyle = function() {
            var styles = ['margin-bottom: 15px;'];
            if ($scope.generalData.NewBanner.CanSave) {
                styles.push('cursor: pointer;');
            } else {
                styles.push('background-color: gray;');
                styles.push('text-decoration: none;');
            }
            return styles.join(' ');
        };

        $scope.GetNewBannerSaveButtonIconStyle = function() {
            return $scope.generalData.NewBanner.CanSave ? '' : 'color: #d0d0d0; background-color: gray;';
        };

        $scope.GetFrequencyClass = function(banner, frequency) {
            var frequencyClass = 'button button_type_icon_small icon button_grey_light';
            if (frequency == 0)
                frequencyClass += ' button_grey_light_zero'
            var hoverClass = 'button_grey_light_hover';
            if (frequency == 0)
                hoverClass += '_zero'
            if (banner.Frequency == frequency)
                frequencyClass += ' ' + hoverClass;
            return frequencyClass;
        };

        $scope.ChooseFrequency = function(banner, frequency) {
            banner.Frequency = frequency;
            CalculateFrequencyPercentages(banner.BannerType);
        };

        $scope.DeleteBanner = function(banner) {
            function NullifyDeletion(banner, success) {
                banner.Deleting.Active = false;
                $timeout(function() {
                    banner.Deleting = null;
                }, 5000);
                if (success) {
                    var index = $scope.banners.findIndex(function(x) { return x.Seq == banner.Seq; });
                    if (index >= 0) {
                        $scope.banners.splice(index, 1);
                        CalculateFrequencyPercentages(banner.BannerType);
                    }
                } else {
                    banner.Deleting.Error = true;
                }
            }

            var msg = 'האם למחוק ';
            msg += (banner.BannerName) ? 'את הפרסומת '  + banner.BannerName
                : 'פרסומת זו';
            msg += '?';
            msg += '<br />' +
            'פעולה זו אינה הפיכה!';
            messageBox.ask(msg).then(function () {
                banner.Deleting = {'Active': true};
                $http.delete('/api/banners/' + banner.Seq).then(function(resp) {
                    NullifyDeletion(banner, true);
                }, function(err) {
                    NullifyDeletion(banner, false);
                });
            });
        };

        $scope.Save = function(banner) {
            function Clean(banner) {
                banner.IsDirty = false;
                if (banner.OriginalProperties) {
                    banner.OriginalProperties.forEach(function (prop) {
                        banner['original_' + prop] = banner[prop];
                    });
                }
            }

            function NullifySubmission(banner, success) {
                banner.Submitting.Active = false;
                $timeout(function() {
                    banner.Submitting = null;
                }, 5000);
                if (success) {
                    banner.Submitting.Success = true;
                    Clean(banner);
                } else {
                    banner.Submitting.Error = true;
                }
            }

            function RemoveFiles(bannerSeq) {
                var dropZone = dropZoneBannerMapping[bannerSeq.toString()];
                if (dropZone) {
                    for (var i = 0; i < dropZone.files.length; i++) {
                        var curFile = dropZone.files[i];
                        dropZone.removeFile(curFile);
                    }
                }
            }

            if (!banner.Seq && !banner.CanSave)
                return;

            if (banner.Location) {
                banner.BannerType = banner.Location.BannerType;
            }
            banner.Submitting = {'Active': true};
            if (banner.Seq) {
                $http.put('/api/banners', banner).then(function (resp) {
                    banner.AttachmentSeq = resp.data.AttachmentSeq;
                    banner.VideoPath = '/content/Banners/' + banner.Seq + '/' + banner.FileName;
                    NullifySubmission(banner, true);
                    RemoveFiles(banner.Seq);
                }, function (err) {
                    NullifySubmission(banner, false);
                });
            } else {
                var clonedBanner = sportUtils.shallowCopy($scope.generalData.NewBanner);
                clonedBanner.BannerType = clonedBanner.Location ? clonedBanner.Location.BannerType : 1;
                $http.post('/api/banners', clonedBanner).then(function (resp) {
                    clonedBanner.Seq = resp.data.BannerSeq;
                    clonedBanner.AttachmentSeq = resp.data.AttachmentSeq;
                    clonedBanner.DateCreated = resp.data.DateCreated;
                    clonedBanner.UploadedBy = {
                        Seq: $scope.LoggedInUser.seq,
                        Login: $scope.LoggedInUser.name,
                        Name: $scope.LoggedInUser.displayName,
                        Role: $scope.LoggedInUser.role
                    };
                    clonedBanner.VideoPath = '/content/Banners/' + clonedBanner.Seq + '/' + clonedBanner.FileName;
                    NullifySubmission(clonedBanner, true);
                    RemoveFiles('new');
                    $scope.banners.push(clonedBanner);
                    SetNewBanner();
                    CalculateFrequencyPercentages(clonedBanner.BannerType);
                    $timeout(function() {
                        Clean(clonedBanner);
                    }, 1200);
                }, function (err) {
                    NullifySubmission(clonedBanner, false);
                });
            }
        };
    }
})();