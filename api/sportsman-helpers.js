var Promise = require('promise');
var sql = require('mssql');
var logger = require('../logger');
var settings = require('../settings');
var utils = require('./utils');
var data = require('./data');

function CreateConnection() {
    return new Promise(function (fulfil, reject) {
        var connection = new sql.Connection(settings.sportsmanDb, function(err) {
            if (err) {
                logger.error('Sportsman connection error: ' + err.message);
                reject('error creating connection');
            }
            else {
                fulfil(connection);
            }
        });
    });
}

function GetSeasonMapping() {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            var qs = 'Select [SEASON], [NAME] From SEASONS Where DATE_DELETED Is Null';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading  sportsman seasons: ' + (err.message || err));
                    reject('error while reading');
                }
                else {
                    var mapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        mapping[row['NAME']] = row['SEASON'];
                    }
                    fulfil(mapping);
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

function GetEventsRange() {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            var qs = 'Select Min(m.MinDate) As MinDate, Max(m.MaxDate) As MaxDate From (' +
                '   Select Min([Time]) As MinDate, Max([Time]) As MaxDate ' +
                '   From CHAMPIONSHIP_MATCHES ' +
                '   Where DATE_DELETED Is Null And Year([Time]) Between 2000 And 2100 ' +
                '   Union All ' +
                '   Select Min([Time]) As MinDate, Max([Time]) As MaxDate ' +
                '   From CHAMPIONSHIP_COMPETITIONS ' +
                '   Where DATE_DELETED Is Null And Year([Time]) Between 2000 And 2100' +
                ') As m';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading  sportsman events range: ' + (err.message || err));
                    reject('error while reading');
                }
                else {
                    var first = new Date();
                    var last = new Date();
                    if (recordset && recordset.length > 0) {
                        var row = recordset[0];
                        first = row['MinDate'];
                        last = row['MaxDate'];
                    }
                    fulfil({
                        'First': first,
                        'Last': last
                    });
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

function UserLogin(userLogin, password, userId) {
    if (typeof userId === 'undefined' || userId == null)
        userId = 0;
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            if (userId <= 0 && (password == null || password.length === 0)) {
                reject('user not found');
                return;
            }
            var qs = 'Select u.[USER_ID], u.[USER_FIRST_NAME], u.[USER_LAST_NAME], s.SCHOOL_ID, s.SCHOOL_NAME, s.CLUB_STATUS, ' +
                '   s.SYMBOL As SCHOOL_SYMBOL, [USER_TYPE], [USER_PERMISSIONS], u.REGION_ID, r.REGION_NAME, ' +
                '   rc.REGION_ID As CoordinatedRegionId, rc.REGION_NAME As CoordinatedRegionName, ' +
                '   IsNull(u.CITY_ID, s.CITY_ID) As CITY_ID, c.CITY_NAME, u.[USER_LOGIN] ' +
                'From USERS u Left Join SCHOOLS s On u.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                '   Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                '   Left Join REGIONS r On u.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                '   Left Join REGIONS rc On rc.COORDINATOR=u.[USER_ID] And rc.DATE_DELETED Is Null ' +
                'Where u.[DATE_DELETED] Is Null ';
            if (userId > 0) {
                qs += 'And u.[USER_ID]=@id';
            } else {
                qs += 'And Lower(u.[USER_LOGIN])=@user And u.[USER_PASSWORD]=@password';
            }
            var request = connection.request();
            if (userLogin) {
                request.input('user', userLogin.toLowerCase());
                request.input('password', utils.SportsmanEncode(password));
            }
            request.input('id', userId);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading user data: ' + (err.message || err));
                    connection.close();
                    reject('ERROR: error while reading');
                    return;
                }
                if (recordset && recordset.length > 0) {
                    connection.close();
                    var row = recordset[0];
                    var displayName = row['USER_FIRST_NAME'];
                    var lastName = (row['USER_LAST_NAME'] || '') + '';
                    if (lastName.length > 0)
                        displayName += ' ' + lastName;
                    var schoolName = row['SCHOOL_NAME'];
                    var school = (schoolName == null || schoolName.length == 0) ? null :
                        {
                            'Name': schoolName,
                            'Symbol': row['SCHOOL_SYMBOL'],
                            'Id': row['SCHOOL_ID'],
                            'IsClub': row['CLUB_STATUS'] == 1
                        };
                    var isAdmin = row['USER_TYPE'] == 1;
                    var coordinatedRegionId = row['CoordinatedRegionId'];
                    var coordinatedRegion = null;
                    if (coordinatedRegionId != null) {
                        coordinatedRegion = {
                            Id: coordinatedRegionId,
                            Name: row['CoordinatedRegionName']
                        };
                    }
                    fulfil({
                        Id: row['USER_ID'],
                        Name: displayName,
                        School: school,
                        Admin: isAdmin,
                        Type: row['USER_TYPE'],
                        Permissions: row['USER_PERMISSIONS'],
                        RegionId: row['REGION_ID'],
                        RegionName: row['REGION_NAME'],
                        CityId: row['CITY_ID'],
                        CityName: row['CITY_NAME'],
                        CoordinatedRegion: coordinatedRegion,
                        UserLogin: row['USER_LOGIN']
                    });
                } else {
                    qs = "Insert Into FailedUserLogins (Id, [Source], Username, UserPassword) " +
                        "(" +
                        "	Select IsNull(Max(Id), 0)+1, 2, @user, @password From FailedUserLogins" +
                        ")";
                    request = connection.request();
                    request.input('user', userLogin);
                    request.input('password', utils.SportsmanEncode(password));
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error inserting into failed user logins: ' + (err.message || err));
                        }
                        connection.close();
                        reject('user not found');
                    });
                }
            });
        }, function(err) {
            reject('ERROR: ' + err);
        });
    });
}

