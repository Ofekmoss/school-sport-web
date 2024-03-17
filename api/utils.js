// var edge = process.version.indexOf('v10') === 0 ? require('edge-js') : require('edge');
var crypto = require('./crypto');

function GlobalReplace(s, r, w) {
    var t = s.toString();
    while (t.indexOf(r) >= 0)
        t = t.replace(r, w);
    return t;
}

/**
 * @return {string}
 */
function PadZero(value) {
    var num = parseInt(value, 10 );
    if (isNaN(num))
        return value;
    return num >= 0 && num < 10 ? '0' + num : num.toString();
}

function CopyRecord(record) {
    var row = {};
    for (var fieldName in record) {
        row[fieldName] = record[fieldName];
    }
    return row;
}

/**
 * @return {string}
 */
function SportsmanEncode(rawValue) {
    // var encode = edge.func(require('path').join(__dirname, 'crypto-encode.csx'));
    // return encode(rawValue, true);
    return crypto.Encode(rawValue);
}


/*
function SportsmanDecode(rawValue) {
    // var decode = edge.func(require('path').join(__dirname, 'crypto-decode.csx'));
    // return decode(rawValue, true);
    return '';
}
 */

/**
 * @return {string}
 */
function SanitizeDatabaseValue(rawValue) {
    var allowedCharacters = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNMפםןוטארקשדגכעיחלךףץתצמנהבסז1234567890-\' /';
    return rawValue.split('').filter(function(curChar) {
        return allowedCharacters.indexOf(curChar) >= 0;
    }).join('');
}

function VerifyUser(user, roles) {
    if (!user || !user.seq)
        return false;

    if (typeof roles != 'undefined') {
        if (typeof roles == 'string' || !roles.hasOwnProperty('length'))
            roles = [roles];
        var userRole = user.role;
        for (var i = 0; i < roles.length; i++) {
            var curRole = roles[i];
            if (curRole == userRole)
                return true;
        }
        return false;
    }

    return true;
}

function IsArray(obj){
    return !!obj && obj.constructor === Array;
}

function StripAllTags(rawText) {
    if (rawText == null || !rawText)
        return '';

    var cleanResponse = '';
    var insideTag = false;
    var tagBuffer = '';
    var characters = rawText.split('');
    for (var i = 0; i < characters.length; i++) {
        var curChar = characters[i];
        if (curChar == '<') {
            if (!insideTag) {
                insideTag = true;
                tagBuffer = '<';
            } else {
                cleanResponse += curChar;
            }
        } else if (curChar == '>') {
            if (insideTag) {
                insideTag = false;
                tagBuffer = '';
            } else {
                cleanResponse += curChar;
            }
        } else {
            if (insideTag) {
                tagBuffer += curChar;
            } else {
                cleanResponse += curChar;
            }
        }
    }
    if (tagBuffer.length > 0 && insideTag)
        cleanResponse += tagBuffer;
    return cleanResponse;
}

function IsValidEmail(rawEmail, allowBlank) {
    if (typeof allowBlank == 'undefined')
        allowBlank = false;
    var email = (rawEmail ||'').toString().trim();
    if (email.length == 0)
        return allowBlank;
    var parts = email.split('@');
    if (parts.length != 2)
        return false;
    var name = parts[0].trim(), domain = parts[1].trim();
    if (name.length == 0 || domain.length == 0)
        return false;
    if (domain.substr(0, 1) == '.' || domain.substr(domain.length - 1, 1) == '.' || domain.indexOf('.') < 0)
        return false;
    return true;
}

function IsValidInteger(rawValue) {
    return !isNaN(Number(rawValue)) && rawValue % 1 === 0;
}

function IsValidCellPhoneNumber(rawPhoneNumber, allowBlank) {
    if (typeof allowBlank == 'undefined')
        allowBlank = false;

    var phoneNumber = (rawPhoneNumber ||'').toString().trim().replace('+', '').replace('972', '');
    if (phoneNumber.length == 0)
        return allowBlank;

    if (phoneNumber.length < 10)
        return false;

    var prefixWhiteList = '050,052,053,054,055,056,058';
    var leftPart = '', rightPart = '';
    if (phoneNumber.indexOf('-') > 0) {
        var parts = phoneNumber.split('-');
        leftPart = parts[0];
        rightPart = parts[1];
    } else {
        leftPart = phoneNumber.substr(0, 3);
        rightPart = phoneNumber.substr(3);
    }

    if (leftPart.length != 3 || rightPart.length != 7)
        return false;

    if (!IsValidInteger(leftPart) || !IsValidInteger(rightPart))
        return false;

    if (prefixWhiteList.indexOf(leftPart) < 0)
        return false;

    return true;
}

