var express = require('express');
var Promise = require('promise');
var logger = require('../logger');
var data = require('./data');
var utils = require('./utils');
var seasons = require('./seasons');
var ifaService = require('./ifa-service');
var settings = require('../settings');
var helpers = require('./sportsman-helpers');
var request = require('request');
var router = express.Router();

function ReadSQL(qs, title) {
    return new Promise(function (fulfil, reject) {
        helpers.CreateConnection().then(function (connection) {
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading ' + title + ': ' + (err.message || err));
                    reject('error reading data');
                }
                else {
                    fulfil(recordset);
                }
            });
        }, function (err) {
            reject('error creating connection');
        });
    });
}

function GetRegions() {
    var qs = 'Select r.REGION_ID, r.REGION_NAME, r.[ADDRESS], r.[PHONE], r.[FAX], r.[COORDINATOR] As COORDINATOR_ID, r.[number], ' +
        '   u.USER_FIRST_NAME As COORDINATOR_FIRST_NAME, u.USER_LAST_NAME As COORDINATOR_LAST_NAME ' +
        'From REGIONS r Left Join Users u On r.[COORDINATOR]=u.[USER_ID] ' +
        'Where r.DATE_DELETED Is Null And u.DATE_DELETED Is Null ' +
        'Order By r.[number] Asc';
    return ReadSQL(qs, 'sportsman regions');
}

function GetSchoolUserData(schoolSymbol) {
    return new Promise(function (fulfil, reject) {
        helpers.CreateConnection().then(function (connection) {
            var qs = 'Select u.[USER_ID], u.USER_LOGIN, u.USER_FIRST_NAME, u.USER_LAST_NAME, u.REGION_ID, r.REGION_NAME, ' +
                '   u.SCHOOL_ID, s.SCHOOL_NAME ' +
                'From USERS u Inner Join REGIONS r On u.REGION_ID=r.REGION_ID ' +
                '   Inner Join SCHOOLS s On u.SCHOOL_ID=s.SCHOOL_ID ' +
                'Where u.DATE_DELETED Is Null And u.SCHOOL_ID=(Select SCHOOL_ID From SCHOOLS Where SYMBOL=@symbol)';
            var request = connection.request();
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading school user data: ' + (err.message || err));
                    reject('error reading data');
                }
                else {
                    if (recordset == null || recordset.length == 0) {
                        fulfil({});
                    } else {
                        fulfil(recordset[0]);
                    }
                }
            });
        }, function (err) {
            reject('error creating connection');
        });
    });
}

function GetUpcomingEvents(connection, query) {
    return new Promise(function (fulfil, reject) {
        const isLeague = query.league == 'true';
        var limit = utils.GetSafeNumber(query.limit, 0);
        var region = utils.GetSafeNumber(query.region,-1);
        var sport = utils.GetSafeNumber(query.sport,0);
        var category = utils.GetSafeNumber(query.category,0);
        var month = utils.GetSafeNumber(query.month,-1);
        var year = utils.GetSafeNumber(query.year,-1);
        var leagueFilters = utils.BuildLeagueFilters(query);
        helpers.GetCurrentSeason(connection, 'upcoming events').then(function (curSeason) {
            if (query.season)
                curSeason = query.season;
            var qs = 'Select ';
            if (limit > 0)
                qs += 'Top ' + limit + ' ';
            qs += 'CONCAT (c.CHAMPIONSHIP_NAME, \' (\', Case c.REGION_ID When 0 Then \'ארצי\' Else r.REGION_NAME End, \') \', cmp.CATEGORY_NAME) As [title], ' +
                '   CONCAT(dbo.BuildTeamName(s1.SCHOOL_NAME, ct1.CITY_NAME, t1.TEAM_INDEX, DEFAULT, DEFAULT), \' נגד \', dbo.BuildTeamName(s2.SCHOOL_NAME, ct2.CITY_NAME, t2.TEAM_INDEX, DEFAULT, DEFAULT)) As [subTitle], ' +
                '   cm.[TIME] As [description], s.SPORT_ID As sportId, c.REGION_ID As regionId, s.SPORT_NAME as sportName, ' +
                '   cc.CHAMPIONSHIP_ID As championshipId, ' +
                '   cc.CHAMPIONSHIP_CATEGORY_ID As categoryId ' +
                'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
                '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIP_PHASES cp On cm.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cp.PHASE ' +
                '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt1 On cgt1.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt1.PHASE=cm.PHASE And cgt1.NGROUP=cm.NGROUP And cgt1.[POSITION]=cm.TEAM_A And cgt1.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt2 On cgt2.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt2.PHASE=cm.PHASE And cgt2.NGROUP=cm.NGROUP And cgt2.[POSITION]=cm.TEAM_B And cgt2.DATE_DELETED Is Null ' +
                '   Inner Join TEAMS t1 On cgt1.TEAM_ID=t1.TEAM_ID And t1.DATE_DELETED Is Null ' +
                '   Inner Join TEAMS t2 On cgt2.TEAM_ID=t2.TEAM_ID And t2.DATE_DELETED Is Null ' +
                '   Inner Join SCHOOLS s1 On t1.SCHOOL_ID=s1.SCHOOL_ID And s1.DATE_DELETED Is Null ' +
                '   Inner Join SCHOOLS s2 On t2.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null ' +
                '   Left Join CATEGORY_MAPPING cmp On cc.[CATEGORY]=cmp.RAW_CATEGORY ' +
                '   Left Join REGIONS r On c.REGION_ID=r.REGION_ID ' +
                '   Left Join CITIES ct1 On s1.CITY_ID=ct1.CITY_ID And ct1.DATE_DELETED Is Null ' +
                '   Left Join CITIES ct2 On s2.CITY_ID=ct2.CITY_ID And ct2.DATE_DELETED Is Null ' +
                'Where cm.DATE_DELETED Is Null And c.SEASON=@season And cm.[TIME] Is Not Null '; //And (dbo.SameDay(cm.[TIME], GetDate())=1 Or cm.[TIME]>=GetDate()) ';
            if (region >= 0) {
                qs += 'And c.REGION_ID=@region ';
            }
            if (sport > 0) {
                qs += 'And c.SPORT_ID=@sport ';
            }
            if (category > 0) {
                qs += 'And cm.CHAMPIONSHIP_CATEGORY_ID=@category ';
            }
            if (year > 2000) {
                qs += 'And DATEPART(year, cm.[TIME])=@year ';
            }
            if (month > 0) {
                qs += 'And DATEPART(month, cm.[TIME])=@month ';
            }
            if (isLeague) {
                qs += 'And c.IS_LEAGUE=1 ';
            } else if (leagueFilters != null && leagueFilters.length > 0) {
                qs += 'And (';
                for (var i = 0; i < leagueFilters.length; i++) {
                    if (i > 0)
                        qs += ' Or ';
                    qs += '(cc.CATEGORY=@c' + (i + 1) + ' And c.SPORT_ID=@s' + (i + 1) + ')';
                }
                qs += ')';
            }
            qs += 'Order By cm.[TIME] Asc';
            helpers.CreateConnection().then(function (sportsmanConnection) {
                var request = sportsmanConnection.request();
                request.input('season', curSeason);
                if (leagueFilters != null && leagueFilters.length > 0) {
                    for (var i = 0; i < leagueFilters.length; i++) {
                        var filter = leagueFilters[i];
                        request.input('c' + (i + 1), filter.category);
                        request.input('s' + (i + 1), filter.sport);
                    }
                }
                if (region >= 0) {
                    request.input('region', region);
                }
                if (sport > 0) {
                    request.input('sport', sport);
                }
                if (category > 0) {
                    request.input('category', category);
                }
                if (year > 2000) {
                    request.input('year', year);
                }
                if (month > 0) {
                    request.input('month', month);
                }
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading upcoming events results: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        fulfil(recordset);
                    }
                });
            }, function (err) {
                reject('ERROR');
            });
        }, function (err) {
            reject(err);
        });
    });
}

function GetUserPayments(user) {
    return new Promise(function (fulfil, reject) {
        helpers.CreateConnection().then(function (connection) {
            var qs = 'Select [Payment] ' +
                'From TeamRegistrations ' +
                'Where [School]=@school';
            var request = connection.request();
            request.input('school', user.schoolID);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading user payments: ' + (err.message || err));
                    reject('error reading data');
                } else {
                    var payments = [];
                    if (recordset != null) {
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var payment = row['Payment'];
                            payments.push(payment);
                        }
                    }
                    fulfil(payments);
                }
            });
        }, function (err) {
            reject('error creating connection');
        });
    });
}

function GetPermanentChampionships() {
    var qs = 'Select wpc.CHAMPIONSHIP_CATEGORY_ID, wpc.CHAMPIONSHIP_TITLE, wpc.CHAMPIONSHIP_INDEX, c.SPORT_ID ' +
        'From WEBSITE_PERMANENT_CHAMPIONSHIPS wpc Left Join CHAMPIONSHIP_CATEGORIES cc On wpc.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
        '   Left Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
        'Order By wpc.CHAMPIONSHIP_INDEX Asc';
    return ReadSQL(qs, 'sportsman permanent championships');
}

function GetSeasonsInUse() {
    return new Promise(function (fulfil, reject) {
        seasons.read('all').then(function(allSeasons) {
            if (allSeasons.length > 0) {
                var nameMapping = {};
                for (var i = 0; i < allSeasons.length; i++) {
                    var curSeason = allSeasons[i];
                    nameMapping[curSeason.Name] = curSeason;
                }
                helpers.CreateConnection().then(function (connection) {
                    var qs = 'Select Distinct c.[SEASON], s.[Name] ' +
                        'From CHAMPIONSHIPS c Inner Join SEASONS s On c.[SEASON]=s.[SEASON] And c.CHAMPIONSHIP_STATUS>0 ' +
                        'Where c.DATE_DELETED Is Null And s.DATE_DELETED Is Null ' +
                    'Order By c.[SEASON] Desc';
                    var request = connection.request();
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading sportsman seasons in use: ' + (err.message || err));
                            reject('Error while reading existing seasons');
                        }
                        else {
                            var sportsmanSeasons = [];
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                var curSeasonName = row['Name'];
                                var curSeason = nameMapping[curSeasonName];
                                if (curSeason) {
                                    curSeason.SeasonCode = row['SEASON'];
                                    sportsmanSeasons.push(curSeason);
                                }
                            }
                            if (sportsmanSeasons.length > 0) {
                                fulfil(sportsmanSeasons);
                            } else {
                                reject('No matching seasons in database');
                            }
                        }
                    });
                }, function (err) {
                    reject('Error creating connection');
                });
            } else {
                reject('No seasons in database');
            }
        }, function(err) {
            reject('error reading all seasons');
        });
    });
}

router.get('/data-gateway', function (req, res) {
    res.send(settings.Sportsman.DataGatewayUrl);
});

