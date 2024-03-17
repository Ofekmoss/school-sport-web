
var test = {
    stage: 3,
    details: {
        school: {
            name: "בית ספר לבדיקה",
            symbol: "123456",
            phoneNumber: "03-9876543",
            fax: "03-9871234",
            type: 3,
            classes: "ז'-י\"ב",
            email: "info@school.com",
            address: "רחוב הבדיקה 23, בדיקה"
        },
        principal: {
            name: "המנהל",
            phoneNumber: "050-9876543",
            email: "principal@school.com"
        },
        chairman: {
            name: "יו\"ר",
            phoneNumber: "050-9876543",
            email: "chairman@school.com"
        },
        coordinator: {
            name: "הרכז",
            phoneNumber: "050-9876543",
            email: "coordinator@school.com"
        },
        association: {
            set: false,
            number: "",
            validForThisYear: false
        }
    },
    teams: [
        {
            id: 1,
            team: 1,
            active: true,
            payment: 1234,
            sport: 15,
            category: {id: 1, category: 0xC0, name: "ז-ח תלמידים"},
            teamNumber: 1,
            coach: {
                name:"מאמן 1",
                phoneNumber: "03-9999999",
                email: "coach@mail.com",
                certification: 0
            },
            coachHelper: {
                name: "",
                phoneNumber: "",
                email: ""
            },
            manager: {
                name: "מישהו",
                phoneNumber: "02-1231322",
                email: "someone@mail.com"
            },
            teacher: {
                name: "סימונה",
                phoneNumber: "04-9999334",
                email: "simona@gmail.com"
            },
            facility: 1,
            activity: [],
            // activity: [{ day: 1, startTime: 2, endTime: 3 }],
            competition: 1,
            players: [],
            facilityAlternative: {name: "מתקן חלופי", address: "אי שם"},
            maxStudentBirthday: '2004-12-09 15:26:22.000'
        }, {
            id: 2,
            team: 2,
            active: false,
            payment: 1234,
            sport: 16,
            category: {id: 2, category: 0xC0, name: "ז-ח תלמידים"},
            teamNumber: 1,
            coach: {
                name:"מאמן 1",
                phoneNumber: "03-9999999",
                email: "coach@mail.com",
                certification: 0
            },
            coachHelper: {
                name: "",
                phoneNumber: "",
                email: ""
            },
            manager: {
                name: "מישהו",
                phoneNumber: "02-1231322",
                email: "someone@mail.com"
            },
            teacher: {
                name: "סימונה",
                phoneNumber: "04-9999334",
                email: "simona@gmail.com"
            },
            facility: 1,
            activity: [{ day: 1, startTime: 2, endTime: 3 }],
            competition: 1,
            players: [],
            facilityAlternative: {name: "מתקן חלופי", address: "אי שם"},
            maxStudentBirthday: '2004-12-09 15:26:22.000'
        }
    ],
    payments: [],
    students: require('./students'),
    transferRequests: [{
        idNumber : 12345,
        team : 1,
        previousSchool : 'השכונה',
        firstName : 'מישהו',
        lastName : 'שעבר',
        region: 1
    },{
        idNumber : 32465548,
        team : 2,
        previousSchool : 12345,
        firstName : 'עוד מישהו',
        lastName : 'שעבר',
        region: 21
    }],
};

var lastTeamId = 0;

var getNewPlayer = function(data) {
    var player = {
        idNumber: data.idNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        grade: data.grade,
        gender: data.gender,
        health: data.health,
        idSlip: data.idSlip,
        picture: data.picture
    }

    return player;
};

function Registration() {
}

Registration.prototype.getLeagueRegistrationStage = function (school, callback) {
    callback(null, {stage: test.stage});
};

Registration.prototype.getLeagueRegistrationDetails = function (school, callback) {
    callback(null, test.details);
};

Registration.prototype.approveFirstConfirmation = function(school, callback) {
    test.firstConfirmation = true;
    callback(null, true);
};

Registration.prototype.setLeagueRegistrationDetails = function (school, details, callback) {
    test.details = details;
    if (test.stage < 1) {
        test.stage = 1;
    }
    callback(null, {stage: 1});
};

Registration.prototype.getCompetitions = function (school, options, callback) {
    callback(null, {
        sports: [
            {
                id: 15,
                name: "כדורסל",
                categories: [
                    {id: 1, category: 0xC0, name: "ז-ח תלמידים"},
                    {id: 2, category: 0xC00000, name: "ז-ח תלמידות"}
                ]
            },
            {
                id: 16,
                name: "כדורעף",
                categories: [
                    {id: 1, category: 0xC0, name: "ז-ח תלמידים"},
                    {id: 2, category: 0xC00000, name: "ז-ח תלמידות"}
                ]
            }
        ]
    });
};

Registration.prototype.getLeagueTeams = function (school, callback) {
    callback(null, test.teams);
};


Registration.prototype.getLeagueTeam = function (school, teamId, callback) {
    var team =  test.teams.find(function(team){
        return team.team == teamId
    });
    callback(null, team);
};



Registration.prototype.insertLeagueTeam = function (school, team, callback) {
    for (var i = 0; i < test.teams.length; i++) {
        var t = test.teams[i];
        if (t.team === team.team) {
            t.id = lastTeamId;
            t.active = team.active;
            t.coach = team.coach;
            t.facility = team.facility;
            t.activity = team.activity;
            t.manager = team.manager;
            t.coachHelper = team.coachHelper;
            t.teacher = team.teacher;
            t.approved = 1;
            t.createdAt = new Date();
            callback(null, {id: t.id, createdAt: t.createdAt, stage: 2});
            return
        }
    }
    callback("קבוצה לא נמצאה");

};

