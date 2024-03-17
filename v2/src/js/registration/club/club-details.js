define(["templates/registration", "services/access", "dialog", "utils"], function (templates, Access, Dialog, utils) {
    var RegistrationClubDetailsComponent = Vue.extend({
        template: templates["club-details"],
        data: function () {
            return {
                user: Access.user,
                school: {},
                principal: {},
                chairman: {},
                coordinator: {},
                representative: {},
                teacher: {},
                parentsCommittee: {},
                studentsRepresentative: {},
                associationRepresentative: {},
                association: {},
                confirmation: false,
                confirmedAt: null,
                formValidations: {},
                inactiveSeason: false
            };
        },
        //     return (this.school.name && this.school.phoneNumber && this.school.symbol && this.school.fax
        // && this.school.type
        // && this.school.email
        // && this.school.address
        // && this.principal.name
        // && this.chairman.name
        // && this.coordinator.name
        // && this.principal.phoneNumber
        // && this.chairman.phoneNumber
        // && this.coordinator.phoneNumber
        // && this.principal.email
        // && this.chairman.email
        // && this.coordinator.email)

    watch: {
            'school': {
                handler: function() {
                    this.formValidations.school =  this.school.name && this.school.phoneNumber && this.school.symbol
                        &&  this.school.fax &&  this.school.email &&  this.school.address
                }, deep: true
            },
            'principal': {
                handler: function() {
                    this.formValidations.principal =  this.principal.name && this.principal.phoneNumber && this.principal.email && this.principal.gender;
                }, deep: true
            },
            'chairman': {
                handler: function() {
                    this.formValidations.chairman =  this.chairman.name && this.chairman.phoneNumber && this.chairman.email && this.chairman.gender;
                }, deep: true
            },
            'coordinator': {
                handler: function() {
                    this.formValidations.coordinator =  this.coordinator.name && this.coordinator.phoneNumber && this.coordinator.email && this.coordinator.gender;
                }, deep: true
            },
            'representative': {
                handler: function() {
                    this.formValidations.representative =  this.representative.name && this.representative.phoneNumber && this.representative.email && this.representative.gender;
                }, deep: true
            },
            //
            'teacher': {
                handler: function() {
                    this.formValidations.teacher =  this.teacher.name && this.teacher.phoneNumber && this.teacher.email && this.teacher.gender;
                }, deep: true
            },
            'parentsCommittee': {
                handler: function() {
                    this.formValidations.parentsCommittee =  this.parentsCommittee.name && this.parentsCommittee.phoneNumber && this.parentsCommittee.email && this.parentsCommittee.gender;
                }, deep: true
            },
            'studentsRepresentative': {
                handler: function() {
                    this.formValidations.studentsRepresentative =  this.studentsRepresentative.name && this.studentsRepresentative.phoneNumber && this.studentsRepresentative.email && this.studentsRepresentative.gender;
                }, deep: true
            },
            'associationRepresentative': {
                handler: function() {
                    this.formValidations.associationRepresentative =  this.associationRepresentative.name && this.associationRepresentative.phoneNumber && this.associationRepresentative.email && this.associationRepresentative.gender;
                }, deep: true
            }
        },
        mounted: function () {
            function ShowClubDialog(comp) {
                Dialog.open("registration/club/club-first-confirmation-dialog",
                    {
                    },
                    function (err, result) {

                    });
            }
            var comp = this;
            window.setTimeout(function() {
                utils.trimAllInputs('pnlClubDetails');
            }, 1000);
            Vue.http.get('/api/v2/registration/club/details')
                .then(
                    function (resp) {
                        comp.school = resp.data.school || {};
                        comp.principal = resp.data.principal || {};
                        comp.chairman = resp.data.chairman || {};
                        comp.coordinator = resp.data.coordinator || {};
                        comp.representative = resp.data.representative || {};
                        comp.teacher = resp.data.teacher || {};
                        comp.parentsCommittee = resp.data.parentsCommittee || {};
                        comp.studentsRepresentative = resp.data.studentsRepresentative || {};
                        comp.associationRepresentative = resp.data.associationRepresentative || {};
                        comp.teacher = resp.data.teacher || {};
                        comp.parentsCommittee = resp.data.parentsCommittee || {};
                        comp.studentsRepresentative = resp.data.studentsRepresentative || {};
                        comp.associationRepresentative = resp.data.associationRepresentative || {};
                        comp.association = resp.data.association || {};
                        // console.log(comp.association);
                        if (comp.association.set != null) {
                            comp.association.set = comp.association.set ? 1 : 0;
                            comp.association.validForThisYear = comp.association.validForThisYear ? 1 : 0;
                        }
                        Vue.http.get('/api/v2/registration/school-confirmations').then(function(resp) {
                            for (var i = 0; i < resp.body.length; i++) {
                                var confirmationData = resp.body[i];
                                if (confirmationData.Form === 'club-details') {
                                    comp.confirmation = true;
                                    // console.log(confirmationData.DateConfirmed);
                                    comp.confirmedAt = confirmationData.DateConfirmed;
                                    break;
                                }
                            }
                            if (!comp.confirmedAt) {
                                ShowClubDialog(comp);
                            }
                        }, function(err) {
                            console.log(err);
                            ShowClubDialog(comp);
                        });
                    },
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
        methods: {
            resetGender: function(sender) {
                sender.gender = null;
            },
            next: function () {
                function PostDetails(comp, password) {
                    Vue.http.post('/api/v2/registration/club/details', {
                        school: comp.school,
                        principal: comp.principal,
                        chairman: comp.chairman,
                        coordinator: comp.coordinator,
                        representative: comp.representative,
                        teacher: comp.teacher,
                        parentsCommittee: comp.parentsCommittee,
                        studentsRepresentative: comp.studentsRepresentative,
                        associationRepresentative: comp.associationRepresentative,
                        association: {
                            set: parseInt(comp.association.set),
                            validForThisYear: comp.association.set ? parseInt(comp.association.validForThisYear) : 0,
                            number: comp.association.number
                        },
                        password: password
                    })
                        .then(
                            function (resp) {
                                comp.$emit("next", resp.data.stage);
                                if (!comp.confirmedAt) {
                                    var requestParams = {
                                        Form: 'club-details'
                                    };
                                    Vue.http.post('/api/v2/registration/confirmation', requestParams).then(function (resp) {
                                        comp.confirmedAt = new Date();
                                    }, function (err) {
                                        console.log(err);
                                    });
                                }
                            },
                            function (err) {
                                Dialog.open("general/error-message", {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                                });
                            }
                        );
                }
                var comp = this;
                var caption = comp.confirmedAt == null ? 'אישור קריאת הצהרה' : 'אימות סיסמא';
                Dialog.open("general/password-validation", {
                    caption: caption
                }, function (err, result) {
                    PostDetails(comp, result);
                });
            }
        }
    });

    return RegistrationClubDetailsComponent;
});