router.get('/school/:symbol/teams', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.params.symbol;
    helpers.Championship.SchoolTeams(schoolSymbol).then(function(teams) {
        res.send(teams);
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/school/:symbol/details', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.params.symbol;
    helpers.School.Details(schoolSymbol).then(function(details) {
        res.send(details);
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/school/:symbol/personnel', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.params.symbol;
    helpers.School.Personnel(schoolSymbol).then(function(details) {
        res.send(details);
    }, function(err) {
        res.sendStatus(500);
    });
});

router.post('/school/personnel', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var schoolSymbol = req.session.user.schoolSymbol;
    if (schoolSymbol == null || !schoolSymbol || schoolSymbol.length == 0) {
        res.sendStatus(402);
        return;
    }

    var schoolData = req.body;
    helpers.CreateConnection().then(function(connection) {
        var qs = 'Update SCHOOLS ' +
            'Set MANAGER_NAME=@manager_name, PHONE=@phone, FAX=@fax, EMAIL=@email ' +
            'Where DATE_DELETED Is Null And SYMBOL=@symbol';
        var request = connection.request();
        request.input('symbol', schoolSymbol);
        request.input('manager_name', schoolData.ManagerName);
        request.input('phone', schoolData.PhoneNumber);
        request.input('fax', schoolData.FaxNumber);
        request.input('email', schoolData.ManagerEmail);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error updating school ' + schoolSymbol + ' personnel: ' + (err.message || err));
                res.sendStatus(400);
            }
            else {

                qs = "Delete From SchoolClubData " +
                    "Where SchoolSymbol=@symbol And PropertyName In " +
                    "('School_Data_ManagerName', 'School_Data_PhoneNumber', 'School_Data_FaxNumber', 'School_Data_ManagerEmail')";
                request = req.connection.request();
                request.input('symbol', schoolSymbol);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error removing club data for school ' + schoolSymbol + ': ' + (err.message || err));
                        res.sendStatus(500);
                    } else {
                        res.send('OK');
                    }
                });
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/events', function (req, res) {
    function ParseMatchTeam(eventData, teamLetter, previousGroupMapping, matchWinnersAndLosers) {
        var schoolPropName = 'Team' + teamLetter + '_School';
        var existingSchoolName = eventData[schoolPropName] || '';
        var parsedSchool = null, parsedCity = null;
        //when there is actual team, no  point to check relative
        if (existingSchoolName.length == 0) {
            //previous group team comes first
            var prevGroupPropName = 'PreviousGroup_' + teamLetter;
            var existingPrevGroup = eventData[prevGroupPropName];
            if (existingPrevGroup != null) {
                var key = (parseInt(eventData['PHASE']) - 1) + '_' + existingPrevGroup;
                if (previousGroupMapping[key]) {
                    var prevPositionPropName = 'PreviousPosition_' + teamLetter;
                    var existingPrevPosition = eventData[prevPositionPropName] || 0;
                    parsedSchool = previousGroupMapping[key] + ' מיקום ' + (parseInt(existingPrevPosition) + 1);
                }
            } else {
                var relativeTeamPropName = 'relative_team_' + teamLetter.toLowerCase();
                var existingRelativeTeam = parseInt(eventData[relativeTeamPropName]);
                if (!isNaN(existingRelativeTeam) && existingRelativeTeam != 0) {
                    var relativeWinnerLoser = matchWinnersAndLosers[Math.abs(existingRelativeTeam).toString()];
                    if (existingRelativeTeam > 0) {
                        if (relativeWinnerLoser != null) {
                            parsedSchool = relativeWinnerLoser.Winner.School;
                            parsedCity = relativeWinnerLoser.Winner.City;
                        } else {
                            parsedSchool = 'מנצחת משחק ' + existingRelativeTeam;
                        }
                    } else {
                        if (relativeWinnerLoser != null) {
                            parsedSchool = relativeWinnerLoser.Loser.School;
                            parsedCity = relativeWinnerLoser.Loser.City;
                        } else {
                            parsedSchool = 'מפסידת משחק ' + (existingRelativeTeam * -1);
                        }
                    }
                }
            }
        }
        return parsedSchool ? {
            'School': parsedSchool,
            'City': parsedCity
        } : null;
    }

    function ParseWinnerLoser(matchData) {
        var winnerSchool = null, winnerCity = null, loserSchool = null,  loserCity = null;
        switch (matchData['RESULT']) {
            case 1:
            case 3:
                winnerSchool = matchData['TeamA_School'];
                winnerCity = matchData['TeamA_City'];
                loserSchool = matchData['TeamB_School'];
                loserCity = matchData['TeamB_City'];
                break;
            case 2:
            case 4:
                winnerSchool = matchData['TeamB_School'];
                winnerCity = matchData['TeamB_City'];
                loserSchool = matchData['TeamA_School'];
                loserCity = matchData['TeamA_City'];
                break;
        }
        return winnerSchool == null ? null : {
            Winner: {
                School: winnerSchool,
                City: winnerCity
            },
            Loser: {
                School: loserSchool,
                City: loserCity
            }
        }
    }

    function GetPreviousGroupMapping(connection, champCategoryId, rowsWithPreviousGroup) {
        return new Promise(function (fulfil, reject) {
            if (rowsWithPreviousGroup == 0 || !champCategoryId || champCategoryId == null) {
                fulfil({});
            } else {
                var qs = 'Select [PHASE], [NGROUP], [GROUP_NAME] ' +
                    'From CHAMPIONSHIP_GROUPS ' +
                    'Where CHAMPIONSHIP_CATEGORY_ID=@category';
                var request = connection.request();
                request.input('category', champCategoryId);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading previous groups mapping: ' + (err.message || err));
                        reject('error reading data');
                    }
                    else {
                        var mapping = {};
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var key = row['PHASE'] + '_' + row['NGROUP'];
                            mapping[key] = row['GROUP_NAME'];
                        }
                        fulfil(mapping);
                    }
                });
            }
        });
    }

    var season = req.query.season;
    var champCategoryId = parseInt(req.query.category);
    seasons.read(season).then(function(matchingSeasons) {
        if (matchingSeasons && matchingSeasons.length == 1) {
            var matchingSeason = matchingSeasons[0];
            var gotCategory = !isNaN(champCategoryId) && champCategoryId > 0;
            var timeOrCatFilter_1 = gotCategory ? 'cm.CHAMPIONSHIP_CATEGORY_ID=@category' : 'cm.[Time] Between @first_day And @last_day';
            var timeOrCatFilter_2 = gotCategory ? 'cco.CHAMPIONSHIP_CATEGORY_ID=@category' : 'cco.[Time] Between @first_day And @last_day';
            helpers.CreateConnection().then(function(connection) {
                var qs = 'Select 1 As ChampionshipType, cc.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_NAME, c.IS_CLUBS, mapp.CATEGORY_NAME, cm.[TIME], DateDiff(s, \'1970-01-01\', cm.[TIME]) As SecondsSinceEpoch, ' +
                    '   cm.NGROUP, cm.PARTS_RESULT, s1.SCHOOL_NAME As TeamA_School, cit1.CITY_NAME As TeamA_City, s2.SCHOOL_NAME As TeamB_School, ' +
                    '   cit2.CITY_NAME As TeamB_City, cyc.CYCLE_NAME, rou.ROUND_NAME, pha.PHASE_NAME, c.SPORT_ID, sp.SPORT_NAME, 0 As SPORT_FIELD_ID, \'\' As SPORT_FIELD_NAME, ' +
                    '   0 As SPORT_FIELD_TYPE_ID, \'\' As SPORT_FIELD_TYPE_NAME, cg.GROUP_NAME, fac.FACILITY_NAME, fac.[ADDRESS] As FACILITY_ADDRESS, fac_city.CITY_NAME As FACILITY_CITY, ' +
                    '   cm.[RESULT] As MatchResult, cm.TEAM_A_SCORE, cm.TEAM_B_SCORE, cm.relative_team_a, cm.relative_team_b, cm.PHASE, cm.[RESULT], cm.match_number, cm.DATE_CHANGED_DATE, ' +
                    '   cgt1.PREVIOUS_GROUP As PreviousGroup_A, cgt2.PREVIOUS_GROUP As PreviousGroup_B, cgt1.PREVIOUS_POSITION As PreviousPosition_A, ' +
                    '   cgt2.PREVIOUS_POSITION As PreviousPosition_B, t1.TEAM_ID As TEAM_A_ID, t2.TEAM_ID As TEAM_B_ID, t1.TEAM_INDEX As TeamA_Index, t2.TEAM_INDEX As TeamB_Index ' +
                    'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                    '   Inner Join CHAMPIONSHIP_GROUPS cg On cm.CHAMPIONSHIP_CATEGORY_ID=cg.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cg.PHASE And cm.NGROUP=cg.NGROUP ' +
                    '   Inner Join CHAMPIONSHIP_CYCLES cyc On cm.CHAMPIONSHIP_CATEGORY_ID=cyc.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cyc.PHASE And cm.NGROUP=cyc.NGROUP And cm.[ROUND]=cyc.[ROUND] And cm.[CYCLE]=cyc.[CYCLE] ' +
                    '   Inner Join CHAMPIONSHIP_ROUNDS rou On cm.CHAMPIONSHIP_CATEGORY_ID=rou.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=rou.PHASE And cm.NGROUP=rou.NGROUP And cm.[ROUND]=rou.[ROUND] ' +
                    '   Inner Join CHAMPIONSHIP_PHASES pha On cm.CHAMPIONSHIP_CATEGORY_ID=pha.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=pha.PHASE ' +
                    '   Left Join CHAMPIONSHIP_GROUP_TEAMS cgt1 On cm.CHAMPIONSHIP_CATEGORY_ID=cgt1.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt1.PHASE And cm.NGROUP=cgt1.NGROUP And cm.TEAM_A=cgt1.[POSITION] ' +
                    '   Left Join TEAMS t1 On cgt1.TEAM_ID=t1.TEAM_ID ' +
                    '   Left Join SCHOOLS s1 On t1.SCHOOL_ID=s1.SCHOOL_ID ' +
                    '   Left Join CITIES cit1 On s1.CITY_ID=cit1.CITY_ID ' +
                    '   Left Join CHAMPIONSHIP_GROUP_TEAMS cgt2 On cm.CHAMPIONSHIP_CATEGORY_ID=cgt2.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt2.PHASE And cm.NGROUP=cgt2.NGROUP And cm.TEAM_B=cgt2.[POSITION] ' +
                    '   Left Join TEAMS t2 On cgt2.TEAM_ID=t2.TEAM_ID ' +
                    '   Left Join SCHOOLS s2 On t2.SCHOOL_ID=s2.SCHOOL_ID ' +
                    '   Left Join CITIES cit2 On s2.CITY_ID=cit2.CITY_ID ' +
                    '   Left Join CATEGORY_MAPPING mapp On cc.[CATEGORY]=mapp.RAW_CATEGORY ' +
                    '   Left Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID ' +
                    '   Left Join FACILITIES fac On cm.FACILITY_ID=fac.FACILITY_ID ' +
                    '   Left Join CITIES fac_city On fac.CITY_ID=fac_city.CITY_ID ' +
                    'Where cm.DATE_DELETED Is Null And cc.DATE_DELETED Is Null And cgt1.DATE_DELETED Is Null And t1.DATE_DELETED Is Null And s1.DATE_DELETED Is Null And cit1.DATE_DELETED Is Null ' +
                    '   And cgt2.DATE_DELETED Is Null And t2.DATE_DELETED Is Null And s2.DATE_DELETED Is Null And cit2.DATE_DELETED Is Null ' +
                    '   And cyc.DATE_DELETED Is Null And rou.DATE_DELETED Is Null And pha.DATE_DELETED Is Null And cm.[TIME] Is Not Null ' +
                        'And ' + timeOrCatFilter_1 + ' ';
                qs += 'Union All ' +
                'Select 2 As ChampionshipType, cc.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_NAME, c.IS_CLUBS, mapp.CATEGORY_NAME, cco.[TIME], DateDiff(s, \'1970-01-01\', cco.[TIME]) As SecondsSinceEpoch, ' +
                '   cco.NGROUP, Null As PARTS_RESULT, \'\' As TeamA_School, \'\' As TeamA_City, \'\' TeamB_School, \'\' As TeamB_City, ' +
                '	\'\' As CYCLE_NAME, \'\' As ROUND_NAME, pha.PHASE_NAME, c.SPORT_ID, sp.SPORT_NAME, cco.SPORT_FIELD_ID, sf.SPORT_FIELD_NAME, ' +
                '	sf.SPORT_FIELD_TYPE_ID, sft.SPORT_FIELD_TYPE_NAME, cg.GROUP_NAME, fac.FACILITY_NAME, fac.[ADDRESS] As FACILITY_ADDRESS, fac_city.CITY_NAME As FACILITY_CITY, ' +
                '   Null As MatchResult, Null As TEAM_A_SCORE, Null As TEAM_B_SCORE, Null As relative_team_a, Null As relative_team_b, cco.PHASE, Null As [RESULT], Null As match_number, Null As DATE_CHANGED_DATE,  ' +
                '   Null As PreviousGroup_A, Null As PreviousGroup_B, Null As PreviousPosition_A, Null As PreviousPosition_B, Null As TEAM_A_ID, Null As TEAM_B_ID, Null As TeamA_Index, Null As TeamB_Index ' +
                'From CHAMPIONSHIP_COMPETITIONS cco Inner Join CHAMPIONSHIP_CATEGORIES cc On cco.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                '	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                '	Inner Join CHAMPIONSHIP_GROUPS cg On cco.CHAMPIONSHIP_CATEGORY_ID=cg.CHAMPIONSHIP_CATEGORY_ID And cco.PHASE=cg.PHASE And cco.NGROUP=cg.NGROUP ' +
                '	Inner Join CHAMPIONSHIP_PHASES pha On cco.CHAMPIONSHIP_CATEGORY_ID=pha.CHAMPIONSHIP_CATEGORY_ID And cco.PHASE=pha.PHASE ' +
                '	Left Join CATEGORY_MAPPING mapp On cc.[CATEGORY]=mapp.RAW_CATEGORY ' +
                '	Left Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID ' +
                '	Left Join SPORT_FIELDS sf On cco.SPORT_FIELD_ID=sf.SPORT_FIELD_ID ' +
                '	Left Join SPORT_FIELD_TYPES sft On sf.SPORT_FIELD_TYPE_ID=sft.SPORT_FIELD_TYPE_ID ' +
                '	Left Join FACILITIES fac On cco.FACILITY_ID=fac.FACILITY_ID ' +
                '   Left Join CITIES fac_city On fac.CITY_ID=fac_city.CITY_ID ' +
                'Where cco.DATE_DELETED Is Null And cc.DATE_DELETED Is Null And pha.DATE_DELETED Is Null And sf.DATE_DELETED Is Null ' +
                '   And sft.DATE_DELETED Is Null And cco.[TIME] Is Not Null And ' + timeOrCatFilter_2;
                var request = connection.request();
                if (gotCategory) {
                    request.input('category', champCategoryId);
                } else {
                    request.input('first_day', matchingSeason.FirstDay);
                    request.input('last_day', matchingSeason.LastDay);
                }

                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading sportsman events: ' + (err.message || err));
                        res.sendStatus(400);
                    }
                    else {
                        var allEvents = [];
                        var minuteOffset = parseInt(settings.sportsmanDb.MinuteOffset);
                        var gotMinuteOffset = !isNaN(minuteOffset) && minuteOffset != 0;
                        var rowsWithPreviousGroup = 0;
                        var matchWinnersAndLosers = {};
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            if (row['PreviousGroup_A'] != null || row['PreviousGroup_B'] != null)
                                rowsWithPreviousGroup++;
                            var matchNumber = row['match_number'];
                            if (matchNumber != null && matchNumber)
                                matchWinnersAndLosers[matchNumber.toString()] = ParseWinnerLoser(row);
                        }
                        GetPreviousGroupMapping(connection, champCategoryId, rowsWithPreviousGroup).then(function(previousGroupMapping) {
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                var eventData = {};
                                data.copyRecord(row, eventData);
                                var currentTime = eventData['TIME'];
                                if (currentTime && gotMinuteOffset) {
                                    currentTime = new Date(currentTime);
                                    eventData['TIME'] = new Date(currentTime.getTime() + (minuteOffset * 60 * 1000));
                                }
                                var totalSeconds = eventData['SecondsSinceEpoch'];
                                if (totalSeconds && totalSeconds > 0) {
                                    eventData['TimeWithoutZone'] = new Date(totalSeconds * 1000);
                                }
                                var parsedTeamA = ParseMatchTeam(eventData, 'A', previousGroupMapping, matchWinnersAndLosers);
                                var parsedTeamB = ParseMatchTeam(eventData, 'B', previousGroupMapping, matchWinnersAndLosers);
                                if (parsedTeamA != null) {
                                    eventData['TeamA_School'] = parsedTeamA.School;
                                    eventData['TeamA_City'] = parsedTeamA.City || '';
                                }
                                if (parsedTeamB != null) {
                                    eventData['TeamB_School'] = parsedTeamB.School;
                                    eventData['TeamB_City'] = parsedTeamB.City || '';
                                }
                                if (eventData['TeamA_School'] && eventData['TeamB_School'])
                                    allEvents.push(eventData);
                            }
                            res.send(allEvents);
                        }, function(err) {
                            res.status(500).send(err);
                        });
                    }
                });
            }, function(err) {
                res.sendStatus(500);
            });
        } else {
            res.status(400).send('Missing or invalid season');
        }
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/category-teams', function (req, res) {
    function BuildTeamKey(team, prop) {
        return team.PHASE + '_' + team.NGROUP + '_' + team[prop];
    }

    function BuildFinalsTree(groupTeams) {
        function OnlyFirstGroup(phaseTeams) {
            phaseTeams.sort(function(t1, t2) {
                return parseInt(t1.NGROUP) - parseInt(t2.NGROUP);
            });
            var firstGroup = phaseTeams[0].NGROUP;
           return phaseTeams.filter(function(x) { return x.NGROUP == firstGroup; });
        }

        function FindMatchingTeams(phaseTeams, teamIDs) {
            var idMapping = utils.ToAssociativeArray(teamIDs);
            var exactMatchTeams = phaseTeams.filter(function(x) { return idMapping[x.TEAM_ID.toString()] == true; });
            if (exactMatchTeams.length != teamIDs.length)
                return null;
            var groupIDs = utils.DistinctArray(exactMatchTeams.map(function(x) { return x.NGROUP; }));
            var groupMapping = utils.ToAssociativeArray(groupIDs);
            var matchingTeams = phaseTeams.filter(function(x) { return groupMapping[x.NGROUP.toString()] == true; });
            return (matchingTeams.length == teamIDs.length * 2) ? matchingTeams : null;
        }

        if (groupTeams.length < 14)
            return null;

        var phaseCount = 0, phaseTeamsMapping = {};
        for (var i = 0; i < groupTeams.length; i++) {
            var curTeam = groupTeams[i];
            var key = curTeam.PHASE.toString();
            if (!phaseTeamsMapping[key]) {
                phaseTeamsMapping[key] = [];
                phaseCount++;
            }
            phaseTeamsMapping[key].push(curTeam);
        }
        if (phaseCount < 3)
            return null;

        var phases = utils.GetKeys(phaseTeamsMapping);
        phases.sort(function(p1, p2) {
            return parseInt(p1) - parseInt(p2);
        });
        var finalsPhase = phases[phases.length - 1], semiFinalsPhase = phases[phases.length - 2], quarterFinalsPhase = phases[phases.length - 3];
        var finalsPhaseTeams = OnlyFirstGroup(phaseTeamsMapping[finalsPhase]);
        if (finalsPhaseTeams.length != 2)
            return null;

        var semiFinalsPhaseTeams = FindMatchingTeams(phaseTeamsMapping[semiFinalsPhase], finalsPhaseTeams.map(function(x) { return x.TEAM_ID; }));
        if (semiFinalsPhaseTeams == null)
            return null;

        var quarterFinalsPhaseTeams = FindMatchingTeams(phaseTeamsMapping[quarterFinalsPhase], semiFinalsPhaseTeams.map(function(x) { return x.TEAM_ID; }));
        if (quarterFinalsPhaseTeams == null)
            return null;

        return {
            Finals: finalsPhaseTeams,
            SemiFinals: semiFinalsPhaseTeams,
            QuarterFinals: quarterFinalsPhaseTeams
        };
    }

    var category = req.query.category;
    if (category && category > 0) {
        helpers.CreateConnection().then(function (connection) {
            var qs = 'Select cgt.[PHASE], cgt.[NGROUP], cgt.[POSITION], cgt.TEAM_ID, s.SCHOOL_NAME, cit.CITY_NAME, pha.PHASE_NAME, cg.GROUP_NAME, ' +
                '   cgt.RESULT_POSITION, cgt.[SCORE], cgt.[GAMES], t.TEAM_INDEX ' +
                'From CHAMPIONSHIP_GROUP_TEAMS cgt Inner Join CHAMPIONSHIP_GROUPS cg On cgt.CHAMPIONSHIP_CATEGORY_ID=cg.CHAMPIONSHIP_CATEGORY_ID And cgt.PHASE=cg.PHASE And cgt.NGROUP=cg.NGROUP ' +
                '   Inner Join TEAMS t On cgt.TEAM_ID=t.TEAM_ID ' +
                '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID ' +
                '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID ' +
                '   Inner Join CHAMPIONSHIP_PHASES pha On cgt.CHAMPIONSHIP_CATEGORY_ID=pha.CHAMPIONSHIP_CATEGORY_ID And cgt.PHASE=pha.PHASE ' +
                'Where cgt.DATE_DELETED Is Null And cg.DATE_DELETED Is Null And t.DATE_DELETED Is Null And s.DATE_DELETED Is Null ' +
                '   And cit.DATE_DELETED Is Null And cgt.CHAMPIONSHIP_CATEGORY_ID=@category ' +
                'Order By cgt.[PHASE] Asc, cgt.[NGROUP] Asc, IsNull(cgt.RESULT_POSITION, 999) Asc';
            var request = connection.request();
            request.input('category', category);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading sportsman group teams: ' + (err.message || err));
                    res.sendStatus(400);
                }
                else {
                    var groupTeams = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var groupTeam = {};
                        data.copyRecord(recordset[i], groupTeam);
                        groupTeams.push(groupTeam);
                    }
                    qs = 'Select [PHASE], [NGROUP], TEAM_A, TEAM_B, ' +
                        '   Case [RESULT] When 1 Then TEAM_A When 2 Then TEAM_B Else Null End As [Winner], ' +
                        '   Case [RESULT] When 1 Then TEAM_B When 2 Then TEAM_A Else Null End As [Loser], ' +
                        '   Case [RESULT] When 0 Then 1 Else 0 End As [IsDraw] ' +
                        'From CHAMPIONSHIP_MATCHES ' +
                        'Where DATE_DELETED Is Null And [RESULT] Is Not Null And CHAMPIONSHIP_CATEGORY_ID=@category';
                    request = connection.request();
                    request.input('category', category);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading sportsman group team matches: ' + (err.message || err));
                            res.sendStatus(400);
                        }
                        else {
                            var teamMapping = {};
                            for (var i = 0; i < groupTeams.length; i++) {
                                var curTeam = groupTeams[i];
                                curTeam.Wins = 0;
                                curTeam.Loses = 0;
                                curTeam.Draws = 0;
                                var key = BuildTeamKey(curTeam, 'POSITION');
                                teamMapping[key] = curTeam;
                            }
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                if (row.IsDraw) {
                                    var key_A = BuildTeamKey(row, 'TEAM_A'), key_B = BuildTeamKey(row, 'TEAM_B');
                                    if (teamMapping[key_A])
                                        teamMapping[key_A].Draws++;
                                    if (teamMapping[key_B])
                                        teamMapping[key_B].Draws++;
                                } else {
                                    if (row.Winner != null) {
                                        var key_winner = BuildTeamKey(row, 'Winner');
                                        if (teamMapping[key_winner])
                                            teamMapping[key_winner].Wins++;
                                    }
                                    if (row.Loser != null) {
                                        var key_loser = BuildTeamKey(row, 'Loser');
                                        if (teamMapping[key_loser])
                                            teamMapping[key_loser].Loses++;
                                    }
                                }
                            }

                            var finalsTree = BuildFinalsTree(groupTeams);
                            if (finalsTree != null) {
                                res.send({
                                    Teams: groupTeams,
                                    Tree: finalsTree
                                });
                            } else {
                                res.send(groupTeams);
                            }
                        }
                    }, function (err) {
                        res.sendStatus(500);
                    });
                }
            });
        }, function (err) {
            res.sendStatus(500);
        });
    } else {
        res.status(400).send('Missing or invalid championship category');
    }
});

