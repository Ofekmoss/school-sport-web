define(["templates/manage", "manage/dal", "utils", "manage/filters-championships", "manage/new-championship", "manage/data-table2", "components/multiselect"], function (templates, dal, utils) {

    var columns = [
        {
            key: 'Name',
            name: 'שם',
            active: true,
            type: 'text',
        },
        {
            key: 'IsOpen',
            name: 'האם פתוחה',
            active: true,
            type: 'text'
        },
        {
            key: 'Status',
            name: 'סטטוס',
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
            key: 'Sport.Name',
            name: 'כדורסל',
            active: true,
            type: 'text'
        },
        {
            key: 'Categories',
            name: 'קטגוריות',
            active: true,
            type: 'championship-categories'
        },
        {
            key: 'Supervisor.Name',
            name: 'מפקח',
            active: false,
            type: 'text'
        },
        {
            key: 'Supervisor.Email',
            name: 'אימייל מפקח',
            active: false,
            type: 'text'
        },
        {
            key: 'Dates.LastRegistration',
            name: 'סיום הרשמה',
            active: true,
            type: 'text'
        },
        {
            key: 'Dates.Start',
            name: 'התחלה',
            active: false,
            type: 'text'
        },
        {
            key: 'Dates.End',
            name: 'סיום',
            active: false,
            type: 'text'
        },
        {
            key: 'Dates.AltStart',
            name: 'התחלה 2',
            active: false,
            type: 'text'
        },
        {
            key: 'Dates.AltEnd',
            name: 'התחלה 2',
            active: false,
            type: 'text'
        },
        {
            key: 'Dates.Finals',
            name: 'Finals',
            active: false,
            type: 'text'
        },
        {
            key: 'Dates.AltFinals',
            name: 'AltFinals',
            active: false,
            type: 'text'
        },
    ];

    function getEmptyChampionship() {
        return {
            Coach: {},
            Manager: {},
            Teacher: {}
        }
    }

    var championship = Vue.extend({
        template: templates["championships"],
        data: function () {
            return {
                tabName: "אליפויות",
                caption: "אליפויות",
                image: 'img/icon-championships.svg',
                records: [],
                columns: columns,
                selectedRecord: null,
                initFilters: {},
            };
        },
        props: {
            region: {},
            sport: {}
        },
        mounted: function () {
            this.region = this.region ? parseInt(this.region) : '';
            this.sport = this.sport ? parseInt(this.sport) : '';

            this.initFilters = {
                sport: this.sport,
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
                this.loading = true;
                if (filters) {
                    this.updateCaption(filters.description);
                    this.sport = filters.sport ? filters.sport.id : null;
                    this.region = filters.region ? filters.region.id : null;
                }

                var comp = this;
                dal.getChampionships(filters).then(function(res) {
                    comp.records = res;
                });
            },
            onRecordSelect: function(event) {
                this.selectedRecord = utils.mergeDeep({}, event);
            },
            onNewChampionshipClick: function() {
                // this.records = this.records.map(function(r) { r.selected = false; return r });
                this.selectedRecord = getEmptyChampionship();
            }
        }
    });

    return championship;
});