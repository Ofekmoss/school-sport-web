var db = require('../db');
var boards = null;

function parseRange(range) {
    var result = [];
    if (range) {
        var parts = range.split(',');
        for (var n = 0; n < parts.length; n++) {
            var part = parts[n];
            var i = part.indexOf('-');
            if (i > 0) {
                var start = parseInt(part.slice(0, i));
                var end = parseInt(part.slice(i + 1));
                if (!isNaN(start) && !isNaN(end) && end >= start) {
                    result.push({start: start, end: end});
                }
            }
        }
        result.sort(function (a, b) { return a.start - b.start; });
        var n = 0;
        while (n < result.length - 1) {
            var cur = result[n];
            var next = result[n + 1];
            if (cur.end >= next.start) {
                cur.end = next.start - 1;
            }
            if (cur.end < cur.start) {
                result.splice(n, 1);
            }
            else {
                n++;
            }
        }
    }
    return result;
}

function checkRange(range, value) {
    for (var n = 0; n < range.length; n++) {
        var part = range[n];
        if (part.min <= value && part.max >= value) {
            return true;
        }
        if (part.min > value) {
            return false;
        }
    }
    return false;
}

async function listBoards(participants) {
    if (!boards) {
        var connection = null;
        try {
            connection = await db.connect();

            // Saving sport if missing
            var records = await connection.request(
                "select GAME_BOARD_ID as \"Id\", GAME_BOARD_NAME as \"Name\", RANGE as \"Range\", DATA as \"Data\" " +
                "from GAME_BOARDS " +
                "where DATE_DELETED is null");
            boards = {};
            for (var ri = 0; ri < records.length; ri++) {
                var record = records[ri];
                var board = {
                    name: record.Name,
                    ranges: []
                };
                boards[record.Id] = board;

                if (record.Data) {
                    /*
                        min|max
                        roundName1|roundName2|roundName2...
			            cycleName1|cycleName2|cycleName3...
            tournament  teamCount|t-t|t-t|t-t...
            rnd1cycl1	t-t-t|t-t-t|t-t-t...
            rnd2cycl1	t-t-t|t-t-t|t-t-t...
            rnd3cycl1	t-t-t|t-t-t|t-t-t...
            rnd1cycl2	t-t-t|t-t-t|t-t-t...
            ...
                        min|max
                     */

                    var lines = record.Data.split('\n');
                    var li = 0;
                    var last = null;
                    while (li < lines.length) {
                        var line = lines[li++];
                        if (line.length === "") {
                            break;
                        }
                        var r = line.split('|').map(function (t) { return parseInt(t); });
                        var range = {
                            min: r[0],
                            max: r[1],
                            levels: [],
                            matches: []
                        };

                        if (li >= lines.length) break;
                        range.levels.push(lines[li++].split('|'));
                        if (li >= lines.length) break;
                        range.levels.push(lines[li++].split('|'));
                        if (li >= lines.length) break;
                        var t = lines[li++].split('|');
                        var teamCount = 0;
                        var tournamentMatches = [];
                        if (t.length > 0) {
                            teamCount = parseInt(t[0]);
                            for (var ti = 1; ti < t.length; ti++) {
                                var teams = t[ti].split('-');
                                tournamentMatches.push({a: parseInt(teams[0]) - 1, b: parseInt(teams[1]) - 1});
                            }
                        }
                        else {
                            teamCount = 2;
                            tournamentMatches.push({a: 0, b: 1});
                        }

                        var rounds = range.levels[0].length;
                        var cycles = range.levels[1].length;
                        for (var cycle = 0; li < lines.length && cycle < cycles; cycle++) {
                            for (var round = 0; li < lines.length && round < rounds; round++) {
                                var segment = lines[li++].split('|').map(function (p) {
                                    if (p.length > 0) {
                                        return p.split('-').map(function (t) {
                                            return parseInt(t) - 1;
                                        });
                                    }
                                    else {
                                        return null;
                                    }
                                });

                                for (var si = 0; si < segment.length; si++) {
                                    var teams = segment[si];
                                    if (teams != null) {
                                        if (tournamentMatches.length === 1) {
                                            var match = tournamentMatches[0];
                                            range.matches.push({
                                                sequence: [round, cycle, si],
                                                a: teams[match.a],
                                                b: teams[match.b]
                                            })
                                        } else {
                                            for (var mi = 0; mi < tournamentMatches.length; mi++) {
                                                var match = tournamentMatches[mi];
                                                range.matches.push({
                                                    sequence: [round, cycle, si, mi],
                                                    a: teams[match.a],
                                                    b: teams[match.b]
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (last != null && last.max >= range.min) {
                            range.min = last.max + 1;
                        }
                        if (range.min <= range.max) {
                            board.ranges.push(range);
                            last = range;
                        }
                    }
                }
            }

            var board = {
                name: record.Name,
                ranges: []
            };
            boards["roundrobin"] = {
                name: "ראונד רובין",
                ranges: [{min: 2, max: 30}]
            };
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    }
    if (participants == null) {
        return boards;
    }
    var result = {};
    for (var key in boards) {
        var board = boards[key];
        if (checkRange(board.ranges, participants)) {
            result[key] = board;
        }
    }
    return result;
}

function buildRoundRobin(participants, rounds) {
    var result = {
        levels: [],
        matches: []
    };

    var as = [];
    var bs = [];
    var count = participants - 1;
    var len = participants / 2;
    if (participants % 2 === 1) {
        count++;
        as.push(-1);
        len = (participants - 1) / 2;
    }

    for (var n = 0; n < len; n++) {
        as.push(n);
    }
    for (var n = participants - 1; n >= len; n--) {
        bs.push(n);
    }

    var rs  = [];
    var cs = [];
    for (var c = 0; c < count; c++) {
        cs.push("מחזור " + (c + 1));
    }
    var dir = 1;
    for (var r = 0; r < rounds; r++) {
        rs.push("סיבוב " + (r + 1));

        for (var cycle = 0; cycle < count; cycle++) {
            if (as[0] >= 0 && bs[0] >= 0) {
                if (cycle % 2 === 0) {
                    result.matches.push({
                        sequence: [r, cycle, 0],
                        a: as[0],
                        b: bs[0]
                    });
                }
                else {
                    result.matches.push({
                        sequence: [r, cycle, 0],
                        a: bs[0],
                        b: as[0]
                    });
                }
            }
            for (var l = 1; l < as.length; l++) {
                if (as[l] >= 0 && bs[l] >= 0) {
                    if (l % 2 === 0) {
                        result.matches.push({
                            sequence: [r, cycle, l],
                            a: as[l],
                            b: bs[l]
                        });
                    } else {
                        result.matches.push({
                            sequence: [r, cycle, l],
                            a: bs[l],
                            b: as[l]
                        });
                    }
                }
            }
            var pa = as[1];
            for (var i = 2; i < as.length; i++) {
                var next = as[i];
                as[i] = pa;
                pa = next;
            }
            for (var i = as.length - 1; i >= 0; i--) {
                var next = bs[i];
                bs[i] = pa;
                pa = next;
            }
            as[1] = pa;
        }

        var t = as;
        as = bs;
        bs = t;
    }
    result.levels.push(rs);
    result.levels.push(cs);

    return result;
}

async function getBoard(boardId, participants, rounds) {
    if (boardId === "roundrobin") {
        return buildRoundRobin(participants, rounds || 2);
    }
    if (!boards) {
        await listBoards();
    }
    var board = boards[boardId];
    if (!board) {
        return null;
    }

    var range = null;
    for (var n = 0; n < board.ranges.length; n++) {
        var r = board.ranges[n];
        if (r.min <= participants && r.max >= participants) {
            range = r;
            break;
        }
        if (r.min > participants) {
            return null;
        }
    }

    if (range == null) {
        return null;
    }

    var result = {
        board: boardId,
        levels: range.levels,
        matches: []
    };

    for (var m = 0; m < range.matches.length; m++) {
        var match = range.matches[m];
        if (match.a < participants && match.b < participants) {
            result.matches.push(match);
        }
    }

    return result;
}

module.exports = {
    listBoards: listBoards,
    getBoard: getBoard
};