router.get('/category-data', function (req, res) {
    var category = req.query.category;
    if (category && category > 0) {
        helpers.CreateConnection().then(function (connection) {
            var qs = 'Select c.SPORT_ID, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, mapp.CATEGORY_NAME, c.[SEASON], ' +
                '   IsNull(c.IS_CLUBS, 0) As IS_CLUBS, c.REGION_ID, s.SPORT_TYPE ' +
                'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
                '   Left Join CATEGORY_MAPPING mapp On cc.[CATEGORY]=mapp.RAW_CATEGORY ' +
                'Where cc.DATE_DELETED Is Null And cc.CHAMPIONSHIP_CATEGORY_ID=@category';
            var request = connection.request();
            request.input('category', category);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading sportsman category data: ' + (err.message || err));
                    res.sendStatus(400);
                }
                else {
                    var categoryData = {};
                    if (recordset.length > 0) {
                        var row = recordset[0];
                        data.copyRecord(row, categoryData);
                    }
                    res.send(categoryData);
                }
            });
        }, function (err) {
            res.sendStatus(500);
        });
    } else {
        res.status(400).send('Missing or invalid championship category');
    }
});

router.get('/championship-region', function (req, res) {
    var category = req.query.category;
    if (category && category > 0) {
        helpers.CreateConnection().then(function (connection) {
            var qs = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, cc.CHAMPIONSHIP_ID, cc.[CATEGORY], ' +
                '   c.CHAMPIONSHIP_NAME, c.REGION_ID, r.REGION_NAME ' +
                'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID ' +
                'Where cc.CHAMPIONSHIP_CATEGORY_ID=@category And cc.DATE_DELETED Is Null And r.DATE_DELETED Is Null ' +
                '   And r.REGION_ID>0';
            var request = connection.request();
            request.input('category', category);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading sportsman championship region: ' + (err.message || err));
                    res.sendStatus(400);
                }
                else {
                    var regionData = {};
                    if (recordset.length > 0) {
                        var row = recordset[0];
                        data.copyRecord(row, regionData);
                    }
                    res.send(regionData);
                }
            });
        }, function (err) {
            res.sendStatus(500);
        });
    } else {
        res.status(400).send('Missing or invalid championship category');
    }
});

router.get('/category-regions', function (req, res) {
    var allCategories = [];
    if (req.query.categories) {
        allCategories = req.query.categories.split(',').filter(function(rawValue) {
            var n = parseInt(rawValue);
            return !isNaN(n) && n > 0;
        });
    }
    if (allCategories.length == 0) {
        res.send([]);
        return;
    }
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, c.REGION_ID, r.REGION_NAME ' +
            'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
            '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID ' +
            'Where cc.CHAMPIONSHIP_CATEGORY_ID In (' + allCategories.join(', ') + ') ' +
            '   And cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null And r.DATE_DELETED Is Null';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading championship category regions: ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/championship-category/:category/grades', function (req, res) {
    var champCategoryID = req.params.category;
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select p.TEAM_NUMBER, s.FIRST_NAME, s.LAST_NAME, sgm.GRADE_NAME ' +
            'From PLAYERS p Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID '+
            '   Left Join SEASONS max_season On max_season.SEASON=(Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where [STATUS]=1)) From SEASONS Where [STATUS]=1 And [START_DATE]<=GetDate()) ' +
            '   Left Join StudentGradeMapping sgm On max_season.SEASON-s.[GRADE]=sgm.GRADE_OFFSET ' +
            '   Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID ' +
            'Where p.DATE_DELETED Is Null And s.DATE_DELETED Is Null And t.DATE_DELETED Is Null ' +
            '   And p.TEAM_NUMBER Is Not Null And t.CHAMPIONSHIP_CATEGORY_ID=@category';
        var request = connection.request();
        request.input('category', champCategoryID);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading championship category grades: ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/championships', function (req, res) {
    var season = req.query.season;
    var omitEmpty = (req.query.omitEmpty == 1);
    var region = parseInt(req.query.region);
    var schoolSymbol = req.query.school;
    if (isNaN(region))
        region = -1;
    seasons.read(season).then(function(matchingSeasons) {
        if (matchingSeasons && matchingSeasons.length == 1) {
            helpers.Seasons.GetMapping().then(function (sportsmanSeasonMapping) {
                var matchingSeason = matchingSeasons[0];
                var seasonName = matchingSeason.Name;
                var seasonCode = sportsmanSeasonMapping[seasonName];
                if (seasonCode) {
                    helpers.CreateConnection().then(function (connection) {
                        var qs = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, mapp.CATEGORY_NAME, cc.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.SPORT_ID, ' +
                            '   IsNull(c.IS_CLUBS, 0) As IS_CLUBS, sp.SPORT_NAME, sp.SPORT_TYPE, IsNull(tc.TotalTeams, 0) As TotalTeams ' +
                            'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                            '   Left Join CATEGORY_MAPPING mapp On cc.[CATEGORY]=mapp.RAW_CATEGORY ' +
                            '   Left Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID ' +
                            '   Left Join (' +
                            '       Select cgt.CHAMPIONSHIP_CATEGORY_ID, Count(cgt.CHAMPIONSHIP_CATEGORY_ID) As TotalTeams ' +
                            '       From CHAMPIONSHIP_GROUP_TEAMS cgt Inner Join CHAMPIONSHIP_CATEGORIES cc On cgt.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                            '           Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                            '       Where cgt.DATE_DELETED Is Null And c.[SEASON]=@season ' +
                            '       Group By cgt.CHAMPIONSHIP_CATEGORY_ID' +
                            '   ) As tc On tc.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                            'Where cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null And sp.DATE_DELETED Is Null ' +
                            '   And c.[SEASON]=@season';
                        if (schoolSymbol) {
                            qs += ' And c.CHAMPIONSHIP_STATUS=1 And (c.REGION_ID=0 Or c.REGION_ID=(Select REGION_ID From SCHOOLS Where SYMBOL=@symbol And DATE_DELETED Is Null))';
                        } else {
                            qs += ' And c.CHAMPIONSHIP_STATUS>0';
                        }
                        if (omitEmpty)
                            qs += ' And IsNull(tc.TotalTeams, 0)>0';
                        if (region >= 0)
                            qs += ' And REGION_ID=@region';
                        var request = connection.request();
                        request.input('season', seasonCode);
                        if (region >= 0)
                            request.input('region', region);
                        if (schoolSymbol)
                            request.input('symbol', schoolSymbol);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading sportsman championships: ' + (err.message || err));
                                res.sendStatus(400);
                            }
                            else {
                                res.send(recordset);
                            }
                        });
                    }, function (err) {
                        res.sendStatus(500);
                    });
                } else {
                    res.status(400).send('No matching season code');
                }
            }, function (err) {
                res.status(500).send(err);
            });
        } else {
            res.status(400).send('Missing or invalid season');
        }
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/latest-season', function (req, res) {
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where DATE_DELETED Is Null And [STATUS]=1)) As MaxSeason ' +
            'From SEASONS ' +
            'Where DATE_DELETED Is Null And [STATUS]=1 And [START_DATE]<=GetDate()';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading max season: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                if (recordset == null || recordset.length == 0) {
                    res.sendStatus(400);
                } else {
                    var maxSeason = recordset[0]['MaxSeason'];
                    res.send({
                        Season: maxSeason
                    });
                }
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/seasons-in-use', function (req, res) {
    GetSeasonsInUse().then(function(sportsmanSeasons) {
        res.send(sportsmanSeasons);
    }, function(err) {
        res.status(400).send(err);
    });
});

