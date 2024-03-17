define(["templates/registration", "consts"], function (templates, consts) {

    function getRegionData(region) {
        return consts.coordinators[region];
    }

    var ClubFirstConfirmationDialogComponent = Vue.extend({
        template: templates["club-first-confirmation-dialog"],
        data: function() {
            return  {
                areaName: null,
                phone: null,
                name: null,
                mail: null,
                officePhone: null
            };
        },
        methods: {
            confirm: function () {
                this.$emit("close");
            }
        },
        mounted: function(){
            var comp = this;
            Vue.http.get('/api/v2/login')
                .then(
                    function (resp) {
                        comp.region = resp.data.region;
                        var regionData = getRegionData(comp.region);
                        comp.areaName = regionData.areaName;
                        comp.mail = regionData.mail;
                        comp.phone = regionData.phone;
                        comp.name = regionData.name;
                        comp.officePhone = regionData.officePhone;
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        }
    });

    return ClubFirstConfirmationDialogComponent;
});