var express = require('express');
var Promise = require('promise');
var logger = require('./logger');
var settings = require('./settings');
var utils = require('./api/utils');
var path = require('path');
var fs = require('fs');
var url = require('url');
var multipart = require('connect-multiparty');
var sportsman = require('./api//sportsman');

var router = express.Router();

function mkdirTree(dir) {
    if (!fs.existsSync(dir)) {
        var parent = path.dirname(dir);
        mkdirTree(parent);
        fs.mkdirSync(dir);
    }
}

function ExtractFilePrefix(fileType) {
    switch (fileType) {
        case 1:
            return 'st_';
        case 2:
            return 'medical_';
        case 3:
            return 'voucher_';
    }
    return null;
}

function ExtractPaymentId(url) {
    var index = url.lastIndexOf('/');
    var lastPart = decodeURIComponent(url.substr(index + 1));
    index = lastPart.indexOf('.');
    lastPart = lastPart.substr(0, index);
    index = lastPart.lastIndexOf(' ');
    return lastPart.substr(index + 1);
}

function CheckFilePermissions(url, user) {
    return new Promise(function (fulfil, reject) {
        //payment notification?
        var isPaymentNotification = url.indexOf('/PaymentNotifications') === 0;
        if (isPaymentNotification) {
            // console.log(user);
            if (user) {
                if (user.role === 1 || user.role === 4) {
                    //admin
                    fulfil('authorized');
                } else {
                    if (user.schoolID) {
                        sportsman.GetUserPayments(user).then(function(allUserPayments) {
                            var paymentId = ExtractPaymentId(url);
                            if (!paymentId || paymentId.length < 5) {
                                reject('Invalid payment ID in URL')
                            } else {
								//console.log(allUserPayments);
                                var matchingIndex = allUserPayments.findIndex(function(x) {
                                    var parsedPayment = utils.ParsePaymentOrder(x);
                                    return parsedPayment.replace('/', '-') == paymentId;
                                });
                                if (matchingIndex >= 0) {
                                    fulfil('OK');
                                } else {
									var msg = 'WARNING! User ' + user.id + ' (school ' + user.schoolID + ') is viewing payment notification ' + paymentId + ' which does not belong to them';
                                    //reject(msg);
									logger.log('verbose', msg);
									fulfil('OK but with a warning');
                                }
                            }
                        }, function(err) {
                            reject('ERROR');
                        });
                    } else {
                        reject('Logged user has no associated school and is not admin');
                    }
                }
            } else {
                reject('trying to access payment notification without being logged in');
            }
        } else {
            fulfil('not payment notification');
        }
    });
}

