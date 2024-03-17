MatchOutcome = {
    Tie: 0,
    WinA: 1,
    WinB: 2,
    TechnicalA: 3,
    TechnicalB: 4
};

function sumSmallPoints(match) {
    match.smallPointsA = 0;
    match.smallPointsB = 0;

    function addSmallPoints(o) {
        for (var key in o) {
            var value = o[key];
            if (key === 'a') {
                match.smallPointsA += (value || 0);
            }
            else if (key === 'b') {
                match.smallPointsB += (value || 0);
            }
            else if (value != null && Array.isArray(value)) {
                for (var n = 0; n < value.length; n++) {
                    addSmallPoints(value[n]);
                }
            }
        }
    }
    if (match.result) {
        addSmallPoints(match.result);
    }
}

function PointsRatio(points, pointsAgainst) {
    this.points = points || 0;
    this.pointsAgainst = pointsAgainst || 0;
}

PointsRatio.prototype.valueOf = function () {
    return this.pointsAgainst <= 0 ? (this.points + 1) : this.points / this.pointsAgainst;
};

var Methods = {
    Score: {
        rankOpponent: function (context, opponent) {
            return opponent.score;
        },
        rankMatch: function (context, rank, match) {
            switch (match.outcome)
            {
                case MatchOutcome.WinA:
                    rank.a = (rank.a || 0) + context.gameScore.win;
                    rank.b = (rank.b || 0) + context.gameScore.loss;
                    break;
                case MatchOutcome.WinB:
                    rank.a = (rank.a || 0) + context.gameScore.loss;
                    rank.b = (rank.b || 0) + context.gameScore.win;
                    break;
                case MatchOutcome.Tie:
                    rank.a = (rank.a || 0) + context.gameScore.tie;
                    rank.b = (rank.b || 0) + context.gameScore.tie;
                    break;
                case MatchOutcome.TechnicalA:
                    rank.a = (rank.a || 0) + context.gameScore.technicalWin;
                    rank.b = (rank.b || 0) + context.gameScore.technicalLoss;
                    break;
                case MatchOutcome.TechnicalB:
                    rank.a = (rank.a || 0) + context.gameScore.technicalLoss;
                    rank.b = (rank.b || 0) + context.gameScore.technicalWin;
                    break;
            }
        }
    },
    PointsRatio: {
        rankOpponent: function (context, opponent) {
            return new PointsRatio(opponent.points, opponent.pointsAgainst);
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                if (rank.a == null) {
                    rank.a = new PointsRatio();
                }
                if (rank.b == null) {
                    rank.b = new PointsRatio();
                }
                rank.a.points += match.scoreA;
                rank.a.pointsAgainst += match.scoreB;
                rank.b.points += match.scoreB;
                rank.b.pointsAgainst += match.scoreA;
            }
        }
    },
    PointsDifference: {
        rankOpponent: function (context, opponent) {
            return opponent.points - opponent.pointsAgainst;
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                rank.a = (rank.a || 0) + match.scoreA - match.scoreB;
                rank.b = (rank.b || 0) + match.scoreB - match.scoreA;
            }
        }
    },
    MostPoints: {
        rankOpponent: function (context, opponent) {
            return opponent.points;
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                rank.a = (rank.a || 0) + match.scoreA;
                rank.b = (rank.b || 0) + match.scoreB;
            }
        }
    },
    MostSmallPoints: {
        rankOpponent: function (context, opponent) {
            return opponent.smallPoints;
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                rank.a = (rank.a || 0) + match.smallPointsA;
                rank.b = (rank.b || 0) + match.smallPointsB;
            }
        }
    },
    Wins: {
        rankOpponent: function (context, opponent) {
            return opponent.wins; // TODO - should probably be + technicalWins (see rankMatch)
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                if (match.outcome === MatchOutcome.WinA ||
                    match.outcome === MatchOutcome.TechnicalA) {
                    rank.a = (rank.a || 0) + 1;
                }
                else if (match.outcome === MatchOutcome.WinB ||
                    match.outcome === MatchOutcome.TechnicalB) {
                    rank.b = (rank.b || 0) + 1;
                }
            }
        }
    },
    SmallPointsRatio: {
        rankOpponent: function (context, opponent) {
            return new PointsRatio(opponent.smallPoints, opponent.smallPointsAgainst);
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                if (rank.a == null) {
                    rank.a = new PointsRatio();
                }
                if (rank.b == null) {
                    rank.b = new PointsRatio();
                }
                rank.a.points += match.smallPointsA;
                rank.a.pointsAgainst += match.smallPointsB;
                rank.b.points += match.smallPointsB;
                rank.b.pointsAgainst += match.smallPointsA;
            }
        }
    },
    SmallPointsDifference: {
        rankOpponent: function (context, opponent) {
            return opponent.smallPoints - opponent.smallPointsAgainst;
        },
        rankMatch: function (context, rank, match) {
            if (match.outcome != null) {
                rank.a = (rank.a || 0) + match.smallPointsA - match.smallPointsB;
                rank.b = (rank.b || 0) + match.smallPointsB - match.smallPointsA;
            }
        }
    }
};

