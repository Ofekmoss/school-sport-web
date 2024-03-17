define(["templates/default"], function (templates) {
    var loadedDialogs = {};

    var Dialog = {
        name: null,
        current: null,
        instance: null,
        open: function (name, params, callback) {
            var instance = {
                name: name,
                result: null
            };
            if (typeof callback === "function") {
                instance.callback = callback;
                instance.params = params;
            }
            else if (typeof params === "function") {
                instance.callback = params;
                instance.params = null;
            }
            else {
                instance.params = params;
            }

            Dialog.instance = instance;
        },
        close: function () {
            this.instance = null;
        }
    };

    function lookupDialog(name, callback) {
        var dialog = loadedDialogs[name];
        if (dialog) {
            callback(null, dialog);
        }
        else {
            require([name], function (component) {
                loadedDialogs[name] = component;
                callback(null, component);
            });
        }
    }

    var DialogSlot = Vue.extend({
        template: templates.dialog,
        data: function () {
            return Dialog;
        },
        watch: {
            "instance": function (instance, oldInstance) {
                var element = this.$el;

                if (oldInstance && oldInstance.callback) {
                    oldInstance.callback(null, oldInstance.result);
                }

                if (!instance) {
                    element.style.display = "none";
                    var containerElement = element.lastChild;
                    while (containerElement.firstChild) {
                        containerElement.removeChild(containerElement.firstChild);
                    }
                    if (this.current) {
                        this.current.$destroy();
                    }
                    this.current = null;
                }
                else {
                    var params = {};
                    if (instance.params) {
                        for (var key in instance.params) {
                            params[key] = instance.params[key];
                        }
                    }

                    var q = instance.name.indexOf('?');
                    if (q >= 0) {
                        var query = instance.name.slice(q + 1).split('&');
                        for (var qi = 0; qi < query.length; qi++) {
                            var queryItem = query[qi];
                            var e = queryItem.indexOf('=');
                            if (e > 0) {
                                params[decodeURIComponent(queryItem.slice(0, e))] = decodeURIComponent(queryItem.slice(e + 1));
                            }
                            else {
                                params[decodeURIComponent(queryItem)] = true;
                            }
                        }
                        instance.name = instance.name.slice(0, q);
                    }

                    var slot = this;
                    lookupDialog(instance.name, (function (params) {
                        return function (err, dialogComponent) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                            else {
                                element.style.display = "block";
                                var containerElement = element.lastChild;
                                while (containerElement.firstChild) {
                                    containerElement.removeChild(containerElement.firstChild);
                                }
                                var target = document.createElement("div");
                                containerElement.appendChild(target);
                                var component = new dialogComponent({
                                    el: target,
                                    created: function () {
                                        for (var key in params) {
                                            this[key] = params[key];
                                        }
                                    },
                                    mounted: function () {
                                        if (this.$el && this.$el.querySelector) {
                                            var autoFocusElement = this.$el.querySelector("[autofocus]");
                                            if (autoFocusElement) {
                                                autoFocusElement.focus();
                                            }
                                        }
                                    }
                                });

                                component.$on("close", function (result) {
                                    if (slot.instance != null) {
                                        slot.instance.result = result;
                                        slot.instance = null;
                                    }
                                });
                                if (slot.current) {
                                    slot.current.$destroy();
                                }
                                slot.current = component;
                            }
                        };
                    })(params));
                }
            }
        },
        methods: {
            dialogContainerClick: function ($event) {
                if ($event.target === this.$el.lastChild && (this.instance.params && !this.instance.params.disableClickOutside)) {
                    if (this.current) {
                        this.current.cancel();
                    }
                    this.instance = null;
                }
            }
        }
    });

    Vue.component('dialog-slot', DialogSlot);

    return Dialog;
});