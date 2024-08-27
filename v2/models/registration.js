var category = "RegistrationModel";
var sql = require('mssql');
var util = require('../api/util');
var path = require('path');
var fs = require('fs');
var logger = require('../../logger');
var settings = require('../../settings');
var Access = require('./access');
var Season = require('./season');
var utils = require('./utils');
var apiUtils = require('../../api/utils');

function Registration(db) {
    this.db = db;
}

function insertSingleCertificationType(connection, teamId, certificationTypes, index, callback) {
    if (index >= certificationTypes.length) {
        callback(null, 'success');
        return;
    }
    var certificationType = certificationTypes[index];
    var qs = 'Insert Into RegistrationCoachCertifications (TeamId, Certification) Values (@id, @certification)';
    var queryParams = {
        id: teamId,
        certification: certificationType
    };
    connection.request(qs, queryParams).then(function() {
        insertSingleCertificationType(connection, teamId, certificationTypes, index + 1, callback);
    }, function(err) {
        callback(err);
    });
}

Registration.prototype.getRegistrationStatus = async function (entity, callback) {
    var connection = null;
    var server = this;
    Season.current(entity.user, async function(currentSeason) {
        try {
            connection = await server.db.connect();
            var groups = [];
            var active = [];

            if (entity.school != null) {
                var leagueLinks = [];
                groups = [
                    {
                        links: [
                            {enabled: true, name: "מועדונים בית ספריים", route: "registration/club/club"}
                        ]
                    },
                    {
                        links: [
                            {name: "אירועי ספורט מחוזיים"},
                            {name: "תוכנית 'זוזו'"},
                            {name: "משחקים כמו פעם"}
                        ]
                    },
                    {
                        links: [
                            {
                                enabled: true,
                                name: "ליגות התיכוניים",
                                links: leagueLinks
                            },
                            {name: "אליפויות חמ\"ד"},
                            {name: "ISF"},
                            {name: "תכנית פכ\"ל"}
                        ]
                    },
                    {
                        links: [
                            {name: "אליפויות ארציות"},
                            {name: "כדורעף חופים נווה ים"}
                        ]
                    },
                    {
                        links: [
                            {name: "מחנות אימון"},
                            {name: "השתלמויות מקצועיות"},
                            {name: "כנסים"}
                        ]
                    }
                ];

                // Checking club status
                var records = await connection.request(
                    "select count(*) as \"Count\" " +
                    "from SchoolRegistrations " +
                    "where School = @school and Season = @season and Club = 1 ",
                    {school: entity.school, season: currentSeason});
                if (records[0].Count > 0) {
                    active.push({name: "הרשמה למועדון", route: "registration/club/club"});
                }

                // Reading league teams
                records = await connection.request(
                    "select t.TEAM_ID as \"Team\", tr.Id as \"Id\", cc.CATEGORY as \"Category\", s.SPORT_NAME as \"SportName\" " +
                    "from TEAMS as t " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on t.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID " +
                    "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                    "  join SPORTS as s on c.SPORT_ID = s.SPORT_ID " +
                    "  left outer join TeamRegistrations as tr on tr.Team = t.TEAM_ID and tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID and tr.School = t.SCHOOL_ID " +
                    "where t.SCHOOL_ID = @school and c.SEASON = @season and " +
                    "  c.IS_LEAGUE = 1 and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL and t.DATE_DELETED IS NULL",
                    {school: entity.school, season: currentSeason});

                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var name = record.SportName + ' ' + utils.categoryToString(record.Category);
                    var link = "registration/league/league?team=" + record.Team;
                    leagueLinks.push({name: name, route: link, enabled: true});
                    if (record.Id != null) {
                        active.push({name: 'ליגות תיכוניים - ' + name, route: link});
                    }

                }
            }
            else if (entity.city != null) {
                groups = [
                    {
                        links: []
                    }
                ];

                records = await connection.request(
                    "select Project as \"Project\" " +
                    "from ProjectRegistrations " +
                    "where City = @city and Season = @season ",
                    {city: entity.city, season: currentSeason});

                for (var i = 0; i < records.length; i++) {
                    switch (records[i].Project) {
                        case 1:
                            groups[0].links.push({enabled: true, name: "תוכנית 'זוזו'", route: "registration/project/zuzu-info"});
                            break;
                        case 2:
                            groups[0].links.push({enabled: true, name: "תכנית פכ\"ל", route: "registration/project/project?pcl"});
                            break;
                        case 3:
                            groups[0].links.push({enabled: true, name: "תכנית פל\"א", route: "registration/project/pele-info"});
                            break;
                        case 5:
                            groups[0].links.push({enabled: true, name: "תכנית שווים בספורט", route: "registration/project/sport-equality-info"});
                            break;
                        default:
                            break;
                    }
                }
            }

            callback(null, {active: active, groups: groups});
        }
        catch (err) {
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

Registration.prototype.getClubRegistrationStage = function (user, callback, server) {
    if (typeof server === 'undefined' || server == null)
        server = this;
    var school = user.schoolID;
    Season.current(user, function(currentSeason) {
        server.db.connect().then(function (connection) {
                var qs =
                    "Select Max(sr.Club) As \"Club\", " +
                    "   Count(tr.School) As \"Teams\", " +
                    "   Sum(Case When tr.Approved Is Not Null And (tr.Approved & 1) = 1 Then 1 Else 0 End) As \"Approved\", " +
                    "   Count(tr.Payment) As \"Paid\" " +
                    "From SCHOOLS s Left Outer Join SchoolRegistrations sr On s.SCHOOL_ID=sr.School And sr.Season=@season " +
                    "   Left Outer Join (" +
                    "       Select tr.School, tr.Approved, tr.Payment, c.SEASON as Season " +
                    "       From TeamRegistrations tr Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED IS NULL " +
                    "           Join CHAMPIONSHIPS c On c.CHAMPIONSHIP_ID=cc.CHAMPIONSHIP_ID And c.IS_CLUBS=1 And c.DATE_DELETED Is Null" +
                    "   ) As tr On tr.School=sr.School And tr.Season=sr.Season " +
                    "Where s.DATE_DELETED Is Null And s.SCHOOL_ID=@school";
                var queryParams = {
                    school: school,
                    season: currentSeason
                };
                connection.request(qs, queryParams).then(function (records) {
                    connection.complete();
                    if (records.length === 1) {
                        var record = records[0];
                        console.log('school ' + school);
                        console.log(record.Club + ' clubs');
                        console.log(record.Teams + ' teams');
                        console.log(record.Approved + ' approved');
                        console.log(record.Paid + ' paid');
                        var stage = 0;
                        if (record.Club > 0) {
                            stage = 1;
                            if (record.Approved > 0) { //&& record.Approved === record.Teams) {
                                stage = 2;
                                if (record.Paid > 0) { //=== record.Approved) {
                                    stage = 3;
                                }
                            }
                        }
                        callback(null, {
                            stage: stage
                        });
                    } else {
                        callback({status: 404, message: "בית ספר מבוקש לא נמצא"});
                    }
                }, function (err) {
                    connection.complete();
                    callback(err);
                });
            }, function (err) {
                callback(err);
            }
        );
    });
};

Registration.prototype.getLeagueRegistrationStage = function (user, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select max(sr.League) as \"League\", count(tr.School) as \"Teams\", " +
                        "  sum(case when tr.Approved is not null and (tr.Approved & 1) = 1 then 1 else 0 end) as \"Approved\", " +
                        "  count(tr.Payment) as \"Paid\" " +
                        "from SCHOOLS as s " +
                        "  left outer join SchoolRegistrations as sr on s.SCHOOL_ID = sr.School and sr.Season = @season " +
                        "  left outer join " +
                        "  (select tr.School, tr.Approved, tr.Payment, c.SEASON as Season" +
                        "   from TeamRegistrations as tr " +
                        "     join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID and cc.DATE_DELETED IS NULL " +
                        "     join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.IS_LEAGUE = 1 and c.DATE_DELETED IS NULL" +
                        "   ) as tr on tr.School = sr.School and tr.Season = sr.Season " +
                        "where s.SCHOOL_ID = @school",
                        {school: school, season: currentSeason})
                        .then(
                            function (records) {
                                connection.complete();

                                if (records.length === 1) {
                                    var record = records[0];
                                    var stage = 0;
                                    if (record.League > 0) {
                                        stage = 1;
                                        if (record.Teams && record.Approved === record.Teams) {
                                            stage = 2;
                                            if (record.Paid === record.Approved) {
                                                stage = 3;
                                            }
                                        }
                                    }
                                    callback(null, {
                                        stage: stage
                                    });
                                }
                                else {
                                    callback({status: 404, message: "בית ספר מבוקש לא נמצא"});
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
    });
};

function returnSchoolDetails(connection, school, data, callback) {
    var result = {
        school: {
            name: data.Name,
            symbol: data.Symbol,
            cityName: data.CityName,
            phoneNumber: data.PhoneNumber,
            fax: data.Fax,
            type: utils.getSchoolType(data.FromGrade, data.ToGrade),
            //classes: "ז'-י\"ב",
            email: data.Email,
            address: data.Address
        },
        principal: {
            name: data.PrincipalName,
            phoneNumber: data.PrincipalPhoneNumber
        }
    };

    // Reading functionaries
    connection.request(
        "select FUNCTIONARY_TYPE as \"Type\", FUNCTIONARY_NAME as \"Name\", " +
        "  PHONE as \"PhoneNumber\", EMAIL as \"Email\" " +
        "from FUNCTIONARIES " +
        "where SCHOOL_ID = @school and DATE_DELETED IS NULL and FUNCTIONARY_TYPE IN (1, 3)" +
        "order by DATE_LAST_MODIFIED desc",
        {school: school})
        .then(
            function (records) {
                connection.complete();
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    if (record.Type === 1) {
                        // Coordinator
                        if (!result.coordinator) {
                            result.coordinator = {
                                name: record.Name,
                                phoneNumber: record.PhoneNumber,
                                email: record.Email
                            };
                            if (result.chairman) {
                                break;
                            }
                        }
                    }
                    else {
                        // Chairman
                        if (!result.chairman) {
                            result.chairman = {
                                name: record.Name,
                                phoneNumber: record.PhoneNumber,
                                email: record.Email
                            };
                            if (result.coordinator) {
                                break;
                            }
                        }
                    }
                }
                callback(null, result);
            },
            function () {
                connection.complete();
                callback(null, result);
            }
        );
}

Registration.prototype.getClubRegistrationDetails = function (options, callback) {
    var user = options.user;
    var school = options.school || user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        var season = currentSeason;
        if (options.season)
            season = options.season;
        console.log('reading club registration details for school ' + school + ', season ' + season + ' (user ' + user.id + ')');
        server.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select s.SYMBOL as \"Symbol\", s.SCHOOL_NAME as \"Name\", s.ADDRESS as \"Address\", " +
                        "  s.EMAIL as \"Email\", s.PHONE as \"PhoneNumber\", s.FAX as \"Fax\", s.ZIP_CODE As \"ZipCode\", " +
                        "  s.MANAGER_NAME as \"PrincipalName\", s.MANAGER_CELL_PHONE as \"PrincipalPhoneNumber\", " +
                        "  s.FROM_GRADE as \"FromGrade\", s.TO_GRADE as \"ToGrade\", r.REGION_NAME as \"RegionName\", " +
                        "  sr.School as \"RegSchool\", sr.Name as \"RegName\", sr.Type as \"RegType\", sr.Address as \"RegAddress\", " +
                        "  sr.PhoneNumber as \"RegPhoneNumber\", sr.Fax as \"RegFax\", sr.Email as \"RegEmail\", " +
                        "  sr.PrincipalName as \"RegPrincipalName\", sr.PrincipalPhoneNumber as \"RegPrincipalPhoneNumber\", sr.PrincipalGender as \"RegPrincipalGender\", " +
                        "  sr.PrincipalEmail as \"RegPrincipalEmail\", sr.ChairmanName as \"RegChairmanName\", " +
                        "  sr.ChairmanPhoneNumber as \"RegChairmanPhoneNumber\", sr.ChairmanEmail as \"RegChairmanEmail\", sr.ChairmanGender as \"RegChairmanGender\", " +
                        "  sr.CoordinatorName as \"RegCoordinatorName\", sr.CoordinatorPhoneNumber as \"RegCoordinatorPhoneNumber\", " +
                        "  sr.CoordinatorEmail as \"RegCoordinatorEmail\", sr.CoordinatorGender as \"RegCoordinatorGender\", " +
                        "  sr.RepresentativeName as \"RegRepresentativeName\", sr.RepresentativePhoneNumber as \"RegRepresentativePhoneNumber\", " +
                        "  sr.RepresentativeEmail as \"RegRepresentativeEmail\", sr.RepresentativeGender as \"RegRepresentativeGender\", " +
                        "  sr.TeacherName as \"RegTeacherName\", sr.TeacherPhoneNumber as \"RegTeacherPhoneNumber\", " +
                        "  sr.TeacherEmail as \"RegTeacherEmail\", sr.TeacherGender as \"RegTeacherGender\", " +
                        "  sr.ParentsCommitteeName as \"RegParentsCommitteeName\", sr.ParentsCommitteePhoneNumber as \"RegParentsCommitteePhoneNumber\", " +
                        "  sr.ParentsCommitteeEmail as \"RegParentsCommitteeEmail\", sr.ParentsCommitteeGender as \"RegParentsCommitteeGender\", " +
                        "  sr.StudentsRepresentativeName as \"RegStudentsRepresentativeName\", sr.StudentsRepresentativePhoneNumber as \"RegStudentsRepresentativePhoneNumber\", " +
                        "  sr.StudentsRepresentativeEmail as \"RegStudentsRepresentativeEmail\", sr.StudentsRepresentativeGender as \"RegStudentsRepresentativeGender\", " +
                        "  sr.AssociationRepresentativeName as \"RegAssociationRepresentativeName\", sr.AssociationRepresentativePhoneNumber as \"RegAssociationRepresentativePhoneNumber\", " +
                        "  sr.AssociationRepresentativeEmail as \"RegAssociationRepresentativeEmail\", sr.AssociationRepresentativeGender as \"RegAssociationRepresentativeGender\", " +
                        "  sr.AssociationNumber as \"RegAssociationNumber\", " +
                        "  sr.AssociationValidApproval as \"RegAssociationValidApproval\", " +
                        "  c.CITY_NAME as \"CityName\" " +
                        "from SCHOOLS as s " +
                        "  left outer join SchoolRegistrations as sr on s.SCHOOL_ID = sr.School and sr.Season = @season " +
                        "  left join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                        "  left join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null " +
                        "where s.SCHOOL_ID = @school and s.DATE_DELETED Is Null",
                        {school: school, season: season})
                        .then(
                            function (records) {
                                if (records.length === 1) {

                                    var record = records[0];
                                    if (record.RegSchool) {
                                        connection.complete();
                                        callback(null, {
                                            school: {
                                                name: record.RegName,
                                                symbol: record.Symbol,
                                                cityName: record.CityName,
                                                phoneNumber: record.RegPhoneNumber,
                                                fax: record.RegFax,
                                                type: record.RegType == null ? utils.getSchoolType(record.FromGrade, record.ToGrade) : record.RegType,
                                                //classes: "ז'-י\"ב",
                                                email: record.RegEmail,
                                                address: record.RegAddress,
                                                zipCode: record.ZipCode,
                                                region: record.RegionName
                                            },
                                            principal: {
                                                name: record.RegPrincipalName || record.PrincipalName,
                                                phoneNumber: record.RegPrincipalPhoneNumber || record.PrincipalPhoneNumber,
                                                email: record.RegPrincipalEmail,
                                                gender: record.RegPrincipalGender
                                            },
                                            chairman: {
                                                name: record.RegChairmanName,
                                                phoneNumber: record.RegChairmanPhoneNumber,
                                                email: record.RegChairmanEmail,
                                                gender: record.RegChairmanGender
                                            },
                                            coordinator: {
                                                name: record.RegCoordinatorName,
                                                phoneNumber: record.RegCoordinatorPhoneNumber,
                                                email: record.RegCoordinatorEmail,
                                                gender: record.RegCoordinatorGender
                                            },
                                            representative: {
                                                name: record.RegRepresentativeName,
                                                phoneNumber: record.RegRepresentativePhoneNumber,
                                                email: record.RegRepresentativeEmail,
                                                gender: record.RegRepresentativeGender
                                            },
                                            teacher: {
                                                name: record.RegTeacherName,
                                                phoneNumber: record.RegTeacherPhoneNumber,
                                                email: record.RegTeacherEmail,
                                                gender: record.RegTeacherGender
                                            },
                                            parentsCommittee: {
                                                name: record.RegParentsCommitteeName,
                                                phoneNumber: record.RegParentsCommitteePhoneNumber,
                                                email: record.RegParentsCommitteeEmail,
                                                gender: record.RegParentsCommitteeGender
                                            },
                                            studentsRepresentative: {
                                                name: record.RegStudentsRepresentativeName,
                                                phoneNumber: record.RegStudentsRepresentativePhoneNumber,
                                                email: record.RegStudentsRepresentativeEmail,
                                                gender: record.RegStudentsRepresentativeGender
                                            },
                                            associationRepresentative: {
                                                name: record.RegAssociationRepresentativeName,
                                                phoneNumber: record.RegAssociationRepresentativePhoneNumber,
                                                email: record.RegAssociationRepresentativeEmail,
                                                gender: record.RegAssociationRepresentativeGender
                                            },
                                            association: {
                                                set: record.RegAssociationNumber != null,
                                                number: record.RegAssociationNumber || "",
                                                validForThisYear: record.RegAssociationNumber == null ? false : !!record.RegAssociationValidApproval
                                            }
                                        });
                                    }
                                    else {
                                        returnSchoolDetails(connection, school, record, callback);
                                    }
                                }
                                else {
                                    callback({status: 404, message: "בית ספר מבוקש לא נמצא"});
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
    });
};

Registration.prototype.getLeagueRegistrationDetails = function (user, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select s.SYMBOL as \"Symbol\", s.SCHOOL_NAME as \"Name\", s.ADDRESS as \"Address\", " +
                        "  s.EMAIL as \"Email\", s.PHONE as \"PhoneNumber\", s.FAX as \"Fax\", s.ZIP_CODE As \"ZipCode\", " +
                        "  s.MANAGER_NAME as \"PrincipalName\", s.MANAGER_CELL_PHONE as \"PrincipalPhoneNumber\", " +
                        "  s.FROM_GRADE as \"FromGrade\", s.TO_GRADE as \"ToGrade\", r.REGION_NAME as \"RegionName\", " +
                        "  sr.School as \"RegSchool\", sr.Name as \"RegName\", sr.Type as \"RegType\", sr.Address as \"RegAddress\", " +
                        "  sr.PhoneNumber as \"RegPhoneNumber\", sr.Fax as \"RegFax\", sr.Email as \"RegEmail\", " +
                        "  sr.PrincipalName as \"RegPrincipalName\", sr.PrincipalPhoneNumber as \"RegPrincipalPhoneNumber\", " +
                        "  sr.PrincipalEmail as \"RegPrincipalEmail\", sr.PrincipalGender as \"RegPrincipalGender\", " +
                        "  sr.RepresentativeName as \"RegRepresentativeName\", sr.RepresentativePhoneNumber as \"RegRepresentativePhoneNumber\", " +
                        "  sr.RepresentativeEmail as \"RegRepresentativeEmail\", sr.RepresentativeGender as \"RegRepresentativeGender\", " +
                        "  c.CITY_NAME as \"CityName\" " +
                        "from SCHOOLS as s " +
                        "  left outer join SchoolRegistrations as sr on s.SCHOOL_ID = sr.School and sr.Season = @season " +
                        "  left join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                        "  left join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null " +
                        "where s.SCHOOL_ID = @school and s.DATE_DELETED Is Null",
                        {school: school, season: currentSeason})
                        .then(
                            function (records) {
                                if (records.length === 1) {
                                    var record = records[0];
                                    if (record.RegSchool) {
                                        connection.complete();
                                        callback(null, {
                                            school: {
                                                name: record.RegName,
                                                symbol: record.Symbol,
                                                cityName: record.CityName,
                                                phoneNumber: record.RegPhoneNumber,
                                                fax: record.RegFax,
                                                type: record.RegType == null ? utils.getSchoolType(record.FromGrade, record.ToGrade) : record.RegType,
                                                //classes: "ז'-י\"ב",
                                                email: record.RegEmail,
                                                address: record.RegAddress,
                                                zipCode: record.ZipCode,
                                                region: record.RegionName
                                            },
                                            principal: {
                                                name: record.RegPrincipalName || record.PrincipalName,
                                                phoneNumber: record.RegPrincipalPhoneNumber || record.PrincipalPhoneNumber,
                                                email: record.RegPrincipalEmail,
                                                gender: record.RegPrincipalGender
                                            },
                                            representative: {
                                                name: record.RepresentativeName || record.RegRepresentativeName,
                                                phoneNumber: record.RegRepresentativePhoneNumber || record.RepresentativePhoneNumber,
                                                email: record.RegRepresentativeEmail,
                                                gender: record.RegRepresentativeGender
                                            }
                                        });
                                    }
                                    else {
                                        returnSchoolDetails(connection, school, record, callback);
                                    }
                                }
                                else {
                                    callback({status: 404, message: "בית ספר מבוקש לא נמצא"});
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
    });
};

Registration.prototype.setClubRegistrationDetails = function (userId, school, details, callback) {
    var server = this;
    Season.current({id: userId, username: ''}, function(currentSeason) {
        var data = {
            school: school,
            user: userId,
            season: currentSeason,
            name: utils.ensureFieldLength(details.school.name, 30),
            type: details.school.type || 0,
            address: utils.ensureFieldLength(details.school.address, 70),
            phoneNumber: utils.ensureFieldLength(details.school.phoneNumber, 15),
            fax: utils.ensureFieldLength(details.school.fax, 15),
            email: utils.ensureFieldLength(details.school.email, 100),
            principalName: utils.ensureFieldLength(details.principal.name, 255),
            principalPhoneNumber: utils.ensureFieldLength(details.principal.phoneNumber, 15),
            principalEmail: utils.ensureFieldLength(details.principal.email, 100),
            principalGender: details.principal.gender,
            chairmanName: utils.ensureFieldLength(details.chairman.name, 255),
            chairmanPhoneNumber: utils.ensureFieldLength(details.chairman.phoneNumber, 15),
            chairmanEmail: utils.ensureFieldLength(details.chairman.email, 100),
            chairmanGender: details.chairman.gender,
            coordinatorName: utils.ensureFieldLength(details.coordinator.name, 255),
            coordinatorPhoneNumber: utils.ensureFieldLength(details.coordinator.phoneNumber, 15),
            coordinatorEmail: utils.ensureFieldLength(details.coordinator.email, 255),
            coordinatorGender: details.coordinator.gender,
            representativeName: utils.ensureFieldLength(details.representative.name, 255),
            representativePhoneNumber: utils.ensureFieldLength(details.representative.phoneNumber, 15),
            representativeEmail: utils.ensureFieldLength(details.representative.email, 100),
            representativeGender: details.representative.gender,
            teacherName: utils.ensureFieldLength(details.teacher.name, 255),
            teacherPhoneNumber: utils.ensureFieldLength(details.teacher.phoneNumber, 15),
            teacherEmail: utils.ensureFieldLength(details.teacher.email, 100),
            teacherGender: details.teacher.gender,
            parentsCommitteeName: utils.ensureFieldLength(details.parentsCommittee.name, 255),
            parentsCommitteePhoneNumber: utils.ensureFieldLength(details.parentsCommittee.phoneNumber, 15),
            parentsCommitteeEmail: utils.ensureFieldLength(details.parentsCommittee.email, 100),
            parentsCommitteeGender: details.parentsCommittee.gender,
            studentsRepresentativeName: utils.ensureFieldLength(details.studentsRepresentative.name, 255),
            studentsRepresentativePhoneNumber: utils.ensureFieldLength(details.studentsRepresentative.phoneNumber, 15),
            studentsRepresentativeEmail: utils.ensureFieldLength(details.studentsRepresentative.email, 100),
            studentsRepresentativeGender: details.studentsRepresentative.gender,
            associationRepresentativeName: utils.ensureFieldLength(details.associationRepresentative.name, 255),
            associationRepresentativePhoneNumber: utils.ensureFieldLength(details.associationRepresentative.phoneNumber, 15),
            associationRepresentativeEmail: utils.ensureFieldLength(details.associationRepresentative.email, 100),
            associationRepresentativeGender: details.associationRepresentative.gender,
            associationNumber: details.association.set ? utils.ensureFieldLength(details.association.number, 10) : null,
            associationValidApproval: details.association.set ? details.association.validForThisYear : false
        };

        server.db.connect()
            .then(
                function (connection) {
                    connection.transaction()
                        .then(
                            function (transaction) {
                                transaction.request(
                                    "select s.SYMBOL as \"Symbol\", cr.School as \"RegSchool\" " +
                                    "from SCHOOLS as s " +
                                    "  left outer join SchoolRegistrations as cr on s.SCHOOL_ID = cr.School and cr.Season = @season " +
                                    "where s.DATE_DELETED Is Null And s.SCHOOL_ID = @school",
                                    {school: school, season: currentSeason})
                                    .then(
                                        function (records) {
                                            // Return the current stage or null
                                            return records.length === 1 ? records[0].RegSchool == null : null;
                                        })
                                    .then(function (insert) {
                                        if (insert == null) {
                                            return Promise.reject({status: 404, message: "בית ספר מבוקש לא נמצא"});
                                        }
                                        else {
                                            return transaction.request(
                                                insert
                                                    ? "insert into SchoolRegistrations(School, Season, Name, Type, " +
                                                    "  Address, PhoneNumber, Fax, Email," +
                                                    "  PrincipalName, PrincipalPhoneNumber, PrincipalEmail, PrincipalGender, " +
                                                    "  ChairmanName, ChairmanPhoneNumber, ChairmanEmail, ChairmanGender, " +
                                                    "  CoordinatorName, CoordinatorPhoneNumber, CoordinatorEmail, CoordinatorGender, " +
                                                    "  RepresentativeName, RepresentativePhoneNumber, RepresentativeEmail, RepresentativeGender, " +
                                                    "  TeacherName, TeacherPhoneNumber, TeacherEmail, TeacherGender, " +
                                                    "  ParentsCommitteeName, ParentsCommitteePhoneNumber, ParentsCommitteeEmail, ParentsCommitteeGender, " +
                                                    "  StudentsRepresentativeName, StudentsRepresentativePhoneNumber, StudentsRepresentativeEmail, StudentsRepresentativeGender, " +
                                                    "  AssociationRepresentativeName, AssociationRepresentativePhoneNumber, AssociationRepresentativeEmail, AssociationRepresentativeGender, " +
                                                    "  AssociationNumber, AssociationValidApproval, Club, UserId) " +
                                                    "values(@school, @season, @name, @type, @address, @phoneNumber, @fax, @email, " +
                                                    "  @principalName, @principalPhoneNumber, @principalEmail, @principalGender, " +
                                                    "  @chairmanName, @chairmanPhoneNumber, @chairmanEmail, @chairmanGender, " +
                                                    "  @coordinatorName, @coordinatorPhoneNumber, @coordinatorEmail, @coordinatorGender, " +
                                                    "  @representativeName, @representativePhoneNumber, @representativeEmail, @representativeGender, " +
                                                    "  @teacherName, @teacherPhoneNumber, @teacherEmail, @teacherGender, " +
                                                    "  @parentsCommitteeName, @parentsCommitteePhoneNumber, @parentsCommitteeEmail, @parentsCommitteeGender, " +
                                                    "  @studentsRepresentativeName, @studentsRepresentativePhoneNumber, @studentsRepresentativeEmail, @studentsRepresentativeGender, " +
                                                    "  @associationRepresentativeName, @associationRepresentativePhoneNumber, @associationRepresentativeEmail, @associationRepresentativeGender, " +
                                                    "  @associationNumber, @associationValidApproval, 1, @user) "
                                                    : "update SchoolRegistrations " +
                                                    "set Name = @name, Type = @type, " +
                                                    "  Address = @address, PhoneNumber = @phoneNumber, Fax = @fax, Email = @email," +
                                                    "  PrincipalName = @principalName, PrincipalPhoneNumber = @principalPhoneNumber, PrincipalGender=@principalGender, " +
                                                    "  PrincipalEmail = @principalEmail, ChairmanName = @chairmanName, ChairmanPhoneNumber = @chairmanPhoneNumber, " +
                                                    "  ChairmanEmail = @chairmanEmail, ChairmanGender=@chairmanGender, " +
                                                    "  CoordinatorName = @coordinatorName, CoordinatorPhoneNumber = @coordinatorPhoneNumber, CoordinatorEmail = @coordinatorEmail, " +
                                                    "  CoordinatorGender=@coordinatorGender, " +
                                                    "  RepresentativeName = @representativeName, RepresentativePhoneNumber = @representativePhoneNumber, RepresentativeEmail = @representativeEmail, " +
                                                    "  RepresentativeGender=@representativeGender, " +
                                                    "  TeacherName = @teacherName, TeacherPhoneNumber = @teacherPhoneNumber, TeacherEmail = @teacherEmail, " +
                                                    "  TeacherGender=@teacherGender, " +
                                                    "  ParentsCommitteeName = @parentsCommitteeName, ParentsCommitteePhoneNumber = @parentsCommitteePhoneNumber, ParentsCommitteeEmail = @parentsCommitteeEmail, " +
                                                    "  ParentsCommitteeGender=@parentsCommitteeGender, " +
                                                    "  StudentsRepresentativeName = @studentsRepresentativeName, StudentsRepresentativePhoneNumber = @studentsRepresentativePhoneNumber, StudentsRepresentativeEmail = @studentsRepresentativeEmail, " +
                                                    "  StudentsRepresentativeGender=@studentsRepresentativeGender, " +
                                                    "  AssociationRepresentativeName = @associationRepresentativeName, AssociationRepresentativePhoneNumber = @associationRepresentativePhoneNumber, AssociationRepresentativeEmail = @associationRepresentativeEmail, " +
                                                    "  AssociationRepresentativeGender=@associationRepresentativeGender, " +
                                                    "  AssociationNumber = @associationNumber, AssociationValidApproval = @associationValidApproval, " +
                                                    "  Club = 1, UserId = @user " +
                                                    "where School = @school and Season = @season",
                                                data);
                                        }
                                    })
                                    .then(function () {
                                        return transaction.request(
                                            "insert into Approvals(UserId, Approval, Item, Time, Data) " +
                                            "values(@user, @approval, @school, @time, @data)",
                                            {user: userId, school: school, approval: "school:club", time: new Date(), data: JSON.stringify(data)});
                                    })
                                    .then(function () {
                                        return transaction.commit();
                                    })
                                    .then(
                                        function () {
                                            connection.complete();
                                            callback(null, {stage: 1});
                                        },
                                        function (err) {
                                            transaction.rollback();
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
    });
};

Registration.prototype.setLeagueRegistrationDetails = function (userId, school, details, callback) {
    var server = this;
    Season.current({id: userId, username: ''}, function(currentSeason) {
        var data = {
            school: school,
            user: userId,
            season: currentSeason,
            name: utils.ensureFieldLength(details.school.name, 30),
            type: details.school.type || 0,
            address: utils.ensureFieldLength(details.school.address, 70),
            phoneNumber: utils.ensureFieldLength(details.school.phoneNumber, 15),
            fax: utils.ensureFieldLength(details.school.fax, 15),
            email: utils.ensureFieldLength(details.school.email, 100),
            principalName: utils.ensureFieldLength(details.principal.name, 255),
            principalPhoneNumber: utils.ensureFieldLength(details.principal.phoneNumber, 15),
            principalEmail: utils.ensureFieldLength(details.principal.email, 100),
            principalGender: details.principal.gender,
            representativeName: utils.ensureFieldLength(details.representative.name, 255),
            representativePhoneNumber: utils.ensureFieldLength(details.representative.phoneNumber, 15),
            representativeEmail: utils.ensureFieldLength(details.representative.email, 100),
            representativeGender: details.representative.gender
        };
        //console.log(data);
        server.db.connect()
            .then(
                function (connection) {
                    connection.transaction()
                        .then(
                            function (transaction) {
                                console.log('connected, starting to run queries');
                                transaction.request(
                                    "select s.SYMBOL as \"Symbol\", cr.School as \"RegSchool\" " +
                                    "from SCHOOLS as s " +
                                    "  left outer join SchoolRegistrations as cr on s.SCHOOL_ID = cr.School and cr.Season = @season " +
                                    "where s.SCHOOL_ID = @school",
                                    {school: school, season: currentSeason})
                                    .then(
                                        function (records) {
                                            // Return the current stage or null
                                            return records.length === 1 ? records[0].RegSchool == null : null;
                                        })
                                    .then(function (insert) {
                                        if (insert == null) {
                                            return Promise.reject({status: 404, message: "בית ספר מבוקש לא נמצא"});
                                        } else {
                                            console.log('insert? ' + insert);
                                            var query = insert
                                                ? "insert into SchoolRegistrations(School, Season, Name, Type, " +
                                                "  Address, PhoneNumber, Fax, Email," +
                                                "  PrincipalName, PrincipalPhoneNumber, PrincipalEmail, PrincipalGender, " +
                                                "  RepresentativeName, RepresentativePhoneNumber, " +
                                                "  RepresentativeEmail, RepresentativeGender, " +
                                                "  League, UserId) " +
                                                "values(@school, @season, @name, @type, @address, @phoneNumber, @fax, @email, " +
                                                "  @principalName, @principalPhoneNumber, @principalEmail, @principalGender, " +
                                                "  @representativeName, @representativePhoneNumber, " +
                                                "  @representativeEmail, @representativeGender, " +
                                                "  1, @user) "
                                                : "update SchoolRegistrations " +
                                                "set Name = @name, Type = @type, " +
                                                "  Address = @address, PhoneNumber = @phoneNumber, Fax = @fax, Email = @email," +
                                                "  PrincipalName = @principalName, PrincipalPhoneNumber = @principalPhoneNumber, " +
                                                "  PrincipalEmail = @principalEmail, PrincipalGender = @principalGender, " +
                                                "  RepresentativeName = @representativeName, RepresentativePhoneNumber = @representativePhoneNumber, " +
                                                "  RepresentativeEmail = @representativeEmail, RepresentativeGender = @representativeGender, " +
                                                "  League = 1, UserId = @user  " +
                                                "where School = @school and Season = @season";
                                            //console.log(query);
                                            //console.log('school: ' + data.school + ', season: ' + data.season);
                                            transaction.request(query, data);
                                        }
                                    })
                                    .then(function () {
                                        console.log('query executed');
                                        return transaction.request(
                                            "insert into Approvals(UserId, Approval, Item, Time, Data) " +
                                            "values(@user, @approval, @school, @time, @data)",
                                            {user: userId, school: school, approval: "school:league", time: new Date(), data: JSON.stringify(data)});
                                    })
                                    .then(function () {
                                        return transaction.commit();
                                    })
                                    .then(
                                        function () {
                                            connection.complete();
                                            console.log('completed successfully');
                                            callback(null, {stage: 1});
                                        },
                                        function (err) {
                                            transaction.rollback();
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
    });
};

Registration.prototype.getCompetitions = function (user, options, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select s.SPORT_ID as \"Sport\", s.SPORT_NAME as \"SportName\", " +
                        "  c.CHAMPIONSHIP_ID as \"Championship\", c.CHAMPIONSHIP_NAME as \"ChampionshipName\", " +
                        "  cc.CHAMPIONSHIP_CATEGORY_ID as \"ChampionshipCategory\", cc.CATEGORY as \"Category\", " +
                        "  se.[NAME] As \"SeasonName\", cc.DISPLAY_NAME as \"DisplayName\" " +
                        "from CHAMPIONSHIPS as c " +
                        "  join CHAMPIONSHIP_CATEGORIES as cc on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                        "  join SPORTS as s on s.SPORT_ID = c.SPORT_ID and s.DATE_DELETED Is Null " +
                        "  join SCHOOLS as sc on sc.SCHOOL_ID = @school AND (sc.REGION_ID = c.REGION_ID OR c.REGION_ID = 0) and sc.DATE_DELETED Is Null " +
                        "  left join SEASONS se On c.SEASON=se.SEASON And se.DATE_DELETED Is Null " +
                        "where c.SEASON = @season and " +
                        (options && options.league ? "  c.IS_LEAGUE = 1 and " : "") +
                        (options && options.club ? "  c.IS_CLUBS = 1 and " : "") +
                        "  c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL",
                        {school: school, season: currentSeason})
                        .then(
                            function (records) {
                                connection.complete();

                                var result = {
                                    sports: []
                                };

                                var sports = {};

                                for (var i = 0; i < records.length; i++) {
                                    let record = records[i];
                                    var sport = sports[record.Sport];
                                    if (!sport) {
                                        sports[record.Sport] = sport = {
                                            id: record.Sport,
                                            name: record.SportName,
                                            categories: [],
                                            championships: [],
                                            isOnePaymentPerCategory: utils.checkOnePaymentPerCategorySport(record.Sport)
                                        };
                                        result.sports.push(sport);
                                    }
                                    if (sport.championships.find(function(c) { return c.id === record.Championship; }) == null) {
                                        sport.championships.push({
                                            id: record.Championship,
                                            name: record.ChampionshipName
                                        });
                                    }
                                    sport.categories.push({
                                        id: record.ChampionshipCategory,
                                        category: record.Category,
                                        championship: record.Championship,
                                        championshipName: record.ChampionshipName,
                                        name: utils.categoryToString(record.Category),
                                        season: record.SeasonName,
                                        displayName: record.DisplayName
                                    });
                                }
                                //console.log(result);
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
    });
};

Registration.prototype.getClubTeams = function (options, callback) {
    var user = options.user;
    var school = options.school || user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        var season = currentSeason;
        if (options.season)
            season = options.season;
        server.db.connect()
            .then(
                function (connection) {
                    var teams = {};
                    var registrationPrices = {};
                    readTeams(connection, school, {club: true, reg: true, season: season}, teams)
                        .then(function () {
                            return getClubRegistrationPrices(connection, season, registrationPrices);
                        })
                        .then(function() {
                            var streetBallTeams = {};
                            for (var teamId in teams) {
                                if (teams.hasOwnProperty(teamId)) {
                                    var team = teams[teamId];
                                    var sport = team.sport;
                                    var school = team.school.id;
                                    var price = null;
                                    var sportPrices = registrationPrices[sport.toString()] || registrationPrices['0'];
                                    if (sportPrices) {
                                        price = sportPrices[school.toString()] || sportPrices['0'];
                                    }
                                    if (price == 1)
                                        price = 0;
                                    team.price = price;
                                    if (settings.onePaymentPerCategorySports && settings.onePaymentPerCategorySports.indexOf(team.sport) >= 0) {
                                        var key = [team.competition, team.categoryName].join('_');
                                        if (streetBallTeams[key]) {
                                            team.removePayment = true;
                                        } else {
                                            streetBallTeams[key] = true;
                                        }
                                    }
                                }
                            }
                            //console.log(teams);
                            return readTeamPlayers(connection, user, school, {club: true, reg: true, season: season}, teams);
                        })
                        .then(function () {
                                connection.complete();
                                var result = [];
                                for (var key in teams) {
                                    result.push(teams[key]);
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
    });
};

Registration.prototype.getClubTeam = function (user, teamId, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    // console.log(teamId);
                    var teams = {};
                    readTeams(connection, school, {club: true, reg: true, team: teamId, season: currentSeason}, teams)
                        .then(function () {
                            return readTeamPlayers(connection, user, school, {club: true, reg: true, team: teamId, season: currentSeason}, teams);
                        })
                        .then(function () {
                                connection.complete();
                                // console.log(teams);
                                var matchingTeam = null;
                                for (var id in teams) {
                                    var curTeam = teams[id];
                                    if (curTeam.team == teamId) {
                                        matchingTeam = curTeam;
                                        break;
                                    }
                                }
                                callback(null, matchingTeam);
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
    });
};

function getClubRegistrationPrices(connection, season, registrationPrices) {
    return new Promise(function (fulfill, reject) {
        function HandleRecords(records) {
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var sport = record.SportId || 0;
                var school = record.SchoolId || 0;
                var key = sport.toString();
                if (!registrationPrices[key]) {
                    registrationPrices[key] = {};
                }
                registrationPrices[key][school.toString()] = record.Price;
            }
            var defaultPrice = (registrationPrices['0'] || {})['0'] || 0;
            if (defaultPrice) {
                for (var sportId in registrationPrices) {
                    if (registrationPrices.hasOwnProperty(sportId) && sportId !== '0') {
                        if (!registrationPrices[sportId]['0']) {
                            registrationPrices[sportId]['0'] = defaultPrice;
                        }
                    }
                }
            }
            fulfill(registrationPrices);
        }

        connection.request(
            "Select ts.SPORT_ID As \"SportId\", Null As \"SchoolId\", p.PRICE As \"Price\" " +
            "From TOTO_SUPPORT ts Inner Join RegistrationClubProducts rcp On rcp.SportId Is Null And rcp.HasTotoSupport=1 " +
            "   Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
            "Where ts.IS_GLOBAL=1 And rcp.Season=@season " +
            "Union All " +
            "Select ts.SPORT_ID As \"SportId\", ts.SCHOOL_ID As \"SchoolId\", p.PRICE As \"Price\" " +
            "From TOTO_SUPPORT ts Inner Join RegistrationClubProducts rcp On rcp.SportId Is Null And rcp.HasTotoSupport=1 " +
            "   Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
            "Where ts.IS_GLOBAL=0 And ts.SCHOOL_ID Is Not Null And rcp.Season=@season " +
            "Union All " +
            "Select rcp.SportId As \"SportId\", Null As \"SchoolId\", p.PRICE As \"Price\" " +
            "From RegistrationClubProducts rcp Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
            "Where rcp.SportId Is Not Null And rcp.Season=@season " +
            "Union All " +
            "Select Null As \"SportId\", Null As \"SchoolId\", p.PRICE As \"Price\" " +
            "From RegistrationClubProducts rcp Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
            "Where rcp.SportId Is Null And rcp.HasTotoSupport=0 And rcp.Season=@season",
            { season: season}).then(
            function (records) {
                if (records.length > 0) {
                    HandleRecords(records);
                } else {
                    connection.request(
                        "Select ts.SPORT_ID As \"SportId\", Null As \"SchoolId\", p.PRICE As \"Price\" " +
                        "From TOTO_SUPPORT ts Inner Join RegistrationClubProducts rcp On rcp.SportId Is Null And rcp.HasTotoSupport=1 " +
                        "   Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
                        "Where ts.IS_GLOBAL=1 And rcp.Season Is Null " +
                        "Union All " +
                        "Select ts.SPORT_ID As \"SportId\", ts.SCHOOL_ID As \"SchoolId\", p.PRICE As \"Price\" " +
                        "From TOTO_SUPPORT ts Inner Join RegistrationClubProducts rcp On rcp.SportId Is Null And rcp.HasTotoSupport=1 " +
                        "   Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
                        "Where ts.IS_GLOBAL=0 And ts.SCHOOL_ID Is Not Null And rcp.Season Is Null " +
                        "Union All " +
                        "Select rcp.SportId As \"SportId\", Null As \"SchoolId\", p.PRICE As \"Price\" " +
                        "From RegistrationClubProducts rcp Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
                        "Where rcp.SportId Is Not Null And rcp.Season Is Null " +
                        "Union All " +
                        "Select Null As \"SportId\", Null As \"SchoolId\", p.PRICE As \"Price\" " +
                        "From RegistrationClubProducts rcp Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null " +
                        "Where rcp.SportId Is Null And rcp.HasTotoSupport=0 And rcp.Season Is Null",
                        {}).then(
                        function (records) {
                            HandleRecords(records);
                        }, function (err) {
                            reject(err);
                        });
                }
            }, function (err) {
                reject(err);
            });
    });
}

function readTeams(connection, school, options, result) {
    if (!options) {
        options = {};
    }
    if (!options.season) {
        options.season = Season.current(); //failsafe but should not happen
    }
    //t.STATUS
    return new Promise(function (fulfill, reject) {
        var qs = "select tr.Id as \"Id\", t.TEAM_ID as \"Team\", t.STATUS as \"AdminStatus\",  cc.MAX_STUDENT_BIRTHDAY as \"MaxStudentBirthday\", " +
            "  cc.CHAMPIONSHIP_CATEGORY_ID as \"Competition\", s.SPORT_ID as \"Sport\", s.SPORT_NAME as \"SportName\", " +
            "  IsNull(tr.TeamNumber, IsNull(t.TEAM_NUMBER, dbo.GetTeamNumber(t.TEAM_INDEX, ''))) as \"TeamNumber\", " +
            "  tr.School as \"TeamSchool\", " +
            "  sr.CoordinatorName as \"CoordinatorName\", sr.CoordinatorPhoneNumber as \"CoordinatorPhoneNumber\", sr.CoordinatorEmail as \"CoordinatorEmail\", " +
            "  sr.RepresentativeName as \"RepresentativeName\", sr.RepresentativePhoneNumber as \"RepresentativePhoneNumber\", sr.RepresentativeEmail as \"RepresentativeEmail\", " +
            "  sr.TeacherName as \"RegTeacherName\", sr.TeacherPhoneNumber as \"RegTeacherPhoneNumber\", sr.TeacherEmail as \"RegTeacherEmail\", " +
            "  sr.ParentsCommitteeName as \"ParentsCommitteeName\", sr.ParentsCommitteePhoneNumber as \"ParentsCommitteePhoneNumber\", sr.ParentsCommitteeEmail as \"ParentsCommitteeEmail\", " +
            "  sr.StudentsRepresentativeName as \"StudentsRepresentativeName\", sr.StudentsRepresentativePhoneNumber as \"StudentsRepresentativePhoneNumber\", sr.StudentsRepresentativeEmail as \"StudentsRepresentativeEmail\", " +
            "  sr.AssociationRepresentativeName as \"AssociationRepresentativeName\", sr.AssociationRepresentativePhoneNumber as \"AssociationRepresentativePhoneNumber\", sr.AssociationRepresentativeEmail as \"AssociationRepresentativeEmail\", " +
            "  tr.CoachName as \"CoachName\", tr.CoachPhoneNumber as \"CoachPhoneNumber\", tr.CoachEmail as \"CoachEmail\", " +
            "  tr.CoachCertification as \"CoachCertification\", dbo.GetCoachCertifications(tr.Id) As \"CoachCertificationTypes\", " +
            "  tr.CoachSexOffenseClearance as \"CoachSexOffenseClearance\",  cmp.CATEGORY_NAME as \"CategoryName\", " +
            "  tr.CoachHelperName as \"CoachHelperName\", tr.CoachHelperPhoneNumber as \"CoachHelperPhoneNumber\", tr.CoachHelperEmail as \"CoachHelperEmail\", " +
            "  tr.ManagerName as \"ManagerName\", tr.ManagerPhoneNumber as \"ManagerPhoneNumber\", tr.ManagerEmail as \"ManagerEmail\", " +
            "  tr.TeacherName as \"TeacherName\", tr.TeacherPhoneNumber as \"TeacherPhoneNumber\", tr.TeacherEmail as \"TeacherEmail\", " +
            "  tr.Facility as \"Facility\", f.FACILITY_NAME as \"FacilityName\", f.ADDRESS as \"FacilityAddress\", " +
            "  tr.AlternativeFacilityName as \"AlternativeFacilityName\", tr.AlternativeFacilityAddress as \"AlternativeFacilityAddress\", " +
            "  tr.Activity as \"Activity\", tr.HostingHours as \"HostingHours\", tr.Approved as \"Approved\", tr.CreatedAt as \"CreatedAt\", " +
            "  tr.Payment as \"Payment\", IsNull(px.TotalAmount, 0) as \"PaymentAmount\", px.PayerName as \"PaymentPayerName\", " +
            "  0 As PaymentPaidAmount, " +
            "  c.CHAMPIONSHIP_ID as \"ChampionshipId\", c.CHAMPIONSHIP_NAME as \"ChampionshipName\", " +
            "  sc.SYMBOL as \"SchoolSymbol\", cc.DISPLAY_NAME as \"CategoryDisplayName\", " +
            "  sc.SCHOOL_NAME as \"SchoolName\", cit.CITY_ID as \"SchoolCityId\", cit.CITY_NAME as \"SchoolCityName\", " +
            "  sc.REGION_ID as \"SchoolRegion\", scr.REGION_NAME as \"SchoolRegionName\" " +
            (options.reg ? // Registration must exist
                "from TeamRegistrations as tr " +
                "  join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID " +
                "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.DATE_DELETED Is Null and c.SEASON=@season " +
                "  join SchoolRegistrations as sr on tr.School = sr.School" +
                "  join SPORTS as s on s.SPORT_ID = c.SPORT_ID " +
                "  join SCHOOLS as sc on tr.School = sc.SCHOOL_ID " +
                "  join REGIONS scr on scr.REGION_ID=sc.REGION_ID " +
                "  left join CITIES cit on sc.CITY_ID=cit.CITY_ID " +
                "  left join FACILITIES as f on tr.Facility=f.FACILITY_ID and f.DATE_DELETED Is Null " +
                "  left join CATEGORY_MAPPING as cmp on cc.[CATEGORY]=cmp.RAW_CATEGORY " +
                "  left join PaymentRequests as px on tr.Payment=px.Id and px.CancelTime Is Null " +
                "  left outer join TEAMS as t on t.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID and tr.School = t.SCHOOL_ID and tr.Team = t.TEAM_ID and t.DATE_DELETED IS NULL " +
                "where tr.School = @school and sr.Season=@season and "
                : // Team must exist
                "from TEAMS as t " +
                "  join CHAMPIONSHIP_CATEGORIES as cc on t.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID " +
                "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.DATE_DELETED Is Null and c.SEASON=@season " +
                "  join SPORTS as s on s.SPORT_ID = c.SPORT_ID " +
                "  join SCHOOLS as sc on t.SCHOOL_ID = sc.SCHOOL_ID " +
                "  join REGIONS scr on scr.REGION_ID=sc.REGION_ID " +
                "  left join CITIES cit on sc.CITY_ID=cit.CITY_ID " +
                "  left outer join TeamRegistrations as tr on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID and tr.School = t.SCHOOL_ID and tr.Team = t.TEAM_ID " +
                "  left outer join SchoolRegistrations as sr on tr.School = sr.School and sr.Season=@season " +
                "  left join FACILITIES as f On tr.Facility=f.FACILITY_ID and f.DATE_DELETED Is Null " +
                "  left join CATEGORY_MAPPING as cmp On cc.[CATEGORY]=cmp.RAW_CATEGORY " +
                "  left join PaymentRequests as px on tr.Payment=px.Id and px.CancelTime Is Null " +
                "where t.SCHOOL_ID = @school and t.DATE_DELETED IS NULL and c.SEASON = @season and ") +
            (options.league ? " c.IS_LEAGUE = 1 and " : "") +
            (options.club ? " c.IS_CLUBS = 1 and " : "") +
            (options.team != null ? " t.TEAM_ID = @team and " : "") +
            (options.id != null ? " tr.Id = @id and " : "") +
            "  c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL";
        //console.log('school: ' + school);
        var queryParams = {
            school: school,
            season: options.season,
            team: options.team,
            id: options.id
        };
        //console.log(qs);
        //console.log(queryParams);
        connection.request(
            qs, queryParams)
            .then(
                function (records) {
                    for (var i = 0; i < records.length; i++) {
                        var record = records[i];

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
                        var hostingHours;
                        if (record.HostingHours != null) {
                            try {
                                hostingHours = JSON.parse(record.HostingHours);
                            } catch (e) {
                                hostingHours = [];
                            }
                        } else {
                            hostingHours = [];
                        }
                        var certificationTypes = [];
                        if (record.CoachCertificationTypes && record.CoachCertificationTypes.length > 0)
                            certificationTypes = record.CoachCertificationTypes.split(',')
                        var team = {
                            id: record.Id,
                            sport: record.Sport,
                            sportName: record.SportName,
                            categoryName: record.CategoryName,
                            championship: {
                                id: record.ChampionshipId,
                                name: record.ChampionshipName
                            },
                            school: {
                                id: record.TeamSchool,
                                name: record.SchoolName,
                                region: record.SchoolRegion,
                                regionName: record.SchoolRegionName,
                                cityId: record.SchoolCityId,
                                cityName: record.SchoolCityName
                            },
                            competition: record.Competition,
                            hasTotoSupport: utils.checkHasTotoSupport(record.Sport, record.SchoolSymbol),
                            team: record.Team,
                            teamNumber: record.TeamNumber,
                            active: record.TeamNumber != null,
                            coach: {
                                name: record.CoachName,
                                phoneNumber: record.CoachPhoneNumber,
                                email: record.CoachEmail,
                                certification: record.CoachCertification,
                                certificationTypes: certificationTypes,
                                sexOffenseClearance: record.CoachSexOffenseClearance
                            },
                            coachHelper: {
                                name: record.CoachHelperName,
                                phoneNumber: record.CoachHelperPhoneNumber,
                                email: record.CoachHelperEmail
                            },
                            manager: {
                                name: record.ManagerName,
                                phoneNumber: record.ManagerPhoneNumber,
                                email: record.ManagerEmail
                            },
                            teacher: {
                                name: record.TeacherName,
                                phoneNumber: record.TeacherPhoneNumber,
                                email: record.TeacherEmail
                            },
                            facility: record.Facility,
                            facilityName: record.FacilityName,
                            facilityAddress: record.FacilityAddress,
                            facilityAlternative: {
                                name: record.AlternativeFacilityName,
                                address: record.AlternativeFacilityAddress
                            },
                            activity: activity,
                            hostingHours: hostingHours,
                            approved: record.Approved ? parseInt(record.Approved) : 0,
                            createdAt: record.CreatedAt,
                            payment: record.Payment,
                            paymentAmount: record.PaymentAmount,
                            paymentPayerName: record.PaymentPayerName,
                            paymentPaidAmount: record.PaymentPaidAmount,
                            players: [],
                            maxStudentBirthday: record.MaxStudentBirthday,
                            adminStatus: record.AdminStatus,
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
                            }
                        };
                        //console.log(team.coach);
                        if (options.reg) {
                            result[team.id] = team;
                        }
                        else {
                            result[team.team] = team;
                        }
                    }
                    fulfill(result);
                },
                function (err) {
                    reject(err);
                });
    });
}

function readTeamPlayers(connection, user, school, options, teams) {
    if (!options) {
        options = {};
    }
    if (!options.season) {
        options.season = Season.current(); //failsafe but should not happen
    }
    var activeSeason = options.season; //Season.active(user);
    return new Promise(function (fulfill, reject) {
        var qs = 'Select ';
        var filters = [];
        if (options.league)
            filters.push('c.IS_LEAGUE=1');
        if (options.club)
            filters.push('c.IS_CLUBS=1');
        if (options.team != null || options.id != null)
            filters.push('(t.TEAM_ID=@team Or tr.Id=@id)');
        qs = "Select tr.Id As \"Id\", " +
            "   t.TEAM_ID As \"Team\", " +
            "   pr.Student As \"Student\", " +
            "   s.ID_NUMBER As \"IdNumber\", " +
            "   s.FIRST_NAME As \"FirstName\", " +
            "   s.LAST_NAME As \"LastName\", " +
            "   s.BIRTH_DATE As \"BirthDate\", " +
            "   s.GRADE As \"Grade\", " +
            "   s.SEX_TYPE As \"Gender\", " +
            "   p.[STATUS] As \"Status\", " +
            "   p.TEAM_NUMBER As \"ShirtNumber\", " +
            "   pr.[CreatedAt] As \"CreatedAt\", " +
            "   sdp.[DeletedAt] As \"DeletedAt\", " +
            "   0 As \"Sportsman\" " +
            "From PlayerRegistrations pr " +
            "  Join TeamRegistrations tr on tr.Id = pr.Team " +
            "  Join STUDENTS s on s.STUDENT_ID = pr.Student and s.SCHOOL_ID = tr.School And s.DATE_DELETED Is Null " +
            "  Join CHAMPIONSHIP_CATEGORIES cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID and cc.DATE_DELETED IS NULL " +
            "  Join CHAMPIONSHIPS c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.DATE_DELETED IS NULL " +
            "  Left outer join TEAMS t on tr.Team = t.TEAM_ID and t.DATE_DELETED is null " +
            "  Left outer join PLAYERS p on p.TEAM_ID = tr.Team and p.STUDENT_ID = pr.Student And p.DATE_DELETED Is Null " +
            "  Left outer join SchoolDeletedPlayers sdp on tr.Team=sdp.Team and p.PLAYER_ID=sdp.Player " +
            "Where tr.School=@school And c.SEASON=@season";
        if (filters.length > 0)
            qs += ' And ' + filters.join(' And ');
        qs += " Union All " +
            "Select tr.Id As \"Id\", " +
            "   t.TEAM_ID As \"Team\", " +
            "   p.STUDENT_ID As \"Student\", " +
            "   s.ID_NUMBER As \"IdNumber\", " +
            "   s.FIRST_NAME As \"FirstName\", " +
            "   s.LAST_NAME As \"LastName\", " +
            "   s.BIRTH_DATE As \"BirthDate\", " +
            "   s.GRADE As \"Grade\", " +
            "   s.SEX_TYPE As \"Gender\", " +
            "   p.[STATUS] As \"Status\", " +
            "   p.TEAM_NUMBER As \"ShirtNumber\", " +
            "   p.REGISTRATION_DATE As \"CreatedAt\", " +
            "   sdp.[DeletedAt] As \"DeletedAt\", " +
            "   1 As \"Sportsman\" " +
            "From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null " +
            "   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED IS NULL " +
            "   Inner Join CHAMPIONSHIPS c On c.CHAMPIONSHIP_ID=cc.CHAMPIONSHIP_ID And c.DATE_DELETED IS NULL " +
            "   Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID And s.DATE_DELETED Is Null " +
            "   Left Join TeamRegistrations tr On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And tr.School=s.SCHOOL_ID And tr.Team=t.TEAM_ID " +
            "   Left Join PlayerRegistrations pr On pr.Team=tr.Id And pr.Student=s.STUDENT_ID " +
            "   Left Outer Join SchoolDeletedPlayers sdp On sdp.Team=t.TEAM_ID And sdp.Player=p.PLAYER_ID " +
            "   Left Outer Join ActionLog al1 On al1.ActionType=4 And al1.UserId=@user And al1.EntityName='PlayerRegistrations' " +
            "       And al1.Value1=tr.Id And al1.Value2=s.STUDENT_ID And al1.Value3=s.SCHOOL_ID " +
            "   Left Outer Join ActionLog al2 On al2.ActionType=4 And al2.UserId=@user And al2.EntityName='PlayerRegistrations' " +
            "       And al2.Value1=t.TEAM_ID And al2.Value2=s.STUDENT_ID And al2.Value3=s.SCHOOL_ID " +
            "Where p.DATE_DELETED Is Null And pr.Student Is Null And al1.Id Is Null And al2.Id Is Null And s.SCHOOL_ID=@school And c.SEASON=@season";
        if (filters.length > 0)
            qs += ' And ' + filters.join(' And ');
        var queryParams = {
            school: school,
            season: options.season,
            team: options.team,
            id: options.id,
            user: user.id
        };
        //console.log(qs);
        //console.log(queryParams);
        connection.request(qs, queryParams).then(function (records) {
            //console.log(teams);
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var team = options.reg ? teams[record.Id] : teams[record.Team];
                if (team) {
                    team.players.push({
                        student: record.Student,
                        idNumber: record.IdNumber,
                        firstName: record.FirstName,
                        lastName: record.LastName,
                        birthDate: record.BirthDate,
                        shirtNumber: record.ShirtNumber,
                        grade: activeSeason - parseInt(record.Grade),
                        gender: record.Gender,
                        status: record.Status,
                        createdAt: record.CreatedAt,
                        deletedAt: record.DeletedAt,
                        sportsman: record.Sportsman
                    });
                }
            }
            fulfill();
        }, function (err) {
            reject(err);
        });
    });
}

Registration.prototype.getLeagueTeams = function (user, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    var teams = {};
                    readTeams(connection, school, {league: true, season: currentSeason}, teams)
                        .then(function () {
                            return readTeamPlayers(connection, user, school, {league: true, season: currentSeason}, teams);
                        })
                        .then(function () {
                                connection.complete();
                                var result = [];
                                for (var key in teams) {
                                    result.push(teams[key]);
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
    });
};

Registration.prototype.getLeagueTeam = function (user, teamId, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    var teams = {};
                    readTeams(connection, school, {league: true, team: teamId, season: currentSeason}, teams)
                        .then(function () {
                            return readTeamPlayers(connection, user, school, {league: true, team: teamId, season: currentSeason}, teams);
                        })
                        .then(function () {
                                connection.complete();
                                //console.log(teams);
                                callback(null, teams[teamId]);
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
    });
};

Registration.prototype.insertClubTeam = function (school, team, callback) {
    var service = this;
    service.db.connect()
        .then(
            function (connection) {
                connection.request("select SYMBOL as \"Symbol\" from SCHOOLS where SCHOOL_ID = @school", {school: school})
                    .then(
                        function (records) {
                            team.hasTotoSupport = utils.checkHasTotoSupport(team.sport, records.length > 0 ? records[0].Symbol : "");
                            return connection.request("select max(Id) as \"MaxId\" from TeamRegistrations");
                        })
                    .then(
                        function (records) {
                            return records[0].MaxId;
                        })
                    .then(
                        function (lastTeamId) {
                            var createdAt = new Date();
                            var teamId = lastTeamId == null ? 1 : lastTeamId + 1;
                            connection.request(
                                "insert into TeamRegistrations(Id, School, Competition, TeamNumber, CoachName, CoachPhoneNumber, CoachEmail, " +
                                "  CoachCertification, CoachSexOffenseClearance, Facility, Activity, HostingHours, CreatedAt, Approved) " +
                                "values(@id, @school, @competition, @teamNumber, @coachName, @coachPhoneNumber, @coachEmail, " +
                                "  @coachCertification, @coachSexOffenseClearance, @facility, @activity, @hosting, @createdAt, 0)",
                                {
                                    school: school,
                                    id: teamId,
                                    competition: team.competition,
                                    teamNumber: team.teamNumber,
                                    coachName: team.coach.name,
                                    coachPhoneNumber: team.coach.phoneNumber,
                                    coachEmail: team.coach.email,
                                    coachCertification: team.coach.certification,
                                    coachSexOffenseClearance: team.coach.sexOffenseClearance,
                                    facility: team.facility,
                                    activity: team.activity == null ? "[]" : JSON.stringify(team.activity),
                                    hosting: team.hostingHours == null ? "[]" : JSON.stringify(team.hostingHours),
                                    createdAt: createdAt
                                })
                                .then(
                                    function () {
                                        var certificationTypes = team.coach.certificationTypes || [];
                                        insertSingleCertificationType(connection, teamId, certificationTypes,
                                            0, function(err, result) {
                                                connection.complete();
                                                if (err) {
                                                    callback(err);
                                                } else {
                                                    callback(null, {
                                                        id: teamId,
                                                        hasTotoSupport: team.hasTotoSupport,
                                                        createdAt: createdAt
                                                    });
                                                }
                                        });
                                    },
                                    function (err) {
                                        connection.complete();
                                        callback(err);
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

Registration.prototype.updateClubTeam = function (school, id, team, callback) {
    var server = this;
    server.db.connect()
        .then(
            function (connection) {
                var qs = "select SYMBOL as \"Symbol\" from SCHOOLS where SCHOOL_ID = @school";
                var queryParams = {
                    school: school
                };
                connection.request(qs, queryParams).then(function (records) {
                    team.hasTotoSupport = utils.checkHasTotoSupport(team.sport, records.length > 0 ? records[0].Symbol : "");
                    qs = "update TeamRegistrations " +
                        "set Competition = @competition, " +
                        "  TeamNumber = @teamNumber, " +
                        "  CoachName = @coachName, " +
                        "  CoachPhoneNumber = @coachPhoneNumber, " +
                        "  CoachEmail = @coachEmail, " +
                        "  CoachCertification = @coachCertification, " +
                        "  CoachSexOffenseClearance = @coachSexOffenseClearance, " +
                        "  Facility = @facility, " +
                        "  Activity = @activity, " +
                        "  HostingHours = @hosting, " +
                        "  Approved = 0 " +
                        "where Id = @id and School = @school";
                    queryParams = {
                        school: school,
                        id: id,
                        competition: team.competition,
                        teamNumber: team.teamNumber,
                        coachName: team.coach.name,
                        coachPhoneNumber: team.coach.phoneNumber,
                        coachEmail: team.coach.email,
                        coachCertification: team.coach.certification,
                        coachSexOffenseClearance: team.coach.sexOffenseClearance,
                        facility: team.facility,
                        activity: team.activity == null ? "[]" : JSON.stringify(team.activity),
                        hosting: team.hostingHours == null ? "[]" : JSON.stringify(team.hostingHours)
                    };
                    return connection.request(qs,queryParams);
                }).then(function () {
                    qs = 'Delete From RegistrationCoachCertifications Where TeamId=@id';
                    queryParams = {
                        id: id
                    };
                    return connection.request(qs,queryParams);
                }, function (err) {
                    connection.complete();
                    callback(err);
                }).then(function() {
                    var certificationTypes = team.coach.certificationTypes || [];
                    insertSingleCertificationType(connection, id, certificationTypes,
                        0, function(err, result) {
                            connection.complete();
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, {hasTotoSupport: team.hasTotoSupport});
                            }
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

Registration.prototype.deleteClubTeam = function (school, id, callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select Competition, Team From TeamRegistrations Where Id = @id And School = @school';
        var queryParams = {
            school: school,
            id: id
        };
        connection.request(qs, queryParams).then(function (records) {
            if (records != null && records.length > 0) {
                var record = records[0];
                var categoryId = record['Competition'];
                var teamId = record['Team'];
                qs = "delete from TeamRegistrations " +
                    "where Id = @id and School = @school";
                //console.log(qs);
                //console.log(queryParams);
                //callback();
                connection.request(qs, queryParams).then(function () {
                    qs = 'Select [USER_ID] From USERS Where DATE_DELETED Is Null And USER_TYPE=2 And SCHOOL_ID=@school';
                    connection.request(qs, {school: school}).then(function (records) {
                        if (records != null && records.length === 1) {
                            var userId = records[0]['USER_ID'];
                            var actionType = 4; //delete
                            var entityName = 'TeamRegistrations';
                            qs = 'Insert Into ActionLog (Id, ActionType, UserId, EntityName, EntityId, Value1, Value2, Value3) ' +
                                '(' +
                                '   Select IsNull(Max(Id), 0)+1, @type, @user, @name, @id, @value1, @value2, @value3 ' +
                                '   From ActionLog' +
                                ')';
                            var actionParams = {
                                type: actionType,
                                user: userId,
                                name: entityName,
                                id: id,
                                value1: school,
                                value2: categoryId,
                                value3: teamId
                            };
                            connection.request(qs, actionParams).then(function (records) {
                                connection.complete();
                                callback();
                            }, function (err) {
                                logger.error(category, "error inserting into action log: " + (err.message || err));
                                connection.complete();
                                callback();
                            });
                        } else {
                            connection.complete();
                            callback();
                        }
                    }, function (err) {
                        logger.error(category, "error reading school user: " + (err.message || err));
                        connection.complete();
                        callback();
                    });
                }, function (err) {
                    connection.complete();
                    callback(err);
                });
            } else {
                connection.complete();
                callback('team was not found');
            }
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Registration.prototype.generateApprovalLogins = function (user, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        generatePrincipalApprovalLogin(server.db, school, currentSeason);
        generateRepresentativeApprovalLogin(server.db, school, currentSeason);
        //console.log('generating approval logins');
        //console.log(school);
        callback();
    });
};

Registration.prototype.insertLeagueTeam = function (user, team, callback) {
    var service = this;
    var school = user.schoolID;
    Season.current(user, function(currentSeason) {
        service.db.connect()
            .then(
                function (connection) {
                    connection.request("select max(Id) as \"MaxId\" from TeamRegistrations")
                        .then(
                            function (records) {
                                return records[0].MaxId;
                            }
                        )
                        .then(
                            function (lastTeamId) {
                                var createdAt = new Date();
                                var teamId = lastTeamId == null ? 1 : lastTeamId + 1;
                                connection.request(
                                    "insert into TeamRegistrations(Id, Team, School, Competition, TeamNumber, " +
                                    "  CoachName, CoachPhoneNumber, CoachEmail, CoachCertification, " +
                                    "  CoachHelperName, CoachHelperPhoneNumber, CoachHelperEmail, " +
                                    "  ManagerName, ManagerPhoneNumber, ManagerEmail, " +
                                    "  TeacherName, TeacherPhoneNumber, TeacherEmail, " +
                                    "  Facility, AlternativeFacilityName, AlternativeFacilityAddress, " +
                                    "  Activity, CreatedAt, Approved) " +
                                    "select @id, @team, @school, CHAMPIONSHIP_CATEGORY_ID, @teamNumber, " +
                                    "  @coachName, @coachPhoneNumber, @coachEmail, @coachCertification, " +
                                    "  @coachHelperName, @coachHelperPhoneNumber, @coachHelperEmail, " +
                                    "  @managerName, @managerPhoneNumber, @managerEmail, " +
                                    "  @teacherName, @teacherPhoneNumber, @teacherEmail, " +
                                    "  @facility, @alternativeFacilityName, @alternativeFacilityAddress, " +
                                    "  @activity, @createdAt, @approved " +
                                    "from TEAMS " +
                                    "where TEAM_ID = @team",
                                    {
                                        school: school,
                                        id: teamId,
                                        team: team.team,
                                        teamNumber: team.active ? "1": null,
                                        coachName: team.coach.name,
                                        coachPhoneNumber: team.coach.phoneNumber,
                                        coachEmail: team.coach.email,
                                        coachCertification: team.coach.certification,
                                        coachHelperName: team.coachHelper.name,
                                        coachHelperPhoneNumber: team.coachHelper.phoneNumber,
                                        coachHelperEmail: team.coachHelper.email,
                                        managerName: team.manager.name,
                                        managerPhoneNumber: team.manager.phoneNumber,
                                        managerEmail: team.manager.email,
                                        teacherName: team.teacher.name,
                                        teacherPhoneNumber: team.teacher.phoneNumber,
                                        teacherEmail: team.teacher.email,
                                        facility: team.facility,
                                        alternativeFacilityName: team.facilityAlternative ? team.facilityAlternative.name : null,
                                        alternativeFacilityAddress: team.facilityAlternative ? team.facilityAlternative.address : null,
                                        activity: team.activity == null ? "[]" : JSON.stringify(team.activity),
                                        createdAt: createdAt,
                                        approved: team.active ? 1 : 0
                                    })
                                    .then(
                                        function () {
                                            connection.complete();
                                            //console.log('active? ' + team.active);
                                            if (team.active) {
                                                generatePrincipalApprovalLogin(service.db, school, currentSeason);
                                                generateRepresentativeApprovalLogin(service.db, school, currentSeason);
                                            }

                                            callback(null, {id: teamId, createdAt: createdAt, stage: 2});
                                        },
                                        function (err) {
                                            connection.complete();
                                            callback(err);
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
    });
};

Registration.prototype.updateLeagueTeam = function (userId, school, id, team, callback) {
    var service = this;
    Season.current({id: userId, username: ''}, function(currentSeason) {
        service.db.connect()
            .then(
                function (connection) {
                    connection.transaction()
                        .then(
                            function (transaction) {
                                transaction.request(
                                    "update TeamRegistrations " +
                                    "set TeamNumber = @teamNumber, " +
                                    "  CoachName = @coachName, " +
                                    "  CoachPhoneNumber = @coachPhoneNumber, " +
                                    "  CoachEmail = @coachEmail, " +
                                    "  CoachCertification = @coachCertification, " +
                                    "  CoachHelperName = @coachHelperName, " +
                                    "  CoachHelperPhoneNumber = @coachHelperPhoneNumber, " +
                                    "  CoachHelperEmail = @coachHelperEmail, " +
                                    "  ManagerName = @managerName, " +
                                    "  ManagerPhoneNumber = @managerPhoneNumber, " +
                                    "  ManagerEmail = @managerEmail, " +
                                    "  TeacherName = @teacherName, " +
                                    "  TeacherPhoneNumber = @teacherPhoneNumber, " +
                                    "  TeacherEmail = @teacherEmail, " +
                                    "  Facility = @facility, " +
                                    "  AlternativeFacilityName = @alternativeFacilityName, " +
                                    "  AlternativeFacilityAddress = @alternativeFacilityAddress, " +
                                    "  Activity = @activity, " +
                                    "  HostingHours = @hosting, " +
                                    "  Approved = @approved " +
                                    "where Id = @id and School = @school",
                                    {
                                        school: school,
                                        id: id,
                                        teamNumber: team.active ? "1" : null,
                                        coachName: team.coach.name,
                                        coachPhoneNumber: team.coach.phoneNumber,
                                        coachEmail: team.coach.email,
                                        coachCertification: team.coach.certification,
                                        coachHelperName: team.coachHelper.name,
                                        coachHelperPhoneNumber: team.coachHelper.phoneNumber,
                                        coachHelperEmail: team.coachHelper.email,
                                        managerName: team.manager.name,
                                        managerPhoneNumber: team.manager.phoneNumber,
                                        managerEmail: team.manager.email,
                                        teacherName: team.teacher.name,
                                        teacherPhoneNumber: team.teacher.phoneNumber,
                                        teacherEmail: team.teacher.email,
                                        facility: team.facility,
                                        alternativeFacilityName: team.facilityAlternative ? team.facilityAlternative.name : null,
                                        alternativeFacilityAddress: team.facilityAlternative ? team.facilityAlternative.address : null,
                                        activity: team.activity == null ? "[]" : JSON.stringify(team.activity),
                                        hosting: team.hostingHours == null ? "[]" : JSON.stringify(team.hostingHours),
                                        approved: team.active ? 1 : 0
                                    })
                                    .then(function () {
                                        if (team.active) {
                                            return transaction.request(
                                                "insert into Approvals(UserId, Approval, Item, Time) " +
                                                "values(@user, @approval, @team, @time) ",
                                                {user: userId, team: id, approval: "team:1", time: new Date()});
                                        }
                                        else {
                                            return Promise.resolve();
                                        }
                                    })
                                    .then(function () {
                                        return transaction.commit();
                                    })
                                    .then(
                                        function (records) {
                                            connection.complete();

                                            if (team.active && !team.confirmedAt) {
                                                // do not send new login when details already confirmed once.
                                                generatePrincipalApprovalLogin(service.db, school, currentSeason);
                                                generateRepresentativeApprovalLogin(service.db, school, currentSeason);
                                            }

                                            callback(null, {stage: 2});
                                        },
                                        function (err) {
                                            transaction.rollback();
                                            connection.complete();
                                            callback(err);
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
    });
};

Registration.prototype.approveClubTeams = function (userId, school, approval, callback, rawUserObject, teamIds) {
    var service = this;
    var userObject = {
        id: userId,
        schoolID: school,
        username: ''
    };
    Registration.prototype.getClubRegistrationStage(userObject, function(err, result) {
        if (err) {
            callback(err);
            return;
        }
        var currentStage = result.stage;
        if (currentStage == null)
            currentStage = 0;
        var nextStage = currentStage <= 2 ? 2 : currentStage;
        Season.current(userObject, function(currentSeason) {
            var teams = [];
            if (typeof rawUserObject === 'undefined') {
                rawUserObject = null;
            }
            if (typeof teamIds === 'undefined') {
                teamIds = [];
            }
            service.db.connect()
                .then(
                    function (connection) {
                        connection.transaction()
                            .then(
                                function (transaction) {
                                    transaction.request(
                                        "select Id as \"Id\" " +
                                        "from TeamRegistrations " +
                                        "where School = @school and " +
                                        "  (Approved is null or (Approved & @approval) = 0) and " +
                                        "  Competition in ( " +
                                        "    select CHAMPIONSHIP_CATEGORY_ID " +
                                        "    from CHAMPIONSHIP_CATEGORIES as cc " +
                                        "      join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.IS_CLUBS = 1 and c.SEASON = @season " +
                                        "    where cc.DATE_DELETED IS NULL and c.DATE_DELETED IS NULL) ",
                                        {school: school, season: currentSeason, approval: approval})
                                        .then(function (records) {
                                            if (records.length > 0) {
                                                teams = records.map(function (x) {
                                                    return x.Id;
                                                });
                                                teams = teams.filter(function(id) {
                                                    return (teamIds.length === 0) || (teamIds.length > 0 && teamIds.indexOf(id) >= 0);
                                                });
                                                if (teams.length > 0) {
                                                    return transaction.request(
                                                        "update TeamRegistrations " +
                                                        "set Approved = IsNull(Approved, 0) | @approval " +
                                                        "where School = @school and Id in (" + teams.join(", ") + ")",
                                                        {school: school, approval: approval});
                                                } else {
                                                    return Promise.resolve();
                                                }
                                            }
                                            else {
                                                return Promise.resolve();
                                            }
                                        })
                                        .then(function () {
                                            if (teams.length > 0) {
                                                if ((typeof userId === 'undefined' || userId == null) && rawUserObject) {
                                                    var userRole = rawUserObject.roles && rawUserObject.roles.length > 0 ? rawUserObject.roles[0].split('-')[0] : '';
                                                    var clonedUserObject = {};
                                                    for (var field in rawUserObject) {
                                                        if (rawUserObject.hasOwnProperty(field)) {
                                                            clonedUserObject[field] = rawUserObject[field];
                                                        }
                                                    }
                                                    clonedUserObject.teams = teams;
                                                    return transaction.request(
                                                        "insert into Approvals(UserId, Approval, Item, Time, [Data]) " +
                                                        "values (0, @approval, @school, @time, @data)",
                                                        {
                                                            approval: userRole + ":" + approval,
                                                            school: school,
                                                            time: new Date(),
                                                            data: JSON.stringify(clonedUserObject)
                                                        });
                                                } else {
                                                    return transaction.request(
                                                        "insert into Approvals(UserId, Approval, Item, Time) " +
                                                        "select @user, @approval, Id, @time " +
                                                        "from TeamRegistrations " +
                                                        "where School = @school and Id in (" + teams.join(", ") + ")",
                                                        {
                                                            user: userId,
                                                            school: school,
                                                            approval: "team:" + approval,
                                                            time: new Date()
                                                        });
                                                }
                                            }
                                            else {
                                                return Promise.resolve();
                                            }
                                        })
                                        .then(function () {
                                            return transaction.commit();
                                        })
                                        .then(function (records) {
                                                connection.complete();
                                                callback(null, {stage: nextStage});
                                            },
                                            function (err) {
                                                transaction.rollback();
                                                connection.complete();
                                                callback(err);
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
        });
    }, service);
};

function generatePrincipalApprovalLogin(db, school, season) {
    db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select sr.School as \"School\", s.REGION_ID as \"Region\", " +
                    "  sr.PrincipalName as \"PrincipalName\", sr.PrincipalPhoneNumber as \"PrincipalPhoneNumber\", " +
                    "  sr.PrincipalEmail as \"PrincipalEmail\", " +
                    "  count(*) as \"Count\" " +
                    "from TeamRegistrations as tr " +
                    "  join SchoolRegistrations as sr on tr.School = sr.School and sr.Season = @season " +
                    "  join SCHOOLS as s on sr.School = s.SCHOOL_ID " +
                    "where sr.Season=@season and sr.School = @school and " + //(Approved & 3) = 1 and
                    "  TeamNumber is not null and " +
                    "  Competition in ( " +
                    "    select CHAMPIONSHIP_CATEGORY_ID " +
                    "    from CHAMPIONSHIP_CATEGORIES as cc " +
                    "      join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.SEASON = @season " + // and c.IS_LEAGUE = 1
                    "    where cc.DATE_DELETED IS NULL and c.DATE_DELETED IS NULL) " +
                    "group by sr.School, s.REGION_ID, sr.PrincipalName, sr.PrincipalPhoneNumber, sr.PrincipalEmail",
                    {school: school, season: season})
                    .then(
                        function (records) {
                            connection.complete();
                            if (records.length > 0) {
                                var record = records[0];
                                var phoneNumber = record.PrincipalPhoneNumber ? record.PrincipalPhoneNumber.split('-').join("") : "";
                                if (record.Count > 0 && phoneNumber.length > 0 &&
                                    record.PrincipalEmail && record.PrincipalEmail.length > 0) {
                                    // There are teams for principal approval and principal details - generating login
                                    Access.generateLogin(phoneNumber,
                                        "principal-" + school + "-" + season,
                                        record.PrincipalEmail, {
                                            displayName: record.PrincipalName,
                                            username: record.Email,
                                            schoolID: record.School,
                                            regionID: record.Region,
                                            defaultRoute: 'principal-approval/teams',
                                            roles: ['principal-approval']
                                        },
                                        function (err) {
                                            if (err) {
                                                logger.error(category, "Failed to create principal approval login: " + err);
                                            }
                                        });
                                } else {
                                    if (record.Count == 0) {
                                        logger.error(category, "generate principal approval login failed: zero count for school " + school + " in season " + season);
                                    }
                                    if (phoneNumber.length === 0) {
                                        logger.error(category, "generate principal approval login failed: no phone number for school " + school + " in season " + season);
                                    }
                                    if (!record.PrincipalEmail || record.PrincipalEmail.length === 0) {
                                        logger.error(category, "generate principal approval login failed: no principal email for school " + school + " in season " + season);
                                    }
                                }
                            } else {
                                logger.error(category, "generate principal approval login failed: no records for school " + school + " in season " + season);
                            }
                        },
                        function (err) {
                            logger.error(category, "Error generating principal approval login: " + err);
                            connection.complete();
                        });
            },
            function (err) {
                logger.error(category, "Error generating principal approval login: " + err);
            })
}

function generateRepresentativeApprovalLogin(db, school, season) {
    db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select sr.School as \"School\", s.REGION_ID as \"Region\", " +
                    "  sr.RepresentativeName as \"RepresentativeName\", sr.RepresentativePhoneNumber as \"RepresentativePhoneNumber\", " +
                    "  sr.RepresentativeEmail as \"RepresentativeEmail\", " +
                    "  count(*) as \"Count\" " +
                    "from TeamRegistrations as tr " +
                    "  join SchoolRegistrations as sr on tr.School = sr.School and sr.Season = @season " +
                    "  join SCHOOLS as s on sr.School = s.SCHOOL_ID " +
                    "where sr.Season=@season and sr.School = @school and " + //(Approved & 5) = 1 and
                    "  TeamNumber is not null and " +
                    "  Competition in ( " +
                    "    select CHAMPIONSHIP_CATEGORY_ID " +
                    "    from CHAMPIONSHIP_CATEGORIES as cc " +
                    "      join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.SEASON = @season " + // and c.IS_LEAGUE = 1
                    "    where cc.DATE_DELETED IS NULL and c.DATE_DELETED IS NULL) " +
                    "group by sr.School, s.REGION_ID, sr.RepresentativeName, sr.RepresentativePhoneNumber, sr.RepresentativeEmail",
                    {school: school, season: season})
                    .then(
                        function (records) {
                            connection.complete();
                            if (records.length > 0) {
                                var record = records[0];
                                var phoneNumber = record.RepresentativePhoneNumber ? record.RepresentativePhoneNumber.split('-').join("") : "";
                                if (record.Count > 0 && phoneNumber.length > 0 &&
                                    record.RepresentativeEmail && record.RepresentativeEmail.length > 0) {
                                    // There are teams for representative approval and representative details - generating login
                                    Access.generateLogin(phoneNumber,
                                        "representative-" + school + "-" + season,
                                        record.RepresentativeEmail, {
                                            displayName: record.RepresentativeName,
                                            username: record.Email,
                                            schoolID: record.School,
                                            regionID: record.Region,
                                            defaultRoute: 'representative-approval/teams',
                                            roles: ['representative-approval']
                                        },
                                        function (err) {
                                            if (err) {
                                                logger.error(category, "Failed to create representative approval login: " + err);
                                            }
                                        });
                                }
                            }
                        },
                        function (err) {
                            logger.error(category, "Error generating representative approval login: " + err);
                            connection.complete();
                        });
            },
            function (err) {
                logger.error(category, "Error generating representative approval login: " + err);
            })
}

Registration.prototype.approveLeagueTeams = function (userId, school, approval, callback, rawUserObject, teamIds) {
    var service = this;
    Season.current({id: userId, username: ''}, function(currentSeason) {
        var teams = [];
        if (typeof rawUserObject === 'undefined') {
            rawUserObject = null;
        }
        if (typeof teamIds === 'undefined') {
            teamIds = [];
        }
        service.db.connect()
            .then(
                function (connection) {
                    connection.transaction()
                        .then(
                            function (transaction) {
                                transaction.request(
                                    "select Id as \"Id\" " +
                                    "from TeamRegistrations " +
                                    "where School = @school and " +
                                    "  (Approved is null or (Approved & @approval) = 0) and " +
                                    "  TeamNumber is not null and " +
                                    "  Competition in ( " +
                                    "    select CHAMPIONSHIP_CATEGORY_ID " +
                                    "    from CHAMPIONSHIP_CATEGORIES as cc " +
                                    "      join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.IS_LEAGUE = 1 and c.SEASON = @season " +
                                    "    where cc.DATE_DELETED IS NULL and c.DATE_DELETED IS NULL) ",
                                    {school: school, season: currentSeason, approval: approval})
                                    .then(function (records) {
                                        if (records.length > 0) {
                                            teams = records.map(function (x) {
                                                return x.Id;
                                            });
                                            teams = teams.filter(function(id) {
                                                return (teamIds.length === 0) || (teamIds.length > 0 && teamIds.indexOf(id) >= 0);
                                            });
                                            if (teams.length > 0) {
                                                return transaction.request(
                                                    "update TeamRegistrations " +
                                                    "set Approved = Approved | @approval " +
                                                    "where School = @school and Id in (" + teams.join(", ") + ")",
                                                    {school: school, approval: approval});
                                            } else {
                                                return Promise.resolve();
                                            }
                                        }
                                        else {
                                            return Promise.resolve();
                                        }
                                    })
                                    .then(function () {
                                        if (teams.length > 0) {
                                            // console.log('user: ' + userId);
                                            if ((typeof userId === 'undefined' || userId == null) && rawUserObject) {
                                                var clonedUserObject = {};
                                                for (var field in rawUserObject) {
                                                    if (rawUserObject.hasOwnProperty(field)) {
                                                        clonedUserObject[field] = rawUserObject[field];
                                                    }
                                                }
                                                clonedUserObject.teams = teams;
                                                return transaction.request(
                                                    "insert into Approvals(UserId, Approval, Item, Time, [Data]) " +
                                                    "values (0, @approval, @school, @time, @data)",
                                                    {
                                                        approval: rawUserObject.roles[0].split('-')[0] + ":" + approval,
                                                        school: school,
                                                        time: new Date(),
                                                        data: JSON.stringify(clonedUserObject)
                                                    });
                                            } else {
                                                return transaction.request(
                                                    "insert into Approvals(UserId, Approval, Item, Time) " +
                                                    "select @user, @approval, Id, @time " +
                                                    "from TeamRegistrations " +
                                                    "where School = @school and Id in (" + teams.join(", ") + ")",
                                                    {
                                                        user: userId,
                                                        school: school,
                                                        approval: "team:" + approval,
                                                        time: new Date()
                                                    });
                                            }
                                        }
                                        else {
                                            return Promise.resolve();
                                        }
                                    })
                                    .then(function () {
                                        return transaction.commit();
                                    })
                                    .then(
                                        function () {
                                            connection.complete();
                                            if (approval === 1) {
                                                generatePrincipalApprovalLogin(service.db, school, currentSeason);
                                                generateRepresentativeApprovalLogin(service.db, school, currentSeason);
                                            }
                                            callback(null, {stage: 2});
                                        },
                                        function (err) {
                                            transaction.rollback();
                                            connection.complete();
                                            callback(err);
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
    });
};


function insertNextPayment(transaction, time, school, payments, season, callback) {
    var payment = payments[0];
    payments.splice(0, 1);
    transaction.request(
        "select a.ACCOUNT_ID as account_id from ACCOUNTS a WHERE a.SCHOOL_ID = @school",
        {school: school}
    )
        .then(
            function (account) {
                transaction.request(
                    "insert into PaymentRequests(Id, Method, TotalAmount, PayerName, Details, \"Order\", Time, Season, AccountId) " +
                    "values(@id, @method, @totalAmount, @payerName, @details, @order, @time, @season, @account)",
                    {
                        id: payment.id,
                        method: payment.method,
                        totalAmount: payment.totalAmount,
                        payerName: payment.payerName,
                        details: JSON.stringify(payment.details),
                        order: payment.order,
                        time: time,
                        season: season,
                        account: account[0]?.account_id || ""
                    }
                )
            }
        )
        .then(
            function () {
                var teams = [];
                for (var i = 0; i < payment.details.items.length; i++) {
                    var item = payment.details.items[i];
                    for (var n = 0; n < item.teams.length; n++) {
                        teams.push(item.teams[n]);
                    }
                }
                return transaction.request(
                    "update TeamRegistrations " +
                    "set Payment = @payment " +
                    "where School = @school and Id in (" + teams.join(", ") + ")",
                    {payment: payment.id, school: school});
            }
        )
        .then(
            function () {
                if (payments.length > 0) {
                    insertNextPayment(transaction, time, school, payments, season, callback);
                }
                else {
                    callback();
                }
            },
            function (err) {
                callback(err);
            });
}

Registration.prototype.getClubPayments = function (user, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select Id as \"Id\", Method as \"Method\", TotalAmount as \"TotalAmount\", PayerName as \"PayerName\", " +
                        "  Details as \"Details\", \"Order\" as \"Order\", Time as \"Time\" " +
                        "from PaymentRequests " +
                        "where Id in (" +
                        "  select tr.Payment " +
                        "  from TeamRegistrations as tr " +
                        "    join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID " +
                        "    join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                        "  where tr.School = @school and c.SEASON = @season and " +
                        "    c.IS_CLUBS = 1 and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL and " +
                        "    tr.Payment IS NOT NULL" +
                        ") and CancelTime is null",
                        {school: school, season: currentSeason}
                    )
                        .then(
                            function (records) {
                                connection.complete();
                                var result = [];
                                for (var r = 0; r < records.length; r++) {
                                    var record = records[r];
                                    var payment = {
                                        id: record.Id,
                                        method: record.Method,
                                        totalAmount: record.TotalAmount,
                                        payerName: record.PayerName,
                                        order: record.Order,
                                        time: record.Time
                                    };
                                    try {
                                        payment.details = JSON.parse(record.Details);
                                    }
                                    catch (e) {
                                        payment.details = {};
                                    }
                                    result.push(payment);
                                }
                                callback(null, result);
                            },
                            function (err) {
                                connection.complete();
                                callback(err);
                            }
                        );
                },
                function (err) {
                    callback(err);
                });
    });
};

Registration.prototype.getLeaguePayments = function (user, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select Id as \"Id\", Method as \"Method\", TotalAmount as \"TotalAmount\", PayerName as \"PayerName\", " +
                        "  Details as \"Details\", \"Order\" as \"Order\", Time as \"Time\" " +
                        "from PaymentRequests " +
                        "where Id in (" +
                        "  select tr.Payment " +
                        "  from TeamRegistrations as tr " +
                        "    join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID " +
                        "    join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                        "  where tr.School = @school and c.SEASON = @season and " +
                        "    c.IS_LEAGUE = 1 and c.DATE_DELETED IS NULL and cc.DATE_DELETED IS NULL and " +
                        "    tr.Payment IS NOT NULL" +
                        ") and CancelTime is null",
                        {school: school, season: currentSeason}
                    )
                        .then(
                            function (records) {
                                connection.complete();
                                var result = [];
                                for (var r = 0; r < records.length; r++) {
                                    var record = records[r];
                                    var payment = {
                                        id: record.Id,
                                        method: record.Method,
                                        totalAmount: record.TotalAmount,
                                        payerName: record.PayerName,
                                        order: record.Order,
                                        time: record.Time
                                    };
                                    try {
                                        payment.details = JSON.parse(record.Details);
                                    }
                                    catch (e) {
                                        payment.details = {};
                                    }
                                    result.push(payment);
                                }
                                callback(null, result);
                            },
                            function (err) {
                                connection.complete();
                                callback(err);
                            }
                        );
                },
                function (err) {
                    callback(err);
                });
    });
};

Registration.prototype.insertPayments = function (user, payments, callback) {
    var now = new Date();
    var month = (now.getFullYear() % 100) * 100 + (now.getMonth() + 1);
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    connection.transaction()
                        .then(
                            function (transaction) {
                                transaction.request(
                                    "select 'payment' as Type, max(Id) as \"MaxValue\" " +
                                    "from PaymentRequests " +
                                    "where Id >= @month * 10000 and Id < @month * 10000 + 10000 " +
                                    "union all " +
                                    "select 'order' as Type, max(\"Order\") as \"MaxValue\" " +
                                    "from PaymentRequests " +
                                    "where \"Order\" >= @month * 10000 and \"Order\" < @month * 10000 + 10000 ",
                                    {month: month})
                                    .then(
                                        function (records) {
                                            var paymentId = month * 10000 + 1;
                                            var orderId = month * 10000 + 1;
                                            for (var y = 0; y < records.length; y++) {
                                                var record = records[y];
                                                if (record.MaxValue) {
                                                    if (record.Type === "payment") {
                                                        paymentId = parseInt(record.MaxValue) + 1;
                                                    } else if (record.Type === "order") {
                                                        orderId = parseInt(record.MaxValue) + 1;
                                                    }
                                                }
                                            }
                                            for (var i = 0; i < payments.length; i++) {
                                                var p = payments[i];
                                                p.id = paymentId;
                                                paymentId++;
                                                p.order = orderId;
                                            }
                                            insertNextPayment(transaction, new Date(), school, payments, currentSeason, function (err) {
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
                                                                callback(null, {order: orderId});
                                                            },
                                                            function (err) {
                                                                connection.complete();
                                                                callback(err);
                                                            });
                                                }

                                            });
                                        },
                                        function (err) {
                                            transaction.rollback();
                                            connection.complete();
                                            callback(err);
                                        }
                                    );
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
    });
};

Registration.prototype.cancelOrderPayments = function (school, orderId, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.transaction()
                    .then(
                        function (transaction) {
                            transaction.request(
                                "update PaymentRequests " +
                                "set CancelTime = @time " +
                                "where \"Order\" = @order",
                                {order: orderId, time: new Date()})
                                .then(
                                    function () {
                                        return transaction.request(
                                            "update TeamRegistrations " +
                                            "set Payment = null " +
                                            "where Payment in " +
                                            "  (select Id " +
                                            "   from PaymentRequests " +
                                            "   where \"Order\" = @order) ",
                                            {order: orderId});
                                    })
                                .then(
                                    function () {
                                        transaction.commit()
                                            .then(
                                                function () {
                                                    connection.complete();
                                                    callback(null, true);
                                                },
                                                function (err) {
                                                    connection.complete();
                                                    callback(err);
                                                });
                                    },
                                    function (err) {
                                        transaction.rollback();
                                        connection.complete();
                                        callback(err);
                                    }
                                );
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

Registration.prototype.getPlayer = function (user, region, idNumber, projectId, callback) {
    var school = user.schoolID;
    var server = this;
    var activeSeason = Season.active();
    Season.current(user, function(currentSeason) {
        var season = currentSeason;
        server.db.connect()
            .then(
                function (connection) {
                    // logger.log('info', 'Getting player. User school: ' + school + ', region of user: ' + region + ', id: ' + idNumber);
                    connection.request(
                        "select st.STUDENT_ID as \"Student\", " +
                        "  st.SCHOOL_ID as \"School\", " +
                        "  st.FIRST_NAME as \"FirstName\", " +
                        "  st.LAST_NAME as \"LastName\", " +
                        "  st.BIRTH_DATE as \"BirthDate\", " +
                        "  st.GRADE as \"Grade\", " +
                        "  st.SEX_TYPE as \"Gender\", " +
                        "  sc.CITY_ID as \"City\", " +
                        "  usc.CITY_ID as \"User_City\", " +
                        "  cit.CITY_NAME as \"CityName\", " +
                        "  ucit.CITY_NAME as \"User_City_Name\" " +
                        "from STUDENTS st Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
                        "  left join SCHOOLS usc On usc.SCHOOL_ID=@school And usc.DATE_DELETED Is Null " +
                        "  left join CITIES cit On sc.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null " +
                        "  left join CITIES ucit On usc.CITY_ID=ucit.CITY_ID And ucit.DATE_DELETED Is Null " +
                        "where st.ID_NUMBER = @idNumber And st.DATE_DELETED Is Null ",
                        {idNumber: idNumber, school: school})
                        .then(
                            function (records) {
                                if (records.length > 0) {
                                    var record = records[0];
                                    var grade = activeSeason - parseInt(record.Grade);
                                    var currentSchool = parseInt(record.School);
                                    if (!projectId && currentSchool !== school) {
                                        var differentCity = record.City != record.User_City;
                                        connection.complete();
                                        callback(null, {
                                            external: true,
                                            grade: grade,
                                            differentCity: differentCity,
                                            studentCity: record.CityName,
                                            userCity: record.User_City_Name
                                        });
                                    } else {
                                        // same school or part of a project
                                        connection.complete();

                                        var location = school + '/students/' + idNumber + '/' + season + '/picture';
                                        var picture = utils.getFilePath(location);

                                        if (!picture) {
                                            var previousPath = utils.getFilePath(school + '/students/' + idNumber + '/' + (season - 1) + '/picture', true);
                                            if (!previousPath) {
                                                previousPath = utils.getOldFilePath("st_" + idNumber);
                                            }
                                            if (previousPath) {
                                                picture = location + path.extname(previousPath);
                                                //utils.copyFile(previousPath, location)
                                            }
                                        }

                                        callback(null, {
                                            student: record.Student,
                                            idNumber: idNumber,
                                            firstName: record.FirstName,
                                            lastName: record.LastName,
                                            birthDate: record.BirthDate,
                                            grade: grade,
                                            gender: record.Gender,
                                            picture: picture,
                                            idSlip: utils.getFilePath(school + '/students/' + idNumber + '/' + season + '/id-slip'),
                                            medicalApproval: utils.getFilePath(school + '/students/' + idNumber + '/' + season + '/medical-approval')
                                        });
                                    }
                                } else {
                                    // logger.log('info', 'Player not found');
                                    connection.complete();
                                    callback(null, {
                                        student: null,
                                        firstName: null,
                                        lastName: null,
                                        birthday: null,
                                        grade: null,
                                        gender: null
                                    });
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
    });
};

function removePlayerFromTeam(connection, school, team, student) {
    return new Promise(function (fulfill, reject) {
        function PerformDelete(transaction, whereClause, queryParams) {
            let qs = "delete from PlayerRegistrations Where " + whereClause;
            transaction.request(qs, queryParams).then(function (records) {
                qs = 'Select [USER_ID] From USERS Where DATE_DELETED Is Null And USER_TYPE=2 And SCHOOL_ID=@school';
                transaction.request(qs, {school: school}).then(function (records) {
                    if (records != null && records.length === 1) {
                        var userId = records[0]['USER_ID'];
                        var actionType = 4; //delete
                        var entityName = 'PlayerRegistrations';
                        qs = 'Insert Into ActionLog (Id, ActionType, UserId, EntityName, Value1, Value2, Value3) ' +
                            '(' +
                            '   Select IsNull(Max(Id), 0)+1, @type, @user, @name, @value1, @value2, @value3 ' +
                            '   From ActionLog' +
                            ')';
                        var actionParams = {
                            type: actionType,
                            user: userId,
                            name: entityName,
                            value1: team,
                            value2: student,
                            value3: school
                        };
                        transaction.request(qs, actionParams).then(function (records) {
                            transaction.commit().then(function() {
                                fulfill('OK');
                            });
                        }, function (err) {
                            logger.error(category, "error inserting into action log: " + (err.message || err));
                            transaction.rollback();
                            reject(err);
                        });
                    } else {
                        transaction.commit().then(function() {
                            fulfill('OK');
                        });
                    }
                }, function (err) {
                    logger.error(category, "error reading school user: " + (err.message || err));
                    transaction.rollback();
                    reject(err);
                });
            }, function (err) {
                logger.error(category, "error deleting player from team: " + (err.message || err));
                transaction.rollback();
                reject(err);
            });
        }
        function GetPlayer(records) {
            if (records != null && records.length > 0) {
                var player = records[0]['Player'];
                if (player != null)
                    return player;
            }
            return null;
        }
        connection.transaction().then(function (transaction) {
            var whereClause = 'Team = @team And Student = @student And ' +
                'Team in (Select Id From TeamRegistrations Where School = @school)';
            var queryParams = {school: school, team: team, student: student};
            let qs = 'Select [Player] From PlayerRegistrations Where ' + whereClause;
            transaction.request(qs, queryParams).then(function(records) {
                let player = GetPlayer(records);
                if (player != null) {
                    qs = 'Insert Into SchoolDeletedPlayers (School, Team, Player) ' +
                        'Values (@school, @team, @player)';
                    var insertParams = {school: school, team: team, player: player};
                    transaction.request(qs, insertParams).then(function (records) {
                        PerformDelete(transaction, whereClause, queryParams);
                    }, function (err) {
                        logger.error(category, "error adding school deleted player: " + (err.message || err));
                        transaction.rollback();
                        reject(err);
                    });
                } else {
                    PerformDelete(transaction, whereClause, queryParams);
                }
            }, function(err) {
                logger.error(category, "error getting player: " + (err.message || err));
                transaction.rollback();
                reject(err);
            });
        }, function(err) {
            logger.error(category, "error creating transaction: " + (err.message || err));
            reject(err);
        });
    });
}

function insertPlayerToTeam(connection, school, team, student, season) {
    return connection.request(
        "Insert into PlayerRegistrations(Team, Student) " +
        "Select tr.Id, s.STUDENT_ID " +
        "From TeamRegistrations as tr " +
        "   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
        "   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
        "   Join STUDENTS as s on s.SCHOOL_ID = tr.School and s.STUDENT_ID = @student " +
        "Where tr.School = @school and Id = @team And c.SEASON=@season",
        {school: school, team: team, student: student, season: season});
}

function insertStudent(connection, school, student, season) {
    var activeSeason = Season.active();
    return new Promise(function (fulfill, reject) {
        connection.request(
            "insert into STUDENTS(ID_NUMBER_TYPE, ID_NUMBER, FIRST_NAME, LAST_NAME, BIRTH_DATE, " +
            "  SCHOOL_ID, GRADE, SEX_TYPE) " +
            "output INSERTED.STUDENT_ID as \"Student\" " +
            "values(0, @idNumber, @firstName, @lastName, @birthDate, @school, @grade, @gender)",
            {
                school: school,
                idNumber: student.idNumber,
                firstName: student.firstName,
                lastName: student.lastName,
                birthDate: student.birthDate,
                grade: activeSeason - parseInt(student.grade),
                gender: parseInt(student.gender)
            })
            .then(
                function (records) {
                    student.student = records[0].Student;
                    fulfill();
                },
                function (err) {
                    reject(err);
                });
    });
}

function updateStudent(connection, school, student, season) {
    var activeSeason = Season.active();
    return new Promise(function (fulfill, reject) {
        var fields = [];
        fields.push('FIRST_NAME = @firstName');
        fields.push('LAST_NAME = @lastName');
        if (student.birthDate != null && (new Date(student.birthDate)).getFullYear() > 1970)
            fields.push('BIRTH_DATE = @birthDate');
        if (student.grade != null && !isNaN(parseInt(student.grade, 10)))
            fields.push('GRADE = @grade');
        // TODO - add gender
        var qs = "Update STUDENTS " +
            "Set " + fields.join(', ') + " " +
            "Where STUDENT_ID = @student AND SCHOOL_ID = @school";
        var queryParams = {
            student: student.student,
            school: school,
            firstName: student.firstName,
            lastName: student.lastName,
            birthDate: student.birthDate,
            grade: activeSeason - parseInt(student.grade),
            gender: parseInt(student.gender)
        };
        connection.request(qs, queryParams).then(function (records) {
            fulfill();
        }, function (err) {
            reject(err);
        });
    });
}

Registration.prototype.upsertTeamPlayer = function(user, teamId, data, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        if (data.external) {
            // TODO
            callback();
            return;
        }

        server.db.connect()
            .then(
                function (connection) {
                    var p;
                    if (data.student) {
                        p = removePlayerFromTeam(connection, school, teamId, data.student)
                            .then(
                                function () {
                                    return updateStudent(connection, school, data, currentSeason);
                                }
                            );
                    }
                    else {
                        p = insertStudent(connection, school, data, currentSeason)
                    }
                    return p.
                    then(function () {
                        return insertPlayerToTeam(connection, school, teamId, data.student, currentSeason);
                    })
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
    });
};

Registration.prototype.deleteTeamPlayer = function(school, teamId, playerId, callback) {
    this.db.connect()
        .then(
            function (connection) {
                return removePlayerFromTeam(connection, school, teamId, playerId)
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

Registration.prototype.deleteTransferRequest = function (school, teamId, idNumber, callback) {
    this.db.connect()
        .then(
            function (connection) {
                return connection.request(
                    "delete from TransferRequests " +
                    "where Team = @team and IdNumber = @idNumber and " +
                    "  Team in (select Id from TeamRegistrations where School = @school)",
                    {school: school, team: teamId, idNumber: idNumber})
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

Registration.prototype.getTransferRequests = function(user, teamId, callback) {
    var school = user.schoolID;
    var service = this;
    var activeSeason = Season.active();
    Season.current(user, function(currentSeason) {
        service.db.connect()
            .then(
                function (connection) {
                    connection.request(
                        "select tr.School as \"School\"," +
                        "      tr.IdNumber as \"IdNumber\"," +
                        "      tr.Team as \"Team\"," +
                        "      tr.PreviousSchool as \"PreviousSchool\", " +
                        "      st.FIRST_NAME as \"FirstName\", " +
                        "      st.LAST_NAME as \"LastName\", " +
                        "      st.GRADE as \"Grade\", " +
                        "      sc.CITY_ID as \"City\", " +
                        "      csc.CITY_ID as \"CurrentCity\" " +
                        "from TransferRequests as tr " +
                        "  join SCHOOLS as sc on tr.School = sc.SCHOOL_ID " +
                        "  join STUDENTS as st ON tr.IdNumber = st.ID_NUMBER " +
                        "  left join SCHOOLS as csc ON st.SCHOOL_ID = csc.SCHOOL_ID " +
                        "where tr.Team = @teamId", { teamId: teamId }).then(function(records) {
                        connection.complete();
                        var result = records.map(function(record) {
                            var transfer = {
                                idNumber : record.IdNumber,
                                team : record.Team,
                                previousSchool : record.PreviousSchool,
                                grade: activeSeason - parseInt(record.Grade),
                                firstName: null,
                                lastName: null
                            };
                            if (record.City === record.CurrentCity) {
                                transfer.firstName = record.FirstName;
                                transfer.lastName = record.LastName;
                            }
                            return transfer;
                        });

                        callback(null, result);

                    }, function (err) {
                        connection.complete();
                        callback(err);
                    });
                }, function(err) {
                    callback(err);
                });
    });
};

function checkAutoTransfer(connection, school, idNumber, season) {
    return new Promise(function (fulfill, reject) {
        var qs =  "select st.STUDENT_ID as \"Student\", " +
            "  st.SCHOOL_ID as \"School\", " +
            "  st.GRADE as \"Grade\", " +
            "  sc.CITY_ID as \"City\", " +
            "  usc.CITY_ID as \"User_City\" " +
            "from STUDENTS st Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null " +
            "  left join SCHOOLS usc On usc.SCHOOL_ID=@school And usc.DATE_DELETED Is Null " +
            "where st.ID_NUMBER = @idNumber And st.DATE_DELETED Is Null ";
        connection.request(qs, {idNumber: idNumber, school: school}).then(function (records) {
            if (records.length > 0) {
                var record = records[0];
                var grade = season - parseInt(record.Grade); // TODO - maybe need to change season to last season?
                var currentSchool = parseInt(record.School);
                if (currentSchool !== school) {
                    if (record.City == record.User_City && grade < 10) {
                        //instant transfer when same city and in 10th grade or lower
                        qs = "update STUDENTS " +
                            "set SCHOOL_ID = @school " +
                            "where ID_NUMBER = @idNumber And DATE_DELETED Is Null";
                        connection.request(qs, { idNumber: idNumber, school: school }).then(function () {
                            fulfill({request: false, student: record.Student});
                        }, function (err) {
                            reject(err);
                        });
                    } else {
                        //still need to request for transfer
                        fulfill({request: true});
                    }
                } else {
                    //same school, something went wrong
                    reject("player already in same school");
                }
            } else {
                reject("player not found");
            }
        }, function (err) {
            reject(err);
        });
    });
}

Registration.prototype.requestTransfer = function (user, idNumber, team, callback) {
    var school = user.schoolID;
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect()
            .then(
                function (connection) {
                    checkAutoTransfer(connection, school, idNumber, currentSeason).then(function(resp) {
                        if (resp.request) {
                            var qs = "insert into TransferRequests(School, IdNumber, Team) " +
                                "select sr.School, @idNumber, tr.Id " +
                                "from TeamRegistrations as tr " +
                                "  join CHAMPIONSHIP_CATEGORIES as cc on tr.Competition = cc.CHAMPIONSHIP_CATEGORY_ID and tr.Id = @team and cc.DATE_DELETED IS NULL " +
                                "  join CHAMPIONSHIPS as c on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID and c.DATE_DELETED IS NULL " +
                                "  join SchoolRegistrations sr on sr.Season = c.SEASON and sr.School = tr.School and sr.School = @school " +
                                "  left outer join TransferRequests as re on re.School = sr.School and re.IdNumber = @idNumber and re.Team = tr.Id " +
                                "where re.IdNumber is null ";
                            connection.request(qs, { school: school, idNumber: idNumber, team: team }).then(function () {
                                connection.complete();
                                callback(null, {Message: "OK"});
                            }, function (err) {
                                connection.complete();
                                callback(err);
                            });
                        } else {
                            //add to team
                            insertPlayerToTeam(connection, school, team, resp.student, currentSeason).then(function() {
                                callback(null, {Auto: true});
                            }, function(err) {
                                callback(err);
                            });
                        }
                    }, function(err) {
                        connection.complete();
                        callback(err);
                    });
                },
                function (err) {
                    callback(err);
                }
            );
    });
};

Registration.prototype.getSeasons = function (callback) {
    this.db.connect().then(function (connection) {
        var qs = 'Select Distinct s.SEASON As SeasonId, s.NAME As SeasonName ' +
            'From SchoolRegistrations sr Inner Join SEASONS s On sr.Season=s.SEASON ' +
            'Where s.DATE_DELETED Is Null ' +
            'Order By s.SEASON Asc';
        connection.request(qs, {}).then(function (seasons) {
            connection.complete();
            callback(null, seasons);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};

Registration.prototype.getBasicPrices = function (user, callback) {
    var server = this;
    Season.current(user, function(currentSeason) {
        server.db.connect().then(function (connection) {
            var qs = 'Select rcp.HasTotoSupport, p.PRICE ' +
                'From RegistrationClubProducts rcp Inner Join PRODUCTS p On rcp.ProductId=p.PRODUCT_ID And p.DATE_DELETED Is Null ' +
                'Where rcp.SportId Is Null And rcp.Season=@season';
            connection.request(qs, {season: currentSeason}).then(function (records) {
                connection.complete();
                var prices = {
                    NoTotoSupport: 0,
                    WithTotoSupport: 0
                };
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var curPrice = record['PRICE'];
                    if (record['HasTotoSupport'] == 0) {
                        prices.NoTotoSupport = curPrice;
                    } else if (record['HasTotoSupport'] == 1) {
                        prices.WithTotoSupport = curPrice;
                    }
                }
                callback(null, prices);
            }, function (err) {
                connection.complete();
                callback(err);
            });
        });
    });
};

Registration.prototype.getPlayerCardsData = function (teamId, callback) {
    var db = this.db;
    var activeSeason = Season.active();
    var seasonConnection = new sql.Connection(settings.sqlConfig, function (err) {
        if (err) {
            logger.error('Get player cards data connection error: ' + err.message);
            callback(err);
        } else {
            db.connect().then(function (sportsmanConnection) {
                var qs = 'Select \'new\' As "Type", tr.School, tr.Competition, tr.TeamNumber, c.SEASON As "Season" ' +
                    'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    'Where tr.Id=@team And tr.Team Is Null And c.SEASON=@season ' +
                    'Union All ' +
                    'Select \'old\' As "Type",  t.SCHOOL_ID As "School", t.CHAMPIONSHIP_CATEGORY_ID As "Competition",  CONVERT(nvarchar(20), t.TEAM_INDEX) As "TeamNumber", c.SEASON As "Season" ' +
                    'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    '   Left Join TeamRegistrations tr On tr.Team=t.TEAM_ID ' +
                    'Where t.DATE_DELETED Is Null And t.TEAM_ID=@team And c.SEASON=@season';
                sportsmanConnection.request(qs, {team: teamId, season: activeSeason}).then(function (records) {
                    if (records.length > 0) {
                        var row = records[0];
                        var regType = row['Type'];
                        var schoolId = row['School'];
                        var categoryId = row['Competition'];
                        var teamNumber = row['TeamNumber'];
                        var teamSeason = row['Season'];
                        qs = 'Select SeasonCode, [Name], FirstDay, LastDay ' +
                            'From Seasons ' +
                            'Where SeasonCode=@activeSeason Or SeasonCode=@teamSeason'
                        var request = seasonConnection.request();
                        request.input('activeSeason', activeSeason);
                        request.input('teamSeason', teamSeason);
                        request.query(qs, function (err, records) {
                            if (err) {
                                    seasonConnection.close();
                                sportsmanConnection.complete();
                                callback(err);
                            } else {
                                if (records.length > 0) {
                                    var seasonMapping = {};
                                    for (var i = 0; i < records.length; i++) {
                                        row = records[i];
                                        seasonMapping[row['SeasonCode'].toString()] = {
                                            Name: row['Name'],
                                            StartYear: (new Date(row['FirstDay'])).getFullYear(),
                                            EndYear: (new Date(row['LastDay'])).getFullYear()
                                        };
                                    }
                                    var activeSeasonData = seasonMapping[activeSeason.toString()] || {};
                                    var teamSeasonData = seasonMapping[teamSeason.toString()] || {};
                                    seasonConnection.close();
                                    qs = 'Select c.CHAMPIONSHIP_NAME, s.SPORT_NAME, cm.CATEGORY_NAME, cc.MAX_STUDENT_BIRTHDAY ' +
                                        'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                        '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                                        '   Inner Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                                        'Where cc.DATE_DELETED Is Null And cc.CHAMPIONSHIP_CATEGORY_ID=@category';
                                    sportsmanConnection.request(qs, {category: categoryId}).then(function (records) {
                                        row = records[0];
                                        var categoryName = row['CATEGORY_NAME'];
                                        var maxStudentBirthday = row['MAX_STUDENT_BIRTHDAY'];
                                        var categoryParts = categoryName.split(' ');
                                        var playerCardsData = {
                                            sport: row['SPORT_NAME'],
                                            championshipName: row['CHAMPIONSHIP_NAME'],
                                            category: categoryName,
                                            categoryGrades: categoryParts[0],
                                            categoryGender: categoryParts[1],
                                            season: teamSeasonData.Name,
                                            years: teamSeasonData.StartYear + '-' + teamSeasonData.EndYear,
                                            schoolName: '',
                                            schoolRegion: '',
                                            schoolSymbol: '',
                                            today: util.parseDateTime(new Date(), 'DD/MM/YYYY'),
                                            teamDisplayName: '',
                                            currentSeason: activeSeasonData.Name,
                                            players: []
                                        };
                                        var teamNumberParameter = teamNumber == null ? null : parseInt(teamNumber, 10);
                                        if (isNaN(teamNumberParameter))
                                            teamNumberParameter = null;
                                        qs = 'Select s.SCHOOL_NAME, r.REGION_NAME, s.SYMBOL, dbo.BuildTeamName(s.SCHOOL_NAME, c.CITY_NAME, @teamNumber, Null, Null) As TeamDisplayName ' +
                                            'From SCHOOLS s Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                                            '   Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                            'Where s.DATE_DELETED Is Null And s.SCHOOL_ID=@school';
                                        sportsmanConnection.request(qs, {school: schoolId, teamNumber: teamNumberParameter}).then(function (records) {
                                            row = records[0];
                                            var teamDisplayName = row['TeamDisplayName'];
                                            if (teamNumberParameter == null && teamNumber != null && teamNumber.toString().length > 0)
                                                teamDisplayName += ' ' + teamNumber;
                                            playerCardsData.schoolName = row['SCHOOL_NAME'];
                                            playerCardsData.schoolRegion = row['REGION_NAME'];
                                            playerCardsData.schoolSymbol = row['SYMBOL'];
                                            playerCardsData.teamDisplayName = teamDisplayName;

                                            qs = 'Select p.TEAM_NUMBER, st.FIRST_NAME, st.LAST_NAME, st.BIRTH_DATE, st.ID_NUMBER, st.GRADE, p.[STATUS] ' +
                                                'From PLAYERS p Inner Join STUDENTS st On p.STUDENT_ID=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
                                                '   Inner Join TEAMS t On t.DATE_DELETED Is Null And p.TEAM_ID=t.TEAM_ID ' +
                                                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                '   Left Join TeamRegistrations tr On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And tr.Team=t.TEAM_ID ' +
                                                '   Left Join PlayerRegistrations as pr on pr.Team = tr.Id and pr.Student = st.STUDENT_ID ' +
                                                '   Left Join SchoolDeletedPlayers sdp On (t.TEAM_ID=sdp.Team Or tr.Id=sdp.Team) And p.PLAYER_ID=sdp.Player And pr.Team Is Null ' +
                                                'Where p.DATE_DELETED Is Null And p.TEAM_ID=@team And c.SEASON=@season And sdp.[DeletedAt] Is Null ' +
                                                'Union All ' +
                                                'Select p.TEAM_NUMBER, st.FIRST_NAME, st.LAST_NAME, st.BIRTH_DATE, st.ID_NUMBER, st.GRADE, p.[STATUS] ' +
                                                'From PlayerRegistrations pr Inner Join STUDENTS st On pr.Student=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
                                                '   Inner Join TeamRegistrations tr On pr.Team=tr.Id  ' +
                                                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                '   Left Join PLAYERS p On pr.Player=p.PLAYER_ID And p.DATE_DELETED Is Null ' +
                                                '   Left Join SchoolDeletedPlayers sdp On (tr.Team=sdp.Team Or tr.Id=sdp.Team) And p.PLAYER_ID=sdp.Player ' +
                                                'Where pr.Team=@team And c.SEASON=@season And sdp.[DeletedAt] Is Null ' +
                                                'Union All ' +
                                                'Select p.TEAM_NUMBER, st.FIRST_NAME, st.LAST_NAME, st.BIRTH_DATE, st.ID_NUMBER, st.GRADE, p.[STATUS] ' +
                                                'From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.Team=tr.Id ' +
                                                '   Inner Join STUDENTS st On pr.Student=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
                                                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                '   Left Join PLAYERS p On pr.Player=p.PLAYER_ID And p.DATE_DELETED Is Null ' +
                                                '   Left Join SchoolDeletedPlayers sdp On (tr.Team=sdp.Team Or tr.Id=sdp.Team) And p.PLAYER_ID=sdp.Player ' +
                                                'Where tr.Team=@team And c.SEASON=@season And sdp.[DeletedAt] Is Null';

                                            sportsmanConnection.request(qs, {team: teamId, season: activeSeason}).then(function (records) {
                                                var possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'jfif'];
                                                var idMapping = {};
                                                for (var i = 0; i < records.length; i++) {
                                                    var row = records[i];
                                                    var studentIdNumber = row['ID_NUMBER'];
                                                    //prevent duplicate players:
                                                    if (idMapping[studentIdNumber])
                                                        continue;
                                                    var rawBirthdate = row['BIRTH_DATE'];
                                                    var playerBirthday = rawBirthdate ? new Date(rawBirthdate) : null;
                                                    var overMaxAge = false;
                                                    if (maxStudentBirthday != null && playerBirthday != null)
                                                        overMaxAge = playerBirthday < maxStudentBirthday;
                                                    var playerStatus = 'ממתין לאישור';
                                                    switch (row['STATUS']) {
                                                        case 1:
                                                            playerStatus = 'רשום';
                                                            break;
                                                        case 2:
                                                            playerStatus = 'מאושר';
                                                            break;
                                                        case 3:
                                                            playerStatus = 'לא מאושר';
                                                            break;
                                                    }
                                                    var playerPicturePath = null;
                                                    var playerPictureUrl = '/v2/img/no-photo.png';
                                                    var publicPictureTemplate = 'v2/dist/img/players/p-$id-$season.$ext';
                                                    for (var j = 0; j < possibleExtensions.length; j++) {
                                                        var currentExtension = possibleExtensions[j];
                                                        var virtualPath = [schoolId, 'students', studentIdNumber, teamSeason, 'picture'].join('/') + '.' + currentExtension;
                                                        var currentPath = path.join(settings.schoolContent, virtualPath);
                                                        if (fs.existsSync(currentPath)) {
                                                            playerPicturePath = currentPath;
                                                            var targetPath = publicPictureTemplate.replace('$id', studentIdNumber)
                                                                .replace('$season', teamSeason)
                                                                .replace('$ext', currentExtension);
                                                            fs.copyFileSync(currentPath, targetPath);
                                                            playerPictureUrl = '/' + targetPath.replace('/dist/', '/');
                                                            break;
                                                        }
                                                    }
                                                    if (playerPicturePath == null) {
                                                        playerPicturePath = 'v2/templates/images/no-photo.png';
                                                    }
                                                    var playerObject = {
                                                        index: i + 1,
                                                        shirtNumber: row['TEAM_NUMBER'],
                                                        firstName: row['FIRST_NAME'],
                                                        lastName: row['LAST_NAME'],
                                                        birthDate: apiUtils.FormatDate(playerBirthday, 'dd/MM/yyyy'),
                                                        idNumber: studentIdNumber,
                                                        grade: utils.translateGrade(activeSeason - row['GRADE']),
                                                        overMaxAge: overMaxAge ? 'כן' : 'לא',
                                                        status: playerStatus,
                                                        picturePath: playerPicturePath,
                                                        pictureUrl: settings.siteBaseUrl + playerPictureUrl
                                                    };
                                                    playerCardsData.players.push(playerObject);
                                                    idMapping[studentIdNumber] = playerObject;
                                                }
                                                sportsmanConnection.complete();
                                                callback(null, playerCardsData);
                                            }, function(err) {
                                                sportsmanConnection.complete();
                                                callback(err);
                                            });
                                        }, function(err) {
                                            sportsmanConnection.complete();
                                            callback(err);
                                        });
                                    }, function(err) {
                                        seasonConnection.close();
                                        sportsmanConnection.complete();
                                        callback(err);
                                    });
                                } else {
                                    seasonConnection.close();
                                    sportsmanConnection.complete();
                                    callback('No season data');
                                }
                            }
                        });
                    } else {
                        sportsmanConnection.complete();
                        seasonConnection.close();
                        callback('Team was not found');
                    }
                }, function (err) {
                    sportsmanConnection.complete();
                    seasonConnection.close();
                    callback(err);
                });
            }, function(err) {
                seasonConnection.close();
                callback(err);
            });
        }
    });
};

module.exports = new Registration(require('./db'));