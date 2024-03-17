
var utils = require('../utils');
var logger = require('../../../logger');

function Teams(db) {
    this.db = db;
}

Teams.prototype.Status = {
    Active: 1, // On team registration/activation
    PrincipalApproval: 2,
    RepresentativeApproval: 4,
    SupervisorApproval: 8,
    SupervisorDisapproval: 16
};


Teams.prototype.list = function (season, options, callback) {
    var self = this;
    this.db.connect()
        .then(
            function (connection) {
                //console.log('region: ' + options.region + ', clubs? ' + options.clubs + ', league? ' + options.league);
                var qs = "select tr.Id as \"Id\", tr.Competition as \"Competition\", s.SPORT_ID as \"Sport\", dbo.GetTeamNumber(t.TEAM_INDEX, tr.TeamNumber) as \"TeamNumber\", " +
                    "  sr.PrincipalName as \"PrincipalName\", tr.TeacherName as \"TeacherName\", tr.TeacherPhoneNumber as \"TeacherPhoneNumber\", " +
                    "  sr.PrincipalPhoneNumber as \"PrincipalPhoneNumber\", sr.PrincipalEmail as \"PrincipalEmail\", " +
                    "  sr.ChairmanName as \"ChairmanName\", sr.ChairmanPhoneNumber as \"ChairmanPhoneNumber\", sr.ChairmanEmail as \"ChairmanEmail\", " +
                    "  sr.CoordinatorName as \"CoordinatorName\", sr.CoordinatorPhoneNumber as \"CoordinatorPhoneNumber\", sr.CoordinatorEmail as \"CoordinatorEmail\", " +
                    "  sr.RepresentativeName as \"RepresentativeName\", sr.RepresentativePhoneNumber as \"RepresentativePhoneNumber\", sr.RepresentativeEmail as \"RepresentativeEmail\", " +
                    "  sr.TeacherName as \"RegTeacherName\", sr.TeacherPhoneNumber as \"RegTeacherPhoneNumber\", sr.TeacherEmail as \"RegTeacherEmail\", " +
                    "  sr.ParentsCommitteeName as \"ParentsCommitteeName\", sr.ParentsCommitteePhoneNumber as \"ParentsCommitteePhoneNumber\", sr.ParentsCommitteeEmail as \"ParentsCommitteeEmail\", " +
                    "  sr.StudentsRepresentativeName as \"StudentsRepresentativeName\", sr.StudentsRepresentativePhoneNumber as \"StudentsRepresentativePhoneNumber\", sr.StudentsRepresentativeEmail as \"StudentsRepresentativeEmail\", " +
                    "  sr.AssociationRepresentativeName as \"AssociationRepresentativeName\", sr.AssociationRepresentativePhoneNumber as \"AssociationRepresentativePhoneNumber\", sr.AssociationRepresentativeEmail as \"AssociationRepresentativeEmail\", " +
                    "  tr.TeacherEmail as \"TeacherEmail\", " +
                    "  tr.ManagerName as \"ManagerName\", tr.ManagerPhoneNumber as \"ManagerPhoneNumber\", tr.ManagerEmail as \"ManagerEmail\", " +
                    "  tr.CoachName as \"CoachName\", tr.CoachPhoneNumber as \"CoachPhoneNumber\", tr.CoachEmail as \"CoachEmail\", tr.CoachCertification as \"CoachCertification\", " +
                    "  tr.Activity as \"Activity\", tr.Approved as \"Approved\", " +
                    "  c.CHAMPIONSHIP_ID as \"ChampionshipId\", c.CHAMPIONSHIP_NAME as \"ChampionshipName\", " +
                    "  tr.Payment as \"Payment\", sc.SCHOOL_ID as \"School\", sc.SCHOOL_NAME as \"SchoolName\", sc.Symbol as \"SchoolSymbol\", " +
                    "  tr.AlternativeFacilityName as \"AlternativeFacilityName\", tr.AlternativeFacilityAddress as \"AlternativeFacilityAddress\", " +
                    "  sc.REGION_ID as \"SchoolRegion\", scr.REGION_NAME as \"SchoolRegionName\", " +
                    "  f.FACILITY_ID as [Facility], f.FACILITY_NAME as [FacilityName], f.[ADDRESS] as [FacilityAddress], " +
                    "  p.\"Order\" as \"PaymentOrder\", " +
                    "  tr.Team as \"Team\", t.STATUS as \"TeamStatus\", " +
                    "  cf.DateConfirmed as \"ClubDetailsConfirmed\", " +
                    "  tr.CreatedAt as \"CreatedAt\" " +
                    "from TeamRegistrations as tr " +
                    "  join SchoolRegistrations as sr on tr.School = sr.School and sr.Season = @season " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "  join SPORTS as s on s.SPORT_ID = c.SPORT_ID And s.DATE_DELETED Is Null " +
                    "  join SCHOOLS as sc on tr.School = sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
                    "  join REGIONS scr on scr.REGION_ID=sc.REGION_ID And scr.DATE_DELETED Is Null " +
                    "  left join Confirmations as cf on tr.School = cf.SchoolId and cf.Season = @season and cf.ConfirmedForm='club-details' " +
                    "  left join FACILITIES as f on tr.[Facility] = f.FACILITY_ID And f.DATE_DELETED Is Null " +
                    "  left outer join TEAMS as t on tr.Team = t.TEAM_ID and tr.School = t.SCHOOL_ID and tr.Competition = t.CHAMPIONSHIP_CATEGORY_ID And t.DATE_DELETED Is Null " +
                    "  left outer join PaymentRequests as p on tr.Payment = p.Id and p.CancelTime is null " +
                    "where c.SEASON = @season " +
                    (options.region != null ? " and sc.REGION_ID = @region" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE= 1" : "") +
                    (options.competition ? " and cc.CHAMPIONSHIP_CATEGORY_ID = @competition" : "") +
                    (options.championship ? " and c.CHAMPIONSHIP_ID = @championship" : "") +
                    (options.sport ? " and c.SPORT_ID = @sport" : "");
                /*
                    " union all " +
                    "select null as \"Id\", t.CHAMPIONSHIP_CATEGORY_ID as \"Competition\", s.SPORT_ID as \"Sport\", null as \"TeamNumber\", " +
                    "  sr.PrincipalName as \"PrincipalName\", null as \"TeacherName\", null as \"TeacherPhoneNumber\", " +
                    "  null as \"TeacherEmail\", null as \"CoachName\", null as \"CoachPhoneNumber\", null as \"CoachEmail\", null as \"CoachCertification\", " +
                    "  null as \"Activity\", null as \"Approved\", null as \"Payment\", " +
                    "  sc.SCHOOL_ID as \"School\", sc.SCHOOL_NAME as \"SchoolName\", sc.Symbol as \"SchoolSymbol\", " +
                    "  null as \"AlternativeFacilityName\", null as \"AlternativeFacilityAddress\", " +
                    "  sc.REGION_ID as \"SchoolRegion\", " +
                    "  null as [Facility], null as [FacilityName], null as [FacilityAddress], " +
                    "  null as \"PaymentOrder\", " +
                    "  t.TEAM_ID as \"Team\", t.STATUS as \"TeamStatus\" " +
                    "from TEAMS as t " +
                    "  join SCHOOLS as sc on t.SCHOOL_ID = sc.SCHOOL_ID " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on t.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID " +
                    "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                    "  join SPORTS as s on s.SPORT_ID = c.SPORT_ID " +
                    "  left outer join SchoolRegistrations as sr on t.SCHOOL_ID = sr.School and sr.Season = @season " +
                    "  left outer join TeamRegistrations as tr on tr.School = t.SCHOOL_ID and tr.Team = t.TEAM_ID " +
                    "where tr.Id is null and c.SEASON = @season and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL " +
                    (options.region ? " and sc.REGION_ID = @region" : "") +
                    (options.clubs ? " and c.IS_CLUBS = 1" : "") +
                    (options.league ? " and c.IS_LEAGUE= 1" : "") +
                    (options.competition ? " and cc.CHAMPIONSHIP_CATEGORY_ID = @competition" : "") +
                    (options.championship ? " and c.CHAMPIONSHIP_ID = @championship" : "") +
                    (options.sport ? " and c.SPORT_ID = @sport" : "")
                */
                var queryParams = {
                    season: season,
                    region: options.region,
                    competition: options.competition,
                    championship: options.championship,
                    sport: options.sport
                };
                console.log(qs);
                console.log(queryParams);
                connection.request(qs, queryParams).then(function (records) {
                    var result = [];

                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];
                        //console.log(record);

                        var activity;
                        if (record.Activity != null) {
                            try {
                                activity = JSON.parse(record.Activity);
                            } catch (e) {
                                activity = [];
                            }
                        } else {
                            activity = [];
                        }
                        var team = {
                            id: record.Id,
                            team: record.Team,
                            sport: record.Sport,
                            competition: record.Competition,
                            championship: {
                                id: record.ChampionshipId,
                                name: record.ChampionshipName
                            },
                            school: {
                                id: record.School,
                                name: record.SchoolName,
                                symbol: record.SchoolSymbol,
                                region: record.SchoolRegion,
                                regionName: record.SchoolRegionName,
                                principal: record.PrincipalName
                            },
                            teamNumber: record.TeamNumber,
                            teacher: {
                                name: record.TeacherName,
                                phoneNumber: record.TeacherPhoneNumber,
                                email: record.TeacherEmail
                            },
                            principal: {
                                name: record.PrincipalName,
                                phoneNumber: record.PrincipalPhoneNumber,
                                email: record.PrincipalEmail
                            },
                            chairman: {
                                name: record.ChairmanName,
                                phoneNumber: record.ChairmanPhoneNumber,
                                email: record.ChairmanEmail
                            },
                            coordinator: {
                                name: record.CoordinatorName,
                                phoneNumber: record.CoordinatorPhoneNumber,
                                email: record.CoordinatorEmail
                            },
                            representative: {
                                name: record.RepresentativeName,
                                phoneNumber: record.RepresentativePhoneNumber,
                                email: record.RepresentativeEmail
                            },
                            registrationTeacher: {
                                name: record.RegTeacherName,
                                phoneNumber: record.RegTeacherPhoneNumber,
                                email: record.RegTeacherEmail
                            },
                            parentsCommittee: {
                                name: record.ParentsCommitteeName,
                                phoneNumber: record.ParentsCommitteePhoneNumber,
                                email: record.ParentsCommitteeEmail
                            },
                            studentsRepresentative: {
                                name: record.StudentsRepresentativeName,
                                phoneNumber: record.StudentsRepresentativePhoneNumber,
                                email: record.StudentsRepresentativeEmail
                            },
                            associationRepresentative: {
                                name: record.AssociationRepresentativeName,
                                phoneNumber: record.AssociationRepresentativePhoneNumber,
                                email: record.AssociationRepresentativeEmail
                            },
                            //
                            coach: {
                                name: record.CoachName,
                                phoneNumber: record.CoachPhoneNumber,
                                email: record.CoachEmail,
                                certification: record.CoachCertification || 0
                            },
                            facility:
                                record.Facility == null ? null : {
                                    id: record.Facility,
                                    name: record.FacilityName,
                                    address: record.FacilityAddress
                                },
                            alternativeFacility: {
                                name: record.AlternativeFacilityName,
                                address: record.AlternativeFacilityAddress
                            },
                            activity: activity,
                            approved: record.Approved ? parseInt(record.Approved) : 0,
                            teamStatus: record.TeamStatus,
                            payment: record.Payment,
                            order: record.PaymentOrder,
                            clubDetailsConfirmed: record.ClubDetailsConfirmed,
                            createdAt: record.CreatedAt
                        };

                        /*if (team.approved != null) {
                            if ((team.approved & self.Status.SupervisorDisapproval) != 0) {
                                team.status.supervisor = -1;
                            }
                            else if ((team.approved & self.Status.SupervisorApproval) != 0) {
                                team.status.supervisor = 1;
                            }
                        }*/
                        //console.log(team);
                        result.push(team);
                    }

                    qs = 'Select Token, Identifier, Email ' +
                        'From TokenLogins ' +
                        'Where Len([Code])>0 And RIGHT(Identifier, 3)=@season ' +
                        '   And LEFT(Identifier, CHARINDEX(\'-\', Identifier)) In (\'principal-\', \'representative-\')';
                        //'   And Expiration>=GetDate()';
                    connection.request(qs, {season: '-' + season}).then(function (tokenRecords) {
                        connection.complete();
                        var schoolTokenMapping = {};
                        for (var i = 0; i < tokenRecords.length; i++) {
                            var tokenRecord = tokenRecords[i];
                            var identifierParts = tokenRecord['Identifier'].split('-');
                            var token = tokenRecord['Token'];
                            if (identifierParts.length === 3) {
                                var schoolId = identifierParts[1];
                                if (!schoolTokenMapping[schoolId]) {
                                    schoolTokenMapping[schoolId] = {};
                                }
                                schoolTokenMapping[schoolId][identifierParts[0]] = token;
                            }
                        }
                        result.forEach(function (teamObject) {
                            var key = teamObject.school.id.toString();
                            var mapping = schoolTokenMapping[key] || {};
                            teamObject.tokens = {
                                'principal': mapping['principal'] || '',
                                'representative': mapping['representative'] || ''
                            };
                        });
                        callback(null, result);
                    }, function (err) {
                        connection.complete();
                        callback(err);
                    });
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

function applyNextTeamStatus(transaction, teams, status, updates, callback) {
    if (teams.length === 0) {
        callback();
        return;
    }

    var team = teams[0];
    teams.splice(0, 1);
    if (team.id) {
        // Setting status by TeamRegistrations Id
        logger.log('info', 'Setting status of team ' + team.id + ' to ' + status);
        transaction.request(
            "select tr.School as \"School\", tr.Team as \"Team\", tr.Competition as \"Competition\", cc.CHAMPIONSHIP_ID as \"Championship\" " +
            "from TeamRegistrations as tr " +
            "  join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID " +
            "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
            "where tr.Id = @id and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL ",
            {id: team.id})
            .then(function (records) {
                if (records.length === 0) {
                    callback("Team not found");
                }
                else {
                    var record = records[0];
                    logger.log('info', 'Team found, id: ' + record.Team);
                    if (record.Team) {
                        // Registration has team in TEAMS
                        transaction.request(
                            "update TEAMS set STATUS = @status where TEAM_ID = @team",
                            {status: status, team: record.Team})
                            .then(
                                function () {
                                    applyNextTeamStatus(transaction, teams, status, updates, callback);
                                },
                                function (err) {
                                    callback(err);
                                });
                    }
                    else {
                        logger.log('info', 'Team not found,  creating a new team for school ' + record.School + ', category ' + record.Competition);
                        var indexQuery = 'select Max(IsNull(TEAM_INDEX, -1))+1 from TEAMS where DATE_DELETED Is Null and SCHOOL_ID=@school And CHAMPIONSHIP_CATEGORY_ID=@competition';
                        transaction.request(
                            "insert into TEAMS (SCHOOL_ID, CHAMPIONSHIP_ID, CHAMPIONSHIP_CATEGORY_ID, STATUS, TEAM_INDEX) " +
                            "values (@school, @championship, @competition, @status, (" + indexQuery + ")) " +
                            "select scope_identity() as \"Team\"",
                            {school: record.School, championship: record.Championship, competition: record.Competition, status: status})
                            .then(function (records) {
                                if (records.length === 0) {
                                    logger.log('info', 'no records were returned from insert');
                                    return Promise.reject("Error inserting team")
                                }
                                else {
                                    var record = records[0];
                                    logger.log('info', 'Team created, id: ' + record.Team);
                                    updates.push({id: team.id, team: record.Team});
                                    return transaction.request(
                                        "update TeamRegistrations " +
                                        "set Team = @team " +
                                        "where Id = @id",
                                        {id: team.id, team: record.Team});
                                }
                            })
                            .then(
                                function () {
                                    logger.log('info', 'Applying next status update...');
                                    applyNextTeamStatus(transaction, teams, status, updates, callback);
                                },
                                function (err) {
                                    logger.log('info', 'Error: ' + (err.message || err));
                                    callback(err);
                                });
                    }
                }
            });
    }
    else {
        logger.log('info', 'Updating status of team ' + team.team + ' to ' + status);
        transaction.request(
            "update TEAMS set STATUS = @status where TEAM_ID = @team",
            {status: status, team: team.team})
            .then(
                function () {
                    applyNextTeamStatus(transaction, teams, status, updates, callback);
                },
                function (err) {
                    callback(err);
                });
    }
}

Teams.prototype.setTeamsStatus = function (teams, status, callback) {
    // If id is given this is an id for TeamRegistrations
    // If the team in TeamRegistrations doesn't have Team should insert record in TEAMS
    // If team is given this is an id for TEAMS
    this.db.connect()
        .then(
            function (connection) {
                connection.transaction()
                    .then(
                        function (transaction) {
                            var updates = [];
                            logger.log('info', 'Setting status of ' + teams.length + ' teams to ' + status);
                            applyNextTeamStatus(transaction, teams, status, updates, function (err, result) {
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

Teams.prototype.updateTeam = function(team, callback) {
    this.db.connect()
        .then(
            function(connection){
                connection.transaction().then(
                    function(transaction){
                        transaction.request() // TODO update DB
                            .then(function(result){})

                    },
                    function(){
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

Teams.prototype.setTeamsApproval = function (season, teams, change, callback) {
    this.db.connect()
        .then(
            function (connection) {
                var params = {
                    season: season,
                    add: change.add,
                    remove: change.remove
                };
                for (var i = 0; i < teams.length; i++) {
                    params["t" + i] = teams[i];
                }
                connection.request(
                    "update TeamRegistrations " +
                    "set Approved = (Approved & ~ @remove) | @add " +
                    "where Id in (" + teams.map(function (x, i) { return "@t" + i; }).join(", ") + ") and " +
                    "  Competition in ( " +
                    "    select CHAMPIONSHIP_CATEGORY_ID " +
                    "    from CHAMPIONSHIP_CATEGORIES as cc " +
                    "      join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.SEASON = @season " + // and c.IS_CLUBS = 1
                    "    where cc.DATE_DELETED IS NULL and c.DATE_DELETED IS NULL) ",
                    params)
                    .then(function () {
                        connection.complete();
                        callback();
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

module.exports = new Teams(require('../db'));