router.get('/regions', function (req, res) {
    GetRegions().then(function(regions) {
        res.send(regions);
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/v5-regions', function (req, res) {
    GetRegions().then(function(regions) {
        var v5Regions = regions.map(function(x) {
            return {
                id: x['REGION_ID'],
                name: x['REGION_NAME'],
                homepageArticlesCount: 0,
                recentArticlesCount: 0,
                upcomingEventsCount: 0,
                recentGameResultsCount: 0
            };
        });
        helpers.GetCurrentSeason(req.connection, 'v5 regions').then(function(curSeason) {
            var qs = 'Select rp.REGION_ID, Count(fp.PageSeq) As ArticlesCount, \'homepage\' As CounterType ' +
                'From RegionPages rp Inner Join ContentPages cp On rp.ContentPageSeq=cp.Seq And cp.[Type]=2 And (cp.IsHidden Is Null Or cp.IsHidden=0) ' +
                '   Left Join FeaturedPages fp On cp.Seq=fp.PageSeq ' +
                'Group By rp.REGION_ID ' +
                'Union All ' +
                'Select rp.REGION_ID, Count(cp.Seq) As ArticlesCount, \'recent\' As CounterType ' +
                'From RegionPages rp Inner Join ContentPages cp On rp.ContentPageSeq=cp.Seq And cp.[Type]=2 And (cp.IsHidden Is Null Or cp.IsHidden=0) ' +
                'Where cp.[Index] Is Not Null And cp.[Index]>0  ' +
                'Group By rp.REGION_ID';
            var request = req.connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading v5 article region counters: ' + (err.message || err));
                    res.status(500).send('ERROR');
                } else {
                    var metaDataMapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        var key = row['REGION_ID'].toString();
                        var count = row['ArticlesCount'];
                        if (!metaDataMapping[key]) {
                            metaDataMapping[key] = {};
                        }
                        switch (row['CounterType']) {
                            case 'homepage':
                                metaDataMapping[key].HomepageArticlesCount = count;
                                break;
                            case 'recent':
                                metaDataMapping[key].RecentArticlesCount = count;
                                break;
                        }
                    }
                    helpers.CreateConnection().then(function(sportsmanConnection) {
                        qs = 'Select c.REGION_ID, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As MatchCount, \'upcoming-events\' As CounterType\n' +
                            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null\n' +
                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0\n' +
                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null\n' +
                            '   Inner Join CHAMPIONSHIP_PHASES cp On cm.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cp.PHASE\n' +
                            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt1 On cgt1.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt1.PHASE=cm.PHASE And cgt1.NGROUP=cm.NGROUP And cgt1.[POSITION]=cm.TEAM_A And cgt1.DATE_DELETED Is Null\n' +
                            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt2 On cgt2.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt2.PHASE=cm.PHASE And cgt2.NGROUP=cm.NGROUP And cgt2.[POSITION]=cm.TEAM_B And cgt2.DATE_DELETED Is Null\n' +
                            '   Inner Join TEAMS t1 On cgt1.TEAM_ID=t1.TEAM_ID And t1.DATE_DELETED Is Null\n' +
                            '   Inner Join TEAMS t2 On cgt2.TEAM_ID=t2.TEAM_ID And t2.DATE_DELETED Is Null\n' +
                            '   Inner Join SCHOOLS s1 On t1.SCHOOL_ID=s1.SCHOOL_ID And s1.DATE_DELETED Is Null\n' +
                            '   Inner Join SCHOOLS s2 On t2.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null\n' +
                            'Where cm.DATE_DELETED Is Null And c.SEASON=@season And cm.[TIME] Is Not Null And cm.[TIME]>=GetDate()\n' +
                            'Group By c.REGION_ID\n' +
                            'Union All\n' +
                            'Select c.REGION_ID, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As MatchCount, \'recent-results\' As CounterType\n' +
                            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null\n' +
                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0\n' +
                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null\n' +
                            '   Inner Join CHAMPIONSHIP_PHASES cp On cm.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cp.PHASE\n' +
                            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt1 On cgt1.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt1.PHASE=cm.PHASE And cgt1.NGROUP=cm.NGROUP And cgt1.[POSITION]=cm.TEAM_A And cgt1.DATE_DELETED Is Null\n' +
                            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt2 On cgt2.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt2.PHASE=cm.PHASE And cgt2.NGROUP=cm.NGROUP And cgt2.[POSITION]=cm.TEAM_B And cgt2.DATE_DELETED Is Null\n' +
                            '   Inner Join TEAMS t1 On cgt1.TEAM_ID=t1.TEAM_ID And t1.DATE_DELETED Is Null\n' +
                            '   Inner Join TEAMS t2 On cgt2.TEAM_ID=t2.TEAM_ID And t2.DATE_DELETED Is Null\n' +
                            '   Inner Join SCHOOLS s1 On t1.SCHOOL_ID=s1.SCHOOL_ID And s1.DATE_DELETED Is Null\n' +
                            '   Inner Join SCHOOLS s2 On t2.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null\n' +
                            'Where cm.DATE_DELETED Is Null And c.SEASON=@season And cm.[TIME] Is Not Null And cm.[RESULT] Is Not Null\n' +
                            'Group By c.REGION_ID';
                        request = sportsmanConnection.request();
                        request.input('season', curSeason);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading v5 match region counters: ' + (err.message || err));
                                res.status(500).send('ERROR');
                            } else {
                                for (var i = 0; i < recordset.length; i++) {
                                    var row = recordset[i];
                                    var key = row['REGION_ID'].toString();
                                    var count = row['MatchCount'];
                                    if (!metaDataMapping[key]) {
                                        metaDataMapping[key] = {};
                                    }
                                    switch (row['CounterType']) {
                                        case 'upcoming-events':
                                            metaDataMapping[key].UpcomingEventsCount = count;
                                            break;
                                        case 'recent-results':
                                            metaDataMapping[key].RecentGameResultsCount = count;
                                            break;
                                    }
                                }
                                v5Regions.forEach(function(v5Region) {
                                    var metaData = metaDataMapping[v5Region.id.toString()];
                                    if (metaData) {
                                        v5Region.homepageArticlesCount = metaData.HomepageArticlesCount || 0;
                                        v5Region.recentArticlesCount = metaData.RecentArticlesCount || 0;
                                        v5Region.upcomingEventsCount = metaData.UpcomingEventsCount || 0;
                                        v5Region.recentGameResultsCount = metaData.RecentGameResultsCount || 0;
                                    }
                                });
                                res.send(v5Regions);
                            }
                        });
                    }, function(err) {
                        res.sendStatus(500);
                    });
                }
            });
        }, function(err) {
            res.sendStatus(500);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/sports', function (req, res) {
    var v5 = req.query.v5;
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select SPORT_ID, SPORT_NAME ' +
            'From SPORTS ' +
            'Where DATE_DELETED Is Null ' +
            'Order By SPORT_NAME Asc';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading sport fields: ' + (err.message || err));
                res.status(500).send('ERROR');
            } else {
                if (v5) {
                    var v5Sports = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        v5Sports.push({
                            id: row['SPORT_ID'],
                            name: row['SPORT_NAME']
                        });
                    }
                    res.send(v5Sports);
                } else {
                    res.send(recordset);
                }
            }
        });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/recent-game-results', function (req, res) {
    var limit = parseInt(req.query.limit, 10);
    const isLeague = req.query.league == 'true';
    var leagueFilters = utils.BuildLeagueFilters(req.query);
    if (limit == null || isNaN(limit))
        limit = 0;
    var region = parseInt(req.query.region, 10);
    if (region == null || isNaN(region))
        region = -1;
    helpers.GetCurrentSeason(req.connection, 'recent game results').then(function(curSeason) {
        var qs = 'Select ';
        if (limit > 0)
            qs += 'Top ' + limit + ' ';
        qs += 'c.CHAMPIONSHIP_NAME, cm.[TIME], cm.PARTS_RESULT, c.SPORT_ID, c.CHAMPIONSHIP_ID, cm.CHAMPIONSHIP_CATEGORY_ID, ' +
            '   cmp.CATEGORY_NAME, ' +
            '   dbo.BuildTeamName(s1.SCHOOL_NAME, ct1.CITY_NAME, t1.TEAM_INDEX, DEFAULT, DEFAULT) As [team1], ' +
            '   dbo.BuildTeamName(s2.SCHOOL_NAME, ct2.CITY_NAME, t2.TEAM_INDEX, DEFAULT, DEFAULT) As [team2], ' +
            '   cm.TEAM_A_SCORE As [team1score], ' +
            '   cm.TEAM_B_SCORE As [team2score], ' +
            '   cp.PHASE_NAME As [stage], ' +
            '   c.REGION_ID As [regionId] ' +
            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
            '   Inner Join CHAMPIONSHIP_PHASES cp On cm.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cp.PHASE ' +
            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt1 On cgt1.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt1.PHASE=cm.PHASE And cgt1.NGROUP=cm.NGROUP And cgt1.[POSITION]=cm.TEAM_A And cgt1.DATE_DELETED Is Null ' +
            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt2 On cgt2.CHAMPIONSHIP_CATEGORY_ID=cm.CHAMPIONSHIP_CATEGORY_ID And cgt2.PHASE=cm.PHASE And cgt2.NGROUP=cm.NGROUP And cgt2.[POSITION]=cm.TEAM_B And cgt2.DATE_DELETED Is Null ' +
            '   Inner Join TEAMS t1 On cgt1.TEAM_ID=t1.TEAM_ID And t1.DATE_DELETED Is Null ' +
            '   Inner Join TEAMS t2 On cgt2.TEAM_ID=t2.TEAM_ID And t2.DATE_DELETED Is Null ' +
            '   Inner Join SCHOOLS s1 On t1.SCHOOL_ID=s1.SCHOOL_ID And s1.DATE_DELETED Is Null ' +
            '   Inner Join SCHOOLS s2 On t2.SCHOOL_ID=s2.SCHOOL_ID And s2.DATE_DELETED Is Null ' +
            '   Left Join CITIES ct1 On s1.CITY_ID=ct1.CITY_ID And ct1.DATE_DELETED Is Null ' +
            '   Left Join CITIES ct2 On s2.CITY_ID=ct2.CITY_ID And ct2.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING cmp On cc.[CATEGORY]=cmp.RAW_CATEGORY ' +
            'Where cm.DATE_DELETED Is Null And c.SEASON=@season And cm.[TIME] Is Not Null And cm.[TIME]<=GetDate() And cm.[RESULT] Is Not Null ';
        if (region >= 0) {
            qs += 'And c.REGION_ID=@region ';
        }
        if (isLeague) {
            qs += 'And c.IS_LEAGUE=1 ';
        } else if (leagueFilters != null && leagueFilters.length > 0) {
            qs += 'And (';
            for (var i = 0; i < leagueFilters.length; i++) {
                if (i > 0)
                    qs += ' Or ';
                qs += '(cc.CATEGORY=@c' + (i + 1) + ' And c.SPORT_ID=@s' + (i + 1) + ')';
            }
            qs += ')';
        }
        qs += 'Order By cm.[TIME] Desc';
        helpers.CreateConnection().then(function (sportsmanConnection) {
            var request = sportsmanConnection.request();
            request.input('season', curSeason);
            if (leagueFilters != null && leagueFilters.length > 0) {
                for (var i = 0; i < leagueFilters.length; i++) {
                    var filter = leagueFilters[i];
                    request.input('c' + (i + 1), filter.category);
                    request.input('s' + (i + 1), filter.sport);
                }
            }
            if (region >= 0) {
                request.input('region', region);
            }
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading recent game results: ' + (err.message || err));
                    res.status(500).send('ERROR');
                }
                else {
                    var gameResults = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        gameResults.push({
                            title: row['CHAMPIONSHIP_NAME'],
                            date: row['TIME'],
                            team1: row['team1'],
                            team2: row['team2'],
                            team1score: row['team1score'],
                            team2score: row['team2score'],
                            stage: row['stage'],
                            regionId: row['regionId'],
                            sport: row['SPORT_ID'],
                            championship: row['CHAMPIONSHIP_ID'],
                            category: row['CHAMPIONSHIP_CATEGORY_ID'],
                            categoryName: row['CATEGORY_NAME'],
                            smallPoints: utils.ParseSmallPoints(row['PARTS_RESULT'])
                        });
                    }
                    res.status(200).send(gameResults);
                }
            });
        }, function (err) {
            res.status(500).send('ERROR');
        });
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/upcoming-events', function (req, res) {
    GetUpcomingEvents(req.connection, req.query).then(function(upcomingEvents) {
        res.status(200).send(upcomingEvents);
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/permanent-championships', function (req, res) {
    GetPermanentChampionships().then(function(permanentChampionships) {
        res.send(permanentChampionships);
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/teams/:team/players', function (req, res) {
    var teamID = req.params.team;
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select p.STUDENT_ID, s.FIRST_NAME, s.LAST_NAME ' +
            'From PLAYERS p Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID ' +
            'Where p.TEAM_ID=@team And p.DATE_DELETED Is Null And s.DATE_DELETED Is Null';
        var request = connection.request();
        request.input('team', teamID);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading players of team ' + teamID + ': ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                res.send(recordset);
            }
        });
    }, function (err) {
        res.sendStatus(500);
    });
});

