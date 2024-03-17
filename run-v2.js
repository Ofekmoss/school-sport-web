var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var compression = require('compression');
var morgan = require('morgan');
var path = require('path');
var logger = require('./logger');

var app = express();

app.use(compression());


//app.use('/v2/school', express.static(path.join(__dirname, 'v2/dist')));

app.use('/api', bodyParser.json({limit: '50mb'}));
app.use('/api', bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: 'asdlkosmwu3119dlsmnr ty',
    resave: false,
    saveUninitialized: true
}));

app.use(morgan('short', { stream: { write: function(str) { logger.info(str.substr(0, str.length - 1)); } } }));

app.use('/favicon.ico', express.static(path.join(__dirname, 'favicon.ico')));
app.get('/v2/school', function (req, res) { res.redirect('/v2'); });
app.use('/v2', require('./v2/app'));
app.use('/api/v2', require('./v2/api'));

app.use(function(err, req, res, next) {
    logger.error(err.message);
    res.status(err.status || 500).send();
});

var server = app.listen(80, function() {
    logger.log('info', 'Listening on port %d', server.address().port);
});