Registration.prototype.updateLeagueTeam = function (userId, school, id, team, callback) {
    for (var i = 0; i < test.teams.length; i++) {
        var t = test.teams[i];
        if (t.id === id) {
            t.active = team.active;
            t.coach = team.coach;
            t.facility = team.facility;
            t.activity = team.activity;
            t.manager = team.manager;
            t.coachHelper = team.coachHelper;
            t.teacher = team.teacher;
            t.approved = 1;
            callback(null, {stage: 2});
            return;
        }
    }
    callback({status: 404, message: "קבוצה לא נמצאה"});
};

Registration.prototype.deleteLeagueTeam = function (school, id, callback) {
    for (var i = 0; i < test.teams.length; i++) {
        var t = test.teams[i];
        if (t.id === id) {
            test.teams.splice(i, 1);
            callback();
            return;
        }
    }
    callback({status: 404, message: "קבוצה לא נמצאה"});
};

Registration.prototype.approveLeagueTeams = function (userId, school, approval, callback) {
    if (test.stage < 2) {
        test.stage = 2;
    }

    for (var i = 0; i < test.teams.length; i++) {
        var team = test.teams[i];
        if (team.active && (!team.approved || (team.approved & approval) === 0)) {
            team.approved |= approval;
        }
    }

    callback(null, {stage: 2});
};

Registration.prototype.getLeaguePayments = function (school, callback) {
    /*var payments = [];
    var p = {};
    for (var t = 0; t < test.teams.length; t++) {
        var team = test.teams[t];
        if (team.payment != null && !p[team.payment]) {
            payments.push({
                id: team.payment,
                order: team.payment
            });
        }
    }*/
    callback(null, test.payments);
};

Registration.prototype.insertPayments = function (school, payments, callback) {
    var now = new Date();
    var month = (now.getFullYear() % 100) * 100 + (now.getMonth() + 1);
    var orderId = month * 10000 + 1;
    for (var i = 0; i < test.payments.length; i++) {
        var payment = test.payments[i];
        if (payment.order >= orderId) {
            orderId = payment.order + 1;
        }
    }
    for (var i = 0; i < payments.length; i++) {
        var payment = payments[i];
        payment.id = orderId + i;
        payment.order = orderId;
        test.payments.push(payment);
        for (var c = 0; c < payment.details.items.length; c++) {
            var item = payment.details.items[c];
            for (var t = 0; t < item.teams.length; t++) {
                var teamId = item.teams[t];
                for (var a = 0; a < test.teams.length; a++) {
                    var team = test.teams[a];
                    if (team.id === teamId) {
                        team.payment = payment.id;
                        break;
                    }
                }
            }
        }

    }
    callback(null, {order: orderId});
};

Registration.prototype.cancelOrderPayments = function(school, orderId, callback) {
    callback(null, true);
};

Registration.prototype.upsertTeamPlayer = function(school, teamId, data, callback) {

    if (data.external) {
        // TODO
        callback();
        return;
    }

    var team = test.teams.find(function(team){
        return team.id == teamId;
    });

    var student;
    if (data.student != null) {
        student = test.students.find(function (student) {
            return student.student == data.student;
        });

        student.firstName = data.firstName;
        student.lastName = data.lastName;
        student.birthDate = data.birthDate;
        student.grade = data.grade;
        student.gender = data.gender;

        for (var i = 0; i < team.players.length; i++) {
            if (team.players[i].student === data.student) {
                team.players.splice(i, 1);
                break;
            }
        }
    }
    else {
        data.student = test.students.length + 1;
        data.school = school;
        student = data;
        test.students.push(student);
    }

    team.players.push(student);

    callback(null, student);
};

Registration.prototype.deleteTeamPlayer = function(school, teamId, studentId, callback) {
    var team = test.teams.find(function(team){
        return team.id === teamId;
    });

    for (var i = 0; i < team.players.length; i++) {
        if (team.players[i].student === studentId)
            team.players.splice(i, 1);
    }

    callback(null, true)
};

Registration.prototype.changeLeagueTeamStatus = function(teams, status, callback) {
    for (var i = 0; i < test.teams.length; i++) {
        if (teams.indexOf(team.id) >= 0) {
            team.status = status;
        }
    }
    callback(null, true);
};

Registration.prototype.changeLeaguePlayerStatus = function(players, status, callback) {
    callback(null, true);
};

Registration.prototype.requestTransfer = function(school, playerId, teamId, callback){
    callback(null, true);
};

Registration.prototype.deleteTransferRequest = function(school, teamId, idNumber, callback){
    for (var i = 0; i < test.transferRequests.length; i++) {
        var transfer = test.transferRequests[i];
        if (transfer.team === teamId && transfer.idNumber === idNumber) {
            test.transferRequests.splice(i, 1);
            break;
        }
    }
    callback(null, true);
};

Registration.prototype.getTransferRequests = function(school, teamId, callback){
    var result = [];
    for (var i = 0; i < test.transferRequests.length; i++) {
        var transfer = test.transferRequests[i];
        if (transfer.team === teamId) {
            result.push(transfer);
        }
    }
    callback(null, result);
};

module.exports = new Registration();