router.get('/active-phase', function (req, res) {
    var categoryID = req.query.category;
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select [PHASE] ' +
            'From CHAMPIONSHIP_PHASES ' +
            'Where CHAMPIONSHIP_CATEGORY_ID=@category And [STATUS]=1';
        var request = connection.request();
        request.input('category', categoryID);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading active phase for category ' + categoryID + ': ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                var phase = recordset.length > 0 ? recordset[0]['PHASE'] : null;
                res.send({
                    'ActivePhase': phase
                });
            }
        });
    }, function (err) {
        res.sendStatus(500);
    });
});

router.get('/championship-remarks', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var championships = (req.query.championships || '').split(',');
    championships = championships.filter(function(x) {
        var n = parseInt(x);
        return !isNaN(n) && n > 0;
    });
    if (championships.length == 0) {
        res.send([]);
        return;
    }

    helpers.CreateConnection().then(function(connection) {
        var qs = 'Select Distinct CHAMPIONSHIP_ID, CHAMPIONSHIP_NAME, REMARKS ' +
            'From CHAMPIONSHIPS ' +
            'Where DATE_DELETED Is Null And CHAMPIONSHIP_ID In (' + championships.join(', ') + ')';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading championship remarks: ' + (err.message || err));
                res.sendStatus(400);
            }
            else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

/*
router.get('/practice-camps', function (req, res) {
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select pc.PRACTICE_CAMP_ID, pc.SPORT_ID, s.SPORT_NAME, pc.DATE_START, pc.DATE_FINISH, pc.[REMARKS] ' +
            'From PRACTICE_CAMPS pc Inner Join SPORTS s On pc.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
            'Where pc.DATE_DELETED Is Null And pc.[DATE_FINISH]>GetDate()';
        var request = connection.request();
        //request.input('first_day', matchingSeason.FirstDay);
        //request.input('last_day', matchingSeason.LastDay);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading sportsman practice camps: ' + (err.message || err));
                res.sendStatus(400);
            } else {
                res.send(recordset);
            }
        });
    }, function (err) {
        res.sendStatus(500);
    });

});
 */

router.get('/matching-students', function (req, res) {
    var gradeAgeMapping = {
        'א': 6,
        'ב': 7,
        'ג': 8,
        'ד': 9,
        'ה': 10,
        'ו': 11,
        'ז': 12,
        'ח': 13,
        'ט': 14,
        'י': 15,
        'יא': 16,
        'יב': 17
    };

    function GetAgeAndGenderRanges(connection, categoryId) {
        function ParseSingleCategory(categoryName) {
            function ParseGender(rawGender) {
                var hasMale = rawGender.indexOf('תלמידים') >= 0;
                var hasFemale = rawGender.indexOf('תלמידות') >= 0;
                if (hasMale && hasFemale)
                    return 3;
                if (hasFemale)
                    return 2;
                if (hasMale)
                    return 1;
                return 0;
            }

            categoryName = utils.GlobalReplace(categoryName, '\'', '');
            categoryName = utils.GlobalReplace(categoryName, '"', '');
            var categoryParts = categoryName.split(' ');
            if (categoryParts.length < 2) {
                logger.log('verbose', 'category "' + categoryName + '" has less than two parts');
                return null;
            }
            var rawGrade = categoryParts[0];
            var rawGender = categoryParts[1];
            if (rawGrade.length == 0 || rawGender.length == 0) {
                logger.log('verbose', 'category "' + categoryName + '" has invalid parts');
                return null;
            }
            var gradeParts = rawGrade.split('-');
            var gradeFrom = gradeParts[0];
            var gradeTo = (gradeParts.length > 1) ? gradeParts[1] : gradeFrom;
            var ageFrom = gradeAgeMapping[gradeFrom];
            var ageTo = gradeAgeMapping[gradeTo];
            if (!ageFrom || !ageTo || ageFrom > ageTo) {
                logger.log('verbose', 'category "' + categoryName + '" has no age mapping for it. Grade from: ' + gradeFrom + ', grade to: ' + gradeTo);
                return null;
            }
            return {
                Ages: {
                    From: ageFrom - 1,
                    To: ageTo + 1
                },
                Gender: ParseGender(rawGender)
            };
        }

        return new Promise(function (fulfil, reject) {
            var qs = 'Select cm.CATEGORY_NAME ' +
                'From CHAMPIONSHIP_CATEGORIES cc Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                'Where cc.CHAMPIONSHIP_CATEGORY_ID=@category';
            var request = connection.request();
            request.input('category', categoryId);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading category name: ' + (err.message || err));
                    reject('error');
                } else {
                    if (recordset == null || recordset.length == 0) {
                        reject('category not found');
                    } else {
                        var rawCategoryName = recordset[0]['CATEGORY_NAME'];
                        var rawCategories = rawCategoryName.split(', ');
                        var ranges = [];
                        for (var i = 0; i < rawCategories.length; i++) {
                            var currentRawCategory = rawCategories[i];
                            var parsedCategory = ParseSingleCategory(currentRawCategory);
                            if (parsedCategory != null)
                                ranges.push(parsedCategory);
                        }
                        fulfil(ranges);
                    }
                }
            });
        });
    }

    function GetMatchingStudents(connection, schoolSymbol, allRanges) {
        return new Promise(function (fulfil, reject) {
            function HandleSingleRange(rangeIndex, allStudents, studentMapping) {
                if ((allRanges.length == 0 && rangeIndex > 0) || (allRanges.length > 0 && rangeIndex >= allRanges.length)) {
                    fulfil(allStudents);
                } else {
                    var qs = 'Select STUDENT_ID, ID_NUMBER, FIRST_NAME, LAST_NAME, GRADE, BIRTH_DATE, SCHOOL_ID, SEX_TYPE ' +
                        'From STUDENTS ' +
                        'Where DATE_DELETED Is Null ' +
                        '   And SCHOOL_ID=(Select SCHOOL_ID From SCHOOLS Where SYMBOL=@school And DATE_DELETED Is Null)';
                    var yearFrom = 0, yearTo = 0, desiredGender = 0;
                    var gradesAndAge = allRanges.length > 0 ? allRanges[rangeIndex] : null;
                    if (gradesAndAge != null) {
                        var currentYear = (new Date()).getFullYear();
                        yearFrom = currentYear - gradesAndAge.Ages.To;
                        yearTo = currentYear - gradesAndAge.Ages.From;
                        if (yearFrom > 0 && yearTo > 0)
                            qs += ' And Year(BIRTH_DATE) Between @yearFrom And @yearTo';
                        if (gradesAndAge.Gender == 1 || gradesAndAge.Gender == 2) {
                            desiredGender = gradesAndAge.Gender;
                            qs += ' And (SEX_TYPE Is Null Or SEX_TYPE=0 Or SEX_TYPE=@gender)';
                        }
                    }
                    qs += ' Order By BIRTH_DATE Asc';
                    var request = connection.request();
                    request.input('school', schoolSymbol);
                    if (yearFrom > 0 && yearTo > 0) {
                        request.input('yearFrom', yearFrom);
                        request.input('yearTo', yearTo);
                    }
                    if (desiredGender > 0)
                        request.input('gender', desiredGender);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading matching students: ' + (err.message || err));
                            reject('error');
                        } else {
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                var studentId = row['STUDENT_ID'];
                                var key = studentId.toString();
                                if (!studentMapping[key]) {
                                    var student = {};
                                    data.copyRecord(row, student);
                                    allStudents.push(student);
                                    studentMapping[key] = student;
                                }
                            }
                            HandleSingleRange(rangeIndex + 1, allStudents, studentMapping);
                        }
                    });
                }
            }

            var allStudents = [];
            var studentMapping = {};
            HandleSingleRange(0, allStudents, studentMapping);
        });
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var categoryId = req.query.category;
    var schoolSymbol = req.query.school;
    helpers.CreateConnection().then(function (connection) {
        GetAgeAndGenderRanges(connection, categoryId).then(function(ranges) {
            GetMatchingStudents(connection, schoolSymbol, ranges).then(function(matchingStudents) {
                res.send(matchingStudents);
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.status(400).send(err);
        })
    }, function (err) {
        res.sendStatus(500);
    });
});

router.get('/past-matches', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var season = req.query.season;
    var userSchool = (req.session.user.role == 2) ? req.session.user.schoolID : 0;
    seasons.read(season).then(function(matchingSeasons) {
        if (matchingSeasons && matchingSeasons.length == 1) {
            helpers.Seasons.GetMapping().then(function (sportsmanSeasonMapping) {
                var matchingSeason = matchingSeasons[0];
                var seasonName = matchingSeason.Name;
                var seasonCode = sportsmanSeasonMapping[seasonName];
                if (seasonCode) {
                    helpers.CreateConnection().then(function (connection) {
                        var qs = 'Select cm.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, cam.CATEGORY_NAME, c.SPORT_ID, sp.SPORT_NAME, c.REGION_ID, r.REGION_NAME, ' +
                            '   cm.PHASE, chp.PHASE_NAME, cm.NGROUP, chg.GROUP_NAME, cm.[ROUND], chr.ROUND_NAME, cm.[CYCLE], chc.CYCLE_NAME, cm.MATCH, cm.match_number, cm.PARTS_RESULT, ' +
                            '   cm.TEAM_A, cm.TEAM_B, cm.[TIME], cm.TEAM_A_SCORE, cm.TEAM_B_SCORE, cm.[RESULT], cm.DATE_CHANGED_DATE, fac.FACILITY_NAME, cgt_A.TEAM_ID As TEAM_A_ID, cgt_B.TEAM_ID As TEAM_B_ID, ' +
                            '   school_A.SCHOOL_NAME As TeamA_School, school_B.SCHOOL_NAME As TeamB_School, school_A.SYMBOL As TEAM_A_SCHOOL_SYMBOL, school_B.SYMBOL As TEAM_B_SCHOOL_SYMBOL, ' +
                            '   cit_A.CITY_NAME As TeamA_City, cit_B.CITY_NAME As TeamB_City, mso.TEAM_A_SCORE As OVERRIDEN_TEAM_A_SCORE, mso.TEAM_B_SCORE As OVERRIDEN_TEAM_B_SCORE, ' +
                            '   mso.[RESULT] As OVERRIDEN_RESULT, mso.[PARTS_RESULT] As OVERRIDEN_PARTS_RESULT, mso.ORIGINAL_PARTS_RESULT, mso.ORIGINAL_SCORE_A, mso.ORIGINAL_SCORE_B, ' +
                            '   mso.Approved As OverridenScoreApproved ' +
                            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt_A On cm.CHAMPIONSHIP_CATEGORY_ID=cgt_A.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt_A.PHASE And cm.NGROUP=cgt_A.NGROUP And cm.TEAM_A=cgt_A.POSITION ' +
                            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt_B On cm.CHAMPIONSHIP_CATEGORY_ID=cgt_B.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt_B.PHASE And cm.NGROUP=cgt_B.NGROUP And cm.TEAM_B=cgt_B.POSITION ' +
                            '   Inner Join CHAMPIONSHIP_PHASES chp On cm.CHAMPIONSHIP_CATEGORY_ID=chp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=chp.PHASE ' +
                            '   Inner Join CHAMPIONSHIP_GROUPS chg On cm.CHAMPIONSHIP_CATEGORY_ID=chg.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=chg.PHASE And cm.NGROUP=chg.NGROUP ' +
                            '   Inner Join CHAMPIONSHIP_ROUNDS chr On cm.CHAMPIONSHIP_CATEGORY_ID=chr.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=chr.PHASE And cm.NGROUP=chr.NGROUP And cm.[ROUND]=chr.[ROUND] ' +
                            '   Inner Join CHAMPIONSHIP_CYCLES chc On cm.CHAMPIONSHIP_CATEGORY_ID=chc.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=chc.PHASE And cm.NGROUP=chc.NGROUP And cm.[ROUND]=chc.[ROUND] And cm.[CYCLE]=chc.[CYCLE] ' +
                            '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID ' +
                            '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID ' +
                            '   Inner Join TEAMS team_A On cgt_A.TEAM_ID=team_A.TEAM_ID ' +
                            '   Inner Join TEAMS team_B On cgt_B.TEAM_ID=team_B.TEAM_ID ' +
                            '   Inner Join SCHOOLS school_A On team_A.SCHOOL_ID=school_A.SCHOOL_ID ' +
                            '   Inner Join SCHOOLS school_B On team_B.SCHOOL_ID=school_B.SCHOOL_ID ' +
                            '   Left Join FACILITIES fac On cm.FACILITY_ID=fac.FACILITY_ID ' +
                            '   Left Join CITIES cit_A On school_A.CITY_ID=cit_A.CITY_ID ' +
                            '   Left Join CITIES cit_B On school_B.CITY_ID=cit_B.CITY_ID ' +
                            '   Left Join MATCH_SCORE_OVERRIDE mso On cm.CHAMPIONSHIP_CATEGORY_ID=mso.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=mso.PHASE And cm.NGROUP=mso.NGROUP And cm.[ROUND]=mso.[ROUND] And cm.[MATCH]=mso.[MATCH] And cm.[CYCLE]=mso.[CYCLE] ' +
                            '   Left Join CATEGORY_MAPPING cam On cc.CATEGORY=cam.RAW_CATEGORY ' +
                            'Where cm.DATE_DELETED Is Null And cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null And cgt_A.DATE_DELETED Is Null And cgt_B.DATE_DELETED Is Null ' +
                            '   And c.CHAMPIONSHIP_STATUS>0 And c.SEASON=@season And CONVERT(date, cm.[Time])<=GetDate()';
                        if (userSchool)
                            qs += ' And (team_A.SCHOOL_ID=@school Or TEAM_B.SCHOOL_ID=@school)';
                        var request = connection.request();
                        request.input('season', seasonCode);
                        if (userSchool)
                            request.input('school', userSchool);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading sportsman past matches: ' + (err.message || err));
                                res.sendStatus(500);
                            }
                            else {
                                res.send(recordset);
                            }
                        });
                    }, function (err) {
                        res.sendStatus(500);
                    });
                } else {
                    res.status(400).send('No matching season code');
                }
            }, function (err) {
                res.status(500).send(err);
            });
        } else {
            res.status(400).send('Missing or invalid season');
        }
    }, function(err) {
        res.status(500).send(err);
    });
});

