var express = require('express');
var Promise = require('promise');
var fs = require('fs');
var path = require('path');
var settings = require('../settings');
var logger = require('../logger');
var sql = require('mssql');
var data = require('./data');
var utils = require('./utils');
var router = express.Router();

function CreateConnection() {
    return new Promise(function (fulfil, reject) {
        var connection = new sql.Connection(settings.sqlConfig, function(err) {
            if (err) {
                logger.error('Links connection error: ' + err.message);
                reject('error creating connection for links');
            }
            else {
               fulfil(connection);
            }
        });
    });
}

router.get('/', function (req, res) {
    CreateConnection().then(function (connection) {
        var qs = 'Select Seq, Url, Description, SortIndex ' +
            'From Links ' +
            'Order By IsNull(SortIndex, 99999) Asc';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading links: ' + (err.message || err));
                res.status(500).send('error while reading links');
            }
            else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.post('/', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var linkUrl = req.body.Url;
    if (linkUrl == null || !linkUrl || linkUrl.length == 0) {
        res.sendStatus(400);
        return;
    }

    CreateConnection().then(function (connection) {
            data.insertEntity(connection, 'Links', ['Url', 'Description', 'SortIndex'], req.body).then(function (linkSeq) {
                logger.log('info', 'Link ' + linkSeq + ' has been created');
                res.status(200).send({
                    'LinkSeq': linkSeq
                });
            }, function(err) {
                logger.log('error', 'Error inserting new link: %s', err.message);
                res.status(500).send('error creating link');
            });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.put('/', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var linkSeq = req.body.Seq;
    var linkUrl = req.body.Url;
    if (linkSeq == null || !linkSeq || linkUrl == null || !linkUrl || linkUrl.length == 0) {
        res.sendStatus(400);
        return;
    }

    CreateConnection().then(function (connection) {
        data.updateEntity(connection, 'Links', ['Url', 'Description', 'SortIndex'], req.body).then(function () {
            logger.log('info', 'Link ' + linkSeq + ' has been updated');
            res.status(200).send('OK');
        }, function(err) {
            logger.log('error', 'Error updating link %d data: %s', linkSeq, err.message);
            res.status(500).send('error updating link');
        });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.delete('/:link', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    var linkSeq = req.params.link;
    data.deleteEntity(req.connection, 'Links', linkSeq).then(function () {
        logger.log('info', 'Link ' + linkSeq + ' has been deleted');
        res.status(200).send('OK');
    }, function (err) {
        res.status(500).send(err);
    });
});

module.exports = router;
