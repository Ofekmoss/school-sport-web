define(["templates/registration", "services/access", "dialog", "utils"], function (templates, Access, Dialog, utils) {
    function getById(list, id) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.id === id) {
                return item;
            }
        }
        return null;
    }

    function getDates(sportId) {
        if (sportId === 16) { //כדורעף
            return "ספטמבר 2021 ועד מרץ 2022";
        }
        return "ספטמבר 2021 ועד ינואר 2022";
    }

    function readCompetitions(comp, callback) {
        comp.sports.splice(0, comp.sports.length);
        Vue.http.get('/api/v2/registration/league/competitions')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.sports.length; i++) {
                        comp.sports.push(resp.body.sports[i]);
                    }
                    callback();
                },
                function (err) {
                    callback(err);
                }
            );
    }

    function readTeams(comp, teamId, callback) {
        readCompetitions(comp, function (err) {
            if (!err) {
                Vue.http.get('/api/v2/registration/league/teams/'+ encodeURIComponent(teamId))
                    .then(
                        function (resp) {
                            var team = resp.body;
                            team.sport = getById(comp.sports, team.sport);
                            if (team.sport) {
                                team.category = getById(team.sport.categories, team.competition);
                                if (team.category) {
                                    callback(null, team);
                                    return;
                                }
                            }
                            callback();
                        },
                        function (err) {
                            console.log(err);
                            callback();
                        }
                    );
            }
        });
    }

    var RegistrationLeagueDetailsComponent = Vue.extend({
        template: templates["league-details"],
        data: function () {
            return {
                user: Access.user,
                teamId: null,
                inputsValid: false,
                school: {},
                principal: {},
                representative: {},
                coordinator: {},
                association: {},
                sports: [],
                inactiveSeason: false
            };
        },
        mounted: function () {
            function ShowConfirmationDialog(team) {
                Dialog.open('registration/league/league-first-confirmation-dialog',
                    {
                        sportName: team.sport.name,
                        dates: getDates(team.sport.id)
                    });
            }
            var comp = this;
            comp.teamId = window.location.hash.split("=")[1];
            window.setTimeout(function() {
                utils.trimAllInputs('pnlLeagueDetails');
            }, 1000);
            Vue.http.get('/api/v2/registration/league/details')
                .then(
                    function (resp) {
                        comp.school = resp.data.school || {};
                        comp.principal = resp.data.principal || {};
                        comp.representative = resp.data.representative || {};
                        comp.association = resp.data.association || {};
                        comp.firstConfirmation = resp.data.firstConfirmation;

                        if (!comp.firstConfirmation) {
                            readTeams(comp, comp.teamId, function (err, team) {
                                comp.checkInputsValid();
                                if (team) {
                                    var matchingForm = 'league-team-' + team.id;
                                    Vue.http.get('/api/v2/registration/school-confirmations').then(function(resp) {
                                        var confirmedAt = null;
                                        for (var i = 0; i < resp.body.length; i++) {
                                            var confirmationData = resp.body[i];
                                            if (confirmationData.Form === matchingForm) {
                                                confirmedAt = confirmationData.DateConfirmed;
                                                break;
                                            }
                                        }
                                        if (confirmedAt == null) {
                                            ShowConfirmationDialog(team);
                                        }
                                    }, function(err) {
                                        console.log(err);
                                        ShowConfirmationDialog(team);
                                    });
                                }
                            });


                        }},
                    function (err) {
                        console.log(err);
                    }
                );
            comp.inactiveSeason = utils.inactiveSeason(comp);
            if (comp.inactiveSeason) {
                //check if school is authorized
                utils.checkSeasonAuthorization(comp.user, function(err, authorized) {
                    if (authorized == true) {
                        comp.inactiveSeason = false;
                    }
                });
            }
        },
        computed: {
            isValid: function() {
                return this.school.name &&
                    this.school.phoneNumber &&
                    this.school.symbol &&
                    this.school.fax &&
                    this.school.type &&
                    this.school.email &&
                    this.school.address &&
                    this.principal.name &&
                    this.principal.phoneNumber &&
                    this.principal.email &&
                    this.principal.gender &&
                    this.representative.name &&
                    this.representative.phoneNumber &&
                    this.representative.email &&
                    this.representative.gender &&
                    this.inputsValid;
            }
        },
        methods: {
            resetGender: function(sender) {
                sender.gender = null;
            },
            checkInputsValid: function () {
                this.inputsValid = document.querySelectorAll('#form :invalid').length == 0;
            },
            next: function () {
                var comp = this;
                /*Dialog.open("general/password-validation", {
                    caption: "אישור קריאת הצהרות"
                }, function (err, result) {*/
                    Vue.http.post('/api/v2/registration/league/details', {
                        school: comp.school,
                        principal: comp.principal,
                        representative: comp.representative,
                        confirmationA: comp.confirmationA,
                        confirmationB: comp.confirmationB,
                        confirmationC: comp.confirmationC,
                        confirmationD: comp.confirmationD/*,
                        password: result*/
                    })
                        .then(
                            function (resp) {
                                comp.$emit("next", resp.data.stage);
                            },
                            function (err) {
                                Dialog.open("general/error-message", {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                                });
                            }
                        );
                //});
            }
        }
    });

    return RegistrationLeagueDetailsComponent;
});