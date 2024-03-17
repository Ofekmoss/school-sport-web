var Promise = require('promise');
var logger = require('../logger');
var NodeCache = require( "node-cache" );

var pCache = require('../v2/api/persistent-cache');
var myCache = new NodeCache();

function extractUserId(key) {
    var parts = key.split('-');
    if (parts.length > 1) {
        var rawId = parts[1];
        if (rawId === '*')
            return 0;
        var id = parseInt(rawId, 10);
        if (!isNaN(id) && id > 0)
            return id;
    }
    return null;
}

function readCache(key) {
    return new Promise(function (fulfil, reject) {
        var userId = extractUserId(key);
        if (userId === 0) {
            //global, read from database
            pCache.get(userId, key, function(err, cachedValue) {
                if (err) {
                    reject(err);
                } else {
                    fulfil(cachedValue);
                }
            });
        } else {
            myCache.get(key, function (err, value) {
                if (!err) {
                    if (value == undefined)
                        value = null;
                } else {
                    logger.log('error', 'Error reading cache: ' + err);
                    value = null;
                }
                if ((value == null || value.length === 0) && userId != null) {
                    //maybe stored globally?
                    pCache.get(userId, key, function(err, cachedValue) {
                        if (err) {
                            fulfil(value);
                        } else {
                            fulfil(cachedValue);
                        }
                    });
                } else {
                    if (value == null) {
                        reject('empty');
                    } else {
                        fulfil(value);
                    }
                }
            });
        }
    });
}

function writeCache(key, value, expireTimeSeconds) {
    if (typeof expireTimeSeconds == 'undefined')
        expireTimeSeconds = 600;

    var writeToDatabase = expireTimeSeconds >= 9000000;
    return new Promise(function (fulfil, reject) {
        myCache.set(key, value, expireTimeSeconds, function( err, success ){
            if(!err && success) {
                if (writeToDatabase) {
                    var userId = extractUserId(key);
                    if (userId != null) {
                        pCache.set(userId, key, value, function (err, response) {
                            fulfil('OK');
                        });
                    } else {
                        logger.log('warning', 'Trying to write cache key "' + key + '" to database but no user ID');
                        fulfil('OK');
                    }
                } else {
                    fulfil('OK');
                }
            } else {
                if (err) {
                    logger.log('error', 'Error setting cache: ' + err);
                    reject('error');
                } else {
                    logger.log('error', 'Failed to set cache key ' + key);
                    reject('failed');
                }
            }
        });
    });
}

module.exports.read = readCache;
module.exports.write = writeCache;