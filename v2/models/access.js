var sportsman = require('../../api/sportsman');
var settings = require('../../settings');
var logger = require('../../logger');
var Season = require('./season');

var db = require('./db');

function getTokens(user, callback) {
    var school = user.schoolID;
    if (school) {
        Season.current(user, function(currentSeason) {
            db.connect().then(function (connection) {
                var qs = 'Select Token, Identifier, Email ' +
                    'From TokenLogins ' +
                    'Where dbo.ExtractBetweenDelimeters(Identifier, \'-\', \'-\')=@school ' +
                    '   And dbo.ExtractBetweenDelimeters(Identifier, \'\', \'-\')=@season';
                    //'   And Expiration>GetDate()';
                var queryParams = {
                    school: school,
                    season: currentSeason
                };
                connection.request(qs, queryParams).then(function (records) {
                    var tokens = [];
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        tokens.push({
                            type: record['Identifier'].split('-')[0],
                            token: record['Token']
                        });
                    }
                    callback(null, tokens);
                }, function(err) {
                    callback(err);
                });
            }, function(err) {
                callback(err);
            });
        });
    } else {
        callback(null, []);
    }
}

function getOrCreateTokens(user, callback) {
    var school = user.schoolID;
    var currentSeason = user.season;
    if (school) {
        db.connect().then(function (connection) {
            var qs = 'Select Token, Identifier, Email ' +
                'From TokenLogins ' +
                'Where dbo.ExtractBetweenDelimeters(Identifier, \'-\', \'-\')=@school ' +
                '   And dbo.ExtractBetweenDelimeters(Identifier, \'\', \'-\')=@season';
                //'   And Expiration>GetDate()';
            var queryParams = {
                school: school,
                season: currentSeason
            };
            connection.request(qs, queryParams).then(function (records) {
                var tokens = [];
                if (records.length > 0) {
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        tokens.push({
                            type: record['Identifier'].split('-')[0],
                            token: record['Token']
                        });
                    }
                    callback(null, tokens);
                } else {
                    var users = user.users.length > 0 ? user.users : [];
                    var query = "insert into TokenLogins(Token, Code, Identifier, Email, Expiration, UserDetails, Status) values ";
                    for (var i = 0; i < users.length; i++) {
                        var newToken = generateToken();
                        var el = users[i];
                        query += `('${newToken}', 
                        '${el.phone}', 
                        '${el.type == 1 ? "principal" : "representative"}-${school}-${currentSeason}', 
                        '${el.email}', 
                        '2035-06-30 01:00:00.000', 
                        '${JSON.stringify({
                            displayName: "Name",
                            schoolID: school,
                            regionID: el.region,
                            defaultRoute: el.type == 1 ? "principal-approval/teams" : "representative-approval/teams",
                            roles: el.type == 1 ? ["principal-approval"] : ["representative-approval"]
                        })}', 
                        0)`;
                        if (i == users.length - 1) {
                            query += ";";
                        } else {
                            query += ", "
                        }
                    }
                    console.log("================ GET OR CREATE TOKENS QUERY ================");
                    console.log(query);

                    if (users.length > 0) {
                        connection.request(query).then(function () {
                            var qs = 'Select Token, Identifier, Email ' +
                                'From TokenLogins ' +
                                'Where dbo.ExtractBetweenDelimeters(Identifier, \'-\', \'-\')=@school ' +
                                '   And dbo.ExtractBetweenDelimeters(Identifier, \'\', \'-\')=@season';
                                //'   And Expiration>GetDate()';
                            var queryParams = {
                                school: school,
                                season: currentSeason
                            };
                            return connection.request(qs, queryParams);
                        }).then(function (newTokens) {
                            for (var i = 0; i < newTokens.length; i++) {
                                var record = newTokens[i];
                                tokens.push({
                                    type: record['Identifier'].split('-')[0],
                                    token: record['Token']
                                });
                            }
                            callback(null, tokens);
                        })
                    } else {
                        callback(null, []);
                    }
                }
            }, function(err) {
                callback(err);
            });
        }, function(err) {
            callback(err);
        });
    } else {
        callback(null, []);
    }
}

