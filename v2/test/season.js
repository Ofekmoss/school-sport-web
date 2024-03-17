var season = 71;

function Season() {

}

Season.prototype.current = function () {
    return season;
};

module.exports = new Season();