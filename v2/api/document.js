var express = require('express'),
    path = require('path');

var router = express.Router();

var settings = require('../../settings');

var util = require('./util');

var Schools = require('../models/schools');
var Season = require('../models/season');

router.get('/:schoolOrCity/*',function (req, res, next) {
    if (req.session.user) {
        //console.log(req.session.user);
        if (req.session.user.schoolID) {
            if (req.session.user.schoolID === parseInt(req.params.schoolOrCity)) {
                next();
                return;
            }
        } else if (req.session.user.cityID) {
            if (req.session.user.cityID === parseInt(req.params.schoolOrCity)) {
                next();
                return;
            }
        } else if (req.session.user.roles.indexOf('admin') >= 0) {
            next();
            return;
        }
    }
    res.status(403).end();
}, function (req, res) {
    //console.log(req.path);
    var rawPath = req.path;
    var filePath = '';
    if (rawPath.indexOf('project-') > 0 && rawPath.indexOf('-players') > 0) {
        var parts = rawPath.split(rawPath.indexOf('/') > 0 ? '/' : '\\');
        var matchingPart = parts.find(p => p.indexOf('project-') >= 0 && p.indexOf('-players') >= 0);
        if (matchingPart != null) {
            var projectId = parseInt(matchingPart.split('-')[1], 10);
            if (!isNaN(projectId) && projectId > 0)
                filePath = path.join(settings.cityContent, req.path);
        }
    } else {
        filePath = path.join(settings.schoolContent, req.path);
    }
    if (filePath.length > 0)
        res.status(200).sendFile(filePath);
    else
        res.sendStatus(404);
});

module.exports = router;
