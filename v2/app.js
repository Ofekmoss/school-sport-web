var express = require('express'),
    path = require('path');

var router = express.Router();

var paths = {
    '/css/': true,
    '/fonts/': true,
    '/img/': true,
    '/index.html': true,
    '/js/general/': true,
    '/js/generic/': true,
    '/js/templates/components.js': true,
    '/js/components/': true,
    '/js/services/': true,
    '/js/templates/default.js': true,
    '/js/templates/general.js': true,
    '/js/templates/generic.js': true,
    '/js/dialog.js': true,
    '/js/event-bus.js': true,
    '/js/login.js': true,
    '/js/main.js': true,
    '/js/utils.js': true,
    '/js/consts.js': true,
    '/js/vendor.min.js': true,
    '/js/views.js': true,
	'/js/imports/vuejs-datepicker.js': true,
	'/js/imports/vue-chartjs.js': true,
	'/js/imports/he.js': true,
    '/js/registration/': {'school': true, 'city': true, 'admin': true},
    '/js/templates/registration.js': {'school': true, 'city': true, 'admin': true},
    '/js/principal-approval/': {'principal-approval': true},
    '/js/templates/principal-approval.js': {'principal-approval': true},
    '/js/representative-approval/': {'representative-approval': true},
    '/js/templates/representative-approval.js': {'representative-approval': true},
    '/js/admin/': {'admin': true},
    '/js/templates/admin.js': {'admin': true},
    '/js/supervisor/': {'supervisor': true},
    '/js/templates/supervisor.js': {'supervisor': true},
    '/js/project-supervisor/': {'sport-admin': true, 'admin': true},
    '/js/templates/project-supervisor.js': {'sport-admin': true, 'admin': true},
    '/js/finance/': { 'admin': true, 'finance': true },
    '/js/templates/finance.js': { 'admin': true, 'finance': true },
	'/js/finance/team-payments-approval.js': { 'admin': true, 'finance': true },
    '/js/finance/payment-requests.js': { 'admin': true, 'finance': true },
    '/js/finance/accounts.js': { 'admin': true, 'finance': true },
    '/js/finance/receipts.js': { 'admin': true, 'finance': true },
    '/js/manage/': {'admin': true},
	'/js/manage.js': {'admin': true},
    '/js/manage/components/': {'admin': true},
    '/js/templates/manage.js': {'admin': true},
    '/js/competitions/': {'admin': true},
    '/js/templates/competitions.js': {'admin': true},
	'/js/imports/': {'school': true, 'city': true, 'admin': true}
};

router.use('/',
    function (req, res, next) {
        if (req.url === '/') {
            next();
            return;
        }
        var permission = paths[req.url];
        if (permission == null) {
            for (var key in paths) {
                if (key[key.length - 1] === '/' && req.url.lastIndexOf(key, 0) >= 0) {
                    permission = paths[key];
                    paths[req.url] = permission;
                    break;
                }
            }
        }
        if (permission === true) {
            next();
            return;
        }
        else if (permission && req.session && req.session.user && req.session.user.roles) {
            for (var r = 0; r < req.session.user.roles.length; r++) {
                if (permission[req.session.user.roles[r]]) {
                    next();
                    return;
                }
            }
        }
        res.status(403).end();
    },
    express.static(path.join(__dirname, 'dist')));

module.exports = router;
