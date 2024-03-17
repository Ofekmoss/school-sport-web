var GameTypes = ['Duration', 'Points'];


function parseGameStructure(value) {
    if (value != null) {
        var p = value.split('.').map(function (x) { return parseInt(x); });
        if (p.length > 0) {
            var type = p[0];
            if (!isFinite(type) || type < 0 || type >= GameTypes.length) {
                return null;
            }

            var result = {
                type: GameTypes[type]
            };
            if (type === 0) {
                if (p.length > 1) {
                    if (!isFinite(p[1]) || p[1] < 0) {
                        return null;
                    }
                    result.parts = p[1];
                    if (p.length > 2) {
                        if (!isFinite(p[2]) || p[2] < 0) {
                            return null;
                        }
                        result.extensions = p[2];
                    }
                }
            }
            else {
                if (p.length > 1) {
                    if (!isFinite(p[1]) || p[1] < 0) {
                        return null;
                    }
                    result.sets = p[1];
                    if (p.length > 2) {
                        if (!isFinite(p[2]) || p[2] < 0) {
                            return null;
                        }
                        result.games = p[2];
                    }
                }
            }

            return result;
        }
    }

    return null;
}

module.exports = {
    matches: true,
    parse: parseGameStructure
};