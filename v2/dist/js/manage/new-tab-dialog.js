define(["templates/manage"], function (templates) {
    var NewTabDialogComponent = Vue.extend({
        template: templates["new-tab-dialog"],
        data: function () {
            return {
                types: [
                    // {
                    //     title: 'לוח בקרה',
                    //     image: 'img/dashboard.svg',
                    //     type: 'dashboard'
                    // },
                    {
                        title: 'קבוצות',
                        image: 'img/icon-teams.svg',
                        type: 'manage/teams'
                    },
                    // {
                    //     title: 'שחקנים',
                    //     image: 'img/icon-players.svg',
                    //     type: 'players'
                    // }, {
                    //     title: 'בתי ספר',
                    //     image: 'img/icon-schools.svg',
                    //     type: 'schools'
                    // }, {
                    //     title: 'אליפויות',
                    //     image: 'img/icon-championships.svg',
                    //     type: 'championships'
                    // }, {
                    //     title: 'תכניות',
                    //     image: 'img/icon-badge.svg',
                    //     type: 'projects'
                    // }
                ]
            };
        },
        mounted: function () {
        },
        methods: {
            cancel: function () {
                this.$emit("close");
            },
            select: function(type) {
                this.$emit("close", type);
            }
        }
    });

    return NewTabDialogComponent;
});