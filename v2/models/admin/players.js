var Season = require('../season');

function Players(db) {
    this.db = db;
}

Players.prototype.list = function (season, options, callback) {
    var self = this;
    var activeSeason = Season.active();
    this.db.connect()
        .then(
            function (connection) {
                //console.log('region: ' + options.region + ', clubs? ' + options.clubs + ', league? ' + options.league);
                var qs = "Select " + (options.numOfRows ? "top " + options.numOfRows : "" ) + " pr.[Student], " +
                    "   pr.[Approved], " +
                    "   sc.SCHOOL_ID, " +
                    "   sc.SYMBOL, " +
                    "   sc.SCHOOL_NAME, " +
                    "   dbo.BuildTeamName(sc.SCHOOL_NAME, ci.CITY_NAME, t.TEAM_INDEX, DEFAULT, DEFAULT) As TeamFullName, " +
                    "   st.FIRST_NAME, " +
                    "   st.LAST_NAME, " +
                    "   st.BIRTH_DATE, " +
                    "   st.ID_NUMBER, " +
                    "   st.GRADE as \"Grade\", " +
                    "   st.SEX_TYPE as \"Gender\", " +
                    "   tr.Id as \"TeamId\", " +
                    "   tr.Team as \"TeamTeam\", " +
                    "   dbo.GetTeamNumber(t.TEAM_INDEX, tr.TeamNumber) as \"TeamNumber\", " +
                    "   r.REGION_NAME, " +
                    "   c.CHAMPIONSHIP_NAME, " +
                    "   cc.CHAMPIONSHIP_CATEGORY_ID, " +
                    "   cc.CATEGORY, " +
                    "   cm.CATEGORY_NAME, " +
                    "   c.REGION_ID, " +
                    "   c.SPORT_ID, " +
                    "   cc.MAX_STUDENT_BIRTHDAY, " +
                    "   sp.SPORT_NAME, " +
                    "   p.PLAYER_ID as \"Player\", p.STATUS as \"PlayerStatus\", " +
                    "   pr.CreatedAt as \"CreatedAt\", " +
                    "   sdp.[DeletedAt] as \"DeletedAt\" " +
                    "From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.[Team]=tr.Id " +
                    "   Inner Join SCHOOLS sc On tr.[School]=sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
                    "   Inner Join STUDENTS st On pr.[Student]=st.STUDENT_ID And st.DATE_DELETED Is Null " +
                    "   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                    "   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null " +
                    "   Left Outer Join TEAMS t On tr.[Team]=t.TEAM_ID And t.DATE_DELETED Is Null " +
                    "   Left Outer Join PLAYERS as p On tr.Team = p.TEAM_ID and pr.Student = p.STUDENT_ID and p.DATE_DELETED IS NULL " +
                    "   Left Join SchoolDeletedPlayers sdp On tr.Team=sdp.Team and p.PLAYER_ID=sdp.Player " +
                    "   Left Join CATEGORY_MAPPING cm On cc.[CATEGORY]=cm.RAW_CATEGORY " +
                    "   Left Join CITIES ci On sc.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null " +
                    "where c.SEASON = @season and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL " +
                    (options.region ? " and c.REGION_ID = @region" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE= 1" : "") +
                    (options.competition ? " and cc.CHAMPIONSHIP_CATEGORY_ID = @competition" : "") +
                    (options.championship ? " and c.CHAMPIONSHIP_ID = @championship" : "") +
                    (options.sport ? " and c.SPORT_ID = @sport" : "") +
                    " union all " +
                    "Select " + (options.numOfRows ? "top " + options.numOfRows : "" ) + " p.STUDENT_ID as \"Student\", " +
                    "   null as \"Approved\", " +
                    "   sc.SCHOOL_ID, " +
                    "   sc.SYMBOL, " +
                    "   sc.SCHOOL_NAME, " +
                    "   dbo.BuildTeamName(sc.SCHOOL_NAME, ci.CITY_NAME, t.TEAM_INDEX, DEFAULT, DEFAULT) As TeamFullName, " +
                    "   st.FIRST_NAME, " +
                    "   st.LAST_NAME, " +
                    "   st.BIRTH_DATE, " +
                    "   st.ID_NUMBER, " +
                    "   st.GRADE as \"Grade\", " +
                    "   st.SEX_TYPE as \"Gender\", " +
                    "   tr.Id as \"TeamId\", t.TEAM_ID as \"TeamTeam\", " +
                    "   dbo.GetTeamNumber(t.TEAM_INDEX, tr.TeamNumber) as \"TeamNumber\", " +
                    "   r.REGION_NAME, " +
                    "   c.CHAMPIONSHIP_NAME, " +
                    "   cc.CHAMPIONSHIP_CATEGORY_ID, " +
                    "   cc.CATEGORY, " +
                    "   cm.CATEGORY_NAME, " +
                    "   c.REGION_ID, " +
                    "   c.SPORT_ID, " +
                    "   cc.MAX_STUDENT_BIRTHDAY, " +
                    "   sp.SPORT_NAME, " +
                    "   p.PLAYER_ID as \"Player\", p.STATUS as \"PlayerStatus\", " +
                    "   pr.CreatedAt as \"CreatedAt\", " +
                    "   sdp.[DeletedAt] as \"DeletedAt\" " +
                    "From PLAYERS as p " +
                    "   Inner Join TEAMS as t on p.TEAM_ID = t.TEAM_ID And t.DATE_DELETED Is Null " +
                    "   Inner Join SCHOOLS sc On t.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
                    "   Inner Join STUDENTS st On p.STUDENT_ID=st.STUDENT_ID And st.DATE_DELETED Is Null " +
                    "   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                    "   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID " +
                    "   Left Join SchoolDeletedPlayers sdp On p.PLAYER_ID=sdp.Player And sc.SCHOOL_ID=sdp.School " +
                    "   Left Outer Join TeamRegistrations tr On tr.[Team]=t.TEAM_ID and tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID " +
                    "   Left Outer Join PlayerRegistrations as pr on pr.Team = tr.Id and pr.Student = st.STUDENT_ID " +
                    "   Left Join CATEGORY_MAPPING cm On cc.[CATEGORY]=cm.RAW_CATEGORY " +
                    "   Left Join CITIES ci On sc.CITY_ID=ci.CITY_ID " +
                    "where p.DATE_DELETED Is Null and pr.Team is null and c.SEASON = @season and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL " +
                    (options.region ? " and sc.REGION_ID = @region" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE= 1" : "") +
                    (options.competition ? " and cc.CHAMPIONSHIP_CATEGORY_ID = @competition" : "") +
                    (options.championship ? " and c.CHAMPIONSHIP_ID = @championship" : "") +
                    (options.sport ? " and c.SPORT_ID = @sport" : "");
                var queryParameters = {
                    season: season,
                    region: options.region,
                    competition: options.competition,
                    championship: options.championship,
                    sport: options.sport
                };
                connection.request(qs, queryParameters).then(function (records) {
                    connection.complete();
                    var result = [];
                    var currentSeason = season;
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var player = {
                            id: record.Student,
                            approved: record['Approved'],
                            player: record.Player,
                            playerStatus: record.PlayerStatus,
                            createdAt: record.CreatedAt,
                            deletedAt: record.DeletedAt,
                            maxStudentAge: record['MAX_STUDENT_BIRTHDAY'],
                            student: {
                                firstName: record['FIRST_NAME'],
                                lastName: record['LAST_NAME'],
                                birthDate: record['BIRTH_DATE'],
                                idNumber: record['ID_NUMBER'],
                                grade: record.Grade == null ? null : (season - parseInt(record.Grade)),
                                gender: record.Gender
                            },
                            team: {
                                id: record.TeamId,
                                name: record.TeamFullName,
                                team: record.TeamTeam,
                                number: record.TeamNumber
                            },
                            school: {
                                id: record['SCHOOL_ID'],
                                name: record['SCHOOL_NAME'],
                                symbol: record['SYMBOL']
                            },
                            championship: {
                                name: record['CHAMPIONSHIP_NAME'] + ' ' + record['CATEGORY_NAME'],
                                region: {
                                    id: record['REGION_ID'],
                                    name: record['REGION_NAME']
                                },
                                sport: {
                                    id: record['SPORT_ID'],
                                    name: record['SPORT_NAME']
                                },
                                category: {
                                    id: record['CHAMPIONSHIP_CATEGORY_ID'],
                                    category: record['CATEGORY'],
                                    name: record['CATEGORY_NAME']
                                }
                            }
                        };
                        result.push(player);
                    }

                    callback(null, result);
                }, function (err) {
                    connection.complete();
                    callback(err);

                });
            },
            function (err) {
                callback(err);
            }
        );
};

Players.prototype.listTeamPlayers = function (season, options, callback) {
    var self = this;
    var activeSeason = Season.active();
    this.db.connect()
        .then(
            function (connection) {
                //console.log('region: ' + options.region + ', clubs? ' + options.clubs + ', league? ' + options.league);
                var qs = "Select " + (options.numOfRows ? "top " + options.numOfRows : "" ) + " pr.[Student], " +
                    "   pr.[Approved], " +
                    "   sc.SCHOOL_ID, " +
                    "   sc.SYMBOL, " +
                    "   sc.SCHOOL_NAME, " +
                    "   dbo.BuildTeamName(sc.SCHOOL_NAME, ci.CITY_NAME, t.TEAM_INDEX, DEFAULT, DEFAULT) As TeamFullName, " +
                    "   st.FIRST_NAME, " +
                    "   st.LAST_NAME, " +
                    "   st.BIRTH_DATE, " +
                    "   st.ID_NUMBER, " +
                    "   st.GRADE as \"Grade\", " +
                    "   st.SEX_TYPE as \"Gender\", " +
                    "   tr.Id as \"TeamId\", " +
                    "   tr.Team as \"TeamTeam\", " +
                    "   dbo.GetTeamNumber(t.TEAM_INDEX, tr.TeamNumber) as \"TeamNumber\", " +
                    "   r.REGION_NAME, " +
                    "   c.CHAMPIONSHIP_NAME, " +
                    "   cc.CHAMPIONSHIP_CATEGORY_ID, " +
                    "   cc.CATEGORY, " +
                    "   cm.CATEGORY_NAME, " +
                    "   c.REGION_ID, " +
                    "   c.SPORT_ID, " +
                    "   cc.MAX_STUDENT_BIRTHDAY, " +
                    "   sp.SPORT_NAME, " +
                    "   p.PLAYER_ID as \"Player\", p.STATUS as \"PlayerStatus\", " +
                    "   pr.CreatedAt as \"CreatedAt\", " +
                    "   sdp.[DeletedAt] as \"DeletedAt\" " +
                    "From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.[Team]=tr.Id " +
                    "   Inner Join SCHOOLS sc On tr.[School]=sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
                    "   Inner Join STUDENTS st On pr.[Student]=st.STUDENT_ID And st.DATE_DELETED Is Null " +
                    "   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                    "   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null " +
                    "   Left Outer Join TEAMS t On tr.[Team]=t.TEAM_ID And t.DATE_DELETED Is Null " +
                    "   Left Outer Join PLAYERS as p On tr.Team = p.TEAM_ID and pr.Student = p.STUDENT_ID and p.DATE_DELETED IS NULL " +
                    "   Left Join SchoolDeletedPlayers sdp On tr.Team=sdp.Team and p.PLAYER_ID=sdp.Player " +
                    "   Left Join CATEGORY_MAPPING cm On cc.[CATEGORY]=cm.RAW_CATEGORY " +
                    "   Left Join CITIES ci On sc.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null " +
                    "where c.SEASON = @season and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL " +
                    (options.school ? " and sc.SCHOOL_ID = @school" : "") +
                    (options.region ? " and c.REGION_ID = @region" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE= 1" : "") +
                    (options.competition ? " and cc.CHAMPIONSHIP_CATEGORY_ID = @competition" : "") +
                    (options.championship ? " and c.CHAMPIONSHIP_ID = @championship" : "") +
                    (options.sport ? " and c.SPORT_ID = @sport" : "");
                var queryParameters = {
                    season: season,
                    region: options.region,
                    competition: options.competition,
                    championship: options.championship,
                    sport: options.sport,
                    school: options.school
                };
                connection.request(qs, queryParameters).then(function (records) {
                    connection.complete();
                    var result = [];
                    var currentSeason = season;
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        var player = {
                            id: record.Student,
                            approved: record['Approved'],
                            player: record.Player,
                            playerStatus: record.PlayerStatus,
                            createdAt: record.CreatedAt,
                            deletedAt: record.DeletedAt,
                            maxStudentAge: record['MAX_STUDENT_BIRTHDAY'],
                            student: {
                                firstName: record['FIRST_NAME'],
                                lastName: record['LAST_NAME'],
                                birthDate: record['BIRTH_DATE'],
                                idNumber: record['ID_NUMBER'],
                                grade: record.Grade == null ? null : (season - parseInt(record.Grade)),
                                gender: record.Gender
                            },
                            team: {
                                id: record.TeamId,
                                name: record.TeamFullName,
                                team: record.TeamTeam,
                                number: record.TeamNumber
                            },
                            school: {
                                id: record['SCHOOL_ID'],
                                name: record['SCHOOL_NAME'],
                                symbol: record['SYMBOL']
                            },
                            championship: {
                                name: record['CHAMPIONSHIP_NAME'] + ' ' + record['CATEGORY_NAME'],
                                region: {
                                    id: record['REGION_ID'],
                                    name: record['REGION_NAME']
                                },
                                sport: {
                                    id: record['SPORT_ID'],
                                    name: record['SPORT_NAME']
                                },
                                category: {
                                    id: record['CHAMPIONSHIP_CATEGORY_ID'],
                                    category: record['CATEGORY'],
                                    name: record['CATEGORY_NAME']
                                }
                            }
                        };
                        result.push(player);
                    }

                    callback(null, result);
                }, function (err) {
                    connection.complete();
                    callback(err);

                });
            },
            function (err) {
                callback(err);
            }
        );
};

Players.prototype.listTransferRequests = function (season, options, callback) {
    var activeSeason = Season.active();
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select t.Id as \"Team\", t.Competition as \"Competition\", s.SPORT_ID as \"Sport\", t.TeamNumber as \"TeamNumber\", " +
                    "  sr.PrincipalName as \"PrincipalName\", t.TeacherName as \"TeacherName\", t.TeacherPhoneNumber as \"TeacherPhoneNumber\", " +
                    "  t.TeacherEmail as \"TeacherEmail\", " +
                    "  dbo.BuildTeamName(sc.SCHOOL_NAME, ci.CITY_NAME, tea.TEAM_INDEX, DEFAULT, DEFAULT) As TeamFullName, tea.TEAM_ID, " +
                    "  sc.SCHOOL_ID as \"School\", sc.SCHOOL_NAME as \"SchoolName\", sc.Symbol as \"SchoolSymbol\", sc.REGION_ID as \"SchoolRegion\", " +
                    "  tr.IdNumber as \"IdNumber\", st.STUDENT_ID as \"Student\", st.FIRST_NAME as \"FirstName\", st.LAST_NAME as \"LastName\", " +
                    "  st.BIRTH_DATE as \"BirthDate\", st.GRADE as \"Grade\", st.SEX_TYPE as \"Gender\", " +
                    "  cs.SCHOOL_ID as \"CurrentSchool\", cs.SCHOOL_NAME as \"CurrentSchoolName\", cs.SYMBOL as \"CurrentSchoolSymbol\", " +
                    "  cs.REGION_ID as \"CurrentSchoolRegion\", ci.CITY_NAME as \"CityName\", cci.CITY_NAME as \"CurrentCityName\", " +
                    "  c.CHAMPIONSHIP_NAME, cm.CATEGORY_NAME, c.REGION_ID, reg.REGION_NAME, s.SPORT_NAME " +
                    "from TransferRequests as tr " +
                    "  join TeamRegistrations as t on tr.Team = t.Id " +
                    "  join TEAMS tea on t.Team=tea.TEAM_ID And tea.DATE_DELETED Is Null " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on t.Competition = cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.DATE_DELETED IS NULL " +
                    "  join SPORTS as s on s.SPORT_ID = c.SPORT_ID And s.DATE_DELETED Is Null " +
                    "  join REGIONS reg On c.REGION_ID=reg.REGION_ID And reg.DATE_DELETED Is Null " +
                    "  join SchoolRegistrations as sr on tr.School = sr.School And sr.Season=@season " +
                    "  join SCHOOLS as sc on tr.School = sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
                    "  left outer join STUDENTS as st on st.ID_NUMBER = tr.IdNumber And st.DATE_DELETED Is Null " +
                    "  left outer join SCHOOLS as cs on cs.SCHOOL_ID = st.SCHOOL_ID And cs.DATE_DELETED Is Null " +
                    "  left outer join CITIES ci On sc.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null " +
                    "  left outer join CITIES cci On cs.CITY_ID=cci.CITY_ID And cci.DATE_DELETED Is Null " +
                    "  left outer join CATEGORY_MAPPING cm On cc.[CATEGORY]=cm.RAW_CATEGORY " +
                    "where c.SEASON = @season and tr.TransferDate is null " + // Don't query already transferred
                    (options.school ? " and sc.SCHOOL_ID = @school" : "") +
                    (options.region ? " and sc.REGION_ID = @region" : "") +
                    (options.sport ? " and c.SPORT_ID = @sport" : "") +
                    (options.championship ? " and c.CHAMPIONSHIP_ID = @championship" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE= 1" : ""),
                    {season: season, region: options.region, sport: options.sport, championship: options.championship, school: options.school})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];
                            var currentSeason = season; //Season.current();
                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                var student = {
                                    team: record.Team,
                                    sport: record.Sport,
                                    competition: record.Competition,
                                    championship : {
                                        name: record['CHAMPIONSHIP_NAME'],
                                        region: {
                                            id: record['REGION_ID'],
                                            name: record['REGION_NAME']
                                        },
                                        sport: {
                                            id: record['Sport'],
                                            name: record['SPORT_NAME']
                                        },
                                        category: {
                                            name: record['CATEGORY_NAME']
                                        }
                                    },
                                    school: {
                                        id: record.School,
                                        name: record.SchoolName,
                                        symbol: record.SchoolSymbol,
                                        region: record.SchoolRegion,
                                        principal: record.PrincipalName
                                    },
                                    city: record.CityName,
                                    teamNumber: record.TeamNumber,
                                    teamFullName: record.TeamFullName,
                                    teamId: record.TEAM_ID,
                                    teacher: {
                                        name: record.TeacherName,
                                        phoneNumber: record.TeacherPhoneNumber,
                                        email: record.TeacherEmail
                                    },
                                    idNumber: record.IdNumber,
                                    student: record.Student,
                                    firstName: record.FirstName,
                                    lastName: record.LastName,
                                    birthDate: record.BirthDate,
                                    grade: record.Grade == null ? null : (activeSeason - parseInt(record.Grade)),
                                    gender: record.Gender,
                                    currentCity: record.CurrentCityName,
                                    currentSchool:
                                        record.CurrentSchool == null ? null :
                                            {
                                                id: record.CurrentSchool,
                                                name: record.CurrentSchoolName,
                                                symbol: record.CurrentSchoolSymbol,
                                                region: record.CurrentSchoolRegion,
                                                principal: record.CurrentSchoolPrincipal
                                            }
                                };
                                result.push(student);
                            }

                            callback(null, result);
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

