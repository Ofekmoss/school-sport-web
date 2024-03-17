

var teams = [
    {
        id: 1,
        sport: 15,
        competition: 17263,
        school: {id: 16, name: "בדיקה", symbol: "9999999", region: 1},
        teamNumber: 1,
        coach: {
            name: "מאמן",
            phoneNumber: "03-9192039",
            email: "coach@mail.com",
            certification: 1
        },
        facility: {
            id: 1,
            name: "אולם ספורט"
        },
        activity: [{ day: 2, startTime: 600, endTime: 720 }],
        approved: 15,
        payment: 19000019,
        order: 19000033,
        status: 1,
        createdAt: '2019-07-14 20:19:17.700',
        principal: {
            name: "מנהל",
            phoneNumber: "050123456",
            email: "principal@gmail.oom"
        },
        chairman: {
            name: "יור",
            phoneNumber: "050123456",
            email: "chairman@gmail.oom"
        },
        coordinator: {
            name: "רכז",
            phoneNumber: "050123456",
            email: "coordinator@gmail.oom"
        },
        representative: {
            name: "נציג",
            phoneNumber: "050123456",
            email: "representative@gmail.oom"
        }
    },
    {
        id: 2,
        sport: 15,
        competition: 17263,
        school: {id: 16, name: "בדיקה", symbol: "9999999", region: 1},
        teamNumber: 1,
        coach: {
            name: "מאמן",
            phoneNumber: "03-9192039",
            email: "coach@mail.com",
            certification: 1
        },
        facility: {
            id: 1,
            name: "אולם ספורט"
        },
        activity: [{ day: 2, startTime: 600, endTime: 720 }],
        approved: 1,
        payment: 19000019,
        order: 19000033,
        status: -1,
        createdAt: '2019-07-14 20:19:17.700',
        principal: {
            name: "מנהל",
            phoneNumber: "050123456",
            email: "principal@gmail.oom"
        },
        chairman: {
            name: "יור",
            phoneNumber: "050123456",
            email: "chairman@gmail.oom"
        },
        coordinator: {
            name: "רכז",
            phoneNumber: "050123456",
            email: "coordinator@gmail.oom"
        },
        representative: {
            name: "נציג",
            phoneNumber: "050123456",
            email: "representative@gmail.oom"
        }
    },
    {
        id: 3,
        sport: 15,
        competition: 17263,
        school: {id: 11, name: "בדיקה2", symbol: "9999999", region: 1},
        teamNumber: 1,
        coach: {
            name: "מאמן",
            phoneNumber: "03-9192039",
            email: "coach@mail.com",
            certification: 0
        },
        facility: {
            id: 1,
            name: "אולם ספורט"
        },
        activity: [{ day: 2, startTime: 600, endTime: 720 }],
        approved: 1,
        payment: 19000019,
        order: 19000033,
        status: -1,
        createdAt: '2019-07-14 20:19:17.700',
        principal: {
            name: "מנהל",
            phoneNumber: "050123456",
            email: "principal@gmail.oom"
        },
        chairman: {
            name: "יור",
            phoneNumber: "050123456",
            email: "chairman@gmail.oom"
        },
        coordinator: {
            name: "רכז",
            phoneNumber: "050123456",
            email: "coordinator@gmail.oom"
        },
        representative: {
            name: "נציג",
            phoneNumber: "050123456",
            email: "representative@gmail.oom"
        }
    },
    {
        id: 3,
        sport: 15,
        competition: 17263,
        school: {id: 12, name: "בדיקה3", symbol: "9999999", region: 1},
        teamNumber: 1,
        coach: {
            name: "מאמן",
            phoneNumber: "03-9192039",
            email: "coach@mail.com",
            certification: 1
        },
        facility: {
            id: 1,
            name: "אולם ספורט"
        },
        activity: [{ day: 2, startTime: 600, endTime: 720 }],
        approved: 1,
        payment: 19000019,
        order: 19000033,
        status: -1,
        createdAt: '2019-07-14 20:19:17.700',
        principal: {
            name: "מנהל",
            phoneNumber: "050123456",
            email: "principal@gmail.oom"
        },
        chairman: {
            name: "יור",
            phoneNumber: "050123456",
            email: "chairman@gmail.oom"
        },
        coordinator: {
            name: "רכז",
            phoneNumber: "050123456",
            email: "coordinator@gmail.oom"
        },
        representative: {
            name: "נציג",
            phoneNumber: "050123456",
            email: "representative@gmail.oom"
        }
    },
];

function Teams() {

}

Teams.prototype.Status = {
    Active: 1, // On team registration/activation
    PrincipalApproval: 2,
    RepresentativeApproval: 4,
    SupervisorApproval: 8,
    SupervisorDisapproval: 16
};

Teams.prototype.list = function (season, options, callback) {
    for (var i = 0; i < teams.length; i++) {
        var team = teams[i];
        team.status = {};

        if ((team.approved & this.Status.SupervisorDisapproval) !== 0) {
            team.status.supervisor = -1;
        }
        else if ((team.approved & this.Status.SupervisorApproval) !== 0) {
            team.status.supervisor = 1;
        }
        else {
            team.status.supervisor = 0;
        }
    }
    callback(null, teams);
};


Teams.prototype.setTeamsApproval = function (season, changeTeams, change, callback) {
    for (var i = 0; i < teams.length; i++) {
        var team = teams[i];
        if (changeTeams.indexOf(team.id) >= 0) {
            team.approved = (team.approved & ~change.remove) | change.add;
        }
    }
    callback();
};

Teams.prototype.updateTeam = function(data, callback){
    callback();
};

module.exports = new Teams();