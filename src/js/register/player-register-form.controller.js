(function() {
    'use strict';

    angular
        .module('sport.register')
        .controller('PlayerRegisterFormController',
            ['$scope', '$http', '$q', '$uibModal', '$timeout', '$interval', '$filter', '$rootScope', 'messageBox', PlayerRegisterFormController]);


    function PlayerRegisterFormController($scope, $http, $q, $uibModal, $timeout, $interval, $filter, $rootScope, messageBox) {
        var playerProperties = ['TEAM_NUMBER', 'STATUS', 'REGISTRATION_DATE', 'FIRST_NAME', 'LAST_NAME', 'BIRTH_DATE', 'ID_NUMBER', 'GRADE', 'GRADE_NAME'];
        var emptyPlayer = {};
        playerProperties.forEach(function(p) { emptyPlayer[p] = ''; });
        var qs = sportUtils.ParseQueryString();
        var teamID = parseInt(qs['t']);
        $scope.now = new Date();
        if (isNaN(teamID) || teamID < 0) {
            $scope.error = 'אין זיהוי קבוצה';
        } else {
            var url = '/api/sportsman/team/' + teamID + '/full-details';
            $http.get(url).then(function(resp) {
                if (!resp.data || resp.data.TEAM_ID != teamID) {
                     $scope.error = 'זיהוי קבוצה שגוי או קבוצה לא קיימת';
                } else {
                    $scope.team = resp.data;
                    if ($scope.team.Players.length == 0) {
                        $scope.error = 'לקבוצה זו אין שחקנים רשומים';
                    } else {
                        if ($scope.team.CATEGORY_NAME) {
                            var parts = $scope.team.CATEGORY_NAME.split(' ');
                            if (parts.length > 1) {
                                $scope.team.CategoryGrades = parts[0];
                                $scope.team.CategoryGender = parts[1];
                            }
                        }
                        var maxPlayers = 20;
                        if ($scope.team.Players.length > 20)
                            maxPlayers = 40;
                        $scope.team.Players.trimAfter(maxPlayers);
                        for (var i = 0; i < $scope.team.Players.length; i++) {
                            var player = $scope.team.Players[i];
                            if (player.REGISTRATION_DATE)
                                player.REGISTRATION_DATE = $filter('date')(player.REGISTRATION_DATE, 'dd/MM/yyyy');
                            if (player.BIRTH_DATE)
                                player.BIRTH_DATE = $filter('date')(player.BIRTH_DATE, 'dd/MM/yyyy');
                        }
                        $scope.team.Players.expand(emptyPlayer, maxPlayers, true);
                        window.setTimeout(function() {
                            $("#btnPrint").click();
                        }, 1500);
                    }
                }
            }, function(err) {
                $scope.error = 'שגיאה בעת טעינת נתוני קבוצה';
                console.log(err);
            });
        }


        window['qL_steps_amount'] = 1;
        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);
    }
})();