var utils = require('../utils');

function Competitions(db) {
    this.db = db;
}

Competitions.prototype.updateLogligId = async function (competition, logligId, callback) {
    var connection;
    try {
        connection = await this.db.connect();
        await connection.request("delete from LogligCompetitions where Competition = @competition", {competition: competition});
        if (logligId) {
            await connection.request("insert into LogligCompetitions(Competition, LogligId) values(@competition, @logligId)", {
                competition: competition,
                logligId: logligId
            });
        }
        callback();
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

Competitions.prototype.listEvents = async function (competition, callback) {
    var connection;
    try {
        connection = await this.db.connect();
        var records = await connection.request(
            "select ccc.CHAMPIONSHIP_CATEGORY_ID * 1000 + ccc.PHASE * 100 + ccc.NGROUP * 10 + ccc.COMPETITION as CompetitionId, " +
            "  ccc.PHASE as Phase, " +
            "  ccc.NGROUP as NGroup, " +
            "  ccc.COMPETITION as Competition, " +
            "  sf.SPORT_FIELD_NAME as DisciplineName, " +
            "  lc.LogligId as LogligId " +
            "from CHAMPIONSHIP_COMPETITIONS as ccc  " +
            "  join CHAMPIONSHIP_CATEGORIES as cc on ccc.CHAMPIONSHIP_CATEGORY_ID = cc.CHAMPIONSHIP_CATEGORY_ID " +
            "  join SPORT_FIELDS as sf on ccc.SPORT_FIELD_ID = sf.SPORT_FIELD_ID " +
            "  left outer join LogligCompetitions as lc on lc.Competition = ccc.CHAMPIONSHIP_CATEGORY_ID * 1000 + ccc.PHASE * 100 + ccc.NGROUP * 10 + ccc.COMPETITION " +
            "where cc.DATE_DELETED is null and ccc.DATE_DELETED is null and ccc.DATE_DELETED is null " +
            "  and cc.CHAMPIONSHIP_CATEGORY_ID = @competition",
            {competition: competition});
        callback(null, records.map(function (r) {
            return {
                CompetitionId: r.CompetitionId,
                Phase: r.Phase,
                Group: r.NGroup,
                Competition: r.Competition,
                DisciplineName: r.DisciplineName,
                LogligId: r.LogligId
            }
        }));
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

Competitions.prototype.list = function (season, options, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "Select cc.CHAMPIONSHIP_CATEGORY_ID as \"ChampionshipCategory\", cc.CATEGORY as \"Category\", " +
                    "   cc.REGISTRATION_PRICE as \"RegistrationPrice\", " +
                    "   s.SPORT_ID as \"Sport\", s.SPORT_NAME as \"SportName\", " +
                    "   c.REGION_ID as \"Region\", r.REGION_NAME as \"RegionName\",  " +
                    "   c.CHAMPIONSHIP_ID as \"Championship\", c.CHAMPIONSHIP_NAME as \"ChampionshipName\", " +
                    "   c.IS_CLUBS as \"Clubs\", c.IS_LEAGUE as \"League\", " +
                    "   cc.CHARGE_SEASON as \"ChargeSeasonId\", se.[NAME] as \"ChargeSeasonName\", " +
                    "   Count(t.TEAM_ID) as \"TeamCount\", Count(Distinct cp.PHASE) as \"PhaseCount\" " +
                    "From CHAMPIONSHIPS as c " +
                    "   Inner Join CHAMPIONSHIP_CATEGORIES as cc On c.CHAMPIONSHIP_ID = cc.CHAMPIONSHIP_ID And cc.DATE_DELETED Is Null " +
                    "   Inner Join SPORTS as s On s.SPORT_ID = c.SPORT_ID And s.DATE_DELETED Is Null " +
                    "   Inner Join REGIONS as r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                    "   Left Join TEAMS t On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And t.DATE_DELETED Is Null " +
                    "   Left Join CHAMPIONSHIP_PHASES cp On cc.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cp.DATE_DELETED Is Null " +
                    "   Left Join SEASONS se On cc.CHARGE_SEASON=se.SEASON And se.DATE_DELETED Is Null " +
                    "Where c.SEASON = @season And c.DATE_DELETED Is Null " +
                    //(options.region != null ? " and c.REGION_ID = @region " : " ") +
                    (options.clubs ? " and c.IS_CLUBS = 1 " : " ") +
                    (options.league ? " and c.IS_LEAGUE= 1 " : " ") +
                    "Group By cc.CHAMPIONSHIP_CATEGORY_ID, cc.CATEGORY, cc.REGISTRATION_PRICE, s.SPORT_ID, s.SPORT_NAME, " +
                    "   c.REGION_ID, r.REGION_NAME, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.IS_CLUBS, c.IS_LEAGUE, " +
                    "   cc.CHARGE_SEASON, se.[NAME]",
                    {season: season, region: options.region})
                    .then(
                        function (records) {
                            connection.complete();

                            var result = {
                                sports: []
                            };

                            var sports = {};

                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                var sport = sports[record.Sport];
                                if (!sport) {
                                    sports[record.Sport] = sport = {
                                        id: record.Sport,
                                        name: record.SportName,
                                        categories: []
                                    };
                                    result.sports.push(sport);
                                }
                                sport.categories.push({
                                    id: record.ChampionshipCategory,
                                    championship: {
                                        id: record.Championship,
                                        name: record.ChampionshipName
                                    },
                                    region: {
                                        id: record.Region,
                                        name: record.RegionName
                                    },
                                    chargeSeason: {
                                        id: record.ChargeSeasonId,
                                        name: record.ChargeSeasonName
                                    },
                                    registrationPrice: parseInt(record.RegistrationPrice, 10),
                                    clubs: record.Clubs,
                                    league: record.League,
                                    category: record.Category,
                                    name: utils.categoryToString(record.Category),
                                    teams: record.TeamCount,
                                    phases: record.PhaseCount
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

module.exports = new Competitions(require('../db'));