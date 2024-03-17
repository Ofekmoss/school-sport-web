define(["templates/registration", "services/access", "services/products", "dialog", "consts", "utils"], function (
    templates, Access, Products, Dialog, consts, utils) {

    var productPrices = {};

    function getTeamPrice(hasTotoSupport, sportId) {
        if (sportId == 81 || sportId == 86) {
            return sportId == 81 ? productPrices[1054] : productPrices[1053];
        } else {
            return productPrices[hasTotoSupport ? 101 : 100];
        }
    }

    function readCompetitions(comp, callback) {
        Vue.http.get('/api/v2/registration/club/competitions')
            .then(
                function (resp) {
                    var sports = [];
                    // console.log(resp.body.sports);
                    for (var i = 0; i < resp.body.sports.length; i++) {
                        sports.push(resp.body.sports[i]);
                    }
                    comp.sports = sports;
                    callback();
                },
                function (err) {
                    callback(err);
                }
            );
    }

    function readFacilities(comp) {
        Vue.http.get('/api/v2/facilities/-')
            .then(
                function (resp) {
                    var facilities = [];
                    for (var i = 0; i < resp.body.length; i++) {
                        facilities.push(resp.body[i]);
                    }
                    comp.facilities = facilities;
                },
                function (err) {
                    console.log(err);
                }
            );
    }

    function readProductPrices(callback) {
        Vue.http.get('/api/v2/payment/products')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        var product = resp.body[i];
                        if (product.id === 5) {
                            // Not in use at the moment
                            //comp.teamPrice = product.price;
                        }
                    }
                },
                function (err) {
                    console.log(err);
                }
            );
    }

    function getById(list, id) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.id === id) {
                return item;
            }
        }
        return null;
    }

    function readTeams(comp) {
        readCompetitions(comp, function (err) {
            if (!err) {
                Vue.http.get('/api/v2/registration/club/teams')
                    .then(
                        function (resp) {
                            var teams = [];
                            for (var i = 0; i < resp.body.length; i++) {
                                var team = resp.body[i];
                                team.sport = getById(comp.sports, team.sport);
                                // console.log(team.sport);
                                // team.price = getTeamPrice(team.hasTotoSupport, team.sport.id);
                                if (team.sport) {
                                    team.category = getById(team.sport.categories, team.competition);
                                }
                                if (team.category) {
                                    if (team.payment != null) {
                                        comp.paidTeams++;
                                    }
                                    team.createdAt = new Date(team.createdAt);
                                    teams.push(team);
                                }
                                if (team.adminStatus == 2) {
                                    team.tooltip = 'קבוצה אושרה על ידי רכז התאחדות הספורט, לא ניתן לערוך פרטים';
                                }
                            }

                            comp.totalPayment = comp.getTotalPrice(teams);
                            comp.teams = teams;
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
            }
        });
    }

    function deleteNextTeam(comp, teams) {
        if (!teams.length) {
            return;
        }

        var team = teams[0];
        teams.splice(0, 1);
        Vue.http.delete('/api/v2/registration/club/teams/' + encodeURIComponent(team.id))
            .then(
                function (resp) {
                    for (var i = 0; i < comp.teams.length; i++) {
                        if (comp.teams[i] === team) {
                            comp.teams.splice(i, 1);
                            break;
                        }
                    }
                    deleteNextTeam(comp, teams);
                },
                function (err) {
                    Dialog.open('general/error-message', {
                        caption: "פעולה נכשלה",
                        message: typeof err.body === "string" ? err.body : "שגיאה במחיקת קבוצה"
                    });
                }
            );
    }


    var RegistrationClubTeamsComponent = Vue.extend({
        template: templates["club-teams"],
        data: function () {
            return {
                user: Access.user,
                teams: [],
                facilities: [],
                sports: [],
                paidTeams: 0,
                products: null,
                selectAll: false,
                selectionCount: 0,
                adminApprovedSelectionCount: 0,
                totalPayment: 0,
                inactiveSeason: false,
                currentSeasonName: '',
                priceWithTotoSupport: 0,
                priceWithoutTotoSupport: 0
            };
        },
        mounted: function () {
            var comp = this;
            //console.log('club teams mounted');
            readFacilities(this);
            Products.get(function (err, products) {
                if (err) {
                    console.log(err);
                }
                else {
                    for (var productId in products) {
                        productPrices[productId] = products[productId].price;
                    }
                    //console.log(productPrices);
                    comp.reloadComponent()
                }
            });
            comp.inactiveSeason = utils.inactiveSeason(comp);
            if (comp.inactiveSeason) {
                //check if school is authorized
                utils.checkSeasonAuthorization(comp.user, function(err, authorized) {
                    if (authorized == true) {
                        comp.inactiveSeason = false;
                    }
                });
            }
            var activeSeason = comp.user.season;
            if (activeSeason) {
                Vue.http.get('/api/v2/seasons').then(function (resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        var curSeason = resp.body[i];
                        if (curSeason.id == activeSeason) {
                            comp.currentSeasonName = curSeason.name;
                            break;
                        }
                    }
                    Vue.http.get('/api/v2/registration/club/basic-prices').then(function (resp) {
                        if (resp.body) {
                            comp.priceWithTotoSupport = resp.body.WithTotoSupport || 0;
                            comp.priceWithoutTotoSupport = resp.body.NoTotoSupport || 0;
                        }
                    });
                });
            }
        },
        methods: {
            reloadComponent: function() {
                readTeams(this);
            },
            handleSelectionChange: function () {
                var comp = this;
                comp.selectionCount = 0;
                comp.adminApprovedSelectionCount = 0;
                for (var i = 0; i < comp.teams.length; i++) {
                    var team = comp.teams[i];
                    if (team.selected) {
                        comp.selectionCount++;
                        if (team.adminStatus == 2)
                            comp.adminApprovedSelectionCount++;
                    }
                }
                comp.selectAll = comp.selectionCount === comp.teams.length;
            },
            handleSelectAll: function () {
                var comp = this;
                if (comp.selectAll) {
                    for (var i = 0; i < comp.teams.length; i++) {
                        comp.teams[i].selected = true;
                    }
                    comp.selectionCount = comp.teams.length;
                    comp.adminApprovedSelectionCount = comp.teams.filter(function(team) {
                        return team.adminStatus == 2;
                    }).length;
                }
                else {
                    for (var i = 0; i < comp.teams.length; i++) {
                        comp.teams[i].selected = false;
                    }
                    comp.selectionCount = 0;
                    comp.adminApprovedSelectionCount = 0;
                }
            },
            getActivityText: utils.getActivityText,
            newTeam: function () {
                var comp = this;
                Dialog.open("registration/club/club-team-dialog", {facilities: comp.facilities, sports: comp.sports, teams: comp.teams},
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        Vue.http.post('/api/v2/registration/club/teams', {
                            sport: result.sport.id,
                            competition: result.category.id,
                            teamNumber: result.teamNumber,
                            coach: result.coach,
                            facility: result.facility,
                            activity: result.activity,
                            hostingHours: result.hostingHours
                        })
                            .then(
                                function (resp) {
                                    // result.id = resp.body.id;
                                    // result.hasTotoSupport = resp.body.hasTotoSupport;
                                    // result.price = getTeamPrice(result.hasTotoSupport);
                                    // result.createdAt = new Date(resp.body.createdAt);
                                    // comp.teams.push(result);
                                    comp.reloadComponent()
                                },
                                function (err) {
                                    Dialog.open('general/error-message', {
                                        caption: "פעולה נכשלה",
                                        message: typeof err.body === "string" ? err.body : "שגיאה בהכנסת קבוצה"
                                    });
                                }
                            );

                    });
            },
            editTeam: function () {
                var comp = this;
                var team = null;
                var teamIndex = null;
                for (var i = 0; i < this.teams.length; i++) {
                    var t = this.teams[i];
                    if (t.selected) {
                        if (team) {
                            return; // More than 1 team selected
                        }
                        else {
                            teamIndex = i;
                            team = {
                                id: t.id,
                                sport: t.sport,
                                category: t.category,
                                teamNumber: t.teamNumber,
                                coach: {
                                    name: t.coach.name,
                                    phoneNumber: t.coach.phoneNumber,
                                    email: t.coach.email,
                                    certification: t.coach.certification,
                                    certificationTypes: t.coach.certificationTypes,
                                    sexOffenseClearance: t.coach.sexOffenseClearance
                                },
                                facility: t.facility,
                                activity: t.activity && t.activity.length > 0 ? t.activity.map(function (a) { return { day: a.day, startTime: a.startTime, endTime: a.endTime }; }) : [],
                                hostingHours: t.hostingHours && t.hostingHours.length > 0 ? t.hostingHours.map(function (a) { return { day: a.day, startTime: a.startTime, endTime: a.endTime }; }) : []
                            };
                        }
                    }
                }
                Dialog.open("registration/club/club-team-dialog",
                    {
                        facilities: comp.facilities,
                        sports: comp.sports,
                        team: team,
                        teams: comp.teams
                    },
                    function (err, result) {
                        if (result == null) {
                            return;
                        }
                        //console.log(result);
                        //return;
                        Vue.http.put('/api/v2/registration/club/teams/' + encodeURIComponent(result.id), {
                            sport: result.sport.id,
                            competition: result.category.id,
                            teamNumber: result.teamNumber,
                            coach: result.coach,
                            facility: result.facility,
                            activity: result.activity,
                            hostingHours: result.hostingHours
                        })
                            .then(
                                function (resp) {
                                    // result.selected = true;
                                    // result.hasTotoSupport = resp.body.hasTotoSupport;
                                    // result.price = getTeamPrice(result.hasTotoSupport);
                                    // comp.teams.splice(teamIndex, 1, result);
                                    comp.reloadComponent()
                                },
                                function (err) {
                                    Dialog.open('general/error-message', {
                                        caption: "פעולה נכשלה",
                                        message: typeof err.body === "string" ? err.body : "שגיאה בעריכת קבוצה"
                                    });
                                }
                            );
                    });
            },
            duplicateTeam: function () {
                var comp = this;
                var team = null;
                var teamIndex = null;
                for (var i = 0; i < this.teams.length; i++) {
                    var t = this.teams[i];
                    if (t.selected) {
                        if (team) {
                            return; // More than 1 team selected
                        }
                        else {
                            teamIndex = i;
                            team = {
                                sport: t.sport,
                                category: t.category,
                                coach: {
                                    name: t.coach.name,
                                    phoneNumber: t.coach.phoneNumber,
                                    email: t.coach.email
                                },
                                facility: t.facility,
                                activity: t.activity && t.activity.length > 0 ? t.activity.map(function (a) { return { day: a.day, startTime: a.startTime, endTime: a.endTime }; }) : [],
                                hostingHours: t.hostingHours && t.hostingHours.length > 0 ? t.hostingHours.map(function (a) { return { day: a.day, startTime: a.startTime, endTime: a.endTime }; }) : []
                            };
                        }
                    }
                }
                //console.log(comp.teams);
                Dialog.open("registration/club/club-team-dialog",
                    {
                        facilities: comp.facilities,
                        sports: comp.sports,
                        team: team,
                        duplicate: true,
                        teams: comp.teams
                    },
                    function (err, result) {
                        if (result == null) {
                            return;
                        }
                        Vue.http.post('/api/v2/registration/club/teams', {
                            sport: result.sport.id,
                            competition: result.category.id,
                            teamNumber: result.teamNumber,
                            coach: result.coach,
                            facility: result.facility,
                            activity: result.activity,
                            hostingHours: result.hostingHours
                        })
                            .then(
                                function (resp) {
                                    // result.id = resp.body.id;
                                    // result.hasTotoSupport = resp.body.hasTotoSupport;
                                    // result.price = getTeamPrice(result.hasTotoSupport);
                                    // comp.teams.push(result);
                                    comp.reloadComponent()
                                },
                                function (err) {
                                    Dialog.open('general/error-message', {
                                        caption: "פעולה נכשלה",
                                        message: typeof err.body === "string" ? err.body : "שגיאה בהכנסת קבוצה"
                                    });
                                }
                            );

                    });
            },
            deleteTeam: function () {
                var comp = this;
                var teams = [];
                for (var i = 0; i < comp.teams.length; i++) {
                    var team = comp.teams[i];
                    if (team.selected) { //&& team.adminStatus != 2) {
                        teams.push(team);
                    }
                }
                if (teams.length === 0) {
                    return;
                }
                Dialog.open("general/message-box",
                    {
                        caption: "מחיקת קבוצה",
                        message: teams.length === 1 ? "האם להסיר את רישום הקבוצה מהמועדון?" : "האם להסיר את רישום הקבוצות מהמועדון?",
                        alert: true,
                        confirmText: "כן",
                        cancelText: "לא"
                    }, function (err, result) {
                        if (result === true) {
                            deleteNextTeam(comp, teams);
                            comp.reloadComponent();
                        }
                    });
            },
            getFacilityName: function (team) {
                if (team.facilityName != null && team.facilityName.length > 0)
                    return team.facilityName;
                var id = team.facility;
                for (var i = 0; i < this.facilities.length; i++) {
                    var f = this.facilities[i];
                    if (f.id === id) {
                        return f.name;
                    }
                }
                return null;
            },
            next: function () {
                var comp = this;
                Vue.http.post('/api/v2/registration/club/teams/approve')
                    .then(
                        function (resp) {
                            comp.$emit("next", resp.data.stage);
                        },
                        function (err) {
                            Dialog.open("general/error-message", {
                                caption: "פעולה נכשלה",
                                message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                            });
                        }
                    );
            },
            nonApprovedTeamCount: function() {
                var comp = this;
                var count = 0;
                if (comp.teams != null) {
                    for (var i = 0; i < comp.teams.length; i++) {
                        var curTeam = comp.teams[i];
                        if (curTeam.approved == null || curTeam.approved == 0)
                            count++;
                    }
                }
                return count;
            },
            getTotalPrice: function(teams) {
                var streetBallTeams = {};
                var total =  teams.reduce(function(total, team) {

                    if (team.sport.isOnePaymentPerCategory ) {
                        //console.log(team.category);
                        var key = [team.category.id, team.category.category].join('_');
                        if (streetBallTeams[key]) {
                            team.removePayment = true;
                            return total;
                        } else {
                            streetBallTeams[key] = true;
                        }
                    }

                    if (team.payment) {
                        return total;
                    }

                    total += team.price;
                    return total;
                }, 0);

                return total;
            }
        }
    });

    return RegistrationClubTeamsComponent;
});