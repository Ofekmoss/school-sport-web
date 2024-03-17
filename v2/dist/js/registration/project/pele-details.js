define(["templates/registration", "dialog"], function (templates, Dialog) {

    function getProject() {
        return Vue.http.get('/api/v2/registration/project/3');
    }

    function saveProject(data) {
        return Vue.http.put('/api/v2/registration/project/3', data);
    }

    var RegistrationProjectPeleDetailsComponent = Vue.extend({
        template: templates["pele-details"],
        data: function () {
            return {
                name: '',
                managerName: '',
                symbol: '',
                address: '',
                socioEconomicRank: '',
                geographicIndex: '',
                totalPopulation: '',
                ethiopianPopulation: '',
                childrenPopulation: '',
                ethiopianChildrenPopulation: '',
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
                comp.ethiopianPopulation = values.ep;
                comp.childrenPopulation = values.cp;
                comp.ethiopianChildrenPopulation = values.ecp;
                comp.manager = res.manager;
                comp.supervisor = res.supervisor;

                setTimeout(function() {
                    comp.checkValidity();
                });


                Vue.http.get('/api/v2/registration/school-confirmations').then(function(resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        var confirmationData = resp.body[i];
                        if (confirmationData.Form === 'pele-details') {
                            comp.confirmation = true;
                            // console.log(confirmationData.DateConfirmed);
                            comp.confirmedAt = confirmationData.DateConfirmed;
                            break;
                        }
                    }
                    if (!comp.confirmedAt) {
                        Dialog.open("registration/project/pele-greetings-dialog", {}, function (err, result) {});
                    }
                }, function(err) {
                    console.log(err);
                    Dialog.open("registration/project/pele-greetings-dialog", {}, function (err, result) {});
                });
            });
        },
        methods: {
            next: function () {
                var comp = this;
                var values = {
                    tp: this.totalPopulation,
                    ep: this.ethiopianPopulation,
                    ecp: this.ethiopianChildrenPopulation,
                    cp: this.childrenPopulation,
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
                            Form: 'pele-details'
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
            ethiopianPopulation : function() {
                this.checkValidity();
            },
            childrenPopulation : function() {
                this.checkValidity();
            },
            ethiopianChildrenPopulation  : function() {
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

    return RegistrationProjectPeleDetailsComponent;
});