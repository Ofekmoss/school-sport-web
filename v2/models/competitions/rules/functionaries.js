/*var Functionary = {
    UNDEFINED: 0,
    Coordinator: 1,
    Referee: 2,
    ClubChairman: 3,
    SupervisorTeacher: 4,
    SchoolManager: 5,
    SportDepartmentManager: 6,
    SportDepartment: 7,
    FacilitySupervisor: 8,
    Coach: 9
};*/

module.exports = {
    matches: true,
    individual: true,
    parse: function (value) {
        if (value != null) {
            var functionaries = [];
            var s = value.split('\n');
            for (var n = 0; n < s.length; n++) {
                var desc = s[n];
                var i = desc.lastIndexOf('-');
                var type = 0;
                if (i >= 0) {
                    type = parseInt(desc.slice(i + 1));
                    desc = desc.slice(0, i);
                }
                functionaries.push({
                    type: isNaN(type) ? 0 : type,
                    description: desc
                });
            }
            return functionaries;
        }
        return null;
    }
};