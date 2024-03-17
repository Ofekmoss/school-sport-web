var Promise = require('promise');
var logger = require('../logger');
var sql = require('mssql');

var typesMap = {
    float: sql.Float,
    int: sql.Int
};

module.exports.copyRecord = function (source, target, fields, prefix) {
    if (fields === undefined) {
        for (var key in source) {
            if (!prefix) {
                target[key] = source[key];
            }
            else if (key.lastIndexOf(prefix, 0) === 0) {
                target[key.substring(prefix.length)] = source[key];
            }
        }
    }
    else {
        for (var i = 0; i < fields.length; i++) {
            var targetField = fields[i];
            var sourceField = targetField;
            if (prefix) {
                sourceField = prefix + targetField;
            }
            if (source.hasOwnProperty(sourceField)) {
                target[targetField] = source[sourceField];
            }
        }
    }
};

module.exports.promiseQuery = function(request, command, parameters) {
    if (parameters) {
        for (var name in parameters) {
            request.input(name, parameters[name]);
        }
    }
    return new Promise(function (fulfil, reject) {
        request.query(command, function (err, recordset) {
            if (err) {
                reject(err);
            }
            else {
                fulfil(recordset);
            }
        });
    });
};

module.exports.promiseExecute = function(request, command, parameters) {
    if (parameters) {
        for (var name in parameters) {
            request.input(name, parameters[name]);
        }
    }
    return new Promise(function (fulfil, reject) {
        request.execute(command, function (err, recordset) {
            if (err) {
                reject(err);
            }
            else {
                fulfil(recordset);
            }
        });
    });
};

module.exports.transaction = function(connection, callback) {
    var transaction = connection.transaction();
    return new Promise(function (fulfil, reject) {
        transaction.begin(function (err) {
            if (err) {
                reject("שגיאה בגישה לבסיס הנתונים");
            }
            else {
                fulfil(callback(transaction));
            }
        });
    }).
    then(
        function (result) {
            return new Promise(function (fulfil, reject) {
                transaction.commit(function (err, recordset) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        fulfil(result);
                    }
                });
            });

        },
        function (err) {
            transaction.rollback();
            return Promise.reject(err);
        });
};

module.exports.promiseNewSeq = function (connection, tableName, count) {
    return new Promise(function (fulfil, reject) {
        if (!count) {
            count = 1;
        }

        var qs =
            'update Sequences ' +
            'set Value = Value + @count ' +
            'output INSERTED.Value ' +
            'where TableName = @tableName';
        var request = connection.request();
        request.input('tableName', tableName);
        request.input('count', count);

        request.query(qs, function (err, recordset) {
            if (err) {
                reject(err);
            }
            else {
                if (recordset && recordset.length > 0) {
                    fulfil(recordset[0].Value - count + 1);
                }
                else {
                    var message = 'Sequence ' + tableName + ' not found';
                    reject({message: message});
                }
            }
        });
    });
};

module.exports.getNewSeq = function(connection, tableName, callback, error, count) {
    if (typeof count == 'undefined' || !count) {
        count = 1;
    }

    var qs =
        'update Sequences ' +
        'set Value = Value + @count ' +
        'output INSERTED.Value ' +
        'where TableName = @tableName';
    var request = connection.request();
    request.input('tableName', tableName);
    request.input('count', count);

    request.query(qs, function (err, recordset) {
        if (err) {
            if (error) {
                error(err);
            }
        }
        else {
            if (recordset && recordset.length > 0) {
                callback(recordset[0].Value - count + 1);
            }
            else {
                var message = 'Sequence ' + tableName + ' not found';
                if (error) {
                    error({message: message});
                }
                else {
                    logger.log('error', message);
                }
            }
        }
    });
};

module.exports.readEntity = function(req, res, next) {
    var connection = req.connection;
    var qs = 'select ' + req.fetch.fields.join(', ') + ' ';
    qs += 'from ' + req.fetch.fromClause;
    var filterFields = req.fetch.filterFields || [];
    var filterValues = req.fetch.filterValues || [];
    if (filterFields.length === filterValues.length && filterFields.length > 0)
        qs += ' where ' + filterFields.map(function (field, index) { return field + '=@field_' + index ; }).join(' and ')
    if (req.query.orderby)
        qs += ' order by ' + req.query.orderby;
    var page = parseInt(req.query.page);
    if (isNaN(page) || page <= 0)
        page = 1;
    var pageSize = parseInt(req.query.pagesize);
    if (isNaN(pageSize))
        pageSize = 0;
    logger.log('verbose', 'Reading entity (sql: %s) (values: %s) (page size: %d, page: %d)', qs, filterValues.join(', '), pageSize, page);
    var request = req.connection.request();
    for (var i = 0; i < filterValues.length; i++)
        request.input('field_' + i, filterValues[i]);
    request.query(qs,
        function (err, recordset) {
            if (err) {
                throw err;
                return;
            }
            var resultRecordset = [];
            if (pageSize <= 0 || pageSize >= recordset.length) {
                resultRecordset = recordset;
            } else {
                var pageCount = Math.ceil(recordset.length / pageSize);
                if (page > pageCount)
                    page = pageCount;
                var firstRecord = (page - 1) * pageSize;
                for (var i = firstRecord; i < firstRecord + pageSize; i++) {
                    if (i >= recordset.length)
                        break;
                    var currentRecord = {};
                    module.exports.copyRecord(recordset[i], currentRecord);
                    resultRecordset.push(currentRecord);
                }
            }

            if (next) {
                req.recordset = resultRecordset;
                next();
            } else {
                res.status(200).send({'result': resultRecordset});
            }
        });
}

