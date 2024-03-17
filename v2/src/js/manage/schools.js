define(["templates/manage", "manage/dal", "utils", "manage/filters-schools", "manage/new-school", "manage/data-table2", "components/multiselect"],
    function (templates, dal, utils) {

    var columns = [
        {
            key: 'Name',
            name: 'שם',
            active: true,
            type: 'text',
        },
        {
            key: 'Symbol',
            name: 'סמל',
            active: true,
            type: 'text'
        },
        {
            key: 'Address',
            name: 'כתובת',
            active: true,
            type: 'text'
        },
        {
            key: 'ZipCode',
            name: 'מיקוד',
            active: true,
            type: 'text'
        },
        {
            key: 'Email',
            name: 'אימייל',
            active: true,
            type: 'text'
        },
        {
            key: 'PhoneNumber',
            name: 'טלפון',
            active: true,
            type: 'text'
        },
        {
            key: 'FaxNumber',
            name: 'פקס',
            active: true,
            type: 'text'
        },
        {
            key: 'Principal.Name',
            name: 'מנהל',
            active: true,
            type: 'text'
        },
        {
            key: 'Principal.Email',
            name: 'אימייל מנהל',
            active: true,
            type: 'text'
        },
        {
            key: 'Principal.PhoneNumber',
            name: ' טלפון מנהל',
            active: true,
            type: 'text'
        },
        {
            key: 'Chairman.Name',
            name: 'יו"ר',
            active: true,
            type: 'text'
        },
        {
            key: 'Chairman.Email',
            name: 'אימייל יו"ר',
            active: true,
            type: 'text'
        },
        {
            key: 'Chairman.PhoneNumber',
            name: ' טלפון יו"ר',
            active: true,
            type: 'text'
        },
        {
            key: 'Coordinator.Name',
            name: 'רכז',
            active: true,
            type: 'text'
        },
        {
            key: 'Coordinator.Email',
            name: 'אימייל רכז',
            active: true,
            type: 'text'
        },
        {
            key: 'Coordinator.PhoneNumber',
            name: ' טלפון רכז',
            active: true,
            type: 'text'
        },
        {
            key: 'Representative.Name',
            name: 'נציג מטעם הרשות',
            active: true,
            type: 'text'
        },
        {
            key: 'Representative.Email',
            name: 'אימייל נציג מטעם הרשות',
            active: true,
            type: 'text'
        },
        {
            key: 'Representative.PhoneNumber',
            name: ' טלפון נציג מטעם הרשות',
            active: true,
            type: 'text'
        },
        {
            key: 'Region.Name',
            name: 'מחוז',
            active: true,
            type: 'text'
        },
        {
            key: 'City.Name',
            name: 'עיר',
            active: true,
            type: 'text'
        },
        {
            key: 'Registration.AssociationNumber',
            name: 'עמותה',
            active: true,
            type: 'text'
        }
    ];

    function getEmptySchool() {
        return {
            Coach: {},
            Manager: {},
            Teacher: {}
        }
    }

    var School = Vue.extend({
        template: templates["schools"],
        data: function () {
            return {
                tabName: "בתי ספר",
                caption: "בתי ספר",
                image: 'img/icon-schools.svg',
                records: [],
                columns: columns,
                selectedRecord: null,
                initFilters: {}
            };
        },
        props: {
            region: {},
            city: {}
        },
        mounted: function () {
            this.city = this.city ? parseInt(this.city) : '';
            this.region = this.region ? parseInt(this.region) : '';

            this.initFilters = {
                city: this.city,
                region: this.region,
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
                    this.city = filters.city && filters.city.id != -1 ? filters.city.id : '';
                    this.region = filters.region && filters.region.id != -1 ? filters.region.id : '';
                }

                var comp = this;
                dal.getSchools(filters).then(function(res) {
                    comp.records = res.data;
                });
            },
            onRecordSelect: function(records) {
                this.selectedRecord = utils.mergeDeep({}, records[0]);
            },
            onNewTeamClick: function() {
                this.selectedRecord = getEmptySchool();
            }
        }
    });

    return School;
});