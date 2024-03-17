var RankingMethods = [
    'Score',					// Highest game score
    'PointsRatio',				// Largest scored/conceded points ratio
    'PointsDifference',		// Largest scored/conceded points difference
    'MostPoints',				// Highest scored points
    'MostSmallPoints',		// Highest conceded points
    'Wins',					// Most wins
    'SmallPointsRatio',       // Largest scored/conceded small points ratio
    'SmallPointsDifference'   // Largest scored/conceded small points difference]
];

function parseTeamRanking(value) {
    if (value != null) {
        var iterations = [];
        var rankings = value.split('.');
        for (var n = 0; n < rankings.length; n++) {
            var ranking = rankings[n];
            var matchedOpponents = false;
            if (ranking[0] === 'M') {
                matchedOpponents = true;
                ranking = ranking.slice(1);
            }
            var rankingMethod = parseInt(ranking);
            if (!isFinite(rankingMethod) || rankingMethod < 0 || rankingMethod >= RankingMethods.length) {
                return null;
            }
            iterations.push({method: RankingMethods[rankingMethod], matchedOpponents: matchedOpponents});
        }
        return iterations;
    }
    return null;
}

module.exports = {
    parse: parseTeamRanking
};