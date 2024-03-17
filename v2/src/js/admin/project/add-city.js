define(["templates/admin"], function (templates) {
    var AddCityComponent = Vue.extend({
        template: templates["add-city"],
        data: function () {
            return {
                cities: [],
                selectedCity: null,
                city: null,
                hasUser: false,
                login: null,
                password: null
            };
        },
        mounted: function () {
        },
        watch: {
            city: function () {
                this.password = null;
                this.hasUser = false;
                this.selectedCity = null;
                var cityId = parseInt(this.city);
                for (var i = 0; i < this.cities.length; i++) {
                    var city = this.cities[i];
                    if (city.id == cityId) {
                        this.selectedCity = city;
                        this.hasUser = !!city.user;
                        this.login = city.user ? city.user.login : "";
                        return;
                    }
                }
                this.login = null;
            }
        },
        methods: {
            close: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                var cityId = parseInt(this.city);
                if (this.hasUser && this.login === this.selectedCity.user.login &&
                    (!this.password || this.password.length === 0)) {
                    this.$emit("close", {city: cityId});
                }
                else {
                    var details = {
                        login: this.login
                    };
                    if (this.password && this.password.length > 0 ) {
                        details.password = this.password;
                    }
                    Vue.http.post('/api/v2/cities/' + cityId + '/user', details)
                        .then(
                            function (resp) {
                                comp.$emit("close", {city: cityId, user: resp.body});
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                }
            }
        }
    });

    return AddCityComponent;
});