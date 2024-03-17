define(["templates/registration", "dialog"], function (templates, Dialog) {
    var RegistrationProjectSchoolDetailsComponent = Vue.extend({
        template: templates["project-school-details"],
        props: ['project', 'school'],
        data: function () {
            return {
                principal: {},
                coordinator: {},
                scheme: null,
                schemeDescription: null,
                name: null,
                symbol: null,
                details: {},
                updating: false,
                isFormValid: false
            };
        },
        mounted: function () {
            var comp = this;
            if (comp.project && comp.school) {
                Vue.http.get('/api/v2/registration/project/' + encodeURIComponent(comp.project.id) + '/schools/' + encodeURIComponent(comp.school.id))
                    .then(
                        function (resp) {
                            comp.name = resp.data.name;
                            comp.symbol = resp.data.symbol;
                            comp.details = resp.data.details || {canChange: true};
                            comp.principal = resp.data.principal || {canChange: true};
                            comp.coordinator = resp.data.coordinator || {};
                            var scheme = null;
                            if (resp.data.item1) {
                                try {
                                    scheme = JSON.parse(resp.data.item1);
                                }
                                catch (err) {
                                    scheme = null;
                                }
                            }
                            if (scheme == null) {
                                comp.scheme = null;
                                comp.schemeDescription = null;
                            }
                            else if (typeof scheme === "number") {
                                comp.scheme = scheme;
                                comp.schemeDescription = null;
                            }
                            else {
                                comp.scheme = 3;
                                comp.schemeDescription = scheme;
                            }
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
            }
        },
        methods: {
            checkIsEmpty: function (str) {
                return !str || str.trim().length === 0;
            },
            checkIsContactValid: function (contact) {
                return !this.checkIsEmpty(contact.name) && !this.checkIsEmpty(contact.phoneNumber) && !this.checkIsEmpty(contact.email);
            },
            updateIsFormValid: function () {
                if (this.details.canChange) {
                    if (this.checkIsEmpty(this.details.phoneNumber) ||
                        this.checkIsEmpty(this.details.fax) ||
                        this.checkIsEmpty(this.details.address)) {
                        console.log(this.details);
                        this.isFormValid = false;
                        return;
                    }
                }
                if (this.principal.canChange) {
                    if (!this.checkIsContactValid(this.principal)) {
                        console.log("principal invalid");
                        this.isFormValid = false;
                        return;
                    }
                }
                if (!this.checkIsContactValid(this.coordinator)) {
                    console.log("coordinator invalid");
                    this.isFormValid = false;
                    return;
                }
                var scheme = parseInt(this.scheme);
                console.log("scheme?");
                this.isFormValid = (scheme === 1 || scheme === 2 || (scheme === 3 && !this.checkIsEmpty(this.schemeDescription)));
            },
            next: function () {
                var comp = this;
                var scheme = parseInt(this.scheme);
                var data = {
                    coordinator: {
                        name: this.coordinator.name,
                        phoneNumber: this.coordinator.phoneNumber,
                        email: this.coordinator.email
                    },
                    item1: JSON.stringify(scheme === 3 ? this.schemeDescription : scheme)
                };
                if (this.details.canChange) {
                    data.details = {
                        address: this.details.address,
                        phoneNumber: this.details.phoneNumber,
                        fax: this.details.fax,
                        email: this.details.email
                    }
                }
                if (this.principal.canChange) {
                    data.principal = {
                        name: this.principal.name,
                        phoneNumber: this.principal.phoneNumber,
                        email: this.principal.email
                    }
                }
                Vue.http.put('/api/v2/registration/project/' + encodeURIComponent(comp.project.id) + '/schools/' + encodeURIComponent(comp.school.id), data)
                    .then(
                        function (resp) {
                            comp.school = {
                                id: comp.school.id,
                                name: comp.school.name,
                                symbol: comp.school.symbol,
                                stage: 1
                            };
                            comp.$emit("update:school", comp.school);
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
            }
        },
        watch: {
            details: {
                handler: function() {
                    this.updateIsFormValid();
                }, deep: true
            },
            principal: {
                handler: function() {
                    this.updateIsFormValid();
                }, deep: true
            },
            coordinator: {
                handler: function() {
                    this.updateIsFormValid();
                }, deep: true
            },
            scheme: function() {
                this.updateIsFormValid();
            },
            schemeDescription: function() {
                this.updateIsFormValid();
            }
        }
    });

    return RegistrationProjectSchoolDetailsComponent;
});