function updateTokens(user, callback) {
    const school = user.schoolID;
    const currentSeason = user.season;

    if (school) {
        db.connect().then(function (connection) {
            var qs = 'Select Token, Identifier, Email ' +
                'From TokenLogins ' +
                'Where dbo.ExtractBetweenDelimeters(Identifier, \'-\', \'-\')=@school ' +
                '   And dbo.ExtractBetweenDelimeters(Identifier, \'\', \'-\')=@season';
                //'   And Expiration>GetDate()';
            var queryParams = {
                school: school,
                season: currentSeason
            };
            connection.request(qs, queryParams).then(function (records) {
                var tokens = [];
                const users = user.users.length > 0 ? user.users : [];
                const queryPromises = [];
                var query = "";

                if (records.length > 0) {
                    for (var i = 0; i < users.length; i++) {
                        const el = users[i];
                        if (el.type == 1) {
                            query = `update TokenLogins set Code = '${el.phone}' where Identifier = 'principal-${school}-${currentSeason}';`;
                        } else if (el.type == 2) {
                            query = `update TokenLogins set Code = '${el.phone}' where Identifier = 'representative-${school}-${currentSeason}';`;
                        }
        
                        if (query) {
                            queryPromises.push(connection.request(query));
                        }
                    }
                } else {
                    query = "insert into TokenLogins(Token, Code, Identifier, Email, Expiration, UserDetails, Status) values ";
                    for (var i = 0; i < users.length; i++) {
                        let newToken = generateToken();
                        var el = users[i];
                        query += `('${newToken}', 
                        '${el.phone}', 
                        '${el.type == 1 ? "principal" : "representative"}-${school}-${currentSeason}', 
                        '${el.email}', 
                        '2035-06-30 01:00:00.000', 
                        '${JSON.stringify({
                            displayName: "Name",
                            schoolID: school,
                            regionID: el.region,
                            defaultRoute: el.type == 1 ? "principal-approval/teams" : "representative-approval/teams",
                            roles: el.type == 1 ? ["principal-approval"] : ["representative-approval"]
                        })}', 
                        0)`;
                        if (i == users.length - 1) {
                            query += ";";
                        } else {
                            query += ", "
                        }

                    }

                    if (query) {
                        queryPromises.push(connection.request(query));
                    }
                }

                if (users.length > 0) {
                    // Wait for all queries to finish
                    Promise.all(queryPromises)
                        .then(() => {
                                var qs = 'Select Token, Identifier, Email ' +
                                    'From TokenLogins ' +
                                    'Where dbo.ExtractBetweenDelimeters(Identifier, \'-\', \'-\')=@school ' +
                                    '   And dbo.ExtractBetweenDelimeters(Identifier, \'\', \'-\')=@season';
                                    //'   And Expiration>GetDate()';
                                var queryParams = {
                                    school: school,
                                    season: currentSeason
                                };
                                return connection.request(qs, queryParams);
                        })
                        .then(function (newTokens) {
                            for (var i = 0; i < newTokens.length; i++) {
                                var record = newTokens[i];
                                tokens.push({
                                    type: record['Identifier'].split('-')[0],
                                    token: record['Token']
                                });
                            }
                            callback(null, tokens);
                        })
                        .catch(err => {
                            console.error('Query error:', err);
                            callback(err);
                        });
                } else {
                    callback(null, []);
                }
            })
        }).catch(err => {
            console.error('Database connection error:', err);
            callback(err);
        });
    } else {
        callback(null, []);
    }
}

function generateToken() {
    return Math.floor(Math.random() * 1000000000000000).toString(36) +
        Math.floor(Math.random() * 1000000000000000).toString(36) +
        Math.floor(Math.random() * 1000000000000000).toString(36);
}

