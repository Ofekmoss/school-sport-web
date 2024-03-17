var registerUtils = {
    _playerPlaceholdersTimer: 0,
    _playerFilesTimer: 0,
    _teamPanelsTimer: 0,
    sharedClubData: {
        authorizationLevels: [
            { Id: 1, Caption: 'מורה' },
            { Id: 2, Caption: 'מדריך/ה' },
            { Id: 3, Caption: 'מאמן/ת' }
        ],
        yesNoOptions: [
            { Id: 1, Caption: 'כן' },
            { Id: 2, Caption: 'לא' }
        ]
    },
    registerTeams: function($http, user, championshipCategory, amount, successCallback, errorCallback) {
        function RegisterError(err) {
            console.log('error while registering new team');
            console.log(err);
            alert('כשלון בעת  שמירת נתונים, נא לנסות שוב מאוחר יותר');
            if (errorCallback != null)
                errorCallback();
        }

        function RegisterSingleTeam(requestParameters, index) {
            if (index >= amount) {
                if (successCallback != null)
                    successCallback();
                return;
            }
            $http.post('/api/sportsman/team', requestParameters).then(function(resp) {
                RegisterSingleTeam(requestParameters, index + 1);
            }, RegisterError);
        }

        //sanity check
        if (amount > 2)
            amount = 2;
        var userId = user.Seq || user.seq;
        var schoolSymbol = user.SchoolSymbol || user.schoolSymbol;
        var championshipId = championshipCategory.ChampionshipId;
        var categoryId = championshipCategory.CategoryId;
        var requestParameters = {
            User: userId,
            School: schoolSymbol,
            Championship: championshipId,
            Category: categoryId
        };
        RegisterSingleTeam(requestParameters, 0);
    },
    getSchoolDetails: function($http, schoolSymbol) {
        return $http.get('/api/sportsman/school/' + schoolSymbol + '/details');
    },
    buildSchoolName: function($http, schoolSymbol) {
        return registerUtils.getSchoolDetails($http, schoolSymbol).then(function(resp) {
            var schoolName = resp.data.SCHOOL_NAME;
            var cityName = resp.data.CITY_NAME;
            if (cityName && cityName.length > 0 && schoolName.indexOf(cityName) < 0) {
                schoolName += ' ' + cityName;
            }
            return schoolName;
        });
    },
    SplitPlayersByStatus: function(rawPlayers) {
        var splittedPlayers = {
            length: rawPlayers.length,
            RegisteredPlayers: [],
            ConfirmedPlayers: [],
            UnConfirmedPlayers: []
        };
        for (var i = 0; i < rawPlayers.length; i++) {
            var curPlayer = rawPlayers[i];
            switch (curPlayer.STATUS) {
                case 1:
                    splittedPlayers.RegisteredPlayers.push(curPlayer);
                    break;
                case 2:
                    splittedPlayers.ConfirmedPlayers.push(curPlayer);
                    break;
                case 3:
                    splittedPlayers.UnConfirmedPlayers.push(curPlayer);
                    break;
            }
        }
        return splittedPlayers;
    },
    HebrewCount: function(amount, isMale, singleTitle, pluralTitle) {
        if (amount < 1)
            return 'אין ' + pluralTitle;
        if (amount == 1) {
            var hebSingle = isMale ? 'אחד' : 'אחת';
            return singleTitle + ' ' + hebSingle;
        }
        return amount + ' ' + pluralTitle;
    },
    ParsePlayerStatus: function(playerStatus) {
        switch (playerStatus) {
            case 1:
                return 'רשום';
            case 2:
                return 'מאושר';
            case 3:
                return 'לא מאושר';
        }
        return 'לא ידוע';
    },
    PlayerStatusStyle: function(playerStatus) {
        var bgColor = '';
        switch (playerStatus) {
            case 1:
                bgColor = '#d9edf7';
                break;
            case 2:
                bgColor = '#dff0d8';
                break;
            case 3:
                bgColor = '#f2dede';
                break;
        }
        var style = 'color: #3b5998;';
        if (bgColor.length > 0)
            style += 'background-color: ' + bgColor;
        return style;
    },
    PlayerStatusTitle: function(player) {
        if (player.STATUS == 3)
            return player.RejectReason || '';
        return '';
    },
    InitPlayerPlaceholdersTimer: function() {
        window.clearInterval(registerUtils._playerPlaceholdersTimer);
        registerUtils._playerPlaceholdersTimer = window.setInterval(function() {
            var playerPlaceholders = $(".player-placeholder");
            if (playerPlaceholders.length > 0) {
                playerPlaceholders.each(function() {
                    var playerPlaceholder = $(this);
                    var differentSchoolNotice = playerPlaceholder.find(".different-school-notice");
                    if (playerPlaceholder.width() < 680) {
                        playerPlaceholder.removeClass("player-placeholder-normal");
                        playerPlaceholder.addClass("player-placeholder-small-screen");
                        differentSchoolNotice.addClass("different-school-notice-small-screen");
                    } else {
                        playerPlaceholder.removeClass("player-placeholder-small-screen");
                        playerPlaceholder.addClass("player-placeholder-normal");
                        differentSchoolNotice.removeClass("different-school-notice-small-screen");
                    }
                });
            }
        }, 500);
    },
    InitTeamPanelsTimer: function() {
        window.clearInterval(registerUtils._teamPanelsTimer);
        registerUtils._teamPanelsTimer = window.setInterval(function() {
            var teamPanels = $(".team-panel");
            if (teamPanels.length > 0) {
                teamPanels.each(function() {
                    var teamPanel = $(this);
                    var caption = teamPanel.find("h3").first();
                    if (teamPanel.width() < 360) {
                        teamPanel.addClass("team-panel-small-screen");
                        caption.css("width", "200px");
                    } else {
                        teamPanel.removeClass("team-panel-small-screen");
                        caption.css("width", "inherit");
                    }
                });
            }
        }, 500);
    },
    InitPlayerFilesTimer: function() {
        function LoadFiles(dropZoneMessagePanel) {
            var dropZoneParent = dropZoneMessagePanel.parents(".dropzone").first();
            if (dropZoneParent.length == 1) {
                var playerId = dropZoneParent.data("player-id");
                var fileType = dropZoneParent.data("file-type");
                var defaultIconSpan = dropZoneMessagePanel.find(".fa").first();
                var picturePreview = dropZoneMessagePanel.find(".picture-preview");
                var pdfPreview = dropZoneMessagePanel.find(".file-pdf");
                if (playerId && fileType) {
                    var url = "/content/PlayerFile?type=" + fileType + "&id=" + playerId;
                    var ajax = $.get(url, function() {
                        var filePanel = dropZoneMessagePanel.parents(".player-file").first();
                        var contentType = ajax.getResponseHeader("content-Type");
                        var hasFile = false;
                        var isPDF = "0";
                        if (contentType) {
                            if (contentType.indexOf("image/") == 0) {
                                picturePreview.attr("src", url);
                                picturePreview.show();
                                hasFile = true;
                            } else if (contentType.indexOf("/pdf") > 0) {
                                if (pdfPreview.length == 1) {
                                    pdfPreview.show();
                                    hasFile = true;
                                    isPDF = "1";
                                }
                            }
                        }
                        if (hasFile) {
                            defaultIconSpan.hide();
                            filePanel.data("has-file", "1");
                        } else {
                            defaultIconSpan.show();
                            filePanel.data("has-file", "0");
                        }
                        filePanel.data("is-pdf", isPDF);
                    });
                }
            }
        }
        window.clearInterval(registerUtils._playerFilesTimer);
        registerUtils._playerFilesTimer = window.setInterval(function() {
            var dropZoneMessagePanels = $(".dz-message");
            if (dropZoneMessagePanels.length > 0) {
                dropZoneMessagePanels.each(function() {
                    var dropZoneMessagePanel = $(this);
                    if (dropZoneMessagePanel.data("handled") != "1") {
                        var containerId = dropZoneMessagePanel.parents(".player-file").first().data("file-container");
                        if (containerId && containerId.length > 0) {
                            var oContainer = $("#" + containerId);
                            dropZoneMessagePanel.html(oContainer.html());
                            LoadFiles(dropZoneMessagePanel);
                        }
                        dropZoneMessagePanel.data("handled", "1");
                    }
                });
            }

            var playerFiles = $(".player-file");
            if (playerFiles.length > 0 && window['_AllDropZones_']) {
                playerFiles.each(function() {
                    var playerFile = $(this);
                    var dzElement = playerFile.find(".dropzone");
                    var playerId = dzElement.data("player-id");
                    var fileType = dzElement.data('file-type');
                    if (playerId && fileType) {
                        var hasFile = playerFile.data("has-file") == "1";
                        var key = playerId + '_' + fileType;
                        var dropzone = window['_AllDropZones_'][key];
                        if (dropzone)
                            $(dropzone.hiddenFileInput).prop('disabled', hasFile);
                    }
                });
            }
        }, 200);
    }
};

