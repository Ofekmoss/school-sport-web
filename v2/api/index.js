var express = require('express');

var settings = require('../../settings');

var Access = settings.v2test ? require('../test/access') : require('../models/access');
var Season = settings.v2test ? require('../test/season') : require('../models/season');

var router = express.Router();

// TODO - remove when not needed anymore
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

try {
    router.use('/registration', require('./registration'));
    router.use('/facilities', require('./facilities'));
    router.use('/finance', require('./finance'));
    router.use('/document', require('./document'));
    router.use('/admin', require('./admin'));
    router.use('/manage/categories', require('./manage/categories'));
    router.use('/manage/category-names', require('./manage/category-names'));
    router.use('/manage/seasons', require('./manage/seasons'));
    router.use('/manage/regions', require('./manage/regions'));
    router.use('/manage/cities', require('./manage/cities'));
    router.use('/manage/upcoming-events', require('./manage/upcoming-events'));
    router.use('/manage/dashboard', require('./manage/dashboard'));
    router.use('/manage/sports', require('./manage/sports'));
    router.use('/manage/schools', require('./manage/schools'));
    router.use('/manage/students', require('./manage/students'));
    router.use('/manage/championships', require('./manage/championships'));
    router.use('/manage/teams', require('./manage/teams'));
    router.use('/manage/players', require('./manage/players'));
    router.use('/regions', require('./regions'));
    router.use('/functionaries', require('./functionaries'));
    router.use('/schools', require('./schools'));
    router.use('/seasons', require('./seasons'));
    router.use('/cities', require('./cities'));
    router.use('/competitions', require('./competitions'));
    router.use('/manage/facilities', require('./manage/facilities'));
    router.use('/manage/users', require('./manage/users'));
    router.use('/accountingData', require('./accounting-data'));
}
catch (err) {
    console.log(err);
}

function Login(session, options) {
    return new Promise(function (fulfil, reject) {
        Access.login(options, function (err, result) {
            if (err) {
                var status = err.status ? err.status : 500;
                var message = err.message ? err.message : '';
                var end = (status == 500);
                reject({
                    status: status,
                    message: message,
                    end: end
                });
                return;
            }

            //remove previous login
            delete session.user;
            delete session.permissions;

            var delegatedUser = options.delegatedUser;
            session.user = result;
            if (options.userid != null && delegatedUser != null) {
                session.user.delegatedUser = delegatedUser;
            }
            //console.log(result);
            fulfil({
                id: session.user.id,
                name: session.user.displayName,
                username: session.user.username,
                school: session.user.schoolID,
                region: session.user.regionID,
                defaultRoute: session.user.defaultRoute,
                roles: session.user.roles,
                city: session.user.cityID,
                cityName: session.user.cityName,
                regionName: session.user.regionName,
                season: session.user.season,
                activeSeason: session.user.activeSeason,
                delegatedUser: delegatedUser
            });
        });
    });
}

router.get('/login', function (req, res) {
    if (req.session.user) {
        Season.current(req.session.user, function(currentSeason) {
            res.status(200).send({
                id: req.session.user.id,
                name: req.session.user.displayName,
                username: req.session.user.username,
                school: req.session.user.schoolID,
                region: req.session.user.regionID,
                defaultRoute: req.session.user.defaultRoute,
                roles: req.session.user.roles,
                city: req.session.user.cityID,
                cityName: req.session.user.cityName,
                regionName: req.session.user.regionName,
                coordinatedRegionId: req.session.user.coordinatedRegionID,
                coordinatedRegionName: req.session.user.coordinatedRegionName,
                season: currentSeason,
                activeSeason: req.session.user.activeSeason,
                delegatedUser: req.session.user.delegatedUser
            });
        });
    } else {
        res.status(404).end();
    }
});

router.post('/find-user', function (req, res) {
    if (req.body.details) {
        Access.findUser(req.body.details, function (foundUser) {
            res.status(200).send(foundUser[0]);
        })    
    } else {
        res.status(404).end();
    }
});

router.post('/edit-user', function (req, res) {
    if (req.body.details) {
        Access.editUser(req.body.details, function () {
            res.status(200).send({user_updated: true});
        })    
    } else {
        res.status(404).end();
    }
});

router.post('/create-user', function (req, res) {
    if (req.body.details) {
        Access.createUser(req.body.details, function (userRes) {
            res.status(200).send({status: "ok", user_id: userRes[0]?.user_id});
        })    
    } else {
        res.status(404).end();
    }
});

router.post('/create-school', function (req, res) {
    if (req.body.details) {
        Access.createSchool(req.body.details, function (schoolRes) {
            res.status(200).send({status: "ok", school_id: schoolRes[0]?.school_id});
        })    
    } else {
        res.status(404).end();
    }
});

router.get('/season', function (req, res) {
    if (req.session.user) {
        Season.current(req.session.user, function(currentSeason) {
            res.status(200).send({
                season: currentSeason
            });
        });
    } else {
        res.status(404).end();
    }
});

