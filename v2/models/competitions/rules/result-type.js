// Value
// 0 points
// 1 distance -
// 2 duration
// Direction
// 0 - Most
// 1 - Least

function parseResultType(value) {
    if (value != null) {
        var p = value.split('-');

        return {
            value: parseInt(p[0]),
            direction: parseInt(p[1])
        };
    }

    return null;
}

module.exports = {
    parse: parseResultType
};