function GetAllBetween(rawText, leftDelimeter, rightDelimeter) {
    var tempArray = rawText.split(leftDelimeter);
    if (tempArray.length <= 1)
        return [];
    var result = [];
    for (var i = 1; i < tempArray.length; i++)
        result.push(tempArray[i].split(rightDelimeter)[0]);
    return result;
}

function DistinctArray(array) {
    var mapping = {};
    var distinctItems = [];
    for (var i = 0; i < array.length; i++) {
        var x = array[i] == null ? '' : array[i];
        if (!mapping[x.toString()]) {
            distinctItems.push(x);
            mapping[x.toString()] = true;
        }
    }
    return distinctItems;
}

function FlattenArray(arrayOfArrays) {
    var flatArray = [];
    for (var i = 0; i < arrayOfArrays.length; i++) {
        var curArray = arrayOfArrays[i];
        for (var j = 0; j < curArray.length; j++) {
            var curItem = curArray[j];
            flatArray.push(curItem);
        }
    }
    return flatArray;
}

function ExcludeProperties(array, propertiesToExclude) {
    if (typeof propertiesToExclude === 'undefined' || propertiesToExclude == null)
        propertiesToExclude = [];
    if (propertiesToExclude.length > 0) {
        array = array.map(item => {
            var newItem = {};
            for (var propertyName in item) {
                if (item.hasOwnProperty(propertyName) && propertiesToExclude.indexOf(propertyName) < 0)
                {
                    newItem[propertyName] = item[propertyName];
                }
            }
            return newItem;
        });
    }
    return array;
}

function GetSafeNumber(rawValue, defaultValue) {
    if (typeof defaultValue == 'undefined')
        defaultValue = 0;
    if (typeof rawValue == 'undefined')
        rawValue = defaultValue;
    var safeNumber = parseInt(rawValue);
    if (isNaN(safeNumber))
        return defaultValue;
    return safeNumber;
}

function GetKeys(array) {
    var keys = [];
    for (var key in array) {
        keys.push(key);
    }
    return keys;
}

function SumArray(array, relative) {
    var sum = 0;
    if (relative) {
        for (var key in array) {
            sum += array[key];
        }
    } else {
        for (var i = 0; i < array.length; i++) {
            sum += array[i];
        }
    }
    return sum;
}

function ToAssociativeArray(plainArray) {
    var mapping = {};
    for (var i = 0; i < plainArray.length; i++) {
        var curItem = plainArray[i];
        if (curItem != null) {
            var key = curItem.toString();
            mapping[key] = true;
        }
    }
    return mapping;
}

//

/**
 * @return {string}
 */
function FormatDate(date, sFormat) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    if (typeof sFormat === 'undefined') {
        sFormat = 'dd/MM/yyyy';
    }
    var formatted = sFormat + '';
    var day = date.getDate();
    var paddedDay = day < 10 ? '0' + day : day.toString();
    var month = date.getMonth() + 1;
    var paddedMonth = month < 10 ? '0' + month : month.toString();
    var fullYear = date.getFullYear();
    while (formatted.indexOf('dd') >= 0)
        formatted = formatted.replace('dd', paddedDay);
    while (formatted.indexOf('d') >= 0)
        formatted = formatted.replace('d', day.toString());
    while (formatted.indexOf('MM') >= 0)
        formatted = formatted.replace('MM', paddedMonth);
    while (formatted.indexOf('M') >= 0)
        formatted = formatted.replace('M', month.toString());
    while (formatted.indexOf('yyyy') >= 0)
        formatted = formatted.replace('yyyy', fullYear.toString());
    return formatted;
}

