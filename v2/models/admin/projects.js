var Cities = require('../cities');
var utils = require('../utils');

function Projects(db) {
    this.db = db;
}

Projects.prototype.list = function (season, projectId, options, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select p.Id as \"Id\", p.City as \"City\", c.CITY_NAME as \"CityName\", " +
                    "  r.REGION_ID as \"Region\", r.REGION_NAME as \"RegionName\", " +
                    "  p.Status as \"Status\", p.Item1 as \"Item1\", p.Item2 as \"Item2\", p.Item3 as \"Item3\" " +
                    "from ProjectRegistrations as p " +
                    "  join CITIES as c on c.CITY_ID = p.City " +
                    "  join REGIONS as r on c.REGION_ID = r.REGION_ID " +
                    "where p.Season = @season and p.Project = @project",
                    {season: season, project: projectId})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = records.map(function (x) {
                                var items = [];
                                if (x.Item1 && x.Item1.length > 0) {
                                    items.push(x.Item1);
                                }
                                if (x.Item2 && x.Item2.length > 0) {
                                    items.push(x.Item2);
                                }
                                if (x.Item3 && x.Item3.length > 0) {
                                    items.push(x.Item3);
                                }

                                return {
                                    id: x.Id,
                                    city: {
                                        id: x.City,
                                        name: x.CityName
                                    },
                                    region: {
                                        id: x.Region,
                                        name: x.RegionName
                                    },
                                    items: items.join(", "),
                                    schoolCount: 0,
                                    teamCount: 0,
                                    studentCount: 0
                                };
                            });

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

