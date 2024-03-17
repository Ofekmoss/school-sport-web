var _schoolSportPageTypes = [
    {
        Id: 1,
        Name: 'gallery',
        Hebrew: {
            Singular: 'גלריית תמונות',
            Plural: 'גלריות תמונות',
            Male: false
        },
        Icon: 'fa fa-picture-o',
        Banner: 'business'
    },
    {
        Id: 2,
        Name: 'article',
        Hebrew: {
            Singular: 'כתבה',
            Plural: 'כתבות',
            Male: false
        },
        Icon: 'fa fa-file-text',
        Banner: 'sport'
    },
    {
        Id: 3,
        Name: 'video',
        Hebrew: {
            Singular: 'סרטון',
            Plural: 'ספריית VOD',
            Male: true
        },
        Icon: 'fa fa-video-camera',
        Banner: 'travel'
    },
    {
        Id: 5,
        Name: 'files',
        Hebrew: {
            Singular: 'טבלת קבצים',
            Plural: 'טבלאות קבצים',
            Male: false
        },
        Icon: 'fa fa-files-o',
        Banner: 'education'
    },
    {
        Id: 7,
        Name: 'event',
        Hebrew: {
            Singular: 'אירוע',
            Plural: 'אירועים',
            Male: true
        },
        Icon: 'fa fa-calendar',
        Banner: 'politics'
    }
];

var _schoolSportSectionTypes = [
    {
        Id: 1,
        Name: 'pictures',
        Hebrew: 'תמונות',
        Title: 'הוספת תמונות'
    },
    {
        Id: 2,
        Name: 'text',
        Hebrew: 'טקסט',
        Title: 'נא להזין טקסט'
    },
    {
        Id: 3,
        Name: 'video',
        Hebrew: 'סרטון',
        Title: 'הוספת סרטון'
    },
    {
        Id: 5,
        Name: 'files',
        Hebrew: 'קבצים',
        Title: 'הוספת קבצים'
    },
    {
        Id: 6,
        Name: 'contact',
        Hebrew: 'איש קשר',
        Title: 'הוספת איש קשר',
        Icon: 'fa fa-user'
    }
];

var _schoolSportThumbnailTypes = {
    "1": {
       "RatioWidth": 214, //58,
        "RatioHeight": 234, //39,
        "Title": 'סליידר'
    },
    "2": {
        "RatioWidth": 383,
        "RatioHeight": 100,
        "Title": 'עמוד הבית'
    }
};

var _schoolSportPageTypeMappings = {'MapByName': {}, 'MapById': {}};
for (var i = 0; i < _schoolSportPageTypes.length; i++) {
    var curPageType = _schoolSportPageTypes[i];
    _schoolSportPageTypeMappings.MapByName[curPageType.Name] = curPageType;
    _schoolSportPageTypeMappings.MapById[curPageType.Id.toString()] = curPageType;
}
var _schoolSportSectionMappings = {'BySectionName': {}, 'BySectionId': {}};
for (var i = 0; i < _schoolSportSectionTypes.length; i++) {
    var curSectionType = _schoolSportSectionTypes[i];
    var matchingPage = _schoolSportPageTypeMappings.MapById[curSectionType.Id.toString()];
    if (matchingPage)
        curSectionType.Icon = matchingPage.Icon;
    _schoolSportSectionMappings.BySectionName[curSectionType.Name] = curSectionType;
    _schoolSportSectionMappings.BySectionId[curSectionType.Id.toString()] = curSectionType;
}

