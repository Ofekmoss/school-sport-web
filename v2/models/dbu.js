function PgConnection(client, done) {
    this.client = client;
    this.done = done;
}

PgConnection.prototype.transaction = function () {
    var connection = this;
    return this.request('BEGIN')
        .then(function () {
            return connection;
        })
};

PgConnection.prototype.commit = function () {
    return this.request('COMMIT');
};

PgConnection.prototype.rollback = function () {
    return this.request('ROLLBACK');
};

PgConnection.prototype.request = function(query, parameters) {
    var client = this.client;
    return new Promise(function (resolve, reject) {
        var params = [];
        if (parameters) {
            var keys = Object.keys(parameters).sort().reverse();
            for (var i = 0; i < keys.length; i++) {
                if (query.indexOf('@' + keys[i]) >= 0) {
                    params.push(parameters[keys[i]]);
                    query = query.split('@' + keys[i]).join('$' + (params.length));
                }
            }
        }

        client.query(query, params, function (err, result) {
            if (err) {
                reject(err);
            }
            else {
                resolve(result.rows);
            }
        });
    });
};

PgConnection.prototype.complete = function () {
    this.done();
};

function MssqlConnection(connection, sql) {
    this.connection = connection;
    this.sql = sql;
}

MssqlConnection.prototype.transaction = function () {
    var connection = this.connection;
    var sql = this.sql;
    return new Promise(function (resolve, reject) {
        var transaction = connection.transaction();
        transaction.begin(function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve(new MssqlConnection(transaction, sql));
            }
        });
    });
};

MssqlConnection.prototype.request = function(query, parameters) {
    var connection = this.connection;
    var sql = this.sql;
    return new Promise(function (resolve, reject) {
        var request = connection.request();
        if (parameters) {
            for (var key in parameters) {
                var value = parameters[key];
                // Checking if decimal value
                if (typeof value == 'number') {
                    if (Math.floor(value) != value) {
                        // TODO - enable bigger scale?
                        request.input(key, sql.Decimal(18, 2), value);
                        continue;
                    }
                }

                request.input(key, value);
            }
        }

        request.query(query, function (err, result) {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
};

MssqlConnection.prototype.commit = function () {
    var connection = this.connection;
    return new Promise(function (resolve, reject) {
        connection.commit(function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};

MssqlConnection.prototype.rollback = function () {
    var connection = this.connection;
    return new Promise(function (resolve, reject) {
        connection.rollback(function (err) {
            if (err) {
                reject();
            }
            else {
                resolve();
            }
        });
    });
};

MssqlConnection.prototype.complete = function () {
    this.connection.close();
};

function connect(lib, config) {
    if (lib.Pool) {
        if (config.peer) {
            // Workaround for peer connection
            lib.defaults.host = "/var/run/postgresql";
        }
        return new Promise(function (resolve, reject) {
            var pool = new lib.Pool({connectionString: typeof config === "string" ? config : config.url});
            pool.connect(function (err, client, done) {
                if (err) {
                    reject(err);
                } else {
                    resolve(new PgConnection(client, done));
                }
            });
        });
    }
    else {
        return new Promise(function (resolve, reject) {
            try {
                if (lib.ConnectionPool) {
                    var pool = new lib.ConnectionPool(config);
                    var connection = pool.connect(function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(new MssqlConnection(connection, lib));
                        }
                    });
                }
                else {
                    var connection = new lib.Connection(config, function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(new MssqlConnection(connection, lib));
                        }
                    });
                }
            }
            catch (err) {
                console.log('Some error', err);
            }
        });
    }
}

function Dbu(lib, config) {
    this.connect = function () {
        return connect(lib, config);
    };
}

Dbu.connect = connect;
Dbu.config = function (lib, config) {
    return new Dbu(lib, config);
};

module.exports = Dbu;