function GetSchoolTeams(schoolSymbol) {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            var qs = 'Select t.TEAM_ID, t.CHAMPIONSHIP_ID, t.CHAMPIONSHIP_CATEGORY_ID, t.[STATUS], t.REGISTRATION_DATE, ' +
                '   t.TEAM_INDEX, s.SPORT_ID, s.SPORT_NAME, c.CHAMPIONSHIP_NAME, c.CHAMPIONSHIP_STATUS, cm.CATEGORY_NAME, 0 As [IsPending] ' +
                'From TEAMS t Inner Join CHAMPIONSHIPS c On t.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                '   Left Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
                'Where t.SCHOOL_ID=(Select SCHOOL_ID From SCHOOLS Where SYMBOL=@symbol And DATE_DELETED Is Null) And t.DATE_DELETED Is Null ' +
                '   And c.DATE_DELETED Is Null ' +
                '   And c.SEASON=(Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where [STATUS]=1)) From SEASONS Where [STATUS]=1 And [START_DATE]<=GetDate()) ' +
                'Union All ' +
                'Select pt.PENDING_TEAM_ID As TEAM_ID, c.CHAMPIONSHIP_ID, cc.CHAMPIONSHIP_CATEGORY_ID, 0 As [STATUS], Null As REGISTRATION_DATE, ' +
                '   Null As TEAM_INDEX, s.SPORT_ID, s.SPORT_NAME, c.CHAMPIONSHIP_NAME, c.CHAMPIONSHIP_STATUS, cm.CATEGORY_NAME, 1 As [IsPending] ' +
                'From PENDING_TEAMS pt Inner Join CHAMPIONSHIP_CATEGORIES cc On pt.CHAMP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
                '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                '   Left Join SPORTS s On c.SPORT_ID=s.SPORT_ID ' +
                'Where pt.SCHOOL_ID=(Select SCHOOL_ID From SCHOOLS Where SYMBOL=@symbol And DATE_DELETED Is Null) And pt.DATE_DELETED Is Null ' +
                '   And c.DATE_DELETED Is Null ' +
                '   And c.SEASON=(Select IsNull(Max(SEASON), (Select Max(SEASON) From SEASONS Where [STATUS]=1)) From SEASONS Where [STATUS]=1 And [START_DATE]<=GetDate())';
            var request = connection.request();
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading school ' + schoolSymbol + ' teams: ' + (err.message || err));
                    reject('error while reading');
                } else {
                    if (recordset.length > 0) {
                        var teams = [];
                        var teamIDs = [];
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var team = {};
                            data.copyRecord(row, team);
                            team.Players = [];
                            if (team.IsPending == 0)
                                teamIDs.push(team.TEAM_ID);
                            teams.push(team);
                        }
                        if (teamIDs.length > 0) {
                            var allIDs = teamIDs.join(', ');
                            var qs = 'Select p.TEAM_ID, p.STUDENT_ID, p.PLAYER_ID, s.FIRST_NAME, s.LAST_NAME, s.GRADE, s.SEX_TYPE, s.BIRTH_DATE, s.ID_NUMBER, ' +
                                '   p.[STATUS], p.REGISTRATION_DATE, IsNull(p.REMARKS, \'\') As RejectReason, 0 As [IsPending] ' +
                                'From PLAYERS p Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID ' +
                                'Where p.TEAM_ID In (' + allIDs + ') ' +
                                '   And p.DATE_DELETED Is Null ' +
                                'Union All ' +
                                'Select p.TEAM_ID, p.STUDENT_ID, p.PENDING_PLAYER_ID As PLAYER_ID, s.FIRST_NAME, s.LAST_NAME, s.GRADE, s.SEX_TYPE, s.BIRTH_DATE, s.ID_NUMBER, ' +
                                '   1 As [STATUS], Null As REGISTRATION_DATE, \'\' As RejectReason, 1 As [IsPending] ' +
                                'From PENDING_PLAYERS p Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID ' +
                                'Where p.TEAM_ID In (' + allIDs + ') ' +
                                '   And p.DATE_DELETED Is Null';
                            var request = connection.request();
                            request.query(qs, function (err, recordset) {
                                if (err) {
                                    logger.error('Error reading players for school ' + schoolSymbol + ' teams: ' + (err.message || err));
                                    fulfil(teams);
                                } else {
                                    var playerMapping = {};
                                    for (var i = 0; i < recordset.length; i++) {
                                        var row = recordset[i];
                                        var player = {};
                                        data.copyRecord(row, player);
                                        var key = player.TEAM_ID.toString();
                                        if (!playerMapping[key])
                                            playerMapping[key] = [];
                                        playerMapping[key].push(player);
                                    }
                                    for (var i = 0; i < teams.length; i++) {
                                        var curTeam = teams[i];
                                        if (curTeam.IsPending == 0) {
                                            var curPlayers = playerMapping[curTeam.TEAM_ID.toString()] || [];
                                            if (curPlayers.length > 0)
                                                curTeam.Players = curPlayers;
                                        }
                                    }
                                    fulfil(teams);
                                }
                            });
                        } else {
                            fulfil(teams);
                        }
                    } else {
                        fulfil([]);
                    }

                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