function applyNextPlayerStatus(transaction, players, status, updates, callback) {
    if (players.length === 0) {
        callback();
        return;
    }

    var player = players[0];
    players.splice(0, 1);
    if (player.team && player.studentId) {
        // Setting status by team/student ids
        transaction.request(
            "select PLAYER_ID as \"Player\" " +
            "from PLAYERS " +
            "where TEAM_ID = @team and STUDENT_ID = @studentId and DATE_DELETED IS NULL ",
            {team: player.team, studentId: player.studentId})
            .then(function (records) {
                if (records.length > 0) {
                    var record = records[0];
                    // Registration has player in PLAYERS
                    transaction.request(
                        "update PLAYERS set STATUS = @status where PLAYER_ID = @player",
                        {status: status, player: record.Player})
                        .then(
                            function () {
                                applyNextPlayerStatus(transaction, players, status, updates, callback);
                            },
                            function (err) {
                                callback(err);
                            });
                }
                else {
                    transaction.request(
                        "insert into PLAYERS(TEAM_ID, STUDENT_ID, STATUS) " +
                        "values(@team, @studentId, @status) " +
                        "select scope_identity() as \"Player\"",
                        {team: player.team, studentId: player.studentId, status: status})
                        .then(function (records) {
                            if (records.length === 0) {
                                return Promise.reject("Error inserting player")
                            }
                            else {
                                var record = records[0];
                                updates.push({team: player.team, studentId: player.studentId, player: record.Player});
                                return transaction.request(
                                    "update PlayerRegistrations " +
                                    "set Player = @player " +
                                    "where Student = @studentId and Team in (select Id from TeamRegistrations where Team = @team) ",
                                    {team: player.team, studentId: player.studentId, player: record.Player});
                            }
                        })
                        .then(
                            function () {
                                applyNextPlayerStatus(transaction, players, status, updates, callback);
                            },
                            function (err) {
                                callback(err);
                            });
                }
            });
    }
    else {
        transaction.request(
            "update PLAYERS set STATUS = @status where PLAYER_ID = @player",
            {status: status, player: player.player})
            .then(
                function () {
                    applyNextPlayerStatus(transaction, players, status, updates, callback);
                },
                function (err) {
                    callback(err);
                });
    }
}

