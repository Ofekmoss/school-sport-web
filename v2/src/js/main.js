Vue.use(VueResource);

function numberFilter(value) {
    if (value != null) {
        var t = value.toString();
        var result = t.slice(-3);
        t = t.slice(0, -3);
        while (t.length > 0) {
            result = t.slice(-3) + "," + result;
            t = t.slice(0, -3);
        }
        return result;
    }
    return null;
}

Vue.filter("number", numberFilter);

function genderFilter(value) {
    if (value != null) {
        return value === 0 ? 'בן' : 'בת';
    }

    return null;
}

Vue.filter("gender", genderFilter);

function priceFilter(value) {
    if (value != null) {
        var t = value.toString();
        var result = t.slice(-3);
        t = t.slice(0, -3);
        while (t.length > 0) {
            result = t.slice(-3) + "," + result;
            t = t.slice(0, -3);
        }
        return "₪" + result;
    }
    return null;
}

Vue.filter("price", priceFilter);

function documentNumberFilter(value) {
    if (value) {
        var str = value.toString();
        if (str.length > 4) {
            return parseInt(str.slice(4)).toString() + "-" + str.slice(2, 4) + "/" + str.slice(0, 2);
        }
    }
    return value;
}

Vue.filter("documentNumber", documentNumberFilter);

function dateFilter(value) {
    if (value) {
        value = new Date(value);
        if (isNaN(value)) {
            return null;
        }
        return ('0' + value.getDate()).slice(-2) + "/" +
            ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
            ('000' + value.getFullYear()).slice(-4);
    }
    return value;
}

Vue.filter("date", dateFilter);

function competitionTimeFilter(value) {
    if (value) {
        if (typeof value === "number") {
            if (value < 100000000000) {
                // This is a competition time
                if (value < 100000000) {
                    // Competition time in YYYYMMDD format
                    var day = value % 100;
                    value = (value - day) / 100;
                    var month = value % 100;
                    value = (value - month) / 100;
                    return ('0' + day).slice(-2) + "/" +
                        ('0' + month).slice(-2) + "/" +
                        ('000' + value).slice(-4);
                }
                else {
                    // Competition time in epoch format
                    value = new Date(value * 1000);
                    return ('0' + value.getDate()).slice(-2) + "/" +
                        ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
                        ('000' + value.getFullYear()).slice(-4) + " " +
                        ('0' + value.getHours()).slice(-2) + ":" +
                        ('0' + value.getMinutes()).slice(-2);
                }
            }
            else {
                value = new Date(value);
            }
        }
        else if (typeof value === "string") {
            value = new Date(value);
        }

        if (isNaN(value)) {
            return null;
        }
        return ('0' + value.getDate()).slice(-2) + "/" +
            ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
            ('000' + value.getFullYear()).slice(-4);
    }
    return value;
}

Vue.filter("competitionTime", competitionTimeFilter);

function getTimeText(time) {
    var min = time % 60;
    var hour = (time - min) / 60;
    return ("0" + hour).slice(-2) + ":" + ("0" + min).slice(-2);
}

function activityTextPipe(activity) {
    if (!activity) {
        return '';
    }

    return activity.map(function (a) {
        if (a.day != null) {
            return ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"][a.day] +
                (a.startTime != null ? " " + getTimeText(a.startTime) : "") +
                (a.endTime != null ? "-" + getTimeText(a.endTime) : "");
        }
        return "";
    }).join("; ");
}

Vue.filter("activityTextPipe", activityTextPipe);

function dateTimeFilter(value) {
    if (value) {
        value = new Date(value);
        if (isNaN(value)) {
            return null;
        }
        return ('0' + value.getDate()).slice(-2) + "/" +
            ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
            ('000' + value.getFullYear()).slice(-4) + " " +
            ('0' + value.getHours()).slice(-2) + ":" +
            ('0' + value.getMinutes()).slice(-2);
    }
    return value;
}

Vue.filter("dateTime", dateTimeFilter);