function GetSchoolForStudent(user, connection, submittedSchool) {
    return new Promise(function (fulfil, reject) {
        if (user.role == 1) {
            fulfil(submittedSchool);
        } else {
            var userId = user.seq - settings.Sportsman.UserOffset;
            var qs = 'Select SCHOOL_ID ' +
                'From USERS ' +
                'Where DATE_DELETED Is Null And USER_ID=@user';
            var request = connection.request();
            request.input('user', userId);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error getting school  of user ' + userId + ': ' + (err.message || err));
                    reject('error');
                }
                else {
                    if (recordset == null || recordset.length == 0) {
                        logger.log('verbose', 'User ' + userId + '  does not exist.');
                        reject('no user');
                    } else {
                        var row = recordset[0];
                        fulfil(row['SCHOOL_ID']);
                    }
                }
            });
        }
    });
}

function VerifyUserTeam(user, connection, teamID, actionDescription, denyApproved) {
    return new Promise(function (fulfil, reject) {
        if (user.role == 1) {
            var qs = 'Select SCHOOL_ID From TEAMS Where TEAM_ID=@team';
            var request = connection.request();
            request.input('team', teamID);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading school from team ' + teamID + ': ' + (err.message || err));
                    fulfil('OK');
                } else {
                    var schoolID = (recordset == null || recordset.length == 0) ? 0 : recordset[0]['SCHOOL_ID'];
                    fulfil({'School': schoolID});
                }
            });
        } else {
            var userId = user.seq - settings.Sportsman.UserOffset;
            var qs = 'Select t.[STATUS], u.SCHOOL_ID ' +
                'From TEAMS t Inner Join USERS u On t.SCHOOL_ID=u.SCHOOL_ID ' +
                '   Inner Join SCHOOLS s On u.SCHOOL_ID=s.SCHOOL_ID ' +
                'Where t.DATE_DELETED Is Null And u.DATE_DELETED Is Null And s.DATE_DELETED Is Null ' +
                '   And u.USER_ID=@user And t.TEAM_ID=@team';
            var request = connection.request();
            request.input('team', teamID);
            request.input('user', userId);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error verifying team ' + teamID + ' for user ' + userId + ': ' + (err.message || err));
                    reject('error');
                }
                else {
                    if (recordset == null || recordset.length == 0) {
                        logger.log('verbose', 'User ' + userId + ' trying to ' + actionDescription + ' team ' + teamID + ', which does not exist or is not theirs.');
                        reject('no team');
                    } else {
                        var row = recordset[0];
                        var schoolID = row['SCHOOL_ID'];
                        if (denyApproved) {
                            var teamStatus = row['STATUS'];
                            if (teamStatus == 2) {
                                logger.log('verbose', 'User ' + userId + ' trying to ' + actionDescription + ' team ' + teamID + ', which is approved.');
                                reject('team approved');
                            } else {
                                fulfil({'School': schoolID});
                            }
                        } else {
                            fulfil({'School': schoolID});
                        }
                    }
                }
            });
        }
    });
}

