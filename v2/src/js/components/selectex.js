define(["templates/components"],
    function (templates) {
        var SelectExComponent = Vue.extend({
            template: templates.selectex,
            props: {
                value: {},
                options: {
                    type: Array,
                    default: []
                },
                placeholder: {
                    type: String,
                    default: ""
                },
                label: {
                    type: String,
                    default: "name"
                },
                searchOverride: {
                    type: String,
                    default: ""
                },
                init: {
                    type: Object,
                    default: {
                        value: 0,
                        key: 'Id'
                    }
                }
            },
            data: function () {
                return {
                    open: false,
                    search: "",
                    filteredOptions: this.options
                };
            },
            mounted: function() {
                var comp = this;
                if (comp.searchOverride != null && comp.searchOverride.length > 0) {
                    console.log('looking for ' + comp.searchOverride);
                    window.setTimeout(function() {
                        //comp.search = 'רמת גן';
                    }, 2500);
                }
                if (comp.init.value === 0)
                    comp.init.value = null;
                if (comp.init.value == 0) {
                    return;
                }
            },
            methods: {
                getValueHtml: function (value) {
                    //console.log(this.label);
                    //console.log(value);
                    if (this.label instanceof Function) {
                        return this.label(value);
                    }
                    else if (typeof this.label === "string") {
                        return value[this.label];
                    }
                    return null;
                },
                toggleOpen: function () {
                    var comp = this;
                    comp.open = !comp.open;

                    if (comp.open) {
                        document.onclick = function (ev) {
                            if (!comp.$el.contains(ev.target)) {
                                document.onclick = null;
                                document.onblur = null;
                                comp.open = false;
                            }
                        };
                        document.onblur = function (ev) {
                            document.onclick = null;
                            document.onblur = null;
                            comp.open = false;
                        };
                        setTimeout(function () {

                            var searchInput = comp.$el.querySelector(".search input");
                            if (searchInput) {
                                searchInput.focus();
                            }
                        }, 0);
                    }
                    else {
                        comp.$el.focus();
                    }
                },
                selectOption: function (option) {
                    this.value = option;
                    document.onclick = null;
                    document.onblur = null;
                    this.open = false;
                    this.$el.focus();
                },
                onKeyDown: function ($event) {
                    if ($event.altKey) {
                        if ($event.keyCode == 40) {
                            $event.preventDefault();
                            this.toggleOpen();
                        }
                    }
                    else if ($event.keyCode == 38) {
                        $event.preventDefault();
                        var index = this.value == null ? 0 : this.filteredOptions.indexOf(this.value);
                        if (index > 0) {
                            this.value = this.filteredOptions[index - 1];
                        }
                    }
                    else if ($event.keyCode == 40) {
                        $event.preventDefault();

                        if (this.value == null) {
                            this.value = this.filteredOptions.length > 0 ? this.filteredOptions[0] : null;
                            return;
                        }

                        var index = this.filteredOptions.indexOf(this.value);
                        if (index !=  -1) {
                            this.value = this.filteredOptions[index + 1];
                        }
                    }
                    else if ($event.keyCode == 13) {
                        if (this.open) {
                            $event.preventDefault();
                            document.onclick = null;
                            document.onblur = null;
                            this.open = false;
                            this.$el.focus();
                        }
                    }
                },
                clear: function() {
                    this.value = null;
                }
            },
            watch: {
                searchOverride: function() {
                    var comp = this;
                    comp.search = comp.searchOverride;
                },
                options: function(){
                    this.filteredOptions = this.options;
                    this.init = Object.assign({}, this.init);
                    this.open = false;
                    this.search = '';
                },
                value: function () {
                    this.$emit('input', this.value);
                },
                search: function () {
                    var trimmed = this.search.trim().toLowerCase();
                    if (trimmed === "") {
                        this.filteredOptions = this.options;
                    }
                    else {
                        this.filteredOptions = [];
                        for (var i = 0; i < this.options.length; i++) {
                            var option = this.options[i];
                            var html = this.getValueHtml(option);
                            if (html != null) {
                                var text = "";
                                var tag = false;
                                for (var n = 0; n < html.length; n++) {
                                    var ch = html[n];
                                    if (tag) {
                                        if (ch === '>') {
                                            tag = false;
                                        }
                                    }
                                    else if (ch === '<') {
                                        tag = true;
                                    }
                                    else {
                                        text += ch;
                                    }
                                }
                                if (text && text.toLowerCase().indexOf(trimmed) >= 0) {
                                    this.filteredOptions.push(option);
                                }
                            }
                        }
                    }
                },
                initialize: function(params) {
                    this.value = this.options.find(function(option) {
                        return option[params.key] === params.value;
                    });
                }
            }
        });


        Vue.component('selectex', SelectExComponent);
    }
);