function customDateFilter(rawDate, format) {
    // // 2019-09-01T16:07:35.613Z
    if (typeof rawDate === 'string' && rawDate.indexOf('T') > 0) {
        if (typeof format === 'undefined' || format == null || format.length === 0)
            format = 'dd/MM/yyyy HH:mm:ss';
        var baseParts = rawDate.split('T');
        var dateParts = baseParts[0].split('-');
        var timeParts = baseParts[1].split(':');
        if (dateParts.length === 3 && timeParts.length === 3) {
            var year = dateParts[0];
            var month = dateParts[1];
            var day = dateParts[2];
            var hour = timeParts[0];
            var minute = timeParts[1];
            var second = timeParts[2].split('.')[0];
            var result = format + '';
            result = result.replace('dd', day)
                .replace('MM', month)
                .replace('yyyy', year)
                .replace('HH', hour)
                .replace('mm', minute)
                .replace('ss', second);
            return result;
        }
    }
    return dateTimeFilter(rawDate);
}

Vue.filter("customDate", customDateFilter);

function idNumberFilter(value) {
    if (value) {
        return ('00000000' + value).slice(-9);
    }
    return value;
}

Vue.filter("idNumber", idNumberFilter);

require.config({
    baseUrl: "js"
});

var menuItems = [
    {
        link: 'registration/select',
        image: 'img/document-edit.svg',
        imageActive: 'img/document-edit-active.svg',
        name: 'הרשמה',
        user: ['school', 'city']
    },
    {
        link: 'supervisor/teams-approval',
        image: 'img/document-edit.svg',
        imageActive: 'img/document-edit-active.svg',
        name: 'הרשמה',
        user: ['supervisor']
    },
    {
        link: 'finance/team-payments-approval',
        image: 'img/document-edit.svg',
        imageActive: 'img/document-edit-active.svg',
        name: 'אישורים',
        user: ['finance']
    },
    {
        link: 'manage/dashboard',
        image: 'img/dashboard.svg',
        imageActive: 'img/dashboard.svg',
        name: 'לוח בקרה',
        user: ['admin']
    },
    {
        link: 'manage/teams',
        image: 'img/icon-teams.svg',
        imageActive: 'img/icon-teams-active.svg',
        name: 'קבוצות',
        user: ['admin']
    },
    {
        link: 'admin/players',
        image: 'img/icon-players.svg',
        imageActive: 'img/icon-players-active.svg',
        name: 'שחקנים',
        user: ['admin']
    },
    {
        link: 'admin/schools',
        image: 'img/icon-schools.svg',
        imageActive: 'img/icon-schools-active.svg',
        name: 'בתי-ספר',
        user: ['admin']
    },
    {
        link: 'admin/categories',
        image: 'img/icon-championships.svg',
        imageActive: 'img/icon-championships-active.svg',
        name: 'תחרויות',
        user: ['admin']
    },
    {
        link: 'admin/project',
        image: 'img/icon-badge.svg',
        imageActive: 'img/‏‏icon-badge-active.svg',
        name: 'תכניות',
        user: ['admin']
    },
    {
        link: 'admin/transfer-requests',
        image: 'img/user.svg',
        imageActive: 'img/user-active.svg',
        name: 'אישורי העברות',
        user: ['admin']
    },
    {
        link: 'admin/cities',
        name: 'רשויות',
        image: 'img/cities.svg',
        user: ['admin']
    },
    {
        link: 'finance/accounts',
        name: 'כספים - חשבונות',
        image: 'img/finance.svg',
        user: ['admin']
    },
    {
        link: 'finance/receipts',
        name: 'כספים - קבלות',
        image: 'img/finance.svg',
        user: ['admin']
    },
    {
        link: 'finance/charges',
        name: 'כספים - חיובים',
        image: 'img/finance.svg',
        user: ['admin']
    },
    {
        link: 'admin/general-settings',
        name: 'הגדרות כלליות',
        image: 'img/settings.svg',
        user: ['admin']
    }
];

define("chart.js", [], function () { return Chart; });