function ParseDateTime(rawValue) {
    if (rawValue == null || !rawValue || rawValue.length < 8)
        return null;

    var parts = rawValue.split(' ');
    var rawDate = parts[0];
    var rawTime = parts.length > 1 && parts[1].length > 0 ? parts[1] : '';
    if (rawDate.length <= 7)
        return null;

    var dateParts = rawDate.split('/');
    if (dateParts.length != 3)
        return null;

    var day = parseInt(dateParts[0]);
    var month = parseInt(dateParts[1]);
    var year = parseInt(dateParts[2]);
    if (isNaN(day) || day < 1 || day > 31 ||
        isNaN(month) || month < 1 || month > 12 ||
        isNaN(year) || year < 1900 || year > 2200)
        return null;

    var dateTime = new Date();
    dateTime.setDate(1);
    dateTime.setMonth(month - 1);
    dateTime.setFullYear(year);
    dateTime.setDate(day);
    if (rawTime.length == 5) {
        var timeParts = rawTime.split(':');
        if (timeParts.length == 2) {
            var hours = parseInt(timeParts[0]);
            var minutes = parseInt(timeParts[1]);
            if (!isNaN(hours) && hours >= 0 && hours <= 23 &&
                !isNaN(minutes) && minutes >= 0 && minutes <= 59) {
                dateTime.setHours(hours);
                dateTime.setMinutes(minutes);
                dateTime.setSeconds(0);
            }
        }
    } else {
        dateTime.setHours(0);
        dateTime.setMinutes(0);
        dateTime.setSeconds(0);
    }
    return dateTime;
}

function GeneratePassword(minLength, maxLength) {
    if (minLength > maxLength)
        minLength = 1;
    var smallCaseLetters = 'abcdefghijklmnopqrstuvwxyz'
    var upperCaseLetters = smallCaseLetters.toUpperCase();
    var digits = '0123456789';
    var possibleCharacters = [smallCaseLetters, upperCaseLetters, digits].join('');
    var passwordLength = 0;
    if (minLength == maxLength) {
        passwordLength = minLength;
    } else {
        while (passwordLength < minLength) {
            passwordLength = Math.ceil(Math.random() * maxLength);
        }
    }
    var randomCharacters = [];
    for (var i = 0; i < passwordLength; i++) {
        var curIndex = Math.floor(Math.random() * possibleCharacters.length);
        randomCharacters.push(possibleCharacters.charAt(curIndex));
    }
    return randomCharacters.join('');
}

function ContainsHebrew(strText) {
    var allHebrewLetters = 'קראטוןםפשדגכעיחלךףזסבהנמצתץ';
    var arrLetters = allHebrewLetters.split('');
    for (var i = 0; i < arrLetters.length; i++) {
        var curLetter = arrLetters[i];
        if (strText.indexOf(curLetter) >= 0)
            return true;
    }
    return false;
}

function ParseQueryString(strQS) {
    var mapping = {};
    var pairs = strQS.split('&');
    for (var i = 0; i < pairs.length; i++) {
        var curPair = pairs[i];
        if (curPair.length > 0) {
            var keyValue = curPair.split('=');
            if (keyValue.length == 2 && keyValue[0].length > 0)
                mapping[keyValue[0]] = keyValue[1] || '';
        }
    }
    return mapping;
}

function GetPossibleNumbers(originalNumber, maxDigits) {
    function TrimLeadingZeros() {
        var trimmed = originalNumber + '';
        while (trimmed.length > 0 && trimmed.substring(0, 1) == '0')
            trimmed = trimmed.substr(1);
        return trimmed;
    }
    function Explode(c, n) {
        var s = '';
        for (var i = 0; i < n; i++) {
            s += c;
        }
        return s;
    }
    var possibleNumbers = [originalNumber];
    var trimmedNumber = TrimLeadingZeros();
    var loops = maxDigits - trimmedNumber.length + 1;
    for (var i = 0; i < loops; i++) {
        var currentNumber = Explode('0', i) + trimmedNumber;
        if (currentNumber != originalNumber)
            possibleNumbers.push(currentNumber);
    }
    return possibleNumbers;
}

function TrueForAll(arr, func) {
    if (arr == null || !arr || !func)
        return false;
    for (var i = 0; i < arr.length; i++) {
        var item = arr[i];
        if (!func(item))
            return false;
    }
    return true;
}

function GetLastPart(rawString, lookFor, removeQueryString) {
    if (typeof removeQueryString == 'undefined')
        removeQueryString = false;
    var lastPart = '';
    var lastIndex = rawString.lastIndexOf(lookFor);
    if (lastIndex >= 0) {
        lastPart = rawString.substring(lastIndex + lookFor.length);
        if (removeQueryString) {
            var index = (lastPart.indexOf('?') + 1) || (lastPart.indexOf('&') + 1);
            if (index > 0)
                lastPart = lastPart.substring(0, index - 1);
        }
    }
    return lastPart;
}

