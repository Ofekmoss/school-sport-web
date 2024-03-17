(function() {
    'use strict';

    angular
        .module('sport')
        .controller('PlayerFileCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$q', 'messageBox', 'PlayerInfo', PlayerFileCtrl]);

    function PlayerFileCtrl($scope, $http, $uibModalInstance, $filter, $q, messageBox, PlayerInfo) {
        $scope.FileUrl = '/content/PlayerFile?type=' + PlayerInfo.FileType + '&id=' + PlayerInfo.IdNumber;
        $scope.PlayerIdNumber = PlayerInfo.IdNumber;
        $scope.PlayerName = PlayerInfo.Name;
        $scope.FileTitle = PlayerInfo.FileTitle;
        $scope.PDF = PlayerInfo.PDF;

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $uibModalInstance.close("OK");
        };

        $scope.delete = function() {
            var msg = 'האם למחוק קובץ זה? הפעולה לא הפיכה!';
            messageBox.ask(msg).then(function () {
                $http.delete($scope.FileUrl).then(function() {
                    $uibModalInstance.close("DELETED");
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת קובץ, נא לנסות מאוחר יותר');
                });
            });
        };
    }
})();