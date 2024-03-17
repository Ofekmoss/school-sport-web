define(["templates/manage", "manage/dal", "dialog"], function (templates, dal, Dialog) {

    var states = {
        edit: 1,
        new: 2,
        view: 3,
    };


    var NewPlayer = Vue.extend({
        template: templates['new-player2'],
        data: function() {
            return  {
                states: states,
                record: {},
                studentBirthDate: new Date(),
                changed: false,
                state: 0,
                adminStatuses: [{
                    Id: 2,
                    Name: 'מאושר',
                }, {
                    Id: 1,
                    Name: 'רשום',
                }, {
                    Id: 3,
                    Name: 'לא מאושר',
                }],
            };
        },
        mounted: function() {
            if (this.state !== this.states.new) {
                this.studentBirthDate = new Date(this.record.Student.BirthDate);
            }
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                this.$emit("close");
            },
            isValid: function() {},
            setBirthDate: function(date) {
                this.record.studentBirthDate = date;
            },
            changeRecord: function() {
                this.changed = true;
            },
            validatePlayer: function(){
                this.isValid = true;
            },
            uploadPicture: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    $('#fiPicture').click();
            },
            uploadIdSlip: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    $('#fiIdSlip').click();
            },
            uploadMedicalApproval: function() {
                if (!(this.state == this.states.notLoaded || this.state == this.states.loading || this.external))
                    $('#fiMedicalApproval').click();
            },
        },
        watch: {
            record : {
                deep: true,
                handler: function(newRecord, oldRecord) {
                    this.validatePlayer();
                    if (oldRecord.Id) {
                        this.changed = true;
                    }
                }
            }
        }
    });

    return NewPlayer;
});