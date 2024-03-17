define(["templates/admin"], function (templates) {
    var EditCityUserComponent = Vue.extend({
        template: templates["edit-city-user"],
        data: function () {
            return {
                city: null,
                hasUser: false,
                login: null,
                password: null
            };
        },
        mounted: function () {
            this.hasUser = !!this.city.user;
            this.password = null;
            this.login = this.city.user ? this.city.user.login : "";
        },
        methods: {
            close: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                if (this.hasUser && this.login === this.city.user.login &&
                    (!this.password || this.password.length === 0)) {
                    this.$emit("close", this.city.user);
                }
                else {
                    var details = {
                        login: this.login
                    };
                    if (this.password && this.password.length > 0 ) {
                        details.password = this.password;
                    }
                    Vue.http.post('/api/v2/cities/' + this.city.id + '/user', details)
                        .then(
                            function (resp) {
                                comp.$emit("close", resp.body);
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                }
            }
        }
    });

    return EditCityUserComponent;
});