function DeserializeQueryStringValue(qs, prefix) {
    var obj = {};
    for (var key in qs) {
        if (key.indexOf(prefix) == 0) {
            obj[key.replace(prefix, '')] = qs[key];
        }
    }
    return obj;
}

function ParsePaymentOrder(rawOrder) {
    if (rawOrder == null)
        return '';
    rawOrder = rawOrder.toString();
    if (rawOrder.length < 5)
        return '';
    let YY = rawOrder.substr(0, 2);
    let MM = rawOrder.substr(2, 2);;
    let XXXX = rawOrder.substr(4);
    while (XXXX.indexOf('0') === 0)
        XXXX = XXXX.substr(1);
    return XXXX + '-' + MM + '/' + YY;
}

function BuildLeagueFilters(queryString) {
    /**
     * @return {boolean}
     */
    function NumbersOnly(x) {
        var n = parseInt(x, 10);
        return !isNaN(n) && n > 0;
    }
    var sports = (queryString.sports || '').split(',').filter(NumbersOnly);
    var categories = (queryString.categories || '').split(',').filter(NumbersOnly);
    if (sports.length > 0 && categories.length > 0 && sports.length === categories.length) {
        var filters = [];
        for (var i = 0; i < sports.length; i++) {
            filters.push({
                sport: sports[i],
                category: categories[i]
            });
        }
        return filters;
    }
    return null;
}

function ParseSmallPoints(rawPartsResult) {
    // 8-10|0-10|10-8|0-9
    if (typeof rawPartsResult === 'undefined' || rawPartsResult == null || rawPartsResult.length === 0)
        return null;
    var matchResults = rawPartsResult.split('|');
    var parsedSmallPoints = [];
    matchResults.forEach(matchResult => {
        var internalResult = matchResult.split('-');
        if (internalResult.length === 2) {
            var teamA_points = parseInt(internalResult[0], 10);
            var teamB_points = parseInt(internalResult[1], 10);
            if (!isNaN(teamA_points) && teamA_points >= 0 && !isNaN(teamB_points) && teamB_points >= 0) {
                parsedSmallPoints.push([teamB_points, teamA_points]);
            }
        }
    });
    return parsedSmallPoints;
}

module.exports.GlobalReplace = GlobalReplace;
module.exports.VerifyUser = VerifyUser;
module.exports.StripAllTags = StripAllTags;
module.exports.IsValidEmail = IsValidEmail;
module.exports.IsValidCellPhoneNumber = IsValidCellPhoneNumber;
module.exports.IsValidInteger = IsValidInteger;
module.exports.GetAllBetween = GetAllBetween;
module.exports.DistinctArray = DistinctArray;
module.exports.FlattenArray = FlattenArray;
module.exports.GetSafeNumber = GetSafeNumber;
module.exports.SumArray = SumArray;
module.exports.ToAssociativeArray = ToAssociativeArray;
module.exports.GetKeys = GetKeys;
module.exports.ParseDateTime = ParseDateTime;
module.exports.SportsmanEncode = SportsmanEncode;
// module.exports.SportsmanDecode = SportsmanDecode;
module.exports.GeneratePassword = GeneratePassword;
module.exports.ContainsHebrew = ContainsHebrew;
module.exports.ParseQueryString = ParseQueryString;
module.exports.GetPossibleNumbers = GetPossibleNumbers;
module.exports.TrueForAll = TrueForAll;
module.exports.GetLastPart = GetLastPart;
module.exports.DeserializeQueryStringValue = DeserializeQueryStringValue;
module.exports.IsArray = IsArray;
module.exports.ExcludeProperties = ExcludeProperties;
module.exports.ParsePaymentOrder = ParsePaymentOrder;
module.exports.SanitizeDatabaseValue = SanitizeDatabaseValue;
module.exports.CopyRecord = CopyRecord;
module.exports.PadZero = PadZero;
module.exports.FormatDate = FormatDate;
module.exports.BuildLeagueFilters = BuildLeagueFilters;
module.exports.ParseSmallPoints = ParseSmallPoints;