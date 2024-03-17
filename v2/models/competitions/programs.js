var Category = require('./category');

var oldDb = require('../db');

module.exports = {
    readSeason: async function (db, seasonId) {
        var competitions = {};
        var meetings = {};
        var season = null;

        /*var connection;
        try {
            connection = await db.connect();

            var records = await connection.request(
                "select s.uid as \"Season\", s.Program as \"Program\", p.Name as \"ProgramName\", " +
                "  s.Name as \"Name\", s.StartDate as \"StartDate\", s.EndDate as \"EndDate\" " +
                "from Seasons as s " +
                "  join Programs as p on s.Program = s.Program " +
                "where s.uid = @season",
                {season: seasonId});

            if (records.length > 0) {
                var record = records[0];

                season = {
                    id: seasonId,
                    name: record.Name,
                    program: record.Program == null ? null : {id: record.Program, name: record.ProgramName},
                    startDate: record.StartDate,
                    endDate: record.EndDate,
                    meetings: [],
                    competitions: []
                };

                records = await connection.request(
                    "select m.Meeting as \"Meeting\", m.Name as \"Name\", " +
                    "  m.StartDate as \"StartDate\", m.EndDate as \"EndDate\" " +
                    "from Meetings as m " +
                    "where m.Season = @season " +
                    "order by m.Meeting",
                    {season: seasonId});

                for (var m = 0; m < records.length; m++) {
                    meetings[record.Meeting] = true;
                    var record = records[m];
                    season.meetings.push({
                        id: record.Meeting,
                        name: record.Name,
                        startDate: record.StartDate,
                        endDate: record.EndDate
                    });
                }

                records = await connection.request(
                    "select c.uid as \"Competition\", c.Sport as \"Sport\", c.Name as \"Name\", " +
                    "  c.Category as \"Category\", s.Name as \"SportName\", s.Type as \"SportType\" " +
                    "from Competitions as c " +
                    "  join Sports as s on c.Sport = s.uid " +
                    "where c.Season = @season",
                    {season: seasonId});

                for (var n = 0; n < records.length; n++) {
                    var record = records[n];
                    var competition = {
                        id: record.Competition,
                        name: record.Name,
                        category: new Category(record.Category),
                        sport: {
                            id: record.Sport.toString(),
                            name: record.SportName,
                            match: (record.SportType & 2) === 2,
                            individual: (record.SportType % 1) === 1
                        }
                    };

                    competitions[competition.id] = competition;
                    season.competitions.push(competition);

                }
            }
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }*/

        var connection = null;
        try {
            connection = await oldDb.connect();

            if (season == null) {
                var records = await connection.request(
                    "select c.CHAMPIONSHIP_ID as \"Season\", c.REGION_ID as \"Region\", c.CHAMPIONSHIP_NAME as \"Name\" " +
                    "from CHAMPIONSHIPS as c " +
                    "where c.CHAMPIONSHIP_ID = @season and c.DATE_DELETED is null",
                    {season: seasonId});

                if (records.length > 0) {
                    var record = records[0];
                    season = {
                        id: seasonId,
                        name: record.Name,
                        program: {
                            id: seasonId,
                            region: record.Region
                        },
                        startDate: null,
                        endDate: null,
                        meetings: [],
                        competitions: []
                    };
                }
            }

            if (season) {
                var records = await connection.request(
                    "select p.PHASE as \"Phase\", p.PHASE_NAME as \"PhaseName\" " +
                    "from CHAMPIONSHIPS as c " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                    "  join CHAMPIONSHIP_PHASES as p on p.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID " +
                    "where c.DATE_DELETED is null and cc.DATE_DELETED is null and p.DATE_DELETED is null and c.CHAMPIONSHIP_ID = @season",
                    {season: seasonId});

                for (var r = 0; r < records.length; r++) {
                    var record = records[r];
                    if (!meetings[record.Phase]) {
                        season.meetings.push({
                            id: record.Phase,
                            name: record.PhaseName,
                            startDate: null,
                            endDate: null
                        });
                        meetings[record.Phase] = true;
                    }
                }

                records = await connection.request(
                    "select cc.CHAMPIONSHIP_CATEGORY_ID as \"Id\", " +
                    "  c.CHAMPIONSHIP_NAME as \"Name\", cc.CATEGORY as \"Category\", " +
                    "  c.SPORT_ID as \"Sport\", s.SPORT_NAME as \"SportName\", s.SPORT_TYPE as \"SportType\" " +
                    "from CHAMPIONSHIPS as c " +
                    "  join CHAMPIONSHIP_CATEGORIES as cc on c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID " +
                    "  join SPORTS as s on c.SPORT_ID = s.SPORT_ID " +
                    "where c.DATE_DELETED is null and cc.DATE_DELETED is null and c.CHAMPIONSHIP_ID = @season",
                    {season: seasonId});
                for (var r = 0; r < records.length; r++) {
                    var record = records[r];
                    if (!competitions[record.Id]) {
                        var competition = {
                            id: record.Id,
                            name: record.Name,
                            category: new Category(Category.convertOldCategory(record.Category)),
                            sport: {
                                id: record.Sport.toString(),
                                name: record.SportName,
                                match: record.SportType === 2,
                                individual: record.SportType === 1
                            }
                        };

                        competitions[competition.id] = competition;
                        season.competitions.push(competition);
                    }
                }
            }
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }

        return season;
    }
};