(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ImageLinkSelectionCtrl', ['$scope', '$uibModalInstance', 'messageBox', 'pageSeq', 'imageSeq', 'options', 'imageFileName', 'existingLink', ImageLinkSelectionCtrl]);

    function ImageLinkSelectionCtrl($scope, $uibModalInstance, messageBox, pageSeq, imageSeq, options, imageFileName, existingLink) {
        $scope.title = 'בחירת קישור עבור תמונה';
        $scope.selected = {LinkType: 0, ExternalUrl: '', UploadedFileName: ''};
        $scope.pageSeq = pageSeq;
        $scope.imageSeq = imageSeq;
        $scope.imageFileName = imageFileName;
        $scope.existingLink = existingLink;
        $scope.data = {
            'LinkTypes': [
                {Name: 'פתיחה בגלרייה', Value: 0},
                {Name: 'קישור חיצוני', Value: 1},
                {Name: 'קובץ מצורף', Value: 2}
            ]
        };
        $scope.cancelCaption = options && options.cancelCaption ? options.cancelCaption : 'ביטול';
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';

        //console.log(existingLink);

        $scope.selected.LinkType = $scope.data.LinkTypes[0];
        if ($scope.existingLink) {
            switch ($scope.existingLink.Type) {
                case 1:
                    $scope.selected.LinkType = $scope.data.LinkTypes[1];
                    $scope.selected.ExternalUrl = $scope.existingLink.ExternalUrl;
                    break;
                case 2:
                    $scope.selected.LinkType = $scope.data.LinkTypes[2];
                    $scope.selected.UploadedFileName = $scope.existingLink.FileName;
                    $scope.existingLink.IsImage = contentUtils.IsImageFile($scope.existingLink.FileName);
                    if ($scope.existingLink.IsImage == false) {
                        $scope.existingLink.PreviewClass = contentUtils.GeneratePreviewClass($scope.existingLink.FileName);
                    }
                    break;
            }
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': '/content/ImageAttachments/' + imageSeq,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'ניתן לגרור לכאן קובץ, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת קובץ',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    $scope.selected.UploadedFileName = file.name;
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                }
            }
        };

        $scope.isInputValid = function() {
            if ($scope.selected.LinkType.Value) {
                switch ($scope.selected.LinkType.Value) {
                    case 1:
                        return sportUtils.ValidateUrl($scope.selected.ExternalUrl + '').length > 0;
                    case 2:
                        return $scope.selected.UploadedFileName && $scope.selected.UploadedFileName.length > 0;
                }
            }
            return true;
        };

        $scope.Delete = function() {
            messageBox.ask('האם להסיר קישור מתמונה זו?').then(function () {
                $uibModalInstance.close({
                    'Remove': true
                });
            });
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $uibModalInstance.close({
                'Type': $scope.selected.LinkType.Value,
                'FileName': $scope.selected.UploadedFileName,
                'ExternalUrl': sportUtils.ValidateUrl($scope.selected.ExternalUrl)
            });
        };
    }
})();