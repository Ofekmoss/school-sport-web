define(["templates/admin", "utils", "dialog", "services/access", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access) {

    function readCompetitions(comp, callback) {
        Vue.http.get('/api/v2/admin/competitions?clubs=1')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.sports.length; i++) {
                        comp.sports.push(resp.body.sports[i]);
                    }
                    callback();
                },
                function (err) {
                    callback(err);
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
                    Vue.http.get('/api/v2/admin/teams?clubs=1')
                        .then(
                            function (resp) {
                                for (var i = 0; i < resp.body.length; i++) {
                                    var team = resp.body[i];
                                    team.sport = getById(comp.sports, team.sport);
                                    if (team.sport) {
                                        team.category = getById(team.sport.categories, team.competition);
                                    }
                                    if (team.category) {
                                        comp.teams.push(team);
                                    }
                                }
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                }
            });
        }


    var ClubTeamsApprovalComponent = Vue.extend({
        template: templates["club-teams-approval"],
        data: function () {
            return {
                teams: [],
                columns: [{
                    key: 'school.name',
                    name: 'בית ספר',
                    active: true
                }, {
                    key: 'sport.name',
                    name: 'ענף ספורט',
                    active: true
                }, {
                    key: 'category.name',
                    name: 'קטגוריה',
                    active: true
                }, {
                    name: 'סטטוס',
                    key: 'status.coordinator',
                    active: true,
                    lookup: {
                        "0": "ממתין לאישור",
                        "-1": "לא אושר",
                        "1": "אושר"
                    }
                }],
                sports: [],
                searchText: "",
                isSelectAll: false,
                statuses: [{id: 1, name: 'אושר'}, {id: 2, name: 'לא אושר'}, {id: 3, name: 'ממתין לאישור'}],
                selectedStatus: null,
                selectedTeams: []
            };
        },
        mounted: function () {
            readTeams(this);
        },
        methods: {
            handleSelectionChange: function () {
                this.selectedTeams.splice(0, this.selectedTeams.length);
                this.selectedStatus = null;
                for (var i = 0; i < this.teams.length; i++) {
                    var team = this.teams[i];
                    if (team.selected) {
                        if (this.selectedTeams.length === 0) {
                            this.selectedStatus = team.status.coordinator;
                        }
                        else if (this.selectedStatus != team.status.coordinator) {
                            this.selectedStatus = null;
                        }
                        this.selectedTeams.push(team);
                    }
                }
            },
            changeStatus: function(status) {
                var comp = this;
                Vue.http.post('/api/v2/admin/teams/status/coordinator', {
                    teams: comp.selectedTeams.map(function (t) { return t.id; }),
                    status: status
                })
                    .then(
                        function () {
                            comp.selectedStatus = status;
                            for (var i = 0; i < comp.selectedTeams.length; i++) {
                                comp.selectedTeams[i].status.coordinator = status;
                            }
                        },
                        function (err) {
                            console.log(err);
                        }
                    );

            },
            logout: function() {
                Access.logout();
            }
        }
    });

    return ClubTeamsApprovalComponent;
});