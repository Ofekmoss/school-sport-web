var winston = require('winston');
/**
 * Requiring `winston-mongodb` will expose
 * `winston.transports.MongoDB`
 */
var settings = require('./settings');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ json: false, timestamp: true, level: 'verbose' }),
        new winston.transports.File({
            json: false,
            level: 'verbose',
            filename: settings.logFile,
            handleExceptions: true,
            maxsize: 4000000
        })
    ],
    exitOnError: false
});

module.exports = logger;
