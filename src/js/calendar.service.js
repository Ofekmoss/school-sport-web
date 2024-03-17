(function() {
    'use strict';

    angular
        .module('sport')
        .factory('calendarService', [calendarService]);

    function calendarService() {
        var monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי",
            "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        var monthMapping = {};

        function getItemDate(item) {
            if (item.getDate) {
                return item.getDate();
            }
            if (item.date) {
                return item.date;
            }
            if (item.Date) {
                return item.Date;
            }

            return null;
        }

        function CalendarMonth(year, month) {
            this.year = year;
            this.month = month;
            this.monthName = monthNames[month];
            this.weeks = [];
            this.hasItems = false;
            this.itemsCount = 0;

            var d = new Date(year, month, 1);
            d.setDate(d.getDate() - d.getDay());
            var dayMonth = d.getMonth();
            for (var w = 0; w < 6; w++) {
                var week = {
                    days: [],
                    currentMonth: false
                };

                for (var i = 0; i < 7; i++) {
                    if (dayMonth == month) {
                        week.currentMonth = true;
                    }
                    var day = d.getDate();
                    week.days.push({
                        year: year,
                        month: month,
                        day: day,
                        items: [],
                        currentMonth: dayMonth == month
                    });
                    d.setDate(d.getDate() + 1);
                    dayMonth = d.getMonth();
                }
                this.weeks.push(week);
            }
        }

        Calendar.prototype.BuildDayEvents = function(day, month, year) {
            function BuildEventTitle(dailyEvent)  {
                var name = '', details = '';
                if (dailyEvent.SPORT_ID == sportGlobalSettings.FlowersFieldSeq) {
                    name = 'פרחי ספורט ' + dailyEvent.SportFieldName;
                    details = dailyEvent.FacilityName;
                } else {
                    name = dailyEvent.CHAMPIONSHIP_NAME + ' ' + dailyEvent.CATEGORY_NAME;
                    details = eventsUtils.BuildSportsmanDetails(dailyEvent);
                }
                return [name, details].join(', ');
            }

            var sportFieldMapping = {};
            this.events.filter(function(x) {
                return x.Date.getDate() == day && x.Date.getMonth() == month && x.Date.getFullYear() == year;
            }).forEach(function(curEvent) {
                var key = curEvent.SPORT_ID.toString();
                var existingEvent = sportFieldMapping[key];
                if (existingEvent) {
                    existingEvent.DailyEvents.push(curEvent);
                } else {
                    curEvent.DailyEvents = [curEvent];
                    sportFieldMapping[key] = curEvent;
                }
            });

            var dailyEvents = [];
            var eventsCounter = 0;
            for (var sportField in sportFieldMapping) {
                var curBgColor = contentUtils.getSportFieldColor(parseInt(sportField));
                var curRight = 3 + (eventsCounter * 10);
                var curDailyEvent = sportFieldMapping[sportField];
                curDailyEvent.style = 'right: ' + curRight + 'px; background-color: ' + curBgColor + ';';
                curDailyEvent.title = BuildEventTitle(curDailyEvent);
                dailyEvents.push(curDailyEvent);
                eventsCounter++;
            }

            return dailyEvents;
        };

        CalendarMonth.prototype.getDay = function (day) {
            for (var w = 0; w < this.weeks.length; w++) {
                var week = this.weeks[w];
                for (var d = 0; d < week.days.length; d++) {
                    if (week.days[d].currentMonth && week.days[d].day == day) {
                        return week.days[d];
                    }
                }
            }
        };

        CalendarMonth.prototype.addItem = function (item) {
            var date = getItemDate(item);
            if (!date || date.getFullYear() !== this.year || date.getMonth() !== this.month) {
                return false;
            }

            this.hasItems = true;
            this.itemsCount++;

            var dateDay = date.getDate();
            var day = this.getDay(dateDay);
            if (day) {
                day.items.push(item);
                return day;
            }

            return null;
        };

        function CalendarYear(year) {
            this.year = year;
            this.months = [];
        }

        CalendarYear.prototype.makeMonth = function (month) {
            if (this.months.length == 0) {
                var calendarMonth = new CalendarMonth(this.year, month);
                this.months = [calendarMonth];
                return calendarMonth;
            }

            while (this.months[0].month > month) {
                this.months.splice(0, 0, new CalendarMonth(this.year, this.months[0].month - 1));
            }

            while (this.months[this.months.length - 1].month < month) {
                this.months.push(new CalendarMonth(this.year, this.months[this.months.length - 1].month + 1));
            }

            return this.months[month - this.months[0].month];
        };

        function Calendar(events, selectedDate) {
            this.years = [];
            this.events = events.filter(function(x) { return true; });
            this.selectedDate = selectedDate;
        }

        Calendar.prototype.makeMonth = function (year, month) {
            if (this.years.length == 0) {
                var calendarYear = new CalendarYear(year);
                this.years = [calendarYear];
                return calendarYear.makeMonth(month);
            }

            while (this.years[0].year > year) {
                this.years[0].makeMonth(0);
                var calendarYear = new CalendarYear(this.years[0].year - 1);
                calendarYear.makeMonth(11);
                this.years.splice(0, 0, calendarYear);
            }

            while (this.years[this.years.length - 1].year < year) {
                this.years[this.years.length - 1].makeMonth(11);
                var calendarYear = new CalendarYear(this.years[this.years.length - 1].year + 1);
                calendarYear.makeMonth(0);
                this.years.push(calendarYear);
            }

            var calendarYear = this.years[year - this.years[0].year];
            return calendarYear.makeMonth(month);
        };

        Calendar.prototype.getMonth = function (yearOrIndex, month) {
            if (this.years.length > 0) {
                if (month !== undefined) {
                    if (yearOrIndex >= this.years[0].year &&
                        yearOrIndex <= this.years[this.years.length - 1].year) {
                        var calendarYear = this.years[yearOrIndex - this.years[0].year];
                        if (calendarYear.months.length > 0 &&
                            month >= calendarYear.months[0].month &&
                            month <= calendarYear.months[calendarYear.months.length - 1].month) {
                            return calendarYear.months[month - calendarYear.months[0].month];
                        }
                    }
                }
                else {
                    var index = 0;
                    while (index < this.years.length && yearOrIndex >= 0) {
                        if (yearOrIndex < this.years[index].months) {
                            return this.years[index].months[yearOrIndex];
                        }
                        yearOrIndex -= this.years[index].months;
                        index++;
                    }
                }
            }
            return null;
        };

        Calendar.prototype.addItem = function (item) {
            var date = getItemDate(item);
            if (date) {
                return this.makeMonth(date.getFullYear(), date.getMonth()).addItem(item);
            }
            return null;
        };

        Calendar.prototype.addItems = function (items, callback) {
            for (var i = 0; i < items.length; i++) {
                var day = this.addItem(items[i]);
                if (day) {
                    callback(day, items[i]);
                }
            }
            for (var y = 0; y < this.years.length; y++) {
                var curYear = this.years[y];
                for (var m = 0; m < curYear.months.length; m++) {
                    var curMonth = curYear.months[m];
                    var key = curMonth.month.toString() + '_' + curMonth.year.toString();
                    monthMapping[key] = curMonth;
                    for (var w = 0; w < curMonth.weeks.length; w++) {
                        var curWeek = curMonth.weeks[w];
                        for (var d = 0; d < curWeek.days.length; d++) {
                            var curDay = curWeek.days[d];
                            curDay.events = curDay.currentMonth ? this.BuildDayEvents(curDay.day, curDay.month, curDay.year) : [];
                        }
                    }
                }
            }
        };

        Calendar.prototype.selectMonth = function (calendarMonthOrYear, month) {
            if (month !== undefined) {
                var calendarMonth = this.getMonth(calendarMonthOrYear, month);
                if (calendarMonth) {
                    this.selectMonth(calendarMonth);
                }
            }
            else if (calendarMonthOrYear) {
                if (this.selectedMonth) {
                    this.selectedMonth.selected = false;

                    if (this.selectedDay) {
                        this.selectedDay.selected = false;
                        this.selectedDay = null;
                    }
                }
                this.selectedMonth = calendarMonthOrYear;
                calendarMonthOrYear.selected = true;
            }
            else {
                if (this.selectedDate) {
                    var dateToSelect = this.selectedDate;
                    var year = dateToSelect.getFullYear();
                    var month = dateToSelect.getMonth();
                    var monthForSelection = this.getMonth(year, month);
                    if (!monthForSelection) {
                        monthForSelection = this.getMonth(0);
                    }
                    if (monthForSelection) {
                        this.selectMonth(monthForSelection);
                    }
                }
            }
        };

        Calendar.prototype.selectDay = function (day) {
            if (!this.selectedMonth || this.selectedMonth.year != day.year || this.selectedMonth.month != day.month) {
                this.selectMonth(day.year, day.month);
            }
            if (this.selectedDay) {
                this.selectedDay.selected = false;
            }
            this.selectedDay = day;
            day.selected = true;
        };

        Calendar.prototype.clearDaySelection = function () {
            if (this.selectedDay) {
                this.selectedDay.selected = false;
                this.selectedDay = null;
            }
        };

        Calendar.prototype.nextMonth = function () {
            var monthItem = {'year': 0};
            if (this.selectedMonth) {
                var month = this.selectedMonth.month + 1;
                var year = this.selectedMonth.year;
                if (month >= 12) {
                    month = 0;
                    year++;
                }
                var key = month.toString() + '_' + year.toString();
                if (monthMapping[key])
                    monthItem = monthMapping[key];
            }
            return monthItem;
        };

        Calendar.prototype.selectNextMonth = function () {
            var monthItem = this.nextMonth();
            if (monthItem.year > 0)
                this.selectMonth(monthItem);
        };

        Calendar.prototype.prevMonth = function () {
            var monthItem = {'year': 0};
            if (this.selectedMonth) {
                var month = this.selectedMonth.month - 1;
                var year = this.selectedMonth.year;
                if (month < 0) {
                    month = 11;
                    year--;
                }
                var key = month.toString() + '_' + year.toString();
                if (monthMapping[key])
                    monthItem = monthMapping[key];
            }
            return monthItem;
        };

        Calendar.prototype.selectPrevMonth = function () {
            var monthItem = this.prevMonth();
            if (monthItem.year > 0)
                this.selectMonth(monthItem);
        };

        Calendar.prototype.setCurrent = function (day) {
            if (this.currentMonth) {
                this.currentMonth.currentSelection = false;
            }
            if (this.currentDay) {
                this.currentDay.currentSelection = false;
            }
            this.currentMonth = this.getMonth(day.year, day.month);
            if (this.currentMonth) {
                this.currentMonth.currentSelection = true;
            }
            this.currentDay = day;
            this.currentDay.currentSelection = true;
        };

        function createCalendar(events, selectedDate) {
            return new Calendar(events, selectedDate);
        }

        return {
            create: createCalendar
        };
    }
})();