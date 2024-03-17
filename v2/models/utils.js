var fs = require('fs'),
    path = require('path');

var settings = require('../../settings');

function checkHasTotoSupport(sport, schoolSymbol) {
    if (sport === 16) {
        return true;
    }
    else if (sport === 24) {
        return ["444737", "570077", "566893", "541037", "540062", "544208", "540435", "444315", "441287", "540161", "544072", "999999"]
            .indexOf(schoolSymbol) >= 0;
    }
    return false;
}

function getSchoolType(fromGrade, toGrade) {
    if (fromGrade === 1) {
        if (toGrade === 6) {
            return 0;
        }
        else if (toGrade === 8) {
            return 1;
        }
    }
    else if (fromGrade === 7) {
        if (toGrade === 9) {
            return 2;
        }
        else if (toGrade > 11) {
            return 3;
        }
    }
    else if (fromGrade === 9) {
        if (toGrade > 11) {
            return 4;
        }
    }
    else if (fromGrade === 10) {
        if (toGrade > 11) {
            return 5;
        }
    }
    return null;
}

var gradeNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", "י\"א", "י\"ב", "י\"ג", "י\"ד"];

function gradesToString(grades) {
    var result = null;

    var grade = 0;
    var start;

    while (grades !== 0)
    {
        while (grades !== 0 && (grades & 0x1) === 0)
        {
            grade++;
            grades = grades >> 1;
        }

        if (grades !== 0)
        {
            start = grade;

            while ((grades & 0x1) === 1)
            {
                grade++;
                grades = grades >> 1;
            }
            //throw new Exception("invalid grade start index: "+start.ToString());
            var g = gradeNames[Math.max(start, 0)];

            if (start !== (grade-1))
                g += "-" + gradeNames[Math.min(grade - 1, 13)];
            if (result == null)
                result = g;
            else
                result = result + ", " + g;
        }
    }

    return result;
}

function categoryToString(category) {
    var boys = category & 0xFFFF;
    var girls = (category >> 16) & 0xFFFF;

    if (boys === girls)
    {
        if (boys === 0)
            return null;

        return gradesToString(boys) + " תלמידים/ות";
    }

    if (boys === 0)
        return gradesToString(girls) + " תלמידות";
    if (girls === 0)
        return gradesToString(boys) + " תלמידים";

    return gradesToString(boys) + " תלמידים, " +
        gradesToString(girls) + " תלמידות";
}

function checkOnePaymentPerCategorySport(sport) {
    var sportsIds = settings.onePaymentPerCategorySports || [];
    return sportsIds.indexOf(sport) !== -1;
}

function capitalizeFirstLetter(word) {
    return word[0].toUpperCase() + word.slice(1);
}

module.exports = {
    checkHasTotoSupport: checkHasTotoSupport,
    getSchoolType: getSchoolType,
    categoryToString: categoryToString,
    checkOnePaymentPerCategorySport: checkOnePaymentPerCategorySport
};


function mkdirTree(dir) {
    if (!fs.existsSync(dir)) {
        var parent = path.dirname(dir);
        mkdirTree(parent);
        fs.mkdirSync(dir);
    }
}

module.exports.getFilePath = function (location, fullPath) {
    var rootFolder = settings.schoolContent;
    var baseName = path.basename(location);
    var dirName = path.dirname(path.join(settings.schoolContent, location));
    if (fs.existsSync(dirName)) {
        var files = fs.readdirSync(dirName);
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var ext = path.extname(file);
            if (file.slice(0, -ext.length) == baseName) {
                return fullPath ? path.join(dirName, file) : location + ext;
            }
        }
    }
    return null;
};

module.exports.getOldFilePath = function (name) {
    var files = fs.readdirSync(settings.Sportsman.PlayerFilesFolder);
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var ext = path.extname(file);
        if (file.slice(0, -ext.length) === name) {
            return path.join(settings.Sportsman.PlayerFilesFolder, file);
        }
    }
    return null;
};

module.exports.copyFile = function (filePath, location, returnFullPath) {
    var currentLocation = module.exports.getFilePath(location);
    if (currentLocation != null) {
        fs.unlinkSync(path.join(settings.schoolContent, currentLocation));
    }
    var rootFolder = settings.schoolContent;
    var fullLocation = location + path.extname(filePath);
    var target = path.join(settings.schoolContent, fullLocation);
    mkdirTree(path.dirname(target));
    //fs.copyFileSync(filePath, target);
    fs.createReadStream(filePath).pipe(fs.createWriteStream(target));
    return returnFullPath ? target : fullLocation;
};

