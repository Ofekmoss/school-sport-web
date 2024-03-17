module.exports = {
    validate: function (username, password, callback) {
        if (username === '9999999' && password === '999') {
            callback(null, true);
        }
        else {
            callback(null, false);
        }
    },
    login: function (params, callback) {
        if (params.username) {
            if (params.username === '9999999' && params.password === '999') {
                callback(null, {
                    displayName: "בית ספר אחלה",
                    username: params.username,
                    schoolID: 12345,
                    regionID: 1,
                    defaultRoute: 'registration/select',
                    roles: ['school']
                });
            } else if (params.username === '1' && params.password === '1') {
                callback(null, {
                    displayName: "רכז ירושלים",
                    username: params.username,
                    regionID: 1,
                    defaultRoute: 'admin/teams',
                    roles: ['admin']
                });
            } else if (params.username === '0' && params.password === '0') {
                callback(null, {
                    displayName: "רכז מטה",
                    username: params.username,
                    regionID: 0,
                    defaultRoute: 'admin/teams',
                    roles: ['admin'],
                });
            } else if (params.username === '2' && params.password === '2') {
                callback(null, {
                    displayName: "רכז מטה",
                    username: params.username,
                    regionID: 0,
                    defaultRoute: 'manage/dashboard',
                    roles: ['admin'],
                    schoolID: 12345
                });
            } else if (params.username === 'c' && params.password === 'c') {
                callback(null, {
                    displayName: "חיפה",
                    username: params.username,
                    regionID: 3,
                    cityID: 3,
                    defaultRoute: 'registration/select',
                    roles: ['city']
                });
            } else if (params.username === 'i' && params.password === 'i') {
                callback(null, {
                    displayName: "משתמש מפקח",
                    username: params.username,
                    regionID: 0,
                    defaultRoute: 'supervisor/club-teams-approval',
                    roles: ['supervisor'],
                });
            } else if (params.username === 'מפקחמנהל' && params.password === 'מפקחמנהל') {
                callback(null, {
                    displayName: "משתמש מפקח מנהל הספורט",
                    username: params.username,
                    regionID: 0,
                    defaultRoute: 'sport-admin-supervisor/project-teams-approval',
                    roles: ['sport-admin'],
                });
            } else if (params.username === 'f' && params.password === 'f') {
                callback(null, {
                    displayName: "משתמש כספים",
                    username: params.username,
                    regionID: 0,
                    defaultRoute: 'finance/team-payments-approval',
                    roles: ['finance'],
                });
            } else {
                callback({status: 401, message: "שם משמתמש או סיסמה שגויים"});
            }
        }
        else {
            if (params.token === 'principal' && params.code === '123') {
                callback(null, {
                    displayName: "מנהל אחלה",
                    username: "",
                    schoolID: 12345,
                    regionID: 1,
                    defaultRoute: 'principal-approval/teams',
                    roles: ['principal-approval']
                });
            }
            if (params.token === 'representative' && params.code === '123') {
                callback(null, {
                    displayName: "נציג אחלה",
                    username: "",
                    schoolID: 12345,
                    regionID: 1,
                    defaultRoute: 'representative-approval/teams',
                    roles: ['representative-approval']
                });
            }
            else {
                callback({status: 401, message: "קוד כניסה שגוי"});
            }
        }
    }
};