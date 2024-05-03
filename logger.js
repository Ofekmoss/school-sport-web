var winston = require('winston');
/**
 * Requiring `winston-mongodb` will expose
 * `winston.transports.MongoDB`
 */
var settings = require('./settings');
var transports = [
    new winston.transports.Console({ json: false, timestamp: true, level: 'verbose' })
];

var isLoggingToFileDisabled = process.env.DISABLE_LOGGING_TO_FILE === 'true';
if (!isLoggingToFileDisabled) {
    transports.push(new winston.transports.File({
        json: false,
        level: 'verbose',
        filename: settings.logFile,
        handleExceptions: true,
        maxsize: 4000000
    }));
}

var logger = new winston.Logger({
    transports: transports,
    exitOnError: false
});

module.exports = logger;
