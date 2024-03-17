var settings = require('../../settings');

var dbu = require('./dbu');

var db = dbu.config(require('mssql'), settings.sportsmanDb);

module.exports = db;