router.get('/tokens', function (req, res) {
    Access.getTokens(req.session.user, function (err, tokens) {
        if (err) {
            if (err.status) {
                res.status(err.status).send(err.message);
            }
            else {
                res.status(500).send(err);
            }
        } else {
            res.status(200).send(tokens);
        }
    });
});

// must be get or create tokens
router.post('/tokens/get-or-create', function (req, res) {
    var user = {
        schoolID: req.body.schoolID,
        season: req.body.season,
        users: req.body.users
    };
    Access.getOrCreateTokens(user, function (err, tokens) {
        if (err) {
            if (err.status) {
                res.status(err.status).send(err.message);
            }
            else {
                res.status(500).send(err);
            }
        } else {
            res.status(200).send(tokens);
        }
    });
});

router.post('/tokens/update-token', function (req, res) {
    var user = {
        schoolID: req.body.schoolID,
        season: req.body.season,
        users: req.body.users
    };
    Access.updateTokens(user, function (err, tokens) {
        if (err) {
            if (err.status) {
                res.status(err.status).send(err.message);
            }
            else {
                res.status(500).send(err);
            }
        } else {
            res.status(200).send(tokens);
        }
    });
});

//
router.get('/useChampionshipNameSportFields', function (req, res) {
    var sportFields = settings.useChampionshipNameSportFields;
    if (sportFields == null)
        sportFields = [];
    res.status(200).send(sportFields);
});

router.post('/login', function (req, res) {
    /*
    req.body.userid = 225;
    req.body.delegatedUser = {
        id: 110,
        name: 'יהב'
    };
    */
    if (req.body.userid && req.body.delegatedUser) {
        //only admin!
        if (req.session.user == null || req.session.user.role != 1) {
            req.body.userid = null;
            req.body.delegatedUser = null;
        }
    }
    Login(req.session, req.body).then(function(user) {
        res.status(200).send(user);
    }, function(err) {
        if (err.status == 500) {
            console.log('error during login');
            console.log(err);
        }
        if (err.end) {
            res.status(500).end();
        } else {
            res.status(err.status).send(err.message);
        }
    });
});

router.post('/logout', function (req, res) {
    //delegatedUser
    if (req.session) {
        var delegated = req.session.user ? req.session.user.delegatedUser : null;
        if (delegated != null) {
            console.log('Delegated user logout, logging back in as ' + delegated.id);
            var options = {
                userid: delegated.id
            };
            Login(req.session, options).then(function(user) {
                res.status(200).send(user);
            }, function(err) {
                console.log('error during login');
                console.log(err);
                if (err.end) {
                    res.status(500).end();
                } else {
                    res.status(err.status).send(err.message);
                }
            });
            return;
        }
        delete req.session.user;
        delete req.session.permissions;
    }
    res.status(200).send();
});

router.get('/general-data', function (req, res) {
    res.status(200).send({
        ContentSiteUrl: settings.contentSiteBaseUrl,
        SportsmanLatestVersion: settings.sportsmanLatestVersion
    });
});

router.get('/cache', function (req, res) {
    if (req.session && req.session.user && req.session.user.id) {
        var key = req.query.key || '';
        var isEmpty = key.length === 0;
        var tooLong = key.length > 50;
        if (isEmpty || tooLong) {
            res.status(400).send('Missing or invalid key');
            return;
        }
        var isGlobal = req.query.global === '1';
        key = 'user-' + (isGlobal ? '*' : req.session.user.id) + '-' + key;
        var cache = require('../../api/cache');
        //console.log('reading cache key "' + key + '"...');
        cache.read(key).then(function(value) {
            res.status(200).send({
                Value: value
            });
        }, function(err) {
            if (err == 'empty') {
                res.status(200).send({
                    Value: null
                });
            } else {
                res.status(500).send(err);
            }
        });
    }
    else {
        res.status(403).end();
    }
});

router.post('/cache', function (req, res) {
    if (req.session && req.session.user && req.session.user.id) {
        var key = req.body.key || '';
        var value = req.body.value;
        var isEmpty = key.length === 0;
        var tooLong = key.length > 50;
        if (isEmpty || tooLong) {
            res.status(400).send('Missing or invalid key');
            return;
        }
        if (value != null && value.length > 5000) {
            res.status(400).send('Value too big');
            return;
        }
        var userKey = req.session.user.id;
        if (req.body.global == '1') {
            //only admins can set global cache values
            if (req.session.user.role === 1) {
                console.log('Setting global key for ' + req.body.key);
                userKey = '*';
            } else {
                console.log('Asked to set global key ' + req.body.key + ', but user ' + req.session.user.id + ' is not admin');
            }
        }
        key = 'user-' + userKey + '-' + key;
        var cache = require('../../api/cache');
        cache.write(key, value, 9000000).then(function() {
            console.log('Cache updated, key: ' + key);
            res.status(200).send({
                Status: 'Success'
            });
        }, function(err) {
            res.status(500).send(err);
        });
    }
    else {
        res.status(403).end();
    }
});

module.exports = router;