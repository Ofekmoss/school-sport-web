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
                logger.error('Banners connection error: ' + err.message);
                reject('error creating connection for banners');
            }
            else {
               fulfil(connection);
            }
        });
    });
}

function CopyBannerFile(bannerSeq, fileName) {
    return new Promise(function (fulfil, reject) {
        if (fileName) {
            var sourceDir = path.join(settings.contentRoot, '/Banners/temp');
            var targetDir = path.join(settings.contentRoot, '/Banners/' + bannerSeq);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }
            var sourcePath = sourceDir + '\\' + fileName;
            var targetPath = targetDir + '\\' + fileName;
            fs.createReadStream(sourcePath).pipe(fs.createWriteStream(targetPath));
            fulfil('OK');
        } else {
            fulfil('no file');
        }
    });
}

function InsertAttachment(transaction, attachmentSeq, externalLink, fileName, fileSize) {
    return new Promise(function (fulfil, reject) {
        if (fileName && fileSize) {
            var attachmentFields = ['AttachmentType', 'FileName', 'FileSize', 'DateUploaded'];
            var attachmentData = {
                AttachmentType: 9,
                FileName: fileName,
                FileSize: fileSize,
                DateUploaded: new Date()
            };
            if (externalLink) {
                attachmentFields.push('ExternalLink');
                attachmentData.ExternalLink = externalLink;
            }
            data.insertEntity(transaction, 'Attachments', attachmentFields, attachmentData).then(function (newAttachmentSeq) {
                fulfil(newAttachmentSeq);
            }, function(err) {
                transaction.rollback();
                logger.log('error', 'Error inserting new attachment: %s', err.message);
                reject('error inserting attachment');
            });
        } else {
            fulfil(attachmentSeq);
        }
    });
}

function ReadBanners(desiredType, randomize) {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function (connection) {
            var qs = 'Select b.Seq, b.[Name] As BannerName, b.[Frequency], b.[Type] As BannerType, b.DateCreated, ' +
                '   a.Seq As AttachmentSeq, a.FileName, a.FileSize, a.DateUploaded As AttachmentUploaded, a.ExternalLink, ' +
                '   u.Seq As UploaderSeq, u.UserLogin As UploaderLogin, u.DisplayName As UploaderName, u.[Role] As UploaderRole ' +
                'From Banners b Inner Join Attachments a On b.AttachmentSeq=a.Seq ' +
                '   Left Join Users u On b.[UploadedBy]=u.Seq';
            if (desiredType != null)
                qs += ' Where b.[Type]=@type';
            qs += ' Order By Seq Asc';
            var request = connection.request();
            if (desiredType != null)
                request.input('type', desiredType);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading banners: ' + (err.message || err));
                    reject('error while reading banners');
                } else {
                    var allBanners = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        var banner = {};
                        data.copyRecord(row, banner, ['Seq', 'BannerName', 'Frequency', 'BannerType', 'DateCreated',
                            'AttachmentSeq', 'FileName', 'FileSize', 'AttachmentUploaded', 'ExternalLink']);
                        banner.UploadedBy = {};
                        data.copyRecord(row, banner.UploadedBy, ['Seq', 'Login', 'Name', 'Role'], 'Uploader');
                        allBanners.push(banner);
                    }
                    if (randomize) {
                        var randomBanner = {};
                        if (recordset.length > 0) {
                            if (recordset.length == 1) {
                                randomBanner = recordset[0];
                            } else {
                                var validBanners = allBanners.filter(function(x) {
                                    return x.Frequency > 0;
                                });
                                if (validBanners.length == 0) {
                                    randomBanner = allBanners[0];
                                } else if (validBanners.length == 1) {
                                    randomBanner = validBanners[0];
                                } else {
                                    var bucket = [];
                                    var frequencySum = 0;
                                    for (var i = 0; i < validBanners.length; i++) {
                                        var currentValidBanner = validBanners[i];
                                        frequencySum += currentValidBanner.Frequency;
                                        for (var j = 0; j < currentValidBanner.Frequency; j++) {
                                            bucket.push(currentValidBanner.Seq);
                                        }
                                    }
                                    var randomIndex = Math.floor(Math.random() * frequencySum);
                                    var randomSeq = bucket[randomIndex];
                                    randomBanner = validBanners.filter(function(x) { return x.Seq == randomSeq; })[0];
                                }
                            }
                        }
                        fulfil(randomBanner);
                    } else {

                        fulfil(allBanners);
                    }
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

router.get('/', function (req, res) {
    var desiredType = req.query.type;
    var randomize = req.query.randomize == '1';
    ReadBanners(desiredType, randomize).then(function(banners) {
        res.send(banners);
    }, function(err) {
        res.status(500).send(err);
    });
});

router.post('/', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    var bannerName = req.body.BannerName;
    var bannerType = req.body.BannerType;
    var frequency = req.body.Frequency;
    var fileName = req.body.FileName;
    var fileSize = req.body.FileSize;
    var externalLink = req.body.ExternalLink;

    if (fileName == null || !fileName || fileName.length == 0 || !fileSize) {
        res.sendStatus(400);
        return;
    }

    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        InsertAttachment(transaction, 0, externalLink, fileName, fileSize).then(function(attachmentSeq) {
            var bannerData = {
                AttachmentSeq: attachmentSeq,
                Name: bannerName,
                Frequency: frequency,
                Type: bannerType,
                UploadedBy: req.session.user.seq,
                DateCreated: new Date()
            };
            var bannerFields = [];
            for (var prop in bannerData)
                bannerFields.push(prop);
            data.insertEntity(transaction, 'Banners', bannerFields, bannerData).then(function (bannerSeq) {
                transaction.commit(function (err, recordset) {
                    CopyBannerFile(bannerSeq, fileName).then(function() {
                        logger.log('info', 'Banner ' + bannerSeq + ' has been created');
                        res.status(200).send({
                            'BannerSeq': bannerSeq,
                            'AttachmentSeq': attachmentSeq,
                            'DateCreated': bannerData.DateCreated
                        });
                    });
                });
            }, function (err) {
                transaction.rollback();
                logger.log('error', 'Error inserting new banner: %s', err.message);
                res.status(500).send('error creating banner');
            });
        }, function(err) {
            res.status(500).send(err);
        });
    });
});