module.exports.insertEntity = function(connection, tableName, fields, entity, seq) {
    return new Promise(function (fulfil, reject) {
        logger.log('verbose', 'Inserting new entity to table %s', tableName);
        var callInsert = function (seq) {
            logger.log('verbose', 'Neq seq: ' + seq);
            var qs = 'insert into ' + tableName + '(Seq, ' + fields.join(',') + ')' +
                ' values(@Seq, ' + fields.map(function (f) { return '@' + f; }).join(',') + ')';
            var request = connection.request();
            request.input('Seq', seq);
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                request.input(field, entity[field]);
            }
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.log('error', 'Error inserting entity: ', err);
                    reject(err);
                } else {
                    fulfil(seq);
                }
            });
        };

        if (seq === undefined) {
            module.exports.getNewSeq(connection, tableName, callInsert, function (err) {
                logger.log('error', 'Error getting new seq: ', err.message || err);
                reject(err);
            });
        }
        else {
            callInsert(seq);
        }
    });
};

module.exports.updateEntity = function(connection, tableName, fields, entity) {
    return new Promise(function (fulfil, reject) {
        logger.log('verbose', 'Updating entity %d in table %s', entity.Seq, tableName);
        var fieldSets = [];
        var request = connection.request();
        request.input('Seq', entity.Seq);
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            if (entity[field] !== undefined) {
                // If not in entity not setting
                var t = field.indexOf(':');
                if (t > 0) {
                    var type = field.substring(0, t);
                    var field = field.substring(t + 1);
                    request.input(field,
                        typesMap[type],
                        entity[field]);
                }
                else {
                    request.input(field, entity[field]);
                }

                fieldSets.push(field + '=@' + field);
            }
        }

        if (fieldSets.length == 0) {
            fulfil(entity);
        }
        else {
            var qs = 'update ' + tableName +
                ' set ' + fieldSets.join() +
                ' where Seq = @Seq';
            request.query(qs,
                function (err, recordset) {
                    if (err) {
                        logger.log('error', 'Error updating entity: ', err);
                        reject(err);
                    }
                    else {
                        fulfil(entity);
                    }
                });
        }
    });
};

module.exports.deleteEntity = function(connection, tableName, seq) {
    return new Promise(function (fulfil, reject) {
        logger.log('verbose', 'Deleting entity %d in table %s', seq, tableName);
        var qs = 'delete ' + tableName +
            ' where Seq = @Seq';
        var request = connection.request();
        request.input('Seq', seq);
        request.query(qs,
            function (err, recordset) {
                if (err) {
                    logger.log('error', 'Error deleting entity: ', err);
                    reject(err);
                }
                else {
                    fulfil(true);
                }
            });
    });
};

module.exports.getErrorMessage = function (err, log) {
    if (typeof err == 'object') {
        if (err.name == 'RequestError') {
            if (log) {
                logger.log('error', log + ': ' + err.message);
                log = null;
            }
            if (err.message.indexOf('DELETE') >= 0) {
                // Delete error
                if (err.message.indexOf('REFERENCE') >= 0) {
                    // Contraint error
                    return 'הנתון נמצא בשימוש ואינו ניתן למחיקה';
                }

                return 'מחחיקה נכשלה';
            }
        }
        else if (err.message) {
            return err.message;
        }
    }
    else if (typeof err == 'string') {
        if (log) {
            logger.log('error', log + ': ' + err);
            log = null;
        }
        return err;
    }

    if (log) {
        logger.log('error', log + ': ' + err);
    }

    return 'כשלון בשמירת נתונים';
};


module.exports.parseDateValue = function (value) {
    var year = Math.floor(value / 10000);
    var month = Math.floor((value % 10000) / 100);
    var day = value % 100;
    return new Date(year, month - 1, day);
};

module.exports.makeDateValue = function (date) {
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
};

module.exports.formatDateTime = function (date) {
    function AddZero(num) {
        return num >= 0 && num < 10 ? "0" + num : num.toString();
    }
    return AddZero(date.getDate()) + "/" + AddZero(date.getMonth() + 1) + "/" + date.getFullYear() +
        " " + AddZero(date.getHours()) + ":" + AddZero(date.getMinutes());
};