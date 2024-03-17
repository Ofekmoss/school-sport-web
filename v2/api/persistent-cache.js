var logger = require('../../logger');
var settings = require('../../settings');
var Promise = require('promise');
var sql = require('mssql');
var category = "persistent-cache";
var connection = null;
var cachedUserData = {};

function WriteCacheValue(userId, dataKey, dataValue, dateCreated, dateModified) {
    if (typeof dateCreated === 'undefined' || dateCreated == null)
        dateCreated = new Date();
    if (typeof dateModified === 'undefined' || dateModified == null)
        dateModified = new Date();
    var exists = true;
    if (!cachedUserData[userId.toString()]) {
        exists = false;
        cachedUserData[userId.toString()] = {};
    }
    var userData = cachedUserData[userId.toString()][dataKey];
    if (userData == null) {
        exists = false;
        userData = {
            Created: dateCreated
        };
    }
    userData.Value = dataValue;
    userData.Modified = dateModified;
    cachedUserData[userId.toString()][dataKey] = userData;
    //console.log(cachedUserData);
    return exists;
}

function ValidateConnectionAndReadFromDatabase() {
    return new Promise(function (fulfil, reject) {
        if (connection == null) {
            connection = new sql.Connection(settings.sqlConfig, function(err) {
                if (err) {
                    logger.error('Persistent cache connection error: ' + (err.message || err));
                    reject('error creating connection');
                    connection = null;
                } else {
                    logger.info(category, "Database connection has been created");
                    var qs = 'Select UserId, DataKey, DataValue, DateCreated, DateLastModified From PersistentCache';
                    var request = connection.request();
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.info(category,'Warning: failed to read existing cache values: ' + (err.message || err));
                            fulfil('OK');
                        } else {
                            if (recordset != null) {
                                cachedUserData = {};
                                for (var i = 0; i < recordset.length; i++) {
                                    var row = recordset[i];
                                    var userId = row['UserId'];
                                    var dataKey = row['DataKey'];
                                    WriteCacheValue(row['UserId'], row['DataKey'], row['DataValue'],
                                        row['DateCreated'], row['DateLastModified'])
                                }
                                logger.info(category, "Read " + recordset.length + " existing rows from database");
                            }
                            fulfil('OK');
                        }
                    });
                }
            });
        } else {
            fulfil('OK');
        }
    });
}

function VerifyInput(userId, key) {
    return new Promise(function (fulfil, reject) {
        if (userId == null || userId < 0) {
            reject('missing or invalid user id');
        } else {
            if (key == null || key.toString().length === 0) {
                reject('missing cache key');
            } else {
                if (key.length > 255) {
                    reject('cache key is too long, max 255 characters');
                } else {
                    fulfil('OK');
                }
            }
        }
    });
}

module.exports.get = function(user, key, callback) {
    var userId = null;
    if (typeof user === 'number') {
        userId = user;
    } else if (user != null) {
        userId = user.id;
    }
    //console.log('getting persistent cache for user ' + user.id + ', key: ' + key);
    VerifyInput(userId, key).then(function() {
        key = key.toString();
        //console.log('input verified, validating connection and reading from database');
        ValidateConnectionAndReadFromDatabase().then(function() {
            //console.log('connection validated');
            var userData = cachedUserData[userId.toString()];
            if (userData != null) {
                //console.log('got user data');
                //console.log(userData);
                var dataObject = userData[key];
                var cachedValue = dataObject != null ? dataObject.Value : null;
                callback(null, cachedValue);
            } else {
                callback(null, null);
            }
        }, function(err) {
            console.log('error while validating connection and reading from database');
            console.log(err);
            callback(err);
        });
    }, function(err) {
        console.log('error while verifying input');
        console.log(err);
        callback(err);
    });
};

module.exports.set = function(user, key, value, callback) {
    var userId = null;
    if (typeof user === 'number') {
        userId = user;
    } else if (user != null) {
        userId = user.id;
    }
    VerifyInput(userId, key).then(function() {
        key = key.toString();
        ValidateConnectionAndReadFromDatabase().then(function() {
            //save in memory:
            var alreadyExists = WriteCacheValue(userId, key, value);

            //store in database:
            if (connection != null) {
                var qs = '';
                if (alreadyExists) {
                    //var qs = 'Select UserId, DataKey, DataValue, DateCreated, DateLastModified From PersistentCache';
                    qs = 'Update PersistentCache Set DataValue=@value, DateLastModified=GetDate() ' +
                        'Where UserId=@user And DataKey=@key';
                } else {
                    qs = 'Insert Into PersistentCache (UserId, DataKey, DataValue) ' +
                        'Values (@user, @key, @value)';
                }
                var request = connection.request();
                request.input('user', userId);
                request.input('key', key);
                request.input('value', value);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error setting cache value for user ' + userId + ': ' + (err.message || err));
                        connection = null; //reconnect next time reading or writing cache value
                        callback(err);
                    } else {
                        logger.info(category, "User " + userId + " set cache for " + key);
                        callback(null, {Status: 'Success'});
                    }
                });
            } else {
                logger.info(category, "Warning: no database connection, cache for user " + userId + " is memory only");
                callback(null, {Status: 'memory only'});
            }
        }, function(err) {
            callback(err);
        });
    }, function(err) {
        callback(err);
    });
};