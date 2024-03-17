(function() {
    'use strict';

    angular
        .module('sport')
        .controller('MatchResultDialogCtrl', ['$scope', '$http', '$uibModalInstance', '$filter', '$timeout', '$q', 'messageBox', 'match', 'technicalRule', MatchResultDialogCtrl]);

    function MatchResultDialogCtrl($scope, $http, $uibModalInstance, $filter, $timeout, $q, messageBox, match, technicalRule) {
        var matchFormExists = match.UploadedFileUrl && match.UploadedFileUrl.length > 0;
        var uploadFolderUrl = '/content/Matches/' + [match.CHAMPIONSHIP_CATEGORY_ID, match.match_number, 'form'].join('/');
        var dropZoneTitle = 'ניתן לגרור לכאן טופס ';
        if (matchFormExists)
            dropZoneTitle += 'חדש ';
        dropZoneTitle += 'או ללחוץ להעלאה';

        $scope.match = match;
        $scope.match.OriginalResult = $scope.match.RESULT;
        $scope.match.OverridenPartScore = null;

        if ($scope.match.PartsData != null)
            $scope.match.ShowPartScore = true;

        window.setTimeout(function() {
            var textboxId_A = sportUtils.IsMobile() ? 'edTeamA_Score_mobile' : 'edTeamA_Score';
            var textboxId_B = sportUtils.IsMobile() ? 'edTeamB_Score_mobile' : 'edTeamB_Score';
            $('#' + textboxId_A).focus();
            sportUtils.IntegerOnlyTextbox(textboxId_A);
            sportUtils.IntegerOnlyTextbox(textboxId_B);
        }, 500);

        function GetTeamScore(teamLetter, index) {
            if ($scope.match.PartsData != null) {
                var arrScore = $scope.match.PartsData['Team' + teamLetter];
                if (index >= 0 && index < arrScore.length)
                    return arrScore[index];
            }
            return null;
        }

        $http.get('/api/sportsman/data-gateway').then(function (resp) {
            var url = resp.data + '?ccid=' + match.CHAMPIONSHIP_CATEGORY_ID;
            $http.get(url).then(function(resp) {
                if (resp.data != null && resp.data.GameStructure != null && resp.data.GameStructure.PartCount) {
                    $scope.match.OverridenPartScore = [];
                    for (var i = 0; i < resp.data.GameStructure.PartCount; i++) {
                        var scoreA = GetTeamScore('A', i);
                        var scoreB = GetTeamScore('B', i);
                        $scope.match.OverridenPartScore.push({
                            ScoreA: scoreA,
                            OriginalScoreA: scoreA,
                            ScoreB: scoreB,
                            OriginalScoreB: scoreB,
                            IsExtension: false
                        });
                    }
                    if (resp.data.GameStructure.ExtensionCount) {
                        for (var i = 0; i < resp.data.GameStructure.ExtensionCount; i++) {
                            var scoreA = GetTeamScore('A', i + resp.data.GameStructure.PartCount);
                            var scoreB = GetTeamScore('B', i + resp.data.GameStructure.PartCount);
                            var curPartScore = {
                                ScoreA: scoreA,
                                OriginalScoreA: scoreA,
                                ScoreB: scoreB,
                                OriginalScoreB: scoreB,
                                IsExtension: true
                            };
                            if (i == 0)
                                curPartScore.FirstExtension = true;
                            $scope.match.OverridenPartScore.push(curPartScore);
                        }
                    }
                }
            });
        });

        function ApplyErrorMessage(errorMsg, dropZone, file) {
            $scope.fileUploadError = errorMsg;
            window.setTimeout(function () {
                dropZone.removeFile(file);
            }, 200);
            $timeout(function () {
                $scope.fileUploadError = '';
            }, 5000);
        }

        function HandleFileUpload(dropZone, file) {
            function ValidateAttachment() {
                var fileType = file.type;
                var isEmpty = !fileType || fileType.length == 0;
                var isImage = (isEmpty) ? false : fileType.split('/')[0].toLowerCase() == 'image';
                var isPDF = (isEmpty) ? false : fileType.split('/')[1].toLowerCase() == 'pdf';
                if (!isImage && !isPDF)
                    return 'ניתן להעלות קובץ תמונה או PDF בלבד';
                return '';
            }

            var errorMsg = ValidateAttachment();
            if (errorMsg.length > 0) {
                ApplyErrorMessage(errorMsg, dropZone, file);
                return false;
            }

            return true;
        }

        $scope.dropzoneConfig = {
            'options': { // passed into the Dropzone constructor
                'paramName': 'files',
                'maxFiles': 1,
                'url': uploadFolderUrl,
                'autoProcessQueue': true,
                'dictDefaultMessage': dropZoneTitle,
                'dictRemoveFile': 'הסרת טופס',
                'dictCancelUploadConfirmation': 'ביטול העלאת קובץ',
                'addRemoveLinks': true
            },
            'eventHandlers': {
                'success': function (file, response) {
                    $scope.fileUploadError = '';
                    $scope.fileUploaded = false;
                    var _this = this;
                    if (HandleFileUpload(_this, file)) {
                        var contentPath = uploadFolderUrl + '/' + file.name;
                        var requestParams = {
                            Category: $scope.match.CHAMPIONSHIP_CATEGORY_ID,
                            Match: $scope.match.match_number,
                            Path: contentPath
                        };
                        $http.post('/api/common/match-forms', requestParams).then(function() {
                            $scope.match.UploadedFileUrl = contentPath;
                            $scope.fileUploaded = true;
                            window['match_uploaded_file'] = contentPath;
                        }, function(err) {
                            ApplyErrorMessage('שגיאה בעת העלאת קובץ נא לנסות שוב מאוחר יותר', _this, file);
                        });

                    }
                },
                'maxfilesexceeded': function(file){
                    var _this = this;
                    window.setTimeout(function() {
                        _this.removeFile(file);
                    }, 200);
                },
                'removedfile': function(file) {
                    console.log('file removed: ' + file.name);
                    window['match_uploaded_file'] = 'NULL';
                }
            }
        };

        function ResetScores() {
            if (championshipsUtils.HasPendingScore(match)) {
                $scope.match.NewScore_A = $scope.match.OVERRIDEN_TEAM_A_SCORE;
                $scope.match.NewScore_B = $scope.match.OVERRIDEN_TEAM_B_SCORE;
            } else {
                $scope.match.NewScore_A = $scope.match.TEAM_A_SCORE;
                $scope.match.NewScore_B = $scope.match.TEAM_B_SCORE;
            }
        }

        ResetScores();

        $scope.getPartScoreStyle = function(partScore) {
            return partScore.FirstExtension ? 'margin-bottom: 10px;' : '';
        };

        $scope.getFileUploadIconStyle = function() {
            var style = 'font-size: 70px; margin-top: 20px;';
            if ($scope.fileUploaded) {
                style += ' color: green; margin-top: -10px;'
            }
            return style;
        };

        $scope.isConfirmDisabled = function() {
            if ($scope.match.OverridenPartScore != null) {
                var matchingItem = $scope.match.OverridenPartScore.findItem(function(partScore) {
                    return partScore.OriginalScoreA != partScore.ScoreA || partScore.OriginalScoreB != partScore.ScoreB;
                });
                if (matchingItem != null)
                    return false;
            }

            if ($scope.match.OriginalResult == $scope.match.RESULT) {
                if ($scope.match.NewScore_A == null || $scope.match.NewScore_A == '')
                    return true;

                if ($scope.match.NewScore_B == null || $scope.match.NewScore_B == '')
                    return true;

                if ($scope.match.NewScore_A == $scope.match.TEAM_A_SCORE && $scope.match.NewScore_B == $scope.match.TEAM_B_SCORE)
                    return true;
            }

            return false;
        };

        $scope.TechnicalWinChanged = function(teamLetter) {
            if ($scope.match['TechnicalWin_' + teamLetter]) {
                var otherTeamLetter = teamLetter == 'A' ? 'B' : 'A';
                $scope.match['TechnicalWin_' + otherTeamLetter] = false;
                if (technicalRule != null && technicalRule.Winner != null) {
                    $scope.match['NewScore_' + teamLetter] = technicalRule.Winner;
                    $scope.match['NewScore_' + otherTeamLetter] = technicalRule.Loser;
                }
            } else {
                ResetScores();
            }
            if ($scope.match.TechnicalWin_A)
                $scope.match.RESULT = 3;
            else if ($scope.match.TechnicalWin_B)
                $scope.match.RESULT = 4;
            else
                $scope.match.RESULT = null;
        };

        $scope.deleteMatchForm = function() {
            var msg = 'האם למחוק את טופס המשחק?';
            messageBox.ask(msg).then(function () {
                var url = '/api/common/match-forms?category=' + $scope.match.CHAMPIONSHIP_CATEGORY_ID + '&match=' + $scope.match.match_number;
                $http.delete(url).then(function(resp) {
                    $scope.match.UploadedFileUrl = null;
                    window['match_uploaded_file'] = 'NULL'
                }, function(err) {
                    alert('שגיאה בעת מחיקת טופס משחק מהמערכת, נא לנסות שוב מאוחר יותר');
                    console.log('error deleting match form');
                    console.log(err);
                });
            });
        };

        $scope.clearPartsData = function() {
            if ($scope.match.OverridenPartScore) {
                $scope.match.OverridenPartScore.forEach(function (partScore) {
                    partScore.ScoreA = null;
                    partScore.ScoreB = null;
                });
            }
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.confirm = function () {
            $scope.match.OVERRIDEN_TEAM_A_SCORE = $scope.match.NewScore_A;
            $scope.match.OVERRIDEN_TEAM_B_SCORE = $scope.match.NewScore_B;
            $scope.match.OVERRIDEN_PARTS_RESULT = championshipsUtils.CreatePartsResult($scope.match.OverridenPartScore);
            $uibModalInstance.close($scope.match);
        };
    }
})();