router.put('/', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    function UpdateAttachmentLink(transaction, attachmentSeq, externalLink) {
        return new Promise(function (fulfil, reject) {
            if (externalLink && attachmentSeq) {
                var attachmentData = {
                    Seq: attachmentSeq,
                    ExternalLink: externalLink
                };
                data.updateEntity(transaction, 'Attachments', ['ExternalLink'], attachmentData).then(function () {
                    fulfil('OK');
                }, function (err) {
                    transaction.rollback();
                    logger.log('error', 'Error updating attachment %d data: %s', attachmentSeq, err.message);
                    reject('error updating attachments');
                });
            } else {
                fulfil('no link or attachment')
            }
        });
    }

    var bannerSeq = req.body.Seq;
    var bannerName = req.body.BannerName;
    var bannerType = req.body.BannerType;
    var frequency = req.body.Frequency;
    var fileName = req.body.FileName;
    var fileSize = req.body.FileSize;
    var attachmentSeq = req.body.AttachmentSeq;
    var externalLink = req.body.ExternalLink;
    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        UpdateAttachmentLink(transaction, attachmentSeq, externalLink).then(function() {
            InsertAttachment(transaction, attachmentSeq, externalLink, fileName, fileSize).then(function(newAttachmentSeq) {
                if (newAttachmentSeq)
                    attachmentSeq = newAttachmentSeq;
                CopyBannerFile(bannerSeq, fileName).then(function() {
                    var bannerData = {
                        Seq: bannerSeq,
                        AttachmentSeq: attachmentSeq,
                        Name: bannerName,
                        Frequency: frequency,
                        Type: bannerType
                    };
                    data.updateEntity(transaction, 'Banners', ['AttachmentSeq', 'Name', 'Frequency', 'Type'], bannerData).then(function () {
                        transaction.commit(function (err, recordset) {
                            logger.log('info', 'Banner ' + bannerSeq + ' has been updated');
                            res.status(200).send({
                                AttachmentSeq: attachmentSeq
                            });
                        });
                    }, function (err) {
                        transaction.rollback();
                        logger.log('error', 'Error updating banner %d data: %s', bannerSeq, err.message);
                        res.status(500).send('error updating banner');
                    });
                });
            }, function(err) {
                res.status(500).send(err);

            });
        }, function(err) {
            res.status(500).send(err);
        });
    });
});

router.delete('/:banner', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    var bannerSeq = req.params.banner;
    data.deleteEntity(req.connection, 'Banners', bannerSeq).then(function () {
        logger.log('info', 'Banner ' + bannerSeq + ' has been deleted');
        res.status(200).send('OK');
    }, function (err) {
        res.status(500).send(err);
    });
});

module.exports = router;
module.exports.ReadBanners = ReadBanners;