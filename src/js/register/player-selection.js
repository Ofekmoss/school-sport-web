(function() {
    'use strict';

    angular
        .module('sport')
        .controller('PlayerSelectionCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$timeout', '$q', 'messageBox', 'championshipData', PlayerSelectionCtrl]);

    function PlayerSelectionCtrl($scope, $http, $uibModalInstance, $filter, $timeout, $q, messageBox, championshipData) {
        var allPlayers = [];
        var existingPlayerMapping = {};
        var studentPropertiesMapping = {IdNumber: 'ID_NUMBER', FirstName: 'FIRST_NAME', LastName: 'LAST_NAME', Birthday: 'BIRTH_DATE', Gender: 'SEX_TYPE'};

        $scope.data = {
            'ChampionshipFullName': championshipData.ChampionshipName,
            'AvailablePlayers': [],
            'search': '',
            'matchingStudent': null,
            'NewStudent': null,
            'invalidIdNumber': false,
            'alreadyInTeam': null,
            'Grades': sportUtils.grades.map(function(grade, index) {
                return {
                    Index: index + 1,
                    Name: grade
                };
            })
        };
        $scope.selected = {
            'Players': []
        };
        $scope.latestSeason = championshipData.LatestSeason;

        if (championshipData.ExistingPlayers) {
            for (var i = 0; i < championshipData.ExistingPlayers.length; i++) {
                var curPlayer = championshipData.ExistingPlayers[i];
                var key = curPlayer.ID_NUMBER.toString();
                existingPlayerMapping[key] = curPlayer;
            }
        }

        if (championshipData.EditStudent) {
            $scope.data.NewStudent = {};
            for (var prop in studentPropertiesMapping) {
                var curValue = championshipData.EditStudent[studentPropertiesMapping[prop]];
                $scope.data.NewStudent[prop] = curValue;
                $scope.data.NewStudent['Original_' + prop] = curValue;
            }
            $scope.data.NewStudent.Grade = $scope.data.Grades.findItem(function(x) {
                return x.Name == championshipData.EditStudent.ParsedGrade;
            });
            $scope.data.NewStudent['Original_Grade'] = $scope.data.NewStudent.Grade == null ? 0 : $scope.data.NewStudent.Grade.Index;
            $scope.data.NewStudent.IsEditMode = true;
            var url = '/api/sportsman/student/' + $scope.data.NewStudent.IdNumber + '/candelete';
            $http.get(url).then(function(resp) {
                $scope.data.NewStudent.CanDelete = resp.data.CanDelete;
            }, function(err) {
                console.log('error checking if can delete student');
                console.log(err);
            });
        }

        $scope.parsedSearchTerm = function() {
            var searchTerm = $.trim($scope.data.search);
            if (searchTerm.length > 0 && sportUtils.IsInteger(searchTerm))
                searchTerm = parseInt(searchTerm) + '';
            return searchTerm;
        };

        function ClonePlayer(player) {
            var clone = {};
            for (var prop in player) {
                clone[prop] = player[prop];
            }
            return clone;
        }

        function filteredPlayers() {
            var selectedPlayersMapping = {};
            for (var i = 0; i < $scope.selected.Players.length; i++) {
                var key = $scope.selected.Players[i].ID_NUMBER.toString();
                selectedPlayersMapping[key] = true;
            }
            var filtered = allPlayers.filter(function(x) {
                if (selectedPlayersMapping[x.ID_NUMBER.toString()])
                    return false;
                if (existingPlayerMapping[x.ID_NUMBER.toString()])
                    return false;
                return true;
            });
            var searchTerm = $scope.parsedSearchTerm();
            if (searchTerm.length > 0)
                filtered = $filter('filter')(filtered, searchTerm);
            return filtered;
        }

        $timeout(function() {
            $http.get('/api/sportsman/latest-season').then(function(resp) {
                var latestSeason = resp.data.Season;
                if (latestSeason) {
                    allPlayers.forEach(function(curPlayer) {
                        if (curPlayer.GRADE) {
                            curPlayer.ParsedGrade = sportUtils.TranslateGrade(curPlayer.GRADE, latestSeason);
                        }
                    });
                }
            });
        }, 500);

        function CheckNewStudent(numericId) {
            var idNumber = numericId.toString();
            if (idNumber.length >= 9 && sportUtils.IsValidIdNumber(idNumber)) {
                $scope.data.NewStudent = {
                    IdNumber: idNumber.toString()
                };
                $timeout(function () {
                    if ($scope.data.NewStudent) {
                        $('#txtNewStudentFirstName').focus();
                    }
                }, 500);
            } else {
                $scope.data.invalidIdNumber = idNumber.length == 9;
            }
            $scope.data.matchingStudent = null;
        }

        function ParseRegistrationStatus(rawStatus) {
            if (rawStatus == null || !rawStatus || rawStatus.length == 0)
                return 0;
            var lookFor = '<PlayerRegStatus>';
            var index = rawStatus.indexOf(lookFor);
            if (index >= 0) {
                return rawStatus.substr(index + lookFor.length, 1) == '1' ? 1 : 0;
            } else {
                return 0;
            }
        }

        $scope.pagingService = new PagingService(filteredPlayers(), {pageSize: 20});
        $scope.data.AvailablePlayers = [];
        $scope.pagingService.applyPaging($scope.data.AvailablePlayers);

        if (championshipData.CategoryId) {
            var url = '/api/sportsman/matching-students?category=' + championshipData.CategoryId + '&school=' + championshipData.SchoolSymbol;
            $http.get(url).then(function (resp) {
                allPlayers = resp.data;
                $scope.pagingService.setData(filteredPlayers());
            });
        }

        $scope.$watch('data.search', function (newval){
            if (championshipData.EditStudent)
                return;

            if ($scope.pagingService) {
                $scope.pagingService.setData(filteredPlayers());
            }

            $scope.data.NewStudent = null;
            $scope.data.invalidIdNumber = false;
            $scope.data.alreadyInTeam = null;
            $scope.data.doubleRegistration = null;
            if (newval && newval.length > 0 && sportUtils.IsInteger(newval) && newval.length > 5 && newval.length <= 9) {
                var idNumber = parseInt(newval);
                var alreadySelected = $scope.selected.Players.findIndex(function(x) { return parseInt(x.ID_NUMBER) == idNumber; }) >= 0;
                var playerIndex = allPlayers.findIndex(function(x) { return parseInt(x.ID_NUMBER) == idNumber; });
                $scope.data.alreadyInTeam = existingPlayerMapping[idNumber.toString()];
                var shouldCheckRegistrationStatus = championshipData.ChampionshipName.indexOf("ז'-ח'") >= 0 || championshipData.ChampionshipName.indexOf('ז-ח') >= 0;
                if (!$scope.data.alreadyInTeam && !alreadySelected && playerIndex < 0) {
                    $http.get('/api/sportsman/student?id=' + idNumber + '&sport=' + championshipData.SportID).then(function (resp) {
                        var student = resp.data;
                        var ifaRegisterStatus = ParseRegistrationStatus(student.IfaRegisterStatus);
                        if (shouldCheckRegistrationStatus && ifaRegisterStatus == 1) { //changed 09/01/2019 to allow registration until it can be limited to only specific grades
                            $scope.data.doubleRegistration = "כדורגל";
                        } else {
                            if (student.STUDENT_ID) {
                                $scope.data.matchingStudent = student;
                                if (student.SYMBOL != championshipData.SchoolSymbol) {
                                    $scope.data.matchingStudent.DifferentSchool = {
                                        Symbol: student.SYMBOL,
                                        Name: student.SCHOOL_NAME
                                    };
                                }
                            } else {
                                CheckNewStudent(idNumber);
                            }
                        }
                    }, function (err) {
                        console.log('failed to get matching student');
                        console.log(err);
                        CheckNewStudent(idNumber);
                    });
                } else {
                    $scope.data.matchingStudent = null;
                }
            } else {
                $scope.data.matchingStudent = null;
            }
        });

        $scope.SelectPlayer = function(player) {
            $scope.selected.Players.push(ClonePlayer(player));
            var count = $scope.selected.Players.length;
            $scope.selected.Players.moveItem(count - 1, 0);
            $scope.pagingService.setData(filteredPlayers());
            $scope.data.matchingStudent = null;
            $scope.data.search = '';
            $scope.pagingService.setData(filteredPlayers());
        };

        $scope.RemoveSelectedPlayer = function(player) {
            var matchingIndex = $scope.selected.Players.findIndex(function(x) {
                return x.ID_NUMBER == player.ID_NUMBER;
            });
            if (matchingIndex >= 0) {
                $scope.selected.Players.splice(matchingIndex, 1);
                $scope.pagingService.setData(filteredPlayers());
            }
        };

        $scope.deleteStudent = function() {
            var msg = 'האם למחוק תלמיד מהמערכת? פעולה זו אינה הפיכה!';
            messageBox.ask(msg).then(function () {
                var url = '/api/sportsman/student?id=' + $scope.data.NewStudent.IdNumber;
                $http.delete(url).then(function(resp) {
                    $uibModalInstance.close('DELETED');
                }, function(err) {
                    alert('שגיאה בעת מחיקת שחקן מהמערכת, נא לנסות שוב מאוחר יותר');
                    console.log('error deleting student');
                    console.log(err);
                });
            });
        };

        $scope.isConfirmDisabled = function() {
            if ($scope.data.NewStudent == null) {
                return !$scope.selected.Players || $scope.selected.Players.length == 0;
            } else {
                //Original_
                if (!$scope.data.NewStudent.FirstName || !$scope.data.NewStudent.LastName ||
                    !$scope.data.NewStudent.Birthday || !$scope.data.NewStudent.Grade ||
                    !$scope.data.NewStudent.Grade.Index) {
                    //missing required fields
                    return true;
                }
                if ($scope.data.NewStudent.IsEditMode) {
                    var dirty = false;
                    for (var prop in studentPropertiesMapping) {
                        var curValue = $.trim($scope.data.NewStudent[prop]);
                        var originalValue = $.trim($scope.data.NewStudent['Original_' + prop]);
                        if (curValue != originalValue) {
                            dirty = true;
                            break;
                        }
                    }
                    var curGrade = $scope.data.NewStudent.Grade == null ? 0 : $scope.data.NewStudent.Grade.Index;
                    if (curGrade != $scope.data.NewStudent['Original_Grade'])
                        dirty = true;
                    return !dirty;
                }
                return false;
            }
        };

        $scope.cancel = function () {
            if ($scope.data.NewStudent == null || ($scope.data.NewStudent != null && $scope.data.NewStudent.IsEditMode)) {
                $uibModalInstance.dismiss('cancel');
            } else {
                $scope.data.NewStudent = null;
                $scope.data.search = ''
                $scope.pagingService.setData(filteredPlayers());
            }
        };

        $scope.confirm = function () {
            if ($scope.isConfirmDisabled()) {
                $scope.data.TriedToSubmit = true;
                return;
            }

            if ($scope.data.NewStudent == null) {
                if ($scope.selected.Players && $scope.selected.Players.length > 0) {
                    $uibModalInstance.close($scope.selected.Players);
                }
            } else {
                $scope.data.TriedToSubmit = true;
                if ($scope.data.NewStudent.IsEditMode) {
                    $uibModalInstance.close($scope.data.NewStudent);
                } else {
                    var clonedStudent = {};
                    for (var propertyName in $scope.data.NewStudent) {
                        var value = $scope.data.NewStudent[propertyName];
                        if ($scope.latestSeason != null && propertyName == 'Grade')
                            value = $scope.latestSeason - (value.Index - 1);
                        clonedStudent[propertyName] = value;
                    }
                    $http.post('/api/sportsman/student', {Student: clonedStudent}).then(function(resp) {
                        for (var prop in studentPropertiesMapping)
                            $scope.data.NewStudent[studentPropertiesMapping[prop]] = $scope.data.NewStudent[prop];
                        $scope.data.NewStudent.STUDENT_ID = resp.data.STUDENT_ID;
                        $scope.data.NewStudent.GRADE = clonedStudent.Grade;
                        allPlayers.push(ClonePlayer($scope.data.NewStudent));
                        $scope.SelectPlayer($scope.data.NewStudent);
                        $scope.data.NewStudent = null;
                    }, function(err) {
                        alert('שגיאה בעת הוספת שחקן למערכת, נא לנסות שוב מאוחר יותר');
                        console.log(err);
                    });

                }
            }
        };
    }
})();