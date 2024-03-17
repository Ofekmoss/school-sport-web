define([], function () {
    var hash = null;

    var loadedViews = {};

    function loadView(route, callback) {
        var view = loadedViews[route];
        if (view) {
            if (view === false) {
                callback("Failed to load route " + route);
            }
            else {
                callback(null, view);
            }
        }
        else {
            require([route], function (component) {
                loadedViews[route] = view = {
                    route: route,
                    component: component
                };
                callback(null, view);
            },
                function (err) {
                    loadedViews[route] = false;
                    callback("Failed to load route " + route + '\n' +err);
                    requirejs.undef(route);
                });
        }
    }

    var ViewManager = {
        views: [],
        tabs: [],
        selected: null,
        openView: function (route, params) {
            if (params) {
                var query = Object.keys(params).map(
                    function (key) {
                        var value = params[key];
                        return encodeURIComponent(key) + (value != null ? "=" + encodeURIComponent(value) : "");
                    }).join('&');
                if (query.length > 0) {
                    route += '?' + query;
                }
            }
            var actualRoute = route.toString();
            //don't change hash if trying to login
            if (location.hash && location.hash.indexOf('login?token=') >= 0) {
                Vue.http.get('/api/v2/login').then(function (resp) {
                    var isApprovalUser = false;
                    if (resp.body.roles) {
                        for (var i = 0; i < resp.body.roles.length; i++) {
                            var currentRole = resp.body.roles[i];
                            if (currentRole.indexOf('-approval') > 0) {
                                isApprovalUser = true;
                                break;
                            }
                        }
                    }
                    if (isApprovalUser) {
                        location.hash = "/" + actualRoute;
                    } else {
                        var name = resp.body.name;
                        var msg = 'הנך מחובר למערכת בתור ' +
                            name +
                            ', האם לבצע ניתוק?';
                        if (confirm(msg)) {
                            Vue.http.post('/api/v2/logout').then(function () {
                                console.log('logged out');
                            });
                        } else {
                            location.hash = "/" + actualRoute;
                        }
                    }
                });
            } else {
                location.hash = "/" + actualRoute;
            }
        },
        updateParam: function (view, param, value) {
            var route = location.hash;
            if (route) {
                var s = 0;
                if (route[0] === '#') {
                    s++;
                }
                if (route[s] === '/') {
                    s++;
                }
                if (s > 0) {
                    route = route.slice(s);
                }

                var q = route.indexOf('?');
                var params = {};
                if (q >= 0) {
                    var query = route.slice(q + 1).split('&');
                    for (var qi = 0; qi < query.length; qi++) {
                        var queryItem = query[qi];
                        var e = queryItem.indexOf('=');
                        if (e > 0) {
                            params[decodeURIComponent(queryItem.slice(0, e))] = decodeURIComponent(queryItem.slice(e + 1));
                        } else {
                            params[decodeURIComponent(queryItem)] = true;
                        }
                    }
                    route = route.slice(0, q);
                }

                if (!view.def) {
                    console.log("no def");
                    console.log(view);
                }
                if (route === view.def.route) {
                    if (params[param] !== value) {
                        params[param] = value;
                        view.params[param] = value;
                        if (params) {
                            var query = Object.keys(params).map(
                                function (key) {
                                    var value = params[key];
                                    return encodeURIComponent(key) + (value != null ? "=" + encodeURIComponent(value) : "");
                                }).join('&');
                            if (query.length > 0) {
                                route += '?' + query;
                            }
                        }
                        hash = "#/" + route;
                        location.hash = hash;
                    }
                }
            }
        },
        reset: function () {
            for (var i = 0; i < ViewManager.views.length; i++) {
                var view = ViewManager.views[i];
                if (view.component) {
                    view.component.$destroy();
                    view.component = null;
                }
            }
            ViewManager.views.splice(0, ViewManager.views.length);
            ViewManager.tabs.splice(0, ViewManager.tabs.length);

            loadedViews = {};
        },
        selectView: function (view) {
            this.openView(view.def.route, view.params);
        },
        closeView: function (view) {
            var index = this.views.findIndex(function(curview) {
                return curview.def.route === view.def.route;
            });
            if (index >= 0) {
                this.views.splice(index, 1);
                for (var t = 0; t < this.tabs.length; t++) {
                    var tab = this.tabs[t];
                    var viewIndex = tab.views.indexOf(view);
                    if (viewIndex >= 0) {
                        if (tab.last == view) {
                            tab.last = null;
                        }
                        tab.views.splice(viewIndex, 1);
                        if (tab.views.length === 0) {
                            this.tabs.splice(t, 1);
                        }
                        break;
                    }
                }
                if (view.selected) {
                    if (view.component) {
                        view.component.$destroy();
                        view.component = null;
                    }
                    if (index > 0) {
                        this.selectView(ViewManager.views[index - 1]);
                    } else if (index < ViewManager.views.length) {
                        this.selectView(ViewManager.views[index]);
                    }
                }
            }
        }
    };

    function setSelectedView(view) {
        view.selected = true;
        if (view.component.tabName) {
            var tabName = view.component.tabName;
            for (var n = 0; n < ViewManager.tabs.length; n++) {
                var tab = ViewManager.tabs[n];
                if (tab.name === tabName) {
                    tab.selected = true;
                    tab.last = view;
                } else {
                    tab.selected = false;
                }
            }
        }

        ViewManager.selected = view;
    }

    function openRoute() {
        var route = location.hash;
        if (route) {
            var s = 0;
            if (route[0] === '#') {
                s++;
            }
            if (route[s] === '/') {
                s++;
            }
            if (s > 0) {
                route = route.slice(s);
            }
            var link = route;
            var q = route.indexOf('?');
            var params = {};
            if (q >= 0) {
                var query = route.slice(q + 1).split('&');
                for (var qi = 0; qi < query.length; qi++) {
                    var queryItem = query[qi];
                    var e = queryItem.indexOf('=');
                    if (e > 0) {
                        params[decodeURIComponent(queryItem.slice(0, e))] = decodeURIComponent(queryItem.slice(e + 1));
                    } else {
                        //params[decodeURIComponent(queryItem)] = true;
                    }
                }
                route = route.slice(0, q);
            }

            loadView(route, function (err, def) {
                if (err) {
                    console.log(err);
                }
                else {
                    if (ViewManager.selected && ViewManager.selected.def.route === route &&
                        ViewManager.selected.component && ViewManager.selected.component.updateView instanceof Function) {
                        if (ViewManager.selected.component.updateView(params)) {
                            ViewManager.selected.link = link;
                            return;
                        }
                    }
                    for (var n = 0; n < ViewManager.views.length; n++) {
                        var view = ViewManager.views[n];
                        if (view.def.route === route) {
                            var same = true;
                            for (var key in params) {
                                if (params[key] != view.params[key]) {
                                    same = false;
                                    break;
                                }
                            }
                            if (same) {
                                for (var key in view.params) {
                                    if (params[key] === undefined) {
                                        same = false;
                                        break;
                                    }
                                }
                            }
                            if (same) {
                                if (view.component) {
                                    for (var i = 0; i < ViewManager.views.length; i++) {
                                        var o = ViewManager.views[i];
                                        if (o !== view && o.component) {
                                            o.component.$el.style.display = "none";
                                            o.selected = false;
                                        }
                                    }
                                    view.component.$el.style.display = null;
                                    setSelectedView(view);
                                }
                                // if no component - view was not created yet
                                return;
                            }
                        }
                    }

                    ViewManager.name = route;

                    for (var i = 0; i < ViewManager.views.length; i++) {
                        var o = ViewManager.views[i];
                        if (o.component) {
                            if (!o.component.$el.style) {
                                console.log("no style");
                                console.log(o.component);
                            }
                            else {
                                o.component.$el.style.display = "none";
                            }
                        }
                        o.selected = false;
                    }
                    ViewManager.views.push({
                        component: null,
                        selected: false,
                        link: link,
                        def: def,
                        params: params
                    });
                    /*ViewManager.route = {
                        view: view,
                        params: params
                    };*/
                }
            });
        }
    }

    window.addEventListener("hashchange", function () {
        if (location.hash !== hash) {
            hash = location.hash;
            openRoute();
        }
    });

    var ViewSlot = Vue.extend({
        template: '<div id="target" class="view-slot"></div>',
        props: ['name'],
        data: function () {
            return ViewManager;
        },
        watch: {
            "route": function () {
                var route = ViewManager.route;
                var element = this.$el;
                while (element.firstChild) {
                    element.removeChild(element.firstChild);
                }
                var target = document.createElement("div");
                this.$el.appendChild(target);
                var component = new route.view.component({
                    el: target,
                    created: function () {
                        this.$routePath = route.def.route;
                        for (var key in route.params) {
                            this[key] = route.params[key];
                        }
                    }
                });

                if (this.current) {
                    this.current.$destroy();
                }
                this.current = component;
            },
            views: function () {
                var elements = [];
                var child = this.$el.firstChild;
                while (child) {
                    elements.push(child);
                    child = child.nextSibling;
                }
                var unselectCurrent = false;
                var current = null;
                for (var n = 0; n < this.views.length; n++) {
                    var view = this.views[n];
                    if (!view.component) {
                        var target = document.createElement("div");
                        this.$el.appendChild(target);
                        var config = {
                            el: target,
                            created: (function (view) {
                                return function () {
                                    this.$routePath = view.def.route;
                                    for (var key in view.params) {
                                        this[key] = view.params[key];
                                    }
                                };
                            })(view),
                            watch: {}
                        };

                        for (var key in view.def.component.options.props) {
                            config.watch[key] = (function (view, prop) {
                                return function () {
                                    ViewManager.updateParam(view, prop, this[prop]);
                                };
                            })(view, key);
                        }

                        view.component = new view.def.component(config);

                        if (view.component.tabName) {
                            var tabName = view.component.tabName;
                            var tab = null;
                            for (var ti = 0; !tab && ti < ViewManager.tabs.length; ti++) {
                                var t = ViewManager.tabs[ti];
                                if (t.name === tabName) {
                                    tab = t;
                                }
                            }

                            if (!tab) {
                                tab = {
                                    selected: true,
                                    name: tabName,
                                    last: null,
                                    views: []
                                };
                                ViewManager.tabs.push(tab);
                            }
                            tab.views.push(view);
                        }

                        setSelectedView(view);
                        unselectCurrent = true;
                    }
                    else {
                        var index = elements.indexOf(view.component.$el);
                        if (index >= 0) {
                            elements.splice(index, 1);
                        }
                        if (view.selected) {
                            current = view;
                        }
                    }
                }

                if (unselectCurrent && current) {
                    current.selected = false;
                    current.component.$el.style.display = "none";
                }

                for (var n = 0; n < elements.length; n++) {
                    this.$el.removeChild(elements[n]);
                }
            }
        },
        mounted: function () {
            for (var n = 0; n < ViewManager.views.length; n++) {
                var view = ViewManager.views[n];
                if (view.component) {
                    this.$el.appendChild(view.component.$el);
                }
            }

            openRoute();
        }
    });

    Vue.component('view-slot', ViewSlot);

    return ViewManager;
});