Projects.prototype.insert = function (season, projectId, registration, callback) {
    var self = this;
    Cities.getById(registration.city, function (err, city) {
        if (err) {
            callback(err);
        }
        else if (!city) {
            callback({status: 404, message: "City not found"});
        }
        else {
            var region = city.region;
            delete city.region;
            self.db.connect()
                .then(
                    function (connection) {
                        connection.request("select max(Id) as \"MaxId\" from ProjectRegistrations")
                            .then(
                                function (records) {
                                    return records[0].MaxId;
                                }
                            )
                            .then(
                                function (lastRegistrationId) {
                                    var registrationId = lastRegistrationId == null ? 1 : lastRegistrationId + 1;
                                    connection.request(
                                        "insert into ProjectRegistrations(Id, City, Season, Project) " +
                                        "values(@id, @city, @season, @project) ",
                                        {
                                            id: registrationId,
                                            city: city.id,
                                            season: season,
                                            project: projectId
                                        })
                                        .then(
                                            function () {
                                                connection.complete();
                                                callback(null, {
                                                    id: registrationId,
                                                    city: city,
                                                    region: region,
                                                    schoolCount: 0,
                                                    teamCount: 0,
                                                    studentCount: 0
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
                    });
        }
    });
};

Projects.prototype.delete = function (season, projectId, registrationId, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "delete from ProjectRegistrations " +
                    "where Id = @registration and Project = @project and Season = @season ",
                    {
                        registration: registrationId,
                        season: season,
                        project: projectId
                    })
                    .then(
                        function () {
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
            });
};

Projects.prototype.listTeams = async function (season, projectId, options, callback) {
    var connection;
    try {
        connection = await this.db.connect();
		var qs = "select t.Id as \"Id\", t.ProjectRegistration as \"ProjectRegistration\", " +
            "  r.City as \"City\", c.CITY_NAME as \"CityName\", " +
            "  c.REGION_ID as \"Region\", rg.REGION_NAME as \"RegionName\", " +
            "  t.Item1 as \"Item1\", t.Item2 as \"Item2\", t.Item3 as \"Item3\", t.Ages as \"Ages\", " +
            "  t.CreatedAt as \"CreatedAt\", t.ModifiedAt as \"ModifiedAt\", " +
            "  t.Facility as \"Facility\", t.Activity as \"Activity\", " +
            "  t.CoachName as \"CoachName\", t.CoachEmail as \"CoachEmail\", t.CoachPhoneNumber as \"CoachPhoneNumber\", " +
            "  t.CoachGender as \"CoachGender\", t.CoachCertification as \"CoachCertification\", " +
            "  t.Approved as \"Approved\", " +
            "  f.FACILITY_NAME as \"FacilityName\", f.ADDRESS as \"FacilityAddress\" " +
            "from ProjectTeams as t " +
            "  join ProjectRegistrations as r on t.ProjectRegistration = r.Id " +
            "  join CITIES as c on c.CITY_ID = r.City " +
            "  join REGIONS as rg on c.REGION_ID = rg.REGION_ID " +
            "  left outer join FACILITIES as f on t.Facility = f.FACILITY_ID  and c.CITY_ID = f.CITY_ID " +
            "where r.Season = @season and r.Project = @project" +
            (options != null && options.region != null ? " and rg.REGION_ID = @region" : "") +
            (options != null && options.userCities ? " and c.CITY_ID in (select CITY_ID from UserCities where USER_ID = @user)" : "");
        var records = await connection.request(qs, {
			season: season, 
			project: projectId, 
			region: options ? options.region : null, 
			user: options ? options.user : null
		});

        // TODO!!!

        // TODO - when setting approved should insert record to Approvals table e.g.:
        // insert into Approvals(UserId, Approval, Item, Time, Data)
        // values(<user>, 'project:team', <project-team>, @time, ??)
        var teams = {};
        var result = [];
        for (var n = 0; n < records.length; n++) {
            var r = records[n];
            var team = {
                id: r.Id,
                registration: r.ProjectRegistration,
                city: {
                    id: r.City,
                    name: r.CityName
                },
                region: {
                    id: r.Region,
                    name: r.RegionName
                },
                item1: utils.parseJsonOrEmpty(r.Item1),
                item2: utils.parseJsonOrEmpty(r.Item2),
                item3: utils.parseJsonOrEmpty(r.Item3),
                activity: utils.parseJsonOrEmpty(r.Activity, []),
                ages: r.Ages ? parseInt(r.Ages) : 0,
                coach: {
                    name: r.CoachName,
                    phoneNumber: r.CoachPhoneNumber,
                    email: r.CoachEmail,
                    gender: r.CoachGender,
                    certification: r.CoachCertification
                },
                facility: {
                    id: r.Facility,
                    name: r.FacilityName,
                    address: r.FacilityAddress
                },
                approved: r.Approved,
                peleCount: 0,
                players: [],
                approvals: {},
                createdAt: r.CreatedAt,
                modifiedAt: r.ModifiedAt
            };
            teams[team.id] = team;
            result.push(team);
        }

        records = await connection.request(
            "select t.Id as \"TeamId\", p.Id as \"Id\", " +
            "  p.FirstName as \"FirstName\", p.LastName as \"LastName\", p.IdNumber as \"IdNumber\", " +
            "  p.BirthDate as \"BirthDate\", p.Gender as \"Gender\", " +
            "  p.Item1 as \"Item1\" " +
            "from ProjectPlayers as p " +
            "  join ProjectTeams as t on p.ProjectTeam = t.Id " +
            "  join ProjectRegistrations as r on t.ProjectRegistration = r.Id " +
            "where r.Season = @season and r.Project = @project",
            {season: season, project: projectId});

        for (var n = 0; n < records.length; n++) {
            var r = records[n];
            var team = teams[r.TeamId];
            if (team) {
                var player = {
                    id: r.Id,
                    firstName: r.FirstName,
                    lastName: r.LastName,
                    idNumber: r.IdNumber,
                    birthDate: r.BirthDate,
                    gender: r.Gender,
                    item1: utils.parseJsonOrEmpty(r.Item1)
                };
                team.players.push(player);
                if (player.item1 && player.item1.isPele) {
                    team.peleCount++;
                }
            }
        }

        records = await connection.request(
            "select t.Id as \"TeamId\", a.UserId as \"UserId\", a.Approval as \"Approval\", a.Time as \"Time\", u.USER_FIRST_NAME as FirstName, u.USER_LAST_NAME as LastName " +
            "from ProjectTeams as t " +
            "  join ProjectRegistrations as r on t.ProjectRegistration = r.Id " +
            "  join Approvals as a on a.Item = t.Id and a.Approval like 'project-team:%' " +
            "  join USERS as u on a.UserId = u.USER_ID " +
            "where r.Season = @season and r.Project = @project",
            {season: season, project: projectId});

        for (var n = 0; n < records.length; n++) {
            var r = records[n];
            var team = teams[r.TeamId];
            if (team) {
                var approval = team.approvals[r.Approval];
                if (!approval || approval.time < r.Time) {
                    team.approvals[r.Approval]  = {
                        userId: r.UserId,
                        time: r.Time,
                        firstName: r.FirstName,
                        lastName: r.LastName
                    };
                }
            }
        }

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
};

Projects.prototype.setTeamsApproval = async function (userId, season, projectId, data, callback) {
    var connection;
    var transaction;

    try {
        connection = await this.db.connect();
        transaction = await connection.transaction();
        var params = {
            season: season,
            project: projectId,
            region: data.region,
            user: data.user
        };
        var teamParams = [];
        for (var n = 0; n < data.teams.length; n++) {
            params["t" + n] = data.teams[n];
            teamParams.push("@t" + n);
        }
        console.log(params);
        var records = await transaction.request(
            "select t.Id as \"Id\" " +
            "from ProjectTeams as t " +
            "  join ProjectRegistrations as r on t.ProjectRegistration = r.Id " +
            "  join CITIES as c on c.CITY_ID = r.City " +
            "  join REGIONS as rg on c.REGION_ID = rg.REGION_ID " +
            "where t.Id in (" + teamParams.join(", ") + ") and " +
            "  r.Season = @season and r.Project = @project" +
            (data.region != null ? " and rg.REGION_ID = @region" : "") +
            (data.userCities ? " and c.CITY_ID in (select CITY_ID from UserCities where USER_ID = @user)" : ""),
            params);

        var teams = [];

        for (var i = 0; i < records.length; i++) {
            var r = records[i];
            teams.push(r.Id);
            await transaction.request(
                "update ProjectTeams " +
                "set Approved = ((CASE WHEN Approved IS NULL THEN 0 ELSE Approved END) & ~ @remove) | @add, ModifiedAt = GETDATE() " +
                "where Id = @team",
                {team: r.Id, add: data.approve || 0, remove: data.clear || 0});
            if (data.approve) {
                await transaction.request(
                    "insert into Approvals(UserId, Approval, Item, Time) " +
                    "values(@user, @approval, @item, @time) ",
                    {user: userId, item: r.Id, approval: "project-team:" + data.approve, time: new Date()});
            }
        }

        await transaction.commit();

        callback(null, teams);
    }
    catch (err) {
        transaction.rollback();
        callback(err);
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};
module.exports = new Projects(require('../db'));