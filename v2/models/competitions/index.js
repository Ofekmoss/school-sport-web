
var Competition = require('./competition');
var util = require('./util');
var settings = require('../../../settings');
var dbu = require('../dbu');

var Matches = require('./matches');
var Rules = require('./rules');
var Programs = require('./programs');

var oldDb = require('../db');

function Competitions(db) {
    this.db = db;
    this.version = 1;
    this.competitions = {};
}

Competitions.prototype.get = async function (id, reload) {
    var release = await util.lock(this);
    try {
        var competition;
        if (!reload) {
            competition = this.competitions[id];
            if (competition) {
                return competition;
            }
        }

        //console.log('loading competition ' + id);
        competition = await Competition.load(this, id);
        //console.log(competition);
        this.competitions[id] = competition;
        return competition;
    }
    catch (err) {
        console.log('error loading competition ' + id);
        console.log(err);
    }
    finally {
        release();
    }
};

Competitions.prototype.disciplines = async function (sport) {
    var connection;
    var oldConnection;
    try {
        connection = await this.db.connect();

        var records = await connection.request(
            "select uid as \"uid\", Sport as \"Sport\", Identifier as \"Identifier\", Name as \"Name\" " +
            "from Disciplines " +
            (sport ? "where Sport = @sport" : ""),
            {sport: sport});

        var disciplines = [];

        var loaded = {};

        for (var n = 0; n < records.length; n++) {
            var record = records[n];
            loaded[record.uid] = true;
            disciplines.push({
                id: record.uid,
                sport: record.Sport,
                identifier: record.Identifier,
                name: record.Name
            });
        }

        oldConnection = await oldDb.connect();

        records = await oldConnection.request(
            "select sft.SPORT_FIELD_TYPE_ID as \"SportFieldType\", " +
            "   sf.SPORT_FIELD_ID as \"SportField\", " +
            "   sft.SPORT_ID as \"Sport\", " +
            "   sft.SPORT_FIELD_TYPE_NAME as \"SportFieldTypeName\", " +
            "   sf.SPORT_FIELD_NAME as \"SportFieldName\" " +
            "from SPORT_FIELD_TYPES as sft " +
            "  left outer join SPORT_FIELDS as sf on sft.SPORT_FIELD_TYPE_ID = sf.SPORT_FIELD_TYPE_ID " +
            (sport ? "where sft.SPORT_ID = @sport" : "") +
            " order by sft.SPORT_FIELD_TYPE_ID",
            {sport: sport});

        var lastType = null;
        for (var n = 0; n < records.length; n++) {
            var record = records[n];
            if (lastType !== record.SportFieldType) {
                var id = (record.SportFieldType*1000).toString();
                if (!loaded[id]) {
                    loaded[id] = true;
                    disciplines.push({
                        id: id,
                        sport: record.Sport,
                        identifier: "." + record.SportFieldType + ".",
                        name: record.SportFieldTypeName
                    });
                }
                lastType = record.SportFieldType;
            }
            if (record.SportField) {
                var id = (record.SportFieldType*1000 + (record.SportField||0)).toString();
                if (!loaded[id]) {
                    loaded[id] = true;
                    disciplines.push({
                        id: id,
                        sport: record.Sport,
                        identifier: "." + record.SportFieldType + "." + record.SportField + ".",
                        name: record.SportFieldName
                    });
                }
            }
        }
        
        return disciplines;
    }
    finally {
        if (connection) {
            connection.complete();
        }
        if (oldConnection) {
            oldConnection.complete();
        }
    }
};

Competitions.prototype.boards = async function (participants) {
    return await Matches.listBoards(participants);
};

Competitions.prototype.board = async function (boardId, participants) {
    return await Matches.getBoard(boardId, participants);
};

Competitions.prototype.season = async function (seasonId) {
    return await Programs.readSeason(this.db, seasonId);
};

Competitions.prototype.ruleset = async function (rulesetId) {
    return await Rules.readRuleset(this.db, rulesetId);
};

module.exports = new Competitions(dbu.config(require('mssql'), settings.competitionsDb));