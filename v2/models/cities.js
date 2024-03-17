var utils = require('../../api/utils');

function Cities(db) {
    this.db = db;
}

Cities.prototype.list = function (callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select c.CITY_ID as \"Id\", c.CITY_NAME as \"Name\", " +
                    "  r.REGION_ID as \"Region\", r.REGION_NAME as \"RegionName\", " +
                    "  u.USER_ID as \"User\", u.USER_LOGIN as \"UserLogin\", u.USER_FIRST_NAME as \"UserFirstName\", " +
                    "  u.USER_LAST_NAME as \"UserLastName\" " +
                    "from CITIES as c " +
                    "  join REGIONS as r on c.REGION_ID = r.REGION_ID " +
                    "  left outer join USERS as u on u.CITY_ID = c.CITY_ID and u.USER_TYPE = 5 and u.DATE_DELETED is null " +
                    "where c.DATE_DELETED is null " +
                    "order by c.CITY_ID")
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            var lastCity = null;

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                if (record.Id !== lastCity) {
                                    result.push({
                                        id: record.Id,
                                        name: record.Name,
                                        region: {
                                            id: record.Region,
                                            name: record.RegionName
                                        },
                                        user: record.User == null ? null : {
                                            id: record.User,
                                            login: record.UserLogin,
                                            firstName: record.UserFirstName,
                                            lastName: record.UserLastName
                                        }
                                    });
                                    lastCity = record.Id;
                                }
                            }

                            callback(null, result);
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Cities.prototype.getById = function (id, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select c.CITY_ID as \"Id\", c.CITY_NAME as \"Name\", " +
                    "  r.REGION_ID as \"Region\", r.REGION_NAME as \"RegionName\", " +
                    "  u.USER_ID as \"User\", u.USER_LOGIN as \"UserLogin\", u.USER_FIRST_NAME as \"UserFirstName\", " +
                    "  u.USER_LAST_NAME as \"UserLastName\" " +
                    "from CITIES as c " +
                    "  join REGIONS as r on c.REGION_ID = r.REGION_ID " +
                    "  left outer join USERS as u on u.CITY_ID = c.CITY_ID and u.USER_TYPE = 5 and u.DATE_DELETED is null " +
                    "where c.DATE_DELETED is null and c.CITY_ID = @id ",
                    {id: id})
                    .then(
                        function (records) {
                            connection.complete();

                            if (records.length > 0) {
                                var record = records[0];
                                callback(null, {
                                    id: record.Id,
                                    name: record.Name,
                                    region: {
                                        id: record.Region,
                                        name: record.Name
                                    },
                                    user: record.User == null ? null : {
                                        id: record.User,
                                        login: record.UserLogin,
                                        firstName: record.UserFirstName,
                                        lastName: record.UserLastName
                                    }
                                });
                            }
                            else {
                                callback();
                            }
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Cities.prototype.setUser = function (cityId, details, callback) {
    var self = this;
    var result = null;
    this.getById(cityId, function (err, city) {
        if (err) {
            callback(err);
            return;
        }
        if (!city) {
            callback({status: 404, message: "City not found"});
            return;
        }
        self.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select USER_ID as \"User\", USER_LOGIN as \"Login\", " +
                        "  USER_FIRST_NAME as \"FirstName\", USER_LAST_NAME as \"LastName\" " +
                        "from USERS " +
                        "where USER_TYPE = 5 and CITY_ID = @city and DATE_DELETED is null",
                        {city: cityId})
                        .then(
                            function (records) {
                                var password = null;
                                if (details.password) {
                                    password = utils.SportsmanEncode(details.password);
                                }
                                if (records.length > 0) {
                                    var record = records[0];
                                    // User exists - updating it
                                    var changes = [];
                                    result = {
                                        id: record.User,
                                        login: record.Login,
                                        firstName: record.FirstName,
                                        lastName: record.LastName
                                    };
                                    for (var key in details) {
                                        if (key === "login") {
                                            changes.push("USER_LOGIN = @login");
                                            result.login = details[key];
                                        } else if (key === "firstName") {
                                            changes.push("USER_FIRST_NAME = @firstName");
                                            result.firstName = details[key];
                                        } else if (key === "lastName") {
                                            changes.push("USER_LAST_NAME = @lastName");
                                            result.lastName = details[key];
                                        } else if (key === "password") {
                                            changes.push("USER_PASSWORD = @password");
                                        }
                                    }
                                    return connection.request(
                                        "update USERS " +
                                        "set " + changes.join(", ") +
                                        " where USER_ID = @id",
                                        {
                                            id: result.id,
                                            login: result.login,
                                            firstName: result.firstName,
                                            lastName: result.lastName,
                                            password: password
                                        });
                                }
                                result = {
                                    login: details.login,
                                    firstName: details.firstName || details.login,
                                    lastName: details.lastName
                                };
                                return connection.request(
                                    "insert into USERS(USER_LOGIN, USER_TYPE, USER_FIRST_NAME, USER_LAST_NAME, USER_PERMISSIONS, USER_PASSWORD, REGION_ID, CITY_ID) " +
                                    "values(@login, 5, @firstName, @lastName, 0, @password, @region, @city) " +
                                    "select scope_identity() as \"User\"", {
                                        id: result.id,
                                        login: result.login,
                                        firstName: result.firstName,
                                        lastName: result.lastName,
                                        password: password,
                                        region: city.region.id,
                                        city: city.id
                                    });
                            })
                        .then(
                            function (records) {
                                if (result.id == null) {
                                    result.id = records[0].User;
                                }
                                connection.complete();

                                callback(null, result);
                            },
                            function (err) {
                                connection.complete();
                                callback(err);
                            });
                },
                function (err) {
                    callback(err);
                }
            );
    });
};

module.exports = new Cities(require('./db'));