var players = [
    {
        "student": {
            "firstName": "טל",
            "lastName": "ליברמן",
            "birthDate": "1985-09-11T14:41:01.283Z",
            "idNumber": "123456564"
        },
        "team": {
            "name": "האלופים",
            "number": "3216"
        },
        "championship": {
            "region": {
                "name": "ירושלים"
            },
            "name": "שדג",
            "sport": {
                "name": "כדורסל"
            },
            "category": {
                "name": "ילדים מעצבנים"
            }
        },
        "school": {
            "symbol": "654466464"
        },
        "playerStatus": "1","createdAt": "2019-09-11T14:41:01.283Z",
        "picture": null,
        "idSlip": "4552/students/40217804/71/id-slip.jpeg",
        "medicalApproval": "4552/students/40217804/71/medical-approval.jpeg"
    }
];

var testTransfers = [
    {
        team: 1,
        sport: 15,
        competition: 17263,
        school: {
            id: 12345,
            name: "בדיקה",
            symbol: "9999999",
            region: 1,
            principal: "מנהל"
        },
        teamNumber: 1,
        teacher: {
            name: "מורה",
            phoneNumber: "03-9192039",
            email: "teacher@mail.com"
        },
        idNumber: 123456789,
        student: 1000,
        firstName: "פרטי",
        lastName: "משפחה",
        birthDate: new Date(2001, 3, 3),
        grade: 10,
        gender: 1,
        currentSchool: {
            id: 22222,
            name: "בית ספר אחר",
            symbol: "123456",
            region: 2,
            principal: "מנהל אחר"
        }
    },
    {
        team: 1,
        sport: 15,
        competition: 17263,
        school: {
            id: 12345,
            name: "בדיקה",
            symbol: "9999999",
            region: 1,
            principal: "מנהל"
        },
        teamNumber: 1,
        teacher: {
            name: "מורה",
            phoneNumber: "03-9192039",
            email: "teacher@mail.com"
        },
        idNumber: 987654321
    }
];

function Players() {

}

Players.prototype.listTransferRequests = function (season, options, callback) {
    var result = [];
    for (var i = 0; i < testTransfers.length; i++) {
        var transfer = testTransfers[i];
        if (!transfer.transferred) {
            result.push(transfer);
        }
    }
    callback(null, result);
};

Players.prototype.approveTransferRequests = function (transfers, callback) {
    for (var i = 0; i < transfers.length; i++) {
        var transfer = transfers[i];
        for (var t = 0; t < testTransfers.length; t++) {
            var data = testTransfers[t];
            if (data.school.id === transfer.school &&
                data.idNumber === transfer.idNumber &&
                data.team === transfer.team) {
                data.transferred = true;
                break;
            }
        }
    }

    callback();
};

Players.prototype.list = function(season, options, callback) {
    callback(null, players);
};

module.exports = new Players();