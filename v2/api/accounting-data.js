var express = require('express');
var router = express.Router();

var util = require('./util');

var AccountingData = require('../models/accounting-data');

function toXml(object) {
    var result = "<" + object.Type;
    var contents = {};
    for (var key in object) {
        if (key === "Type") {
            continue;
        }
        var value = object[key];
        if (value != null) {
            if (Array.isArray(value)) {
                contents[key] = value;
            }
            else if (typeof value === "string") {
                result += " " + key + "=\"" + value.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;') + "\"";
            }
            else if (typeof value === "number") {
                result += " " + key + "=\"" + value + "\"";
            }
            else {
                contents[key] = value;
            }
        }
    }

    result += ">";

    for (var key in contents) {
        var value = contents[key];
        if (Array.isArray(value)) {
            result += "<" + key + ">";
            for (var n = 0; n < value.length; n++) {
                result += toXml(value[n]);
            }
            result += "</" + key + ">";
        }
        else {
            result += toXml(value);
        }
    }

    result += "</" + object.Type + ">";

    return result;
}

router.get('/', util.requireRole('admin'), function (req, res) {
    if (!req.query.from || !req.query.to) {
        // Used to check permissions
        res.status(204).end();
        return;
    }
    AccountingData.get(new Date(req.query.from), new Date(req.query.to), function (err, result) {
        util.sendResult(res, err, result);//toXml(result));
    });
});

module.exports = router;