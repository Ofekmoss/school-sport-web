var competitions = {
    "sports":
        [
            {
                "id":15,
                "name":"כדורסל",
                "categories":[
                    {"id":17262,"category":3145728,"name":"ה'-ו' תלמידות"},
                    {"id":17263,"category":192,"name":"ז'-ח' תלמידים"},
                    {"id":17264,"category":12582912,"name":"ז'-ח' תלמידות"}
                    ]
            },
            {
                "id":16,
                "name":"כדורעף",
                "categories": [
                    {"id":17265,"category":192,"name":"ז'-ח' תלמידים"},
                    {"id":17266,"category":12582912,"name":"ז'-ח' תלמידות"},
                    {"id":17267,"category":64,"name":"ז' תלמידים"},
                    {"id":17268,"category":4194304,"name":"ז' תלמידות"},
                    {"id":17269,"category":256,"name":"ט' תלמידים"},
                    {"id":17270,"category":16777216,"name":"ט' תלמידות"},
                    {"id":17275,"category":48,"name":"ה'-ו' תלמידים"},
                    {"id":17276,"category":3145728,"name":"ה'-ו' תלמידות"}
                    ]
            },
            {
                "id":17,
                "name":"כדורגל",
                "categories":[
                    {"id":17319,"category":3584,"name":"י'-י\"ב תלמידים"},
                    {"id":17320,"category":234881024,"name":"י'-י\"ב תלמידות"}
                    ]
            }
        ]
};

function Competitions() {

}

Competitions.prototype.list = function (season, options, callback) {
    callback(null, competitions);
};

module.exports = new Competitions();