function VerifyUserMatch(user, connection, matchData) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select team_A.SCHOOL_ID As School_A, team_B.SCHOOL_ID As School_B, cm.TEAM_A_SCORE, cm.TEAM_B_SCORE, cm.[RESULT], cm.[PARTS_RESULT] ' +
            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID ' +
            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt_A On cm.CHAMPIONSHIP_CATEGORY_ID=cgt_A.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt_A.PHASE And cm.NGROUP=cgt_A.NGROUP And cm.TEAM_A=cgt_A.POSITION ' +
            '   Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt_B On cm.CHAMPIONSHIP_CATEGORY_ID=cgt_B.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt_B.PHASE And cm.NGROUP=cgt_B.NGROUP And cm.TEAM_B=cgt_B.POSITION ' +
            '   Inner Join TEAMS team_A On cgt_A.TEAM_ID=team_A.TEAM_ID ' +
            '   Inner Join TEAMS team_B On cgt_B.TEAM_ID=team_B.TEAM_ID ' +
            'Where cm.DATE_DELETED Is Null And cc.DATE_DELETED Is Null And cgt_A.DATE_DELETED Is Null And cgt_B.DATE_DELETED Is Null ' +
            '   And team_A.DATE_DELETED Is Null And team_B.DATE_DELETED Is Null ' +
            '   And cm.CHAMPIONSHIP_CATEGORY_ID=@category And cm.PHASE=@phase And cm.NGROUP=@group And cm.[ROUND]=@round And cm.CYCLE=@cycle And cm.MATCH=@match';
        var request = connection.request();
        request.input('category', matchData.CHAMPIONSHIP_CATEGORY_ID);
        request.input('phase', matchData.PHASE);
        request.input('group', matchData.NGROUP);
        request.input('round', matchData.ROUND);
        request.input('cycle', matchData.CYCLE);
        request.input('match', matchData.MATCH);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error verifying user match for user ' + user.seq + ': ' + (err.message || err));
                reject('error');
            } else {
                if (recordset == null || recordset.length == 0) {
                    reject('no match');
                } else {
                    var row = recordset[0];
                    var originalScore = {
                        OriginalScore_A: row['TEAM_A_SCORE'],
                        OriginalScore_B: row['TEAM_B_SCORE'],
                        OriginalResult: row['RESULT'],
                        OriginalPartResult: row['PARTS_RESULT']
                    };
                    if (user.role == 1) {
                        fulfil(originalScore);
                    } else {
                        var userSchool = user.schoolID;
                        if (userSchool == null || !userSchool) {
                            reject('no school');
                        } else {
                            var school_A = row['School_A'];
                            var school_B = row['School_B'];
                            if (userSchool == school_A || userSchool == school_B) {
                                fulfil(originalScore);
                            } else {
                                logger.log('verbose', 'User ' + user.seq + ' trying to access match in ' + matchData.CHAMPIONSHIP_CATEGORY_ID + ', which does not contain their team.');
                                reject('Unauthorized');
                            }
                        }
                    }
                }
            }
        });
    });
}

