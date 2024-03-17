(function() {
    'use strict';

    angular
        .module('sport')
        .controller('ImageCropperCtrl', ['$scope', '$http', '$uibModal', '$uibModalInstance', 'title', 'pageSeq', 'sourceDirectory', 'imageData', 'ratio', 'canvas', 'metaData', 'existingImages', ImageCropperCtrl]);

    function ImageCropperCtrl($scope, $http, $uibModal, $uibModalInstance, title, pageSeq, sourceDirectory, imageData, ratio, canvas, metaData, existingImages) {
        if (typeof sourceDirectory == 'undefined' || sourceDirectory == null || !sourceDirectory)
            sourceDirectory = 'Images';
        $scope.existingImages = existingImages.map(function(x) { return x.FileName; });
        window['CropperImageRatio'] = {Width: ratio.Width, Height: ratio.Height};
        window['CropperImagePath'] = '/content/' + sourceDirectory + '/' + pageSeq + '/' + imageData.FileName;
        window['CropperImageData'] = (metaData && metaData.Width) ? metaData : null;
        if (canvas && canvas.Width > 0 && canvas.Height > 0) {
            window['CropperCanvasWidth'] = canvas.Width;
            window['CropperCanvasHeight'] = canvas.Height;
        }

        $scope.title = title;
        $scope.loading = false;

        function StoreCroppedImage(rawData, X, Y, Width, Height) {
            var aspectRatio = ratio.Width + 'x' + ratio.Height;
            var metaData = [X, Y, Width, Height].join(',');
            window['CropperImage_Crop_Now'] = null;
            $http.post('/api/images/crop', {
                Data: rawData,
                Seq: imageData.Seq,
                AspectRatio: aspectRatio,
                MetaData: metaData
            }).then(function(resp) {
                var croppedImageName = (resp.data && resp.data.length > 0) ? resp.data[0] : '';
                $scope.loading = false;
                $uibModalInstance.close({'ImageName': croppedImageName, 'X': X, 'Y': Y, 'Width': Width, 'Height': Height});
            }, function(err) {
                $scope.loading = false;
                console.log('error cropping image:');
                console.log(err);
                alert('שגיאה בעת שמירת נתונים, נא לנסות שוב מאוחר יותר');
            });
        }

        $scope.changePicture = function() {
            $uibModal.open({
                templateUrl: 'views/thumbnail-selection.html',
                controller: 'ThumbnailSelectionCtrl',
                resolve: {
                    pageSeq: function() {
                        return pageSeq;
                    },
                    images: function () {
                        return $scope.existingImages;
                    }
                }
            }).result.then(function (resp) {
                    var selectedFileName = resp.FileName;
                    if (selectedFileName == imageData.FileName) {
                        console.log('Same image selected, nothing to do');
                    } else {
                        var changeCroppedImage = {'Seq': 0};
                        var matchingImage = existingImages.findItem(function(x) {
                            return x.FileName == selectedFileName;
                        });
                        if (matchingImage == null) {
                            changeCroppedImage.FileName = selectedFileName;
                            changeCroppedImage.FileSize = resp.FileSize;
                        } else {
                            changeCroppedImage.Seq = matchingImage.Seq;
                            changeCroppedImage.FileName = matchingImage.FileName;
                        }
                        $uibModalInstance.close({'ChangeCroppedImage': changeCroppedImage});
                    }
                });
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $scope.loading = true;
            window['CropperImage_Crop_Now'] = StoreCroppedImage;
        };
    }
})();