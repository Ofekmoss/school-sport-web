define(["templates/registration", "utils", "dialog", "consts"], function (templates, utils, Dialog, consts) {
    var states = {
        notLoaded: 1,
        new: 2,
        edit: 3,
        import: 4,
        loading: 5
    };

    var grades = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", "י\"א", "י\"ב"];

    function parseTeamGrades(rawName) {
        var words = rawName.split(' ');
        var matchingWord = words.find(function(word) {
            if (word.indexOf('-') > 0) {
                return true;
            } else {
                return grades.indexOf(word) >= 0;
            }
        });
        if (matchingWord) {
            if (matchingWord.indexOf('-') < 0)
                matchingWord += '-' + matchingWord;
            var wordParts = matchingWord.split('-');
            if (wordParts.length === 2) {
                var minGrade = grades.indexOf(wordParts[0]);
                var maxGrade = grades.indexOf(wordParts[1]);
                if (minGrade >= 0 && maxGrade >= minGrade) {
                    return {
                        min: minGrade,
                        max: maxGrade
                    };
                }
            }
        }
        return null;
    }

    var PlayerDialogComponent = Vue.extend({
        template: templates["player-dialog"],
        data: function() {
            return {
                maxTeamPlayers: consts.MaxTeamPlayers,
                idNumber: '',
                firstName: "",
                lastName: "",
                birthDate: '',
                birthDateText: '',
                grade: "",
                picture: "",
                idSlip: "",
                gender: null,
                medicalApproval: '',
                pictureLoaded: false,
                idSlipLoaded: false,
                medicalApprovalLoaded: false,
                isIdValid: false,
                state: states.notLoaded,
                states: states,
                external: false,
                differentCity: false,
                studentCityName: "",
                userCityName: "",
                needTransferRequest: false,
                clubs: false,
                team: "",
                status: null,
                existingTeamPlayers: [],
                availablePlayers: {
                    selected: [],
                    notSelected: []
                },
                search: "",
                searchButtonState: {
                    visible: false,
                    text: '',
                    validId: false,
                    invalidId: false
                },
                addingSinglePlayer: false,
                playerAlreadyInTeam: false,
                teamStatus: null,
                projectId: null,
                projectName: '',
                projectTeam: '',
                yearOfBirth: null,
                projectJoinDate: null,
                sportId: null,
                checkIfaService: false,
                playerAlreadyInIFA: false
            };
        },
        created: function () {
            this.files = {
                picture: null,
                idSlip: null,
                medicalApproval: null
            };
        },
        //http://127.0.0.1:5000/api/common//ifa-register-status?id=324073907    // false
        //http://127.0.0.1:5000/api/common//ifa-register-status?id=326745460    //true
        mounted: function() {
            var comp = this;
            //console.log(comp.existingTeamPlayers);
            //console.log(comp.sportId);
            if (comp.projectId == null) {
                var url = '/api/v2/schools/possiblePlayers?';
                url += (this.clubs) ? 'clubs=1' : 'league=1';
                Vue.http.get(url).then(function (resp) {
                    //console.log(resp.data);
                    var possiblePlayers = resp.data;
                    var gradeRange = parseTeamGrades(comp.team);
                    if (gradeRange != null) {
                        possiblePlayers = possiblePlayers.filter(function (possiblePlayer) {
                            return possiblePlayer.grade >= gradeRange.min && possiblePlayer.grade <= gradeRange.max;
                        });
                    }
                    comp.availablePlayers.notSelected = possiblePlayers;
                    comp.availablePlayers.selected = [];
                    if (comp.state != comp.states.edit && comp.availablePlayers.notSelected.length === 0) {
                        comp.addingSinglePlayer = true;
                    }
                    if (comp.sportId != null) {
                        Vue.http.get('/api/common/Sportsman').then(function (resp) {
                            comp.checkIfaService = resp.data.FootballSportFieldIds.indexOf(parseInt(comp.sportId, 10)) >= 0;
                        });
                    }
                }, function (err) {
                    console.log(err);
                });
            } else {
                if (comp.projectJoinDate == null) {
                    var now = new Date();
                    comp.projectJoinDate = utils.formatDate(now, 'YYYY-MM-DD');
                }
            }
            if (comp.idNumber != null && comp.idNumber != '') {
                comp.isIdValid = true;
                comp.state = states.edit;
            }
            if (comp.birthDate) {
                var birthDate = new Date(comp.birthDate);
                comp.birthDateText = birthDate.getDate() + '/' + (birthDate.getMonth() + 1) + '/' + birthDate.getFullYear();
            }
            if (comp.projectJoinDate != null && typeof comp.projectJoinDate !== 'string') {
                comp.projectJoinDate = utils.formatDate(comp.projectJoinDate, 'yyyy-MM-DD');
            }
        },
        watch: {
            search: function () {
                this.searchTermChanged();
            }
        },
        methods: {
            searchTermChanged: function() {
                function isPlayerHidden(comp, player, searchTerm) {
                    if (searchTerm.length === 0)
                        return false;
                    var searchWords = searchTerm.split(' ').filter(function(x) { return x.length > 0; });
                    var matchingWordsCount = 0;
                    var possibleValues = [player.idNumber.toString(), player.firstName || '', player.lastName || '', comp.getGrade(player.grade), player.remarks || ''];
                    searchWords.forEach(function(searchWord) {
                        for (var i = 0; i < possibleValues.length; i++) {
                            var curValue = possibleValues[i];
                            if (curValue.length > 0 && curValue.indexOf(searchWord) >= 0)
                                matchingWordsCount++;
                        }
                    });
                    return matchingWordsCount !== searchWords.length;
                }
                var comp = this;
                var allPlayers = comp.availablePlayers.selected.concat(comp.availablePlayers.notSelected);
                var searchTerm = comp.search.trim();
                var visibleCount = 0;
                allPlayers.forEach(function (player) {
                    player.hidden = isPlayerHidden(comp, player, searchTerm);
                    if (!player.hidden)
                        visibleCount++;
                });
                comp.searchButtonState.visible = false;
                comp.searchButtonState.validId = false;
                comp.searchButtonState.invalidId = false;
                if (visibleCount === 1) {
                    var visiblePlayer = allPlayers.filter(function(p) { return !p.hidden; })[0];
                    if (searchTerm == visiblePlayer.idNumber) {
                        comp.searchButtonState.visible = true;
                        comp.searchButtonState.text = visiblePlayer.selected ? 'הסרה מרשימת שחקנים' : 'הוספה אל רשימת שחקנים';
                    }
                } else if (visibleCount === 0) {
                    //check if valid id number
                    if (searchTerm.length >= 8 && !isNaN(parseInt(searchTerm, 10))) {
                        if (utils.isIdValid(searchTerm)) {
                            comp.searchButtonState.visible = true;
                            comp.searchButtonState.validId = true;
                            comp.searchButtonState.text = 'הוספת שחקן חדש';
                        } else {
                            comp.searchButtonState.invalidId = true;
                        }
                    }
                }
            },
            validateYearOfBirth: function() {
                var comp = this;
                if (comp.state == comp.states.notLoaded || comp.state == comp.states.loading)
                    return true;
                var rawYear = comp.yearOfBirth;
                if (rawYear == null)
                    return false;
                var year = parseInt(rawYear, 10);
                if (isNaN(year))
                    return false;
                var now = new Date();
                return year >= 1900 && year < now.getFullYear();
            },
            searchButtonClicked: function(e) {
                var comp = this;
                if (comp.searchButtonState.validId) {
                    var searchTerm = comp.search.trim();
                    comp.addingSinglePlayer = true;
                    comp.idNumber = searchTerm;
                    window.setTimeout(function() {
                        comp.isIdValidCheck();
                        //$('#txtIdNumber').focus();
                        comp.sendId();
                    }, 200);
                } else {
                    var allPlayers = comp.availablePlayers.selected.concat(comp.availablePlayers.notSelected);
                    var visiblePlayers = allPlayers.filter(function (p) {
                        return !p.hidden;
                    });
                    if (visiblePlayers.length === 1) {
                        var visiblePlayer = visiblePlayers[0];
                        visiblePlayer.selected = !visiblePlayer.selected;
                        comp.search = '';
                        comp.handleSelectionChange(visiblePlayer);
                        comp.searchTermChanged();
                    }
                }
            },
            getGrade: function (grade) {

                if (grade != null && grade >= 0 && grade < grades.length) {
                    return grades[grade];
                } else {
                    return '';
                }
            },
            handleSelectionChange: function (player) {
                var comp = this;
                if (player.selected) {
                    comp.availablePlayers.selected.push(player);
                } else {
                    comp.availablePlayers.notSelected.push(player);
                }
                window.setTimeout(function() {
                    if (player.selected) {
                        comp.availablePlayers.notSelected = comp.availablePlayers.notSelected.filter(function(p) {
                            return p.student !== player.student;
                        });
                    } else {
                        comp.availablePlayers.selected = comp.availablePlayers.selected.filter(function(p) {
                            return p.student !== player.student;
                        });
                    }
                    $("#pnlAvailablePlayers").scrollTop("0px");
                    comp.searchTermChanged();
                }, 500);
            },
            transfer: function () {
                var comp = this;
                if (comp.grade < 11 && comp.external) {
                    comp.availablePlayers.selected.push({
                        external: comp.external,
                        differentCity: true,
                        student: comp.student,
                        idNumber: comp.idNumber,
                        grade: comp.grade,
                        selected: true,
                        remarks: 'בקשת העברה'
                    });
                    comp.clearId(null);
                }
            },
            confirm: function () {
                var comp = this;
                if (!comp.external || (comp.external && !comp.differentCity)) {
                    var playerData = {
                        external: comp.external,
                        differentCity: comp.differentCity,
                        student: comp.student,
                        idNumber: comp.idNumber,
                        firstName: comp.firstName,
                        lastName: comp.lastName,
                        birthDate: comp.birthDate,
                        grade: comp.grade,
                        gender: comp.gender,
                        yearOfBirth: comp.yearOfBirth,
                        projectJoinDate: comp.projectJoinDate,
                        picture: comp.files.picture,
                        idSlip: comp.files.idSlip,
                        medicalApproval: comp.files.medicalApproval
                    };
                    if (comp.addingSinglePlayer) {
                        var remarks = '';
                        if (comp.external) {
                            remarks = 'בקשת העברה';
                            if (!comp.differentCity)
                                remarks += ' (אותה רשות)';
                        } else {
                            remarks = 'חדש';
                        }
                        playerData.remarks = remarks;
                        playerData.selected = true;
                        comp.availablePlayers.selected.push(playerData);
                        comp.clearId(null);
                    } else {
                        this.$emit("close", playerData);
                    }
                }
            },
            cancel: function() {
                this.$emit("close");
            },
            sendSelectedPlayers: function() {
                var comp = this;
                if (comp.availablePlayers.selected.length > 0) {
                    this.$emit("close", {
                        players: comp.availablePlayers.selected
                    });
                }
            },
            keyUp: function(event) {
                if (event.keyCode === 13) {
                    $("#btnSend").click();
                }
            },
            isIdValidCheck: function() {
                this.isIdValid = utils.isIdValid(this.idNumber);
            },
            convertBirthDate: function() {
                this.birthDate = utils.parseDate(this.birthDateText);
            },
            searchKeyDown: function(e) {
                var comp = this;
                if (e.which === 9) {
                    //TAB key
                    var allPlayers = comp.availablePlayers.selected.concat(comp.availablePlayers.notSelected);
                    var visiblePlayers = allPlayers.filter(function(p) {
                        return !p.hidden;
                    });
                    if (visiblePlayers.length === 1) {
                        comp.search = visiblePlayers[0].idNumber.toString();
                        window.setTimeout(function () {
                            e.target.focus();
                        }, 200);
                    }
                } else if (e.which === 13) {
                    //ENTER key
                    e.preventDefault();
                    comp.searchButtonClicked(e);
                }
            },
            sendId: function(e) {
                function checkPlayerId(comp) {
                    comp.state = states.loading;
                    var postParams = {
                        id: comp.idNumber,
                        projectId: comp.projectId
                    };
                    Vue.http.post('/api/v2/registration/playerId', postParams).then(function(resp) {
                        comp.state = states.new;
                        var result = resp.body;
                        comp.student = result.student;
                        comp.firstName = result.firstName;
                        comp.lastName = result.lastName;
                        comp.birthDate = utils.parseDate(result.birthDate);
                        comp.birthDateText =
                            comp.birthDate
                                ? comp.birthDate.getDate() + '/' + (comp.birthDate.getMonth() + 1) + '/' + comp.birthDate.getFullYear()
                                : '';
                        comp.grade = result.grade;
                        comp.gender = result.gender;
                        comp.pictureLoaded = result.picture != null;
                        comp.idSlipLoaded = result.idSlip != null;
                        comp.medicalApprovalLoaded = result.medicalApproval != null;
                        comp.needTransferRequest = true;
                        if (!comp.projectId && result.external) {
                            comp.external = true;
                            comp.differentCity = result.differentCity;
                            comp.studentCityName = result.studentCity;
                            comp.userCityName = result.userCity;
                            if (!result.differentCity && result.grade < 10) {
                                //student in same city and below 9th grade doesn't need approval for transfer
                                comp.needTransferRequest = false;
                            }
                        }
                    }, function(err) {
                        comp.state = states.new;
                        Dialog.open("general/error-message", {
                            caption: "פעולה נכשלה",
                            message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                        });
                    });
                }

                if (e) {
                    e.preventDefault();
                }

                var comp = this;
                if (!comp.isIdValid) {
                    return;
                }

                comp.playerAlreadyInIFA = false;
                if (comp.existingTeamPlayers && comp.existingTeamPlayers.length > 0) {
                    var existingPlayer = comp.existingTeamPlayers.find(function(p) {
                        return p.idNumber == comp.idNumber;
                    });
                    if (existingPlayer != null) {
                        comp.playerAlreadyInTeam = true;
                        comp.firstName = existingPlayer.firstName;
                        comp.lastName = existingPlayer.lastName;
                        comp.grade = existingPlayer.grade;
                        return;
                    }
                }

                if (comp.checkIfaService) {
                    var url = '/api/common/ifa-register-status?id=' + comp.idNumber;
                    Vue.http.get(url).then(function(resp) {
                        if (resp.body.indexOf('<PlayerRegStatus>1</PlayerRegStatus>') >= 0) {
                            comp.playerAlreadyInIFA = true;
                        } else {
                            checkPlayerId(comp);
                        }
                    }, function (err) {
                        checkPlayerId(comp);
                    });
                } else {
                    checkPlayerId(comp);
                }
            },
            clearId: function(e) {
                if (e) {
                    e.preventDefault();
                }
                this.state = states.notLoaded;
                this.isIdValid = false;
                this.idNumber = "";
                this.firstName = "";
                this.lastName = "";
                this.birthDate = "";
                this.grade = "";
                this.pictureLoaded = false;
                this.idSlipLoaded = false;
                this.medicalApprovalLoaded = false;
                this.files.picture = null;
                this.files.idSlip = null;
                this.files.medicalApproval = null;
                this.external = false;
                this.addingSinglePlayer = false;
                this.search = "";
                this.searchButtonState.visible = false;
                this.searchButtonState.validId = false;
                this.searchButtonState.invalidId = false;
                this.playerAlreadyInTeam = false;
                this.playerAlreadyInIFA = false;
                this.searchTermChanged();
            },
            uploadPicture: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    $('#fiPicture').click();
            },
            uploadIdSlip: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    $('#fiIdSlip').click();
            },
            uploadMedicalApproval: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    $('#fiMedicalApproval').click();
            },
            handlePicture: function() {
                this.files.picture = $('#fiPicture')[0].files[0];
                this.pictureLoaded = !!this.files.picture;
            },
            handleIdSlip: function() {
                this.files.idSlip = $('#fiIdSlip')[0].files[0];
                this.idSlipLoaded = !!this.files.idSlip;
            },
            handleMedicalApproval: function() {
                this.files.medicalApproval = $('#fiMedicalApproval')[0].files[0];
                this.medicalApprovalLoaded = !!this.files.medicalApproval;
            },
            isFormValid: function() {
                var comp = this;
                //when confirmed, it doesn't matter
                if (comp.status == 2)
                    return true;
                if (comp.firstName == null || comp.firstName.length === 0)
                    return false;
                if (comp.lastName == null || comp.lastName.length === 0)
                    return false;
                if (comp.projectId == null) {
                    if (comp.birthDate == null || comp.birthDate.length === 0)
                        return false;
                    if (comp.grade == null || comp.grade == 0)
                        return false;
                } else {
                    if (!comp.validateYearOfBirth()) {
                        return false;
                    }
                }
                return true;
            }
        }
    });

    return PlayerDialogComponent;
});