var express = require('express');
var router = express.Router();

var settings = require('../../settings');

var Access = require('../models/access');
var utils = require('../models/utils');

var db = require('../models/db');

function getTextValue(value, type) {
	if (value == null) {
		return null;
	}
	
	var abs = Math.abs(value);
	var mm = ("0" + Math.round((abs % 1000) / 10)).slice(-2);
	var i = Math.floor(abs / 1000);
	var res;
	
	switch (type) {
		case -1:
		case 1:
			if (i < 60) {
				res = ("0" + i).slice(-2) + "." + mm;
				break;
			}
		case 2:
			if (i < 600) {
				res = Math.floor(i / 60) + ":" + ("0" + (i % 60)).slice(-2) + "." + mm;
				break;
			}
		case 3:
		case 9:
			if (i < 3600) {
				res = ("0" + Math.floor(i / 60)).slice(-2) + ":" + ("0" + (i % 60)).slice(-2) + "." + mm;
				break;
			}
		case 4:
			{
				var m = Math.floor(i/60);
				var h = Math.floor(m/60);
				m = m % 60;
				res = (h >= 10 ? h : "0" + h) + ":" + ("0" + m).slice(-2) + ":" + ("0" + (i % 60)).slice(-2) + "." + mm;
				break;
			}
		case 5:
			{
				var m = Math.floor(i/60);
				var h = Math.floor(m/60);
				m = m % 60;
				res = (h >= 10 ? h : "0" + h) + ":" + ("0" + m).slice(-2) + ":" + ("0" + (i % 60)).slice(-2);
				break;
			}
		case 7:
		case 11:
			res = (i >= 10 ? i : "0" + i) + "." + mm;
			break;
		case 13:
		case 8:
			{
				res = i.toString();
				for (var n = res.length - 3; n > 0; n -= 3) {
					res = res.slice(0, n) + "," + res.slice(n);
				}
				break;
			}
		case 12:
			if (i >= 100000) {
				res = (i / 1000).toString();
			}
			else if (i >= 10000) {
				res = "0" + (i/1000);
			}
			else {
				res = "00" + (i/1000);
			}
			break;
		default:
			res = i + "." + mm;
			break;
	}
	
	
	return (value < 0) ? "-" + res : (type === -1 ? "+" + res : res);
}

async function readCompetitionResults(logligId, res) {
	var connection = null;
	try {
		connection = await db.connect();
		var records = await connection.request(
			"select Competition as Competition " +
			"from LogligCompetitions " +
			"where LogligId = @logligId",
			{logligId: logligId});

		if (records.length > 0) {
			var id = parseInt(records[0].Competition);
			var competition = id % 10;
			id = (id - competition) / 10;
			var group = id % 10;
			id = (id - group) / 10;
			var phase = id % 10;
			id = (id - phase) / 10;

			records = await connection.request(
				"select CONVERT(varchar, ccc.CHAMPIONSHIP_CATEGORY_ID) + '.' + CONVERT(varchar, ccc.PHASE) + '.' + CONVERT(varchar, ccc.NGROUP), " +
				"  sf.SPORT_FIELD_NAME as DisciplineName, " +
				"  c.CHAMPIONSHIP_NAME as CompetitionName, " +
				"  cc.CATEGORY as Category, " +
				"  s.ID_NUMBER as IdentityNum, " +
				"  ccc.PLAYER_NUMBER as AtheleNum, " +
				"  s.FIRST_NAME + ' ' + s.LAST_NAME as FullName, " +
				"  ccc.HEAT as Heat, " +
				"  ccc.POSITION as Lane, " +
				//"  ccc.WIND as Wind, " + // not implemented
				"  ccc.RESULT as Result, " +
				"  sft.RESULT_TYPE as ResultType, " +
				"  ccc.SCORE as Score " +
				"from CHAMPIONSHIP_CATEGORIES as cc " +
				"  join CHAMPIONSHIPS as c on cc.CHAMPIONSHIP_ID = c.CHAMPIONSHIP_ID " +
				"  join CHAMPIONSHIP_COMPETITION_COMPETITORS as ccc on cc.CHAMPIONSHIP_CATEGORY_ID = ccc.CHAMPIONSHIP_CATEGORY_ID " +
				"  join CHAMPIONSHIP_COMPETITIONS as com on com.CHAMPIONSHIP_CATEGORY_ID = ccc.CHAMPIONSHIP_CATEGORY_ID and " +
				"    com.PHASE = ccc.PHASE and com.NGROUP = ccc.NGROUP and com.COMPETITION = ccc.COMPETITION " +
				"  join SPORT_FIELDS as sf on com.SPORT_FIELD_ID = sf.SPORT_FIELD_ID " +
				"  join SPORT_FIELD_TYPES as sft on sf.SPORT_FIELD_TYPE_ID = sft.SPORT_FIELD_TYPE_ID " +
				"  left outer join  " +
				"     (select p.* " +
				"      from PLAYERS as p " +
				"         join TEAMS as t on p.TEAM_ID = t.TEAM_ID " +
				"      where p.DATE_DELETED is null and t.DATE_DELETED is null " +
				"         and t.CHAMPIONSHIP_CATEGORY_ID = @category) as p on p.TEAM_NUMBER = ccc.PLAYER_NUMBER or p.PLAYER_ID = ccc.PLAYER_ID " +
				"  left outer join STUDENTS as s on p.STUDENT_ID = s.STUDENT_ID " +
				"where cc.DATE_DELETED is null and ccc.DATE_DELETED is null and com.DATE_DELETED is null " +
				"  and cc.CHAMPIONSHIP_CATEGORY_ID = @category and com.PHASE = @phase and com.NGROUP = @group and com.COMPETITION = @competition",
				{category: id, phase: phase, group: group, competition: competition});

			var result = {
				CompetitionDisciplineId: logligId,
				results: records.map(function (r) {
					return {
						IdentityNum: r.IdentityNum,
						AtheleNum: r.AtheleNum,
						FullName: r.FullName,
						Heat: r.Heat || 0,
						Lane: r.Lane,
						Wind: null, //getTextValue(r.Wind, -1),
						Result: getTextValue(r.Result, r.ResultType),
						AlternativeResult: r.Score <= 1 ? 1 : null
					};
				})
			};

			if (records.length > 0) {
				var rec = records[0];
				result.CompetitionName = rec.CompetitionName;
				result.DisciplineName = rec.DisciplineName;
				result.CategoryName = utils.categoryToString(rec.Category);
			}
			res.status(200).send(result);
		}
		else {
			res.status(404).end();
		}
	}
	catch (err) {
		res.status(500).send("E101");
	}
	finally {
		if (connection) {
			connection.complete();
		}
	}
}

router.get('/athletics/:competition', function (req, res) {
	if (req.query.token) {
		Access.login({token: req.query.token, code: ""}, function (err, acc) {
			if (err) {
				res.status(500).end();
			}
			else if (acc.roles.indexOf('athletics') >= 0 || acc.roles.indexOf('admin') >= 0) {
				readCompetitionResults(req.params.competition, res);
			}
			else {
				res.status(403).end();
			}
		});
	}
	else if (req.session.user && req.session.user.roles) {
		if (req.session.user.roles.indexOf('athletics') >= 0 || req.session.user.roles.indexOf('admin') >= 0) {
			readCompetitionResults(req.params.competition, res);
		}
		else {
			res.status(403).end();
		}
	}
	else {
		res.status(403).end();
	}
});


module.exports = router;