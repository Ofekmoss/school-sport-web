define(["templates/finance", "utils", "dialog", "services/access", "consts", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts) {

        function readPayments(comp) {
            var query = parseInt(comp.competitionType) === 1 ? "clubs=1" : "league=1";
            comp.payments.splice(0, comp.payments.length);
            Vue.http.get('/api/v2/finance/team-payments?' + query)
                .then(
                    function (resp) {
                        // console.log(resp.body);
                        for (var i = 0; i < resp.body.length; i++) {
                            var payment = resp.body[i];
                            if (payment.team && payment.details && payment.details.items) {
                                var matchingItem = payment.details.items.find(function(paymentItem) {
                                    return paymentItem.teams && paymentItem.teams.indexOf(payment.team) >= 0;
                                });
                                if (matchingItem != null) {
                                    payment.totalAmount = matchingItem.price || 0;
                                }
                            }
                            payment.amountToPay = payment.totalAmount - (payment.paidAmount || 0);
                            if (isNaN(payment.amountToPay))
                                payment.amountToPay = 0;
                            comp.payments.push(payment);
                        }
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        }

        function updatePayments(payments) {
            return Vue.http.post('/api/v2/finance/payments/payment', payments);
        }


        var TeamPaymentsApprovalComponent = Vue.extend({
            template: templates["team-payments-approval"],
            data: function () {
                return {
                    caption: 'כספים',
                    image: 'img/finance.svg',
                    user: Access.user,
                    competitionType: 1,
                    payments: [],
                    columns: [
                        {
                            key: 'payment',
                            name: 'מספר תעודת חיוב',
                            type: "documentNumber",
                            active: true
                        },
                        {
                            key: 'championshipName',
                            name: 'אליפות',
                            active: true
                        },
                        {
                            key: 'categoryName',
                            name: 'קטגוריית גיל',
                            active: true
                        },
                        {
                            key: 'school.name',
                            name: 'בית ספר',
                            active: true
                        }
                        ,{
                            key: 'school.symbol',
                            name: 'סימול בית ספר',
                            active: false
                        }
                        ,{
                            key: 'school.region',
                            name: 'מחוז',
                            active: false
                        }
                        ,{
                            key: 'payerName',
                            name: 'גורם משלם',
                            active: false
                        },
                        {
                            key: 'details.contacts.name',
                            name: 'אנשי קשר',
                            active: false
                        },
                        {
                            key: 'totalAmount',
                            name: 'סכום',
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
                            name: 'שולם',
                            active: true
                        },
                        {
                            key: 'amountToPay',
                            name: 'נותר לתשלום',
                            active: true
                        },
                        {
                            key: "order",
                            name: 'צפייה בתעודת חיוב',
                            type: 'openFile',
                            active: true
                        },
                        {
                            name: 'עדכון תשלום',
                            key: 'status',
                            type: 'button',
                            active: true,
                            onclick: this.updatePayment,
                            checkDisabled: this.checkDisabled
                        }
                    ],
                    searchText: "",
                    isSelectAll: false,
                    statuses: [{id: 1, name: 'אושר'}, {id: 2, name: 'לא אושר'}, {id: 3, name: 'ממתין לאישור'}],
                    selectedStatus: null,
                    selectedPayments: []
                };
            },
            mounted: function () {
                readPayments(this);
            },
            watch: {
                competitionType: function () {
                    readPayments(this);
                }
            },
            methods: {
                handleSelectionChange: function () {
                    this.selectedPayments.splice(0, this.selectedPayments.length);
                    this.selectedStatus = null;
                    for (var i = 0; i < this.payments.length; i++) {
                        var payment = this.payments[i];
                        if (payment.selected) {
                            if (this.selectedPayments.length === 0) {
                                this.selectedStatus = payment.status;
                            }
                            else if (this.selectedStatus != payment.status) {
                                this.selectedStatus = null;
                            }
                            this.selectedPayments.push(payment);
                        }
                    }
                },
                changeStatus: function(status) {
                    var comp = this;
                    /*Vue.http.post('/api/v2/registration/club/teams/status', {
                        teams: comp.selectedPayments.map(function (t) { return t.id; }),
                        status: status
                    })
                        .then(
                            function () {
                                comp.selectedStatus = status;
                                for (var i = 0; i < comp.selectedPayments.length; i++) {
                                    comp.selectedPayments[i].status = status;
                                }
                            },
                            function (err) {
                                console.log(err);
                            }
                        );*/

                },
                logout: function() {
                    Access.logout();
                },
                checkDisabled: function(row, index) {
                    return row.paidAmount == 0;
                },
                updatePayment: function(row, index){
                    var comp = this;
                    Dialog.open('finance/team-payments-dialog', {
                        payment: row.totalAmount
                    }, function(err, amountToPay) {
                        if (typeof amountToPay !== 'undefined' && amountToPay != null && amountToPay != row.totalAmount) {
                            var payments = [{
                                payment: row.payment,
                                team: row.team,
                                amount: amountToPay
                            }];
                            updatePayments(payments).then(function(res) {
                                row.paidAmount = amountToPay;
                                row.amountToPay = row.totalAmount - amountToPay;
                            });
                        }
                        /*
                        updatePayments([{ payment: row.payment, amount: payment - (row.paidAmount || 0)}]).then(function(res){
                            row.paidAmount = payment;
                            row.amountToPay = row.totalAmount - payment;
                        });
                         */
                    });
                },
                payAll: function() {
                    var comp = this;
                    var payments = this.selectedPayments.map(function(payment){
                        return { payment: payment.payment, team: payment.team}; //amount: payment.totalAmount
                    });
                    updatePayments(payments).then(function(res){
                        //console.log(res);
                        comp.selectedPayments.forEach(function(payment){
                            payment.paidAmount = payment.totalAmount;
                            payment.amountToPay = 0;
                        });
                        comp.payments = comp.payments.slice();
                    });
                }
            }
        });

        return TeamPaymentsApprovalComponent;
    });