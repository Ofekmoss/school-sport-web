var db = require('../db');

async function readTeamsInfo(ids) {
    var connection;
    try {
        connection = await db.connect();
        var params = {};
        for (var i = 0; i < ids.length; i++) {
            params["t" + i] = ids[i];
        }
        var records = await connection.request(
            "select t.TEAM_ID as \"Team\", t.SCHOOL_ID as \"School\", s.SCHOOL_NAME as \"SchoolName\", " +
            "  s.REGION_ID as \"Region\", r.REGION_NAME as \"RegionName\", " +
            "  c.CITY_ID as \"City\", c.CITY_NAME as \"CityName\" " +
            "from TEAMS as t" +
            "  join SCHOOLS as s on t.SCHOOL_ID = s.SCHOOL_ID " +
            "  join REGIONS as r on s.REGION_ID = r.REGION_ID " +
            "  left outer join CITIES as c on s.CITY_ID = c.CITY_ID " +
            "where t.TEAM_ID in (" + ids.map(function (id, index) { return "@t" + index; }).join(", ") + ")",
            params
        );

        var result = [];
        for (var r = 0; r < records.length; r++) {
            var record = records[r];
            result.push({
                id: record.Team,
                school: {
                    id: record.School,
                    name: record.SchoolName
                },
                region: {
                    id: record.Region,
                    name: record.RegionName
                },
                city: record.City ? {
                    id: record.City,
                    name: record.CityName
                } : null
            });
        }

        return result;
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
}

module.exports = {
    teamsInfo: readTeamsInfo
};