function GetStudentData(connection, idNumber) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select st.STUDENT_ID, st.ID_NUMBER, st.FIRST_NAME, st.LAST_NAME, st.GRADE, st.BIRTH_DATE, sc.SCHOOL_NAME, sc.SYMBOL ' +
            'From STUDENTS st Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID ' +
            'Where st.DATE_DELETED Is Null And sc.DATE_DELETED Is Null And st.ID_NUMBER=@id';
        var request = connection.request();
        request.input('id', idNumber);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading student data: ' + (err.message || err));
                reject('ERROR');
            }
            else {
                var student = {};
                if (recordset.length > 0) {
                    var row = recordset[0];
                    data.copyRecord(row, student)
                }
                fulfil(student);
            }
        });
    });
}

function GetPlayerTeam(connection, playerID) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select TEAM_ID ' +
            'From PLAYERS ' +
            'Where DATE_DELETED Is Null And [STATUS]=1 And PLAYER_ID=@player';
        var request = connection.request();
        request.input('player', playerID);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error getting player ' + playerID + ' team: ' + (err.message || err));
                reject('error');
            }
            else {
                if (recordset == null || recordset.length == 0) {
                    logger.log('verbose', 'Player ' + playerID + ' does not exist or is approved.');
                    reject('no player');
                } else {
                    var teamID = recordset[0]['TEAM_ID'];
                    fulfil(teamID);
                }
            }
        });
    });
}

function GetSchoolDetails(schoolSymbol) {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            var qs = 'Select Distinct s.SCHOOL_ID, s.SCHOOL_NAME, s.CLUB_STATUS, s.[ADDRESS], s.[EMAIL], s.[FAX], s.MAIL_ADDRESS, ' +
                '   s.MANAGER_NAME, s.MANAGER_CELL_PHONE, c.CITY_NAME, r.REGION_NAME ' +
                'From SCHOOLS s Left Join REGIONS r On s.REGION_ID=r.REGION_ID ' +
                '   Left Join CITIES c On s.CITY_ID=c.CITY_ID ' +
                'Where s.SYMBOL=@symbol And s.DATE_DELETED Is Null';
            var request = connection.request();
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading school ' + schoolSymbol + ' details: ' + (err.message || err));
                    reject('error while reading');
                }
                else {
                    var schoolDetails = {};
                    if (recordset && recordset.length > 0) {
                        var row = recordset[0];
                        data.copyRecord(row, schoolDetails);
                    }
                    fulfil(schoolDetails);
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}

