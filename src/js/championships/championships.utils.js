var championshipsUtils = {
    _dummyLoginTimer: 0,
    _phaseVisibilityTimer: 0,
    _teamNamesHeightTimer: 0,
    convertSportFlowersChampionships: function(sportFlowersEvents, $filter) {
        var sportFlowersChampionships = [];
        for (var i = 0; i < sportFlowersEvents.length; i++) {
            var curSportFlowerEvent = sportFlowersEvents[i];
            var sportFlowerChamp = {
                CHAMPIONSHIP_CATEGORY_ID: curSportFlowerEvent.Seq,
                CATEGORY_NAME: curSportFlowerEvent.FacilityName || $filter('date')(curSportFlowerEvent.DateTime, 'dd/MM'),
                CHAMPIONSHIP_ID: curSportFlowerEvent.EventSeq,
                CHAMPIONSHIP_NAME: curSportFlowerEvent.EventName,
                SPORT_ID: sportGlobalSettings.FlowersFieldSeq,
                IS_CLUBS: 0,
                SPORT_NAME: 'פרחי ספורט',
                TotalTeams: 1
            };
            sportFlowersChampionships.push(sportFlowerChamp);
        }
        return sportFlowersChampionships;
    },
    ConvertPartsResult: function(rawValue) {
        var partsData = null;
        if (rawValue != null && rawValue && rawValue.length > 0) {
            var parts = [];
            rawValue.split('|').forEach(function(rawPart) {
                if (rawPart.length > 0) {
                    var points = rawPart.split('-');
                    if (points.length == 2) {
                        var teamA_score = parseInt(points[0]);
                        var teamB_score = parseInt(points[1]);
                        if (!isNaN(teamA_score) && teamA_score >= 0 && !isNaN(teamB_score) && teamB_score >= 0) {
                            parts.push({
                                TeamA: teamA_score,
                                TeamB: teamB_score
                            });
                        }
                    }
                }
            });
            if (parts.length > 0) {
                partsData = {
                    TeamA: parts.map(function(x) { return x.TeamA; }),
                    TeamB: parts.map(function(x) { return x.TeamB; })
                };
            }
        }
        return partsData;
    },
    CreatePartsResult: function(partScore) {
        var partsResult = null;
        if (partScore != null && partScore.length > 0) {
            partsResult = partScore.map(function (x) {
                if (x.ScoreA != null && x.ScoreB != null) {
                    return [x.ScoreA, x.ScoreB].join('-');
                } else {
                    return '';
                }
            }).filter(function (x) {
                return x.length > 0;
            }).join('|');
        }
        return partsResult;
    },
    HasPendingScore: function(match) {
        return match.OVERRIDEN_TEAM_A_SCORE != null && match.OVERRIDEN_TEAM_B_SCORE != null && match.OverridenScoreApproved != 1;
    },
    HasPendingPartScore: function(match) {
        return match.OVERRIDEN_PARTS_RESULT != null && match.OverridenScoreApproved != 1;
    },
    actualTeamsFilter: function(team) {
        var teamName = team.Name;
        return teamName.indexOf('מנצחת משחק') < 0 &&
            teamName.indexOf('מפסידת משחק') < 0 &&
            teamName.indexOf(' מיקום ') < 0;
    },
    ExtractTreeMatches: function(finalsTree) {
        function AddSingleMatch(teamA, teamB, treeMatches) {
            if (teamA && teamB) {
                treeMatches.push({
                    TeamA_Id: teamA.TEAM_ID,
                    TeamB_Id: teamB.TEAM_ID,
                    PhaseIndex: teamA.PHASE
                });
                return true;
            }
            return false;
        }
        var treeMatches = [];
        for (var phase in finalsTree) {
            var curTreePhase = finalsTree[phase];
            if (!AddSingleMatch(curTreePhase.TeamA, curTreePhase.TeamB, treeMatches)) {
                for (var group in curTreePhase) {
                    var currentGroup = curTreePhase[group];
                    AddSingleMatch(currentGroup.TeamA, currentGroup.TeamB, treeMatches)
                }
            }
        }
        return treeMatches;
    },
    ApplyFinalsTree: function(finalsTree, phases, matches) {
        if (!finalsTree || !phases || phases.length == 0 || !matches || matches.length == 0)
            return;

        var matchMapping = matches.SplitByProperty('Phase');
        var allTreeMatches = championshipsUtils.ExtractTreeMatches(finalsTree);
        var treeMatchesMapping = {};
        allTreeMatches.forEach(function(match) {
            var key = [match.PhaseIndex, match.TeamA_Id, match.TeamB_Id].join('_');
            treeMatchesMapping[key] = true;
        });
        var qs = sportUtils.ParseQueryString();
        if (qs['English'] != '1' && qs['english'] != '1') {
            phases.forEach(function (phase) {
                if (phase.Index >= 0) {
                    var phaseMatches = matchMapping[phase.Index.toString()];
                    var matchesInTree = phaseMatches.filter(function (x) {
                        var key = [x.Phase, x.TeamA_Id, x.TeamB_Id].join('_');
                        var key2 = [x.Phase, x.TeamB_Id, x.TeamA_Id].join('_');
                        return treeMatchesMapping[key] || treeMatchesMapping[key2];
                    });
                    if (matchesInTree.length > 0) {
                        if (matchesInTree.length == phaseMatches.length) {
                            phase.Hidden = true;
                        } else {
                            phase.Name = 'משחקי מבחן';
                        }
                    }
                }
            });
        }
    },
    ExtractDistinctMatches: function(matches, uniqueFields) {
        if (typeof uniqueFields == 'undefined' || uniqueFields == null || uniqueFields.length == 0)
            uniqueFields = ['CHAMPIONSHIP_CATEGORY_ID', 'PHASE', 'NGROUP', 'ROUND', 'MATCH', 'CYCLE'];
        var distinctMatches = [];
        var mapping = {};
        matches.forEach(function(curMatch) {
            var key = uniqueFields.map(function(fieldName) { return curMatch[fieldName]; }).join('_');
            if (!mapping[key]) {
                distinctMatches.push(sportUtils.shallowCopy(curMatch));
                mapping[key] = true;
            }
        });
        return distinctMatches;
    },
    BindDummyLogin: function() {
        sportUtils.AttachAutoClick();
        $('#txtDummyUserName').bind('change', function() {
            $('#username').val($(this).val());
            $('#username').trigger('change');
        });
        $('#txtDummyPassword').bind('change', function() {
            $('#password').val($(this).val());
            $('#password').trigger('change');
        });
        $('#btnDummyLogin').bind('click', function() {
            $('#btnLogin').trigger('click');
        });
        if (championshipsUtils._dummyLoginTimer)
            window.clearInterval(championshipsUtils._dummyLoginTimer);
        var dummyErrorPanel = $('#pnlLoginError');
        championshipsUtils._dummyLoginTimer = window.setInterval(function() {
            var errorContents = $.trim($('#loginErrorPanel').text());
            dummyErrorPanel.text(errorContents);
            if (errorContents.length > 0) {
                dummyErrorPanel.show();
            } else {
                dummyErrorPanel.hide();
            }
        }, 100);
        //
    },
    InitPhaseVisibility: function() {
        if (championshipsUtils._phaseVisibilityTimer)
            window.clearInterval(championshipsUtils._phaseVisibilityTimer);
        championshipsUtils._phaseVisibilityTimer = window.setInterval(function() {
            var phaseIndex = window['toggle-phase-visibility'];
            if (phaseIndex != null) {
                window['toggle-phase-visibility'] = null;
                var element = $('.phase-contents[data-phase-index="' + phaseIndex + '"]');
                if (element.length == 1) {
                    var isCurrentlyVisible = element.is(":visible");
                    if (isCurrentlyVisible) {
                        element.hide("slow");
                    } else {
                        element.show("slow");
                    }
                }
            }
        }, 100);
    },
    InitTeamNamesHeightTimer: function() {
        if (championshipsUtils._teamNamesHeightTimer)
            window.clearInterval(championshipsUtils._teamNamesHeightTimer);
        championshipsUtils._teamNamesHeightTimer = window.setInterval(function() {
            var matchRows = $(".match-row");
            if (matchRows.length > 0) {
                matchRows.each(function() {
                    var matchRow = $(this);
                    var teamNames = matchRow.find(".team_name");
                    if (teamNames.length == 2) {
                        var teamB_Element = teamNames.eq(0);
                        var teamA_Element = teamNames.eq(1);
                        var teamB_Height = teamB_Element.height();
                        var teamA_Height = teamA_Element.height();
                        if (teamB_Height != teamA_Height) {
                            var maxHeight = Math.max(teamB_Height, teamA_Height);
                            var otherTeam = (maxHeight == teamB_Height) ? teamA_Element : teamB_Element;
                            otherTeam.css("height", maxHeight + "px");
                        }
                    }
                });
            }
        }, 200);
    }
};