function queryFile(contentPath, complete) {
    //flowers?
    var isFlowerAttachment = contentPath.indexOf('/flowers-attachment/') === 0;

    //player?
    var isPlayerFile = contentPath.indexOf('/PlayerFile?type=') === 0;

    //excel?
    var isExcelDownload = contentPath.indexOf('/Excel/') === 0;



    //remove querystring:
    var questionMarkIndex = contentPath.indexOf('?');
    var oRequest = null;
    if (questionMarkIndex > 0) {
        oRequest = utils.ParseQueryString(contentPath.substr(questionMarkIndex + 1));
        contentPath = contentPath.substring(0, questionMarkIndex);
    }

    var dir = '';
    var urlPath = '';
    var fileName = '';
    var currentKey = '';
    var validExtensionsMapping = {
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'bmp': 'image',
        'pdf': 'PDF'
    };

    if (isExcelDownload) {
        var excelFileName = utils.GetLastPart(contentPath, '/');
        var excelFullPath = settings.excelRoot + '\\' + excelFileName;
        return {
            contentPath: contentPath,
            fileName: excelFullPath,
            redirected: false
        };
    }

    if (isPlayerFile) {
        dir = settings.Sportsman.PlayerFilesFolder;
        var allPlayerFiles = fs.readdirSync(dir);
        //logger.log('verbose', 'found ' + allPlayerFiles.length + ' files in ' + settings.Sportsman.PlayerFilesFolder);
        var playerFileMapping = {};
        for (var i = 0; i < allPlayerFiles.length; i++) {
            var curPlayerFile = allPlayerFiles[i];
            var currentBaseName = path.basename(curPlayerFile);
            var dotIndex = currentBaseName.indexOf('.');
            if (dotIndex > 0 && dotIndex < (currentBaseName.length - 1)) {
                var currentExtension = currentBaseName.substring(dotIndex + 1).toLowerCase();
                var currentFileType = validExtensionsMapping[currentExtension];
                if (currentFileType) {
                    currentKey = currentBaseName.substring(0, dotIndex);
                    if (!playerFileMapping[currentKey])
                        playerFileMapping[currentKey] = {};
                    playerFileMapping[currentKey][currentFileType] = curPlayerFile;
                }
            }
        }
        var studentId = oRequest['id'];
        var fileType = parseInt(oRequest['type']);
        var filePrefix = ExtractFilePrefix(fileType);
        if (studentId != null && studentId.length > 0 && filePrefix != null) {
            //logger.log('verbose', 'looking for id ' + studentId + ', prefix ' + filePrefix);
            var possibleIdNumbers = utils.GetPossibleNumbers(studentId, 9);
            for (var i = 0; i < possibleIdNumbers.length; i++) {
                var currentPossibleNumber = possibleIdNumbers[i];
                currentKey = filePrefix + currentPossibleNumber;
                var currentPossibleFiles = playerFileMapping[currentKey];
                if (currentPossibleFiles) {
                    var currentPossibleFile = '';
                    switch (fileType) {
                        case 1:
                            currentPossibleFile = currentPossibleFiles['image'];
                            break;
                        case 2:
                        case 3:
                            currentPossibleFile = currentPossibleFiles['image'] || currentPossibleFiles['PDF'];
                            break;
                    }
                    if (currentPossibleFile && currentPossibleFile.length > 0) {
                        var fullPath = dir + '\\' + currentPossibleFile;
                        return {
                            contentPath: contentPath,
                            fileName: fullPath,
                            redirected: false
                        };
                    }
                }
            }
        }
        return {
            contentPath: contentPath,
            fileName: '',
            redirected: false,
            IsEmpty: true
        };
    }

    //handle Hebrew file names:
    contentPath = decodeURI(contentPath);
    dir = isFlowerAttachment ? settings.flowersAttachmentsFolder : settings.contentRoot;
    urlPath = isFlowerAttachment ? '\\' + contentPath.split('/').slice(-1)[0] : url.parse(contentPath).pathname;
    fileName = dir + urlPath;
    if (fs.existsSync(fileName)) {
        return {
            contentPath: urlPath,
            fileName: fileName,
            redirected: false
        };
    } else if (!isFlowerAttachment) {
        fileName = dir + contentPath;
        if (fs.existsSync(fileName)) {
            return {
                contentPath: urlPath,
                fileName: fileName,
                redirected: false
            };
        } else if (complete) {
            dir = path.dirname(fileName);
            if (fs.existsSync(dir)) {
                var baseName = path.basename(fileName);
                var files = fs.readdirSync(dir);
                for (var i = 0; i < files.length; i++) {
                    var curFile = files[i];
                    var ext = path.extname(curFile);
                    if (curFile === baseName + ext) {
                        return {
                            contentPath: urlPath + ext,
                            fileName: path.join(dir, curFile),
                            redirected: true
                        };
                    }
                }
            }
        }
    }

    return null;
}