function generateLogin(code, identifier, email, details, callback) {
    var now = new Date();
    var currentYear = now.getFullYear();
    var endOfSeasonThisYear = new Date(currentYear, 5, 30); //June 30th
    var endOfSeasonNextYear = new Date(currentYear + 1, 5, 30); //June 30th
    var expiration = endOfSeasonThisYear > now ? endOfSeasonThisYear : endOfSeasonNextYear;
    var result = {
        code: code,
        identifier: identifier,
        email: email,
        expiration: expiration,
        userDetails: JSON.stringify(details)
    };

    db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select Token as \"Token\" " +
                    "from TokenLogins " +
                    "where Identifier = @identifier",
                    {identifier: identifier})
                    .then(function (records) {
                        if (records.length > 0) {
                            var record = records[0];
                            result.token = records[0].Token;
                            return connection.request(
                                "update TokenLogins " +
                                "set Code = @code, " +
                                "  Email = @email, " +
                                "  Expiration = @expiration, " +
                                "  UserDetails = @userDetails, " +
                                "  Status = 0 " +
                                "where Token = @token",
                                result);
                        } else {
                            result.token = generateToken();
                            return connection.request(
                                "insert into TokenLogins(Token, Code, Identifier, Email, Expiration, UserDetails, Status) " +
                                "values(@token, @code, @identifier, @email, @expiration, @userDetails, 0)",
                                result);
                        }
                    })
                    .then(
                        function () {
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
}

function updateUserRegion(user, callback) {
    if (user.schoolID == null && user.role !== 1) {
        callback(null, user);
        return;
    }
    db.connect()
        .then(
            function (connection) {
                var request;
                if (user.role === 1) {
                    request = connection.request(
                        "select REGION_ID as \"Region\" " +
                        "from USERS " +
                        "where USER_ID = @user",
                        {user: user.id});
                }
                else {
                    request = connection.request(
                        "select REGION_ID as \"Region\" " +
                        "from SCHOOLS " +
                        "where SCHOOL_ID = @school",
                        {school: user.schoolID});
                }
                request
                    .then(
                        function (records) {
                            connection.complete();

                            if (records.length > 0) {
                                var record = records[0];
                                user.regionID = record.Region;
                            }

                            callback(null, user);
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
}

module.exports = {
    validate: function (username, password, callback) {
        sportsman.UserLogin(username, password).then(function(sportsmanUserDetails) {
            callback(null, true);
        }, function(err) {
            callback(null, false);
        });
    },
    generateLogin: generateLogin,
    getTokens: getTokens,
    getOrCreateTokens: getOrCreateTokens,
    updateTokens: updateTokens,
    login: function (params, callback) {
        function GetUserData(username, password, userid) {
            return new Promise(function (fulfil, reject) {
                sportsman.UserLogin(username, password, userid).then(function(sportsmanUserDetails) {
                    var caption = (typeof userid !== 'undefined' && userid != null) ? 'ADMIN OVERRIDE ' + userid : username;
                    logger.log('verbose', 'Got valid sportsman login for ' + caption);
                    // console.log(sportsmanUserDetails);
                    var role = 2;
                    if (sportsmanUserDetails.Admin)
                        role = 1;
                    else if (sportsmanUserDetails.Type === 4)
                        role = 4;
                    fulfil({
                        Id: sportsmanUserDetails.Id,
                        Seq: sportsmanUserDetails.Id + settings.Sportsman.UserOffset,
                        Name: sportsmanUserDetails.Name,
                        Role: role,
                        Type: sportsmanUserDetails.Type,
                        School: sportsmanUserDetails.School,
                        RegionId: sportsmanUserDetails.RegionId,
                        RegionName: sportsmanUserDetails.RegionName,
                        CityId: sportsmanUserDetails.CityId,
                        CityName: sportsmanUserDetails.CityName,
                        CoordinatedRegion: sportsmanUserDetails.CoordinatedRegion,
                        Login: sportsmanUserDetails.UserLogin
                    });
                }, function(err) {
                    reject(err);
                });
            });
        }

        if (params.username != null || params.userid != null) {
            GetUserData(params.username, params.password, params.userid).then(function (data) {
                if (data == null || data.Seq == null || data.Seq <= 0) {
                    callback({status: 401, message: "שם משמתמש או סיסמה שגויים"});
                } else {
                    if (params.username == null) {
                        params.username = data.Login;
                    }
                    var schoolSymbol = data.School ? data.School.Symbol : null;
                    var schoolID = data.School ? data.School.Id : null;
                    var coordinatedRegionId = data.CoordinatedRegion ? data.CoordinatedRegion.Id : null;
                    var coordinatedRegionName = data.CoordinatedRegion ? data.CoordinatedRegion.Name : null;
                    //logger.log('verbose', 'Got valid sportsman login for ' + username);
                    Season.current({id: data.Id, username: params.username}, function(currentSeason) {
                        var user = {
                            id: data.Id,
                            seq: data.Seq,
                            username: params.username,
                            displayName: data.Name,
                            role: data.Role,
                            schoolSymbol: schoolSymbol,
                            schoolID: schoolID,
                            regionID: data.RegionId,
                            regionName: data.RegionName,
                            cityID: data.CityId,
                            cityName: data.CityName,
                            year: data.Year,
                            coordinatedRegionID: coordinatedRegionId,
                            coordinatedRegionName: coordinatedRegionName,
                            season: currentSeason,
                            activeSeason: Season.active()
                        };
                        console.log(user);
                        if (data.Role === 1) {
                            user.defaultRoute = 'manage/dashboard';
                            user.roles = ['admin'];
                        }
                        else if (data.Type == 3) {
                            user.defaultRoute = 'supervisor/club-teams-approval';
                            user.roles = ['supervisor'];
                        }
                        else if (data.Type == 4) {
                            user.defaultRoute = 'finance/accounts';
                            user.roles = ['finance'];
                        }
                        else if (data.Type == 5) {
                            user.defaultRoute = 'registration/select';
                            user.roles = ['city'];
                        }
                        else if (data.Type == 6) {
                            user.defaultRoute = 'project-supervisor/project-teams-approval';
                            user.roles = ['sport-admin'];
                        }
                        else if (user.schoolID) {
                            user.defaultRoute = 'registration/select';
                            user.roles = ['school'];
                        } else {
                            console.log(user);
                            callback({status: 401, message: "סוג משתמש לא מזוהה"});
                            return;
                        }
                        updateUserRegion(user, function (err, user) {
                            if (err) {
                                logger.error(err);
                                callback({status: 401, message: "שם משמתמש או סיסמה שגויים"});
                            } else {
                                callback(null, user);
                            }
                        });
                    });
                }
            }, function (err) {
                logger.error(err);
                callback({status: 401, message: "שם משמתמש או סיסמה שגויים"});
            });
        }
        else if (params.token) {
            db.connect()
                .then(
                    function (connection) {
                        connection.request(
                            "select Code as \"Code\", Expiration as \"Expiration\", UserDetails as \"UserDetails\" " +
                            "from TokenLogins " +
                            "where Token = @token",
                            params)
                            .then(
                                function (records) {
                                    connection.complete();
                                    if (records.length > 0) {
                                        var record = records[0];
                                        //(record.Expiration == null || record.Expiration > new Date()) &&
                                        if (record.Code.trim() === params.code.trim()) {
                                            callback(null, JSON.parse(record.UserDetails));
                                            return;
                                        }
                                    }

                                    callback({status: 401, message: "קוד התחברות שגוי"});
                                },
                                function (err) {
                                    connection.complete();
                                    logger.error(err);
                                    callback({status: 500, message: "שגיאה בנסיון התחברות"});
                                }
                            )
                    },
                    function (err) {
                        logger.error(err);
                        callback({status: 500, message: "שגיאה בנסיון התחברות"});
                    });
        }
    }
};