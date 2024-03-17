(function() {
    'use strict';

    angular
        .module('sport.register')
        .controller('RegisterController',
            ['$scope', '$http', '$q', '$uibModal', '$timeout', '$interval', '$filter', '$rootScope', 'messageBox', RegisterController]);

    //441360
    //shkim

    //640086

    function RegisterController($scope, $http, $q, $uibModal, $timeout, $interval, $filter, $rootScope, messageBox) {
        var abortTeamSelection = false;
        $scope.userInput = {'username': '', 'password': ''};
        $scope.selected = {'team': null};
        $scope.loggedUser = null;
        $scope.schoolTeams = [];
        $scope.isClubSchool = false;
        $scope.latestSeason = null;

        $timeout(function() {
            $("#register_username").focus();
        }, 500);

        window['qL_steps_amount'] = 5;

        $http.get('/api/seasons/current').then(function(resp) {
            var currentSeason = sportUtils.getCurrentSeason();
            if (currentSeason != null && currentSeason.Season) {
                var latestYear = resp.data.Year;
                if (latestYear != currentSeason.Season) {
                    sportUtils.setCurrentSeason(null);
                    document.location.reload(true);
                    return;
                }
            }
        });

        function ParseFileType(type, isFull) {
            if (typeof isFull == 'undefined')
                isFull = false;
            switch (type) {
                case 1:
                    return 'תמונה';
                case 2:
                    return 'טופס בדיקה' + (isFull ? ' רפואית' : '');
                case 3:
                    return 'ספח ת"ז';
            }
        }

        function GetFileData(idNumber, fileType) {
            var fileData = { 'HasFile': false };
            var panels = $(".dropzone[data-player-id='" + idNumber + "']");
            if (panels.length > 0) {
                for (var i = 0; i < panels.length; i++) {
                    var curPanel  = panels.eq(i);
                    if (curPanel.data("file-type") == fileType.toString()) {
                        var filePanel = curPanel.parents(".player-file").first();
                        fileData.HasFile = filePanel.data("has-file") == "1";
                        fileData.PDF = filePanel.data("is-pdf") == "1";
                        fileData.MessagePanel = filePanel.find(".dz-message");
                    }
                }
            }
            return fileData;
        }

        function ValidateFile(fileObj, fileType) {
            var contentType = fileObj.type;
            var isEmpty = !contentType || contentType.length == 0;
            var isImage = (isEmpty) ? false : contentType.split('/')[0].toLowerCase() == 'image';
            var isPDF = (isEmpty) ? false : contentType.split('/')[1].toLowerCase() == 'pdf';
            var message = '';
            switch (fileType) {
                case 1:
                    if (!isImage)
                        message = 'ניתן להעלות קובץ תמונה בלבד';
                    break;
                case 2:
                case 3:
                    if (!isImage && !isPDF)
                        message = 'ניתן להעלות תמונה או קובץ PDF בלבד';
                    break;
            }
            return message;
        }

        function HandleFileUpload(dropZone, file, fileType) {
            var validationResult = ValidateFile(file, fileType);
            if (validationResult.length > 0) {
                dropZone.ValidFile = false;
                if (dropZone.element) {
                    $(dropZone.element).find('.fa').first().hide();
                    var oErrorSpan = $(dropZone.element).find('.upload-error');
                    oErrorSpan.html(validationResult);
                    oErrorSpan.show();
                    window.setTimeout(function () {
                        oErrorSpan.html('');
                        oErrorSpan.hide();
                        $(dropZone.element).find('.fa').first().show();
                    }, 5000);
                }
                window.setTimeout(function () {
                    dropZone.removeAllFiles(true);
                }, 200);
            } else {
                dropZone.ValidFile = true;
            }
        }

        function CreateDropzoneConfig(fileType) {
            var title = ParseFileType(fileType);
            return {
                'options': { // passed into the Dropzone constructor
                    'paramName': 'files',
                    'maxFiles': 1,
                    'url': '/content/PlayerFile?type=' + fileType + '&id=$id',
                    'autoProcessQueue': true,
                    'dictRemoveFile': 'הסרת ' + title,
                    'addRemoveLinks': true
                },
                'eventHandlers': {
                    'sending': function (dropZone, file, xhr, formData) {
                        HandleFileUpload(dropZone, file, fileType)
                    },
                    'success': function (file, response) {
                        var dropZone = this;
                        if (dropZone.ValidFile && dropZone.element) {
                            var element = $(dropZone.element);
                            var messagePanel = element.find('.dz-message');
                            var previewPanel = element.find('.dz-preview');
                            messagePanel.data('handled', '0');
                            window.setTimeout(function() {
                                previewPanel.hide();
                                messagePanel.show();
                            }, 200);
                        }
                    },
                    'maxfilesexceeded': function(file){
                        var _this = this;
                        window.setTimeout(function() {
                            _this.removeFile(file);
                        }, 200);
                    }
                }
            }
        }


        $scope.dropzoneConfig_Picture = CreateDropzoneConfig(1);
        $scope.dropzoneConfig_MedicalForm = CreateDropzoneConfig(2);
        $scope.dropzoneConfig_IdVoucher = CreateDropzoneConfig(3);

        function ApplyUserData(callback) {
            if (typeof callback == 'undefined')
                callback = null;
            var schoolSymbol = $scope.loggedUser.SchoolSymbol;
            $http.get('/api/sportsman/school-data?symbol=' + schoolSymbol).then(function(resp) {
                $scope.isClubSchool = resp.data.CLUB_STATUS == 1;
            });
            $scope.selected.team = null;
            if (schoolSymbol) {
                registerUtils.buildSchoolName($http, schoolSymbol).then(function (schoolName) {
                    $scope.loggedUser.SchoolName = schoolName;
                }, function (err) {
                    console.log('error reading school name');
                    console.log(err);
                });
                $http.get('/api/sportsman/school/' + schoolSymbol + '/teams').then(function(resp) {
                    $scope.schoolTeams = resp.data;
                    $scope.schoolTeams.sort(function(t1, t2) {
                        var p = t2.IsPending - t1.IsPending;
                        if (p != 0)
                            return p;
                        var s = t2.SPORT_ID - t1.SPORT_ID;
                        if (s != 0)
                            return s;
                        var c = t2.CHAMPIONSHIP_ID - t1.CHAMPIONSHIP_ID;
                        if (c != 0)
                            return c;
                        return t1.TEAM_INDEX - t2.TEAM_INDEX;
                    });
                    var playerMapping = {};
                    for (var i = 0; i < $scope.schoolTeams.length; i++) {
                        var curTeam = $scope.schoolTeams[i];
                        if (curTeam.TEAM_INDEX)
                            curTeam.HebrewIndex = sportUtils.GetHebrewLetter(curTeam.TEAM_INDEX);
                        if (curTeam.REGISTRATION_DATE)
                            curTeam.REGISTRATION_DATE = new Date(curTeam.REGISTRATION_DATE);
                        if (curTeam.Players) {
                            curTeam.Players.forEach(function(curPlayer) {
                                playerMapping[curPlayer.STUDENT_ID.toString()] = curPlayer;
                                if (curPlayer.BIRTH_DATE)
                                    curPlayer.BIRTH_DATE = new Date(curPlayer.BIRTH_DATE);
                                curPlayer.Status = {
                                    Description: registerUtils.ParsePlayerStatus(curPlayer.STATUS),
                                    Style: registerUtils.PlayerStatusStyle(curPlayer.STATUS),
                                    Tooltip: registerUtils.PlayerStatusTitle(curPlayer)
                                };
                            });
                            curTeam.Players = registerUtils.SplitPlayersByStatus(curTeam.Players);
                            curTeam.RegisteredPlayersCountHebrew = registerUtils.HebrewCount(curTeam.Players.RegisteredPlayers.length,
                                true, 'שחקן רשום', 'שחקנים רשומים');
                            curTeam.ConfirmedPlayersCountHebrew = registerUtils.HebrewCount(curTeam.Players.ConfirmedPlayers.length,
                                true, 'שחקן מאושר', 'שחקנים מאושרים');
                            curTeam.UnConfirmedPlayersCountHebrew = registerUtils.HebrewCount(curTeam.Players.UnConfirmedPlayers.length,
                                true, 'שחקן לא מאושר', 'שחקנים לא מאושרים');
                        }
                    }
                    $http.get('/api/sportsman/latest-season').then(function(resp) {
                        var latestSeason = resp.data.Season;
                        if (latestSeason) {
                            $scope.latestSeason = latestSeason;
                            $scope.schoolTeams.forEach(function(curTeam) {
                                GetAllPlayers(curTeam).forEach(function (curPlayer) {
                                    if (curPlayer.GRADE) {
                                        curPlayer.ParsedGrade = sportUtils.TranslateGrade(curPlayer.GRADE, latestSeason);
                                    }
                                });
                            });
                        }
                    });
                    registerUtils.InitTeamPanelsTimer();
                    $http.get('/api/sportsman/school-change-requests').then(function(resp) {
                        for (var i = 0; i < resp.data.length; i++) {
                            var curItem = resp.data[i];
                            var curStudentId = curItem.STUDENT_ID;
                            var matchingPlayer = playerMapping[curStudentId.toString()];
                            if (matchingPlayer) {
                                matchingPlayer.DifferentSchool = {
                                    Symbol: curItem.SYMBOL,
                                    Name: curItem.SCHOOL_NAME
                                };
                            }
                        }
                        if (callback != null)
                            callback();
                    }, function(err) {
                        console.log('error loading school change requests')
                        console.log(err);
                        if (callback != null) {
                            callback();
                        }
                    });
                }, function(err) {
                    console.log('error reading school teams');
                    console.log(err);
                });
            }
        }

        contentUtils.InitSportFieldColors($http, function() {

        });

        function GetAllPlayers(team) {
            if (team.Players) {
                return team.Players.RegisteredPlayers.concat(team.Players.ConfirmedPlayers).concat(team.Players.UnConfirmedPlayers);
            } else {
                return [];
            }
        }

        function OpenPlayerSelectionDialog(team, editPlayer, callback) {
            $uibModal.open({
                templateUrl: 'views/player-selection.html',
                controller: 'PlayerSelectionCtrl',
                resolve: {
                    championshipData: function () {
                        if (team == null) {
                            return {
                                ChampionshipName: '',
                                LatestSeason: $scope.latestSeason,
                                CategoryId: 0,
                                SchoolSymbol: '0',
                                ExistingPlayers: [],
                                EditStudent: editPlayer
                            }
                        } else {
                            var allPlayers = GetAllPlayers(team);
                            return {
                                ChampionshipName: team.CHAMPIONSHIP_NAME + ', ' + team.CATEGORY_NAME,
                                CategoryId: team.CHAMPIONSHIP_CATEGORY_ID,
                                SchoolSymbol: $scope.loggedUser.SchoolSymbol,
                                LatestSeason: $scope.latestSeason,
                                ExistingPlayers: allPlayers,
                                SportID: team.SPORT_ID
                            };
                        }
                    },
                    options: function () {
                        return {};
                    }
                }
            }).result.then(function (selectedStudents) {
                    if (callback) {
                        callback(selectedStudents);
                    }
                });
        }

        $http.get('/api/login').then(function(resp) {
            if (resp && resp.data && resp.data != null) {
                $scope.loggedUser = {
                    'Seq': resp.data.seq,
                    'Login': resp.data.name,
                    'DisplayName': resp.data.displayName,
                    'Role': resp.data.role,
                    'SchoolSymbol': resp.data.schoolSymbol
                };
                ApplyUserData();
            }
        }, function(err) {
            console.log('error getting logged in user');
            console.log(err);
        });

        $timeout(function() {
            window['qL_Finish_Now'] = true;
        }, 1000);

        //window['qL_step_finished'] = true;

        $scope.getSportFieldStyle = function(sportFieldSeq) {
            return 'background-color: ' + contentUtils.getSportFieldColor(sportFieldSeq) + ';';
        };

        $scope.deletePlayer = function(player) {
            var playerId = player.PLAYER_ID;
            var teamId = $scope.selected.team.TEAM_ID;
            var msg = 'האם להסיר את ' + player.FIRST_NAME + ' ' + player.LAST_NAME + ' מ' + $scope.selected.team.CHAMPIONSHIP_NAME + '?';
            messageBox.ask(msg).then(function () {
                $http.delete('/api/sportsman/player?player=' + playerId).then(function() {
                    ApplyUserData(function() {
                        $timeout(function() {
                            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == teamId; });
                            if (index >= 0)
                                $scope.selectTeam($scope.schoolTeams[index]);
                        }, 500);
                    });
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת שחקן, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.deleteTeam = function(team) {
            var teamId = team.TEAM_ID;
            var msg = 'האם למחוק קבוצה זו? הפעולה בלתי הפיכה!';
            messageBox.ask(msg).then(function () {
                team.deleting = true;
                $http.delete('/api/sportsman/team?team=' + teamId).then(function() {
                    team.deleting = false;
                    ApplyUserData();
                }, function(err) {
                    team.deleting = false;
                    console.log(err);
                    alert('שגיאה בעת מחיקת קבוצה, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.registerTeam = function() {
            var teamsMapping = {};
            for (var i = 0; i < $scope.schoolTeams.length; i++) {
                var curTeam = $scope.schoolTeams[i];
                var key = curTeam.CHAMPIONSHIP_CATEGORY_ID.toString();
                if (!teamsMapping[key])
                    teamsMapping[key] = [];
                teamsMapping[key].push(curTeam);
            }

            $uibModal.open({
                templateUrl: 'views/championship-selection.html',
                controller: 'ChampionshipSelectionCtrl',
                resolve: {
                    schoolData: function() {
                        return {
                            Name: $scope.loggedUser.SchoolName,
                            Symbol: $scope.loggedUser.SchoolSymbol,
                            Teams: teamsMapping
                        };
                    },
                    sportField: function () {
                        return null;
                    },
                    allSeasons: function () {
                        return null;
                    },
                    allRegions: function () {
                        return null;
                    },
                    options: function () {
                        return {

                        };
                    }
                }
            }).result.then(function (data) {
                    registerUtils.registerTeams($http, $scope.loggedUser, data.Category, data.Amount, function() {
                        ApplyUserData();
                    }, null);
            });
        };

        $scope.registerNewPlayers = function(team) {
            OpenPlayerSelectionDialog(team, null, function(selectedStudents) {
                var teamId = team.TEAM_ID;
                $http.put('/api/sportsman/team/' + teamId + '/players', {Players: selectedStudents}).then(function(resp) {
                    ApplyUserData(function() {
                        $timeout(function() {
                            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == teamId; });
                            if (index >= 0)
                                $scope.selectTeam($scope.schoolTeams[index]);
                        }, 500);
                    });
                }, function(err) {
                    alert('שגיאה בעת הוספת שחקנים לקבוצה, אנא נסו שוב מאוחר יותר');
                    console.log(err);
                });
            });
        };

        $scope.PlayerFileClicked = function(player, fileType) {
            //got file?
            var idNumber = player.ID_NUMBER;
            var fileData = GetFileData(idNumber, fileType);
            if (fileData.HasFile) {
                $uibModal.open({
                    templateUrl: 'views/player-file.html',
                    controller: 'PlayerFileCtrl',
                    resolve: {
                        PlayerInfo: function () {
                            return {
                                IdNumber: player.ID_NUMBER,
                                Name: player.FIRST_NAME + ' ' + player.LAST_NAME,
                                FileTitle: ParseFileType(fileType),
                                FileType: fileType,
                                PDF: fileData.PDF
                            };
                        },
                        options: function () {
                            return {
                            };
                        }
                    }
                }).result.then(function (resp) {
                        if (resp == 'DELETED') {
                            fileData.MessagePanel.data('handled', '0');
                        }
                    });
            }
        };

        $scope.selectTeam = function(team) {
            if (abortTeamSelection) {
                abortTeamSelection = false;
                return;
            }
            $scope.selected.team = team;
            registerUtils.InitPlayerPlaceholdersTimer();
            registerUtils.InitPlayerFilesTimer();
            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == team.TEAM_ID; });
            $scope.schoolTeams.moveItem(index, 0);
            document.documentElement.scrollTop = 50;
        };

        $scope.selectPlayer = function(player) {
            if ($scope.selected.team == null || $scope.selected.team.Players == null)
                return;
            var allPlayers = GetAllPlayers($scope.selected.team);
            allPlayers.forEach(function(p) {
                p.Selected = false;
            });
            player.Selected = true;
            document.body.scrollTop = 50;
        };

        $scope.editPlayer = function(player) {
            OpenPlayerSelectionDialog(null, player, function(editedStudent) {
                if (editedStudent == 'DELETED') {
                    var teamId = $scope.selected.team.TEAM_ID;
                    ApplyUserData(function() {
                        $timeout(function() {
                            var index = $scope.schoolTeams.findIndex(function(x) { return x.TEAM_ID == teamId; });
                            if (index >= 0)
                                $scope.selectTeam($scope.schoolTeams[index]);
                        }, 500);
                    });
                } else {
                    editedStudent.Id = player.PLAYER_ID;
                    var clonedPlayer = {};
                    for (var propertyName in editedStudent) {
                        var value = editedStudent[propertyName];
                        if ($scope.latestSeason != null && propertyName == 'Grade')
                            value = $scope.latestSeason - (value.Index - 1);
                        clonedPlayer[propertyName] = value;
                    }
                    $http.put('/api/sportsman/player', {Player: clonedPlayer}).then(function () {
                        player.FIRST_NAME = editedStudent.FirstName;
                        player.LAST_NAME = editedStudent.LastName;
                        player.BIRTH_DATE = editedStudent.Birthday;
                        player.GRADE = clonedPlayer.Grade;
                        player.ParsedGrade = sportUtils.TranslateGrade(player.GRADE, $scope.latestSeason);
                    }, function (err) {
                        console.log(err);
                        alert('שגיאה בעת עריכת פרטי  שחקן, נא לנסות מאוחר יותר');
                    });
                 }
            });
        };

        $scope.getTeamPanelStyle = function(team) {
            if ($scope.selected.team != null && $scope.selected.team.TEAM_ID == team.TEAM_ID)
                return 'background-color: #AFD2DB;';
            return '';
        };

        $scope.getPlayerPanelStyle = function(player) {
            return (player.Selected) ? 'background-color: #AFD2DB;' : '';
        };

        $scope.removePendingTeam = function(team) {
            abortTeamSelection = true;
            var msg = 'האם לבטל רישום של קבוצה זו?';
            messageBox.ask(msg).then(function () {
                $http.delete('/api/sportsman/pending-team?team=' + team.TEAM_ID).then(function() {
                    $scope.schoolTeams = $scope.schoolTeams.filter(function(x) { return x.TEAM_ID != team.TEAM_ID; });
                }, function(err) {
                    console.log(err);
                    alert('שגיאה בעת מחיקת קבוצה, נא לנסות מאוחר יותר');
                });
            });
        };

        $scope.login = function () {
            $scope.errorMessage = null;
            sportUtils.Login($q, $http, $scope.userInput.username, $scope.userInput.password).then(function(user) {
                $scope.loggedUser = {
                    'Seq': user.seq,
                    'Login': $scope.username,
                    'DisplayName': user.displayName,
                    'Role': user.role,
                    'SchoolSymbol': user.schoolSymbol
                };
                ApplyUserData();
            }, function(err) {
                $scope.errorMessage = err;
            });
        };
    }
})();