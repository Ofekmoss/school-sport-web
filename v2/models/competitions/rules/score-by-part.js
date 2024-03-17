module.exports = {
    matches: true,
    individual: true,
    parse: function (value) {
        if (value != null) {
            var result = [];
            var s = value.split('\n');
            for (var n = 0; n < s.length; n++) {
                var partGame = s[n].split('#');
                if (partGame.length === 2) {
                    var part = partGame[0].split('-');
                    var game = partGame[1].split('-');
                    if (part.length === 2 && game.length === 2) {
                        var partA = parseInt(part[0]);
                        var partB = parseInt(part[1]);
                        var gameA = parseInt(game[0]);
                        var gameB = parseInt(game[1]);
                        if (!isNaN(partA) && !isNaN(partB) && !isNaN(gameA) && !isNaN(gameB)) {
                            result.push({
                                part: { teamA: partA, teamB: partB },
                                game: { teamA: gameA, teamB: gameB }
                            });
                        }
                        else {
                            return null;
                        }
                    }
                    else {
                        return null;
                    }
                }
                else {
                    return null;
                }

            }
            return result;
        }
        return null;
    }
};