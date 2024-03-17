define([], function () {
    var MultiSelectSearch = Vue.extend({
        template:
        '<div class="multiselect-search">\n' +
        '<input :disabled="disable" ' +
        'style="width: 100%" ' +
        'v-bind:class="{wrong: invalid == true}" ' +
        ':list="placeholder" ' +
        'v-model="selected" ' +
        ':placeholder="placeholder" ' +
        'v-on:input="handleChange()"> ' +
        '<datalist :id="placeholder"> ' +
        '<option v-for="(option, index) in options" :data-value="index"> {{option.name}} </option> ' +
        '</datalist>' +
        '</div>',
        props: {
            placeholder: String,
            options: Array,
            disable: Boolean,
            init: String
        },
        data: function () {
            return {
                selected: '',
                invalid: false
            };
        },
        watch: {
        },
        mounted: function () {
        },
        methods: {
            handleChange: function () {
                this.invalid = false;
                var found = null;
                for (var i = 0; i< this.options.length; i++) {
                    if (found) {
                        break;
                    }

                    if (this.options[i].name == this.selected) {
                        found = i;
                    }
                }

                if (found === null && this.selected != '') {
                    this.invalid = true;
                    return;
                }

                var id = found === null ? '' : this.options[found].id;

                this.$emit("change", id);
            }
        },
        watch: {
            options: function(res) {
                this.options = res;
            },
            init: function() {
                this.selected = this.init;
            }
        }
    });

    Vue.component('multi-select-search', MultiSelectSearch);

});