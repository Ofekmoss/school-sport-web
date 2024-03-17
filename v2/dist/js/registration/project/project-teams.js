define(["templates/registration", "dialog"], function (templates, Dialog) {

    function setData(teams, grades, classes, classTypes){
        teams.forEach(function(team){
            team.part1 = JSON.parse(team.item1);
            team.part2 = JSON.parse(team.item2);
            team.part3 = JSON.parse(team.item3);
            var data = team.ages + '';
            team.gradeIndex = grades[data[1]];
            team.gradeClass = grades[data[1]].name + classes[data[2]].name;
            team.gradeClassType = classTypes[data[3]].name;
        });
        return teams;
    }

    var RegistrationProjectTeamsComponent = Vue.extend({
        template: templates["project-teams"],
        props: ['project', 'school'],
        data: function () {
            return {
                updating: false,
                selectionCount: 0,
                teams: [],
                grades: [
                    {value: 5, name: "ה'"},
                    {value: 6, name: "ו'"}
                ],
                gradeClasses: [
                    {value: 0, name: "1'"},
                    {value: 1, name: "2'"},
                    {value: 2, name: "3'"},
                    {value: 3, name: "4'"},
                    {value: 4, name: "5'"},
                    {value: 5, name: "6'"},
                    {value: 6, name: "7'"},
                    {value: 7, name: "8'"},
                    {value: 8, name: "9'"},
                    {value: 9, name: "10'"}
                ],
                gradeClassesTypes: [{value: 0, name: "כיתה רגילה"}, {value: 1, name: "חינוך מיוחד"}, {value: 2, name: "כיתה קטנה"}],
                teamColumns: [
                    {
                        key: 'gradeIndex.name',
                        name: 'שכבה',
                        active: true
                    },
                    {
                        key: 'gradeClass',
                        name: 'כיתה',
                        active: true
                    },
                    {
                        key: 'gradeClassType',
                        name: 'סוג כיתה',
                        active: true
                    },
                    {
                        key: 'studentCount',
                        name: 'מספר תלמידים',
                        active: true
                    },
                    {
                        key: 'part1',
                        name: "שליש א'",
                        active: true
                    },
                    {
                        key: 'part2',
                        name: "שליש ב'",
                        active: true
                    },
                    {
                        key: 'part3',
                        name: "שליש ג'",
                        active: true
                    }
                ],
                items: [],
                selectedTeam: null
            };
        },
        mounted: function () {
            var comp = this;
            if (comp.project && comp.school) {
                Vue.http.get('/api/v2/registration/project/' + comp.project.id)
                    .then(
                        function (resp) {
                            comp.items.push({value: 0, name: resp.data.item1});
                            comp.items.push({value: 1, name: resp.data.item2});
                            comp.items.push({value: 2, name: resp.data.item3});
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
                Vue.http.get('/api/v2/registration/project/' + encodeURIComponent(comp.project.id) + '/schools/' + encodeURIComponent(comp.school.id))
                    .then(
                        function (resp) {
                            comp.teams = setData(resp.data.teams, comp.grades, comp.gradeClasses, comp.gradeClassesTypes);
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
            }
        },
        methods: {
            handleSelectionChange: function () {
                this.selectionCount = this.teams.filter(function(team){
                    return team.selected;
                }).length;
            },
            addTeam: function () {
                var comp = this;
                Dialog.open("registration/project/project-team-dialog",
                    {items: comp.items, school: comp.school.id, teams: comp.teams},
                    function (err, result) {
                        if (result == null) {
                            return;
                        }
                        var gradeIndex = result.gradeIndex;
                        var gradeClass = result.gradeClass;
                        var gradeClassType = result.gradeClassType;

                        result.gradeIndex = comp.grades[gradeIndex];
                        result.gradeClass = comp.grades[gradeIndex].name + comp.gradeClasses[gradeClass].name;
                        result.gradeClassType = comp.gradeClassesTypes[gradeClassType].name;
                        comp.teams.push(result);
                    });
            },
            editTeam: function() {
                var comp = this;
                var team = this.teams.find(function(t){
                    return t.selected;
                });

                var toEdit = JSON.parse(JSON.stringify(team));

                Dialog.open("registration/project/project-team-dialog",
                    {items: comp.items, school: comp.school.id, teams: comp.teams, team: toEdit},
                    function (err, result) {
                        if (result == null) {
                            return;
                        }
                        var gradeIndex = result.gradeIndex;
                        var gradeClass = result.gradeClass;
                        var gradeClassType = result.gradeClassType;

                        result.gradeIndex = comp.grades[gradeIndex];
                        result.gradeClass = comp.grades[gradeIndex].name + comp.gradeClasses[gradeClass].name;
                        result.gradeClassType = comp.gradeClassesTypes[gradeClassType].name;
                        var team = comp.teams.find(function(t){
                            return t.id == toEdit.id;
                        });
                        result.part1 = JSON.parse(result.item1);
                        result.part2 = JSON.parse(result.item1);
                        result.part3 = JSON.parse(result.item1);
                        Object.assign(team, result);
                        comp.teams = comp.teams.slice();
                    });
            },
            deleteTeams: function() {

            },
            complete: function () {
            }
        }
    });

    return RegistrationProjectTeamsComponent;
});