router.get('/views', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select VIEW_ID, VIEW_NAME, VIEW_CAPTION, IS_DISABLED ' +
            'From SCHOOL_SPORT_WEB_VIEWS ' +
            'Order By VIEW_ID Asc';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading views: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/views/:view', function (req, res) {
    function GetViewName(connection, viewId) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select VIEW_NAME From SCHOOL_SPORT_WEB_VIEWS Where VIEW_ID=@id';
            var request = connection.request();
            request.input('id', viewId);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading view name: ' + (err.message || err));
                    reject('error');
                } else {
                    if (recordset == null || recordset.length == 0) {
                        reject('no view');
                    } else {
                        fulfil(recordset[0]['VIEW_NAME']);
                    }
                }
            });
        });
    }

    function GetSeason(connection) {
        return new Promise(function (fulfil, reject) {
            function GetDefaultSeason() {
                var qs = 'Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where DATE_DELETED Is Null And [STATUS]=1)) As MaxSeason ' +
                    'From SEASONS ' +
                    'Where DATE_DELETED Is Null And [STATUS]=1 And [START_DATE]<=GetDate()';
                var request = connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading max season: ' + (err.message || err));
                        reject('error');
                    } else {
                        if (recordset == null || recordset.length == 0) {
                            reject('no season');
                        } else {
                            fulfil(recordset[0]['MaxSeason']);
                        }
                    }
                });
            }

            var rawSeason = req.query.season;
            if (rawSeason) {
                var integerSeason = parseInt(rawSeason);
                if (!isNaN(integerSeason) && integerSeason > 0) {
                    fulfil(integerSeason);
                } else {
                    if (utils.ContainsHebrew(rawSeason)) {
                        var qs = 'Select [SEASON] ' +
                            'From SEASONS ' +
                            'Where DATE_DELETED Is Null And [NAME]=@name';
                        var request = connection.request();
                        request.input('name', rawSeason);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading season by name: ' + (err.message || err));
                                reject('error');
                            } else {
                                if (recordset == null || recordset.length == 0) {
                                    reject('no season');
                                } else {
                                    fulfil(recordset[0]['SEASON']);
                                }
                            }
                        });
                    } else {
                        GetDefaultSeason();
                    }
                }
            } else {
                GetDefaultSeason();
            }
        });
    }

    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var viewId = parseInt(req.params.view);
    if (isNaN(viewId) || viewId <= 0) {
        res.sendStatus(400);
        return;
    }

    helpers.CreateConnection().then(function (connection) {
        GetViewName(connection, viewId).then(function(viewName) {
            GetSeason(connection).then(function(season) {
                var qs = 'Select * From ' + viewName + ' Where [SEASON]=@season';
                var request = connection.request();
                request.input('season', season);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading view: ' + (err.message || err));
                        res.sendStatus(500);
                    } else {
                        var viewRows = [];
                        var viewFields = [];
                        for (var colName in recordset.columns) {
                            viewFields.push(colName);
                        }
                        for (var i = 0; i < recordset.length; i++) {
                            var row = {};
                            data.copyRecord(recordset[i], row);
                            viewRows.push(row);
                        }
                        res.send({
                            Fields: viewFields,
                            Rows: viewRows
                        });
                    }
                });
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.sendStatus(400);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/championship-categories-data', function (req, res) {
    function GetSeasonCode(connection, seasonName) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select Max(c.SEASON) As MaxSeason ' +
                'From CHAMPIONSHIPS c Inner Join SEASONS s On c.SEASON=s.SEASON And c.CHAMPIONSHIP_STATUS>0 ' +
                'Where s.START_DATE<=GetDate()';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading max season: ' + (err.message || err));
                    reject('error');
                } else {
                    var maxSeason = 0;
                    if (recordset != null && recordset.length > 0)
                        maxSeason = recordset[0]['MaxSeason'];
                    if (seasonName.length > 0) {
                        qs = 'Select SEASON From SEASONS Where NAME=@name';
                        request = connection.request();
                        request.input('name', seasonName);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading season by name: ' + (err.message || err));
                                reject('error');
                            } else {
                                if (recordset == null || recordset.length == 0) {
                                    logger.log('verbose', 'Warning: tried to read season code of non existent season ' + seasonName);
                                    fulfil(maxSeason);
                                } else {
                                    fulfil(recordset[0]['SEASON']);
                                }
                            }
                        });
                    } else {
                        fulfil(maxSeason);
                    }
                }
            });
        });
    }

    var seasonName = req.query.season || '';
    helpers.CreateConnection().then(function (connection) {
        GetSeasonCode(connection, seasonName).then(function(seasonCode) {
            var qs = 'Select c.SPORT_ID, s.SPORT_NAME, wpc.CHAMPIONSHIP_TITLE As PermanentChampionshipTitle, ' +
                '   wpc.CHAMPIONSHIP_INDEX As PermanentChampionshipIndex, c.IS_CLUBS, cc.CHAMPIONSHIP_ID, ' +
                '   c.CHAMPIONSHIP_NAME, cc.CHAMPIONSHIP_CATEGORY_ID, cm.CATEGORY_NAME, c.REGION_ID, ' +
                '   r_c.REGION_NAME, r_r.REGION_ID As ExtraRegionId, r_r.REGION_NAME As ExtraRegionName ' +
                'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                '   Inner Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
                '   Inner Join REGIONS r_c On c.REGION_ID=r_c.REGION_ID ' +
                '   Left Join CHAMPIONSHIP_REGIONS cr On cr.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
                '       And cr.REGION_ID<>c.REGION_ID ' +
                '   Left Join WEBSITE_PERMANENT_CHAMPIONSHIPS wpc On wpc.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                '       And Len(wpc.CHAMPIONSHIP_TITLE)>0 ' +
                '   Left Join REGIONS r_r On cr.REGION_ID=r_r.REGION_ID ' +
                'Where cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null ' +
                '   And c.SEASON=@season And c.CHAMPIONSHIP_STATUS>0';
            var request = connection.request();
            request.input('season', seasonCode);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading championship categories data: ' + (err.message || err));
                    res.sendStatus(500);
                } else {
                    var championshipCategories = [];
                    var categoryMapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = {};
                        data.copyRecord(recordset[i], row);
                        categoryMapping[row.CHAMPIONSHIP_CATEGORY_ID.toString()] = true;
                        championshipCategories.push(row);
                    }
                    qs = 'Select c.SPORT_ID, s.SPORT_NAME, wpc.CHAMPIONSHIP_TITLE As PermanentChampionshipTitle, wpc.CHAMPIONSHIP_INDEX As PermanentChampionshipIndex, ' +
                        '   c.IS_CLUBS, cc.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, wpc.CHAMPIONSHIP_CATEGORY_ID, cm.CATEGORY_NAME, c.REGION_ID, ' +
                        '   r_c.REGION_NAME, Null As ExtraRegionId, Null As ExtraRegionName ' +
                        'From WEBSITE_PERMANENT_CHAMPIONSHIPS wpc Left Join CHAMPIONSHIP_CATEGORIES cc On wpc.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                        '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                        '   Left Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                        '   Left Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
                        '   Left Join REGIONS r_c On c.REGION_ID=r_c.REGION_ID ' +
                        'Order By wpc.CHAMPIONSHIP_INDEX Asc';
                    request = connection.request();
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading permanent championships data: ' + (err.message || err));
                            res.sendStatus(500);
                        } else {
                            for (var i = 0; i < recordset.length; i++) {
                                var row = {};
                                data.copyRecord(recordset[i], row);
                                if (!categoryMapping[row.CHAMPIONSHIP_CATEGORY_ID.toString()]) {
                                    championshipCategories.push(row);
                                }
                            }
                            res.send(championshipCategories);
                        }
                    });
                }
            });
        }, function (err) {
            res.sendStatus(500);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/team/:team/full-details', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var teamID = req.params.team;
    helpers.CreateConnection().then(function (connection) {
        helpers.Verify.UserTeam(req.session.user, connection, teamID, 'get full details of', false).then(function() {
            var qs = 'Select t.TEAM_ID, t.[STATUS], t.REGISTRATION_DATE, c.CHAMPIONSHIP_NAME, sp.SPORT_NAME, cm.CATEGORY_NAME, se.NAME As SEASON_NAME, ' +
                '   sc.MANAGER_NAME, sc.SCHOOL_NAME, sc.SYMBOL As SCHOOL_SYMBOL, r.REGION_NAME, sc.[ADDRESS], sc.ZIP_CODE, sc.PHONE, sc.FAX, sc.EMAIL ' +
                'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.CHAMPIONSHIP_STATUS>0 ' +
                '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID ' +
                '   Inner Join SEASONS se On c.SEASON=se.SEASON ' +
                '   Inner Join SCHOOLS sc On t.SCHOOL_ID=sc.SCHOOL_ID ' +
                '   Left Join REGIONS r On sc.REGION_ID=r.REGION_ID ' +
                '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                'Where t.DATE_DELETED Is Null And cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null And sp.DATE_DELETED Is Null ' +
                '   And se.DATE_DELETED Is Null And sc.DATE_DELETED Is Null And r.DATE_DELETED Is Null And t.TEAM_ID=@team';
            var request = connection.request();
            request.input('team', teamID);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading team full details: ' + (err.message || err));
                    res.sendStatus(500);
                } else {
                    if (recordset == null || recordset.length == 0) {
                        res.send({});
                    } else {
                        var team = {};
                        data.copyRecord(recordset[0], team);
                        qs = 'Select p.TEAM_NUMBER, p.[STATUS], p.REGISTRATION_DATE, s.FIRST_NAME, s.LAST_NAME, s.BIRTH_DATE, s.ID_NUMBER, s.[GRADE], sgm.GRADE_NAME ' +
                            'From PLAYERS p Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID ' +
                            '   Left Join SEASONS max_season On max_season.SEASON=(Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where [STATUS]=1)) From SEASONS Where [STATUS]=1 And [START_DATE]<=GetDate()) ' +
                            '   Left Join StudentGradeMapping sgm On max_season.SEASON-s.[GRADE]=sgm.GRADE_OFFSET ' +
                            'Where p.DATE_DELETED Is Null And s.DATE_DELETED Is Null ' +
                            '   And p.TEAM_ID=@team';
                        request = connection.request();
                        request.input('team', teamID);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading players for tean ' + teamID + ': ' + (err.message || err));
                                res.sendStatus(500);
                            } else {
                                team.Players = [];
                                for (var i = 0; i < recordset.length; i++) {
                                    var player = {};
                                    data.copyRecord(recordset[i], player);
                                    team.Players.push(player);
                                }
                                res.send(team);
                            }
                        });
                    }
                }
            });
        }, function(err) {
            res.sendStatus(401);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/school-change-requests', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select scr.STUDENT_ID, sc.SCHOOL_ID, sc.SCHOOL_NAME, sc.SYMBOL ' +
            'From SchoolChangeRequests scr Inner Join STUDENTS st On scr.STUDENT_ID=st.STUDENT_ID ' +
            '   Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID ' +
            'Where sc.SYMBOL<>scr.TARGET_SCHOOL_SYMBOL';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading school change requests: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/practice-camps', function (req, res) {
    helpers.CreateConnection().then(function (connection) {
        var qs = 'Select p.PRACTICE_CAMP_ID, p.SPORT_ID, s.SPORT_NAME, p.DATE_START, p.DATE_FINISH, p.BASE_PRICE, p.REMARKS ' +
            'From PRACTICE_CAMPS p Inner Join SPORTS s On p.SPORT_ID=s.SPORT_ID ' +
            'Where p.DATE_START>=GetDate() And p.DATE_DELETED Is Null And s.DATE_DELETED Is Null ' +
            'Order By p.DATE_START Asc';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading practice camps: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/school-data', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var filterFieldName = null;
    var filterValue = parseInt(req.query.id);
    if (!isNaN(filterValue) && filterValue > 0)
        filterFieldName = 'SCHOOL_ID';
    if (filterFieldName == null) {
        filterValue = parseInt(req.query.symbol);
        if (!isNaN(filterValue) && filterValue > 0) {
            filterFieldName = 'SYMBOL';
            filterValue = filterValue.toString();
        }
    }
    if (filterFieldName == null) {
        res.sendStatus(400);
        return;
    }

    helpers.CreateConnection().then(function (connection) {
        var qs = 'SELECT [SCHOOL_ID], [SYMBOL], [SCHOOL_NAME], [CITY_ID], [ADDRESS], [MAIL_ADDRESS], [MAIL_CITY_ID], [ZIP_CODE], ' +
                '   [EMAIL], [PHONE], [FAX], [MANAGER_NAME], [FROM_GRADE], [TO_GRADE], [SUPERVISION_TYPE], [SECTOR_TYPE], ' +
                '   [REGION_ID], [CLUB_STATUS], [PLAYER_NUMBER_FROM], [PLAYER_NUMBER_TO], [MANAGER_CELL_PHONE] ' +
                'FROM SCHOOLS ' +
                'WHERE ' + filterFieldName + '=@value AND DATE_DELETED IS NULL';
        var request = connection.request();
        request.input('value', filterValue);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading school data (field name "' + filterFieldName + '", value is ' +
                    filterValue + '): ' + (err.message || err));
                res.sendStatus(500);
            } else {
                var schoolData = {};
                if (recordset.length > 0) {
                    data.copyRecord(recordset[0], schoolData);
                }
                res.send(schoolData);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});


router.get('/student', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var idNumber = parseInt(req.query.id);
    var sportId = parseInt(req.query.sport || 0);
    helpers.CreateConnection().then(function (connection) {
        helpers.GetStudentData(connection, idNumber).then(function(student) {
            if (settings.Sportsman.FootballSportFieldIds.indexOf(sportId) >= 0) {
                //also check IFA register status
                ifaService.RegisterStatus(idNumber).then(function(playerStatus) {
                    student.IfaRegisterStatus = playerStatus;
                    res.send(student);
                }, function(err) {
                    res.send(student);
                });
            } else {
                res.send(student);
            }
        }, function(err) {
            res.sendStatus(500);
        });
    }, function (err) {
        res.sendStatus(500);
    });
});

router.get('/student/:student/candelete', function (req, res) {
    var idNumber = parseInt(req.params.student);
    helpers.CreateConnection().then(function (connection) {
        helpers.CanDeleteStudent(connection, req.session.user, idNumber).then(function(canDelete) {
            res.send({
                CanDelete: canDelete
            });
        }, function(err) {
            res.sendStatus(500);
        });
    }, function (err) {
        res.sendStatus(500);
    });
});

router.put('/team/:team/players', function(req, res) {
    function InsertSinglePlayer(transaction, teamId, schoolMapping, players, index) {
        function HandlePlayerSchool(player, userSchool) {
            return new Promise(function (fulfil, reject) {
                var studentId = player.STUDENT_ID;
                var studentSchool = schoolMapping[studentId.toString()];
                if (!userSchool || !studentSchool || userSchool == studentSchool) {
                    fulfil('OK');
                } else {
                    var qs = 'Delete From SchoolChangeRequests ' +
                        'Where STUDENT_ID=@student And TARGET_SCHOOL_SYMBOL=@symbol';
                    var request = transaction.request();
                    request.input('student', studentId);
                    request.input('symbol', userSchool);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error deleting from SchoolChangeRequests: ' + (err.message || err));
                            transaction.rollback();
                            reject('error deleting existing request');
                        } else {
                            qs = 'Insert Into SchoolChangeRequests (STUDENT_ID, TARGET_SCHOOL_SYMBOL) ' +
                                'Values (@student, @symbol)';
                            request = transaction.request();
                            request.input('student', studentId);
                            request.input('symbol', userSchool);
                            request.query(qs, function (err, recordset) {
                                if (err) {
                                    logger.error('Error inserting into SchoolChangeRequests: ' + (err.message || err));
                                    transaction.rollback();
                                    reject('error inserting school change request');
                                } else {
                                    fulfil('OK');
                                }
                            });
                        }
                    });
                }
            });
        }

        if (index >= players.length) {
            transaction.commit(function (err, recordset) {
                logger.log('info', players.length +  ' players added to team ' + teamId);
                res.send('OK');
            });
            return;
        }

        var userSchool = (req.session.user.role == 2) ? req.session.user.schoolSymbol : 0;
        var player = players[index];
        HandlePlayerSchool(player, userSchool).then(function() {
            var qs = 'Insert Into PLAYERS (STUDENT_ID, TEAM_ID, [STATUS]) ' +
                'Values (@student, @team, 1)';
            var request = transaction.request();
            request.input('student', player.STUDENT_ID);
            request.input('team', teamId);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error inserting new player: ' + (err.message || err));
                    transaction.rollback();
                    res.sendStatus(500);
                } else {
                    InsertSinglePlayer(transaction, teamId, schoolMapping, players, index + 1);
                }
            });
        }, function(err) {
            res.sendStatus(500);
        });
    }

    function GetSchoolMapping(connection, studentIds) {
        return new Promise(function (fulfil, reject) {
            if (req.session.user.role == 1 || studentIds.length == 0) {
                fulfil({});
            } else {
                var qs = 'Select st.STUDENT_ID, st.SCHOOL_ID, sc.SYMBOL ' +
                    'From STUDENTS st Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID ' +
                    'Where st.DATE_DELETED Is Null And sc.DATE_DELETED Is Null ' +
                    '   And st.STUDENT_ID In (' + studentIds.join(', ') + ')';
                var request = connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error getting school mapping: ' + (err.message || err));
                        reject('error reading data');
                    }
                    else {
                        var mapping = {};
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            mapping[row['STUDENT_ID'].toString()] = row['SYMBOL'];
                        }
                        fulfil(mapping);
                    }
                });
            }
        });
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var players = req.body.Players || [];
    if (players.length == 0) {
        res.send('EMPTY');
        return;
    }

    var studentIds = players.map(function(x) { return x.STUDENT_ID; });
    var teamId = req.params.team;
    if (!teamId || !utils.TrueForAll(studentIds, function(x) { return utils.IsValidInteger(x); })) {
        res.sendStatus(400);
        return;
    }

    helpers.CreateConnection().then(function(connection) {
        helpers.Verify.UserTeam(req.session.user, connection, teamId, 'upload players to', false).then(function() {
            GetSchoolMapping(connection, studentIds).then(function(schoolMapping) {
                var transaction = connection.transaction();
                transaction.begin(function (err) {
                    InsertSinglePlayer(transaction, teamId, schoolMapping, players, 0);
                });
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.sendStatus(401);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.post('/team', function(req, res) {
    function GetTeamIndex(connection, categoryId, schoolSymbol) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select IsNull(Max(TEAM_INDEX), -1) As MaxIndex ' +
                'From TEAMS ' +
                'Where DATE_DELETED Is Null And CHAMPIONSHIP_CATEGORY_ID=@category ' +
                '   And SCHOOL_ID=(Select SCHOOL_ID From SCHOOLS Where SYMBOL=@symbol And DATE_DELETED Is Null)';
            var request = connection.request();
            request.input('category', categoryId);
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading maximum team index: ' + (err.message || err));
                    reject('error reading data');
                }
                else {
                    var teamIndex = recordset[0]['MaxIndex'] + 1;
                    if (teamIndex == 1)
                        teamIndex++;
                    fulfil(teamIndex);
                }
            });
        });
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var rawUser = parseInt(req.body.User);
    var schoolSymbol = req.body.School;
    var championshipId = req.body.Championship;
    var categoryId = req.body.Category;
    if (!isNaN(rawUser) && rawUser > 0 && schoolSymbol && championshipId && categoryId) {
        var userId = rawUser - settings.Sportsman.UserOffset;
        helpers.CreateConnection().then(function(connection) {
            GetTeamIndex(connection, categoryId, schoolSymbol).then(function(teamIndex) {
                var qs = 'Insert Into TEAMS (SCHOOL_ID, CHAMPIONSHIP_ID, CHAMPIONSHIP_CATEGORY_ID, [STATUS], TEAM_INDEX, TEAM_SUPERVISOR) ' +
                    'Select SCHOOL_ID, @championship, @category, 1, @index, @user ' +
                    'From SCHOOLS ' +
                    'Where SYMBOL=@symbol And DATE_DELETED Is Null';
                var request = connection.request();
                request.input('championship', championshipId);
                request.input('category', categoryId);
                request.input('index', teamIndex);
                request.input('user', userId);
                request.input('symbol', schoolSymbol);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error inserting new team: ' + (err.message || err));
                        res.status(500).send('error inserting data');
                    }
                    else {
                        res.send({
                            'TeamIndex': teamIndex
                        });
                    }
                });
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.sendStatus(500);
        });

    } else {
        res.sendStatus(400);
    }
});

