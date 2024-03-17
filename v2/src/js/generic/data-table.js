define(["templates/generic", "utils", "dialog", "services/access", "components/multiselect"], function (templates, utils, Dialog, Access) {

    function makeFunctionFilter(filter) {
        if (filter instanceof Function) {
            return filter;
        } else if (typeof filter === "object") {
            return function (record) {
                for (var key in filter) {
                    var value = getFieldValue(record, key);
                    if (value != filter[key]) {
                        return false;
                    }
                }
                return true;
            };
        }
        else {
            return function () {
                return true;
            };
        }
    }

    function makeSearchFilter(comp) {
        if (comp.searchText && comp.searchText.length > 0) {
            return function (record) {
                for (var i = 0; i < comp.columns.length; i++) {
                    var value = getValue(record, comp.columns[i]);
                    if (value != null) {
                        if (typeof value !== 'string') {
                            value = value.toString();
                        }
                        if (value.indexOf(comp.searchText) >= 0) {
                            return true;
                        }
                    }
                }
                return false;
            };
        }
        return function () {
            return true;
        }
    }

    function updateFilter(comp) {
        var searchFilter = makeSearchFilter(comp);
        var callFilter = makeFunctionFilter(comp.filter);
        for (var i = 0; i < comp.records.length; i++) {
            var record = comp.records[i];
            record.__show = callFilter(record) && searchFilter(record);
        }
    }

    function updateRecords(comp) {
        if (!comp.changingSelection) {
            comp.records = []; //.splice(0, comp.records.length);
        }
        var filter = comp.searchText && comp.searchText.length > 0;
        if (comp.data) {
            if (comp.data.constructor === Array) {
                if (comp.data.length > 20) {
                    if (!comp.changingSelection) {
                        //console.trace();
                        comp.loading = true;
                        window.setTimeout(function() {
                            comp.loading = false;
                        }, 500);
                    }
                }
                if (!comp.changingSelection) {
                    for (var i = 0; i < comp.data.length; i++) {
                        var record = comp.data[i];
                        record.__show = false;
                        record.selected = false;
                        comp.records.push(record);
                    }
                }

                updateFilter(comp);
            }
        }
        comp.changingSelection = false;
    }

    function updateColumns(comp) {
        if (comp.columns) {
            comp.totalWidth = 0;
            for (var i = 0; i < comp.columns.length; i++) {
                var column = comp.columns[i];
                if (column.width == null) {
                    column.width = 10;
                }
                if (column.active && !column.disabled) {
                    comp.totalWidth += column.width;
                }
            }
            if (comp.totalWidth === 0) {
                comp.totalWidth = 10;
            }
        }
    }

    function getFieldValue(record, field) {
        if (typeof field === "string") {
            field = field.split('.');
        }
        var value = record;
        for (var i = 0; i < field.length; i++) {
            if (value == null) {
                break;
            }

            var fieldKey = field[i];
            if (value.constructor === Array) {
                value = value.map(function (x) { return x[fieldKey]; });
            }
            else {
                value = value[fieldKey];
            }
        }
        return value;
    }

    function getValue(record, column) {
        if (column.getter instanceof Function) {
            return column.getter(record);
        }
        if (typeof column.key === "string") {
            column.key = column.key.split('.');
        }
        var value = record;
        for (var i = 0; i < column.key.length; i++) {
            if (value == null) {
                break;
            }

            var columnKey = column.key[i];
            if (value.constructor === Array) {
                value = value.map(function (x) { return x[columnKey]; });
            }
            else {
                value = value[columnKey];
            }
        }

        if (value != null && value.constructor === Array) {
            if (column.lookup) {
                value = value.map(function (x) {
                    return column.lookup[x];
                });
            }

            return value.map(function (x) { return x == null ? "" : x.toString(); }).join(", ");
        }
        else {
            if (column.lookup) {
                value = column.lookup[value];
            } else if ( column.type == 'teamApproved') {
                if (column.extras) {
                    var approvedBitValue = column.extras.approved;
                    var disApprovedBitValue = column.extras.notApproved;
                    if( approvedBitValue && (record[column.key] & approvedBitValue) !== 0) {
                        value = "מאושר";
                    } else if (disApprovedBitValue && (record[column.key] & disApprovedBitValue) !== 0) {
                        value = "לא מאושר";
                    } else {
                        value = "ממתין לאישור";
                    }
                }
            }
            if (column.type === 'NIS' && value != null)
                value += ' ₪';
            return value;
        }


    }

    function getPasswordData(record, column) {
        return record.visiblePasswords ? record.visiblePasswords[column.name] : null;
    }

    var DataTableComponent = Vue.extend({
        template: templates["data-table"],
        props: [
            'columns', 'data', 'filter', 'enableExport', 'selection', 'title', 'clickToTick',
            'showMoreInfo', 'disableSelection', 'disableAbsolutePosition', 'hideToolbar',
            'disableSort', 'slimTable', 'newEntityCaption'
        ],
        data: function () {
            return {
                records: [],
                totalWidth: 10,
                searchText: "",
                selectionType: 2,
                isSelectAll: false,
                loading: false,
                changingSelection: false
            };
        },
        mounted: function () {
            var comp = this;
            window.setTimeout(function () {
                if (comp.records.length > 20) {
                    comp.loading = true;
                    window.setTimeout(function () {
                        comp.loading = false;
                    }, 1500);
                }
            }, 500);

            if (this.selection === "single") {
                this.selectionType = 1;
            }
            else if (this.selection === "none") {
                this.selectionType = 0;
            }
            updateColumns(this);
            updateRecords(this);
            this.dataTableScroll = this.$el.querySelector(".data-table-scroll");
            this.dataTableFloatingHeader = this.$el.querySelector("#data-table-floating-header");
            if (this.dataTableScroll && this.dataTableFloatingHeader) {
                this.dataTableScroll.addEventListener('scroll', this.handleScroll);
            }
        },
        methods: {
            rowClicked: function(record) {
                var comp = this;
                if (comp.clickToTick) {
                    record.selected = !record.selected;
                    comp.$forceUpdate();
                    comp.handleSelectionChange(record);
                }
            },
            moreInfo: function(e, record) {
                e.stopPropagation();
                this.$emit("record-more-info", record);
            },
            update: function () {
                updateRecords(this);
            },
            isPasswordVisible: function(record, column) {
                var data = getPasswordData(record, column);
                if (data == null)
                    return false;
                return data.active;
            },
            getPasswordExpireTime: function(record, column) {
                var data = getPasswordData(record, column);
                return data ? data.expires : 0;
            },
            getPassword: function(record, column) {
                var data = getPasswordData(record, column);
                return data ? data.password : '';
            },
            showPassword: function(record, column) {
                var comp = this;
                if (!record.visiblePasswords)
                    record.visiblePasswords = {};
                record.visiblePasswords[column.name] = {
                    active: true,
                    password: getValue(record, column),
                    expires: 10,
                    interval: null
                };
                comp.$forceUpdate();
                record.visiblePasswords[column.name].interval = window.setInterval(function() {
                    if (record.visiblePasswords[column.name].expires <= 0) {
                        record.visiblePasswords[column.name].active = false;
                        window.clearInterval(record.visiblePasswords[column.name].interval);
                    } else {
                        record.visiblePasswords[column.name].expires--;
                    }
                    comp.$forceUpdate();
                }, 1000);
            },
            handleSelectionChange: function(record) {
                this.changingSelection = true;
                if (this.selectionType) {
                    if (this.selectionType === 1) {
                        for (var i = 0; i < this.records.length; i++) {
                            var r = this.records[i];
                            if (r.selected && r !== record) {
                                r.selected = false;
                            }
                        }
                        this.$emit('selection-change', record.selected ? record : null);
                    }
                    else {
                        this.$emit('selection-change');
                    }
                }
            },
            sort: function (col) {
                this.columns.forEach(function(c) {
                    if (c != col) {
                        c.sort = null;
                    }
                });

                if (col.sort == 'a') {
                    col.sort = 'd';
                    this.records.sort(function (item1, item2) {
                        if (typeof col.getSortValue === 'function') {
                            return col.getSortValue(item1) < col.getSortValue(item2) ? 1 : -1;
                        } else {
                            return getValue(item1, col) < getValue(item2, col) ? 1 : -1;
                        }
                    });
                }
                else {
                    col.sort = 'a';
                    this.records.sort(function (item1, item2) {
                        if (typeof col.getSortValue === 'function') {
                            return col.getSortValue(item1) < col.getSortValue(item2) ? -1 : 1;
                        } else {
                            return getValue(item1, col) < getValue(item2, col) ? -1 : 1
                        }
                    });
                }
            },
            toggleColumn: function(index) {
                this.columns[index].active = !this.columns[index].active;
                console.log("toggle");
                updateColumns(this);
            },
            handleColumnChange: function () {
                updateColumns(this);
            },
            selectAll: function() {
                if (this.selectionType === 2) {
                    var comp = this;
                    comp.records.forEach(function (record) {
                        record.selected = comp.isSelectAll;
                    });
                    comp.records = this.records.slice();
                    this.handleSelectionChange();
                }
            },
            getValue: function (record, column) {
                return getValue(record, column);
            },
            exportExcel: function() {
                var reportName = (this.title || 'report') + ' - ' + (new Date()).getTime() + '.xls';
                $(".tooltip").each(function() {
                    var oTooltip = $(this);
                    var html = oTooltip.html();
                    oTooltip.data("html", html);
                    oTooltip.html("");
                    oTooltip.next().css("color", "red");
                });
                utils.excelReport(reportName, null, ".headerTable:visible");
                window.setTimeout(function() {
                    $(".tooltip").each(function() {
                        var oTooltip = $(this);
                        var html = oTooltip.data("html");
                        oTooltip.html(html);
                        oTooltip.next().css("color", "inherit");
                    });
                }, 1500);
            },
            downloadDocument: function(record, column) {
                if (column.key && column.key.length > 0) {
                    var key = column.key[0];
                    if (key === 'order' || key === 'payment') {
                        var orderId = getValue(record, column);
                        utils.downloadPayment(orderId);
                    }
                }
            },
            viewDocument: function(record, column) {
                if (column.key && column.key.length > 0) {
                    var key = (typeof column.key === 'string') ? column.key : column.key[0];
                    if (key === 'order' || key === 'payment') {
                        var orderId = getValue(record, column);
                        window.open(utils.getPaymentUrl(orderId), '_blank');
                    }
                }
            },
            handleScroll: function ($event) {
                if (this.dataTableScroll.scrollTop > 0) {
                    if (this.dataTableFloatingHeader.style.display != "block") {
                        this.dataTableFloatingHeader.style.left = this.dataTableScroll.firstChild.offsetLeft + "px";
                        this.dataTableFloatingHeader.style.display = "block";
                    }
                }
                else if (this.dataTableFloatingHeader.style.display != "none") {
                    this.dataTableFloatingHeader.style.display = "none";
                }
            },
            newEntityClicked: function() {
                this.$emit('new-entity');
            },
            digitalSignatureClicked: function(school) {
                console.log(school);
                var comp = this;
                var msg = 'האם לשלוח אסמכתא לסבב חתימה דיגיטלית עבור בית הספר ' + school.name + '?';
                if (school.digitalSignatureStatus) {
                    if (school.digitalSignatureStatus === 'pending') {
                        msg = 'המסמך נשלח לסבב חתימה דיגיטלי בתאריך ' +
                            utils.formatDate(school.digitalSignatureDetails.DateCreated, 'DD/MM/YYYY') +
                            ' בשעה ' + utils.formatDate(school.digitalSignatureDetails.DateCreated, 'HH:mm') + ', ' +
                            'האם לשלוח לסבב חדש?';
                    } else if (school.digitalSignatureStatus === 'completed') {
                        msg = 'סבב החתימות על המסמך הושלם בתאריך ' +
                            utils.formatDate(school.digitalSignatureDetails.DateLastSigned, 'DD/MM/YYYY') +
                            ' בשעה ' + utils.formatDate(school.digitalSignatureDetails.DateLastSigned, 'HH:mm') + ', ' +
                            'ניתן להוריד את המסמך החתום על ידי לחיצה על אייקון ההורדה משמאל. ' +
                            'האם לשלוח לסבב חדש?';
                    }
                }
                Dialog.open('general/message-box', {
                    caption: 'חתימה דיגיטלית',
                    message: msg,
                    alert: true,
                    confirmText: "אישור",
                    cancelText: "ביטול"
                }, function(err, confirmed) {
                    if (confirmed) {
                        var url = school.schoolSummaryLink + '?sign=1';
                        school.sendStatus = 'pending';
                        comp.$forceUpdate();
                        Vue.http.get(url).then(function (resp) {
                            console.log('success');
                            school.sendStatus = 'מסמך נשלח לחתימה';
                            comp.$forceUpdate();
                            setTimeout(function() {
                                school.sendStatus = null;
                                comp.$forceUpdate();
                            }, 5000);
                        }, function (err) {
                            console.log('error');
                            console.log(err);
                            school.sendStatus = 'ERROR: ' + (err.bodyText || err.message || err);
                            comp.$forceUpdate();
                            setTimeout(function() {
                                school.sendStatus = null;
                                comp.$forceUpdate();
                            }, 5000);
                        });
                    }
                });
            },
            downloadDigitalSignature: function(school) {
                console.log('downloading');
            },
            loginClicked: function(school) {
                var userId = school.user;
                if (utils.intOrDefault(userId) == null) {
                    console.log('school ' + school.id + ' has no user');
                    return;
                }
                var msg = 'האם להתחבר בתור בית ספר ' + school.name + '?';
                Dialog.open('general/message-box', {
                    caption: 'התחברות בתור בית ספר',
                    message: msg,
                    alert: true,
                    confirmText: "אישור",
                    cancelText: "ביטול"
                }, function(err, confirmed) {
                    if (confirmed) {
                        var url = '/api/v2/login';
                        var params = {
                            userid: userId,
                            delegatedUser: {
                                id: Access.user.id,
                                name: Access.user.name.split(' ')[0]
                            }
                        };
                        Vue.http.post(url, params).then(function (resp) {
                            Access.user = resp.data;
                            Access.$emit("login", Access.user);
                            //document.location.reload();
                        }, function (err) {
                            console.log('error');
                            console.log(err);
                        });
                    }
                });
            }
        },
        destroyed: function() {
            if (this.dataTableScroll && this.dataTableFloatingHeader) {
                this.dataTableScroll.removeEventListener('scroll', this.handleScroll);
            }
        },
        watch: {
            data: function () {
                updateRecords(this);
            },
            filter: function () {
                updateFilter(this);
            },
            searchText: function () {
                updateFilter(this);
                var comp = this;
                comp.records.forEach(function(record){
                    for (var i = 0; i < comp.columns.length; i++) {
                        var value = getValue(record, comp.columns[i]);
                        if (value == null) {
                            record.__show = false;
                            continue;
                        }
                        if (typeof value !== 'string') {
                            value = value.toString();
                        }

                        if (value.indexOf(comp.searchText) >= 0) {
                            record.__show = true;
                            break;
                        } else {
                            record.__show = false;
                        }
                    }
                });
                this.$emit('search-change');
            },
            records: {
                deep: true,
                handler: function() {
                    this.$emit('records-change');
                }
            }
        }
    });

    Vue.component('data-table', DataTableComponent);
    return DataTableComponent;
});