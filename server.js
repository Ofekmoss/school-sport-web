var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var logger = require('./logger');
var api = require('./api/route');
var sql = require('mssql');
var https = require('https');
var fs = require('fs');
var path = require('path');
var content = require('./content');
var settings = require('./settings');
var MSSQLStore = require('connect-mssql')(session);
var sport = require('./v1/route');
var manage = require('./manage/route');
var compression = require('compression');

var app = express();

// compress all responses
app.use(compression());

app.use(function (req, res, next){
    // Website you wish to allow to connect
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.use('/v5', express.static(path.join(__dirname, 'v5')));

app.use('/v1', express.static(path.join(__dirname, 'v1')));
app.use('/manage', express.static(path.join(__dirname, 'manage')));
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));

app.use('/api', bodyParser.json({limit: '50mb'}));
app.use('/api', bodyParser.urlencoded({
    extended: true
}));

app.use(function(req, res, next){
    if (req.url && (req.url.indexOf('/v2/') >= 0 ||
        req.url.indexOf('/v1/') >= 0 ||
        req.url.indexOf('/api/') >= 0) ||
        req.url.indexOf('/PaymentNotifications/') >= 0) {
        session({
            secret: 'asdlkosmwu3119dlsmnr ty',
            resave: true,
            saveUninitialized: true,
            store: new MSSQLStore(settings.sqlConfig),
            cookie: {
                //httpOnly: false
                //, secure: true
            }
        })(req, res, next);
    } else {
        next();
    }
});

app.use(morgan('short', { stream: { write: function(str) { logger.info(str.substr(0, str.length - 1)); } } }));

app.use('/content', content.router);
app.use('/api', api);

app.use('/sport', express.static(path.join(__dirname, 'sport'))); //sport
app.use('/', express.static(path.join(__dirname, 'sport'))); //sport


try {
    app.use('/favicon.ico', express.static(path.join(__dirname, 'favicon.ico')));
    app.get('/v2/school', function (req, res) { res.redirect('/v2'); });
    //app.use('/v2/school', express.static(path.join(__dirname, 'v2/dist')));
    app.use('/v2', require('./v2/app'));
    app.use('/api/v2', require('./v2/api'));
    var processes = require('./v2/processes');
} catch (err) {
	console.log(err);
	throw err;
}
/*
app.use(function noCache(req, res, next){
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires",0);
    next();
});
*/

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    logger.error(err.message);
    res.status(err.status || 500).send();
});

var server = app.listen(5000, function() {
    logger.log('info', 'Listening on port %d', server.address().port);
});


var options = {
    key: fs.readFileSync('schoolsport-key.pem'),
    cert: fs.readFileSync('schoolsport-cert.pem')
};

var secureServer = https.createServer(options, app);
//www.schoolsport.co.il
//"192.168.0.1"
secureServer.listen(5443, function() {
    logger.log('info', 'Listening on secure port %d', secureServer.address().port);
});