function GetSchoolPersonnel(schoolSymbol) {
    return new Promise(function (fulfil, reject) {
        CreateConnection().then(function(connection) {
            var qs = 'Select s.SCHOOL_ID, s.SCHOOL_NAME, s.MANAGER_NAME As SCHOOL_MANAGER_NAME, s.PHONE As SCHOOL_PHONE, s.FAX As SCHOOL_FAX, s.EMAIL As SCHOOL_EMAIL, ' +
                '   f3.FUNCTIONARY_ID As CHAIRMAN_ID, f3.FUNCTIONARY_NAME As CHAIRMAN_NAME, f3.[ADDRESS] As CHAIRMAN_ADDRESS, c3.CITY_NAME As CHAIRMAN_CITY_NAME, f3.ZIP_CODE As CHAIRMAN_ZIP_CODE, ' +
                '   f3.PHONE As CHAIRMAN_PHONE, f3.FAX As CHAIRMAN_FAX, f3.CELL_PHONE As CHAIRMAN_CELL_PHONE, f3.EMAIL As CHAIRMAN_EMAIL, ' +
                '   f1.FUNCTIONARY_ID As COORDINATOR_ID, f1.FUNCTIONARY_NAME As COORDINATOR_NAME, f1.[ADDRESS] As COORDINATOR_ADDRESS, c1.CITY_NAME As COORDINATOR_CITY_NAME, f1.ZIP_CODE As COORDINATOR_ZIP_CODE, ' +
                '   f1.PHONE As COORDINATOR_PHONE, f1.FAX As COORDINATOR_FAX, f1.CELL_PHONE As COORDINATOR_CELL_PHONE, f1.EMAIL As COORDINATOR_EMAIL ' +
                'From SCHOOLS s Left Join FUNCTIONARIES f3 On s.SCHOOL_ID=f3.SCHOOL_ID And f3.FUNCTIONARY_TYPE=3 And f3.DATE_DELETED Is Null ' +
                '   Left Join CITIES c3 On f3.CITY_ID=c3.CITY_ID And c3.DATE_DELETED Is Null ' +
                '   Left Join FUNCTIONARIES f1 On s.SCHOOL_ID=f1.SCHOOL_ID And f1.FUNCTIONARY_TYPE=1 And f1.DATE_DELETED Is Null ' +
                '   Left Join CITIES c1 On f1.CITY_ID=c1.CITY_ID And c1.DATE_DELETED Is Null ' +
                'Where s.DATE_DELETED Is Null And s.SYMBOL=@symbol';
            var request = connection.request();
            request.input('symbol', schoolSymbol);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading school ' + schoolSymbol + ' personnel: ' + (err.message || err));
                    reject('error while reading');
                }
                else {
                    var schoolPersonnel = {};
                    if (recordset && recordset.length > 0) {
                        for (var i = 0; i < recordset.length; i++) {
                            var row = {};
                            data.copyRecord(recordset[i], row);
                            for (var fieldName in row) {
                                var currentValue = row[fieldName];
                                if (currentValue != null || schoolPersonnel[fieldName] == null)
                                    schoolPersonnel[fieldName] = currentValue;
                            }
                        }
                    }
                    fulfil(schoolPersonnel);
                }
            });
        }, function(err) {
            reject(err);
        });
    });
}