router.delete('/pending-team', function(req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var teamID = req.query.team;
    if (parseInt(teamID) == teamID) {
        helpers.CreateConnection().then(function(connection) {
            var qs = 'Delete From PENDING_TEAMS Where PENDING_TEAM_ID=@team';
            var request = connection.request();
            request.input('team', teamID);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error deleting pending team ' + teamID + ': ' + (err.message || err));
                    res.sendStatus(400);
                }
                else {
                    res.send('OK');
                }
            });
        }, function(err) {
            res.sendStatus(500);
        });
    } else {
        res.sendStatus(400);
    }
});

router.post('/student', function(req, res) {
    function AddNewStudent(transaction, student, schoolID) {
        function AuditStudent() {
            return new Promise(function (fulfil, reject) {
                if (req.session.user.role == 1 || !req.session.user.schoolSymbol) {
                    fulfil('OK');
                } else {
                    var schoolSymbol = req.session.user.schoolSymbol;
                    var idNumber = student.IdNumber;
                    var qs = 'Delete From StudentsAddedBySchools ' +
                        'Where SCHOOL_SYMBOL=@symbol And STUDENT_ID_NUMBER=@id_number';
                    var request = transaction.request();
                    request.input('symbol', schoolSymbol);
                    request.input('id_number', idNumber);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error deleting existing row from students audit table: ' + (err.message || err));
                            transaction.rollback();
                            reject('error deleting audit');
                        } else {
                            qs = 'Insert Into StudentsAddedBySchools (SCHOOL_SYMBOL, STUDENT_ID_NUMBER, DATE_CREATED) ' +
                                'Values (@symbol, @id_number, @now)';
                            request = transaction.request();
                            request.input('symbol', schoolSymbol);
                            request.input('id_number', idNumber);
                            request.input('now', new Date());
                            request.query(qs, function (err, recordset) {
                                if (err) {
                                    logger.error('Error inserting into students audit table: ' + (err.message || err));
                                    transaction.rollback();
                                    reject('error adding audit');
                                } else {
                                    fulfil('OK');
                                }
                            });
                        }
                    });
                }
            });
        }
        return new Promise(function (fulfil, reject) {
            var idNumber = student.IdNumber;
            var qs = 'Insert Into STUDENTS (ID_NUMBER, FIRST_NAME, LAST_NAME, GRADE, BIRTH_DATE, SCHOOL_ID, SEX_TYPE) ' +
                'Values (@id, @first_name, @last_name, @grade, @birth_date, @school, @gender)';
            var request = transaction.request();
            request.input('id', idNumber);
            request.input('first_name', student.FirstName);
            request.input('last_name', student.LastName);
            request.input('grade', student.Grade);
            request.input('birth_date', student.Birthday);
            request.input('school', schoolID);
            request.input('gender', student.Gender);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error inserting new student: ' + (err.message || err));
                    transaction.rollback();
                    reject('error adding student');
                } else {
                    AuditStudent().then(function() {
                        qs = 'Select STUDENT_ID From STUDENTS Where ID_NUMBER=@id_number And DATE_DELETED Is Null';
                        request = transaction.request();
                        request.input('id_number', idNumber);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error getting ID of new student: ' + (err.message || err));
                                transaction.rollback();
                                reject('error getting student id');
                            } else {
                                if (recordset == null || recordset.length == 0) {
                                    logger.error('New student with id number ' + idNumber + ' got no actual ID');
                                    reject('ID not found');
                                } else {
                                    fulfil(recordset[0]['STUDENT_ID']);
                                }
                            }
                        });
                    }, function(err) {
                        reject(err);
                    });
                }
            });
        });
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        logger.log('verbose', 'user not authorized to add students');
        res.sendStatus(401);
        return;
    }

    var student = req.body.Student || {};
    if (!student.Gender)
        student.Gender = null;
    var idNumber = student.IdNumber;
    if (parseInt(idNumber) == idNumber && idNumber.toString().length >= 7) {
        helpers.CreateConnection().then(function(connection) {
            helpers.GetSchoolForStudent(req.session.user, connection, req.body.School).then(function(schoolID) {
                helpers.GetStudentData(connection, idNumber).then(function(existingStudent) {
                    if (existingStudent && existingStudent.STUDENT_ID) {
                        res.sendStatus(400);
                    } else {
                        var transaction = connection.transaction();
                        transaction.begin(function (err) {
                            AddNewStudent(transaction, student, schoolID).then(function(studentID) {
                                student.STUDENT_ID = studentID;
                                transaction.commit(function (err, recordset) {
                                    logger.log('info', 'New student with id number ' + idNumber + ' added by user ' + req.session.user.seq);
                                    res.send(student);
                                });
                            }, function(err) {
                                res.status(500).send(err);
                            });
                        });
                    }
                }, function(err) {
                    res.status(500).send(err);
                });
            }, function(err) {
                res.status(500).send(err);
            });
        }, function(err) {
            res.status(500).send(err);
        });
    } else {
        res.sendStatus(400);
    }
});

