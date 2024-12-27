var Season = require('../season');

function Championships(db) {
    this.db = db;
}

Championships.prototype.list = function (season, options, callback) {
    var self = this;
    this.db.connect()
        .then(
            function (connection) {
                //console.log('region: ' + options.region + ', clubs? ' + options.clubs + ', league? ' + options.league);
                if (options.region === 'null') {
                    options.region = null;
                }
                var qs = "Select c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.REGION_ID, r.REGION_NAME, c.SPORT_ID, s.SPORT_NAME, " +
                    "  c.LAST_REGISTRATION_DATE, c.[START_DATE], c.[END_DATE], c.ALT_START_DATE, c.ALT_END_DATE, " +
                    "  c.FINALS_DATE, c.ALT_FINALS_DATE, c.RULESET_ID, ru.RULESET_NAME, c.IS_OPEN, c.REMARKS, " +
                    "  Case c.CHAMPIONSHIP_STATUS When 0 Then 'בתכנון' When 1 Then 'רישום קבוצות' When 2 Then 'רישום שחקנים' When 3 Then 'מאושרת' Else 'לא ידוע' End As ChampionshipStatus, " +
                    "  c.CHAMPIONSHIP_SUPERVISOR, u.USER_FIRST_NAME As SupervisorFirstName, u.USER_LAST_NAME As SupervisorLastName, u.USER_EMAIL As SupervisorEmail, " +
                    "  c.IS_CLUBS as \"IS_CLUBS\", c.IS_LEAGUE as \"IS_LEAGUE\" " +
                    "From CHAMPIONSHIPS c Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                    "   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null " +
                    "   Left Join RULESETS ru On c.RULESET_ID=ru.RULESET_ID And ru.DATE_DELETED Is Null " +
                    "   Left Join USERS u On c.CHAMPIONSHIP_SUPERVISOR=u.[USER_ID] And u.DATE_DELETED Is Null " +
                    "Where c.DATE_DELETED Is Null And c.SEASON=@season" +
                    (options.region != null ? " and c.REGION_ID = @region" : "") + //c.REGION_ID = 0 Or 
                    (options.sport ? " and c.SPORT_ID = @sport" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE = 1" : "");
                //if (options.type != 'all' && !options.clubs && !options.league) {
                //    qs += " And IsNull(c.IS_CLUBS, 0)=0 And IsNull(c.IS_LEAGUE, 0)=0";
                //}
                //console.log(qs);
                connection.request(qs, {season: season, region: options.region, sport: options.sport})
                    .then(
                        function (records) {
                            var result = [];
                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                var championship = {
                                    id: record['CHAMPIONSHIP_ID'],
                                    name: record['CHAMPIONSHIP_NAME'],
                                    league: record.IS_LEAGUE == 1,
                                    clubs: record.IS_CLUBS == 1,
                                    isOpen: record['IS_OPEN'] == 1 ? 'פתוחה' : 'סגורה',
                                    status: record['ChampionshipStatus'],
                                    remarks: record['REMARKS'],
                                    region: {
                                        id: record['REGION_ID'],
                                        name: record['REGION_NAME']
                                    },
                                    sport: {
                                        id: record['SPORT_ID'],
                                        name: record['SPORT_NAME']
                                    },
                                    ruleset: {
                                        id: record['RULESET_ID'],
                                        name: record['RULESET_NAME']
                                    },
                                    dates: {
                                        start: record['START_DATE'],
                                        end: record['END_DATE'],
                                        finals: record['FINALS_DATE'],
                                        lastRegistration: record['LAST_REGISTRATION_DATE']
                                    },
                                    alternativeDates: {
                                        start: record['ALT_START_DATE'],
                                        end: record['ALT_END_DATE'],
                                        finals: record['ALT_FINALS_DATE']
                                    },
                                    supervisor: {
                                        id: record['CHAMPIONSHIP_SUPERVISOR'],
                                        name: record['CHAMPIONSHIP_SUPERVISOR'] == null ? '' : record['SupervisorFirstName'] + ' ' + record['SupervisorLastName'],
                                        email: record['SupervisorEmail']
                                    }
                                };
                                result.push(championship);
                            }
                            if (result.length > 0) {
                                var championshipIds = result.map(function(x) {
                                    return x.id;
                                });
                                qs = 'Select cc.CHAMPIONSHIP_ID, cc.CHAMPIONSHIP_CATEGORY_ID, cc.CATEGORY, cm.CATEGORY_NAME ' +
                                    'From CHAMPIONSHIP_CATEGORIES cc Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                    'Where cc.DATE_DELETED Is Null And cc.CHAMPIONSHIP_ID In (' + championshipIds.join(', ') + ') ' +
                                    'Order By cc.CHAMPIONSHIP_ID, cc.CHAMPIONSHIP_CATEGORY_INDEX';
                                connection.request(qs, {}).then(function (records) {
                                    connection.complete();
                                    var categoryMapping = {};
                                    for (var i = 0; i < records.length; i++) {
                                        var record = records[i];
                                        var key = record['CHAMPIONSHIP_ID'].toString();
                                        if (!categoryMapping[key])
                                            categoryMapping[key] = [];
                                        categoryMapping[key].push(record['CATEGORY_NAME']);
                                    }
                                    result.forEach(function(championship) {
                                        var allCategories = categoryMapping[championship.id.toString()] || [];
                                        championship.categories = allCategories.join(', ');
                                    })
                                    callback(null, result);
                                }, function (err) {
                                        connection.complete();
                                        callback(err);
                                });
                            } else {
                                connection.complete();
                                callback(null, result);
                            }
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Championships.prototype.getRaw = function (options, callback) {
    this.db.connect()
        .then(
            function (connection) {
                var qs = "Select * From CHAMPIONSHIPS c " +
                    (options.season ? " Where c.SEASON = @season " : "");
                console.log(qs);
                console.log(options);

                connection.request(qs, options).then(
                    function (records) {
                        connection.complete();
                        callback(null, records);
                    },
                    function (err) {
                        connection.complete();
                        callback(err);
                    }
                );
            },
            function (err) {
                callback(err);
            }
        );
};

Championships.prototype.getRawChampionshipsDetails = function (options, callback) {
    const getDefaultQuery = (tableName, options) => {
        return `Select ${tableName}.*, c.SEASON From ${tableName}
                JOIN CHAMPIONSHIP_CATEGORIES cc ON ${tableName}.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID 
                JOIN CHAMPIONSHIPS c ON cc.CHAMPIONSHIP_ID = c.CHAMPIONSHIP_ID 
                ${(options.season ? " Where c.SEASON = @season " : "")}`;
    }
    this.db.connect()
        .then(
            function (connection) {
                var cyclesQuery = getDefaultQuery('CHAMPIONSHIP_CYCLES', options);
                connection.request(cyclesQuery, options).then(
                    function (cyclesResult) {
                        var groupsQuery = getDefaultQuery('CHAMPIONSHIP_GROUPS', options);
                        connection.request(groupsQuery, options).then(
                            function (groupsResult) {
                                var groupTeamsQuery = getDefaultQuery('CHAMPIONSHIP_GROUP_TEAMS', options);
                                connection.request(groupTeamsQuery, options).then(
                                    function (groupTeamsResult) {
                                        var matchesQuery = getDefaultQuery('CHAMPIONSHIP_MATCHES', options);
                                        connection.request(matchesQuery, options).then(
                                            function (matchesResult) {
                                                var matchFuncQuery = getDefaultQuery('CHAMPIONSHIP_MATCH_FUNCTIONARIES', options);
                                                connection.request(matchFuncQuery, options).then(
                                                    function (matchFuncResult) {
                                                        var phasesQuery = getDefaultQuery('CHAMPIONSHIP_PHASES', options);
                                                        connection.request(phasesQuery, options).then(
                                                            function (phasesResult) {
                                                                var phaseDefinitionsQuery = getDefaultQuery('CHAMPIONSHIP_PHASE_DEFINITIONS', options);
                                                                connection.request(phaseDefinitionsQuery, options).then(
                                                                    function (phaseDefinitionsResult) {
                                                                        var roundsQuery = getDefaultQuery('CHAMPIONSHIP_ROUNDS', options);
                                                                        connection.request(roundsQuery, options).then(
                                                                            function (roundsResult) {
                                                                                var tournamentsQuery = getDefaultQuery('CHAMPIONSHIP_TOURNAMENTS', options);
                                                                                connection.request(tournamentsQuery, options).then(
                                                                                    function (tournamentsResult) {
                                                                                        var competitionsQuery = getDefaultQuery('CHAMPIONSHIP_COMPETITIONS', options);
                                                                                        connection.request(competitionsQuery, options).then(
                                                                                            function (competitionsResult) {
                                                                                                var competitorsQuery = getDefaultQuery('CHAMPIONSHIP_COMPETITION_COMPETITORS', options);
                                                                                                connection.request(competitorsQuery, options).then(
                                                                                                    function (competitorsResult) {
                                                                                                        var heatsQuery = getDefaultQuery('CHAMPIONSHIP_COMPETITION_HEATS', options);
                                                                                                        connection.request(heatsQuery, options).then(
                                                                                                            function (heatsResult) {
                                                                                                                connection.complete();
                                                                                                                const details = {
                                                                                                                    cycles: cyclesResult,
                                                                                                                    groups: groupsResult,
                                                                                                                    groupTeams: groupTeamsResult,
                                                                                                                    matches: matchesResult,
                                                                                                                    matchFunc: matchFuncResult,
                                                                                                                    phases: phasesResult,
                                                                                                                    phaseDefinitions: phaseDefinitionsResult,
                                                                                                                    rounds: roundsResult,
                                                                                                                    tournaments: tournamentsResult,
                                                                                                                    competitions: competitionsResult,
                                                                                                                    competitors: competitorsResult,
                                                                                                                    heats: heatsResult
                                                                                                                }
                                                                                                                callback(null, details);
                                                                                                            },
                                                                                                            function (err) {
                                                                                                                connection.complete();
                                                                                                                callback(err);
                                                                                                            }
                                                                                                        );
                                                                                                    },
                                                                                                    function (err) {
                                                                                                        connection.complete();
                                                                                                        callback(err);
                                                                                                    }
                                                                                                );
                                                                                            },
                                                                                            function (err) {
                                                                                                connection.complete();
                                                                                                callback(err);
                                                                                            }
                                                                                        );
                                                                                    },
                                                                                    function (err) {
                                                                                        connection.complete();
                                                                                        callback(err);
                                                                                    }
                                                                                );
                                                                            },
                                                                            function (err) {
                                                                                connection.complete();
                                                                                callback(err);
                                                                            }
                                                                        );
                                                                    },
                                                                    function (err) {
                                                                        connection.complete();
                                                                        callback(err);
                                                                    }
                                                                );
                                                            },
                                                            function (err) {
                                                                connection.complete();
                                                                callback(err);
                                                            }
                                                        );
                                                    },
                                                    function (err) {
                                                        connection.complete();
                                                        callback(err);
                                                    }
                                                );
                                            },
                                            function (err) {
                                                connection.complete();
                                                callback(err);
                                            }
                                        );
                                    },
                                    function (err) {
                                        connection.complete();
                                        callback(err);
                                    }
                                );
                            },
                            function (err) {
                                connection.complete();
                                callback(err);
                            }
                        );
                    },
                    function (err) {
                        connection.complete();
                        callback(err);
                    }
                );
            },
            function (err) {
                callback(err);
            }
        );
};

Championships.prototype.getRawCategoryNames = function (callback) {
    this.db.connect()
        .then(
            function (connection) {
                var qs = "Select * From CATEGORY_MAPPING cm";

                connection.request(qs).then(
                    function (records) {
                        connection.complete();
                        callback(null, records);
                    },
                    function (err) {
                        connection.complete();
                        callback(err);
                    }
                );
            },
            function (err) {
                callback(err);
            }
        );
};

Championships.prototype.getRawCategories = function (options, callback) {
    this.db.connect()
        .then(
            function (connection) {
                var qs = "Select cc.*, c.SEASON From CHAMPIONSHIP_CATEGORIES cc " + 
                    " JOIN CHAMPIONSHIPS c ON cc.CHAMPIONSHIP_ID = c.CHAMPIONSHIP_ID " + 
                    (options.season ? " Where c.SEASON = @season " : "");

                connection.request(qs, options).then(
                    function (records) {
                        connection.complete();
                        callback(null, records);
                    },
                    function (err) {
                        connection.complete();
                        callback(err);
                    }
                );
            },
            function (err) {
                callback(err);
            }
        );
};

module.exports = new Championships(require('../db'));