module.exports.parseJsonOrEmpty = function(s, def) {
    try {
        if (s) {
            return JSON.parse(s);
        }
    }
    catch (e) {

    }
    return def === undefined ? {} : def;
};

module.exports.translateGrade = function(grade) {
    var grades = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'י"א', 'י"ב'];
    if (grade != null && grade >= 0 && grade < grades.length)
        return grades[grade];
    else
        return '';
};

module.exports.getBasicEntity = function(record, idField, nameField, additional) {
    if (idField.indexOf('_') === idField.length - 1 && (typeof nameField === 'undefined' || nameField == null)) {
        nameField = idField + 'NAME';
        idField += 'ID';
    }
    if (typeof additional === 'undefined') {
        additional = [];
    }
    var entityId = record[idField];
    if (entityId == null) {
        return null;
    } else {
        var entityName = record[nameField];
        var entity = {
            id: entityId,
            name: entityName
        };
        if (additional != null && additional.length > 0) {
            additional.forEach(fieldName => {
                entity[fieldName.toLowerCase()] = record[fieldName];
            });
        }
        return entity;
    }
};

module.exports.makeShallowCopy = function(record) {
    var copy = {};
    for (var colName in record) {
        if (record.hasOwnProperty(colName)) {
            copy[colName] = record[colName];
        }
    }
    return copy;
};

module.exports.flattenArray = function(complexCollection) {
    var array = [];
    for (var key in complexCollection) {
        if (complexCollection.hasOwnProperty(key)) {
            array.push(complexCollection[key]);
        }
    }
    return array;
};

module.exports.explode = function(dataObject, fieldToExplode) {
    var explosiveData = dataObject[fieldToExplode];
    if (explosiveData != null) {
        for (var propertyName in explosiveData) {
            if (explosiveData.hasOwnProperty(propertyName)) {
                var explodedPropertyName = fieldToExplode + capitalizeFirstLetter(propertyName);
                dataObject[explodedPropertyName] = explosiveData[propertyName];
            }
        }
    }
};

module.exports.arrayContains = function(array, value, propertyName) {
    if (typeof propertyName === 'undefined')
        propertyName = null;
    if (propertyName == null || propertyName.length === 0)
        return array.indexOf(value) >= 0;
    var exists = false;
    for (var i = 0; i < array.length; i++) {
        var curItem = array[i];
        var curValue = curItem[propertyName];
        if (curValue == value) {
            exists = true;
            break;
        }
    }
    return exists;
};

module.exports.toIntOrDefault = function(rawValue, defaultValue) {
    if (typeof defaultValue === 'undefined')
        defaultValue = 0;
    if (typeof rawValue !== 'undefined' && rawValue != null) {
        var intValue = parseInt(rawValue, 10);
        if (!isNaN(intValue))
            return intValue;
    }
    return defaultValue;
};

module.exports.distinctArray = function(array) {
    var mapping = {};
    var distinctItems = [];
    for (var i = 0; i < array.length; i++) {
        var x = array[i] == null ? '' : array[i];
        var key = x.toString();
        if (!mapping[key]) {
            distinctItems.push(x);
            mapping[key] = true;
        }
    }
    return distinctItems;
};

module.exports.ensureFieldLength = function(rawValue, maxLength) {
    if (typeof maxLength === 'undefined')
        maxLength = 0;
    if (rawValue != null && maxLength > 0 && rawValue.length > maxLength) {
        return rawValue.substr(0, maxLength);
    }
    return rawValue;
};

/*
Does the object contain at least one of the array items as a key?
*/
module.exports.containsAtLeastOne = function(object, array) {
    var contains = false;
    if (object != null && array != null && Array.isArray(array)) {
        for (var i = 0; i < array.length; i++) {
            var curItem = array[i];
            if (object.hasOwnProperty(curItem) && object[curItem] != null) {
                contains = true;
                break;
            }
        }
    }
    return contains;
};

module.exports.isTrue = function(value) {
    if (value != null) {
        var stringValue = value.toString();
        return stringValue === 'true' || stringValue === '1' || stringValue === 'y' || stringValue === 'yes';
    }
    return false;
}