define([], function () {
    var MultiSelect = Vue.extend({
        template:
            '<div class="multiselect">\n' +
            /*'    <div class="selectBox" v-on:click="showCheckboxes($event)">\n' +
            '        <select>\n' +
            '            <option>{{caption}}</option>\n' +
            '        </select>\n' +
            '        <div id="overSelect" class="overSelect"></div>\n' +
            '    </div>\n' +*/
            '    <div class="btn" v-bind:class="{light: expanded}" v-on:click="showCheckboxes($event)">{{caption}}</div>' +
            '    <div class="checkboxes" v-if="expanded" style="max-height: 400px;\n' +
            '    overflow: auto;">\n' +
            '    <div style="display: flex" v-for="(option, index) in options">\n' +
            '        <input v-if="type != 1" type="checkbox" class="multiselect-input" v-model="option.active" v-on:change="handleChange"/>\n' +
            '        <input v-if="type == 1" type="checkbox" class="multiselect-input" v-model="option.activeField" v-on:change="handleChange"/>\n' +
            '        <label v-bind:class="{ red: type == 1 }" style="padding-right: 2px; padding-bottom: 2px;">{{option.name}}</label>\n' +
            '    </div>\n' +
            '</div>',
        props: {
            caption: String,
            type: Number,
            options: Array
        },
        data: function () {
            return {
                expanded: false
            };
        },
        watch: {},
        mounted: function () {
        },
        methods: {
            handleChange: function () {
                this.$emit("change");
            },
            showCheckboxes: function (e) {
                e.stopPropagation();
                var comp = this;
                if (!this.expanded) {
                    this.expanded = true;
                    document.onclick = function (e) {
                        if (!comp.$el.contains(e.target)) {
                            comp.expanded = false;
                            document.onclick = null;
                        }
                    }
                } else {
                    document.onclick = null;
                    this.expanded = false;
                }
            }
        }
    });

    Vue.component('multi-select', MultiSelect);

});