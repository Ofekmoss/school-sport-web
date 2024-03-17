(function() {
    'use strict';

    angular.module('sport')
        .controller('MessageCtrl', ['$scope', '$uibModalInstance', '$sce', 'message', 'options', MessageController])
        .factory('messageBox', ['$uibModal', MessageBoxFactory]);

    function MessageBoxFactory($uibModal) {
        function show(message, options) {
            return $uibModal.open({
                templateUrl: 'message.html',
                controller: 'MessageCtrl',
                resolve: {
                    message: function () {
                        return message;
                    },
                    options: function () {
                        return options;
                    }
                }
            }).result;
        }

        function ask(message, options) {
            if (!options) {
                options = {};
            }

            if (!options.cancelCaption) {
                options.cancelCaption = 'ביטול';
            }

            if (options.prompt) {
                window.setTimeout(function () {
                    $('#userInput').focus();
                }, 1000);
            }

            return show(message, options);
        }

        function warn(message, options) {
            if (!options) {
                options = {};
            }
            options.isWarning = true;
            return show(message, options);
        }

        return {
            show: show,
            ask: ask,
            warn: warn
        }
    }

    function MessageController($scope, $uibModalInstance, $sce, message, options) {
        $scope.message = message;
        $scope.prompt = false;
        $scope.htmlContents = false;

        if (options) {
            $scope.title = options.title;
            $scope.isWarning = options.isWarning;
            $scope.subTitle = options.subTitle;
            $scope.info = options.info;
            $scope.cancelCaption = options.cancelCaption;
            $scope.prompt = options.prompt;
            $scope.htmlContents = options.htmlContents;
            if (options.backgroundImage) {
                $scope.style = "background-image: url('" + options.backgroundImage + "');";
            }
        }
        $scope.confirmCaption = options && options.confirmCaption ? options.confirmCaption : 'אישור';

        if ($scope.htmlContents) {
            $scope.message = $sce.trustAsHtml($scope.message);
        }

        $scope.confirm = function () {
            $uibModalInstance.close($('#userInput').val());
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();