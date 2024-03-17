var Promise = require('promise');
var soap = require('soap');
var logger = require('../logger');
var settings = require('../settings');

function ReadSports() {
    return new Promise(function (fulfil, reject) {
        //fulfil(['כדורסל', 'כדורגל', 'טניס'])
        soap.createClient(settings.schoolSportServices.DataServiceUrl, function (err, client) {
            if (err) {
                logger.log('error', 'Error connecting to DataService: ', err);
                reject('ERROR');
            }
            else {
                logger.log('info', 'Reading sports from DataService...')
                client.GetSportsData({}, function (err, result) {
                    if (err) {
                        logger.log('error', 'Error consuming DataService: ', {
                                faultcode: err.faultcode,
                                faultstring: err.faultstring,
                                body: err.body
                            });
                        reject('ERROR');
                    }
                    else {
                        logger.log('info', 'Got sports data');
                        fulfil(result);
                    }
                });
            }
        });
    });
}

module.exports.sports = {
    read: ReadSports
};