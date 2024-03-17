define(["templates/finance", "utils", "dialog", "services/access", "consts", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts) {
        function readPaymentRequestDetails(comp, callback) {
            if (typeof callback === 'undefined') {
                callback = function () {
                };
            }
            comp.paymentRequestDetails.splice(0, comp.paymentRequestDetails.length);
            Vue.http.get('/api/v2/finance/payment-request-details/' + comp.paymentRequestId).then(function (resp) {
                // console.log(resp.body);
                for (var i = 0; i < resp.body.length; i++) {
                    var paymentRequestDetail = resp.body[i];
                    if (paymentRequestDetail.remainingAmount === 0) {
                        if (paymentRequestDetail.paidAmount > 0) {
                            paymentRequestDetail.green = true;
                        } else {
                            paymentRequestDetail.red = true;
                        }
                    }
                    comp.paymentRequestDetails.push(paymentRequestDetail);
                }
                callback();
            }, function (err) {
                console.log(err);
                callback();
            });
        }

        var PaymentRequestDetailsComponent = Vue.extend({
            template: templates["payment-request-details"],
            props: {
                paymentRequestId: {}
            },
            data: function () {
                return {
                    tabName: "כספים",
                    caption: 'תעודת חיוב',
                    image: 'img/finance.svg',
                    user: Access.user,
                    paymentRequestDetails: [],
                    columns: [
                        {
                            key: 'payerName',
                            name: 'חשבון / גורם משלם',
                            active: true
                        },
                        {
                            key: 'schoolName',
                            name: 'שם בית ספר',
                            active: true
                        },
                        {
                            key: 'championshipType',
                            name: 'סוג חיוב',
                            active: true
                        },
                        {
                            key: 'championshipName',
                            name: 'אליפות',
                            active: true
                        },
                        {
                            key: 'teamNumber',
                            name: 'אינדקס קבוצה',
                            active: true
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
                            key: 'remainingAmount',
                            name: 'נותר לתשלום',
                            active: true
                        }
                    ],
                    searchText: ""
                };
            },
            mounted: function () {
                this.caption = 'פרטים נוספים - ' + utils.parseDocumentNumber(this.paymentRequestId);
                readPaymentRequestDetails(this);
            },
            watch: {

            },
            methods: {
                downloadPaymentRequest: function() {
                    utils.downloadPayment(this.paymentRequestId);
                },
                viewPaymentRequest: function() {
                    window.open(utils.getPaymentUrl(this.paymentRequestId), '_blank');
                },
                sumAll: function(propertyName) {
                    var sum = 0;
                    this.paymentRequestDetails.forEach(function(paymentRequestDetail) {
                        if (!paymentRequestDetail.hidden) {
                            sum += paymentRequestDetail[propertyName];
                        }
                    });
                    return sum;
                },
                logout: function() {
                    Access.logout();
                }
            }
        });

        return PaymentRequestDetailsComponent;
    });