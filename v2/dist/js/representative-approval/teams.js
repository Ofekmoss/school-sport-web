define(["templates/representative-approval", "services/access", "services/products", "dialog", "utils"],
    function (templates, Access, Products, Dialog, utils) {

        var Approval = 0x4;
        var days = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

        function getTimeText(time) {
            var min = time % 60;
            var hour = (time - min) / 60;
            return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
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

        function readConfirmations(comp, callback) {
            Vue.http.get('/api/v2/registration/confirmations').then(function (resp) {
                comp.confirmedAt = null;
                var allConfirmations = resp.body;
                var rawValue = allConfirmations['representative-teams'];
                if (rawValue) {
                    comp.confirmedAt = utils.parseRawDate(rawValue);
                }
                callback();
            }, function (err) {
                comp.confirmedAt = null;
                callback(err);
            });
        }

        function readCompetitions(comp, callback) {
            Vue.http.get('/api/v2/registration/league/competitions')
                .then(
                    function (resp) {
                        for (var i = 0; i < resp.body.sports.length; i++) {
                            var sport = resp.body.sports[i];
                            sport.league = true;
                            comp.sports.push(sport);
                        }
                        Vue.http.get('/api/v2/registration/club/competitions').then(function (resp) {
                            for (var i = 0; i < resp.body.sports.length; i++) {
                                var sport = resp.body.sports[i];
                                sport.club = true;
                                comp.sports.push(sport);
                            }
                            callback();
                        }, function (err) {
                            callback(err);
                        });
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
                        for (var i = 0; i < resp.body.length; i++) {
                            comp.facilities.push(resp.body[i]);
                        }
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        }

        function readTeams(comp) {
            readCompetitions(comp, function (err) {
                if (!err) {
                    Vue.http.get('/api/v2/registration/team-confirmations').then(function(resp) {
                        var confirmationMapping = {};
                        if (resp.body) {
                            for (var i = 0; i < resp.body.length; i++) {
                                var team = resp.body[i];
                                confirmationMapping[team.Id.toString()] = team;
                            }
                        }
                        Vue.http.get('/api/v2/registration/league/teams')
                            .then(
                                function (resp) {
                                    comp.approveCount = 0;
                                    for (var i = 0; i < resp.body.length; i++) {
                                        var team = resp.body[i];
                                        team.selected = comp.selectAll;
                                        if (!team.active || !team.approved) {
                                            // Not showing teams that were not approved in the teams stage
                                            continue;
                                        }
                                        if ((team.approved & Approval) === 0) {
                                            comp.approveCount++;
                                        }
                                        var matchingSport = comp.sports.find(function(sport) {
                                            return sport.id == team.sport && sport.league == true;
                                        });
                                        if (matchingSport) {
                                            team.sport = matchingSport
                                            team.category = getById(team.sport.categories, team.competition);
                                            if (team.category) {
                                                comp.teams.push(team);
                                            }
                                            if (!team.price) {
                                                team.price = comp.teamPrice;
                                            }
                                        }
                                    }
                                    Vue.http.get('/api/v2/registration/club/teams').then(function (resp) {
                                        for (var i = 0; i < resp.body.length; i++) {
                                            var team = resp.body[i];
                                            team.active = true;
                                            if ((team.approved & Approval) === 0) {
                                                comp.approveCount++;
                                            }
                                            team.selected = comp.selectAll;
                                            var matchingSport = comp.sports.find(function(sport) {
                                                return sport.id == team.sport && sport.club == true;
                                            });
                                            if (matchingSport) {
                                                team.sport = matchingSport
                                                team.category = getById(team.sport.categories, team.competition);
                                                if (team.category) {
                                                    comp.teams.push(team);
                                                }
                                            }
                                        }
                                        comp.teams.forEach(function(team) {
                                            var confirmationData = confirmationMapping[team.id.toString()];
                                            if (confirmationData) {
                                                team.DateConfirmed = new Date(confirmationData.DateConfirmed);
                                            }
                                        });
                                        comp.teams.sort(function(a, b){
                                            return new Date(b.createdAt) - new Date(a.createdAt);
                                        });
                                    }, function (err) {
                                        console.log(err);
                                    });
                                },
                                function (err) {
                                    console.log(err);
                                }
                            );
                    }, function(err) {
                        console.log(err);
                    });
                }
            });
        }

        var RepresentativeApprovalComponent = Vue.extend({
            template: templates.teams,
            data: function () {
                return {
                    user: Access.user,
                    confirmation: false,
                    approveCount: 0,
                    facilities: [],
                    sports: [],
                    teams: [],
                    selectAll: true,
                    confirmedAt: null,
                    selectionCount: function() {
                        return this.teams.filter(function(team) {
                            return team.selected === true;
                        }).length;
                    }
                };
            },
            mounted: function () {
                var comp = this;
                readConfirmations(comp, function(err) {
                    readFacilities(comp);
                    Products.getById(200, function (err, product) {
                        comp.teamPrice = product.price;
                        readTeams(comp);
                    });
                });
            },
            watch: {
                selectAll: function () {
                    var comp = this;
                    comp.teams.forEach(function(team) {
                        team.selected = comp.selectAll;
                    });
                },
                teams: {
                    handler: function(val) {
                        if (this.teams.length > 0 && this.selectionCount() === 0 && this.selectAll === true) {
                            this.selectAll = false;
                        } else if (this.teams.length > 0 && this.selectionCount() === this.teams.length && this.selectAll === false) {
                            this.selectAll = true;
                        }
                    },
                    deep: true
                }
            },
            methods: {
                isApproved: function (team) {
                    if (team.active && team.approved) {
                        return (team.approved & Approval) !== 0;
                    }
                    return false;
                },
                getFacilityName: function (id) {
                    for (var i = 0; i < this.facilities.length; i++) {
                        var f = this.facilities[i];
                        if (f.id === id) {
                            return f.name;
                        }
                    }
                    return null;
                },
                getActivityText: function (activity) {
                    return activity.map(function (a) {
                        if (a.day != null) {
                            return days[a.day] +
                                (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                                (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
                        }
                        return "";
                    }).join("; ");
                },
                logout: function() {
                    Access.logout();
                },
                confirm: function () {
                    var comp = this;
                    var selectedTeams = comp.teams.filter(function (x) {
                        return x.selected === true;
                    });
                    var selectedTeamIds = selectedTeams.map(function (x) {
                        return x.id;
                    });
                    Vue.http.post('/api/v2/registration/league/teams/approve/representative', selectedTeamIds)
                        .then(
                            function (resp) {
                                Vue.http.post('/api/v2/registration/club/teams/approve/representative', selectedTeamIds).then(function (resp) {
                                    selectedTeams.forEach(function(team) {
                                        if (team.active) {
                                            team.approved |= Approval;
                                            comp.approveCount--;
                                            team.selected = false;
                                            if (!team.DateConfirmed)
                                                team.DateConfirmed = new Date();
                                        }
                                    });
                                    var requestParams = {
                                        Approval: 1,
                                        Teams: selectedTeamIds
                                    };
                                    Vue.http.post('/api/v2/registration/confirmation', requestParams).then(function(resp) {
                                        console.log('confirmed');
                                    }, function(err) {
                                        console.log(err);
                                    });
                                }, function (err) {
                                    Dialog.open("general/error-message", {
                                        caption: "פעולה נכשלה",
                                        message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                                    });
                                });
                            },
                            function (err) {
                                Dialog.open("general/error-message", {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "כשלון בעדכון נתונים"
                                });
                            }
                        );
                }
            }
        });

        return RepresentativeApprovalComponent;
    });