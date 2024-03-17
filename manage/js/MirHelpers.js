/**
 * Created by yahav on 03/04/2019.
 */
if (![].findItem) {
    Array.prototype.findItem = function(callback) {
        var array = this;
        for (var i = 0; i < array.length; i++) {
            var curItem = array[i];
            if (callback(curItem) == true) {
                return curItem;
            }
        }
        return null;
    };
}

Array.prototype.setForAll = function(propertyName, value) {
    this.forEach(function(item) {
        item[propertyName] = value;
    });
};

Array.prototype.distinct = function() {
    var array = this;
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

Array.prototype.firstOrDefault = function(defaultValue) {
    if (typeof defaultValue == 'undefined')
        defaultValue = null;
    var array = this;
    return array.length > 0 ? array[0] : defaultValue;
};

Array.prototype.mapByProperty = function(propertyName) {
    var array = this;
    var mapping = {};
    for (var i = 0; i < array.length; i++) {
        var key = (array[i][propertyName] || '').toString();
        if (key.length > 0) {
            if (!mapping[key])
                mapping[key] = [];
            mapping[key].push(array[i]);
        }
    }
    return mapping;
};

var MirHelpers = {
    hebrewLetters: ['א','ב','ג', 'ד', 'ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'],
    formatDateTime: function($filter, rawDate, format) {
        if (rawDate == null || !rawDate)
            return '';
        if (!rawDate.toISOString) {
            rawDate = new Date(rawDate);
            if (!rawDate.toISOString)
                return rawDate;
        }
        var dateString = rawDate.toISOString();
        if (dateString.indexOf('-') > 3 && dateString.indexOf('T') > 9) {
            var parts = dateString.split('T');
            var dateParts = parts[0].split('-');
            var timeParts = parts[1].split(':');
            timeParts[2] = timeParts[2].substring(0, 2);
            var year = dateParts[0];
            var month = dateParts[1];
            var day = dateParts[2];
            var hours = timeParts[0];
            var minutes = timeParts[1];
            var seconds = timeParts[2];
            var replaceMapping = {
                'dd': day,
                'MM': month,
                'yyyy': year,
                'HH': hours,
                'mm': minutes,
                'ss': seconds
            };
            var formattedDate = format + '';
            for (var key in replaceMapping) {
                var value = replaceMapping[key];
                while (formattedDate.indexOf(key) >= 0)
                    formattedDate = formattedDate.replace(key, value);
            }
            return formattedDate;
        } else {
            return $filter('date')(rawDate, format);
        }
    },
    GetHebrewLetter: function(letterIndex, defaultValue) {
        if (typeof defaultValue == 'undefined')
            defaultValue = '';
        if (letterIndex != null && letterIndex) {
            var index = letterIndex - 1;
            if (index >= 0 && index < MirHelpers.hebrewLetters.length)
                return MirHelpers.hebrewLetters[index] + "'";
        }
        return defaultValue;
    },
    ShallowCopy: function(obj) {
        var clone = null;
        if (obj) {
            clone = {};
            for (var propertyName in obj) {
                clone[propertyName] = obj[propertyName];
            }
        }
        return clone;
    },
    CreateNewOption: function(value, text) {
        if (typeof text == 'undefined' || text == null)
            text = value;
        var option = $("<option></option>");
        option.val(value).text(text);
        return option;
    },
    GetSportFields: function($http, successCallback, failureCallback) {
        if (typeof failureCallback == 'undefined')
            failureCallback = null;
        $http.get('/api/common/sports').then(function(resp) {
            successCallback(resp.data.slice(0));
        }, function(err) {
            if (failureCallback != null) {
                failureCallback(err);
            }
        });
    },
    distinctArray: function(array, propName) {
        if (typeof propName == 'undefined')
            propName = '';
        var mapping = {};
        var distinctItems = [];
        for (var i = 0; i < array.length; i++) {
            var x = array[i] == null ? '' : array[i];
            var key = (propName.length > 0) ? (x[propName] || '').toString() : x.toString();
            if (!mapping[key]) {
                distinctItems.push(x);
                mapping[key] = true;
            }
        }
        return distinctItems;
    },
    alignFormItems: function(container) {
        if (typeof container == 'string')
            container = $(container);
        window.setTimeout(function() {
            var allTitles = container.find(".mir-form-item-title");
            if (allTitles.length > 0) {
                var maxWidth = 0;
                allTitles.each(function () {
                    var curWidth = $(this).width();
                    if (curWidth > maxWidth)
                        maxWidth = curWidth;
                });
                if (maxWidth > 0) {
                    allTitles.each(function () {
                        $(this).css("width", (maxWidth + 5) + "px");
                    });
                }
            }
        }, 100);
    },
    applyDropDownItems: function(oDDL, items) {
        oDDL.find("option").remove();
        items.forEach(function(item) {
            oDDL.append(MirHelpers.CreateNewOption(item));
        });
    },
    extractCategoryItems: function(selectedSportFieldSeq, sportFieldMapping, partIndex) {
        var items = [];
        if (selectedSportFieldSeq > 0) {
            var matchingCategories = sportFieldMapping[selectedSportFieldSeq.toString()] || [];
            matchingCategories.forEach(function(categoryObject) {
                var categoryName = categoryObject.CATEGORY_NAME;
                var parts = categoryName.split(' ');
                if (parts.length == 2) {
                    items.push(parts[partIndex]);
                }
            });
            items = items.distinct();
        }
        return items;
    }
};