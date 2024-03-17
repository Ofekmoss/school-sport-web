function BuildCustomObject(row, title, fields) {
    var customObject = {};
    if (title.length > 1 && title.indexOf('*') === title.length - 1) {
        title = title.substring(0, title.length - 1);
        fields = [];
        for (var fieldName in row) {
            if (row.hasOwnProperty(fieldName)) {
                if (fieldName.indexOf(title) === 0) {
                    fields.push(fieldName.replace(title, ''));
                }
            }
        }
    }
    //console.log(fields);
    var allNull = true;
    fields.forEach(function(field) {
        var curValue = row[title + field];
        customObject[field] = curValue;
        if (curValue != null) {
            allNull = false;
        }
    });
    return allNull ? null : customObject;
}

function BuildContactObject(row, title, additionalFields, fieldsContainer) {
    if (typeof additionalFields === 'undefined')
        additionalFields = [];
    if (typeof fieldsContainer === 'undefined')
        fieldsContainer = null;
    var fields = ['Name', 'PhoneNumber', 'Email'];
    additionalFields.forEach(function(additionalField) {
        fields.push(additionalField);
    });
    if (Array.isArray(fieldsContainer)) {
        fields.forEach(function(field) {
            fieldsContainer.push(field);
        });
    }
    return BuildCustomObject(row, title, fields);
}

module.exports.buildSqlConditions = function (filters, possibleConditions, index) {
    if (typeof index === 'undefined')
        index = null;
    var conditions = [];
    for (var filterName in possibleConditions) {
        if (possibleConditions.hasOwnProperty(filterName)) {
            var curValue = filters[filterName];
            if (curValue != null && (!Number.isInteger(curValue) || (Number.isInteger(curValue) && !isNaN(curValue)))) {
                var fieldName = possibleConditions[filterName];
                if (index != null && index >= 0 && Array.isArray(fieldName))
                    fieldName = fieldName[index];
                if (Array.isArray(curValue)) {
                    conditions.push(fieldName + ' In (' + curValue.join(', ') + ')');
                } else {
                    conditions.push(fieldName + '=@' + filterName);
                }
            }
        }
    }
    return conditions;
};

module.exports.buildSimpleObject = function (row, idField, nameField) {
    var simpleObject = {
        Id: row[idField],
        Name: row[nameField]
    };
    return simpleObject;
};

module.exports.truncateContactData = function(row, title) {
    var fields = [];
    var contactObject = BuildContactObject(row, title, [], fields);
    fields.forEach(function(fieldName) {
        delete row[title + fieldName];
    });
    return contactObject;
};

module.exports.truncateCustomData = function(row, title, fields) {
    var customObject = BuildCustomObject(row, title, fields);
    fields.forEach(function(fieldName) {
        delete row[title + fieldName];
    });
    return customObject;
};

module.exports.buildConnectionRequest = function(sportsmanConnection, filters) {
    var request = sportsmanConnection.request();
    for (var filterName in filters) {
        if (filters.hasOwnProperty(filterName)) {
            var curValue = filters[filterName];
            if (!Array.isArray(curValue))
                request.input(filterName, curValue);
        }
    }
    return request;
};

module.exports.mapArray = function(array, keyProperty) {
    var mapping = {};
    array.forEach(function(curItem) {
        mapping[curItem[keyProperty].toString()] = curItem;
    });
    return mapping;
};

module.exports.applyCallbackArgument = function(args) {
    var callback = null;
    for (var i = 0; i < args.length; i++) {
        var curArgument = args[i];
        if (typeof curArgument === 'function') {
            callback = curArgument;
            for (var j = i; j < args.length; j++) {
                args[j] = null;
            }
            break;
        }
    }
    return callback;
};

module.exports.parseTeamActivities = function(rawActivity) {
    /**
     * @return {string}
     */
    function ParseHour(rawValue) {
        var hourAndMinutes = rawValue / 60;
        var hour = Math.floor(hourAndMinutes);
        var minutes = Math.ceil(60 * (hourAndMinutes - hour));
        return [hour, minutes >= 0 && minutes < 10 ? '0' + minutes : minutes].join(':');
    }

    if (rawActivity != null) {
        var activities = null;
        try {
            activities = JSON.parse(rawActivity);
        }
        catch (err) {
            console.log('Error parsing team activity: ' + err);
        }
        if (activities != null) {
            var days = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];
            activities = activities.map(function(activity) {
                return {
                    Day: days[activity.day],
                    StartTime: ParseHour(activity.startTime),
                    EndTime: ParseHour(activity.endTime)
                };
            });
            return activities;
        }
    }
    return null;
};

module.exports.findNonEmptyMatchesOrDefault = function(array, propertyName, defaultValue) {
    var matches = array.filter(item => item[propertyName] != null && item[propertyName].toString().length > 0).map(item => item[propertyName]);
    if (matches.length === 0) {
        matches.push(defaultValue);
    }
    return matches;
};

module.exports.spliceString = function(string, start, delCount, newSubStr) {
    var clonedString = string + '';
    return clonedString.slice(0, start) + newSubStr + clonedString.slice(start + Math.abs(delCount));
};

module.exports.teamNumberToIndex = function(teamNumber) {
    if (teamNumber != null && teamNumber.length > 0) {
        //integer?
        var num = parseInt(teamNumber, 10);
        if (!isNaN(num) && num > 0)
            return num;
        var possibleLetters = 'אבגד';
        var index = possibleLetters.indexOf(teamNumber.replace("'", ""));
        return index >= 0 ? index + 1 : null;
    }
    return null;
};

module.exports.clearUndefinedValues = function(objectMapping) {
    for (var key in objectMapping) {
        if (objectMapping.hasOwnProperty(key)) {
            var curValue = objectMapping[key];
            if (typeof curValue === 'undefined' || curValue === 'undefined')
                objectMapping[key] = null;
        }
    }
}

module.exports.buildCustomObject = BuildCustomObject;
module.exports.buildContactObject = BuildContactObject;