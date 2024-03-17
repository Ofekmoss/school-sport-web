define (["consts"], function(consts) {
    function Formatter(pattern, evaluator) {
        this.parts = [];
        var p = 0;
        var s = pattern.indexOf('{');
        while (s >= 0) {
            var e = pattern.indexOf('}', s+1);
            if (e > s) {
                if (s > p) {
                    this.parts.push(pattern.slice(p, s));
                }
                this.parts.push(Equation.expression(pattern.slice(s + 1, e), {evaluator: evaluator}));
                p = e + 1;
                s = pattern.indexOf('{', p);
            }
            else {
                s = pattern.indexOf('{', s+1);
            }
        }
        if (p < pattern.length - 1) {
            this.parts.push(pattern.slice(p));
        }
    }

    Formatter.prototype.evaluate = function (variables) {
        return this.parts.map(function (p) {
            if (typeof p === "string") {
                return p;
            }
            else {
                var val = Equation.solve(p, variables);
                return val == null ? "" : val.toString();
            }
        }).join("");
    };

    var _autoSelectTimer = 0;
    var utils = {
        distinctArray: function(array, property) {
            if (typeof property === 'undefined')
                property = '';
            var mapping = {};
            var distinctItems = [];
            for (var i = 0; i < array.length; i++) {
                var x = array[i] == null ? '' : array[i];
                var key = property ? x[property].toString() : x.toString();
                if (!mapping[key]) {
                    distinctItems.push(x);
                    mapping[key] = true;
                }
            }
            return distinctItems;
        },
        padZero: function(value) {
            return value >= 0 && value < 10 ? '0' + value : value;
        },
        formatDate: function(date, format) {
            if (typeof format === 'undefined' || format == null || format.length === 0)
                format = 'DD/MM/YYYY';
            if (typeof date === 'undefined' || date == null)
                return '';
            if (typeof date === 'string' || typeof data === 'number')
                date = new Date(date);
            var year = date.getFullYear();
            if (year >= 1990 && year < 2100) {
                //sanity check
                var formatted = format.toString();
                formatted = formatted.replace('yyyy', year.toString());
                formatted = formatted.replace('YYYY', year.toString());
                formatted = formatted.replace('mm', (date.getMonth() + 1).toString());
                formatted = formatted.replace('MM', utils.padZero(date.getMonth() + 1));
                formatted = formatted.replace('dd', utils.padZero(date.getDate()));
                formatted = formatted.replace('DD', utils.padZero(date.getDate()));
                formatted = formatted.replace('yy', year.toString().substr(2));
                formatted = formatted.replace('YY', year.toString().substr(2));
                return formatted;
            }
            return '';
        },
        parseCompetitionTime: function(value) {
            if (typeof value === "number") {
                if (value < 100000000000) {
                    // This is a competition time
                    if (value < 100000000) {
                        // Competition time in YYYYMMDD format
                        var day = value % 100;
                        value = (value - day) / 100;
                        var month = value % 100;
                        value = (value - month) / 100;
                        return new Date(value, month - 1, day);
                    }
                    else {
                        // Competition time in epoch format
                        return new Date(value * 1000);
                    }
                }
                else {
                    return new Date(value);
                }
            } else if (typeof value === "string") {
                return new Date(value);
            }
            return null;
        },
        ensureRange: function(value, min, max) {
            if (value < min)
                value = min;
            if (value > max)
                value = max;
            return value;
        },
        verifyIntRange: function(value, min, max) {
            if (value == null)
                return false;
            var intVal = parseInt(value, 10);
            if (isNaN(intVal))
                return false;
            if (intVal < min)
                return false;
            if (intVal > max)
                return false;
            return true;
        },
        assignNonEmptyValues: function(source, target, properties) {
            if (source != null && target != null && properties != null) {
                properties.forEach(function(pName) {
                    var pSource = pName;
                    var pTarget = pName;
                    if (pName.indexOf('|') > 0) {
                        var tmp = pName.split('|');
                        pSource = tmp[0];
                        pTarget = tmp[1];
                    }
                    var rawValue = source[pSource];
                    if (rawValue != null) {
                        target[pTarget] = rawValue;
                    }
                })
            }
        },
        isValidEmail: function(rawEmail, allowBlank) {
            if (typeof allowBlank == 'undefined')
                allowBlank = false;
            if (rawEmail == null || rawEmail.length === 0)
                return allowBlank;
            var email = rawEmail.trim();
            if (email.length === 0)
                return allowBlank;
            var parts = email.split('@');
            if (parts.length !== 2)
                return false;
            var name = parts[0].trim(), domain = parts[1].trim().toLowerCase();
            if (name.length === 0 || domain.length === 0)
                return false;
            if (domain.substr(0, 1) === '.' || domain.substr(domain.length - 1, 1) === '.' || domain.indexOf('.') < 0)
                return false;
            if (domain.indexOf('example.') === 0 || domain.indexOf('test.') === 0)
                return false;
            return true;
        },
        isValidDate: function(date) {
            if (date == null || date === '')
                return false;
            if (typeof date === 'string' || typeof date === 'number')
                date = new Date(date);
            var year = date.getFullYear ? date.getFullYear() : 0;
            return year > 1900 && year <= 2100;
        },
        isIdValid: function (str) {
            // Just in case -> convert to string
            var IDnum = String(str);

            // Validate correct input
            if ((IDnum.length > 9) || (IDnum.length < 5))
                return false;
            if (isNaN(IDnum))
                return false;

            // The number is too short - add leading 0000
            if (IDnum.length < 9)
            {
                while(IDnum.length < 9)
                {
                    IDnum = '0' + IDnum;
                }
            }

            // CHECK THE ID NUMBER
            var mone = 0, incNum;
            for (var i=0; i < 9; i++)
            {
                incNum = Number(IDnum.charAt(i));
                incNum *= (i%2)+1;
                if (incNum > 9)
                    incNum -= 9;
                mone += incNum;
            }
            if (mone%10 == 0)
                return true;
            else
                return false;
        },
        parseDate: function (dateText, defaultEmptyValue) {
            if (typeof defaultEmptyValue === 'undefined')
                defaultEmptyValue = null;
            if (!dateText || !dateText.length) {
                return defaultEmptyValue;
            }
            var parts = dateText.split('/');
            if (parts.length !== 3) {
                parts = dateText.split('.');
            }
            if (parts.length === 3) {
                var day = parseInt(parts[0]);
                var month = parseInt(parts[1]);
                var year = parseInt(parts[2]);
                if (day >= 1 && day <= 31 &&
                    month >= 1 && month <= 12) {
                    if (year < (new Date().getFullYear() % 100)) {
                        year = 2000 + year;
                    }
                    else if (year < 100) {
                        year = 1900 + year;
                    }
                    else if (year < 1900) {
                        return null;
                    }
                    var result = new Date(year, month - 1, day);
                    if (year !== result.getFullYear() ||
                        month !== result.getMonth() + 1 ||
                        day !== result.getDate()) {
                        return null;
                    }
                    return result;
                }
            }
            else if (dateText.split('-').length === 3) {
                return new Date(dateText);
            }
            return null;
        },
        promiseAll: function(promises) {
            var results = [];
            var completedPromises = 0;
            return new Promise(function (resolve, reject) {
                promises.forEach(function(promise, index) {
                    promise.then(function (value) {
                        results[index] = value;
                        completedPromises += 1;
                        if(completedPromises === promises.length) {
                            resolve(results);
                        }
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            });
        },
        getById: function (list, id, propNameOverride) {
            var idPropName = 'id';
            if (typeof propNameOverride !== 'undefined' && propNameOverride != null)
                idPropName = propNameOverride;
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item[idPropName] === id) {
                    return item;
                }
            }
            return null;
        },
        isEmpty: function (value) {
            return ( value == '' || value == undefined || value == null);
        },
        getTimeText: function(time) {
            var min = time % 60;
            var hour = (time - min) / 60;
            return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
        },
        getActivityText: function (activity) {
            return activity.map(function (a) {
                if (a.day != null) {
                    return consts.days[a.day] +
                        (a.startTime != null ? " " + utils.getTimeText(a.startTime) : "") +
                        (a.endTime != null ? "-" + utils.getTimeText(a.endTime) : "");
                }
                return "";
            }).join("; ");
        },
        getCurrentTime: function() {
            var now = new Date();
            var dd = now.getDate();
            var mm = now.getMonth() + 1; //January is 0!
            var hr = now.getHours();
            var min = now.getMinutes();
            if (min < 10) {
                min = "0" + min;
            }

            var ampm = "AM";
            if( hr > 12 ) {
                hr -= 12;
                ampm = "PM";
            }

            var yyyy = now.getFullYear();
            if (dd < 10) {
                dd = '0' + dd;
            }
            if (mm < 10) {
                mm = '0' + mm;
            }
            return dd + '/' + mm + '/' + yyyy   + ' ' +  hr + ":" + min + ampm;
        },
        excelReport: function (name, id, selector, rows) {
            if (typeof selector === 'undefined')
                selector = null;
            if (typeof rows === 'undefined' || rows == null) {
                var oTable = selector ? $(selector).get(0) : document.getElementById(id); // id of table
                rows = [];
                for(var j = 0 ; j < oTable.rows.length ; j++)
                {
                    rows.push(oTable.rows[j].innerHTML);
                }
            } else {
                var styleMapping = {};
                var emptyCellMapping = {};
                rows = rows.map(function(row, rowIndex) {
                    if (typeof row === 'string') {
                        return row;
                    } else {
                        //array of cells
                        var cells = [];
                        //headers will span and have their own border when there is empty gap of cells (club reports)
                        var colSpan = 0;
                        for (var i = 0; i < row.length; i++) {
                            var cellContents = row[i];
                            var isFirstRow = (rowIndex === 0);
                            var isLastRow = (rowIndex === (rows.length - 1));
                            if (isFirstRow || isLastRow) {
                                //header or footer cells
                                if (cellContents.length > 0) {
                                    //look for empty gap of cells
                                    var emptyCellCount = 0;
                                    for (var j = i + 1; j < row.length - 3; j++) {
                                        var nextCellContents = row[j];
                                        if (nextCellContents.length > 0) {
                                            break;
                                        } else {
                                            emptyCellCount++;
                                        }
                                    }

                                    var tableCellHTML = '<td';
                                    if (emptyCellCount > 0) {
                                        colSpan = emptyCellCount + 1;
                                        tableCellHTML += ' colspan="' + colSpan + '"';
                                        styleMapping[i.toString()] = ' style="border-left: 1px;"';
                                        styleMapping[(i + emptyCellCount).toString()] = ' style="border-right: 1px;"';
                                    }
                                    tableCellHTML += ' style="text-align: center; font-weight: bold;';
                                    if (emptyCellCount > 0)
                                        tableCellHTML += ' border-left: 1px; border-right: 1px;';
                                    tableCellHTML += '">' + cellContents + '</td>';
                                    cells.push(tableCellHTML);
                                } else {
                                    if (colSpan === 0) {
                                        //empty cell, show only if no content cells before or if last three footer cells
                                        var addEmptyCell = true;
                                        if (isFirstRow) {
                                            var nextRowCellContents = rows[rowIndex + 1][i];
                                            if (nextRowCellContents.length > 0) {
                                                cells.push('<td rowspan="2" style="text-align: center; font-weight: bold; vertical-align : middle;">' + nextRowCellContents + '</td>');
                                                emptyCellMapping[i.toString()] = true;
                                                addEmptyCell = false;
                                            }
                                        }
                                        if (addEmptyCell) {
                                            cells.push('<td></td>');
                                        }
                                    }
                                }
                            } else {
                                if (rowIndex === 1 && emptyCellMapping[i.toString()]) {
                                    //row span, do not show this cell.
                                } else {
                                    cells.push('<td' + (styleMapping[i.toString()] || '') + '>' + cellContents + '</td>');
                                }
                            }
                        }
                        return cells.join(''); //'<td>' + cells.join('</td><td>') + '</td>';
                    }
                });
            }
            //console.log(rows[0]);
            //return;
            var rawHTML='<!DOCTYPE html><head><meta charset="UTF-8" /></head><body dir="rtl" style="direction: rtl;"><table border="2px">';
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                rawHTML +=  '<tr';
                if (rowIndex === 0) {
                    rawHTML +=  ' bgcolor="#87AFC6"'
                }
                rawHTML +=  '>' + rows[rowIndex] + '</tr>';
            }
            rawHTML += "</table>";
            rawHTML = rawHTML.replace(/<A[^>]*>|<\/A>/g, "");//remove if u want links in your table
            rawHTML= rawHTML.replace(/<img[^>]*>/gi,""); // remove if u want images in your table
            rawHTML= rawHTML.replace(/<input[^>]*>|<\/input>/gi, ""); // reomves input params
            rawHTML= rawHTML.replace(/<button[^>]*>|<\/button>/gi, ""); // reomves button params
            rawHTML += '</body></html>';

            var ua = window.navigator.userAgent;
            var msie = ua.indexOf("MSIE ");

            if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer
            {
                txtArea1.document.open("txt/html","replace");
                txtArea1.document.write(rawHTML);
                txtArea1.document.close();
                txtArea1.focus();
                txtArea1.document.execCommand("SaveAs",true, name);
            }
            else {
                //other browser not tested on IE 11
                // sa = window.open('data:application/vnd.ms-excel,' + encodeURIComponent(tab_text));
                var oFile = new Blob([rawHTML], {type:"application/vnd.ms-excel"});
                var url = URL.createObjectURL(oFile);
                var a = $("<a />", {
                    href: url,
                    download: name
                }).appendTo("body").get(0).click();
            }

            //return (sa);
        },
        SaveToDisk: function (fileURL, fileName) {
            // for non-IE
            if (!window.ActiveXObject) {
                var save = document.createElement('a');
                save.href = fileURL;
                save.target = '_blank';
                save.download = fileName || 'unknown';

                var evt = new MouseEvent('click', {
                    'view': window,
                    'bubbles': true,
                    'cancelable': false
                });
                save.dispatchEvent(evt);

                (window.URL || window.webkitURL).revokeObjectURL(save.href);
            }

            // for IE < 11
            else if (!!window.ActiveXObject && document.execCommand) {
                var _window = window.open(fileURL, '_blank');
                _window.document.close();
                _window.document.execCommand('SaveAs', true, fileName || fileURL)
                _window.close();
            }
        },
        ParsePaymentOrder: function(rawOrder) {
            if (rawOrder == null)
                return '';
            rawOrder = rawOrder.toString();
            if (rawOrder.length < 5)
                return '';
            var YY = rawOrder.substr(0, 2);
            var MM = rawOrder.substr(2, 2);;
            var XXXX = rawOrder.substr(4);
            while (XXXX.indexOf('0') === 0)
                XXXX = XXXX.substr(1);
            return XXXX + '-' + MM + '/' + YY;
        },
        getPaymentUrl: function(rawOrderNumber) {
            var parsedOrderNumber = this.ParsePaymentOrder(rawOrderNumber);
            var pdfName = 'תעודת חיוב ' + parsedOrderNumber.replace('/', '-') + '.pdf';
            return '/content/PaymentNotifications/' + encodeURIComponent(pdfName);
        },
        downloadPayment: function (rawOrderNumber) {
            var parsedOrderNumber = this.ParsePaymentOrder(rawOrderNumber);
            var pdfName = 'תעודת חיוב ' + parsedOrderNumber.replace('/', '-') + '.pdf';
            var pdfUrl = '/content/PaymentNotifications/' + encodeURIComponent(pdfName);
            this.SaveToDisk(pdfUrl, pdfName);
        },
        mergeDeep: function(target, source) {
            if (typeof target == "object" && typeof source == "object") {
                for (var key in source) {
                    if (source[key] === null && (target[key] === undefined || target[key] === null)) {
                        target[key] = null;
                    } else if (source[key] instanceof Array) {
                        if (!target[key]) target[key] = [];
                        //concatenate arrays
                        target[key] = target[key].concat(source[key]);
                    } else if (typeof source[key] == "object") {
                        if (!target[key]) target[key] = {};
                        this.mergeDeep(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
            return target;
        },
        sumDataRows: function(rows, propertyName, selectedRowsLength) {
            var sum = 0;
            rows.forEach(function(row) {
                var included = false;
                if (!row.hidden && (typeof row.__show === 'undefined' || row.__show === true)) {
                    if (row.selected) {
                        included = true;
                    } else {
                        included = selectedRowsLength === 0; //include when no selection
                    }
                }
                if (included) {
                    sum += (row[propertyName] || 0);
                }
            });
            return sum;
        },
        sumAll: function(array, propertyName) {
            if (typeof propertyName === 'undefined' || propertyName == null)
                propertyName = '';
            if (array == null || array.length === 0)
                return 0;
            var sum = 0;
            array.forEach(function(item) {
                var currentValue = parseInt(propertyName.length > 0 ? item[propertyName] : item, 10);
                if (!isNaN(currentValue))
                    sum += currentValue;
            });
            return sum;
        },
        autoSelect: function() {
            if (_autoSelectTimer)
                window.clearInterval(_autoSelectTimer);
            _autoSelectTimer = window.setInterval(function() {
                /* if ($(".auto-select").length === 0) {
                    window.setTimeout(utils.autoSelect, 500);
                    return;
                } */
                $(".auto-select").each(function() {
                    var oDDL = $(this);
                    if (oDDL.val() == null) {
                        oDDL.val(oDDL.find('option').first().val());
                    }
                });
            }, 500);
        },
        dataTableButton: function(caption, valueField, clickHandler) {
            return {
                name: caption,
                key: valueField,
                type: 'button',
                active: true,
                onclick: clickHandler,
                checkDisabled: function(dataRow, index) {
                    return dataRow[valueField] == 0;
                },
                getText: function(dataRow, index) {
                    var text = caption;
                    if (dataRow[valueField] > 0) {
                        text += ' (' + dataRow[valueField] + ')';
                    }
                    return text;
                },
                getter: function (dataRow) {
                    return dataRow[valueField];
                }
            };
        },
        clone: function(dataObjectOrArray, fieldsToClone) {
            if (typeof fieldsToClone === 'undefined' || fieldsToClone == null)
                fieldsToClone = [];
            var isArray = Array.isArray(dataObjectOrArray);
            var clonedObject = isArray ? [] :  {};
            if (isArray) {
                for (var i = 0; i < dataObjectOrArray.length; i++) {
                    clonedObject[i] = this.clone(dataObjectOrArray[i]);
                }
            } else {
                for (var key in dataObjectOrArray) {
                    if (dataObjectOrArray.hasOwnProperty(key) &&
                        (fieldsToClone.length === 0 || fieldsToClone.indexOf(key) >= 0)) {
                        clonedObject[key] = dataObjectOrArray[key];
                    }
                }
            }
            return clonedObject;
        },
        deepClone: function(dataObjectOrArray, level) {
            var self = this;
            if (typeof level === 'undefined')
                level = 0;
            if (level > 5)
                return dataObjectOrArray;
            if (dataObjectOrArray == null ||
                typeof dataObjectOrArray === 'string' ||
                typeof dataObjectOrArray === 'number' ||
                typeof dataObjectOrArray.getTime === 'function') {
                return dataObjectOrArray;
            }
            var isArray = Array.isArray(dataObjectOrArray);
            var clonedObject = isArray ? [] :  {};
            if (isArray) {
                for (var i = 0; i < dataObjectOrArray.length; i++) {
                    clonedObject[i] = self.deepClone(dataObjectOrArray[i], level + 1);
                }
            } else {
                for (var key in dataObjectOrArray) {
                    if (dataObjectOrArray.hasOwnProperty(key)) {
                        clonedObject[key] = self.deepClone(dataObjectOrArray[key], level + 1);
                    }
                }
            }
            return clonedObject;
        },
        parseDocumentNumber: function(documentNumber) {
            if (documentNumber) {
                var str = documentNumber.toString();
                if (str.length > 4) {
                    return parseInt(str.slice(4)).toString() + "-" + str.slice(2, 4) + "/" + str.slice(0, 2);
                }
            }
            return documentNumber;
        },
        getDateText: function(value) {
            if (value) {
                value = new Date(value);
                if (isNaN(value)) {
                    return null;
                }
                return ('0' + value.getDate()).slice(-2) + "/" +
                    ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
                    ('000' + value.getFullYear()).slice(-4);
            }
            return value;
        },
        Option: function(id, name, tag) {
            var option = {
                id: id,
                name: name
            };
            if (typeof tag !== 'undefined' && tag != null)
                option.tag = tag;
            return option;
        },
        getDateParts: function(rawDate) {
            //support dd/MM/yyyy or yyyy-MM-dd
            var sepChar = '/';
            var tmp = rawDate.split(sepChar);
            if (tmp.length !== 3) {
                sepChar = '-';
                tmp = rawDate.split('-');
            }
            var dateParts = null;
            if (tmp.length === 3) {
                var year = 0;
                var month = 0;
                var day = 0;
                switch (sepChar) {
                    case '/':
                        day = parseInt(tmp[0], 10);
                        month = parseInt(tmp[1], 10);
                        year = parseInt(tmp[2], 10);
                        break;
                    case '-':
                        year = parseInt(tmp[0], 10);
                        month = parseInt(tmp[1], 10);
                        day = parseInt(tmp[2], 10);
                        break;
                }
                return {
                    Year: year,
                    Month: month,
                    Day: day
                };
            }
            return dateParts;
        },
        isDateValid: function(rawDate) {
            if (rawDate != null) {
                //take first word:
                rawDate = rawDate.trim().split(' ')[0];
            }
            if (rawDate == null || rawDate.toString().length < 8)
                return false;
            var dateParts = utils.getDateParts(rawDate);
            if (dateParts == null)
                return false;
            var year = dateParts.Year, month = dateParts.Month, day = dateParts.Day;
            if (!isNaN(year) && year > 2000 && !isNaN(month) && month > 0 && !isNaN(day) && day > 0) {
                var date = new Date(year, month - 1, day);
                if (date.getDate() === day && date.getMonth() === (month - 1) && date.getFullYear() === year)
                    return true;
            }
            return false;
        },
        parseRawDate: function(rawDate) {
            //2018-05-28T02:00:35.000Z
            var date = '';
            var time = '';
            var mainParts = rawDate.split('T');
            if (mainParts.length === 2) {
                dateParts = mainParts[0].split('-');
                timeParts = mainParts[1].split(':');
                if (dateParts.length === 3) {
                    date = [dateParts[2], dateParts[1], dateParts[0]].join('/');
                }
                if (timeParts.length > 2) {
                    time = [timeParts[0], timeParts[1]].join(':');
                }
            }
            return {
                Date: date,
                Time: time
            };
        },
        validateInputField: function(rawValue, title, allowEmpty, maxLength, isInteger, isDate, response) {
            if (typeof allowEmpty === 'undefined')
                allowEmpty = false;
            if (typeof maxLength === 'undefined')
                maxLength = 0;
            if (typeof isInteger === 'undefined')
                isInteger = false;
            if (typeof isDate === 'undefined')
                isDate = false;
            if (typeof response === 'undefined')
                response = {};
            var isEmpty = false;
            if (rawValue == null || rawValue.toString().length === 0) {
                isEmpty = true;
                if (!allowEmpty) {
                    response.message = 'יש להזין ' + title;
                    return false;
                }
            }
            if (!isEmpty) {
                if (maxLength > 0 && rawValue.length > maxLength) {
                    response.message = 'אורך ' + title + ' לא יכול להיות מעל ' + maxLength + ' תווים';
                    return false;
                }
                if (isInteger) {
                    var numericValue = parseInt(rawValue, 10);
                    if (isNaN(numericValue) || numericValue < 0) {
                        response.message = 'ערך ' + title + ' לא חוקי, חייב להיות מספר שלם';
                        return false;
                    }
                }
                if (isDate) {
                    if (!utils.isDateValid(rawValue)) {
                        response.message = 'ערך ' + title + ' לא חוקי, נא להזין dd/MM/yyyy או yyyy-MM-dd';
                        return false;
                    }
                }
            }
            return true;
        },
        validateNonEmptyField: function(rawValue, title, response) {
            return utils.validateInputField(rawValue, title, false, 0,
                false, false, response);
        },
        validateNumericField: function(rawValue, title, response) {
            return utils.validateInputField(rawValue, title, false, 0,
                true, false, response);
        },
        validateMinimumLengthField: function(rawValue, title, minLength, response) {
            //consider anything less than the minimum as empty
            if (rawValue != null && rawValue.length < minLength)
                rawValue = '';
            return utils.validateInputField(rawValue, title, false, 0,
                false, false, response);
        },
        validateDateField: function(rawValue, title, response) {
            //check length first:
            if (!utils.validateMinimumLengthField(rawValue, title, 8, response))
                return false;
            return utils.validateInputField(rawValue, title, false, 0,
                false, true, response);
        },
        validateMaxLengthField: function(rawValue, title, maxLength, response) {
            var allowEmpty = false;
            if (maxLength < 0) {
                allowEmpty = true;
                maxLength = maxLength * -1;
            }
            return utils.validateInputField(rawValue, title, allowEmpty, maxLength,
                false, false, response);
        },
        merge: function() {
            var array = [];
            for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i];
                if (typeof arg !== 'undefined' && arg != null) {
                    if (Array.isArray(arg)) {
                        arg.forEach(function(item) {
                            array.push(item);
                        });
                    } else {
                        array.push(arg);
                    }
                }
            }
            return array;
        },
        intOrDefault: function(rawValue, defaultValue, minValue) {
            if (typeof minValue === 'undefined' || minValue == null)
                minValue = -99999999;
            if (typeof defaultValue === 'undefined')
                defaultValue = null;
            if (typeof rawValue === 'undefined' || rawValue == null)
                return defaultValue;
            var intValue = parseInt(rawValue, 10);
            if (isNaN(intValue) || intValue < minValue)
                return defaultValue;
            return intValue;
        },
        findTag: function(value, options) {
            if (value != null && value.length > 0) {
                var matchingOption = options.find(function(o) {
                    return o.id == value;
                });
                if (matchingOption != null) {
                    return matchingOption.tag;
                }
            }
            return null;
        },
        anyTrue: function(arrayOrObject) {
            if (arrayOrObject != null) {
                if (Array.isArray(arrayOrObject)) {
                    for (var i = 0; i < arrayOrObject.length; i++) {
                        if (arrayOrObject[i] === true) {
                            return true;
                        }
                    }
                } else {
                    for (var propertyName in arrayOrObject) {
                        if (arrayOrObject.hasOwnProperty(propertyName) && arrayOrObject[propertyName] === true) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        trimAllInputs: function(rootId) {
            $('#' + rootId).find('input[type="text"]').each(function() {
                var oInput = $(this);
                oInput.bind('change', function() {
                    var currentValue = oInput.val();
                    if (currentValue.length > 0) {
                        var firstIndex = currentValue.indexOf(' ');
                        var lastIndex = currentValue.lastIndexOf(' ');
                        if (firstIndex === 0 || lastIndex === (currentValue.length - 1)) {
                            oInput.val($.trim(currentValue));
                        }
                    }
                });
            });
        },
        sortByName: function(array, property) {
            if (Array.isArray(array)) {
                if (typeof property === 'undefined' || property == null) {
                    //'Name'
                    property = '';
                    if (array.length > 0) {
                        var firstItem = array[0];
                        if (firstItem.hasOwnProperty('Name'))
                            property = 'Name';
                        else if (firstItem.hasOwnProperty('name'))
                            property = 'name';
                    }
                }
                if (property.length > 0) {
                    array.sort(function (item1, item2) {
                        var p1 = item1[property] || '';
                        var p2 = item2[property] || '';
                        return p1.localeCompare(p2);
                    });
                }
            }
        },
        minHourStart: 9,
        maxHourStart: 17,
        minHourEnd: 10,
        maxHourEnd: 20,
        getStartHours: function() {
            var startHours = [];
            for (var n = utils.minHourStart; n <= utils.maxHourStart; n++) {
                startHours.push({
                    value: n * 60,
                    text: ("0" + n).slice(-2) + ":00"
                });
                if (n != utils.maxHourStart) {
                    startHours.push({
                        value: n * 60 + 30,
                        text: ("0" + n).slice(-2) + ":30"
                    });
                }
            }
            return startHours;
        },
        getEndHours: function() {
            var endHours = [];
            for (var n = utils.minHourEnd; n <= utils.maxHourEnd; n++) {
                endHours.push({
                    value: n * 60,
                    text: ("0" + n).slice(-2) + ":00"
                });
                if (n != utils.maxHourEnd) {
                    endHours.push({
                        value: n * 60 + 30,
                        text: ("0" + n).slice(-2) + ":30"
                    });
                }
            }
            return endHours;
        },
        activityMethods: {
            addDay: function(array) {
                array.push({});
            },
            removeDay: function(array, entity) {
                var index = array.indexOf(entity);
                if (index >= 0)
                    array.splice(index, 1);
            },
            computeEndTime: function(entity) {
                if (entity != null) {
                    if (Array.isArray(entity)) {
                        entity.forEach(function(ent) {
                            utils.activityMethods.computeEndTime(ent);
                        });
                        return;
                    }
                    if (entity.startTime) {
                        var startHours = utils.getStartHours();
                        var endHours = utils.getEndHours();
                        var startIndex = startHours.findIndex(function (hour) {
                            return hour.value == entity.startTime;
                        });
                        entity.endHours = endHours.slice(startIndex);
                    }
                }
            }
        },
        inactiveSeason: function(comp) {
            if (comp.user && comp.user.season && comp.user.activeSeason) {
                return comp.user.season !== comp.user.activeSeason;
            }
            return false;
        },
        flattenComplexObject: function(complexObject, sortByKey, valueMapper) {
            if (typeof sortByKey === 'undefined')
                sortByKey = false;
            if (typeof valueMapper === 'undefined')
                valueMapper = null;
            var array = [];
            var keys = [];
            if (complexObject != null) {
                for (var key in complexObject) {
                    if (complexObject.hasOwnProperty(key)) {
                        keys.push(keys);
                        var curValue = complexObject[key];
                        if (valueMapper != null) {
                            curValue = valueMapper(key, curValue);
                        }
                        array.push(curValue);
                    }
                }
            }
            if (sortByKey) {
                keys.sort();
                array.sort(function(item1, item2) {
                    var index1 = keys.find(function(key) {
                        return complexObject[key] == item1;
                    });
                    var index2 = keys.find(function(key) {
                        return complexObject[key] == item2;
                    });
                    return index2 - index1;
                })
            }
            return array;
        },
        isTrue: function(rawValue) {
            return rawValue == true || rawValue == '1' || rawValue == 'true';
        },
        readServerCache: function(keyOrKeys, global, callback) {
            function readSingleKey(keys, index, response) {
                if (index >= keys.length) {
                    callback(null, response);
                    return;
                }
                var key = keys[index];
                var queryParams = ['key=' + key];
                if (global)
                    queryParams.push('global=1');
                var url = '/api/v2/cache?' + queryParams.join('&');
                Vue.http.get(url).then(function (resp) {
                    var value = resp.body ? resp.body.Value : null;
                    if (response == null) {
                        response = value;
                    } else {
                        response[key] = value;
                    }
                    readSingleKey(keys, index + 1, response);
                }, function(err) {
                    console.log('failed to read ' + key);
                    callback(err);
                });
            }

            if (Array.isArray(keyOrKeys)) {
                var cacheResponse = {};
                readSingleKey(keyOrKeys, 0, cacheResponse);
            } else {
                readSingleKey([keyOrKeys], 0, null);
            }
        },
        checkSeasonAuthorization: function(user, callback) {
            var symbol = user ? parseInt(user.username, 10) : 0;
            if (!isNaN(symbol) && symbol > 0) {
                utils.readServerCache('schools-season-authorization', true, function(err, rawValue) {
                    var authorized = false;
                    if (err == null && rawValue != null) {
                        authorized = rawValue.split(',').indexOf(symbol.toString()) >= 0;
                    }
                    callback(null, authorized);
                });
            } else {
                callback('invalid school symbol');
            }
        },
        formatter: function (pattern, evaluator) {
            return new Formatter(pattern, evaluator);
        },
        parseIsfOverageItems: function(isfOverageRawData) {
            var items = [];
            if (isfOverageRawData != null) {
                isfOverageRawData.split('|').forEach(function (rawItem) {
                    var parts = rawItem.split(',');
                    if (parts.length >= 5) {
                        var rawRangeStart = parts[3];
                        var rawRangeEnd = parts[4];
                        var season = parseInt(parts[0], 10);
                        var sport = parseInt(parts[1], 10);
                        var category = parseInt(parts[2], 10);
                        var rangeStart = utils.parseDate(rawRangeStart, '');
                        var rangeEnd = utils.parseDate(rawRangeEnd, '');
                        if (season > 0 && sport >= 0 && category > 0 &&
                            rangeStart !== '' && rangeStart != null &&
                            rangeEnd !== '' && rangeEnd != null) {
                            items.push({
                                season: season,
                                sport: sport,
                                category: category,
                                rangeStart: rawRangeStart,
                                rangeEnd: rawRangeEnd
                            });
                        }
                    }
                });
            }
            return items;
        },
        flattenArray: function(complexCollection) {
            var array = [];
            for (var key in complexCollection) {
                if (complexCollection.hasOwnProperty(key)) {
                    array.push(complexCollection[key]);
                }
            }
            return array;
        },
        findById: function(entities, id) {
            if (id == null || entities == null) {
                return null;
            } else {
                return entities.find(function(entity) {
                    return entity.id == id || entity.Id == id;
                });
            }
        },
        buildQuerystringByFilters: function(dataObject, fields) {
            var filters = [];
            fields.forEach(function(field) {
                var rawValue = dataObject[field];
                if (rawValue != null && rawValue.toString() !== 'true')
                    filters.push(field + '=' + rawValue);
            })
            return filters.length > 0 ? '?' + filters.join('&') : '';
        },
        getSelectedNames: function(dataArray) {
            var names = [];
            dataArray.forEach(function(dataObject) {
                var selectedValue = dataObject.value;
                if (selectedValue != null) {
                    var matchingItem = utils.findById(dataObject.data, selectedValue);
                    if (matchingItem != null)
                        names.push(matchingItem.name || matchingItem.Name);
                }
            });
            return names;
        },
        removeProjects: function(types) {
            if (types) {
                return types.filter(function(type) {
                    return type.id < 10;
                });
            }
            return [];
        },
        openLoginTokenDialog: function(loginTokenLinks, Dialog) {
            var baseLoginHTML = '<a href="/v2/#/login?token=$token">לינק התחברות $title</a>';
            if (loginTokenLinks != null && loginTokenLinks.length > 0) {
                var rawHTML = loginTokenLinks.map(function(loginTokenLink) {
                    var title = '';
                    switch (loginTokenLink.type) {
                        case 'representative':
                            title = 'נציג רשות';
                            break;
                        case 'principal':
                            title = 'מנהל בית ספר';
                            break;
                    }
                    return title.length > 0 ?
                        baseLoginHTML.replace('$token', loginTokenLink.token).
                        replace('$title', title) : '';
                }).filter(function(html) {
                    return html.length > 0;
                }).join('<br /><br />');
                if (rawHTML.length > 0) {
                    var dialogParams = {
                        caption: "קישורי התחברות בעלי תפקידים",
                        message: rawHTML,
                        alert: false,
                        cancelText: "סגירת חלונית",
                        confirmText: null
                    };
                    Dialog.open('general/message-box', dialogParams, function () {

                    });
                    window.setTimeout(function() {
                        var dialog = $(".dialog");
                        var oButton = dialog.find("button").first();
                        dialog.find("a").each(function() {
                            var oLink = $(this);
                            oLink.click(function() {
                                oButton.click();
                            });
                        });
                    }, 1000);
                }
            }
        },
        extractEntityId: function(rawId) {
            if (rawId == null)
                return -1;
            rawId = parseInt(rawId, 10);
            return isNaN(rawId) ? -1 : rawId;
        },
        handleSelectionChange: function (comp, entities) {
            if (entities != null) {
                comp.selectedRows = entities.filter(function (entity) {
                    return entity.selected == true;
                });
                comp.selectedRowCount = comp.selectedRows.length;
            }
        },
        filters: {
            readAccountSports: function(entities) {
                var sportMapping = {};
                entities.forEach(function(entity) {
                    if (entity.account != null && entity.account.sports != null) {
                        entity.account.sports.forEach(function(sport) {
                            sportMapping[sport.id.toString()] = sport;
                        });
                    }
                });
                return utils.flattenArray(sportMapping);
            },
            getAmount: function(comp, entity, propertyName) {
                var amount = entity[propertyName];
                if (comp.category != null || comp.championship != null || comp.sport != null) {
                    if (entity.account != null && entity.account.sports != null) {
                        for (var i = 0; i < entity.account.sports.length; i++) {
                            var sport = entity.account.sports[i];
                            if (comp.championship != null) {
                                var matchingChampionship = utils.findById(sport.championships, comp.championship);
                                if (matchingChampionship != null) {
                                    if (comp.category != null) {
                                        var matchingCategory = utils.findById(matchingChampionship.categories, comp.category);
                                        if (matchingCategory != null) {
                                            amount = matchingCategory[propertyName];
                                            break;
                                        }
                                    } else {
                                        amount = matchingChampionship[propertyName];
                                        break;
                                    }
                                }
                            } else if (comp.sport != null && sport.id == comp.sport) {
                                amount = sport[propertyName];
                                break;
                            }
                        }
                    }
                }
                return amount;
            },
            loadChampionships: function(comp) {
                if (comp.sport != null) {
                    var matchingSport = utils.findById(comp.sports, comp.sport);
                    if (matchingSport != null)
                        comp.championships = (matchingSport.championships || []).slice(0);
                }
                comp.updateCaption();
            },
            loadCategories: function(comp) {
                if (comp.championship != null) {
                    var matchingChampionship = utils.findById(comp.championships, comp.championship);
                    if (matchingChampionship != null)
                        comp.categories = (matchingChampionship.categories || []).slice(0);
                }
            },
            filterChanged: function(comp, fieldName, checkMatchingDependant, readEntitiesFunction, callback) {
                if (typeof callback === 'undefined' || callback == null)
                    callback = new Function();
                if (comp[fieldName] === true || comp[fieldName] === 'true') {
                    //special case...
                    comp[fieldName] = null;
                }
                var childrenArrayName = null;
                var dependantField = null;
                switch (fieldName) {
                    case 'sport':
                        childrenArrayName = 'championships';
                        dependantField = 'championship';
                        break;
                    case 'championship':
                        childrenArrayName = 'categories';
                        dependantField = 'category';
                        break;
                }
                //console.log('sport changed to ' + comp.sport + ', mounting? ' + comp.mounting);
                if (!comp.mounting || (comp.mounting &&  comp[fieldName] != null) && readEntitiesFunction != null) {
                    if (childrenArrayName != null)
                        comp[childrenArrayName] = [];
                    //comp.championship = null;
                    readEntitiesFunction(comp, function () {
                        utils.filters.loadChampionships(comp);
                        if (fieldName !== 'sport')
                            utils.filters.loadCategories(comp);
                        if (checkMatchingDependant != null && dependantField != null) {
                            if (checkMatchingDependant() === false) {
                                comp[dependantField] = null;
                            }
                        }
                        if (comp.toggleFiltersClicked)
                            comp.toggleFiltersClicked();
                        comp.updateCaption();
                        callback(1);
                    });
                } else {
                    callback(0);
                }
            },
            typeChanged: function(comp, readEntitiesFunction, callback) {
                utils.filters.filterChanged(comp, 'type', null,
                    readEntitiesFunction, callback);
            },
            categoryChanged: function(comp, readEntitiesFunction, callback) {
                utils.filters.filterChanged(comp, 'category', null,
                    readEntitiesFunction, callback);
            },
            championshipChanged: function(comp, readEntitiesFunction, callback) {
                utils.filters.filterChanged(comp, 'championship', function() {
                    if (comp.championship != null && comp.category != null && comp.categories.length > 0) {
                        var matchingCategory = utils.findById(comp.categories, comp.category);
                        if (matchingCategory == null)
                            return false;
                    }
                    return true;
                },readEntitiesFunction, callback);
            },
            sportChanged: function(comp, readEntitiesFunction, callback) {
                utils.filters.filterChanged(comp, 'sport', function() {
                    if (comp.sport != null && comp.championship != null && comp.championships.length > 0) {
                        var matchingChampionship = utils.findById(comp.championships, comp.championship);
                        if (matchingChampionship == null)
                            return false;
                    }
                    return true;
                },readEntitiesFunction, callback);
            },
            cityChanged: function(comp, entities) {
                if (!comp.mounting) {
                    var gotCity = comp.city != null;
                    entities.forEach(function(entity) {
                        var show = true;
                        if (gotCity) {
                            if (entity.city != null) {
                                show = entity.city.id == comp.city;
                            } else {
                                show = false;
                            }
                        }
                        entity.hidden = !show;
                    });
                    comp.updateCaption();
                }
            },
            accountChanged: function(comp, entities, readEntitiesFunction) {
                var callback = function() {
                    comp.updateCaption();
                };
                if (entities.length === 0 && comp.account != null) {
                    comp.initialAccount = comp.account;
                    readEntitiesFunction(comp, callback);
                } else {
                    readEntitiesFunction(comp, callback);
                }
            },
            regionChanged: function(comp, entities, readEntitiesFunction) {
                if (comp.region === true || comp.region === 'true') {
                    //special case...
                    comp.region = '-1';
                }
                if (!comp.mounting && comp.initialAccount != null) {
                    comp.initialAccount = null;
                    comp.account = null;
                }
                if (!comp.mounting && readEntitiesFunction != null) {
                    readEntitiesFunction(comp, function() {
                        comp.cities = [];
                        comp.city = null;
                        var regionId = utils.extractEntityId(comp.region);
                        if (regionId >= 0) {
                            var cityMapping = {};
                            entities.forEach(function(entity) {
                                if (entity.city != null) {
                                    cityMapping[entity.city.id.toString()] = entity.city;
                                }
                            });
                            for (var rawCityId in cityMapping) {
                                var city = cityMapping[rawCityId];
                                comp.cities.push({
                                    id:  city.id,
                                    name: city.name
                                });
                            }
                            comp.cities.sort(function(c1, c2) {
                                return c1.name.localeCompare(c2.name);
                            });
                        } else {
                            comp.accounts = [];
                        }
                        utils.autoSelect();
                        comp.updateCaption();
                    });
                } else {
                    comp.updateCaption();
                }
            },
            checkInitialSport: function(comp, readEntitiesFunction, callback) {
                if (comp.sport != null) {
                    utils.filters.sportChanged(comp, readEntitiesFunction, callback);
                } else {
                    readEntitiesFunction(comp, callback);
                }
            },
            sumRows: function(comp, dataRows, propertyName) {
                var clonedRows = [];
                dataRows.forEach(function(dataRow) {
                    var row = utils.clone(dataRow, ['hidden', '__show', 'selected']);
                    row[propertyName] = utils.filters.getAmount(comp, dataRow, propertyName);
                    clonedRows.push(row);
                });
                //console.log(comp.paymentRequests);
                //console.log('------------------');
                //console.log(rows);
                return utils.sumDataRows(clonedRows, propertyName, comp.selectedRows.length);
            },
            buildCaption: function(comp, overrideMapping) {
                function getDataProperty(dataProperty) {
                    return overrideMapping[dataProperty] || dataProperty;
                }
                function buildItem(valueProperty, dataProperty) {
                    return {
                        value: comp[valueProperty],
                        data: comp[dataProperty]
                    };
                }
                if (typeof overrideMapping === 'undefined' || overrideMapping == null)
                    overrideMapping = {};
                return utils.getSelectedNames([
                    buildItem('season', getDataProperty('seasons')),
                    buildItem('region', getDataProperty('regions')),
                    buildItem('sport', getDataProperty('sports')),
                    buildItem('championship', getDataProperty('championships')),
                    buildItem('category', getDataProperty('categories')),
                    buildItem('type', getDataProperty('types'))
                ]);
            }
        }
    };

    return utils;
});