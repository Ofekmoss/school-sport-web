define(["templates/registration", "dialog", "generic/data-table"], function (templates, Dialog) {

    function getSchoolsAndClasses(grades, classes, classTypes) {
        return Vue.http.get('/api/v2/registration/project/1?withTeams=1').then(function (resp) {
            var schools = resp.body.schools;
            var items = [{value: 0, name: resp.data.item1}, {value: 1, name: resp.data.item2}, {value: 2, name: resp.data.item3}, ];
            for (var n = 0; n < schools.length; n++) {
                var school = schools[n];
                if (!school.teams) {
                    school.teams = [];
                }
                for (var p = 0; p < school.teams.length; p++) {
                    var team = school.teams[p];
                    team.part1 = JSON.parse(team.item1);
                    team.part2 = JSON.parse(team.item2);
                    team.part3 = JSON.parse(team.item3);
                    team.part1.sportName = team.part1.sport !==  undefined ? items[team.part1.sport].name : '';
                    team.part2.sportName = team.part2.sport !==  undefined ? items[team.part2.sport].name : '';
                    team.part3.sportName = team.part3.sport !==  undefined ? items[team.part3.sport].name : '';
                    var data = team.ages + '';
                    team.gradeIndex = grades[data[1]];
                    team.gradeClass = grades[data[1]].name + classes[data[2]].name;
                    team.gradeClassType = classTypes[data[3]].name;
                }
            }

            return {schools: schools, items: items};
        });
    }

    function deleteClasses(classes) {
        return Vue.http.post('/api/v2/registration/project/1/teams/', classes);
    }

    var RegistrationProjectZuzuClassesComponent = Vue.extend({
        template: templates["zuzu-classes"],
        data: function () {
            return {
                updating: false,
                selectionCount: 0,
                schools: [],
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
                classColumns: [
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
        computed: {
        },
        mounted: function () {
            var comp = this;
            getSchoolsAndClasses(this.grades, this.gradeClasses, this.gradeClassesTypes).then(function(data) {
                comp.items = data.items;
                comp.schools = data.schools;
            });
        },
        methods: {
            togglePanel: function(school) {
                school.__panelOpen = !school.__panelOpen;
                this.schools = this.schools.slice();
            },
            handleSelectionChange: function(school) {
                school.selectionCount = 0;
                for (var i = 0; i < school.teams.length; i++) {
                    if (school.teams[i].selected) {
                        school.selectionCount++;
                    }
                }
                school.selectAll = school.selectionCount == school.teams.length;
            },
            handleSelectAll: function (school) {
                if (school.selectAll) {
                    for (var i = 0; i < school.teams.length; i++) {
                        school.teams[i].selected = true;
                    }
                    school.selectionCount = school.teams.length;
                }
                else {
                    for (var i = 0; i < school.teams.length; i++) {
                        school.teams[i].selected = false;
                    }
                    school.selectionCount = 0;
                }
            },
            newClass: function(school) {
                var comp = this;
                Dialog.open("registration/project/project-team-dialog", {items: comp.items, school: school.id },
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
                        result.part1 = JSON.parse(result.item1);
                        result.part2 = JSON.parse(result.item2);
                        result.part3 = JSON.parse(result.item3);
                        result.part1.sportName = comp.items[result.part1.sport].name;
                        result.part2.sportName = comp.items[result.part2.sport].name;
                        result.part3.sportName = comp.items[result.part3.sport].name;

                        school.teams.push(result);
                        comp.schools = comp.schools.slice();
                    });
            },
            editClass: function(school) {
                var comp = this;
                var aClass = school.teams.find(function(p) {
                    return p.selected;
                });

                var toEdit = JSON.parse(JSON.stringify(aClass));

                Dialog.open("registration/project/project-team-dialog",
                    {items: comp.items, school: school.id, team: toEdit},
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
                        var team = school.teams.find(function(t){
                            return t.id == toEdit.id;
                        });
                        result.part1 = JSON.parse(result.item1);
                        result.part2 = JSON.parse(result.item2);
                        result.part3 = JSON.parse(result.item3);
                        result.part1.sportName = comp.items[result.part1.sport].name;
                        result.part2.sportName = comp.items[result.part2.sport].name;
                        result.part3.sportName = comp.items[result.part3.sport].name;
                        Object.assign(team, result);
                        comp.schools = comp.schools.slice();
                    });
            },
            deleteClasses: function(school) {
                var comp = this;
                var classes = school.teams.filter(function(t) { return t.selected; }).map(function (x) { return x.id; });
                if (classes.length === 0) {
                    return;
                }
                Dialog.open("general/message-box",
                    {
                        caption: "מחיקת כיתה",
                        message: classes.length === 1 ? "האם להסיר את רישום הכיתה מבית הספר?" : "האם להסיר את רישום הכיתות מבית הספר?",
                        alert: true,
                        confirmText: "כן",
                        cancelText: "לא"
                    }, function (err, result) {
                        if (result === true) {
                            deleteClasses(classes).then(function() {
                                var n = 0;
                                while (n < school.teams.length) {
                                    if (classes.indexOf(school.teams[n].id) >= 0) {
                                        school.teams.splice(n, 1);
                                    }
                                    else {
                                        n++;
                                    }
                                }
                            });
                        }
                    });
            }
        },
        watch: {
        }
    });

    return RegistrationProjectZuzuClassesComponent;
});