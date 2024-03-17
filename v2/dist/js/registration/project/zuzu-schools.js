define(["templates/registration", "dialog"], function (templates, Dialog) {

    function getSchools(comp) {
        Vue.http.get('/api/v2/registration/project/1').then(function(result) {
            comp.schools = result.body.schools;
            comp.selectionCount = 0;
            selectAll: false;
        })
    }

    function deleteSchool(teams) {
        return Vue.http.post('/api/v2/registration/project/1/school/delete', teams);
    }

    var RegistrationProjectZuzuSchoolsComponent = Vue.extend({
        template: templates["zuzu-schools"],
        data: function () {
            return {
                schools: [],
                selectionCount: 0,
                selectAll: false
            }
        },
        mounted: function () {
            getSchools(this);
        },
        methods: {
            handleSelectionChange: function() {
                this.selectionCount = 0;
                for (var i = 0; i < this.schools.length; i++) {
                    if (this.schools[i].selected) {
                        this.selectionCount++;
                    }
                }
                this.selectAll = this.selectionCount == this.schools.length;
            },
            handleSelectAll: function () {
                if (this.selectAll) {
                    for (var i = 0; i < this.schools.length; i++) {
                        this.schools[i].selected = true;
                    }
                    this.selectionCount = this.schools.length;
                }
                else {
                    for (var i = 0; i < this.schools.length; i++) {
                        this.schools[i].selected = false;
                    }
                    this.selectionCount = 0;
                }
            },
            isFormValid: function() {
                return true;
            },
            next: function () {
                console.log("next");
            },
            newSchool: function() {
                var comp = this;
                Dialog.open("registration/project/zuzu-school-dialog", { },
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        getSchools(comp);
                    });
            },
            editSchool: function(){
                var comp = this;
                var school = this.schools.find(function(t){return t.selected});
                Dialog.open("registration/project/zuzu-school-dialog", {school: school, state: 3},
                    function (err, result) {
                        if (result == null) {
                            return;
                        }

                        getSchools(comp);
                    });
            },
            deleteSchool: function() {
                var comp = this;
                var schools = comp.schools.filter(function(t) { return t.selected; }).map(function(x) { return x.id; });
                if (schools.length === 0) {
                    return;
                }
                Dialog.open("general/message-box",
                    {
                        caption: "מחיקת בית ספר",
                        message: schools.length === 1 ? "האם להסיר את רישום בית הספר מהתכנית?" : "האם להסיר את רישום בתי הספר מהתכנית?",
                        alert: true,
                        confirmText: "כן",
                        cancelText: "לא"
                    }, function (err, result) {
                        if (result === true) {
                            deleteSchool(schools)
                                .then(function() {
                                    getSchools(comp);
                                })
                                .catch(function(err) {
                                    Dialog.open("general/message-box",
                                        {
                                            caption: "מחיקת בית ספר",
                                            message: "אירעה שגיאה במחיקת קבוצה, יש לוודא שלא משויכות כיתות לבית הספר לפני מחיקתו",
                                            alert: true
                                        });
                                });
                        }
                    });
            },
            next: function () {
                // go to next page
                this.$emit('next')
            }
        },
        watch: {

        }
    });

    return RegistrationProjectZuzuSchoolsComponent;
});