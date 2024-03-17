var fs = require('fs');

var category = "processes";

var logger = require('../../logger');

fs.readdirSync(__dirname).forEach(function (file) {
    var extIndex = file.indexOf('.js', file.length - 3);
    if (extIndex >= 0) {
        var name = file.slice(0, extIndex);
        if (name !== "index") {
            logger.info(category, "Starting process '" + name + "'");
            try {
                require('./' + name);
            }
            catch (err) {
                logger.error(category, "Process '" + name + "' failed: " + err);
            }
        }
    }
});
