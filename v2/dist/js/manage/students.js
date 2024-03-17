define(["templates/manage", "manage/dal", "utils", "manage/filters-students", "manage/new-student", "manage/data-table2", "components/multiselect"], function (templates, dal, utils) {

    var columns = [
        {
            key: 'FirstName',
            name: 'שם פרטי',
            active: true,
            type: 'text',
        },{
            key: 'LastName',
            name: 'שם משפחה',
            active: true,
            type: 'text',
        },{
            key: 'IdNumber',
            name: 'תעודת זהות',
            active: true,
            type: 'text',
        },{
            key: 'BirthDate',
            name: 'תאריך לידה',
            active: true,
            type: 'text',
        },{
            key: 'Gender',
            name: 'מין',
            active: true,
            type: 'text',
        },{
            key: 'Grade',
            name: 'כיתה',
            active: true,
            type: 'text',
        },{
            key: 'School.Name',
            name: 'בית ספר',
            active: true,
            type: 'text',
        },{
            key: 'Region.Name',
            name: 'מחוז',
            active: true,
            type: 'text',
        },
    ];

    function getEmptyStudent() {
        return {
        }
    }

    var students = Vue.extend({
        template: templates["students"],
        data: function () {
            return {
                tabName: "תלמידים",
                caption: "תלמידים",
                image: 'img/icon-students.svg',
                records: [],
                columns: columns,
                selectedRecord: null,
                initFilters: {}
            };
        },
        props: {
            region: {},
            city: {},
            school: {},
            grade: {},
            gender: {}
        },
        mounted: function () {
            this.region = this.region ? parseInt(this.region) : '';
            this.city = this.city ? parseInt(this.city) : '';
            this.school = this.school ? parseInt(this.school) : '';
            this.grade = this.grade ? parseInt(this.grade) : '';
            this.gender = this.gender? parseInt(this.gender) : '';

            this.initFilters = {
                region: this.region,
                city: this.city,
                school: this.school,
                grade: this.grade,
                gender: this.gender
            };
        },
        methods: {
            updateCaption: function (caption) {
                this.caption = caption;
            },
            saveRecord: function() {
                console.log('saving... ', this.selectedRecord);
            },
            refresh: function(filters) {
                if (filters) {
                    this.updateCaption(filters.description);
                    this.region = filters.region && filters.region.id != -1 ? filters.region.id : '';
                    this.city = filters.city && filters.city.id != -1 ? filters.city.id : '';
                    this.school = filters.school && filters.school.id != -1 ? filters.school.id : '';
                    this.grade = filters.grade && filters.grade.id != -1 ? filters.grade.id : '';
                    this.gender = filters.gender && filters.gender.id != -1 ? filters.gender.id : '';
                }

                if (filters && !filters.school) {
                    this.records.splice();
                    return;
                }

                var comp = this;
                dal.getStudents(filters).then(function(res) {
                    comp.records = res.data;
                });
            },
            onRecordSelect: function(records) {
                this.selectedRecord = utils.mergeDeep({}, records[0]);
            },
            onNewTeamClick: function() {
                this.selectedRecord = getEmptyStudent();
            }
        }
    });

    return students;
});