var schools = [
    {id: 1, name: "ביהס בירושלים", symbol: "1234567", region: {id: 1, name: "ירושלים"}, city: {id: 2, name: "ירושלים"}},
    {id: 2, name: "ביהס בצפון", symbol: "1234565", region: {id: 2, name: "צפון"}, city: {id: 0}},
    {id: 3, name: "ביהס אחד בחיפה", symbol: 9999999, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
    {id: 4, name: "ביהס שני בחיפה", symbol: 9999998, region: {id: 3, name: "חיפה"}, city: {id: 3, name: "חיפה"}},
];

function Schools() {

}

Schools.prototype.list = function (options, callback) {
    var result = schools.slice();
    if (options.city) {
        var i = 0;
        while (i < result.length) {
            if (result[i].city.id != options.city) {
                result.splice(i, 1);
            }
            else {
                i++;
            }
        }
    }
    callback(null, result);
};

Schools.prototype.get = function (id, callback) {
    for (var i = 0; i < schools.length; i++) {
        if (schools[i].id == id) {
            callback(null, schools[i]);
            return;
        }
    }

    callback();
};

module.exports = new Schools();