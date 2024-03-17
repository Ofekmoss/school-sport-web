var path = require('path'),
    fs = require('fs');

var logger = require('../../logger');
var settings = require('../../settings');
var cache = require('../../api/cache');
var Season = require('../models/season');
var db = require('../models/db');

module.exports.MaxTeamPlayers = 20;

module.exports.requireSchoolLogin = function(req, res, next) {
    //allow admin to access all school data as well:
    if (req.session.user && req.session.user.roles && req.session.user.roles.indexOf('admin') >= 0) {
        next();
    } else {
        if (!req.session.user || !req.session.user.schoolID) {
            res.status(403).end();
        } else {
            next();
        }
    }
};

module.exports.requireCityLogin = function(req, res, next) {
    if (req.session && req.session.user && req.session.user.roles) {
        if (req.session.user.roles.indexOf('admin') >= 0 || req.session.user.roles.indexOf('sport-admin') >= 0) {
            if (req.query.city || req.query.team) {
                next();
                return;
            }
        }
    }
    if (!req.session.user || !req.session.user.cityID) {
        res.status(403).end();
    }
    else {
        next();
    }
};

module.exports.requireSchoolOrCityLogin = function(req, res, next) {
    if (req.session.user && (req.session.user.role === 1 || req.session.user.cityID || req.session.user.schoolID)) {
        next();
    }
    else {
        res.status(403).end();
    }
};

module.exports.hasRole = function (req, role) {
    return req.session.user && req.session.user.roles.indexOf(role) >= 0;
};

module.exports.requireRole = function () {
    var roles = {};
    for (var i = 0; i < arguments.length; i++) {
        roles[arguments[i]] = true;
    }
    return function (req, res, next) {
        if (req.session.user) {
            //console.log(req.session.user.roles);
            for (var i = 0; i < req.session.user.roles.length; i++) {
                if (roles[req.session.user.roles[i]]) {
                    next();
                    return;
                }
            }
            console.log('user has no access');
            console.log(req.session.user);
        }
        res.status(403).end();
    }
};

module.exports.requireQueryStringParams = function () {
    var requiredQsParams = [];
    for (var i = 0; i < arguments.length; i++) {
        var curArgument = arguments[i];
        if (typeof curArgument === 'string')
            requiredQsParams.push(curArgument);
    }
    return function (req, res, next) {
        for (var i = 0; i < requiredQsParams.length; i++) {
            var currentParam = requiredQsParams[i];
            // console.log(currentParam);
            var qsParamValue = req.query ? req.query[currentParam] : null;
            if (qsParamValue == null || qsParamValue.length === 0) {
                res.status(400).end('missing parameter: ' + currentParam);
                return;
            }
        }
        next();
    }
};

module.exports.addConfirmation = function(confirmation, user, callback) {
    db.connect().then(function (connection) {
        if (!confirmation.ConfirmedBy) {
            callback('Missing confirmed by data');
            return;
        }
        if (!confirmation.ConfirmedBy.Name) {
            callback('Missing confirmed by name');
            return;
        }
        if (!confirmation.School) {
            callback('Missing school');
            return;
        }
        if (!confirmation.Form) {
            callback('Missing confirmation form');
            return;
        }
        var fields = ['Season', 'ConfirmerName', 'ConfirmedForm', 'SchoolId'];
        var values = ['@season', '@name', '@form', '@school'];
        if (confirmation.ConfirmedBy.Id) {
            fields.push('ConfirmerId');
            values.push('@id');
        }
        if (confirmation.Value != null) {
            fields.push('ConfirmationValue');
            values.push('@value');
        }
        if (confirmation.Teams && confirmation.Teams.length > 0 && !confirmation.Comments) {
            confirmation.Comments = confirmation.Teams.join(',');
        }
        if (confirmation.Comments) {
            fields.push('ConfirmationComments');
            values.push('@comments');
        }
        Season.current(user, function(currentSeason) {
            var qs = 'Insert Into Confirmations (' + fields.join(', ') + ') ' +
                'Values (' + values.join(', ') + ')';
            var params = {
                season: currentSeason,
                name: confirmation.ConfirmedBy.Name,
                id: confirmation.ConfirmedBy.Id,
                school: confirmation.School,
                form: confirmation.Form,
                value: confirmation.Value,
                comments: confirmation.Comments
            };
            connection.request(qs, params).then(function (records) {
                connection.complete();
                callback(null);
            }, function (err) {
                connection.complete();
                callback('Error adding confirmation: ' + (err.msg || err.message || err));
            });
        });
    }, function (err) {
        callback(err);
    });
};

