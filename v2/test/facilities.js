var facilities = [
    {id: 1, name: "מתקן 1", address: "כתובת 1", type: "סוג1"},
    {id: 2, name: "מתקן 2", address: "כתובת 2", type: "סוג2"},
    {id: 3, name: "מתקן 3", address: "כתובת 3", type: "סוג3"}
];

function Facilities() {

}


Facilities.prototype.getFacilitiesBySchool = function (school, callback) {
    callback(null, facilities);
};

Facilities.prototype.getFacilitiesByCity = function (city, callback) {
    callback(null, facilities);
};

Facilities.prototype.insertFacility = function (school, facility, callback) {
    var facilityId = facilities.length + 2;
    facilities.push({
        id: facilityId,
        name: facility.name,
        address: facility.address,
        type: facility.type
    });

    callback(null, {id: facilityId});
};

Facilities.prototype.updateFacility = function (school, facilityId, facility, callback) {
    var updateFacility = null;
    for (var i = 0; !updateFacility && i < facilities.length; i++) {
        var f = facilities[i];
        if (f.id === facilityId) {
            updateFacility = f;
        }
    }

    if (!updateFacility) {
        callback({status: 404, message: "מתקן לא נמצא"});
        return;
    }

    updateFacility.name = facility.name;
    updateFacility.address = facility.address;

    callback();
};

module.exports = new Facilities();