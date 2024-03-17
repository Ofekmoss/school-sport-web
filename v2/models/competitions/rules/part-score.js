module.exports = {
    matches: true,
    individual: true,
    parse: function (value) {
        if (value != null) {
            var s = value.split('#');
            if (s.length === 3) {
                var win = parseInt(s[0]);
                var draw = parseInt(s[1]);
                var lose = parseInt(s[2]);
                if (!isNaN(win) && !isNaN(draw) && !isNaN(lose)) {
                    return {
                        win: win,
                        draw: draw,
                        lose: lose
                    };
                }
            }
        }
        return null;
    }
};