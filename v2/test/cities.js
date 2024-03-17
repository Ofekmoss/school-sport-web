var cities = [
    {id: 1, name: "תל-אביב-יפו", region: {id: 5, name: "תל אביב"}, user: {id: 1, login: "תלאביב", firstName: "תל-אביב-יפו"}},
    {id: 2, name: "ירושלים", region: {id: 1, name: "ירושלים"}},
    {id: 3, name: "חיפה", user: {id: 2, login: "חיפה", firstName: "חיפה"}},
    {id: 4, name: "באר שבע", user: {id: 3, login: "בארשבע", firstName: "באר שבע"}},
    {id: 5, name: "ראשון לציון", region: {id: 4, name: "מרכז"}}
];

function Cities() {

}

Cities.prototype.list = function (callback) {
    callback(null, cities);
};

Cities.prototype.setUser = function (cityId, details, callback) {
    for (var i = 0; i < cities.length; i++) {
        var city = cities[i];
        if (city.id === cityId) {
            if (!city.user) {
                city.user = {};
            }
            if (details.login) {
                city.user.login = details.login;
            }
            callback(null, city.user);
            return;
        }
    }
    callback({status: 404, message: "City not found"});
};


module.exports = new Cities();