Players.prototype.setPlayersStatus = function (players, status, callback) {
    // If id and team is given there are ids for PlayerRegistrations
    // If the id/team in PlayerRegistrations doesn't have Player should insert record in PLAYERS
    // If player is given this is an id for PLAYERS
    this.db.connect()
        .then(
            function (connection) {
                connection.transaction()
                    .then(
                        function (transaction) {
                            var updates = [];
                            applyNextPlayerStatus(transaction, players, status, updates, function (err, result) {
                                if (err) {
                                    transaction.rollback();
                                    connection.complete();
                                    callback(err);
                                }
                                else {
                                    transaction.commit()
                                        .then(
                                            function () {
                                                connection.complete();
                                                callback(null, updates);
                                            },
                                            function (err) {
                                                connection.complete();
                                                callback(err);
                                            });
                                }
                            });
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

function approveNextTransfer(transaction, transfers, callback) {
    var transfer = transfers[0];
    transfers.splice(0, 1);
    transaction.request(
        "update STUDENTS " +
        "set SCHOOL_ID = @school " +
        "output DELETED.SCHOOL_ID as \"PreviousSchool\", INSERTED.STUDENT_ID as \"Student\" " +
        "where ID_NUMBER = @idNumber And DATE_DELETED Is Null",
        transfer)
        .then(
            function (records) {
                if (records.length === 0) {
                    return Promise.reject("Student not found");
                }
                else if (records.length > 1) {
                    return Promise.reject("Multiple students found");
                }
                else {
                    transfer.student = records[0].Student;
                    transfer.previousSchool = records[0].PreviousSchool;
                    transfer.transferDate = new Date();
                    return transaction.request(
                        "update TransferRequests " +
                        "set PreviousSchool = @previousSchool, " +
                        "  TransferDate = @transferDate " +
                        "output INSERTED.Team as \"Team\" " +
                        "where School = @school and IdNumber = @idNumber and Team = @team",
                        transfer);
                }
            })
        .then(
            function (records) {
                if (records.length === 0) {
                    return Promise.reject("Transfer not found");
                }
                else if (records.length > 1) {
                    return Promise.reject("Multiple transfers found");
                }
                else {
                    return transaction.request(
                        "insert into PlayerRegistrations(Team, Student) " +
                        "values(@team, @student)",
                        transfer);
                }
            })
        .then(
            function () {
                if (transfers.length > 0) {
                    approveNextTransfer(transaction, transfers, callback);
                }
                else {
                    callback();
                }
            },
            function (err) {
                callback(err);
            });
}

Players.prototype.approveTransferRequests = function (transfers, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.transaction()
                    .then(
                        function (transaction) {
                            approveNextTransfer(transaction, transfers, function (err) {
                                if (err) {
                                    transaction.rollback();
                                    connection.complete();
                                    callback(err);
                                }
                                else {
                                    transaction.commit()
                                        .then(
                                            function () {
                                                connection.complete();
                                                callback();
                                            },
                                            function (err) {
                                                connection.complete();
                                                callback(err);
                                            });
                                }

                            })
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

module.exports = new Players(require('../db'));