module.exports.getTeamsConfirmations = function(role, school, user, callback) {
    db.connect().then(function (connection) {
        if (!role) {
            callback('Missing role');
            return;
        }
        if (!school) {
            callback('Missing school');
            return;
        }
        Season.current(user, function(currentSeason) {
            var qs = 'Select ConfirmerName, ConfirmerId, DateConfirmed, ConfirmationValue, ConfirmationComments ' +
                'From Confirmations ' +
                'Where Season=@season And SchoolId=@school And ConfirmedForm=@form And ConfirmationComments Is Not Null ' +
                'Order By DateConfirmed Desc';
            var params = {
                season: currentSeason,
                school: school,
                form: role + '-teams'
            };
            connection.request(qs, params).then(function (records) {
                connection.complete();
                var teams = [];
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var rawTeams = record['ConfirmationComments'].split(',');
                    rawTeams.forEach(function (rawId) {
                        var teamId = parseInt(rawId, 10);
                        if (!isNaN(teamId) && teamId > 0) {
                            teams.push({
                                Id: teamId,
                                ConfirmedBy: {
                                    Id: record['ConfirmerId'],
                                    Name: record['ConfirmerName']
                                },
                                DateConfirmed: record['DateConfirmed'],
                                Value: record['ConfirmationValue']
                            });
                        }
                    });
                }
                callback(null, teams);
            }, function (err) {
                connection.complete();
                callback('Error reading team confirmations: ' + (err.msg || err.message || err));
            });
        });
    }, function (err) {
        callback(err);
    });
};

module.exports.getSchoolConfirmations = function(school, user, callback) {
    db.connect().then(function (connection) {
        if (!school) {
            callback('Missing school');
            return;
        }
        Season.current(user, function(currentSeason) {
            var qs = 'Select ConfirmerName, ConfirmerId, DateConfirmed, ConfirmationValue, ConfirmationComments, ConfirmedForm ' +
                'From Confirmations ' +
                'Where Season=@season And SchoolId=@school ' +
                'Order By DateConfirmed Desc';
            var params = {
                season: currentSeason,
                school: school
            };
            connection.request(qs, params).then(function (records) {
                connection.complete();
                var confirmatons = [];
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    confirmatons.push({
                        Form: record['ConfirmedForm'],
                        ConfirmedBy: {
                            Id: record['ConfirmerId'],
                            Name: record['ConfirmerName'],
                            Login: record['ConfirmationComments']
                        },
                        DateConfirmed: record['DateConfirmed'],
                        Value: record['ConfirmationValue']
                    });
                }
                callback(null, confirmatons);
            }, function (err) {
                connection.complete();
                callback('Error reading school confirmations: ' + (err.msg || err.message || err));
            });
        });
    }, function (err) {
        callback(err);
    });
};

module.exports.sendResult = function(res, err, data) {
    if (err) {
        //logger.error(err);
        if (err.status) {
            res.status(err.status).send(err.message);
        }
        else {
            res.status(500).end();
        }
    }
    else if (data == null) {
        res.status(204).end();
    }
    else {
        res.status(200).send(data);
    }
};

module.exports.sendError = function(res, err) {
    logger.error(err);
    if (err.status) {
        if (err.code) {
            res.status(err.status).send({
                code: err.code,
                message: err.message
            });
        }
        else {
            res.status(err.status).send(err.message);
        }
    }
    else {
        res.status(500).end();
    }
};

