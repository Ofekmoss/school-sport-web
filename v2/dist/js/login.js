define(["templates/default", "services/access"],
    function (templates, Access) {

        var LoginComponent = Vue.extend({
            template: templates.login,
            data: function () {
                return {
                    username: "",
                    password: "",
                    errorMessage: null,
                    passwordLogin: false,
                    tokenLogin: false,
                    token: null,
                    comsigndocid: null
                };
            },
            mounted: function () {
                var comp = this;
                if (comp.token) {
                    comp.tokenLogin = true;
                }
                else {
                    comp.passwordLogin = true;
                }
                if (comp.comsigndocid != null && comp.comsigndocid.length > 10) {
                    var requestParams = {
                        documentId: comp.comsigndocid
                    };
                    Vue.http.post('/api/common/digital-signature', requestParams);
                }
            },
            methods: {
                login: function () {
                    var comp = this;
                    var params = {};
                    if (this.token) {
                        params.token = this.token;
                        params.code = this.password;
                    }
                    else {
                        params.username = this.username;
                        params.password = this.password;
                    }
                    Access.login(params, function (err) {
                        if (err) {
                            console.log(err);
                            if (typeof err === "string") {
                                comp.errorMessage = err;
                            }
                            else {
                                comp.errorMessage = "שגיאה בהתחברות";
                            }
                        }
                    });
                },
                keyUp: function(event) {
                    if (event.keyCode === 13) {
                        $("#btnLogin").click();
                    }
                }
            }
        });

        return LoginComponent;
    });