define(["templates/registration", "dialog"], function (templates, Dialog) {

    function getAges(gradeIndex, gradeClass, gradeClassType) {
        var result = '1';
        result += gradeIndex;
        result += gradeClass;
        result += gradeClassType;
        return result;
    }

    function validatePart(part){
        return part.type == 3 || part.certification !== undefined;
    }

    var ProjectTeamDialogComponent = Vue.extend({
        template: templates["project-team-dialog"],
        data: function () {
            return {
                formValidated: false,
                team: null,
                newTeam: false,
                part1: {},
                part2: {},
                part3: {},
                gradeIndex: null,
                gradeClass: null,
                gradeClassType: null,
                studentCount: null,
                certifications: [
                    {value: 1, name: "מאמן"},
                    {value: 2, name: "מדריך"},
                    {value: 3, name: "מורה"}
                ],
                grades: [
                    {value: 5, name: "ה'"},
                    {value: 6, name: "ו'"}
                ],
                gradeClassesTypes: [{value: 0, name: "כיתה רגילה"}, {value: 1, name: "חינוך מיוחד"}, {value: 2, name: "כיתה קטנה"}],
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
                school: '',
                teams: [],
                items: [],
            };
        },
        watch: {
            part1 : {
                handler: function() {
                    this.validateForm();
                },
                deep: true
            },
            part2 : {
                handler: function() {
                    this.validateForm();
                },
                deep: true
            },
            part3 : {
                handler: function() {
                    this.validateForm();
                },
                deep: true
            },
            studentCount: function() {},
            gradeIndex: function() {
                this.validateForm();
            },
            gradeClass: function() {
                this.validateForm();
            },
            gradeClassType: function() {
                this.validateForm();
            },
        },
        mounted: function () {
            var comp = this;
            if (comp.team == null) {
                comp.newTeam = true;
            }
            else {
                this.part1 = this.team.part1;
                this.part2 = this.team.part2;
                this.part3 = this.team.part3;
                var ages = this.team.ages + '';
                this.gradeIndex = ages[1];
                this.gradeClass = ages[2];
                this.gradeClassType = ages[3];
                this.studentCount = this.team.studentCount;
                this.id = this.team.id;

                setTimeout(function() {
                    comp.validateForm()
                });
            }
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                var ages = getAges(this.gradeIndex, this.gradeClass, this.gradeClassType);
                var team = {
                    item1: JSON.stringify(this.part1),
                    item2: JSON.stringify(this.part2),
                    item3: JSON.stringify(this.part3),
                    ages: ages,
                    gradeIndex: this.gradeIndex,
                    gradeClass: this.gradeClass,
                    gradeClassType: this.gradeClassType,
                    studentCount: this.studentCount,
                    school: this.school,
                    id: this.id,
                };

                Vue.http.put('/api/v2/registration/project/1/teams', {team: team})
                    .then(function(resp) {
                        if (comp.newTeam) {
                            team.id = resp.body.id;
                        }
                        comp.$emit("close", team);
                    })
                    .catch( function (err) {
                        Dialog.open('general/error-message', {
                            caption: "פעולה נכשלה",
                            message: typeof err.body === "string" ? err.body : "שגיאה בשמירת כיתה"
                        });
                    });
            },
            validateForm: function () {
                var nodes = document.querySelectorAll('#validated-form :invalid');

                this.formValidated =  (nodes.length == 0) &&
                    (validatePart(this.part1)) &&
                    (validatePart(this.part2)) &&
                    (validatePart(this.part3));
            },
            typeChanged: function(event, part) {
                if (event.target.value == 3) {
                    this['part' + part].certification = undefined;
                    this['part' + part] = Object.assign({}, this['part' + part])
                }
            }
        }
    });

    return ProjectTeamDialogComponent;
});