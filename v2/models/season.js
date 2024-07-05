var season = 76;
var pCache = require('../api/persistent-cache');
var settings = require('../../settings');

function Season(db) {
    this.db = db;
}

Season.prototype.active = function () {
    return season;
};

Season.prototype.current = function (loggedUser, callback) {
    if (typeof loggedUser === 'undefined')
        loggedUser = null;
    if (typeof callback === 'undefined')
        callback = null;
    if (loggedUser != null && callback != null) {
        pCache.get(loggedUser, 'user-' + (loggedUser.id || loggedUser) + '-season', function(err, cachedSeason) {
            if (err) {
                callback(season);
            } else {
                if (cachedSeason == null || cachedSeason == '') {
                    pCache.get(loggedUser, 'season', function(err, cachedSeason) {
                        if (err || cachedSeason == null) {
                            callback(season);
                        } else {
                            callback(parseInt(cachedSeason, 10));
                        }
                    });
                } else {
                    callback(parseInt(cachedSeason, 10));
                }
            }
        });
    } else {
        return season;
    }
};

Season.prototype.getAllSeasons = function (callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select SEASON, [NAME], START_DATE ' +
            'From SEASONS ' +
            'Where DATE_DELETED Is Null';
        var firstSeason = settings.firstRegistrationSeason;
        if (firstSeason)
            qs += ' And SEASON>=@first';
        connection.request(qs, {first: firstSeason}).then(function (records) {
            connection.complete();
            var result = records.map(function (x) {
                return {
                    id: x.SEASON,
                    name: x.NAME,
                    start: x['START_DATE']
                }
            });
            callback(null, result);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

module.exports = new Season(require('./db'));