function calculateOpponentsRanks(context, first, last, level) {
    var rankingMethod = context.rankingMethods[level];
    var method = Methods[rankingMethod.method];
    if (!rankingMethod.matchedOpponents) {
        for (var n = first; n <= last; n++) {
            var opponentRank = context.ranks[n];
            var rank = method.rankOpponent(context, context.opponents[opponentRank.opponent]);
            if (rank != null) {
                opponentRank.rank = (opponentRank.rank || 0) + rank;
            }
        }
    }
    else {
        for (var n = first; n <= last; n++) {
            context.ranks[n].rank = null;
        }

        for (var n = 0; n < context.matches.length; n++) {
            var match = context.matches[n];
            if (match.opponentA == null || match.opponentB == null) {
                continue;
            }

            var opponentRankA = null;
            var opponentRankB = null;
            for (var o = first; opponentRankA == null && opponentRankB == null && o <= last; o++) {
                var opponentRank = context.ranks[o];
                if (opponentRank.opponent === match.opponentA) {
                    opponentRankA = opponentRank;
                }
                else if (opponentRank.opponent === match.opponentB) {
                    opponentRankB = opponentRank;
                }
            }

            if (opponentRankA != null && opponentRankB != null) {
                var rank = {
                    a: opponentRankA.rank,
                    b: opponentRankB.rank
                };
                method.rankMatch(context, rank, match, match.opponentA, match.opponentB);
                opponentRankA.rank = rank.a;
                opponentRankA.rank = rank.b;
            }
        }
    }
}

function rankOpponents(context, first, last, level) {
    if (last < first) {
        return;
    }
    calculateOpponentsRanks(context, first, last, level);

    // Sort ranks subset
    context.ranks =
        context.ranks.slice(0, first).concat(context.ranks.slice(first, last + 1).sort(function (a, b) {
            if (a.rank == null) {
                if (b.rank == null) {
                    return 0;
                }
                else {
                    return 1;
                }
            }
            else if (b.rank == null) {
                return -1;
            }
            return b.rank - a.rank;
        })).concat(context.ranks.slice(last + 1));

    // Searching for equal ranks
    var prev = first;
    var prevRank = context.ranks[prev].rank;
    for (var n = first + 1; n <= last; n++) {
        var currentRank = context.ranks[n].rank;
        var equal = prevRank == null ? currentRank == null : currentRank != null && prevRank - currentRank === 0;

        // If rank changed...
        if (!equal) {
            // .. and there were equal ranks
            if (prev < n - 1) {
                // Recurse to rank equal opponents
                rankOpponents(context, prev, n - 1, 0);
            }
            prev = n;
            prevRank = currentRank;
        }
    }

    // If there were equal ranks
    if (prev < last) {
        // If all range was equal
        if (prev === first) {
            // Recurse to rank same range with next level if have any
            if (level < context.rankingMethods.length - 1) {
                rankOpponents(context, first, last, level + 1);
            }
            else {
                for (var n = first; n <= last; n++) {
                    context.ranks[n].rank = context.ranks[n].opponent; // TODO - maybe position is a different thing than opponent
                }
            }
        }
        else {
            // Recurse to rank equal opponents
            rankOpponents(context, prev, last, 0);
        }
    }
}