function uploadFiles(contentPath, files) {
    function ExtractSportsmanPlayerFileName(rawName) {
        var lookFor = 'PlayerFile?';
        var index = contentPath.indexOf(lookFor);
        if (index >= 0) {
            var strQS = contentPath.substr(index + lookFor.length);
            var oRequest = utils.ParseQueryString(strQS);
            var fileType = parseInt(oRequest['type']);
            var playerId = oRequest['id'];
            if (!isNaN(fileType) && fileType > 0 && playerId != null && playerId.length > 0) {
                var filePrefix = ExtractFilePrefix(fileType);
                if (filePrefix != null) {
                    var fileName = filePrefix + playerId;
                    var extension = path.extname(rawName);
                    return fileName + extension;
                }
            }
        }
        return null;
    }
    return new Promise(function (fulfil, reject) {
        var dir = '';
        var isPlayerFile = contentPath.indexOf('PlayerFile?type=') >= 0;
        if (isPlayerFile) {
            dir = settings.Sportsman.PlayerFilesFolder;
        } else {
            dir = path.join(settings.contentRoot, contentPath);
            mkdirTree(dir);
        }
        logger.log('info', 'Uploading files to %s', dir);

        var urls = [];
        for (var i = 0; i < files.length; i++) {
            var oFile = files[i];
            if (!oFile.name && oFile[0])
                oFile = oFile[0];

            var targetPath = '';
            if (isPlayerFile) {
                var playerFileName = ExtractSportsmanPlayerFileName(oFile.name);
                if (playerFileName == null) {
                    reject('player file missing type of id');
                } else {
                    targetPath = dir + '\\' + playerFileName;
                    if (oFile.path) {
                        logger.log('info', 'target path: ' + targetPath);
                        var source = fs.createReadStream(oFile.path);
                        var target = fs.createWriteStream(targetPath);
                        source.pipe(target);
                    } else {
                        reject('player file has no path');
                    }
                }
            } else {
                // Delete previous file (with any extension) if exists
                var contentFile = queryFile(contentPath + '/' + oFile.name, true);
                if (contentFile) {
                    fs.unlinkSync(contentFile.fileName);
                }
                urls.push('/content' + contentPath + '/' + oFile.name);
                targetPath = dir + '\\' + oFile.name;
                logger.log('info', 'target path: ' + targetPath);
                if (oFile.path) {
                    var source = fs.createReadStream(oFile.path);
                    var target = fs.createWriteStream(targetPath);
                    source.pipe(target);
                } else if (oFile.base64_data) {
                    fs.writeFileSync(targetPath, oFile.base64_data, 'base64');
                } else {
                    reject('unknown file');
                }
            }
        }
        fulfil(urls);
    });
}

router.head('/*', function(req, res) {
    var file = queryFile(req.url, req.query.complete);
    if (file) {
        if (file.redirected) {
            res.location('/content' + file.contentPath);
            res.status(302).send();
            return;
        }
        else {
            res.status(200).send();
        }
    }
    else {
        res.status(404).send();
    }
});

router.post('/*', multipart(), function(req, res) {
    try {
        var files = [];
        for (var key in req.files) {
            files.push(req.files[key]);
        }
        uploadFiles(req.url, files).then(function(urls) {
            res.status(200).send(urls);
        }, function(err) {
            logger.error('Error uploading files: ' + (err.message || err));
            res.status(400).send(err);
        });
    }
    catch (err) {
        logger.error('Error posting content: ' + (err.message || err));
        res.sendStatus(400);
    }
});

router.get('/*', function(req, res) {
     //logger.log('verbose', 'url:' + req.url);
     //logger.log('verbose', 'type:' + req.query.type);
     //console.log(req.session);
    var user = req.session ? req.session.user : null;
    CheckFilePermissions(req.url, user).then(function() {
        var file = queryFile(req.url, req.query.complete);
        if (file) {
            if (file.redirected) {
                res.redirect('/content' + file.contentPath);
            }
            else {
                if (file.IsEmpty) {
                    res.send('');
                } else {
                    var fileBaseName = path.basename(file.fileName);
                    //'Cache-control': 'max-age=0, must-revalidate'
                    var headers = {

                    };
                    if (!utils.ContainsHebrew(fileBaseName)) {
                        headers['File-name'] = fileBaseName;
                    }
                    res.sendFile(file.fileName, {
                        headers: headers
                    });
                }
            }
        }
        else {
            res.status(404).send();
        }
    }, function(err) {
        logger.log('verbose', 'Unauthorized file blocked: ' + err);
        res.sendStatus(401);
    });
 });

router.delete('/*', function(req, res) {
    var file = queryFile(req.url, req.query.complete);
    if (file) {
        fs.unlinkSync(file.fileName);
        res.status(204).send();
    }
    else {
        res.status(404).send();
    }
});

module.exports.router = router;
module.exports.query = queryFile;
module.exports.uploadFiles = uploadFiles;
module.exports.mkdirTree = mkdirTree;