module.exports.sendTextError = function(res, text) {
    res.setHeader('Content-type', 'text/html');
    var rawHTML = '<div style="color: red; font-weight: bold; direction: rtl; text-align: center;">';
    rawHTML += text;
    rawHTML += '</div>'
    module.exports.sendResult(res, null, rawHTML);
};

function mkdirTree(dir) {
    if (!fs.existsSync(dir)) {
        var parent = path.dirname(dir);
        mkdirTree(parent);
        fs.mkdirSync(dir);
    }
}

module.exports.getFilePath = function (location, rootFolder) {
    if (typeof rootFolder === 'undefined' || rootFolder == null)
        rootFolder = settings.schoolContent;
    var baseName = path.basename(location);
    var dirName = path.dirname(path.join(rootFolder, location));
    if (fs.existsSync(dirName)) {
        var files = fs.readdirSync(dirName);
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var ext = path.extname(file);
            if (file.slice(0, -ext.length) == baseName) {
                return location + ext;
            }
        }
    }
    return null;
};

module.exports.moveFile = function (filePart, location, baseTargetFolder) {
    if (typeof baseTargetFolder === 'undefined' || baseTargetFolder == null)
        baseTargetFolder = settings.schoolContent;
    logger.info('api-utils', 'Moving file from ' + filePart.path + ' to ' + location);
    const BASE_COMMAND = 'icacls "$path" /grant "IUSR":R';
    var currentLocation = module.exports.getFilePath(location, baseTargetFolder);
    if (currentLocation != null) {
        logger.info('api-utils', 'current location: ' + currentLocation);
        fs.unlinkSync(path.join(baseTargetFolder, currentLocation));
    }
    var target = path.join(baseTargetFolder, location + path.extname(filePart.path));
    logger.info('api-utils', 'Target path:' + target);
    mkdirTree(path.dirname(target));
    fs.renameSync(filePart.path, target);
    logger.info('api-utils', 'Done, file has been renamed');
    const { exec } = require('child_process');
    exec(BASE_COMMAND.replace('$path', target), (err, stdout, stderr) => {
        if (err) {
            // node couldn't execute the command
            logger.error('Failed to change permissions for "' + target + '": ' + (err.message || err));
            return;
        }

        // the *entire* stdout and stderr (buffered)
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
};

module.exports.parseTeamActivities = function(team) {
    function getTimeText(time) {
        var min = time % 60;
        var hour = (time - min) / 60;
        return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
    }
    if (team.activity && team.activity.length > 0) {
        const days = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
        return team.activity.map(function (a) {
            if (a.day != null) {
                return days[a.day] +
                    (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                    (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
            }
            return "";
        }).filter(a => a.length > 0);
    } else {
        return [];
    }
};

module.exports.parseTeamHostingHours = function(team) {
    function getTimeText(time) {
        var min = time % 60;
        var hour = (time - min) / 60;
        return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
    }
    if (team.hostingHours && team.hostingHours.length > 0) {
        const days = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
        return team.hostingHours.map(function (a) {
            if (a.day != null) {
                return days[a.day] +
                    (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                    (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
            }
            return "";
        }).filter(a => a.length > 0);
    } else {
        return [];
    }
};

module.exports.parseDateTime = function(rawDate, format) {
    /**
     * @return {string}
     */
    function AddZero(num) {
        return num >= 0 && num < 10 ? '0' + num : num.toString();
    }
    if (rawDate == null || !rawDate)
        return '';
    var year = 0;
    var month = 0;
    var day = 0;
    var hours = 0;
    var minutes = 0;
    var seconds = 0;
    if (rawDate.getDate && rawDate.getFullYear) {
        year = rawDate.getFullYear();
        month = rawDate.getMonth() + 1;
        day = rawDate.getDate();
        hours = rawDate.getHours();
        minutes = rawDate.getMinutes();
        seconds = rawDate.getSeconds();
    } else {
        var parts = rawDate.split('T');
        var dateParts = parts[0].split('-');
        var timeParts = parts[1].split(':');
        timeParts[2] = timeParts[2].substring(0, 2);
        year = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10)-1;
        day = parseInt(dateParts[2], 10);
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        seconds = parseInt(timeParts[2], 10);
    }
    return format.replace('DD', AddZero(day))
        .replace('MM', AddZero(month))
        .replace('YYYY', year)
        .replace('HH', AddZero(hours))
        .replace('mm', AddZero(minutes))
        .replace('ss', AddZero(seconds));
};

module.exports.getCache = function(key, callback) {
    if (typeof callback === 'undefined' || callback == null)
        callback = function() {};

    cache.read(key).then(function (value) {
        callback(null, value);
    }, function (err) {
        if (err == 'empty') {
            callback(null, null);
        } else {
            callback(err.message || err);
        }
    });
};

module.exports.setCache = function(key, value, expireSeconds, callback) {
    if (typeof callback === 'undefined' || callback == null)
        callback = function() {};

    if (expireSeconds == null || expireSeconds <= 0)
        expireSeconds = 1;
    if (key == null || key.toString().length === 0) {
        callback('Missing key');
        return;
    }
    cache.write(key, value, expireSeconds).then(function () {
        console.log('Cache updated, key: ' + key);
        callback(null);
    }, function (err) {
        callback(err.message || err);
    });

};

module.exports.repeat = function(val, amount) {
    var result = '';
    for (var i = 0; i < amount; i++) {
        result += val;
    }
    return result;
};

module.exports.hideWhenEmpty = function(content) {
    var empty = true;
    if (typeof content !== 'undefined' && content != null) {
        if (Array.isArray(content)) {
            empty = content.length === 0;
        } else {
            empty = content.toString().length === 0;
        }
    }
    return empty ? 'display: none;' : '';
};

module.exports.parseDate = function(rawDate) {
    if (rawDate != null)
    {
        if (typeof rawDate.getFullYear === 'function' && rawDate.getFullYear() > 1900)
            return rawDate;
        rawDate = rawDate.toString();
        var parts = rawDate.split('-').filter(p => p.length > 0);
        if (parts.length === 3)
        {
            var year = parseInt(parts[0], 10);
            var month = parseInt(parts[1], 10);
            var day = parseInt(parts[2], 10);
            if (!isNaN(year) && year > 1900 && year < 2100 &&
                !isNaN(month) && month > 0 && month <= 12 &&
                !isNaN(day) && day > 0 && day <= 31)
            {
                var date = new Date(year, month - 1, day);
                if (date.getFullYear() === year)
                    return date;
            }
        }
    }
    return null;
};

module.exports.getDateRange = function(start, end) {
    var dtStart = module.exports.parseDate(start);
    if (dtStart != null) {
        var dtEnd = module.exports.parseDate(end);
        if (dtEnd != null && dtEnd > dtStart) {
            return {
                start: dtStart,
                end: dtEnd
            }
        }
    }
    return null;
};

module.exports.getIntOrDefault = function(rawValue, defaultValue) {
    if (typeof defaultValue === 'undefined')
        defaultValue = null;
    if (rawValue != null) {
        var intValue = parseInt(rawValue, 10);
        if (!isNaN(intValue))
            return intValue;
    }
    return defaultValue;
};

module.exports.cleanNonsense = function(value) {
    if (typeof value === 'undefined')
        return null;
    if (value == null)
        return null;
    var raw = value.toString();
    if (raw === '-1' || raw === 'true' || raw === 'null')
        return null;
    return value;
}

module.exports.removeField = function(mapping, fieldToRemove) {
    if (mapping != null && fieldToRemove != null && mapping.hasOwnProperty(fieldToRemove)) {
        var newMapping = {};
        for (var field in mapping) {
            if (mapping.hasOwnProperty(field) && field != fieldToRemove) {
                newMapping[field] = mapping[field];
            }
        }
        return newMapping;
    }
    return mapping;
}