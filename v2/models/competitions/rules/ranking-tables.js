// Match team rank fields
// R - rank
// S - score
// G - games
// P - points
// C - conceded points
// T - small points
// Y - conceded small points
// W - wins
// L - loses
// E - techWins
// F - techLoses
// D - ties

// Competition team rank fields
// R - rank
// S - score
// C - counted results
// Cn - counted results for counter n
// Sn - score for counter n
//			In counters scoring plan the first counters are as defined by rule
//			and the last is the additional results counter
//			In multi challenge scoring plan the first counters are the highest scored players
//			and the last is the additional results counter

module.exports = {
    matches: true,
    individual: true,
    parse: function (value) {
        if (value != null) {
            var lines = value.split('\n');
            var rankingTables = [];
            var rankingTable = {name: null, fields: []};

            for (var n = 0; n < lines.length - 1; n += 2) {
                var title = lines[n];
                var val = lines[n + 1];
                if (title.length === 0) {
                    rankingTable.name = val;
                    rankingTables.push(rankingTable);
                    rankingTable = {name: null, fields: []};
                }
                else {
                    rankingTable.fields.push({title: title, value: val});
                }
            }

            if (rankingTable.fields.length > 0) {
                if (rankingTable.name == null) {
                    rankingTable.name = "ברירת מחדל";
                }
                rankingTables.push(rankingTable);
            }

            return rankingTables;
        }
        return null;
    }
};