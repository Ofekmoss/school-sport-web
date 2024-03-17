define([],
    function () {
        var EditSelectComponent = Vue.extend({
            template:
                "<div class='edit'>" +
                "   <div v-if='isStatic' class='static' tabindex='0' v-on:keydown='onStaticKeyDown' v-on:click='showDropDown = !showDropDown'>" +
                "       <div v-if='value' v-html='getDisplayValue(value)'></div>" +
                "       <div v-else>" +
                "           <div style='padding: 0px 20px; border-radius: 2px;'>{{placeholder}}&nbsp;</div>" +
                "       </div>" +
                "   </div>" +
                "   <div v-else class='input'>" +
                "       <input type='text' v-bind:value='editValue' " +
                "           v-bind:placeholder='placeholder' " +
                "           v-on:input='onEditValueChange' v-on:keydown='onInputKeyDown'>" +
                "   </div>" +
                "   <div class='buttons'>" +
                "       <span v-if='showDropDown && optionList.length > 0' class='fa fa-caret-up' v-on:click='showDropDown = false'></span>" +
                "       <span v-if='!showDropDown && optionList.length > 0' class='fa fa-caret-down' v-on:click='openDropDown()'></span>" +
                "   </div>" +
                "   <div id='options' v-if='showDropDown' class='edit-drop-down' style='margin-top: -3px; padding: 4px; z-index: 101'>" +
                "       <div v-if='value != null && isClearable' class='option' v-bind:class='{\"text-soft\": selected != null, highlight: selected == null}' v-on:mouseenter='selected = null;' v-on:click='selectOption(null)'>Clear</div>" +
                "       <div class='option' v-bind:class='{highlight: option == selected}' v-on:mouseenter='selected = option;'" +
                "           v-for='option in optionList' v-on:click='selectOption(option)' v-html='getDisplayValue(option)'>" +
                "       </div>" +
                "   </div>" +
                "</div>",
            props: {
                id: {},
                placeholder: {},
                value: {},
                nameField: {
                    type: String,
                    default: "name"
                },
                display: {},
                sort: {
                    type: Boolean,
                    default: true
                },
                static: {
                    type: Boolean,
                    default: false
                },
                clearable: {},
                options: {}
            },
            data: function () {
                return {
                    showDropDown: false,
                    editValue: null,
                    knownValue: null,
                    knownSearch: null,
                    selected: null,
                    error: null,
                    optionList: []
                };
            },
            mounted: function () {
                if (this.options) {
                    this.setOptionList(this.options);
                }

                this.knownValue = this.value;
                if (this.value) {
                    this.editValue = this.knownSearch = this.getDisplayValue(this.value, true);
                }
                this.$emit('search', null, this.optionList, this.id);
            },
            computed: {
                isClearable: function () {
                    return this.clearable === true || this.clearable === "true" || this.clearable === "1";
                },
                isStatic: function () {
                    return this.static === true || this.static === "true" || this.static === "1";
                },
                sorted: function () {
                    return this.sort === true || this.sort === "true" || this.sort === "1";
                }
            },
            methods: {
                setOptionList: function (options) {
                    if (options == null) {
                        this.optionList = [];
                    }
                    else if (typeof options === "object") {
                        this.optionList = [];
                        for (var key in options) {
                            this.optionList.push(options[key]);
                        }
                        if (this.sorted) {
                            this.optionList.sort((function (comp) {
                                return function (a, b) {
                                    return comp.getDisplayValue(a, true).localeCompare(comp.getDisplayValue(b, true));
                                };
                            })(this));
                        }
                    }
                    else {
                        this.optionList = options.slice();
                    }
                },
                getDisplayValue: function (value, onlyText) {
                    if (value) {
                        if (!onlyText && this.display instanceof Function) {
                            return this.display(value, value[this.nameField]);
                        }
                        return value[this.nameField];
                    }
                    return "";
                },
                openDropDown: function () {
                    this.showDropDown = true;
                    this.focusInput();
                },
                focusInput: function () {
                    setTimeout((function (el) {
                        return function () {
                            var input = el.querySelector('input');
                            if (input) {
                                input.focus();
                                input.select();
                            }
                        };
                    })(this.$el), 0);
                },
                selectOption: function (value) {
                    this.setValue(value);
                },
                onStaticKeyDown: function ($event) {
                    if ($event.keyCode === 113 || $event.keyCode === 45) {
                        this.edit();
                    }
                },
                onInputKeyDown: function ($event) {
                    if ($event.keyCode === 27) {
                        this.discard();
                    }
                    else if ($event.keyCode === 13) {
                        if (this.selected) {
                            this.setValue(this.selected);
                        }
                    }
                    else if ($event.keyCode === 38) {
                        if (!this.showDropDown) {
                            this.showDropDown = true;
                        }
                        else if (this.optionList.length > 0) {
                            var index = this.selected == null ? -1 : this.optionList.indexOf(this.selected);
                            if (index > 0) {
                                index--;
                            }
                            else {
                                index = this.optionList.length - 1;
                            }
                            this.selected = this.optionList[index];
                            //var optionsElement = $event.target.parentNode.querySelector("#options");
                            var optionsElement = this.$el.querySelector("#options");
                            if (optionsElement) {
                                var optionElement = optionsElement.childNodes[index];
                                if (optionElement && optionElement.nodeType == 1) {
                                    var parentBounding = optionsElement.getBoundingClientRect();
                                    var childBounding = optionElement.getBoundingClientRect();
                                    if (childBounding.bottom > parentBounding.bottom) {
                                        optionElement.scrollIntoView(false);
                                    }
                                    else if (childBounding.top < parentBounding.top) {
                                        optionElement.scrollIntoView(true);
                                    }
                                }
                            }
                        }
                        $event.preventDefault();
                    }
                    else if ($event.keyCode === 40) {
                        if (!this.showDropDown) {
                            this.showDropDown = true;
                        }
                        else if (this.optionList.length > 0) {
                            var index = this.selected == null ? -1 : this.optionList.indexOf(this.selected);
                            if (index < this.optionList.length - 1) {
                                index++;
                            }
                            else {
                                index = 0;
                            }
                            this.selected = this.optionList[index];
                            //var optionsElement = $event.target.parentNode.querySelector("#options");
                            var optionsElement = this.$el.querySelector("#options");
                            if (optionsElement) {
                                var optionElement = optionsElement.childNodes[index];
                                if (optionElement) {
                                    var parentBounding = optionsElement.getBoundingClientRect();
                                    var childBounding = optionElement.getBoundingClientRect();
                                    if (childBounding.bottom > parentBounding.bottom) {
                                        optionElement.scrollIntoView(false);
                                    }
                                    else if (childBounding.top < parentBounding.top) {
                                        optionElement.scrollIntoView(true);
                                    }
                                }
                            }
                        }
                        $event.preventDefault();
                    }
                },
                setValue: function (value) {
                    if (value !== undefined) {
                        this.knownValue = this.value = value;
                        // Setting known search to prevent searching again
                        this.knownSearch = this.editValue = this.getDisplayValue(this.value, true);
                    }

                    setTimeout((function (comp) {
                        return function () {
                            comp.showDropDown = false;
                        };
                    })(this), 0);
                    this.$emit("update:editing", this.editing);
                    this.$emit("input", value);
                },
                onEditValueChange: function (ev) {
                    this.editValue = ev.target.value;
                    this.showDropDown = true;
                    if (this.knownSearch !== this.editValue) {
                        this.knownSearch = null;
                        this.$emit('search', this.editValue, this.optionList, this.id);
                    }
                }
            },
            watch: {
                id: function () {
                    this.$emit('search', this.editValue, this.optionList, this.id);
                },
                value: function () {
                    this.editValue = this.knownSearch = this.value ? this.getDisplayValue(this.value, true) : '';
                },
                options: function () {
                    if (this.options) {
                        this.setOptionList(this.options);
                    }
                    else {
                        this.optionList = [];
                    }
                }
            }
        });

        Vue.component('edit-select', EditSelectComponent);
    }
);
