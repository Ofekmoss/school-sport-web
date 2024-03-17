define(["templates/competitions", "services/competitions", "utils"], function (templates, Competitions, utils) {
    function getError(comp) {
        var errMsg = '';
        if (comp.teamA === -1 || comp.teamB === -1) {
            errMsg = 'יש לבחור קבוצות';
        } else {
            if (comp.teamA == comp.teamB) {
                errMsg = 'לא ניתן לבחור אותה קבוצה';
            }
        }
        if (errMsg.length === 0 && comp.date) {
            if (comp.matchTime.hour != null || comp.matchTime.minute != null) {
                var hour = parseInt(comp.matchTime.hour, 10);
                var minute = parseInt(comp.matchTime.minute, 10);
                if (isNaN(hour) || isNaN(minute) || hour < 0 || minute < 0 ||
                    hour > 23 || minute > 59) {
                    errMsg = 'זמן שגוי. ניתן גם להשאיר ריק';
                }
            }
        }
        return errMsg;
    }

    function loadRegions(comp, callback) {
        if (typeof callback === 'undefined')
            callback = new Function();
        Vue.http.get('/api/v2/regions').then(function (resp) {
            comp.regions = [];
            for (var i = 0; i < resp.body.length; i++) {
                comp.regions.push(resp.body[i]);
            }
            callback();
        });
    }

    function loadFacilities(comp, callback) {
        if (typeof callback === 'undefined' || callback == null)
            callback = new Function();
        var region = comp.facilityRegion;
        comp.facilities = [];
        comp.facility = -1;
        if (region >= 0) {
            var url = '/api/v2/facilities?region=' + region;
            Vue.http.get(url).then(function (resp) {
                comp.facilities = [];
                comp.facilities.push({
                    id: -1,
                    name: 'מתקן...'
                });
                for (var i = 0; i < resp.body.length; i++) {
                    comp.facilities.push(resp.body[i]);
                }
                callback();
            });
        } else {
            callback();
        }
    }

    function loadFacilityDetails(comp, callback) {
        if (comp.facility > 0) {
            var url = '/api/v2/facilities?id=' + comp.facility;
            Vue.http.get(url).then(function (resp) {
                var region = resp.body.region;
                var facilityId = resp.body.id;
                if (region != null && facilityId != null) {
                    comp.facilityRegion = region;
                    loadFacilities(comp, function() {
                        comp.facility = facilityId;
                        comp.expandableObjects['facility'] = true;
                    });
                }
                if (callback) {
                    callback();
                }
            });
        } else {
            if (callback) {
                callback();
            }
        }
    }

    function loadFunctionaries(comp, callback) {
        if (typeof callback === 'undefined')
            callback = new Function();
        if (comp.functionaryData != null && comp.functionaryData.length > 0) {
            var types = comp.functionaryData.map(function(f) {
                return f.type;
            }).join(',');
            var url = '/api/v2/functionaries?types=' + types;
            Vue.http.get(url).then(function (resp) {
                var functionaryMapping = {};
                for (var i = 0; i < resp.body.length; i++) {
                    var curFunc = resp.body[i];
                    var key = curFunc.type.toString();
                    if (!functionaryMapping[key])
                        functionaryMapping[key] = [];
                    functionaryMapping[key].push(curFunc);
                }
                var regionMapping = {};
                comp.regions.forEach(function(region) {
                    regionMapping[region.id.toString()] = region.name;
                });
                comp.functionaryTypes = [];
                comp.functionaryData.forEach(function(fData) {
                    var functionaries = functionaryMapping[fData.type.toString()] || [];
                    var regions = [];
                    var funcTypeRegion = -1;
                    functionaries.sort(function(f1, f2) {
                        return f1.name.localeCompare(f2.name);
                    });
                    functionaries.forEach(function(functionary) {
                        var matchingRegion = functionary.region != null ? regionMapping[functionary.region.toString()] : null;
                        if (matchingRegion != null) {
                            var functionaryRegion = regions.find(function(region) {
                                return region.id == functionary.region;
                            });
                            if (functionaryRegion == null) {
                                functionaryRegion = {
                                    id: functionary.region,
                                    name: matchingRegion,
                                    functionaries: [{
                                        id: -1,
                                        name: fData.caption + '...'
                                    }]
                                };
                                regions.push(functionaryRegion);
                            }
                            functionaryRegion.functionaries.push(functionary);
                            if (fData.functionary != null && fData.functionary == functionary.id) {
                                funcTypeRegion = functionary.region;
                            }
                        }
                    });
                    functionaries.splice(0, 0, {
                        id: -1,
                        name: fData.caption + '...'
                    });
                    regions.sort(function(r1, r2) {
                        return r1.name.localeCompare(r2.name);
                    });
                    regions.splice(0, 0, {
                        id: -1,
                        name: 'כל המחוזות',
                        functionaries: []
                    });
                    var functionaryType = {
                        type: fData.type,
                        caption: fData.caption,
                        functionaries: functionaries,
                        regions: regions,
                        region: funcTypeRegion,
                        functionary: fData.functionary || -1
                    };
                    comp.functionaryTypes.push(functionaryType);
                });
                callback();
            });
        } else {
            callback();
        }
    }

    function ensureMinutePadding(comp) {
        if (comp.matchTime.minute != null) {
            var minute = parseInt(comp.matchTime.minute, 10);
            if (!isNaN(minute) && minute >= 0 && minute < 10)
                comp.matchTime.minute = '0' + minute;
        }
    }

    function extractScores(setArray) {
        var scores = null;
        var validValuesCount = 0;
        if (setArray != null) {
            scores = [];
            setArray.forEach(function(set) {
                var score = set.score;
                if (score != null) {
                    var intValue = parseInt(score, 10);
                    if (!isNaN(intValue) && intValue >= 0 && intValue < 100) {
                        score = intValue;
                        validValuesCount++;
                    } else {
                        score = null;
                    }
                }
                scores.push(score);
            });
        }
        if (validValuesCount === 0)
            scores = null;
        return scores;
    }

    function extractMatchTime(comp) {
        if (comp.date) {
            if (comp.matchTime.hour != null && comp.matchTime.minute != null) {
                var hour = parseInt(comp.matchTime.hour, 10);
                var minute = parseInt(comp.matchTime.minute, 10);
                if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && minute >= 0 &&
                    hour < 24 && minute < 60) {
                    comp.date.setHours(hour);
                    comp.date.setMinutes(minute);
                    return Competitions.time(comp.date);
                }
            } else {
                return Competitions.time(comp.date.getFullYear(), comp.date.getMonth() + 1, comp.date.getDate());
            }
        }
        return null;
    }

    function extractMatchResult(comp) {
        var technicalWin = comp.technicalWinA || comp.technicalWinB;
        if (technicalWin || (comp.resultA != null && comp.resultB != null)) {
            var resultA = null;
            var resultB = null;
            if (!technicalWin) {
                resultA = parseInt(comp.resultA, 10);
                resultB = parseInt(comp.resultB, 10);
            }
            return {
                scoreA: resultA,
                scoreB: resultB,
                technicalWinA: comp.technicalWinA,
                technicalWinB: comp.technicalWinB,
                setsA: extractScores(comp.setsA),
                setsB: extractScores(comp.setsB)
            };
        } else {
            return null;
        }
    }

    function extractFunctionaryData(comp) {
        var functionaryData = comp.functionaryTypes.map(function(functionaryType) {
            var functionary = functionaryType.functionary > 0 ? functionaryType.functionary : null;
            return {
                type: functionaryType.type,
                functionary: functionary
            };
        }).filter(function(fData) {
            return fData.functionary != null;
        });
        return functionaryData.length > 0 ? functionaryData : null;
    }

    function switchValues(comp, prop1, prop2) {
        var tmp = comp[prop1];
        comp[prop1] = comp[prop2];
        comp[prop2] = tmp;
    }

    function buildSetArrays(comp, mount) {
        if (typeof mount === 'undefined')
            mount = false;
        if (comp.setCount > 0) {
            if (mount && comp.setsA != null && comp.setsB != null && comp.setsA.length === comp.setsB.length) {
                //populate
                for (var i = 0; i < comp.setsA.length; i++) {
                    comp.setsA[i] = {score: comp.setsA[i]};
                    comp.setsB[i] = {score: comp.setsB[i]};
                }

                //show panel
                comp.expandableObjects['sets'] = true;
            } else {
                //build set score arrays
                comp.setsA = [];
                comp.setsB = [];
                for (var i = 1; i <= comp.setCount; i++) {
                    comp.setsA.push({score: null});
                    comp.setsB.push({score: null});
                }

                //hide sets if expanded
                comp.expandableObjects['sets'] = false;
            }
        }
    }

    function revalidate(comp) {
        comp.error = getError(comp);
    }

    var MatchDetailsDialogComponent = Vue.extend({
        template: templates["match-details"],
        data: function() {
            return  {
                teams: [],
                teamA: null,
                teamB: null,
                groupName: '',
                error: '',
                date: null,
                matchTime: {
                    hour: null,
                    minute: null
                },
                edit: null,
                expandableObjects: {
                    facility: false,
                    result: false,
                    sets: false,
                    functionaries: false
                },
                regions: [],
                facilityRegions: [],
                facilityRegion: -1,
                facilities: [],
                facility: -1,
                resultA: null,
                resultB: null,
                technicalWinA: false,
                technicalWinB: false,
                originalResultA: null,
                originalResultB: null,
                originalExpandSets: false,
                setCount: 0,
                setsA: null,
                setsB: null,
                functionaryData: null,
                functionaryTypes: []
            };
        },
        watch: {
            /* expandableObjects: {
                deep: true,
                handler: function() {
                    console.log('changed');
                }
            } */
        },
        methods: {
            getTeamName: function(teamId) {
                return "??";
                var comp = this;
                if (teamId != null) {
                    var matchingTeam = comp.teams[teamId];
                    if (matchingTeam != null) {
                        return matchingTeam.name;
                    }
                }
                return null;
            },
            teamChanged: function() {
                var comp = this;
                revalidate(comp);
            },
            resultChanged: function() {
                var comp = this;
                if (comp.resultA === '')
                    comp.resultA = null;
                if (comp.resultB === '')
                    comp.resultB = null;
                if (comp.resultA == null && comp.resultB == null) {
                    //hide sets when there is no result
                    comp.expandableObjects['sets'] = false;
                }
                revalidate(comp);
            },
            dateChanged: function(newDate) {
                var comp = this;
                comp.date = newDate;
            },
            timeChanged: function() {
                var comp = this;
                if (comp.matchTime.hour != null && (comp.matchTime.minute == null || comp.matchTime.minute == '')) {
                    comp.matchTime.minute = '0';
                }
                ensureMinutePadding(comp);
                revalidate(comp);
            },
            facilityRegionChanged: function() {
                var comp = this;
                loadFacilities(comp, null);
            },
            technicalWinChanged: function(teamLetter) {
                var comp = this;
                var otherTeamLetter = teamLetter === 'A' ? 'B' : 'A';
                var pName = 'technicalWin' + teamLetter;
                var otherPropName = 'technicalWin' + otherTeamLetter;
                if (comp[pName]) {
                    //toggle off the other
                    if (comp[otherPropName])
                        comp[otherPropName] = false;
                    if (comp.originalResultA == null && comp.originalResultB == null) {
                        //store original result
                        comp.originalResultA = comp.resultA;
                        comp.originalResultB = comp.resultB;
                        comp.originalExpandSets = comp.expandableObjects['sets'];
                        comp.resultA = null;
                        comp.resultB = null;
                        comp.expandableObjects['sets'] = false;
                    }
                }
                if (!comp[pName] && !comp[otherPropName]) {
                    //restore original result
                    comp.resultA = comp.originalResultA;
                    comp.resultB = comp.originalResultB;
                    comp.expandableObjects['sets'] = comp.originalExpandSets;
                    comp.originalResultA = null;
                    comp.originalResultB = null;
                    comp.originalExpandSets = false;
                }
            },
            setScoreChanged: function(index, teamLetter) {
                var comp = this;
                var otherTeamLetter = teamLetter === 'A' ? 'B' : 'A';
                var pName = 'sets' + teamLetter;
                var otherPropName = 'sets' + otherTeamLetter;
                var rawScore = comp[pName][index].score;
                var intScore = parseInt(rawScore, 10);
                if (isNaN(intScore) || intScore < 0 || intScore > 99) {
                    comp[pName][index].score = null;
                } else {
                    comp[pName][index].score = intScore.toString();
                    if (comp[otherPropName][index].score == null)
                        comp[otherPropName][index].score = 0;
                }
            },
            clearDate: function () {
                var comp = this;
                $(".vdp-datepicker").find('input[type="text"]').val('');
                comp.date = null;
            },
            clearTime: function () {
                var comp = this;
                comp.matchTime.hour = null;
                comp.matchTime.minute = null;
            },
            switchTeams: function() {
                var comp = this;
                switchValues(comp, 'teamA', 'teamB');
                switchValues(comp, 'resultA', 'resultB');
                if (comp.technicalWinA || comp.technicalWinB) {
                    switchValues(comp, 'technicalWinA', 'technicalWinB');
                    comp.technicalWinChanged('A');
                    comp.technicalWinChanged('B');
                }
                switchValues(comp, 'originalResultA', 'originalResultB');
                switchValues(comp, 'setsA', 'setsB');
            },
            resetScore: function() {
                var comp = this;
                comp.resultA = null;
                comp.resultB = null;
                comp.technicalWinA = false;
                comp.technicalWinB = false;
                comp.originalResultA = null;
                comp.originalResultB = null;
                comp.originalExpandSets = false;
                buildSetArrays(comp);
            },
            resetFacility: function() {
                var comp = this;
                comp.facility = -1;
                comp.facilityRegion = -1;
            },
            resetFunctionaries: function() {
                var comp = this;
                comp.functionaryTypes.forEach(function(functionaryType) {
                    functionaryType.functionary = -1;
                    functionaryType.region = -1;
                });
                comp.$forceUpdate();
            },
            toggleExpanded: function(objectOrName) {
                var comp = this;
                if (typeof objectOrName === 'string') {
                    var objectName = objectOrName;
                    comp.expandableObjects[objectName] = !comp.expandableObjects[objectName];
                } else if (objectOrName != null) {
                    objectOrName.expanded = !objectOrName.expanded;
                }
            },
            isExpanded: function(objectName) {
                return this.expandableObjects[objectName] === true;
            },
            addSet: function() {
                var comp = this;
                comp.setsA.push({ score: null });
                comp.setsB.push({ score: null });
            },
            removeSet: function(index) {
                var comp = this;
                if (index >= comp.setCount) {
                    comp.setsA.splice(index, 1);
                    comp.setsB.splice(index, 1);
                }
            },
            isOverTime: function(   index) {
                var comp = this;
                return index >= comp.setCount;
            },
            confirm: function () {
                var comp = this;
                var err = getError(comp);
                if (err.length > 0) {
                    comp.error = err;
                    return;
                }
                var time = extractMatchTime(comp);
                var matchResult = extractMatchResult(comp);
                if (matchResult != null &&
                    (!utils.verifyIntRange(matchResult.scoreA, 0, 1000) ||
                    !utils.verifyIntRange(matchResult.scoreB, 0, 1000))) {
                    comp.error = 'תוצאה שגויה';
                    return;
                }
                var functionaryData = extractFunctionaryData(comp);
                var gameObject = {
                    teamA: comp.teamA,
                    teamB: comp.teamB,
                    time: time,
                    facility: comp.facility > 0 ? comp.facility : null,
                    result: matchResult,
                    functionaries: functionaryData
                };
                this.$emit("close", gameObject );
            },
            cancel: function () {
                this.$emit("close");
            }
        },
        mounted: function(){
            var comp = this;
            if (comp.teamA == null)
                comp.teamA = -1;
            if (comp.teamB == null)
                comp.teamB = -1;
            if (comp.date == null) {
                window.setTimeout(function() {
                    $(".vdp-datepicker input[type='text']").val('');
                }, 200);
            } else {
                var hours = comp.date.getHours();
                var minutes = comp.date.getMinutes();
                if (hours > 0 || minutes > 0) {
                    comp.matchTime.hour = hours;
                    comp.matchTime.minute = minutes;
                    ensureMinutePadding(comp);
                }
            }
            if (comp.technicalWinA == null)
                comp.technicalWinA = false;
            if (comp.technicalWinB == null)
                comp.technicalWinB = false;
            if (comp.technicalWinA === true && comp.technicalWinB === true) {
                //something is wrong
                comp.technicalWinA = false;
                comp.technicalWinB = false;
            }
            if (comp.technicalWinA === true)
                comp.technicalWinChanged('A');
            else if (comp.technicalWinB === true)
                comp.technicalWinChanged('B');
            if (comp.resultA != null || comp.resultB != null) {
                //got result, expand the panel
                comp.expandableObjects['result'] = true;
            }
            loadRegions(comp, function() {
                comp.facilityRegions = [{id: -1, name: 'מחוז...'}];
                for (var i = 0; i < comp.regions.length; i++) {
                    comp.facilityRegions.push({
                        id: comp.regions[i].id,
                        name: comp.regions[i].name,
                    });
                }
                if (comp.facility > 0) {
                    loadFacilityDetails(comp, function() {

                    });
                }
                loadFunctionaries(comp, function() {
                    comp.functionaryTypes.forEach(function(functionaryType) {
                        if (functionaryType.region < 0 && functionaryType.functionary > 0) {
                            //does not exist in region, reset
                            functionaryType.functionary = -1;
                        }
                        functionaryType.getFunctionaries = function() {
                            if (functionaryType.region < 0) {
                                return functionaryType.functionaries;
                            } else {
                                var matchingRegion = functionaryType.regions.find(function(r) {
                                    return r.id == functionaryType.region;
                                });
                                if (matchingRegion != null) {
                                    return matchingRegion.functionaries;
                                }
                            }
                            return [];
                        };
                        window.setInterval(function() {
                            if (functionaryType.region > 0) {
                                //reset if not in the selected region
                                var regionFunctionaries = functionaryType.getFunctionaries();
                                if (regionFunctionaries.find(function(f) {
                                    return f.id == functionaryType.functionary;
                                }) == null) {
                                    functionaryType.functionary = -1;
                                    comp.$forceUpdate();
                                }
                            }
                        }, 1000);
                    });
                });
            });
            buildSetArrays(comp, true);
            revalidate(comp);
        }
    });

    return MatchDetailsDialogComponent;
});