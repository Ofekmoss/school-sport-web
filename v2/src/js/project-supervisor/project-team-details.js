define(["templates/project-supervisor", "dialog"], function (templates, Dialog) {
    var Approval = {
        Admin: 1,
        SportAdmin: 2
    };

    function getAges(ages){
        var result = 0;
        if (ages.a10) {
            result = result | 1;
        }
        if (ages.a11) {
            result = result | 2;
        }
        if (ages.a12) {
            result = result | 4;
        }
        if (ages.a13) {
            result = result | 8;
        }if (ages.a14) {
            result = result | 16;
        }
        if (ages.a15) {
            result = result | 32;
        }
        if (ages.a16) {
            result = result | 64;
        }
        if (ages.a17) {
            result = result | 128;
        }
        if (ages.a18) {
            result = result | 256;
        }
        return result;
    }

    function getTimeText(time) {
        var min = time % 60;
        var hour = (time - min) / 60;
        return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
    }

    var ProjectTeamDetailsComponent = Vue.extend({
        template: templates["project-team-details"],
        el: '#validated-form',
        data: function () {
            return {
                team: { coach: {}, activity: [{}, {}], facility: {}, sport: {name: "", team: false, gender: 0}, association: {name: null}},
                project: null,
                days: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"],
                ages: {
                    a10: false,
                    a11: false,
                    a12: false,
                    a13: false,
                    a14: false,
                    a15: false,
                    a16: false,
                    a17: false,
                    a18: false
                }
            };
        },
        mounted: function () {
            var comp = this;
            console.log(comp.team);
        },
        methods: {
            getGender: function (gender) {
                switch (parseInt(gender, 10)) {
                    case 1:
                        return  "ספורטאים";
                    case 2:
                        return "ספורטאיות";
                    case 3:
                        return "מעורב";
                    default:
                        return "";
                }
            },
            getPlayerGender: function(val) {
                return val == 1 ? 'זכר' : 'נקבה';
            },
            getAgesText: function(ages) {
                var base2 = ages.toString(2);
                var agesText = ['10', '11', '12', '13', '14', '15', '16', '17', '18'];
                var result = [];

                for (var i = base2.length - 1; i >= 0; i--) {
                    if (base2[i] == '0') {
                        continue;
                    }

                    result.push(agesText[base2.length - 1 - i]);
                }

                return result.join(', ');
            },
            getActivityText: function (activity) {
                var d = this.days;
                return activity.map(function (a) {
                    if (a.day != null) {
                        return d[a.day] +
                            (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                            (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
                    }
                    return "";
                }).join("; ");
            },
            getCertificationText: function(cert) {
                return cert === 0 ? 'מדריך' : 'מאמן'
            },
            isApprovedByAdmin: function(record) {
                if ((record.approved & Approval.Admin) !== 0) {
                    var approval = record.approvals ? record.approvals["project-team:" + Approval.Admin] : null;
                    if (approval) {
                        var value = new Date(approval.time);
                        return ('0' + value.getDate()).slice(-2) + "/" +
                            ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
                            ('000' + value.getFullYear()).slice(-4) + " " +
                            ('0' + value.getHours()).slice(-2) + ":" +
                            ('0' + value.getMinutes()).slice(-2) +
                            ' ' +
                            approval.firstName +
                            ' ' +
                            approval.lastName;
                    }
                    return "אושר";
                }
                return "";
            },
            isApprovedBySportAdmin: function(record) {
                if ((record.approved & Approval.SportAdmin) !== 0) {
                    var approval = record.approvals ? record.approvals["project-team:" + Approval.SportAdmin] : null;
                    if (approval) {
                        var value = new Date(approval.time);
                        return ('0' + value.getDate()).slice(-2) + "/" +
                            ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
                            ('000' + value.getFullYear()).slice(-4) + " " +
                            ('0' + value.getHours()).slice(-2) + ":" +
                            ('0' + value.getMinutes()).slice(-2) +
                            ' ' +
                            approval.firstName +
                            ' ' +
                            approval.lastName;
                    }
                    return "אושר";
                }
                return "";
            },
            isApproved: function (record) {
                if (record.approvedByAdminAndSupervisor) {
                    return ' כן';
                } else {
                    return 'לא';
                }
            },
            getIdType: function(val) {
                return val == 1 ? 'תעודת זהות': 'דרכון'
            },
            getIsPele: function(val) {
                return val === 1 ? 'כן' : 'לא'
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                comp.$emit("close");
            }
        }
    });

    return ProjectTeamDetailsComponent;
});