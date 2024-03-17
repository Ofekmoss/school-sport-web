var express = require('express');
var Promise = require('promise');
var logger = require('../logger');
var data = require('./data');
var settings = require('../settings');
var nodemailer = require('nodemailer');
var utils = require('./utils');
var router = express.Router();

var sentFeedbacks = [];

function RateLimitFeedback(emailUniqueID) {
    return new Promise(function (fulfil, reject) {
        var now = new Date();
        var currentTime = now.getTime();
        var checkUntil = currentTime;
        var checkFrom = checkUntil - (settings.feedbackMail.rateLimitSpan * 60 * 1000);
        var sentCount = 0;
        for (var i = sentFeedbacks.length - 1; i >= 0; i--) {
            var curData = sentFeedbacks[i];
            if (curData.Time >= checkFrom && curData.Time <= checkUntil) {
                sentCount++;
            }
            if (curData.Time < checkFrom)
                break;
        }
        if (sentCount >= settings.feedbackMail.rateLimitAmount) {
            reject(sentCount);
        } else {
            sentFeedbacks.push({
                Token: emailUniqueID,
                Time: currentTime
            });
            fulfil('OK');
        }
    });
}

function ValidateFeedbackData(senderName, senderEmail, feedbackSubject, feedbackBody) {
    return new Promise(function (fulfil, reject) {
        if (senderName.length == 0) {
            reject('יש למלא שם');
        } else if (senderEmail.length == 0) {
            reject('יש למלא כתובת דוא"ל');
        } else if (!utils.IsValidEmail(senderEmail)) {
            reject('כתובת דוא"ל לא תקינה');
        } else if (feedbackSubject.length == 0 &&  feedbackBody.length == 0) {
            reject('יש למלא נושא או הודעה');
        } else {
            fulfil('OK');
        }
    });
}

function SendFeedback(senderName, senderEmail, feedbackSubject, feedbackBody) {
    return new Promise(function (fulfil, reject) {
        var smtpConfig = {
            host: settings.feedbackMail.host,
            port: settings.feedbackMail.port,
            secure: settings.feedbackMail.secure,
            auth: {
                user: settings.feedbackMail.username,
                pass: settings.feedbackMail.password
            },
            tls: {
                rejectUnauthorized:false
            }
        };
        if (feedbackBody == null || !feedbackBody)
            feedbackBody = '';
        while (feedbackBody.indexOf('\n') >= 0)
            feedbackBody = feedbackBody.replace('\n', '<br />');
        var emailContents = '<div dir="rtl" style="font-family: \'Alef Hebrew\',\'Helvetica Neue\', \'Helvetica\', \'Arial\', \'sans-serif\';">' +
            feedbackBody +
            '</div>';
        var recipient = {
            name: settings.feedbackMail.name,
            address: settings.feedbackMail.address
        };
        var emailSubject = settings.feedbackMail.subject;
        var transporter = nodemailer.createTransport(smtpConfig);
        var emailUniqueID = utils.GeneratePassword(10, 10) + '-' + (new Date()).getTime();
        logger.log('verbose', 'Got feedback from "' + senderName + '", email ' + senderEmail + ', subject length: ' +
            feedbackSubject.length + ', contents length: ' + feedbackBody.length);
        RateLimitFeedback(emailUniqueID).then(function() {
            if (feedbackSubject != null && feedbackSubject.length > 0)
                emailSubject += ' - ' + feedbackSubject;
            transporter.sendMail({
                from: {
                    name: senderName,
                    address: senderEmail
                },
                to: [recipient],
                subject: emailSubject,
                headers: {'UUID': emailUniqueID},
                html: emailContents
            }, function (err, mailSendInfo) {
                if (err) {
                    logger.log('error', 'Error sending feedback mail ' + emailUniqueID + ': ' + err);
                    reject({
                        Status: 500,
                        Error: 'ERROR'
                    })
                } else {
                    var sentMessageId = mailSendInfo ? mailSendInfo.messageId : '';
                    if (sentMessageId && sentMessageId.toString().length > 0) {
                        logger.log('info', 'Email with ID ' + emailUniqueID + ' sent successfully, message Id is: ' + sentMessageId);
                    } else {
                        logger.log('info', 'Send process for email with ID ' + emailUniqueID + ' completed, but without message Id');
                    }
                    fulfil(emailUniqueID);
                }
            });
        }, function(err) {
            logger.log('verbose', 'Feedback email ' + emailUniqueID + ' has been blocked due to rate limit');
            reject({
                Status: 429,
                Error: 'השרת עמוס כרגע, נא לנסות שוב עוד מספר דקות'
            })
        });
    });
}

router.post('/feedback', function (req, res) {
    console.log(req.body);
    //get single key
    var encodedContent = '';
    for (var key in req.body) {
        if (key.indexOf('"FullName"') > 0) {
            encodedContent = key + '';
        }
    }
    if (encodedContent.length > 0) {
        req.body = JSON.parse(encodedContent);
    }
    var senderName = utils.StripAllTags(req.body.FullName).trim();
    var senderEmail = utils.StripAllTags(req.body.Email).trim();
    var feedbackSubject = utils.StripAllTags(req.body.Subject).trim();
    var feedbackBody = utils.StripAllTags(req.body.Contents).trim();
    ValidateFeedbackData(senderName, senderEmail, feedbackSubject, feedbackBody).then(function() {
        SendFeedback(senderName, senderEmail, feedbackSubject, feedbackBody).then(function(token) {
            res.send({'Token': token});
        }, function(errorData) {
            res.status(errorData.Status).send(errorData.Error);
        });
    }, function(err) {
        res.status(400).send(err);
    });
});

router.get('/status', function (req, res) {
    res.send({'Buffer': sentFeedbacks});
});

module.exports = router;