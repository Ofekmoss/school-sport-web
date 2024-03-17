define([], function () {
    var Access = new Vue({});
    Access.user = null;

    Access.get = function (callback) {
        if (Access.user) {
            callback(null, Access.user);
        }
        else {
            Vue.http.get('/api/v2/login')
                .then(
                    function (resp) {
                        if (resp.body) {
                            Access.user = resp.body;
                            //Access.$emit("login");
                            callback(null, Access.user);
                        }
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }
    };

    Access.login = function (params, callback) {
        Vue.http.post('/api/v2/login', params)
            .then(
                function (resp) {
                    Access.user = resp.data;
                    Access.$emit("login", Access.user);
                    callback();
                },
                function (err) {
                    callback(err.body);
                }
            );
    };

    Access.logout = function() {
        Vue.http.post('/api/v2/logout').then(function (resp) {
            if (Access.user != null && Access.user.delegatedUser != null) {
                Access.user = resp.data;
                Access.$emit("login", Access.user);
            } else {
                Access.$emit("logout");
            }
        });
    };

    return Access;
});