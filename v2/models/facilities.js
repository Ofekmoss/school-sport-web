
function Facilities(db) {
    this.db = db;
}

Facilities.prototype.getFacilityById = function (facilityId, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select FACILITY_ID as \"Id\", FACILITY_NAME as \"Name\", ADDRESS as \"Address\", " +
                    "  FACILITY_TYPE as \"Type\", REGION_ID as \"Region\" " +
                    "from FACILITIES " +
                    "where DATE_DELETED Is Null And FACILITY_ID = @id",
                    {id: facilityId})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = {};
                            if (records.length > 0) {
                                var record = records[0];
                                result = {
                                    id: record.Id,
                                    name: record.Name,
                                    address: record.Address,
                                    type: record.Type,
                                    region: record.Region
                                }
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

Facilities.prototype.getRegions = function (callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select distinct f.REGION_ID as \"Id\", r.REGION_NAME as \"Name\" " +
                    "from FACILITIES f Inner Join REGIONS r On f.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                    "where f.DATE_DELETED Is Null " +
                    "order by r.REGION_NAME",
                    {})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                result.push({id: record.Id, name: record.Name});
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

Facilities.prototype.getFacilitiesByRegion = function (region, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select FACILITY_ID as \"Id\", FACILITY_NAME as \"Name\", ADDRESS as \"Address\", " +
                    "  FACILITY_TYPE as \"Type\", REGION_ID as \"Region\" " +
                    "from FACILITIES " +
                    "where DATE_DELETED Is Null And REGION_ID = @region " +
                    "order by FACILITY_NAME asc",
                    {region: region})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                result.push({
                                    id: record.Id,
                                    name: record.Name,
                                    region: record.Region,
                                    address: record.Address,
                                    type: record.Type
                                });
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

Facilities.prototype.getFacilitiesBySchool = function (school, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select FACILITY_ID as \"Id\", FACILITY_NAME as \"Name\", ADDRESS as \"Address\", " +
                    "  FACILITY_TYPE as \"Type\", REGION_ID as \"Region\" " +
                    "from FACILITIES " +
                    "where DATE_DELETED Is Null And Len(IsNull(FACILITY_NAME, ''))>0 And (SCHOOL_ID = @school Or FACILITY_ID In (" +
                    "   Select Distinct tr.Facility" +
                    "   From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "       Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "   Where c.SEASON=70 And tr.School=@school" +
                    "))",
                    {school: school})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                result.push({
                                    id: record.Id,
                                    name: record.Name,
                                    address: record.Address,
                                    type: record.Type,
                                    region: record.Region});
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

Facilities.prototype.getFacilitiesByTeam = function (team, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select f.FACILITY_ID as \"Id\", f.FACILITY_NAME as \"Name\", f.ADDRESS as \"Address\", " +
                    "  f.FACILITY_TYPE as \"Type\", REGION_ID as \"Region\" " +
                    "from FACILITIES as f " +
                    "  join TEAMS as t on f.SCHOOL_ID = t.SCHOOL_ID and t.DATE_DELETED is null " +
                    "where f.DATE_DELETED Is Null And t.TEAM_ID = @team",
                    {team: team})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                result.push({
                                    id: record.Id,
                                    name: record.Name,
                                    address: record.Address,
                                    type: record.Type,
                                    region: record.Region
                                });
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

Facilities.prototype.getFacilitiesByCity = function (city, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select FACILITY_ID as \"Id\", FACILITY_NAME as \"Name\", ADDRESS as \"Address\", " +
                    "  FACILITY_TYPE as \"Type\", REGION_ID as \"Region\" " +
                    "from FACILITIES " +
                    "where DATE_DELETED Is Null And CITY_ID = @city",
                    {city: city})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = [];

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                result.push({
                                    id: record.Id,
                                    name: record.Name,
                                    address: record.Address,
                                    type: record.Type,
                                    region: record.Region
                                });
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

Facilities.prototype.insertFacility = function (school, facility, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "insert into FACILITIES(FACILITY_NAME, ADDRESS, SCHOOL_ID, REGION_ID) " +
                    "output INSERTED.FACILITY_ID as \"Id\" " +
                    "select @name, @address, SCHOOL_ID, REGION_ID " +
                    "from SCHOOLS " +
                    "where SCHOOL_ID = @school",
                    {school: school, name: facility.name, address: facility.address})
                    .then(
                        function (records) {
                            connection.complete();

                            callback(null, {id: records[0].Id});
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

Facilities.prototype.updateFacility = function (school, facilityId, facility, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "update FACILITIES " +
                    "set FACILITY_NAME = @name, " +
                    "  ADDRESS = @address " +
                    "where SCHOOL_ID = @school and FACILITY_ID = @facility",
                    {school: school, facility: facilityId, name: facility.name, address: facility.address})
                    .then(
                        function (records) {
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


module.exports = new Facilities(require('./db'));