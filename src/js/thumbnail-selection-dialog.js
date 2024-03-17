(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ThumbnailSelectionCtrl', ['$scope', '$http', '$uibModalInstance', '$timeout', 'pageSeq', 'images', ThumbnailSelectionCtrl]);

    function ThumbnailSelectionCtrl($scope, $http, $uibModalInstance, $timeout, pageSeq, images) {
        $scope.imageFileNames = images;
        $scope.pageSeq = pageSeq;
        $scope.imageUploadError = '';

        function HandleImageUpload(dropZone, file) {
            var maxFileSize = 5242880;
            function ValidateFile() {
                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var isImage = (isEmpty) ? false : fileType.split('/')[0].toLowerCase() == 'image';
                if (!isImage)
                    return 'ניתן להעלות קובץ תמונה בלבד';

                if (file.size > maxFileSize)
                    return 'גודל קובץ מקסימלי הוא ' + (maxFileSize / (1024 * 1024)).toFixed(1) + ' מגהבייט';

                return '';
            }

            var errorMsg = ValidateFile();
            if (errorMsg.length > 0) {
                $scope.$apply(function () {
                    $scope.imageUploadError = errorMsg;
                });
                window.setTimeout(function () {
                    dropZone.removeFile(file);
                }, 200);
                $timeout(function () {
                    $scope.imageUploadError = '';
                }, 5000);
                return false;
            }

            return true;
        }

        $scope.selectImage = function(imageName, fileSize) {
            if (typeof fileSize == 'undefined')
                fileSize = 0;
            $uibModalInstance.close({
                'FileName': imageName,
                'FileSize': fileSize
            });
        };

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': '/content/Images/' + pageSeq,
                'autoProcessQueue': true,
                'dictDefaultMessage': 'אפשר לגרור לכאן תמונה חדשה, או ללחוץ להעלאה מהמחשב',
                'dictRemoveFile': 'הסרת תמונה',
                'dictCancelUploadConfirmation': 'ביטול העלאת תמונה',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    if (HandleImageUpload(this, file)) {
                        $scope.selectImage(file.name, file.size);
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

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();