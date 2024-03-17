define(["templates/registration", "utils", "dialog"], function (templates, utils, Dialog) {

    var states = {
        notLoaded: 1,
        new: 2,
        edit: 3,
        import: 4,
        loading: 5
    };

    var LeaguePlayerDialogComponent = Vue.extend({
        template: templates["league-player-dialog"],
        data: function() {
            return {
                idNumber: '',
                firstName: "",
                lastName: "",
                birthDate: '',
                birthDateText: '',
                grade: "",
                picture: "",
                idSlip: "",
                medicalApproval: '',
                pictureLoaded: false,
                idSlipLoaded: false,
                medicalApprovalLoaded: false,
                isIdValid: false,
                state: states.notLoaded,
                states: states,
                external: false
            };
        },
        created: function () {
            this.files = {
                picture: null,
                idSlip: null,
                medicalApproval: null
            };
        },
        mounted: function() {
            if (this.idNumber) {
                this.isIdValid = true;
            }

            if (this.birthDate) {
                var birthDate = new Date(this.birthDate);
                this.birthDateText = birthDate.getDate() + '/' + (birthDate.getMonth() + 1) + '/' + birthDate.getFullYear();
            }

            this.pictureInput = document.getElementById('picture-input');
            this.idSlipInput = document.getElementById('id-slip-input');
            this.medicalApprovalInput = document.getElementById('medical-approval-input');
        },
        methods: {
            transfer: function () {
                if (this.external) {
                    this.$emit("close", {
                        idNumber: this.idNumber,
                        external: this.external
                    });
                }
            },
            confirm: function () {
                if (!this.external) {
                    this.$emit("close", {
                        student: this.student,
                        idNumber: this.idNumber,
                        firstName: this.firstName,
                        lastName: this.lastName,
                        birthDate: this.birthDate,
                        grade: this.grade,
                        gender: this.gender,
                        picture: this.files.picture,
                        idSlip: this.files.idSlip,
                        medicalApproval: this.files.medicalApproval
                    });
                }
            },
            cancel: function() {
                this.$emit("close");
            },
            isIdValidCheck: function() {
                this.isIdValid = utils.isIdValid(this.idNumber);
            },
            convertBirthDate: function() {
                this.birthDate = utils.parseDate(this.birthDateText);
            },
            sendId: function(e) {
                e.preventDefault();

                var comp = this;

                if (!this.isIdValid) {
                    return;
                }
                comp.state = states.loading;

                Vue.http.post('/api/v2/registration/playerId', {id: comp.idNumber}).then(
                    function(resp) {
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

                        if (result.external) {
                            comp.external = true;
                        }
                    },
                    function(err) {
                        comp.state = states.new;
                        Dialog.open("general/error-message", {
                            caption: "פעולה נכשלה",
                            message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                        });
                    }
                );
            },
            clearId: function(e) {
                e.preventDefault();
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
            },
            uploadPicture: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    this.pictureInput.click();
            },
            uploadIdSlip: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    this.idSlipInput.click();
            },
            uploadMedicalApproval: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    this.medicalApprovalInput.click();
            },
            handlePicture: function() {
                this.files.picture = this.pictureInput.files[0];
                this.pictureLoaded = !!this.files.picture;
            },
            handleIdSlip: function() {
                this.files.idSlip = this.idSlipInput.files[0];
                this.idSlipLoaded = !!this.files.idSlip;
            },
            handleMedicalApproval: function() {
                this.files.medicalApproval = this.medicalApprovalInput.files[0];
                this.medicalApprovalLoaded = !!this.files.medicalApproval;
            }
        }
    });

    return LeaguePlayerDialogComponent;
});