require(["templates/default", "views", "dialog", "services/access", "imports/vuejs-datepicker", "imports/he", "imports/vue-chartjs"],
    function (templates, ViewManager, Dialog, Access, Datepicker, Hebrew, VueChartJs) {

    Vue.prototype.Hebrew = Hebrew;

    Vue.component('datepicker', Datepicker);
    Vue.component('charts', VueChartJs);

    function updateMenu(comp) {
        comp.menu.splice(0, comp.menu.length);

        menuItems.forEach(function(menuItem) {
            for (var i = 0; i <  menuItem.user.length; i++){
                if (comp.user && comp.user.roles && comp.user.roles.indexOf(menuItem.user[i]) !== -1) {
                    menuItem.selected = false;
                    comp.menu.push(menuItem);
                    break;
                }
            }

        });
        if (comp.menu[comp.activeMenuItem])
            comp.menu[comp.activeMenuItem].selected = true;
    }

    var MainComponent = Vue.extend({
        template: templates.main,
        data: function () {
            return {
                user: null,
                menu: [],
                showMenu: false,
                admin: false,
                loggedIn: null,
                viewManager: ViewManager,
                activeMenuItem: 0
            };
        },
        mounted: function () {
            var comp = this;
            Access.get(function (err, user) {
                if (err) {
                    comp.loggedIn = false;
                    if (ViewManager.name !== "login") {
                        ViewManager.openView("login");
                    }
                }
                else {
                    //console.log(user);
                    var isAdmin = user.roles && user.roles.indexOf('admin') >= 0;
                    comp.showMenu = !isAdmin;
                    comp.admin = isAdmin;
                    comp.user = user;
                    comp.loggedIn = true;
                    updateMenu(comp);
                    var route = location.hash;
                    if (route[0] === '#') {
                        route = route.slice(1);
                    }
                    if (route[0] === '/') {
                        route = route.slice(1);
                    }
                    if (route.length > 0 && route !== "login") {
                        ViewManager.openView(route);
                    }
                    else if (comp.user.defaultRoute && !ViewManager.selected) {
                        //open default tab
                        var viewExists = false;
                        for (var i = 0; i < ViewManager.views.length; i++) {
                            var view = ViewManager.views[i];
                            if (view.def && view.def.route === comp.user.defaultRoute) {
                                viewExists = true;
                                break;
                            }
                        }
                        if (!viewExists) {
                            ViewManager.openView(comp.user.defaultRoute);
                        }
                    }
                }
            });
            Access.$on("login", function (user) {
                var isAdmin = user.roles && user.roles.indexOf('admin') >= 0;
                comp.loggedIn = true;
                comp.showMenu = !isAdmin;
                comp.admin = isAdmin;
                comp.user = user;
                ViewManager.reset();
                updateMenu(comp);
                if (comp.user.defaultRoute) {
                    ViewManager.openView(comp.user.defaultRoute);
                }
            });

            Access.$on("logout", function () {
                comp.loggedIn = false;
                comp.showMenu = false;
                comp.admin = false;
                comp.user = null;
                ViewManager.reset();
                updateMenu(comp);
                ViewManager.openView("login");
            });
        },
        methods: {
            handleLogin: function (user) {
                console.log(user);
            },
            handleAlterViewChange: function (a, b) {
                ViewManager.openView(a.target.value);
            },
            open: function (item, index) {
                this.activeMenuItem = index;
                updateMenu(this);
                ViewManager.openView(item.link);
            },
            logout: function() {
                Access.logout();
            },
            openNewTabDialog: function () {
                var comp = this;
                Dialog.open("manage/new-tab-dialog", {
                        types: comp.menu.map(function (x) {
                            return {title: x.name, image: x.image, type: x.link};
                        })
                    },
                    function (err, result) {
                        if (result === undefined) {
                            return;
                        }

                        ViewManager.openView(result.type);
                    });
            },
            selectView: function (view) {
                ViewManager.selectView(view);
            },
            selectTab: function (tab) {
                if (tab.last) {
                    this.selectView(tab.last);
                }
            },
            closeView: function ($ev, view) {
                $ev.stopPropagation();
                ViewManager.closeView(view);
            }
        }
    });

    Vue.component('main-view', MainComponent);

    new Vue({
        template: '<main-view></main-view>',
        el: '#main'
    });
});


