var regions = [
    {id: 0, name: "מטה"},
    {id: 1, name: "ירושלים"},
    {id: 2, name: "צפון"},
    {id: 3, name: "חיפה"},
    {id: 4, name: "מרכז"},
    {id: 5, name: "תל אביב"},
    {id: 6, name: "דרום"}
];

function Regions() {

}

Regions.prototype.list = function (callback) {
    callback(null, regions);
};

module.exports = new Regions();