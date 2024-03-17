module.exports = {
    parse: function (value) {
        if (value != null) {
            var p = value.split('-');
            var result = {
                winner: parseInt(p[0]),
                loser: parseInt(p[1])
            };
            if (!isFinite(result.winner) || !isFinite(result.loser)) {
                return null;
            }
            if (p.length > 2) {
                result.smallPoints = p[2].split(',').map(function (x) { return parseInt(x); });
                for (var n = 0; n < result.smallPoints.length; n++) {
                    if (!isFinite(result.smallPoints[n])) {
                        return null;
                    }
                }
            }
            return result;
        }
        return null;
    }
};