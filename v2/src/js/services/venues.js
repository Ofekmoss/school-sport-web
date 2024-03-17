define([], function () {
    var venues = {};

    var Venues = {
        getVenue: function (id, callback) {
            var venue = venues[id];
            if (venue) {
                if (Array.isArray(venue)) {
                    venue.push(callback);
                }
                else {
                    callback(null, venue);
                }
            }
            else if (venue === false) {
                callback();
            }
            else {
                var url = '/api/v2/facilities?id=' + id;
                venues[id] = [callback];
                Vue.http.get(url).then(
                    function (resp) {
                        var cbs = venues[id];
                        venues[id] = venue = resp.body;
                        for (var c = 0; c < cbs.length; c++) {
                            cbs[c](null, venue);
                        }

                    },
                    function (err) {
                        var cbs = venues[id];
                        venues[id] = false;
                        for (var c = 0; c < cbs.length; c++) {
                            cbs[c](err);
                        }
                    });
            }
        }
    };

    return Venues;
});