function CanDeleteStudent(connection, user, idNumber) {
    return new Promise(function (fulfil, reject) {
        if (user.role == 1) {
            fulfil(true);
        } else {
            var schoolSymbol = user.schoolSymbol;
            if (schoolSymbol) {
                var qs = 'Select * From StudentsAddedBySchools ' +
                    'Where SCHOOL_SYMBOL=@symbol And STUDENT_ID_NUMBER=@id_number';
                var request = connection.request();
                request.input('symbol', schoolSymbol);
                request.input('id_number', idNumber);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading from students audit table: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        var gotRows = recordset != null && recordset.length > 0;
                        fulfil(gotRows);
                    }
                });
            } else {
                fulfil(false);
            }
        }
    });
}

function UpdateMatchesTable(user, transaction, matchData) {
    function GetMatchResult() {
        if (matchData.RESULT != null && matchData.RESULT >= 3)
            return matchData.RESULT;
        var score_A = matchData.OVERRIDEN_TEAM_A_SCORE;
        var score_B = matchData.OVERRIDEN_TEAM_B_SCORE;
        if (score_A == null || score_B == null)
            return null;
        if (score_A == score_B)
            return 0;
        if (score_A > score_B)
            return 1;
        return 2;
    }
    return new Promise(function (fulfil, reject) {
        if (user.role == 1) {
            var matchResult = GetMatchResult();
            var qs = 'Update CHAMPIONSHIP_MATCHES ' +
                'Set TEAM_A_SCORE=@score_a, TEAM_B_SCORE=@score_b, [RESULT]=@result, [PARTS_RESULT]=@part_result ' +
                'Where DATE_DELETED Is Null And CHAMPIONSHIP_CATEGORY_ID=@category And PHASE=@phase And NGROUP=@group ' +
                '   And [ROUND]=@round And CYCLE=@cycle And MATCH=@match';
            var request = transaction.request();
            request.input('score_a', matchData.OVERRIDEN_TEAM_A_SCORE);
            request.input('score_b', matchData.OVERRIDEN_TEAM_B_SCORE);
            request.input('result', matchResult);
            request.input('part_result', matchData.OVERRIDEN_PARTS_RESULT);
            request.input('category', matchData.CHAMPIONSHIP_CATEGORY_ID);
            request.input('phase', matchData.PHASE);
            request.input('group', matchData.NGROUP);
            request.input('round', matchData.ROUND);
            request.input('cycle', matchData.CYCLE);
            request.input('match', matchData.MATCH);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error updating matches table: ' + (err.message || err));
                    transaction.rollback();
                    reject('error updating matches');
                } else {
                    fulfil('OK');
                }
            });
        } else {
            fulfil('not admin');
        }
    });
}

function GetCurrentSeason(connection, title) {
    return new Promise(function (fulfil, reject) {
        if (typeof title === 'undefined')
            title = '';
        var qs = 'Select Max(SeasonCode) As CurrentSeason ' +
            'From Seasons ' +
            'Where IsCurrent=1';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading current season: ' + (err.message || err));
                reject('ERROR');
            } else {
                if (recordset == null || recordset.length === 0) {
                    if (title)
                        logger.error('Trying to read ' + title + ' but no current season');
                    reject('No current season');
                } else {
                    fulfil(recordset[0]['CurrentSeason']);
                }
            }
        });
    });
}

module.exports.CreateConnection = CreateConnection;
module.exports.Login = UserLogin;
module.exports.GetSchoolForStudent = GetSchoolForStudent;
module.exports.GetStudentData = GetStudentData;
module.exports.GetCurrentSeason = GetCurrentSeason;
module.exports.Seasons = {
    GetMapping: GetSeasonMapping
};
module.exports.Events = {
    GetRange: GetEventsRange

};
module.exports.Championship = {
    SchoolTeams: GetSchoolTeams,
    PlayerTeam: GetPlayerTeam,
    UpdateMatchesTable: UpdateMatchesTable
};
module.exports.School = {
    Details: GetSchoolDetails,
    Personnel: GetSchoolPersonnel
};
module.exports.Verify = {
    UserTeam: VerifyUserTeam,
    UserMatch: VerifyUserMatch,
    CanDeleteStudent: CanDeleteStudent
};