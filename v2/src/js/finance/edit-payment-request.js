define(["templates/finance", "dialog", "utils", "components/selectex"], function (templates, Dialog, utils) {
    function loadAccounts(comp, region, callback) {
        comp.accounts = [];
        if (region >= 0) {
            var url = '/api/v2/finance/raw-accounts?region=' + region;
            Vue.http.get(url).then(function (resp) {
               resp.body.forEach(function(account, index) {
                   comp.accounts.push({
                       id: account.id,
                       name: account.name,
                       label: account.name
                   });
               });
                window.setTimeout(function() {
                    //comp.creditedAccount = null;
                }, 200);
               if (callback)
                   callback();
            });
        }
    }

    function loadPaymentRequestDetails(comp, callback) {
        comp.paymentRequest.details = [];
        Vue.http.get('/api/v2/finance/payment-request-details/' + comp.paymentRequest.order).then(function (resp) {
            comp.paymentRequest.details = utils.clone(resp.body);
            comp.paymentRequest.details.forEach(function(detail) {
                detail.selected = false;
                var chargeOverride = parseInt(detail.chargeOverride);
                if (!isNaN(chargeOverride) && chargeOverride !== 0) {
                    detail.totalAmount = chargeOverride;
                }
            });
            loadPaymentRequestContacts(comp, function() {
                if (callback) {
                    callback();
                }
            });
        });
    }

    function loadPaymentRequestContacts(comp, callback) {
        comp.contacts = [];
        Vue.http.get('/api/v2/finance/payment-request-contacts/' + comp.paymentRequest.order).then(function (resp) {
            comp.contacts = utils.clone(resp.body);
            if (callback)
                callback();
        });
    }

    var EditPaymentRequestComponent = Vue.extend({
        template: templates['edit-payment-request'],
        data: function() {
            return  {
                paymentRequest: null,
                accounts: [],
                regions: [],
                loading: false,
                paymentRequestAccount: null,
                paymentRequestRegion: null,
                changed: false,
                confirmClosure: false,
                mounting: false,
                paymentRequestInitialAccount: {},
                paymentRequestProgress: {
                    editing: false,
                    edited: false,
                    failed: false
                },
                contacts: [],
                paymentRequestDetailsColumns: [
                    {
                        key: 'teamId',
                        name: 'זיהוי',
                        active: false
                    },
                    {
                        key: 'championshipName',
                        name: 'אליפות',
                        active: true
                    },
                    {
                        key: 'teamNumber',
                        name: 'קבוצה',
                        active: true
                    },
                    {
                        key: 'createdAt',
                        name: 'תאריך יצירה',
                        type: 'date',
                        active: true
                    },
                    {
                        key: 'paidAmount',
                        name: 'סה"כ שולם',
                        active: true
                    },
                    {
                        key: 'totalAmount',
                        name: 'סכום לתשלום',
                        editable: true,
                        type: 'numeric',
                        placeholder: 'סכום',
                        inputWidth: 80,
                        active: true
                    }
                ]
            };
        },
        mounted: function() {
            var comp = this;
            comp.mounting = true;
            comp.paymentRequestRegion = comp.paymentRequest.region.id;
            comp.loading = true;
            loadAccounts(comp, comp.paymentRequest.region.id, function() {
                comp.paymentRequestInitialAccount = {
                    value: comp.paymentRequest.account.id,
                    key: 'id',
                };
                comp.paymentRequestAccount = comp.accounts.find(function(account) {
                    return account.id == comp.paymentRequest.account.id;
                });
                if (comp.paymentRequestAccount != null) {
                    comp.paymentRequestAccount.value = comp.paymentRequestAccount.id;
                }
                loadPaymentRequestDetails(comp, function () {
                    comp.loading = false;
                    comp.$forceUpdate();
                    window.setTimeout(function() {
                        comp.mounting = false;
                    }, 500);
                });
            });
        },
        methods: {
            anyTrue: utils.anyTrue,
            isValidEmail: utils.isValidEmail,
            isContactEmpty: function(contact) {
                var name = contact.name.trim();
                var email = contact.email.trim();
                return name.length === 0 || email.length === 0;
            },
            isContactValid: function(contact) {
                if (this.isContactEmpty(contact))
                    return false;
                return utils.isValidEmail(contact.email, false);
            },
            paymentRequestInvalidReason: function() {
                var comp = this;
                if (comp.paymentRequestAccount == null || comp.paymentRequestAccount.id <= 0) {
                    return 'יש לבחור חשבון/גורם משלם';
                }
                var validContacts = comp.contacts.filter(comp.isContactValid);
                if (validContacts.length === 0)
                    return 'יש להגדיר לפחות נמען תקין אחד';
                return null;
            },
            setAccount: function(value) {
                var comp = this;
                if (!comp.mounting) {
                    comp.changed = true;
                }
            },
            regionChanged: function() {
                var comp = this;
                window.setTimeout(function() {
                    comp.paymentRequestAccount = null;
                }, 500);
                loadAccounts(comp, comp.paymentRequestRegion);
            },
            paymentRequestDetailsChanged: function() {
                var comp = this;
                if (!comp.mounting) {
                    comp.changed = true;
                }
            },
            contactChanged: function(index) {
                var comp = this;
                if (!comp.mounting) {
                    comp.changed = true;
                }
            },
            removeContact: function(index) {
                var contact = this.contacts[index];
                if (this.isContactEmpty(contact)) {
                    this.reallyRemoveContact(index);
                } else {
                    contact.removing = true;
                }
                this.$forceUpdate();
            },
            reallyRemoveContact: function(index) {
                var comp = this;
                var contact = comp.contacts[index];
                var isEmpty = comp.isContactEmpty(contact);
                comp.contacts.splice(index, 1);
                if (!isEmpty) {
                    comp.contactChanged(index);
                }
            },
            abortContactRemoval: function(index) {
                var contact = this.contacts[index];
                contact.removing = false;
                this.$forceUpdate();
            },
            addNewContact: function() {
                var comp = this;
                comp.contacts.push({
                    name: '',
                    phoneNumber: '',
                    email: '',
                    role: ''
                });
            },
            savePaymentRequest: function() {
                var comp = this;
                var paymentRequestData = {
                    id: comp.paymentRequest.order,
                    region:comp.paymentRequestRegion,
                    account: comp.paymentRequestAccount.id,
                    accountName: comp.paymentRequestAccount.name,
                    totalAmount: utils.sumAll(comp.paymentRequest.details, 'totalAmount'),
                    contacts: comp.contacts.filter(comp.isContactValid),
                    teamPayments: comp.paymentRequest.details.map(function(teamPayment) {
                        return {
                            team: teamPayment.teamId,
                            amount: utils.intOrDefault(teamPayment.totalAmount, 0)
                        };
                    })
                };
                comp.paymentRequestProgress.editing = true;
                Vue.http.post('/api/v2/finance/payment-request', paymentRequestData).then(function (resp) {
                    comp.paymentRequestProgress.editing = false;
                    comp.paymentRequestProgress.edited = true;
                    window.setTimeout(function() {
                        comp.confirm(paymentRequestData);
                    }, 3000);
                }, function(err) {
                    comp.paymentRequestProgress.editing = false;
                    comp.paymentRequestProgress.failed = true;
                    console.log(err);
                    window.setTimeout(function() {
                        comp.paymentRequestProgress.failed = false;
                    }, 3000);
                });
            },
            cancel: function () {
                var comp = this;
                if (comp.changed) {
                    comp.confirmClosure = true;
                } else {
                    comp.$emit("close");
                }
            },
            confirm: function (paymentRequestData) {
                var comp = this;
                if (paymentRequestData == null) {
                    paymentRequestData = comp.paymentRequest;
                }
                this.$emit("close", paymentRequestData);
            },
            reallyCancel: function() {
                this.$emit("close");
            },
            abortCancel: function() {
                this.confirmClosure = false;
            }
        },
        computed: {

        },
        watch: {

        }
    });

    return EditPaymentRequestComponent;
});