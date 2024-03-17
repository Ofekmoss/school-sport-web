define(["templates/registration", "dialog"], function (templates, Dialog) {

    function getProject() {
        return Vue.http.get('/api/v2/registration/project/5');
    }

    function saveProject(data) {
        return Vue.http.put('/api/v2/registration/project/5', data);
    }

    var RegistrationProjectSportEqualityDetailsComponent = Vue.extend({
        template: templates["sport-equality-details"],
        data: function () {
            return {
                name: '',
                managerName: '',
                symbol: '',
                address: '',
                socioEconomicRank: '',
                geographicIndex: '',
                totalPopulation: '',
                youngPhysicalOnly: '',
                totalMentallyChallenged: '',
                youngIntellectualOnly: '',
                youngPhysicalAndIntellectual: '',
                youngMentallyChallenged: '',
                manager: {},
                supervisor: {},
                isFormValid: false,
                confirmation: false,
                confirmedAt: null
            };
        },
        computed: {
        },
        mounted: function () {
            var comp = this;
            getProject().then(function(res) {
                res = res.body;
                if (!res.id) {
                    return;
                }

                var values = res.item1 ? JSON.parse(res.item1) : {};

                comp.name = res.city.name;
                comp.managerName = res.city.managerName;
                comp.symbol = res.city.symbol;
                comp.address = res.city.address;
                comp.socioEconomicRank = res.city.socioEconomicRank;
                comp.geographicIndex = res.city.geographicIndex;
                comp.totalPopulation = values.tp;
                comp.youngPhysicalOnly = values.ypo;
                comp.totalMentallyChallenged = values.tmc;
                comp.youngIntellectualOnly = values.yio;
                comp.youngPhysicalAndIntellectual = values.ypi;
                comp.youngMentallyChallenged = values.ymc;
                comp.manager = res.manager;
                comp.supervisor = res.supervisor;

                setTimeout(function() {
                    comp.checkValidity();
                });


                Vue.http.get('/api/v2/registration/school-confirmations').then(function(resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        var confirmationData = resp.body[i];
                        if (confirmationData.Form === 'sport-equality-details') {
                            comp.confirmation = true;
                            // console.log(confirmationData.DateConfirmed);
                            comp.confirmedAt = confirmationData.DateConfirmed;
                            break;
                        }
                    }
                    if (!comp.confirmedAt) {
                        //Dialog.open("registration/project/sport-equality-greetings-dialog", {}, function (err, result) {});
                    }
                }, function(err) {
                    console.log(err);
                    //Dialog.open("registration/project/sport-equality-greetings-dialog", {}, function (err, result) {});
                });
            });
        },
        methods: {
            next: function () {
                var comp = this;
                var values = {
                    tp: this.totalPopulation,
                    ypo: this.youngPhysicalOnly,
                    yio: this.youngIntellectualOnly,
                    ypi: this.youngPhysicalAndIntellectual,
                    tmc: this.totalMentallyChallenged,
                    ymc: this.youngMentallyChallenged
                };
                var data = {
                    city: {
                        managerName: this.managerName,
                        symbol: this.symbol,
                        address: this.address,
                        socioEconomicRank: this.socioEconomicRank,
                        geographicIndex: this.geographicIndex
                    },
                    item1: JSON.stringify(values),
                    manager: this.manager ,
                    supervisor: this.supervisor
                };

                saveProject(data).then(function() {
                    comp.$emit('next');
                    if (!comp.confirmedAt) {
                        var requestParams = {
                            Form: 'sport-equality-details'
                        };
                        Vue.http.post('/api/v2/registration/confirmation', requestParams).then(function (resp) {
                            comp.confirmedAt = new Date();
                        }, function (err) {
                            console.log(err);
                        });
                    }
                });

            },
            checkValidity: function(){
                //return false; // הרשמה נסגרה 20.1.20 //הרשמה נפתחה מחדש 27.2.20
                this.isFormValid = document.querySelectorAll('#form :invalid').length == 0 && this.confirmation;
            }
        },
        watch: {
            name : function() {
                this.checkValidity();
            },
            managerName : function() {
                this.checkValidity();
            },
            symbol : function() {
                this.checkValidity();
            },
            address : function() {
                this.checkValidity();
            },
            socioEconomicRank : function() {
                this.checkValidity();
            },
            geographicIndex : function() {
                this.checkValidity();
            },
            totalPopulation : function() {
                this.checkValidity();
            },
            youngPhysicalOnly : function() {
                this.checkValidity();
            },
            totalMentallyChallenged : function() {
                this.checkValidity();
            },
            youngIntellectualOnly  : function() {
                this.checkValidity();
            },
            youngMentallyChallenged: function () {
                this.checkValidity();
            },
            youngPhysicalAndIntellectual: function () {
                this.checkValidity();
            },
            manager : function() {
                this.checkValidity();
            },
            supervisor : function() {
                this.checkValidity();
            },
            confirmation : function() {
                this.checkValidity();
            }
        }
    });

    return RegistrationProjectSportEqualityDetailsComponent;
});