var contentUtils = {
    pageTypeMapping: {},
    sportFieldColorMapping: {},
    regionColorMapping: {},
    croppedImagesMapping: {},
    GetThumbnailType: function(type) {
        return _schoolSportThumbnailTypes[type.toString()] || {};
    },
    GetPageTypes: function() {
        var pageTypes = [];
        for (var i = 0; i < _schoolSportPageTypes.length; i++) {
            var curPageType = _schoolSportPageTypes[i];
            var clonedPage = {};
            for (var prop in curPageType)
                clonedPage[prop] = curPageType[prop];
            pageTypes.push(clonedPage);
        }
        return pageTypes;
    },
    GetPageTypeMapping: function() {
        return sportUtils.shallowCopy(contentUtils.pageTypeMapping);
    },
    GetPageTypeBySeq: function(pageSeq) {
        return contentUtils.pageTypeMapping[pageSeq.toString()] || null;
    },
    GetSectionTypes: function() {
        var sectionTypes = [];
        for (var i = 0; i < _schoolSportSectionTypes.length; i++) {
            var curSectionType = _schoolSportSectionTypes[i];
            var clonedSection = {};
            for (var prop in curSectionType)
                clonedSection[prop] = curSectionType[prop];
            sectionTypes.push(clonedSection);
        }
        return sectionTypes;
    },
    HebrewPageType: function (pageType, plural) {
        if (!isNaN(parseInt(pageType)))
            pageType = this.ParsePageType(pageType);
        if (typeof plural == 'undefined')
            plural = false;
        var hebrewPropName = plural ? 'Plural' : 'Singular';
        var matchingItem = _schoolSportPageTypeMappings.MapByName[pageType];
        return  matchingItem ? matchingItem.Hebrew[hebrewPropName] : '';
    },
    IsHebrewMalePageType: function (pageType) {
        if (!isNaN(parseInt(pageType)))
            pageType = this.ParsePageType(pageType);
        var matchingItem = _schoolSportPageTypeMappings.MapByName[pageType];
        return matchingItem ? matchingItem.Hebrew.Male : false;
    },
    HebrewSectionType: function (sectionType) {
        var matchingItem = _schoolSportSectionMappings.BySectionId[sectionType.toString()];
        return  matchingItem ? matchingItem.Hebrew : '';
    },
    HebrewSectionTitle: function (sectionType) {
        var matchingItem = _schoolSportSectionMappings.BySectionId[sectionType.toString()];
        return  matchingItem ? matchingItem.Title : '';
    },
    GetPageIcon: function(pageType) {
        var matchingItem = _schoolSportPageTypeMappings.MapById[pageType.toString()];
        return  matchingItem ? matchingItem.Icon : '';
    },
    GetBannerType: function(pageType) {
        var matchingItem = _schoolSportPageTypeMappings.MapById[pageType.toString()];
        return  matchingItem ? matchingItem.Banner : '';
    } ,
    ParsePageType: function (pageType) {
        if (!isNaN(parseInt(pageType))) {
            var matchingItem = _schoolSportPageTypeMappings.MapById[pageType.toString()];
            return  matchingItem ? matchingItem.Name : '';
        } else {
            var matchingItem = _schoolSportPageTypeMappings.MapByName[pageType];
            return  matchingItem ? matchingItem.Id : 0;
        }
    },
    ExtractAllAttachments: function (pageData) {
        var attachments = [];
        if (pageData.Sections) {
            for (var i = 0; i < pageData.Sections.length; i++) {
                var curSection = pageData.Sections[i];
                var sectionAttachments = curSection.Attachments || curSection.Data;
                if ((curSection.Type == 1 || curSection.Type == 5 || curSection.Type == 6) && sectionAttachments && sectionAttachments.length > 0) {
                    var curAttachments = sectionAttachments.slice(0);
                    for (var j = 0; j < curAttachments.length; j++) {
                        var curAttachment = curAttachments[j];
                        curAttachment.SectionIndex = i;
                        curAttachment.SectionType = curSection.Type;
                        curAttachment.Index = j;
                    }
                    sportUtils.CopyArray(curAttachments, attachments);
                }
            }
        }
        return attachments;
    },
    ExtractFirstVideo: function(pageData) {
        var videoURL = '';
        if (pageData.Sections) {
            var videoSections = pageData.Sections.filter(function(x) { return x.Type == 3; });
            if (videoSections.length > 0)
                videoURL = videoSections[0].Data || '';
        }
        return videoURL;
    },
    BuildImageRows: function (allImages, imagesPerRow) {
        function BuildCells(imageRow) {
            var imageColWidth = imagesPerRow > 0 ? Math.floor(12 / imagesPerRow) : 0;
            imageRow.ImageCells = [];
            var colWidthSum = 0;
            for (var i = 0; i < imageRow.length; i++) {
                var currentImageData = imageRow[i];
                if (imageColWidth > 0) {
                    currentImageData.ColWidth = imageColWidth;
                    colWidthSum += imageColWidth;
                    currentImageData.ColOffset = (i == (imageRow.length - 1)) ? 12 - colWidthSum : 0;
                }
                imageRow.ImageCells.push(currentImageData);
            }
        }

        var imagesRows = allImages.slice(0);
        imagesRows.sort(function (i1, i2) {
            return i1.Index - i2.Index;
        });


        imagesRows = (imagesPerRow > 0) ? sportUtils.SplitArray(imagesRows, imagesPerRow) : [imagesRows];
        for (var i = 0; i < imagesRows.length; i++) {
            var currentRow = imagesRows[i];
            BuildCells(currentRow);
        }

        return imagesRows;
    },
    RearrangeSections: function (pageData) {
        if (pageData.Sections) {
            pageData.Sections.sort(function (s1, s2) {
                return s1.Index - s2.Index;
            });
            for (var i = 0; i < pageData.Sections.length; i++)
                pageData.Sections[i].Index = i;
        }
    },
    GotValidData: function (section) {
        if (section.Type == 6) {
            //contact
            var contactName = (section.Data && section.Data.Name) ? $.trim(section.Data.Name) : '';
            return contactName.length > 0;
        } else {
            var data = $.trim(section.Data || '');
            if (section.Type == 3) {
                if (data.length == 0)
                    return false;

                //video might be invalid
                return section.Video && section.Video.Valid;
            } else {
                if (data.length > 0)
                    return true;

                //gallery or files can have new attachments
                if ((section.Type == 1 || section.Type == 5) && section.NewAttachments && section.NewAttachments.length > 0)
                    return true;
            }
        }
        return false;
    },
    TryParseVideo: function (rawURL, response) {
        function GetLastPart(lookFor) {
            var lastPart = '';
            var lastIndex = rawURL.lastIndexOf(lookFor);
            if (lastIndex >= 0) {
                lastPart = rawURL.substring(lastIndex + lookFor.length);
                var index = (lastPart.indexOf('?') + 1) || (lastPart.indexOf('&') + 1);
                if (index > 0)
                    lastPart = lastPart.substring(0, index - 1);
            }
            return lastPart;
        }

        if (!rawURL || rawURL.length == 0)
            return false;

        if (rawURL.indexOf('youtu.be/') >= 0 || rawURL.indexOf('youtube.com/') >= 0) {
            //YouTube
            var videoID = GetLastPart('?v=');
            if (videoID.length == 0)
                videoID = GetLastPart('/');
            if (videoID.length > 0) {
                response.id = videoID;
                response.url = 'https://www.youtube.com/watch?v=' + videoID;
                response.embed = 'https://www.youtube.com/embed/' + videoID + '?autoplay=1';
                response.thumbnail = 'https://img.youtube.com/vi/' + videoID + '/0.jpg';
                return true;
            }
        } else if (rawURL.indexOf('vimeo.com/') >= 0) {
            //Vimeo
            var videoID = GetLastPart('/');
            if (videoID.length > 0 && parseInt(videoID) == videoID) {
                response.id = videoID;
                response.url = 'https://vimeo.com/' + videoID;
                response.embed = 'https://player.vimeo.com/video/' + videoID + '?autoplay=1';
                response.thumbnail = '';
                return true;
            }
        }

        return false;
    },
    BuildDefaultImagePath: function (contentPage) {
        var _this = this;
        var defaultImagePath = '';
        if (contentPage.Type == 3) {
            //video
            var rawUrl = _this.ExtractFirstVideo(contentPage);
            if (rawUrl.length > 0) {
                var response = {};
                if (_this.TryParseVideo(rawUrl, response))
                    defaultImagePath = response.thumbnail;
            }
        } else if (contentPage.DefaultImage) {
            var cropImageKey = contentPage.DefaultImage.Seq + '_';
            defaultImagePath = '/content/Images/' + contentPage.Seq + '/' + contentPage.DefaultImage.Name;
        }
        return (defaultImagePath.length > 0) ? defaultImagePath : 'images/default_content_image.png';
    },
    BuildCroppedImages: function (contentPage) {
        var _this = this;
        function GetCroppedOrDefault(aspectRatio, thumbnailType) {
            var thumbImageSeq = 0;
            var thumbImageName = '';
            switch (thumbnailType) {
                case 1:
                    thumbImageSeq = contentPage.SliderThumbnailSeq;
                    thumbImageName = contentPage.SliderThumbnailImage;
                    break;
                case 2:
                    thumbImageSeq = contentPage.HomepageThumbnailSeq;
                    thumbImageName = contentPage.HomepageThumbnailImage;
                    break;
            }
            if ((thumbImageSeq == 0 || thumbImageSeq == null) && contentPage.DefaultImage)
                thumbImageSeq = contentPage.DefaultImage.Seq;
            var croppedPath = contentPage.DefaultImagePath;
            if (thumbImageSeq) {
                var key = thumbImageSeq + '_' + aspectRatio;
                var cropData = _this.croppedImagesMapping[key];
                if (cropData) {
                    croppedPath = '/content/Cropped/' + thumbImageSeq + '/' + cropData.File;
                } else if (thumbImageName && thumbImageName.length > 0) {
                    croppedPath = '/content/Images/' + contentPage.Seq + '/' + thumbImageName;
                }
            }
            return croppedPath;
        }
        contentPage.CroppedImage_Slider = GetCroppedOrDefault('214x234', 1); //58x39
        contentPage.CroppedImage_Homepage = GetCroppedOrDefault('383x100', 2);
    },
    ApplyVideoData: function(sections, $sce) {
        var _this = this;
        if (sections) {
            var videoSections = sections.filter(function(x) { return x.Type == 3; });
            for (var i = 0; i < videoSections.length; i++) {
                var curSection = videoSections[i];
                if (!curSection.Video)
                    curSection.Video = {'Valid': false};
                if (curSection.Data) {
                    var response = {};
                    if (_this.TryParseVideo(curSection.Data, response)) {
                        curSection.Data = response.url;
                        curSection.Video.Url = $sce.trustAsResourceUrl(response.embed);
                        curSection.Video.Valid = true;
                    } else {
                        curSection.Video.Url = '';
                        curSection.Video.Valid = false;
                    }
                } else {
                    curSection.Video.Url = '';
                    curSection.Video.Valid = false;
                }
            }
        }
    },
    InitPageTypes: function(pageTypes) {
        if (pageTypes != null) {
            var _this = this;
            for (var i = 0; i < pageTypes.length; i++) {
                var row = pageTypes[i];
                _this.pageTypeMapping[row.Seq.toString()] = _schoolSportPageTypeMappings.MapById[row.Type.toString()];
            }
        }
    },
    InitSportFieldColors: function($http, callback) {
        if (typeof callback == 'undefined')
            callback = null;
        var _this = this;
        $http.get('/api/common/sportFieldColors').then(function(resp) {
            for (var i = 0; i < resp.data.length; i++) {
                var row = resp.data[i];
                _this.sportFieldColorMapping[row.SportFieldSeq.toString()] = row.Color;
            }
            if (callback)
                callback('OK');
        }, function(err) {
            console.log('error loading colors: ' + err);
            if (callback)
                callback('ERROR')
        });
    },
    InitRegionColors: function($http, callback) {
        if (typeof callback == 'undefined')
            callback = null;
        var _this = this;
        $http.get('/api/common/regionColors').then(function(resp) {
            for (var i = 0; i < resp.data.length; i++) {
                var row = resp.data[i];
                _this.regionColorMapping[row.RegionId.toString()] = row.Color;
            }
            if (callback)
                callback('OK');
        }, function(err) {
            console.log('error loading colors: ' + err);
            if (callback)
                callback('ERROR')
        });
    },
    InitCroppedImages: function($http, callback) {
        if (typeof callback == 'undefined')
            callback = null;
        var _this = this;
        _this.croppedImagesMapping = {};
        $http.get('/api/images/cropped').then(function(resp) {
            var allCroppedImages = resp.data;
            if (allCroppedImages) {
                for (var i = 0; i < allCroppedImages.length; i++) {
                    var currentCroppedImage = allCroppedImages[i];
                    var key = currentCroppedImage.ImageSeq + '_' + currentCroppedImage.AspectRatio;
                    _this.croppedImagesMapping[key] = {
                        'File': currentCroppedImage.FileName,
                        'Data': currentCroppedImage.MetaData
                    };
                }
            }
            if (callback)
                callback('OK');
        }, function(err) {
            console.log('error loading cropped images:')
            console.log(err);
            if (callback)
                callback('ERROR');
        });
    },
    getSportFieldColor: function(sportFieldSeq) {
        if (sportFieldSeq) {
            var key = sportFieldSeq.toString();
            return contentUtils.sportFieldColorMapping[key] || '#c0c0c0';
        }
        return 'transparent';
    },
    getRegionColor: function(regionId) {
        var key = regionId.toString();
        return contentUtils.regionColorMapping[key] || 'transparent';
    },
    getCroppedImage: function(imageSeq, aspectRatio) {
        var _this = this;
        var key = imageSeq + '_' + aspectRatio;
        return _this.croppedImagesMapping[key] || {'File': ''};
    },
    setCroppedImage: function(imageSeq, aspectRatio, fileName, metaData) {
        var _this = this;
        var key = imageSeq + '_' + aspectRatio;
        _this.croppedImagesMapping[key] = {
            'File': fileName,
            'Data': metaData
        };
    },
    storeStateChange: function($cookies, from, to) {
        var key = 'scs_' + from.name;
        var value = to.name;
        $cookies.put(key, value);
    },
    ApplyPagesData: function(pages) {
        for (var i = 0; i < pages.length; i++) {
            var curPage = pages[i];
            curPage.DefaultImagePath = contentUtils.BuildDefaultImagePath(curPage);
            contentUtils.BuildCroppedImages(curPage);
            curPage.EncodedSubCaption = sportUtils.EncodeHTML(curPage.SubCaption);
            curPage.ShortSubCaption = sportUtils.EncodeHTML(sportUtils.CreateShortVersion(curPage.SubCaption, 80, false));
        }
    },
    ExtractFileExtension: function(fileName) {
        return (fileName || '').split('.').slice(-1)[0].toLowerCase();
    },
    IsImageFile: function(fileName, extension) {
        if (typeof extension == 'undefined')
            extension = contentUtils.ExtractFileExtension(fileName);
        return extension == 'jpg' || extension == 'jpeg' || extension == 'png' || extension == 'gif' || extension == 'bmp';
    },
    GeneratePreviewClass: function(fileName, extension) {
        if (typeof extension == 'undefined')
            extension = contentUtils.ExtractFileExtension(fileName);
        var classType = '';
        switch (extension) {
            case 'xls':
            case 'xlsx':
                classType = 'excel';
                break;
            case 'pdf':
                classType = 'pdf';
                break;
            case 'ppt':
            case 'pptx':
                classType = 'powerpoint';
                break;
            case 'txt':
                classType = 'text';
                break;
            case 'doc':
            case 'docx':
                classType = 'word';
                break;
            case 'zip':
                classType = 'zip';
                break;
        }
        var awesomeClass = 'fa-file';
        if (classType.length > 0)
            awesomeClass += '-' + classType;
        awesomeClass += '-o'
        return 'fa ' + awesomeClass;
    },
    ParseFileType: function(fileName) {
        var extension = contentUtils.ExtractFileExtension(fileName);
        if (extension == '')
            return  'ללא סיומת';
        if (contentUtils.IsImageFile(fileName, extension))
            return 'תמונה';
        switch (extension) {
            case 'doc':
            case 'docx':
                return 'מסמך וורד';
            case 'xls':
            case 'xlsx':
                return 'גיליון אקסל';
            case 'pdf':
                return 'PDF';
            case 'txt':
                return 'קובץ טקסט';
            case 'zip':
            case '7z':
            case 'rar':
                return 'קובץ מכווץ';
            case 'mp4':
            case 'mpg':
            case 'mpeg':
            case 'avi':
                return 'סרטון';
        }
        return 'אחר';
    },
    CarouselAutoSlide: function(elementId) {
        var carouselElement = $('#' + elementId);
        if (carouselElement.length == 1) {
            var arrowNext = carouselElement.find('.owl-next');
            var arrowPrev = carouselElement.find('.owl-prev');
            var stopAfter = parseInt(carouselElement.data('auto-slide-stop-after'));
            if (!isNaN(stopAfter) && stopAfter >= 0) {
                for (var i = 0; i < stopAfter; i++) {
                    arrowNext.trigger('click');
                }
            } else {
                var intervalSeconds = parseInt(carouselElement.data('auto-slide-seconds'));
                if (isNaN(intervalSeconds) || intervalSeconds <= 0)
                    intervalSeconds = 3;
                var carouselAutoSlideTimer = 0;
                var arrowClick = function () {
                    if (carouselAutoSlideTimer)
                        window.clearTimeout(carouselAutoSlideTimer);
                    carouselAutoSlideTimer = window.setTimeout(function () {
                        arrowNext.trigger('click');
                    }, intervalSeconds * 1000);
                }
                arrowNext.bind('click', arrowClick);
                arrowPrev.bind('click', arrowClick);
                arrowNext.trigger('click');
            }
        } else {
            window.setTimeout(function() {
                contentUtils.CarouselAutoSlide(elementId);
            }, 100);
        }
    },
    ReadContentDescriptionAndImages: function(pageSeq, ContentService) {
        return ContentService.read(pageSeq).then(function(pageData) {
            var allImages = contentUtils.ExtractAllAttachments(pageData).filter(function(x) {
                return x.SectionType == 1;
            });
            return {
                'Description': pageData.Description,
                'Images': allImages
            };
        });
    },
    ApplyPageTypes: function(contentMapping) {
        function ParseSingleValue(value) {
            if (value != null) {
                var gotSeq = value.hasOwnProperty('Seq');
                if (sportUtils.IsInteger(value) || gotSeq) {
                    var pageSeq = gotSeq ? value.Seq : value;
                    var rawType = contentUtils.GetPageTypeBySeq(pageSeq);
                    var pageTypeName = (rawType) ? rawType.Name : 'page';
                    if (gotSeq) {
                        value.Type = pageTypeName;
                        return value;
                    } else {
                        return {
                            Seq: pageSeq,
                            Type: pageTypeName
                        };
                    }
                }

                if (value.hasOwnProperty('length')) {
                    for (var i = 0; i < value.length; i++) {
                        var currentItem = value[i];
                        value[i] = ParseSingleValue(currentItem);
                    }
                } else {
                    for (var prop in value) {
                        if (prop) {
                            var currentSubValue = value[prop];
                            value[prop] = ParseSingleValue(currentSubValue);
                        }
                    }
                }
            }

            return  value;
        }

        for (var prop in contentMapping) {
            var currentValue = contentMapping[prop];
            contentMapping[prop] = ParseSingleValue(currentValue);
        }
    }
};

