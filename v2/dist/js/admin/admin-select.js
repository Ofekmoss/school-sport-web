define(["templates/admin", "views"],
    function (templates, Views) {

        var AdminSelectComponent = Vue.extend({
            template: templates["admin-select"],
            data: function () {
                return {
                    selection: 0,
                    options: [
                        {
                            name: "כל הקבוצות",
                            link: "admin/teams-approval"
                        },
                        {
                            name: "ליגת תיכונים",
                            link: "admin/league-teams-approval"
                        },
                    ]
                }
            },
            mounted: function () {
                // Views.openView(this.options[0].link);
            },
            methods: {
                loadView: function (event) {
                    Views.openView(this.options[event.target.value].link);                }
            }
        });

        return AdminSelectComponent;
    });