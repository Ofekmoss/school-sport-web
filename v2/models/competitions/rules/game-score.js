module.exports = {
    matches: true,
    parse: function (value) {
        if (value != null) {
            var s = value.split('|');
            var p = s.map(function (x) { return parseFloat(x); });
            if (p.length < 5) {
                return null;
            }
            if (!isFinite(p[0]) || !isFinite(p[1]) || !isFinite(p[2]) || !isFinite(p[3]) || !isFinite(p[4])) {
                return null;
            }
            return {
                win: p[0],
                loss: p[1],
                tie: p[2],
                technicalLoss: p[3],
                technicalWin: p[4],
                zeroLoss: s[6] === "True" || s[6] === "1" ? 0 : null,
                scoreByPoints: s[5] === "True" || s[5] === "1"
            };
        }
        return null;
    }
};