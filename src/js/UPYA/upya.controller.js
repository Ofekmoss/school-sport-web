(function() {
    'use strict';

    angular
        .module('sport.UPYA')
        .controller('UPYA_Controller',
            ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', UPYA_Controller])
        .controller('UPYA_Manage_Controller',
        ['$scope', '$state', '$http', '$filter', '$timeout', '$interval', 'messageBox', UPYA_Manage_Controller]);

    function UPYA_Controller($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        var hiddenCampsMapping = {};
        $scope.data = {
            IsLoading: true,
            availableCamps: [],
            genders: [
                {Id: 1, Name: 'זכר'},
                {Id: 2, Name: 'נקבה'}
            ]
        };

        $scope.participant = {};
        window['qL_steps_amount'] = 1;

        function ReadAllData() {
            upyaUtils.ReadPracticeCamps($scope, $http, $filter, function() {
                $scope.data.IsLoading = false;
                $http.get('/api/common/hidden-practice-camps').then(function(resp) {
                    if (resp.data.length > 0) {
                        for (var i = 0; i < resp.data.length; i++)
                            hiddenCampsMapping[resp.data[i].PRACTICE_CAMP_ID.toString()] = true;
                        $scope.data.availableCamps = $scope.data.availableCamps.filter(function(practiceCamp) {
                            return !hiddenCampsMapping[practiceCamp.PRACTICE_CAMP_ID.toString()];
                        });
                    }
                    ChainFactory.Next();
                }, function(err) {
                    ChainFactory.Next();
                });
            });
        }

        ChainFactory.Execute(ReadAllData);

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1500);

        function GetCaptchaResponse() {
            var recaptchaResponse = $('#g-recaptcha-response').val();
            var captchaValid = false;
            if (typeof recaptchaResponse == 'undefined') {
                //missing element
                captchaValid = true;
            } else {
                captchaValid = recaptchaResponse.length > 0;
            }
            return captchaValid ? recaptchaResponse : '';
        }

        $scope.IsPracticeCampHidden = function(practiceCamp) {
            return hiddenCampsMapping[practiceCamp.PRACTICE_CAMP_ID] == true;
        };

        $scope.SubmitForm = function() {
            function ExtractDate(rawDate) {
                if (rawDate && rawDate.getFullYear) {
                    return $filter('date')(rawDate, 'dd/MM/yyyy');
                } else {
                    return rawDate;
                }
            }
            $scope.formValidationErrors = [];
            if (!$scope.participant.practiceCamp)
                $scope.formValidationErrors.push('יש לבחור מחנה אימון');
            if (!$scope.participant.Name)
                $scope.formValidationErrors.push('יש להזין שם');
            if (!$scope.participant.Email) {
                $scope.formValidationErrors.push('יש להזין דואר אלקטרוני');
            } else if (!sportUtils.IsValidEmail($scope.participant.Email)) {
                    $scope.formValidationErrors.push('כתובת דואר אלקטרוני לא תקינה');
            }
            if (!$scope.participant.Address)
                $scope.formValidationErrors.push('יש להזין כתובת');
            var cellularPhone = $scope.participant.Cellular;
            var homePhone = $scope.participant.Phone;
            if (!cellularPhone && !homePhone) {
                $scope.formValidationErrors.push('יש להזין טלפון בית או סלולרי');
            } else {
                if (homePhone && !sportUtils.IsValidPhoneNumber(homePhone))
                    $scope.formValidationErrors.push('טלפון בית לא תקין');
                if (cellularPhone && !sportUtils.IsValidPhoneNumber(cellularPhone))
                    $scope.formValidationErrors.push('טלפון סלולרי לא תקין');
            }
            var captchaResponse = GetCaptchaResponse();
            if (captchaResponse.length == 0)
                $scope.formValidationErrors.push('יש לוודא שהינך לא רובוט');
            if ($scope.formValidationErrors.length == 0) {
                if ($scope.participant.Birthday)
                    $scope.participant.ParsedBirthday = ExtractDate($scope.participant.Birthday);
                $scope.formSending = true;
                var reqBody = {
                    captchaResponse: captchaResponse,
                    Participant: $scope.participant
                };
                $http.post('/api/sportsman/practice-camps', reqBody).then(function(resp) {
                    $scope.formSending = false;
                    $scope.sendResult = {
                        Success: true
                    };
                }, function(err) {
                    $scope.formSending = false;
                    $scope.sendResult = {
                        Error: 'שגיאה בעת שליחת נתונים'
                    };
                });
            }
        };
    }

    function UPYA_Manage_Controller($scope, $state, $http, $filter, $timeout, $interval, messageBox) {
        $scope.data = {
            availableCamps: []
        };

        window['qL_steps_amount'] = 2;

        function VerifyUser() {
            sportUtils.VerifyUser($http, $scope, [3]);
            window['qL_step_finished'] = true;
        }

        function ApplyCssClass(practiceCamp) {
            practiceCamp.StateClass = 'button button_type_icon_small icon button_grey_light';
            practiceCamp.IconClass = 'fa fa-eye';
            if (practiceCamp.Hidden) {
                practiceCamp.IconClass += '-slash';
                practiceCamp.Tooltip = 'מחנה אימון מוסתר, יש ללחוץ כדי לבטל הסתרה';
            } else {
                practiceCamp.StateClass += ' button_grey_light_hover';
                practiceCamp.Tooltip = 'מחנה אימון גלוי, ניתן ללחוץ על כפתור זה כדי להסתיר את מחנה האימון';
            }
        }

        function ReadAllData() {
            upyaUtils.ReadPracticeCamps($scope, $http, $filter, function() {
                $http.get('/api/common/hidden-practice-camps').then(function(resp) {
                    var hiddenCampsMapping = {};
                    for (var i = 0; i < resp.data.length; i++)
                        hiddenCampsMapping[resp.data[i].PRACTICE_CAMP_ID.toString()] = true;
                    $scope.data.availableCamps.forEach(function(practiceCamp) {
                        practiceCamp.Hidden = hiddenCampsMapping[practiceCamp.PRACTICE_CAMP_ID.toString()];
                        ApplyCssClass(practiceCamp);
                    });
                    ChainFactory.Next();
                }, function(err) {
                    $scope.data.availableCamps.forEach(function(practiceCamp) {
                        ApplyCssClass(practiceCamp);
                    });
                    ChainFactory.Next();
                });
            });
        }

        ChainFactory.Execute(VerifyUser, ReadAllData);

        window.setTimeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1500);

        $scope.ToggleState = function(practiceCamp) {
            var reqParams = {
                PRACTICE_CAMP_ID: practiceCamp.PRACTICE_CAMP_ID
            };
            $http.post('/api/common/toggle-practice-camp', reqParams).then(function(resp) {
                practiceCamp.Hidden = !practiceCamp.Hidden;
                ApplyCssClass(practiceCamp);
            }, function(err) {
                console.log('error toggling practice camp');
                alert('שגיאה בעת עדכון נתוני מחנה אימון נא לנסות שוב מאוחר יותר');
            });
        };
    }
})();