function calculateRanking(teams, matches, gameScore, rankingMethods) {
    var opponents = [];
    var setPositions = {};
    for (var t = 0; t < teams.length; t++) {
        var team = teams[t];
        var position = null;
        if (team.setPosition != null && team.setPosition < teams.length) {
            position = team.setPosition;
            setPositions[position] = true;
        }
        opponents.push({
            position: position,
            score: 0,
            games: 0,
            points: 0,
            pointsAgainst: 0,
            smallPoints: 0,
            smallPointsAgainst: 0,
            sets: 0,
            setsAgainst: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            technicalWins: 0,
            technicalLosses: 0
        });
    }
    // TODO - calculate for individual/contest sports
    // TODO - check differences of 17562 (vollyball girls 9th grade)

    // First calculate matches outcome and set opponents scores
    for (var m = 0; m < matches.length; m++) {
        // TODO - score by parts
        var match = matches[m];
        if (match.opponentA != null && match.opponentB != null && match.outcome != null) {
            // Returning empty object if team not found to prevent errors
            var teamA = opponents[match.opponentA] || {};
            var teamB = opponents[match.opponentB] || {};
            teamA.games++;
            teamB.games++;
            var pointsA = match.scoreA;
            var pointsB = match.scoreB;
            teamA.points += pointsA;
            teamB.points += pointsB;
            teamA.pointsAgainst += pointsB;
            teamB.pointsAgainst += pointsA;
            sumSmallPoints(match);
            teamA.smallPoints += match.smallPointsA;
            teamB.smallPoints += match.smallPointsB;
            teamA.smallPointsAgainst += match.smallPointsB;
            teamB.smallPointsAgainst += match.smallPointsA;

            switch (match.outcome) {
                case MatchOutcome.WinA:
                    if (gameScore.scoreByPoints) {
                        teamA.score += pointsA;
                        teamB.score += pointsB;
                    }
                    else {
                        teamA.score += gameScore.win;
                        if (pointsB > 0 || gameScore.zeroLoss == null) {
                            teamB.score += gameScore.loss;
                        } else {
                            teamB.score += gameScore.zeroLoss;
                        }
                    }
                    teamA.wins++;
                    teamB.losses++;
                    break;
                case MatchOutcome.WinB:
                    if (gameScore.scoreByPoints) {
                        teamA.score += pointsA;
                        teamB.score += pointsB;
                    }
                    else {
                        teamB.score += gameScore.win;
                        if (pointsA > 0 || gameScore.zeroLoss == null) {
                            teamA.score += gameScore.loss;
                        } else {
                            teamA.score += gameScore.zeroLoss;
                        }
                    }
                    teamB.wins++;
                    teamA.losses++;
                    break;
                case MatchOutcome.Tie:
                    if (gameScore.scoreByPoints) {
                        teamA.score += pointsA;
                        teamB.score += pointsB;
                    }
                    else {
                        teamA.score += gameScore.tie;
                    }
                    teamA.ties++;
                    teamB.ties++;
                    break;
                case MatchOutcome.TechnicalA:
                    teamA.score += gameScore.technicalWin;
                    teamB.score += gameScore.technicalLoss;
                    teamA.technicalWins++;
                    teamB.technicalLosses++;
                    break;
                case MatchOutcome.TechnicalB:
                    teamB.score += gameScore.technicalWin;
                    teamA.score += gameScore.technicalLoss;
                    teamB.technicalWins++;
                    teamA.technicalLosses++;
                    break;
            }
        }
    }

    var context = {
        opponents: opponents,
        matches: matches,
        ranks: opponents.map(function (opponent, index) { return {rank: null, opponent: index}; }),
        gameScore: gameScore,
        rankingMethods: rankingMethods
    };
    rankOpponents(context, 0, opponents.length - 1, 0);

    var position = 0;
    for (var n = 0; n < context.ranks.length; n++) {
        var r = context.ranks[n];
        var opponent = opponents[r.opponent];
        if (opponent.position == null) {
            while (setPositions[position]) {
                position++;
            }
            opponent.position = position++;
        }
    }

    return opponents;
}

module.exports = {
    calculate: calculateRanking,
    MatchOutcome: MatchOutcome
};