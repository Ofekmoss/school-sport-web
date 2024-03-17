var express = require('express');
var logger = require('../logger');
var settings = require('../settings');
var Promise = require('promise');
var content = require('../content');
var router = express.Router();

function ParseRawData(rawData) {
    return new Promise(function (fulfil, reject) {
        if (rawData == null || rawData.length == 0) {
            reject('no data');
        } else {
            var lookFor = 'data:image/';
            if (rawData.indexOf(lookFor) != 0) {
                reject('invalid data');
            } else {
                var parsedData = rawData.substr(lookFor.length);
                lookFor = ';base64,';
                var index = parsedData.indexOf(lookFor);
                if (index <= 0 || index >= 5) {
                    reject('missing or invalid image type');
                } else {
                    var imageType = parsedData.substr(0, index);
                    fulfil({
                        Type: imageType,
                        Data: parsedData.substr(index + lookFor.length)
                    });
                }
            }
        }
    });
}

function StoreCroppedImage(connection, imageSeq, aspectRatio, fileName, metaData) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select ImageSeq From CroppedImages ' +
            'Where ImageSeq=@seq And AspectRatio=@ratio';
        var request = connection.request();
        request.input('seq', imageSeq);
        request.input('ratio', aspectRatio);
        request.query(qs, function (err, recordset) {
            if (err) {
                reject(err.message || err);
            } else {
                var exists = recordset && recordset.length > 0 && recordset[0]['ImageSeq'] > 0;
                qs = (exists) ?
                    'Update CroppedImages Set FileName=@file, DateUpdated=@date, MetaData=@meta ' +
                    'Where ImageSeq=@seq And AspectRatio=@ratio' :
                    'Insert Into CroppedImages (ImageSeq, AspectRatio, FileName, DateUpdated, MetaData) ' +
                    'Values (@seq, @ratio, @file, @date, @meta)';
                request = connection.request();
                request.input('seq', imageSeq);
                request.input('ratio', aspectRatio);
                request.input('file', fileName);
                request.input('date', new Date());
                request.input('meta', metaData);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        reject(err.message || err);
                    } else {
                        fulfil('OK');
                    }
                });
            }
        });
    });
}

router.post('/crop', function(req, res) {
    ParseRawData(req.body.Data).then(function (parsed) {
        var imageSeq = req.body.Seq;
        var aspectRatio = req.body.AspectRatio;
        var metaData = req.body.MetaData;
        var fileName = aspectRatio + '.' + parsed.Type;
        var contentPath = '/Cropped/' + imageSeq;
        var oFile = {
            name: fileName,
            base64_data: parsed.Data
        };

        //save to disk:
        content.uploadFiles(contentPath, [oFile]).then(function (urls) {
            //save to database:
            StoreCroppedImage(req.connection, imageSeq, aspectRatio, fileName, metaData).then(function() {
                res.send(urls);
            }, function(err) {
                logger.log('error', 'Error saving cropped image ' + imageSeq + ' (' + fileName + ') in database: ' + err);
                res.status(400).send(err);
            });
        }, function (err) {
            logger.log('error', 'Error storing cropped image ' + imageSeq + ' (' + fileName + ') to disk: ' + err);
            res.status(400).send(err);
        });
    }, function (err) {
        res.status(400).send(err);
    });
});

router.get('/cropped', function (req, res) {
    var qs = 'Select ImageSeq, [AspectRatio], [FileName], DateUpdated, MetaData From CroppedImages';
    var request = req.connection.request();
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading cropped images: ' + (err.message || err));
                res.send(400);
            }
            else {
                res.send(recordset);
            }
        });
});

module.exports = router;