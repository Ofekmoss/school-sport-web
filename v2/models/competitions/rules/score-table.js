// Direction
// 0 - Most
// 1 - Least

function parseScoreTable(value) {
    if (value != null) {
        var p = value.split('-');
        var direction = parseInt(p[0]) || 0;
        var scores = [];
        for (var n = 1; n < p.length; n++) {
            scores.push((parseInt(p[n]) || 0)/1000);
        }
        return {
            direction: direction,
            scores: scores,
            getPoints: function (score) {
                if (score < 0)
                    return 0;

                if (this.direction === 0) {
                    for (var n = this.scores.length - 1; n >= 0; n--)
                    {
                        var res = this.scores[n];
                        if (res > 0 && res <= score) {
                            return n + 1;
                        }
                    }
                }
                else {
                    for (var n = this.scores.length - 1; n >= 0; n--) {
                        if (this.scores[n] >= score) {
                            return n + 1;
                        }
                    }
                }

                return 0;
            }
        };
    }

    return null;
}

module.exports = {
    parse: parseScoreTable
};