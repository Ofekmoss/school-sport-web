define(["templates/general", "utils"], function (templates, utils) {
    var DateRangeSelectionComponent = Vue.extend({
        template: templates["date-range-selection"],
        data: function () {
            return {
                startDate: null,
                endDate: null,
                allowUnlimited: false,
                maxDaysDiff: 0
            };
        },
        mounted: function () {
            var comp = this;
            if (comp.startDate != null) {
                comp.startDate = utils.formatDate(comp.startDate, 'YYYY-MM-DD');
            }
            if (comp.endDate != null) {
                comp.endDate = utils.formatDate(comp.endDate, 'YYYY-MM-DD');
            }
        },
        methods: {
            getDaysDiff: function() {
                var comp = this;
                if (comp.startDate == null)
                    return null;
                if (comp.endDate == null)
                    return null;
                if (comp.startDate.length === 0)
                    return null;
                if (comp.startDate.length === 0)
                    return null;
                var dtStart = new Date(comp.startDate);
                var dtEnd = new Date(comp.endDate);
                return (dtEnd.getTime() - dtStart.getTime()) / (1000 * 60 * 60 * 24);
            },
            setUnlimited: function() {
                var comp = this;
                var response = {
                   unlimited: true
                };
                this.$emit("close", response);
            },
            maxDiffReached: function() {
                var comp = this;
                if (comp.maxDaysDiff > 0) {
                    var daysDiff = comp.getDaysDiff();
                    if (daysDiff != null && daysDiff > (comp.maxDaysDiff + 1))
                        return true;
                }
                return false;
            },
            confirmDisabled: function() {
                var comp = this;
                var daysDiff = comp.getDaysDiff();
                if (daysDiff == null) {
                    //something is wrong with input
                    return true;
                }
                if (daysDiff < 0) {
                    //end can't be before start
                    return true;
                }
                if (comp.maxDaysDiff > 0 && daysDiff > (comp.maxDaysDiff + 1))
                    return true;
                return false;
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                var response = {
                    start: new Date(comp.startDate),
                    end: new Date(comp.endDate)
                };
                this.$emit("close", response);
            }
        }
    });

    return DateRangeSelectionComponent;
});