var upyaUtils = {
    ReadPracticeCamps: function($scope, $http, $filter, callback) {
        $http.get('/api/sportsman/practice-camps').then(function(resp) {
            window['qL_step_finished'] = true;
            $scope.data.availableCamps = resp.data;
            $scope.data.availableCamps.forEach(function(practiceCamp) {
                var dateStart = $filter('date')(practiceCamp.DATE_START, 'dd/MM/yyyy');
                var dateFinish = $filter('date')(practiceCamp.DATE_FINISH, 'dd/MM/yyyy');
                practiceCamp.Name = 'מחנה אימון ' + practiceCamp.SPORT_NAME + ' מ-'  + dateStart + ' עד ' + dateFinish;
                if (practiceCamp.REMARKS)
                    practiceCamp.Name += ' (' + practiceCamp.REMARKS + ')';
            });
            if (callback != null)
                callback();
        }, function(err) {
            console.log('error reading practice camps');
            console.log(err);
            window['qL_step_finished'] = true;
            window['qL_Finish_Now'] = true;
            ChainFactory.Next();
        });
    }
};

