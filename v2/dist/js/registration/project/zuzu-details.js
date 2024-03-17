define(["templates/registration", "dialog"], function (templates, Dialog) {

    function getProject() {
        return Vue.http.get('/api/v2/registration/project/1');
    }

    function saveProject(data) {
        return Vue.http.put('/api/v2/registration/project/1', data);
    }

    var RegistrationProjectZuzuDetailsComponent = Vue.extend({
        template: templates["zuzu-details"],
        data: function () {
            return {
                name: '',
                managerName: '',
                symbol: '',
                address: '',
                socioEconomicRank: '',
                manager: {},
                supervisor: {},
                item1: '',
                item2: '',
                item3: '',
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

                comp.name = res.city.name;
                comp.managerName = res.city.managerName;
                comp.symbol = res.city.symbol;
                comp.address = res.city.address;
                comp.manager = res.manager;
                comp.supervisor = res.supervisor;
                comp.item1 = res.item1;
                comp.item2 = res.item2;
                comp.item3 = res.item3;

                setTimeout(function() {
                    comp.checkValidity();
                });
            });
        },
        methods: {
            next: function () {
                var comp = this;
                var data = {
                    city: {
                        managerName: this.managerName,
                        symbol: this.symbol,
                        address: this.address
                    },
                    item1: this.item1,
                    item2: this.item2,
                    item3: this.item3,
                    manager: this.manager ,
                    supervisor: this.supervisor
                };

                saveProject(data).then(function() {
                    comp.$emit('next');
                });

            },
            checkValidity: function(){
                this.isFormValid = document.querySelectorAll('#form :invalid').length == 0;
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
            manager : function() {
                this.checkValidity();
            },
            supervisor : function() {
                this.checkValidity();
            },
            item1: function () {
                this.checkValidity();
            },
            item2: function () {
                this.checkValidity();
            },
            item3: function () {
                this.checkValidity();
            }
        }
    });

    return RegistrationProjectZuzuDetailsComponent;
});