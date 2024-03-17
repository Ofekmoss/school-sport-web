//var logger = require('../../logger');
var category = "ProjectRegistrationModel";
var Access = require('../access');
var Season = require('../season');
var settings = require('../../../settings');
var utils = require('../utils');
var apiUtil = require('../../api/util');
const util = require("../../api/util");

function ProjectRegistration(db) {
    this.db = db;
}

function getSchoolType(fromGrade, toGrade) {
    if (toGrade <= 6) {
        return 0;
    }
    else if (toGrade <= 8) {
        return 1;
    }
    else if (toGrade === 9) {
        if (fromGrade === 7) {
            return 2;
        }
    }
    else if (toGrade === 12) {
        if (fromGrade === 7) {
            return 3;
        }
        else if (fromGrade === 9) {
            return 4;
        }
        else if (fromGrade === 10) {
            return 5;
        }
    }
    return null;
}

function getTypeGrades(type) {
    switch (type) {
        case 0:
            return {from: 1, to: 6};
        case 1:
            return {from: 1, to: 9};
        case 3:
            return {from: 7, to: 10};
        case 4:
            return {from: 9, to: 12};
        case 5:
            return {from: 10, to: 12};
        default:
            return {from: 1, to: 12};
    }
}
ProjectRegistration.prototype.getProjectRegistration = async function (projectId, cityId, options, callback) {
    var connection = null;
    try {
        connection = await this.db.connect();

        var records = await connection.request(
            "select p.Id as \"Id\", p.City as \"City\", IsNull(p.Status, 0) as \"Status\", " +
            " p.Item1 as \"Item1\", p.Item2 as \"Item2\", p.Item3 as \"Item3\", " +
            " p.ManagerName as \"ManagerName\", p.ManagerPhoneNumber as \"ManagerPhoneNumber\", p.ManagerEmail as \"ManagerEmail\", " +
            " p.SupervisorName as \"SupervisorName\", p.SupervisorPhoneNumber as \"SupervisorPhoneNumber\", p.SupervisorEmail as \"SupervisorEmail\", " +
            " c.CITY_NAME as \"CityName\", c.SYMBOL as \"CitySymbol\", c.MANAGER_NAME as \"CityManagerName\", c.ADDRESS as \"CityAddress\", " +
            " c.SOCIO_ECONOMIC_RANK as \"CitySocioEconomicRank\", c.GEOGRAPHIC_INDEX as \"CityGeographicIndex\" " +
            "from ProjectRegistrations as p " +
            "  join CITIES as c on p.City = c.CITY_ID " +
            "where p.Project = @project and p.City = @city and p.Season = @season",
            {project: projectId, city: cityId, season: options.season});

        var result = null;
        if (records.length > 0) {
            var record = records[0];
            var result = {
                id: record.Id,
                city: {
                    id: cityId,
                    name: record.CityName,
                    symbol: record.CitySymbol,
                    managerName: record.CityManagerName,
                    address: record.CityAddress,
                    socioEconomicRank: record.CitySocioEconomicRank,
                    geographicIndex: record.CityGeographicIndex
                },
                status: record.Status,
                item1: record.Item1,
                item2: record.Item2,
                item3: record.Item3,
                manager: {
                    name: record.ManagerName,
                    phoneNumber: record.ManagerPhoneNumber,
                    email: record.ManagerEmail
                },
                supervisor: {
                    name: record.SupervisorName,
                    phoneNumber: record.SupervisorPhoneNumber,
                    email: record.SupervisorEmail
                },
                schools: []
            };

            records = await connection.request(
                "select s.Id as \"Id\", s.School as \"School\", sc.SCHOOL_NAME as \"Name\", sc.SYMBOL as \"Symbol\", " +
                "  sc.FROM_GRADE as \"FromGrade\", sc.TO_GRADE as \"ToGrade\", sc.ADDRESS as \"Address\", " +
                "  sc.PHONE as \"PhoneNumber\", sc.FAX as \"Fax\", sc.EMAIL as \"Email\", " +
                "  s.PrincipalName as \"PrincipalName\", s.PrincipalPhoneNumber as \"PrincipalPhoneNumber\", s.PrincipalEmail as \"PrincipalEmail\", " +
                "  s.CoordinatorName as \"CoordinatorName\", s.CoordinatorPhoneNumber as \"CoordinatorPhoneNumber\", s.CoordinatorEmail as \"CoordinatorEmail\" " +
                "from ProjectRegistrations as p " +
                "  join ProjectSchools as s on p.Id = s.ProjectRegistration " +
                "  join SCHOOLS as sc on sc.SCHOOL_ID = s.School and sc.CITY_ID = p.City " +
                "where p.Project = @project and p.City = @city and p.Season = @season and " +
                "  sc.DATE_DELETED is null",
                {project: projectId, city: cityId, season: options.season});

            var schools = {};
            for (var r = 0; r < records.length; r++) {
                var record = records[r];
                var school = {
                    id: record.School,
                    name: record.Name,
                    symbol: record.Symbol,
                    details: {
                        type: getSchoolType(record.FromGrade, record.ToGrade),
                        address: record.Address,
                        phoneNumber: record.PhoneNumber,
                        fax: record.Fax,
                        email: record.Email
                    },
                    principal: {
                        name: record.PrincipalName,
                        phoneNumber: record.PrincipalPhoneNumber,
                        email: record.PrincipalEmail
                    },
                    coordinator: {
                        name: record.CoordinatorName,
                        phoneNumber: record.CoordinatorPhoneNumber,
                        email: record.CoordinatorEmail
                    }
                };

                schools[record.School] = school;
                
                result.schools.push(school);
            }

            if (options && options.withTeams) {
                var teamRecords = await connection.request(
                    "select t.Id as \"Id\", t.School as \"School\", t.Item1 as \"Item1\", t.Item2 as \"Item2\", t.Item3 as \"Item3\", " +
                    "  t.Ages as \"Ages\", t.Activity as \"Activity\", " +
                    "  t.Facility as \"Facility\", f.FACILITY_NAME as \"FacilityName\", f.ADDRESS as \"FacilityAddress\", f.FACILITY_TYPE as \"FacilityType\", " +
                    "  t.CoachName as \"CoachName\", t.CoachEmail as \"CoachEmail\", t.CoachPhoneNumber as \"CoachPhoneNumber\", " +
                    "  t.CoachGender as \"CoachGender\", t.CoachCertification as \"CoachCertification\" " +
                    "from ProjectRegistrations as p " +
                    "  join ProjectTeams as t on p.Id = t.ProjectRegistration " +
                    "  left outer join FACILITIES as f on f.FACILITY_ID = t.Facility and f.CITY_ID = p.City and f.SCHOOL_ID is null " +
                    "where p.Project = @project and p.City = @city and p.Season = @season",
                    {project: projectId, city: cityId, season: options.season});

                var teams = [];
                var teamsMap = {};

                for (var i = 0; i < teamRecords.length; i++) {
                    var teamRecord = teamRecords[i];

                    var activity;
                    if (teamRecord.Activity != null) {
                        try {
                            activity = JSON.parse(teamRecord.Activity);
                        } catch (e) {
                            activity = [];
                        }
                    } else {
                        activity = [];
                    }

                    var team = {
                        id: teamRecord.Id,
                        school: teamRecord.School,
                        item1: teamRecord.Item1,
                        item2: teamRecord.Item2,
                        item3: teamRecord.Item3,
                        ages: teamRecord.Ages,
                        activity: activity,
                        facility: teamRecord.Facility == null ? null : {
                            id: teamRecord.Facility,
                            name: teamRecord.FacilityName,
                            address: teamRecord.FacilityAddress,
                            type: teamRecord.FacilityType
                        },
                        coach: {
                            name: teamRecord.CoachName,
                            phoneNumber: teamRecord.CoachPhoneNumber,
                            email: teamRecord.CoachEmail,
                            gender: teamRecord.CoachGender,
                            certification: teamRecord.CoachCertification
                        }
                    };

                    teamsMap[team.id] = team;

                    var school = null;
                    if (teamRecord.School) {
                        school = schools[teamRecord.School];

                    }
                    if (school) {
                        if (!school.teams) {
                            school.teams = [];
                        }
                        school.teams.push(team);
                    }
                    else {
                        if (!result.teams) {
                            result.teams = [];
                        }
                        result.teams.push(team);
                    }
                }

                if (options.withPlayers) {
                    var playerRecords = await connection.request(
                        "select pp.Id as \"Id\", pp.ProjectTeam as \"Team\", pp.FirstName as \"FirstName\", pp.LastName as \"LastName\", " +
                        "  pp.IdNumber as \"IdNumber\", pp.IdNumberType as \"IdNumberType\", " +
                        "  pp.BirthDate as \"BirthDate\", pp.Gender as \"Gender\", pp.Item1 as \"Item1\" " +
                        "from ProjectRegistrations as p " +
                        "  join ProjectTeams as t on p.Id = t.ProjectRegistration " +
                        "  join ProjectPlayers as pp on t.Id = pp.ProjectTeam " +
                        "where p.Project = @project and p.City = @city and p.Season = @season",
                        {project: projectId, city: cityId, season: options.season});

                    for (var j = 0; j < playerRecords.length; j++) {
                        var playerRecord = playerRecords[j];
                        var team = teamsMap[playerRecord.Team];
                        if (!team) {
                            continue;
                        }
                        if (!team.players) {
                            team.players = [];
                        }
                        var player = {
                            id: playerRecord.Id,
                            firstName: playerRecord.FirstName,
                            lastName: playerRecord.LastName,
                            idNumber: playerRecord.IdNumber,
                            idNumberType: playerRecord.IdNumberType,
                            birthDate: playerRecord.BirthDate,
                            gender: playerRecord.Gender,
                            item1: playerRecord.Item1
                        };
                        team.players.push(player);
                    }
                }
            }

            callback(null, result);
        }
        else {
            callback(null, {status: 404, message: "לא נמצאו נתונים עבור הרשות בתכנת"});
        }
    }
    catch (err) {
        callback(err);
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};

ProjectRegistration.prototype.updateProjectStatus = async function (projectId, user, status, callback) {
    var connection = null;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            var params = {
                project: projectId,
                city: cityId,
                season: currentSeason,
                status: status
            };
            await connection.request(
                "Update ProjectRegistrations " +
                "Set [Status]=@status, ModifiedAt = GETDATE() " +
                "Where Project = @project and City = @city and Season = @season",
                params);
            callback(null, 'Success');
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

ProjectRegistration.prototype.updateProjectRegistration = async function (projectId, user, data, callback) {
    var connection = null;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();

            var fields = [];

            if (data.city) {
                var params = {
                    city: cityId
                };
                if (data.city.symbol !== undefined) {
                    params.symbol = data.city.symbol;
                    fields.push("SYMBOL = @symbol");
                }
                if (data.city.managerName !== undefined) {
                    params.managerName = data.city.managerName;
                    fields.push("MANAGER_NAME = @managerName");
                }
                if (data.city.address !== undefined) {
                    params.address = data.city.address;
                    fields.push("ADDRESS = @address");
                }
                if (data.city.socioEconomicRank !== undefined) {
                    params.socioEconomicRank = data.city.socioEconomicRank;
                    fields.push("SOCIO_ECONOMIC_RANK = @socioEconomicRank");
                }
                if (data.city.geographicIndex !== undefined) {
                    params.geographicIndex = data.city.geographicIndex;
                    fields.push("GEOGRAPHIC_INDEX = @geographicIndex");
                }

                if (fields.length > 0) {
                    await connection.request(
                        "update CITIES " +
                        "set " +
                        fields.join(", ") +
                        " where CITY_ID = @city",
                        params);
                }
            }

            fields = [];
            var params = {
                project: projectId,
                city: cityId,
                season: currentSeason,
                item1: data.item1,
                item2: data.item2,
                item3: data.item3
            };

            fields.push("Status = CASE WHEN Status > 1 THEN Status ELSE 1 END");

            if (data.item1 !== undefined) {
                fields.push("Item1 = @item1");
            }
            if (data.item2 !== undefined) {
                fields.push("Item2 = @item2");
            }
            if (data.item3 !== undefined) {
                fields.push("Item3 = @item3");
            }
            if (data.manager) {
                params.managerName = data.manager.name;
                params.managerPhoneNumber = data.manager.phoneNumber;
                params.managerEmail = data.manager.email;
                fields.push("ManagerName = @managerName, ManagerPhoneNumber = @managerPhoneNumber, ManagerEmail = @managerEmail");
            }
            if (data.supervisor) {
                params.supervisorName = data.supervisor.name;
                params.supervisorPhoneNumber = data.supervisor.phoneNumber;
                params.supervisorEmail = data.supervisor.email;
                fields.push("SupervisorName = @supervisorName, SupervisorPhoneNumber = @supervisorPhoneNumber, SupervisorEmail = @supervisorEmail");
            }

            if (fields.length > 0) {
                await connection.request(
                    "update ProjectRegistrations " +
                    "set " +
                    fields.join(", ") +
                    " , InitializedAt = ISNULL(InitializedAt, GETDATE()), " +
                    "    ModifiedAt = GETDATE() " +
                    " where Project = @project and City = @city and Season = @season",
                    params);
            }

            callback(null, {stage: 1});
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

ProjectRegistration.prototype.insertProjectSchool = async function (projectId, user, data, callback) {
    var connection = null;
    var transaction;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            if (data.school != null) {
                var record = await connection.request(
                    "select SCHOOL_ID " +
                    "from SCHOOLS " +
                    "where CITY_ID = @city and SCHOOL_ID = @school AND DATE_DELETED is null",
                    {city: cityId, school: data.school}
                );
                if (record.length === 0) {
                    callback("School not found");
                    return;
                }
            }
            transaction = await connection.transaction();
            var params = {
                city: cityId,
                symbol: data.symbol,
                name: data.name,
                address: data.address,
                phone: data.phoneNumber,
                fax: data.fax,
                email: data.email
            };
            if (data.school == null) {
                var r = await transaction.request(
                    "insert into SCHOOLS(REGION_ID, CITY_ID, SCHOOL_NAME, SYMBOL, ADDRESS, PHONE, FAX, EMAIL, CLUB_STATUS) " +
                    "output INSERTED.SCHOOL_ID as \"School\" " +
                    "select REGION_ID, @city, @name, @symbol, @address, @phone, @fax, @email, 0 " +
                    "from CITIES " +
                    "where CITY_ID = @city and DATE_DELETED is null", params);
                data.school = r[0].School;
            }

            var records = await transaction.request("select max(Id) as \"MaxId\" from ProjectSchools");

            params = {
                id: ((records.length > 0 ? records[0].MaxId : null) || 0) + 1,
                project: projectId,
                city: cityId,
                season: currentSeason,
                school: data.school
            };

            await transaction.request(
                "insert into ProjectSchools(Id, ProjectRegistration, School, CreatedAt, ModifiedAt) " +
                "select @id, p.Id, @school, " +
                "  GETDATE(), GETDATE()" +
                "from ProjectRegistrations as p " +
                "where p.Project = @project and p.City = @city and p.Season = @season",
                params);

            await transaction.commit();
            callback(null, {id: params.id});
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.getProjectSchool = async function (projectId, user, schoolId, callback) {
    var connection = null;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            var records = await connection.request(
                "select s.Id as \"Id\", sc.SCHOOL_ID as \"School\", sc.SCHOOL_NAME as \"Name\", sc.SYMBOL as \"Symbol\", " +
                "  sc.FROM_GRADE as \"FromGrade\", sc.TO_GRADE as \"ToGrade\", sc.ADDRESS as \"Address\", " +
                "  sc.PHONE as \"PhoneNumber\", sc.FAX as \"Fax\", sc.EMAIL as \"Email\", " +
                "  s.Item1 as \"Item1\", " +
                "  s.PrincipalName as \"PrincipalName\", s.PrincipalPhoneNumber as \"PrincipalPhoneNumber\", s.PrincipalEmail as \"PrincipalEmail\", " +
                "  s.CoordinatorName as \"CoordinatorName\", s.CoordinatorPhoneNumber as \"CoordinatorPhoneNumber\", s.CoordinatorEmail as \"CoordinatorEmail\" " +
                "from ProjectRegistrations as p " +
                "  join ProjectSchools as s on p.Id = s.ProjectRegistration " +
                "  join SCHOOLS as sc on sc.SCHOOL_ID = s.School and sc.CITY_ID = p.City " +
                "where p.Project = @project and p.City = @city and p.Season = @season and " +
                "  s.School = @school and sc.DATE_DELETED is null",
                {project: projectId, city: cityId, season: currentSeason, school: schoolId}
            );

            if (records.length === 0) {
                callback({status: 404, message: "School not found in project"});
                return;
            }

            var record = records[0];

            var result = {
                id: record.School,
                name: record.Name,
                symbol: record.Symbol,
                details: {
                    type: getSchoolType(record.FromGrade, record.ToGrade),
                    address: record.Address,
                    phoneNumber: record.PhoneNumber,
                    fax: record.Fax,
                    email: record.Email,
                    canChange: false
                },
                principal: {
                    name: record.PrincipalName,
                    phoneNumber: record.PrincipalPhoneNumber,
                    email: record.PrincipalEmail,
                    canChange: true
                },
                coordinator: {
                    name: record.CoordinatorName,
                    phoneNumber: record.CoordinatorPhoneNumber,
                    email: record.CoordinatorEmail,
                    canChange: true
                },
                item1: record.Item1
            };

            callback(null, result);
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

ProjectRegistration.prototype.updateProjectSchool = async function (projectId, user, schoolId, data, callback) {
    var connection = null;
    var transaction;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            // School update
            var fields = [];
            var params = {
                school: schoolId,
                project: projectId,
                city: cityId,
                season: currentSeason
            };
            if (data.symbol != null) {
                params.symbol = data.symbol;
                fields.push("SYMBOL = @symbol");
            }
            if (data.name != null) {
                params.name = data.name;
                fields.push("SCHOOL_NAME = @name");
            }
            if (data.address != null) {
                params.address = data.address;
                fields.push("ADDRESS = @address");
            }
            if (data.phoneNumber != null) {
                params.phoneNumber = data.phoneNumber;
                fields.push("PHONE = @phoneNumber");
            }
            if (data.fax != null) {
                params.fax = data.fax;
                fields.push("FAX = @fax");
            }
            if (data.email != null) {
                params.email = data.email;
                fields.push("EMAIL = @email");
            }

            if (fields.length > 0) {
                await transaction.request(
                    "update SCHOOLS " +
                    "set " +
                    fields.join(", ") +
                    "  , DATE_LAST_MODIFIED = GETDATE() " +
                    "where SCHOOL_ID in (select ps.School " +
                    "                    from ProjectRegistrations pr " +
                    "                      join ProjectSchools as ps on pr.Id = ps.ProjectRegistration " +
                    "                    where pr.Project = @project and pr.City = @city and " +
                    "                      pr.Season = @season and ps.School = @school)",
                    params);
            }

            fields = [];
            params = {
                school: schoolId,
                project: projectId,
                city: cityId,
                season: currentSeason,
                principalName: null,
                principalPhoneNumber: null,
                principalEmail: null,
                coordinatorName: null,
                coordinatorPhoneNumber: null,
                coordinatorEmail: null,
                item1: null
            };

            if (data.principal) {
                params.principalName = data.principal.name;
                params.principalPhoneNumber = data.principal.phoneNumber;
                params.principalEmail = data.principal.email;
                fields.push("PrincipalName = @principalName, PrincipalPhoneNumber = @principalPhoneNumber, PrincipalEmail = @principalEmail");
            }

            if (data.coordinator) {
                params.coordinatorName = data.coordinator.name;
                params.coordinatorPhoneNumber = data.coordinator.phoneNumber;
                params.coordinatorEmail = data.coordinator.email;
                fields.push("CoordinatorName = @coordinatorName, CoordinatorPhoneNumber = @coordinatorPhoneNumber, CoordinatorEmail = @coordinatorEmail");
            }

            if (data.item1 != null) {
                params.item1 = data.item1;
                fields.push("Item1 = @item1");
            }

            if (fields.length > 0) {
                await transaction.request(
                    "update ProjectSchools " +
                    "set " +
                    fields.join(", ") +
                    "  , ModifiedAt = GETDATE() " +
                    "where School = @school and ProjectRegistration = " +
                    "  (select Id " +
                    "   from ProjectRegistrations  " +
                    "   where Project = @project and City = @city and Season = @season)",
                    params);
            }

            await transaction.commit();
            callback();
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.deleteProjectSchool = async function (projectId, user, schoolId, callback) {
    var connection = null;
    var transaction;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var params = {
                school: schoolId,
                project: projectId,
                city: cityId,
                season: currentSeason
            };

            await transaction.request(
                "delete from ProjectSchools " +
                "where School = @school and ProjectRegistration = " +
                "  (select Id " +
                "   from ProjectRegistrations  " +
                "   where Project = @project and City = @city and Season = @season)",
                params);

            await transaction.commit();
            callback();
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.getPlayerTeams = async function (season, projectId, idNumber, callback) {
    var connection = null;
    var qs = "";
    try {
        connection = await this.db.connect();
        qs = "Select Distinct pp.ProjectTeam " +
            "From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id " +
            "   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id\n" +
            "Where pp.IdNumber=@id And pr.Season=@season";
        var records = await connection.request(qs, {
            id: idNumber,
            season: season
        });
        var teams = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            var teamId = record['ProjectTeam'];
            teams.push(teamId);
        }
        callback(null, teams);
    }
    catch (err) {
        callback(err);
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};

ProjectRegistration.prototype.getProjectTeams = async function (season, projectId, cityId, teamId, withPlayers, callback) {
    var connection = null;
    var qs = "";
    try {
        connection = await this.db.connect();
        qs = "select t.Id as \"Id\", t.School as \"School\", t.Item1 as \"Item1\", t.Item2 as \"Item2\", t.Item3 as \"Item3\", " +
            "  t.Ages as \"Ages\", t.Activity as \"Activity\", " +
            "  t.Facility as \"Facility\", f.FACILITY_NAME as \"FacilityName\", f.ADDRESS as \"FacilityAddress\", f.FACILITY_TYPE as \"FacilityType\", " +
            "  t.CoachName as \"CoachName\", t.CoachEmail as \"CoachEmail\", t.CoachPhoneNumber as \"CoachPhoneNumber\", " +
            "  t.CoachGender as \"CoachGender\", t.CoachCertification as \"CoachCertification\", t.Approved as \"Approved\" " +
            "from ProjectRegistrations as p " +
            "  join ProjectTeams as t on p.Id = t.ProjectRegistration " +
            "  left outer join FACILITIES as f on f.FACILITY_ID = t.Facility and f.CITY_ID = p.City and f.SCHOOL_ID is null " +
            "where p.Project = @project and p.Season = @season";
        if (cityId) {
            qs += " and p.City = @city";
        }
        if (teamId) {
            qs += " and t.Id = @team";
        }
        var teamRecords = await connection.request(qs, {
            project: projectId,
            city: cityId,
            team: teamId,
            season: season
        });
        var teams = [];
        for (var i = 0; i < teamRecords.length; i++) {
            var teamRecord = teamRecords[i];

            var activity;
            if (teamRecord.Activity != null) {
                try {
                    activity = JSON.parse(teamRecord.Activity);
                } catch (e) {
                    activity = [];
                }
            } else {
                activity = [];
            }

            var team = {
                id: teamRecord.Id,
                school: teamRecord.School,
                item1: teamRecord.Item1,
                item2: teamRecord.Item2,
                item3: teamRecord.Item3,
                ages: teamRecord.Ages,
                activity: activity,
                approved: teamRecord.Approved,
                approvals: {},
                facility: teamRecord.Facility == null ? null : {
                    id: teamRecord.Facility,
                    name: teamRecord.FacilityName,
                    address: teamRecord.FacilityAddress,
                    type: teamRecord.FacilityType
                },
                coach: {
                    name: teamRecord.CoachName,
                    phoneNumber: teamRecord.CoachPhoneNumber,
                    email: teamRecord.CoachEmail,
                    gender: teamRecord.CoachGender,
                    certification: teamRecord.CoachCertification
                }
            };

            teams.push(team);
        }

        if (withPlayers) {
            qs = "select pp.Id as \"Id\", pp.ProjectTeam as \"Team\", pp.FirstName as \"FirstName\", pp.LastName as \"LastName\", " +
                "  pp.IdNumber as \"IdNumber\", pp.IdNumberType as \"IdNumberType\", " +
                "  pp.BirthDate as \"BirthDate\", pp.Gender as \"Gender\", pp.Item1 as \"Item1\" " +
                "from ProjectRegistrations as p " +
                "  join ProjectTeams as t on p.Id = t.ProjectRegistration " +
                "  join ProjectPlayers as pp on t.Id = pp.ProjectTeam " +
                "where p.Project = @project and p.Season = @season";
            if (cityId) {
                qs += " and p.City = @city";
            }
            if (teamId) {
                qs += " and t.Id = @team";
            }
            var playerRecords = await connection.request(qs, {
                project: projectId,
                city: cityId,
                team: teamId,
                season: season
            });
            var teamsPlayers = {};
            for (var j = 0; j < playerRecords.length; j++) {
                var playerRecord = playerRecords[j];
                var teamPlayers = teamsPlayers[playerRecord.Team];
                if (!teamPlayers) {
                    teamsPlayers[playerRecord.Team] = teamPlayers = [];
                }
                var player = {
                    id: playerRecord.Id,
                    firstName: playerRecord.FirstName,
                    lastName: playerRecord.LastName,
                    idNumber: playerRecord.IdNumber,
                    idNumberType: playerRecord.IdNumberType,
                    birthDate: playerRecord.BirthDate,
                    gender: playerRecord.Gender,
                    item1: playerRecord.Item1
                };
                if (player.idNumber) {
                    var baseLocation = cityId + '/project-' + projectId + '-players/' + player.idNumber;
                    player.picture = util.getFilePath(baseLocation + '/picture', settings.cityContent);
                    player.idSlip = util.getFilePath(baseLocation + '/id-slip', settings.cityContent);
                    player.medicalApproval = util.getFilePath(baseLocation + '/medical-approval', settings.cityContent);
                }
                //console.log(player);
                teamPlayers.push(player);
            }

            for (var j = 0; j < teams.length; j++) {
                var curTeam = teams[j];
                curTeam.players = teamsPlayers[curTeam.id] || [];
                curTeam.peleCount = curTeam.players.filter(p => utils.parseJsonOrEmpty(p.item1).isPele).length;
            }
        }
        qs = "select t.Id as \"TeamId\", a.UserId as \"UserId\", a.Approval as \"Approval\", a.Time as \"Time\", u.USER_FIRST_NAME as FirstName, u.USER_LAST_NAME as LastName " +
            "from ProjectTeams as t " +
            "  join ProjectRegistrations as r on t.ProjectRegistration = r.Id " +
            "  join Approvals as a on a.Item = t.Id and a.Approval like 'project-team:%' " +
            "  join USERS as u on a.UserId = u.USER_ID " +
            "where r.Season = @season and r.Project = @project";
        if (cityId) {
            qs += " and r.City = @city";
        }
        if (teamId) {
            qs += " and t.Id = @team";
        }
        var approvalRecords = await connection.request(qs, {
            season: season,
            project: projectId,
            city: cityId,
            team: teamId
        });
        for (var n = 0; n < approvalRecords.length; n++) {
            var approvalRecord = approvalRecords[n];
            var matchingTeams = teams.filter(function(t) {
                return t.id == approvalRecord.TeamId;
            });
            if (matchingTeams.length > 0) {
                var matchingTeam = matchingTeams[0];
                var approval = matchingTeam.approvals[approvalRecord.Approval];
                if (!approval || approval.time < approvalRecord.Time) {
                    matchingTeam.approvals[approvalRecord.Approval]  = {
                        userId: approvalRecord.UserId,
                        time: approvalRecord.Time,
                        firstName: approvalRecord.FirstName,
                        lastName: approvalRecord.LastName
                    };
                }
            }
        }

        callback(null, teams);
    }
    catch (err) {
        callback(err);
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};

ProjectRegistration.prototype.insertProjectTeam = async function (projectId, user, data, callback) {
    var connection = null;
    var transaction;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var records = await transaction.request("select max(Id) as \"MaxId\" from ProjectTeams");
            var params = {
                id: ((records.length > 0 ? records[0].MaxId : null) || 0) + 1,
                project: projectId,
                city: cityId,
                season: currentSeason,
                school: data.school,
                item1: data.item1,
                item2: data.item2,
                item3: data.item3,
                ages: data.ages,
                studentCount: data.studentCount,
                activity: data.activity ? JSON.stringify(data.activity) : null,
                facility: null,
                coachName: null,
                coachPhoneNumber: null,
                coachEmail: null,
                coachGender: null,
                coachCertification: null
            };

            //console.log(data.facility);
            if (data.facility) {
                if (data.facility.id) {
                    params.facility = data.facility.id;
                }
                else {
                    records = await transaction.request(
                        "insert into FACILITIES(FACILITY_NAME, CITY_ID, ADDRESS, FACILITY_TYPE) " +
                        "output INSERTED.FACILITY_ID as \"Facility\" " +
                        "values(@name, @city, @address, @type) ",
                        {name: data.facility.name, city: cityId, address: data.facility.address, type: data.facility.type});
                    params.facility = records[0].Facility;
                }
            }

            if (data.coach) {
                params.coachName = data.coach.name;
                params.coachPhoneNumber = data.coach.phoneNumber;
                params.coachEmail = data.coach.email;
                params.coachGender = data.coach.gender;
                params.coachCertification = data.coach.certification;
            }


            await transaction.request(
                "insert into ProjectTeams(Id, ProjectRegistration, School, Item1, Item2, Item3, " +
                "  Ages, StudentCount, Activity, Facility, " +
                "  CoachName, CoachEmail, CoachPhoneNumber, CoachGender, CoachCertification, CreatedAt, ModifiedAt) " +
                "select @id, p.Id, @school, @item1, @item2, @item3, @ages, @studentCount, @activity, @facility, " +
                "  @coachName, @coachEmail, @coachPhoneNumber, @coachGender, @coachCertification, " +
                "  GETDATE(), GETDATE()" +
                "from ProjectRegistrations as p " +
                "where p.Project = @project and p.City = @city and p.Season = @season",
                params);

            await transaction.commit();
            callback(null, {id: params.id});
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.deleteProjectTeams = async function (projectId, user, teamsToRemove, callback) {
    var connection = null;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        var transaction;
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var params = {
                project: projectId,
                city: cityId,
                season: currentSeason
            };

            for (var n = 0; n < teamsToRemove.length; n++) {
                params.team = teamsToRemove[n];

                await transaction.request(
                    "delete from ProjectTeams " +
                    "where Id = @team and ProjectRegistration = " +
                    "  (select Id " +
                    "   from ProjectRegistrations  " +
                    "   where Project = @project and City = @city and Season = @season)",
                    params);
            }

            await transaction.commit();
            callback();
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.updateProjectTeam = async function (projectId, user, teamId, data, callback) {
    var connection = null;
    var cityId = user.cityID;
    var transaction;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var fields = [];
            var params = {
                id: teamId,
                project: projectId,
                city: cityId,
                season: currentSeason,
                school: data.school,
                item1: data.item1,
                item2: data.item2,
                item3: data.item3,
                ages: data.ages,
                studentCount: data.studentCount,
                facility: null,
                coachName: null,
                coachPhoneNumber: null,
                coachEmail: null,
                coachGender: null,
                coachCertification: null
            };

            if (data.school !== undefined) {
                fields.push("School = @school");
            }
            if (data.item1 !== undefined) {
                fields.push("Item1 = @item1");
            }
            if (data.item2 !== undefined) {
                fields.push("Item2 = @item2");
            }
            if (data.item3 !== undefined) {
                fields.push("Item3 = @item3");
            }
            if (data.ages !== undefined) {
                fields.push("Ages = @ages");
            }
            if (data.studentCount !== undefined) {
                fields.push("StudentCount = @studentCount");
            }
            if (data.activity !== undefined) {
                params.activity = data.activity ? JSON.stringify(data.activity) : null;
                fields.push("Activity = @activity");
            }
            if (data.coach) {
                params.coachName = data.coach.name;
                params.coachPhoneNumber = data.coach.phoneNumber;
                params.coachEmail = data.coach.email;
                params.coachGender = data.coach.gender;
                params.coachCertification = data.coach.certification;
                fields.push("CoachName = @coachName, CoachPhoneNumber = @coachPhoneNumber, CoachEmail = @coachEmail, CoachGender = @coachGender, CoachCertification = @coachCertification");
            }


            if (data.facility) {
                if (data.facility.id) {
                    params.facility = data.facility.id;
                }
                else {
                    var records = await transaction.request(
                        "insert into FACILITIES(FACILITY_NAME, CITY_ID, ADDRESS, FACILITY_TYPE) " +
                        "output INSERTED.FACILITY_ID as \"Facility\" " +
                        "values(@name, @city, @address, @type) ",
                        {name: data.facility.name, city: cityId, address: data.facility.address, type: data.facility.type});
                    params.facility = records[0].Facility;
                }
                fields.push("Facility = @facility");
            }

            await transaction.request(
                "update ProjectTeams " +
                "set " +
                fields.join(", ") +
                "  , ModifiedAt = GETDATE() " +
                "where Id = @id and ProjectRegistration = " +
                "  (select Id " +
                "   from ProjectRegistrations  " +
                "   where Project = @project and City = @city and Season = @season)",
                params);

            await transaction.commit();
            callback();
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.insertProjectPlayer = async function (projectId, user, teamId, data, callback) {
    var connection = null;
    var transaction;
    var cityId = user.cityID;
    var service = this;
    var insertResult = {
        id: 0,
        picture: null,
        idSlip: null,
        medicalApproval: null
    };
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var records = await transaction.request("select max(Id) as \"MaxId\" from ProjectPlayers");
            var params = {
                project: projectId,
                city: cityId,
                season: currentSeason,
                team: teamId,
                id: ((records.length > 0 ? records[0].MaxId : null) || 0) + 1,
                firstName: data.firstName,
                lastName: data.lastName,
                idNumber: data.idNumber,
                idNumberType: data.idNumberType,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                gender: data.gender,
                item1: data.item1
            };
            insertResult.id = params.id;
            await transaction.request(
                "insert into ProjectPlayers(Id, ProjectTeam, FirstName, LastName, " +
                "  IdNumber, IdNumberType, BirthDate, Gender, Item1, CreatedAt, ModifiedAt) " +
                "select @id, pt.Id, @firstName, @lastName, @idNumber, @idNumberType, @birthDate, " +
                "  @gender, @item1, GETDATE(), GETDATE()" +
                "from ProjectRegistrations as p " +
                "  join ProjectTeams as pt on p.Id = pt.ProjectRegistration " +
                "where p.Project = @project and p.City = @city and p.Season = @season and pt.Id = @team",
                params);
            await transaction.commit();
            if (data.idNumber != null && data.idNumber.length > 0) {
                var baseLocation = cityId + '/project-' + projectId + '-players/' + data.idNumber;
                if (data.picture && data.picture.path) {
                    util.moveFile(data.picture, baseLocation + '/picture', settings.cityContent);
                    insertResult.picture = util.getFilePath(baseLocation + '/picture', settings.cityContent);
                }
                if (data.idSlip && data.idSlip.path) {
                    util.moveFile(data.idSlip, baseLocation + '/id-slip', settings.cityContent);
                    insertResult.idSlip = util.getFilePath(baseLocation + '/id-slip', settings.cityContent);
                }
                if (data.medicalApproval && data.medicalApproval.path) {
                    util.moveFile(data.medicalApproval, baseLocation + '/medical-approval', settings.cityContent);
                    insertResult.medicalApproval = util.getFilePath(baseLocation + '/medical-approval', settings.cityContent);
                }
            }
            callback(null, insertResult);
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.updateProjectPlayer = async function (projectId, user, teamId, playerId, data, callback) {
    var connection = null;
    var transaction;
    var cityId = user.cityID;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var params = {
                project: projectId,
                city: cityId,
                season: currentSeason,
                team: teamId,
                id: playerId,
                firstName: data.firstName,
                lastName: data.lastName,
                idNumber: data.idNumber,
                idNumberType: data.idNumberType,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                gender: data.gender,
                item1: data.item1
            };
            var fields = [];
            if (data.firstName !== undefined) {
                fields.push("FirstName = @firstName");
            }
            if (data.lastName !== undefined) {
                fields.push("LastName = @lastName");
            }
            if (data.idNumber !== undefined) {
                fields.push("IdNumber = @idNumber, IdNumberType = @idNumberType");
            }
            if (data.birthDate !== undefined) {
                fields.push("BirthDate = @birthDate");
            }
            if (data.gender !== undefined) {
                fields.push("Gender = @gender");
            }
            if (data.item1 !== undefined) {
                fields.push("Item1 = @item1");
            }
            await transaction.request(
                "update ProjectPlayers " +
                "set " +
                fields.join(", ") +
                "  , ModifiedAt = GETDATE() " +
                "where Id = @id and ProjectTeam = " +
                "  (select pt.Id " +
                "   from ProjectRegistrations as p " +
                "     join ProjectTeams as pt on p.Id = pt.ProjectRegistration " +
                "   where p.Project = @project and p.City = @city and p.Season = @season and pt.Id = @team)",
                params);
            await transaction.commit();
            var updateResult = {
                picture: null,
                idSlip: null,
                medicalApproval: null
            };
            if (data.idNumber != null && data.idNumber.length > 0) {
                var baseLocation = cityId + '/project-' + projectId + '-players/' + data.idNumber;
                if (data.picture && data.picture.path) {
                    util.moveFile(data.picture, baseLocation + '/picture', settings.cityContent);
                    updateResult.picture = util.getFilePath(baseLocation + '/picture', settings.cityContent);
                }
                if (data.idSlip && data.idSlip.path) {
                    util.moveFile(data.idSlip, baseLocation + '/id-slip', settings.cityContent);
                    updateResult.idSlip = util.getFilePath(baseLocation + '/id-slip', settings.cityContent);
                }
                if (data.medicalApproval && data.medicalApproval.path) {
                    util.moveFile(data.medicalApproval, baseLocation + '/medical-approval', settings.cityContent);
                    updateResult.medicalApproval = util.getFilePath(baseLocation + '/medical-approval', settings.cityContent);
                }
            }
            callback(null, updateResult);
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

ProjectRegistration.prototype.deleteProjectPlayers = async function (projectId, user, teamId, players, callback) {
    var connection = null;
    var cityId = user.cityID;
    var transaction;
    var service = this;
    Season.current(user, async function(currentSeason) {
        try {
            connection = await service.db.connect();
            transaction = await connection.transaction();
            var params = {
                project: projectId,
                city: cityId,
                team: teamId,
                season: currentSeason
            };

            for (var n = 0; n < players.length; n++) {
                params.player = players[n];

                await transaction.request(
                    "delete from ProjectPlayers " +
                    "where Id = @player and ProjectTeam = " +
                    "  (select pt.Id " +
                    "   from ProjectRegistrations as p " +
                    "     join ProjectTeams pt on p.Id = pt.ProjectRegistration " +
                    "   where p.Project = @project and p.City = @city and p.Season = @season and pt.Id = @team)",
                    params);
            }

            await transaction.commit();
            callback();
        }
        catch (err) {
            if (transaction) {
                transaction.rollback();
            }
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
};

module.exports = new ProjectRegistration(require('../db'));