router.post('/match-result', function (req, res) {
    function InsertOverrideRecord(transaction, matchData, originalScore_A, originalScore_B, originalResult, originalPartResult) {
        return new Promise(function (fulfil, reject) {
            //first delete any existing record
            var qs = 'Delete From MATCH_SCORE_OVERRIDE ' +
                'Where CHAMPIONSHIP_CATEGORY_ID=@category And PHASE=@phase And NGROUP=@group And [ROUND]=@round And [MATCH]=@match And [CYCLE]=@cycle';
            var request = transaction.request();
            request.input('category', matchData.CHAMPIONSHIP_CATEGORY_ID);
            request.input('phase', matchData.PHASE);
            request.input('group', matchData.NGROUP);
            request.input('round', matchData.ROUND);
            request.input('cycle', matchData.CYCLE);
            request.input('match', matchData.MATCH);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error deleting existing match score override record: ' + (err.message || err));
                    transaction.rollback();
                    reject('error deleting existing override record');
                } else {
                    var isApproved = (req.session.user.role == 1) ? 1 : null;
                    qs = 'Insert Into MATCH_SCORE_OVERRIDE (CHAMPIONSHIP_CATEGORY_ID, PHASE, NGROUP, [ROUND], [MATCH], [CYCLE], ' +
                    '   TEAM_A_SCORE, TEAM_B_SCORE, UserSeq, DateUpdated, ORIGINAL_SCORE_A, ORIGINAL_SCORE_B, [Approved], ' +
                    '   [RESULT], [PARTS_RESULT], [ORIGINAL_RESULT], [ORIGINAL_PARTS_RESULT]) ' +
                    'Values (@category, @phase, @group, @round, @match, @cycle, @new_score_a, @new_score_b, @user, @date, ' +
                    '   @original_score_a, @original_score_b, @approved, @result, @part_result, @original_result, @original_part_result)';
                    request = transaction.request();
                    request.input('category', matchData.CHAMPIONSHIP_CATEGORY_ID);
                    request.input('phase', matchData.PHASE);
                    request.input('group', matchData.NGROUP);
                    request.input('round', matchData.ROUND);
                    request.input('cycle', matchData.CYCLE);
                    request.input('match', matchData.MATCH);
                    request.input('new_score_a', matchData.OVERRIDEN_TEAM_A_SCORE);
                    request.input('new_score_b', matchData.OVERRIDEN_TEAM_B_SCORE);
                    request.input('user', req.session.user.seq);
                    request.input('date', new Date());
                    request.input('original_score_a', originalScore_A);
                    request.input('original_score_b', originalScore_B);
                    request.input('approved', isApproved);
                    request.input('result', matchData.RESULT);
                    request.input('part_result', matchData.OVERRIDEN_PARTS_RESULT);
                    request.input('original_result', originalResult);
                    request.input('original_part_result', originalPartResult);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error inserting match score override record: ' + (err.message || err));
                            transaction.rollback();
                            reject('error inserting override record');
                        } else {
                            fulfil('OK');
                        }
                    });
                }
            });
        });
    }

    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        res.sendStatus(401);
        return;
    }

    var match = req.body.Match;
    helpers.CreateConnection().then(function(connection) {
        helpers.Verify.UserMatch(req.session.user, connection, match).then(function(resp) {
            var originalScore_A = resp.OriginalScore_A;
            var originalScore_B = resp.OriginalScore_B;
            var originalResult = resp.OriginalResult;
            var originalPartResult = resp.OriginalPartResult;
            var transaction = connection.transaction();
            transaction.begin(function (err) {
                InsertOverrideRecord(transaction, match, originalScore_A, originalScore_B, originalResult, originalPartResult).then(function() {
                    helpers.Championship.UpdateMatchesTable(req.session.user, transaction, match).then(function() {
                        transaction.commit(function (err, recordset) {
                            logger.log('info', 'Match result in category ' + match.CHAMPIONSHIP_CATEGORY_ID + ' updated successfully');
                            match.ORIGINAL_SCORE_A = match.TEAM_A_SCORE;
                            match.ORIGINAL_SCORE_B = match.TEAM_B_SCORE;
                            match.TEAM_A_SCORE = match.OVERRIDEN_TEAM_A_SCORE;
                            match.TEAM_B_SCORE = match.OVERRIDEN_TEAM_B_SCORE;
                            match.OverridenScoreApproved = req.session.user.role == 1 ? 1 : null;
                            res.send(match);
                        });
                    }, function(err) {
                        res.sendStatus(500);
                    });
                }, function(err) {
                    res.sendStatus(500);
                });
            });
        }, function(err) {
            res.sendStatus(401);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.put('/pending-score', function (req, res) {
    function UpdateOverrideRecord(transaction, matchData) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Update MATCH_SCORE_OVERRIDE ' +
                'Set [Approved]=1 ' +
                'Where CHAMPIONSHIP_CATEGORY_ID=@category And PHASE=@phase And NGROUP=@group And [ROUND]=@round And [MATCH]=@match And [CYCLE]=@cycle';
            var request = transaction.request();
            request.input('category', matchData.CHAMPIONSHIP_CATEGORY_ID);
            request.input('phase', matchData.PHASE);
            request.input('group', matchData.NGROUP);
            request.input('round', matchData.ROUND);
            request.input('cycle', matchData.CYCLE);
            request.input('match', matchData.MATCH);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error updating match score override record: ' + (err.message || err));
                    transaction.rollback();
                    reject('error updating existing override record');
                } else {
                    fulfil('OK');
                }
            });
        });
    }

    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var match = req.body.Match;
    helpers.CreateConnection().then(function(connection) {
        var transaction = connection.transaction();
        transaction.begin(function (err) {
            helpers.Championship.UpdateMatchesTable(req.session.user, transaction, match).then(function () {
                UpdateOverrideRecord(transaction, match).then(function () {
                    transaction.commit(function (err, recordset) {
                        logger.log('info', 'Match result in category ' + match.CHAMPIONSHIP_CATEGORY_ID + ' approved successfully');
                        res.send('OK');
                    });
                }, function (err) {
                    res.sendStatus(500);
                });
            }, function (err) {
                res.sendStatus(500);
            });
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.delete('/pending-score', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var match = utils.DeserializeQueryStringValue(req.query, 'Match_');
    helpers.CreateConnection().then(function(connection) {
        var qs = 'Delete From MATCH_SCORE_OVERRIDE ' +
            'Where CHAMPIONSHIP_CATEGORY_ID=@category And PHASE=@phase And NGROUP=@group And [ROUND]=@round And [MATCH]=@match And [CYCLE]=@cycle';
        var request = connection.request();
        request.input('category', match.CHAMPIONSHIP_CATEGORY_ID);
        request.input('phase', match.PHASE);
        request.input('group', match.NGROUP);
        request.input('round', match.ROUND);
        request.input('cycle', match.CYCLE);
        request.input('match', match.MATCH);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error deleting match score override record: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                logger.log('info', 'Match result in category ' + match.CHAMPIONSHIP_CATEGORY_ID + ' deleted successfully');
                res.send('OK');
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.put('/player', function(req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        logger.log('verbose', 'user not authorized to edit player');
        res.sendStatus(401);
        return;
    }

    var player = req.body.Player;
    var playerID = player.Id;
    if (!player.Gender)
        player.Gender = null;
    if (parseInt(playerID) == playerID) {
        helpers.CreateConnection().then(function(connection) {
            helpers.Championship.PlayerTeam(connection, playerID).then(function(teamID) {
                helpers.Verify.UserTeam(req.session.user, connection, teamID, 'edit a player in', false).then(function() {
                    var qs = 'Update STUDENTS ' +
                        'Set FIRST_NAME=@first_name, LAST_NAME=@last_name, GRADE=@grade, BIRTH_DATE=@birth_date, SEX_TYPE=@gender ' +
                        'Where STUDENT_ID=(Select STUDENT_ID From PLAYERS Where PLAYER_ID=@id And DATE_DELETED Is Null)';
                    var request = connection.request();
                    request.input('id', playerID);
                    request.input('first_name', player.FirstName);
                    request.input('last_name', player.LastName);
                    request.input('grade', player.Grade);
                    request.input('birth_date', player.Birthday);
                    request.input('gender', player.Gender);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error editing player ' + playerID + ': ' + (err.message || err));
                            res.sendStatus(400);
                        }
                        else {
                            res.send('OK');
                        }
                    });
                }, function(err) {
                    res.sendStatus(401);
                });
            }, function(err) {
                res.sendStatus(401);
            });
        }, function(err) {
            res.sendStatus(500);
        });
    } else {
        res.sendStatus(400);
    }
});

router.delete('/student', function(req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        logger.log('verbose', 'user not authorized to delete student');
        res.sendStatus(401);
        return;
    }

    var idNumber = req.query.id;
    if (parseInt(idNumber) == idNumber) {
        helpers.CreateConnection().then(function(connection) {
            helpers.CanDeleteStudent(connection, req.session.user, idNumber).then(function(canDelete) {
                if (canDelete) {
                    var transaction = connection.transaction();
                    transaction.begin(function (err) {
                        var qs = 'Update PLAYERS ' +
                            'Set DATE_DELETED=GetDate() ' +
                            'Where STUDENT_ID In (Select STUDENT_ID From STUDENTS Where ID_NUMBER=@id)';
                        var request = transaction.request();
                        request.input('id', idNumber);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error deleting players for student with id ' + idNumber + ': ' + (err.message || err));
                                res.sendStatus(500);
                            } else {
                                qs = 'Update STUDENTS ' +
                                'Set DATE_DELETED=GetDate() ' +
                                'Where ID_NUMBER=@id';
                                request = transaction.request();
                                request.input('id', idNumber);
                                request.query(qs, function (err, recordset) {
                                    if (err) {
                                        logger.error('Error deleting student with id ' + idNumber + ': ' + (err.message || err));
                                        res.sendStatus(500);
                                    }
                                    else {
                                        transaction.commit(function (err, recordset) {
                                            logger.log('info', 'Student with id number ' + idNumber + ' has been deleted by user ' + req.session.user.seq);
                                            res.send('OK');
                                        });
                                    }
                                });
                            }
                        });
                    });
                } else {
                    res.sendStatus(401);
                }
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.sendStatus(500);
        });
    } else {
        res.sendStatus(400);
    }
});

router.delete('/player', function(req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        logger.log('verbose', 'user not authorized to delete player');
        res.sendStatus(401);
        return;
    }

    var playerID = req.query.player;
    if (parseInt(playerID) == playerID) {
        helpers.CreateConnection().then(function(connection) {
            helpers.Championship.PlayerTeam(connection, playerID).then(function(teamID) {
                helpers.Verify.UserTeam(req.session.user, connection, teamID, 'delete a player from', false).then(function() {
                    var qs = 'Update PLAYERS ' +
                        'Set DATE_DELETED=GetDate() ' +
                        'Where PLAYER_ID=@player';
                    var request = connection.request();
                    request.input('player', playerID);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error deleting player ' + playerID + ': ' + (err.message || err));
                            res.sendStatus(400);
                        }
                        else {
                            res.send('OK');
                        }
                    });
                }, function(err) {
                    res.sendStatus(401);
                });
            }, function(err) {
                res.sendStatus(401);
            });
        }, function(err) {
            res.sendStatus(500);
        });
    } else {
        res.sendStatus(400);
    }
});

router.delete('/team', function(req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        logger.log('verbose', 'user not authorized to delete team');
        res.sendStatus(401);
        return;
    }

    var teamID = req.query.team;
    if (parseInt(teamID) == teamID) {
        helpers.CreateConnection().then(function(connection) {
            helpers.Verify.UserTeam(req.session.user, connection, teamID, 'delete', true).then(function() {
                var qs = 'Update TEAMS ' +
                    'Set DATE_DELETED=GetDate() ' +
                    'Where TEAM_ID=@team';
                var request = connection.request();
                request.input('team', teamID);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error deleting team ' + teamID + ': ' + (err.message || err));
                        res.sendStatus(400);
                    }
                    else {
                        res.send('OK');
                    }
                });
            }, function(err) {
                res.sendStatus(401);
            });
        }, function(err) {
            res.sendStatus(500);
        });
    } else {
        res.sendStatus(400);
    }
});

router.post('/practice-camps', function (req, res) {
    function VerifyCAPTCHA() {
        return new Promise(function (fulfil, reject) {
            request.post(
                'https://www.google.com/recaptcha/api/siteverify', {
                    form: {
                        secret : '6LfL2DEUAAAAAHhq4j3pMGDO5TjRckn5F8JR6IQO',
                        response: req.body.captchaResponse
                    }
                },
                function (error, response, body) {
                    if (error) {
                        logger.error('Error verifying CAPTCHA response: ' +error);
                        //don't block user when the service is down:
                        fulfil('error while verifying');
                    } else {
                        if (response.statusCode != 200) {
                            logger.error('Got status code ' + response.statusCode + ' while verifying CAPTCHA response');
                            //don't block user when the service is down:
                            fulfil('bad status code while verifying');
                        } else {
                            var parsedBody = JSON.parse(body);
                            if (parsedBody.success) {
                                fulfil('OK');
                            } else {
                                logger.log('verbose', 'CAPTCHA check returned false');
                                console.log(body);
                                reject('CAPTCHA failed');
                            }
                        }
                    }
                }
            );
        });
    }

    VerifyCAPTCHA().then(function(resp) {
        helpers.CreateConnection().then(function (connection) {
            var participant = req.body.Participant;
            if (!participant || participant == null) {
                res.sendStatus(403);
                return;
            }
            var remarks = '';
            if (participant.Coach)
                remarks = 'מאמן: ' + participant.Coach;
            if (participant.HMO) {
                if (remarks.length > 0)
                    remarks += ', ';
                remarks += 'קופת חולים: ' + participant.HMO;
            }
            var gender = participant.gender ? participant.gender.Id : null;
            var qs = 'Insert Into PRACTICE_CAMP_PARTICIPANTS (' +
                '   PRACTICE_CAMP_ID, PARTICIPANT_NAME, PARTICIPANT_ADDRESS, PARTICIPANT_SCHOOL, PARTICIPANT_BIRTHDAY, ' +
                '   PARTICIPANT_PHONE, PARTICIPANT_CELL_PHONE, REMARKS, SEX_TYPE, PARTICIPANT_EMAIL, IS_CONFIRMED' +
                ') Values (' +
                '   @camp_id, @name, @address, @school, @birthday, @phone, @cellular, @remarks, @gender, @email, 0' +
                ')';
            var request = connection.request();
            request.input('camp_id', participant.practiceCamp.PRACTICE_CAMP_ID);
            request.input('name', participant.Name);
            request.input('address', participant.Address);
            request.input('school', participant.School);
            request.input('birthday', participant.ParsedBirthday);
            request.input('phone', participant.Phone);
            request.input('cellular', participant.Cellular);
            request.input('remarks', remarks);
            request.input('gender', gender);
            request.input('email', participant.Email);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error inserting practice camp participant: ' + (err.message || err));
                    res.sendStatus(500);
                } else {
                    res.send('OK');
                }
            });
        }, function(err) {
            res.sendStatus(500);
        });
    }, function(err) {
        res.sendStatus(400);
    });
});

module.exports = router;
module.exports.Regions = GetRegions;
module.exports.GetSchoolUserData = GetSchoolUserData;
module.exports.GetUserPayments = GetUserPayments;
module.exports.GetUpcomingEvents = GetUpcomingEvents;
module.exports.SeasonsInUse = GetSeasonsInUse;
module.exports.PermanentChampionships = GetPermanentChampionships;
module.exports.EventsRange = helpers.Events.GetRange;
module.exports.UserLogin = helpers.Login;
module.exports.SchoolTeams = helpers.Championship.SchoolTeams;
module.exports.GetSchoolDetails = helpers.School.Details;
module.exports.CreateConnection = helpers.CreateConnection;
