define(["templates/finance", "dialog", "utils", "components/selectex"], function (templates, Dialog, utils) {
    function loadAccounts(comp, region, callback) {
        comp.accounts = [];
        //{
        //    id: -1,
        //    label: 'חשבון...'
        //}];
        if (region >= 0) {
            var url = '/api/v2/finance/raw-accounts?region=' + region;
            //comp.accounts[0].label = 'מערכת טוענת נתונים, נא להמתין...';
            Vue.http.get(url).then(function (resp) {
               resp.body.forEach(function(account, index) {
                   comp.accounts.push({
                       id: account.id,
                       name: account.name,
                       label: account.name
                   });
               });
               //comp.accounts[0].label = 'חשבון...';
                window.setTimeout(function() {
                    comp.creditedAccount = null;
                }, 200);
               if (callback)
                   callback();
            });
        }
    }

    function loadPaymentRequestDetails(comp, index) {
        if (index >= comp.paymentRequests.length) {
            //remove payment requests without details
            var noDetails = comp.paymentRequests.filter(function(paymentRequest) {
                return paymentRequest.details.length === 0;
            });
            if (noDetails.length > 0) {
                var single = noDetails.length === 1;
                var msg = single ? 'תעודת חיוב' : 'תעודות חיוב';
                msg += ' ' + noDetails.map(function(p) { return p.parsedOrder; }).join(', ') + ' ';
                msg += 'כבר ' + (single ? 'שולמה' : 'שולמו') + ' ';
                msg += single ? 'במלואה' : 'במלואן';
                comp.fullyPaidPaymentRequests = msg;
                comp.paymentRequests = comp.paymentRequests.filter(function(paymentRequest) {
                    return paymentRequest.details.length > 0;
                });
            }
            return;
        }
        var paymentRequest = comp.paymentRequests[index];
        Vue.http.get('/api/v2/finance/payment-request-details/' + paymentRequest.order).then(function (resp) {
            paymentRequest.details = utils.clone(resp.body);
            //remove those already fully paid
            paymentRequest.details = paymentRequest.details.filter(function(detail) {
                return detail.remainingAmount > 0;
            });
            if (paymentRequest.details.length === 0 && paymentRequest.remainingAmount > 0) {
                paymentRequest.details.push({
                    championshipName: '',
                    championshipType: '',
                    chargeOverride: 0,
                    createdAt: null,
                    currentlyPaid: null,
                    green: false,
                    order: paymentRequest.order,
                    paidAmount: 0,
                    payerName: '',
                    remainingAmount: paymentRequest.remainingAmount,
                    schoolName: '',
                    selected: false,
                    teamId: -1,
                    teamNumber: '',
                    totalAmount: paymentRequest.remainingAmount
                });
            }
            paymentRequest.details.forEach(function(detail) {
                detail.selected = false;
                detail.currentlyPaid = null;
            });
            console.log(paymentRequest.details);
            loadPaymentRequestDetails(comp, index + 1);
        });
    }

    function readRegions(comp, callback) {
        if (typeof callback === 'undefined') {
            callback = function () {
            };
        }
        comp.regions = [{
            id: -1,
            name: 'מחוז...'
        }];
        Vue.http.get('/api/v2/manage/regions').then(function (resp) {
            // console.log(resp.body);
            resp.body.forEach(function (region) {
                comp.regions.push({
                    id: region.Id,
                    name: region.Name
                });
            });
            callback();
        }, function (err) {
            console.log(err);
            callback();
        });
    }

    function getBank(payment) {
        if (payment.type == '0' || payment.type == '1') {
            var bankId = parseInt(payment.bank, 10);
            if (!isNaN(bankId) && bankId >= 0) {
                var branch = parseInt(payment.bankBranch, 10);
                if (isNaN(branch) || branch <= 0)
                    branch = null;
                return {
                    id: bankId,
                    branch: branch,
                    account: payment.bankAccount || '',
                    reference: payment.bankReference || ''
                };
            }
        }
        return null;
    }

    function getCreditCard(comp, payment) {
        if (payment.type == '3') {
            var creditCardType = utils.intOrDefault(payment.creditCardType);
            if (creditCardType != null) {
                var lastDigits = utils.intOrDefault(payment.fourLastDigits);
                var expireDate = utils.findTag(payment.creditCardExpireDate, comp.creditCardExpireDates);
                var installments = utils.intOrDefault(payment.installments);
                return {
                    type: creditCardType,
                    lastFourDigits: lastDigits,
                    expireDate: expireDate,
                    installments: installments
                };
            }
        }
        return null;
    }

    function getDefaultCreditedAccount(comp) {
        var defaultCreditedAccount = null;
        if (comp.creditedAccountsEditMode) {
            defaultCreditedAccount = {
                id: comp.creditedAccount && comp.creditedAccount.id > 0 ? comp.creditedAccount.id : -1,
                sum: comp.creditedAccountSum
            };
        } else {
            defaultCreditedAccount = {
                id: comp.account.id,
                sum: comp.sumAllPayments()
            }
        }
        return defaultCreditedAccount;
    }

    var NewReceiptComponent = Vue.extend({
        template: templates['new-receipt'],
        data: function() {
            return  {
                expandableObjects: {
                    payments: true,
                    creditedAccounts: false,
                    paymentRequests: true
                },
                creditedAccountsExpanded: false,
                creditedAccountsEditMode: false,
                receipt: {
                    payments: [],
                    remark: '',
                    newPayment: {
                        expanded: true,
                        type: -1,
                        bank: -1,
                        creditCardType: -1,
                        creditCardExpireDate: -1
                    }
                },
                paymentMethods: [
                    utils.Option(-1, 'אמצעי תשלום...'),
                    utils.Option(0, 'המחאה'),
                    utils.Option(1, 'העברה בנקאית'),
                    utils.Option(2, 'מזומן'),
                    utils.Option(3, 'כרטיס אשראי')
                ],
                banks: [
                    utils.Option(-1, 'בנק...'),
                    utils.Option(4, 'בנק יהב'),
                    utils.Option(9, 'בנק הדואר'),
                    utils.Option(10, 'בנק לאומי לישראל'),
                    utils.Option(11, 'בנק דיסקונט'),
                    utils.Option(12, 'בנק הפועלים'),
                    utils.Option(13, 'בנק אגוד לישראל'),
                    utils.Option(14, 'בנק אוצר החייל'),
                    utils.Option(17, 'בנק מרכנתיל דיסקונט'),
                    utils.Option(20, 'בנק מזרחי טפחות'),
                    utils.Option(26, 'הבנק הבינלאומי הראשון'),
                    utils.Option(46, 'בנק מסד'),
                    utils.Option(52, 'בנק פועלי אגודת ישראל'),
                    utils.Option(54, 'בנק ירושלים')
                ],
                creditCardTypes: [
                    utils.Option(-1, 'סוג כרטיס...'),
                    utils.Option(0, 'ויזה'),
                    utils.Option(1, 'מסטרקארד'),
                    utils.Option(2, 'אמריקן אקספרס'),
                    utils.Option(3, 'ישראכרט')
                ],
                creditCardExpireDates: [
                    utils.Option(-1, 'תוקף כרטיס...')
                ],
                receiptProgress: {
                    creating: false,
                    created: false,
                    failed: false
                },
                account: null,
                region: null,
                paymentRequests: [],
                accounts: [],
                creditedAccounts: [],
                regions: [],
                creditedAccount: null,
                creditedAccountRegion: -1,
                creditedAccountSum: null,
                creditedAccountAlreadyExists: false,
                isValid: true,
                changed: false,
                confirmClosure: false,
                fullyPaidPaymentRequests: null,
                overrideInvalidReceiptReason: null,
                paymentRequestDetailsColumns: [
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
                        key: 'createdAt',
                        name: 'תאריך יצירה',
                        type: 'date',
                        active: true
                    },
                    {
                        key: 'remainingAmount',
                        name: 'נותר לתשלום',
                        active: true,
                        getter: function (paymentDetail) {
                            var currentlyPaid = parseInt(paymentDetail.currentlyPaid, 10);
                            if (isNaN(currentlyPaid)) {
                                currentlyPaid = 0;
                            }
                            return paymentDetail.remainingAmount - currentlyPaid;
                        }
                    },
                    {
                        key: 'currentlyPaid',
                        name: 'שולם בקבלה נוכחית',
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
            comp.receipt.creationDate = new Date();
            $("#ReceiptCreationDate").text(comp.receipt.creationDate.getTime());
            var monthAmount = 6*12; //six years...
            var date = new Date();
            for (var i = 0; i < monthAmount; i++) {
                var month = date.getMonth();
                var year = date.getFullYear();
                var curValue = (month + 1).toString() + year.toString();
                comp.creditCardExpireDates.push(utils.Option(curValue, [month + 1, year].join('/'), new Date(date.getTime())));
                date.setMonth(month + 1);
            }
            console.log(comp.paymentRequests);
            loadAccounts(comp, comp.creditedAccountRegion);
            loadPaymentRequestDetails(comp, 0);
        },
        methods: {
            toggleExpanded: function(objectOrName) {
                var comp = this;
                if (typeof objectOrName === 'string') {
                    var objectName = objectOrName;
                    comp.expandableObjects[objectName] = !comp.expandableObjects[objectName];
                } else if (objectOrName != null) {
                    objectOrName.expanded = !objectOrName.expanded;
                }
            },
            isExpanded: function(objectName) {
                return this.expandableObjects[objectName] === true;
            },
            setCreationDate: function(val) {
                var comp = this;
                comp.changed = true;
                comp.receipt.creationDate = val;
                $("#ReceiptCreationDate").text(comp.receipt.creationDate.getTime());
            },
            receiptInvalidReason: function() {
                var comp = this;
                if (comp.overrideInvalidReceiptReason != null)
                    return comp.overrideInvalidReceiptReason;
                var diff;
                var allPayments = comp.sumAllPayments();
                if (allPayments === 0)
                    return 'יש להזין לפחות תשלום אחד';
                if (comp.creditedAccountsEditMode) {
                    if (comp.creditedAccounts.length === 0 && (comp.creditedAccount == null || comp.creditedAccount.id <= 0))
                        return 'יש לבחור לפחות חשבון אחד לזיכוי';
                    var totalCreditedSum = utils.sumAll(comp.creditedAccounts, 'sum');
                    if (comp.creditedAccount != null && comp.creditedAccount.id > 0)
                        totalCreditedSum += utils.intOrDefault(comp.creditedAccountSum, 0);
                    if (totalCreditedSum < allPayments) {
                        diff = allPayments - totalCreditedSum;
                        return 'נותר סכום של ' + diff + ' ללא זיכוי חשבון';
                    }
                    if (totalCreditedSum > allPayments) {
                        diff = totalCreditedSum - allPayments;
                        return 'קיים זיכוי חשבונות עודף בסכום ' + diff + ' ש"ח';
                    }
                }
                var grandTotalPaid = 0; //utils.sumAll(comp.paymentRequests, 'totalCurrentlyPaid');
                comp.paymentRequests.forEach(function(paymentRequest) {
                    if (paymentRequest.details) {
                        paymentRequest.details.forEach(function(detail) {
                            var curPaid = parseInt(detail.currentlyPaid, 10);
                            if (!isNaN(curPaid))
                                grandTotalPaid += curPaid;
                        })
                    }
                });
                if (grandTotalPaid === 0)
                    return 'יש לשייך לפחות לתעודת חיוב אחת';
                if (grandTotalPaid > allPayments) {
                    diff = grandTotalPaid - allPayments;
                    return 'סה"כ שולם עבור תעודות חיוב חורג ב-' + diff + ' ש"ח מסך כל התשלומים';
                }
                return null;
            },
            creditedAccountInvalidReason: function(index) {
                var comp = this;
                if (comp.creditedAccountsEditMode) {
                    var totalPayments = comp.sumAllPayments();
                    if (totalPayments === 0)
                        return 'יש להזין תשלום כדי לשנות חשבון לזיכוי';
                    var remainingSumToCredit = totalPayments - utils.sumAll(comp.creditedAccounts, 'sum');
                    if (remainingSumToCredit <= 0)
                        return 'לא נותר תשלום לזכות';
                    if (parseInt(comp.creditedAccountRegion, 10) < 0)
                        return 'יש לבחור מחוז';
                    if (comp.creditedAccount == null || comp.creditedAccount.id <= 0)
                        return 'יש לבחור חשבון';
                    if (comp.creditedAccountAlreadyExists)
                        return 'חשבון כבר נמצא ברשימה';
                    if (comp.creditedAccountSum == null || comp.creditedAccountSum == 0)
                        return 'יש להזין סכום';
                    if (comp.creditedAccountSum > remainingSumToCredit)
                        return 'סכום גדול מסך כל תשלומים';
                }
                return null;
            },
            paymentInvalidReason: function(index) {
                var comp = this;
                var vResponse = {};
                var payment = index >= 0 ? comp.receipt.payments[index] : comp.receipt.newPayment;
                if (payment != null) {
                    var type = parseInt(payment.type, 10);
                    if (type < 0)
                        return 'יש לבחור אמצעי תשלום';
                    if (payment.sum == null || payment.sum == '')
                        return 'יש להזין סכום';
                    if (type === 0 || type === 1) {
                        //check or bank transfer, so bank is required
                        if (parseInt(payment.bank, 10) < 0)
                            return 'יש לבחור בנק';
                        if (!utils.validateNumericField(payment.bankBranch, 'סניף בנק',  vResponse))
                            return vResponse.message;
                        if (!utils.validateMaxLengthField(payment.bankAccount, 'מספר חשבון  בנק', 15,  vResponse))
                            return vResponse.message;
                        if (!utils.validateDateField(payment.dueDate, 'תאריך פרעון',  vResponse))
                            return vResponse.message;
                        if (!utils.validateMaxLengthField(payment.bankReference, 'אסמכתא', -15,  vResponse))
                            return vResponse.message;
                    } else if (type === 3) {
                        //credit card, all fields required
                        if (parseInt(payment.creditCardType, 10) < 0)
                            return 'יש לבחור סוג כרטיס אשראי';
                        if (!utils.validateMinimumLengthField(payment.fourLastDigits, 'ארבע ספרות אחרונות', 4, vResponse))
                            return vResponse.message;
                        if (parseInt(payment.creditCardExpireDate, 10) < 0)
                            return 'יש לבחור תוקף כרטיס אשראי';
                        if (!utils.validateNumericField(payment.installments, 'מספר תשלומים',  vResponse))
                            return vResponse.message;
                    }
                }
                return null;
            },
            addPayment: function() {
                var comp = this;
                var clonedPayment = utils.clone(comp.receipt.newPayment);
                clonedPayment.changed = false;
                clonedPayment.removing = false;
                comp.receipt.payments.push(clonedPayment);
                comp.receipt.newPayment = {
                    expanded: true,
                    type: -1,
                    bank: -1,
                    creditCardType: -1,
                    creditCardExpireDate: -1
                };
            },
            removePayment: function(index) {
                var comp = this;
                var paymentToRemove = comp.receipt.payments[index];
                if (paymentToRemove.type >= 0) {
                    paymentToRemove.removing = true;
                } else {
                    comp.reallyRemovePayment(index);
                }
            },
            reallyRemovePayment: function(index) {
                var comp = this;
                if (index >= 0 && index < comp.receipt.payments.length) {
                    comp.receipt.payments.splice(index, 1);
                } else {
                    console.log('Invalid payment index: ' + index);
                    console.log(comp.receipt.payments);
                }
            },
            abortPaymentRemoval: function(index) {
                var comp = this;
                var paymentToRemove = comp.receipt.payments[index];
                paymentToRemove.removing = false;
            },
            sumAllPayments: function() {
                var comp = this;
                var totalSum = 0;
                comp.receipt.payments.forEach(function(payment, index) {
                    if (comp.paymentInvalidReason(index) == null) {
                        var currentSum = parseInt(payment.sum, 10);
                        if (!isNaN(currentSum))
                            totalSum += currentSum;
                    }
                });
                if (comp.paymentInvalidReason(-1) == null) {
                    var newPaymentSum = parseInt(comp.receipt.newPayment.sum, 10);
                    if (!isNaN(newPaymentSum))
                        totalSum += newPaymentSum;
                }
                return totalSum;
            },
            dataChanged: function(index) {
                var comp = this;
                comp.changed = true;
                if (index >= 0 && index < comp.receipt.payments.length) {
                    comp.receipt.payments[index].changed = true;
                }
            },
            editCreditedAccounts: function() {
                var comp = this;
                comp.creditedAccountsEditMode = true;
                readRegions(comp);
                comp.creditedAccounts = [];
                comp.creditedAccounts.push({
                    id: comp.account.id,
                    name: comp.account.name,
                    sum: comp.sumAllPayments(),
                    expanded: true,
                    removing: false
                });
            },
            creditedAccountRegionChanged: function() {
                var comp = this;
                loadAccounts(comp, comp.creditedAccountRegion, function() {
                    //console.log('Region contains ' + comp.accounts.length + ' accounts');
                });
            },
            creditedAccountSumChanged: function(index) {
                var comp = this;
                var changedSum, diff;
                var totalSum = comp.sumAllPayments();
                if (index < 0) {
                    //default credited account changed, auto change existing credited account if only one
                    if (comp.creditedAccounts != null && comp.creditedAccounts.length === 1) {
                        changedSum = utils.intOrDefault(comp.creditedAccountSum, 0);
                        diff = totalSum - changedSum;
                        comp.creditedAccounts[0].sum = diff;
                    }
                } else {
                    //existing credited account changed, auto change default if not null, or the other existing if only two
                    changedSum = utils.intOrDefault(comp.creditedAccounts[index].sum, 0);
                    diff = totalSum - changedSum;
                    if (comp.creditedAccount && comp.creditedAccount.id > 0 && !comp.creditedAccountAlreadyExists) {
                        comp.creditedAccountSum = diff;
                    } else if (comp.creditedAccounts.length === 2) {
                        var otherCreditedAccount = index === 0 ? comp.creditedAccounts[1] : comp.creditedAccounts[0];
                        otherCreditedAccount.sum = diff;
                    }
                }
            },
            setCreditedAccount: function(value) {
                var comp = this;
                comp.creditedAccountAlreadyExists = false;
                if (comp.creditedAccount != null && comp.creditedAccount.id > 0) {
                    var matchingAccount = comp.creditedAccounts.find(function(creditedAccount) {
                        return creditedAccount.id === comp.creditedAccount.id;
                    });
                    if (matchingAccount == null) {
                        if (comp.creditedAccounts.length === 1 && comp.creditedAccounts[0].id === comp.account.id) {
                            comp.creditedAccounts[0].sum = null;
                            comp.creditedAccountSum = comp.sumAllPayments();
                        }
                    } else {
                        comp.creditedAccountAlreadyExists = true;
                    }
                }
            },
            addCreditedAccount: function() {
                var comp = this;
                if (comp.creditedAccount != null && comp.creditedAccount.id > 0 && comp.creditedAccountSum > 0) {
                    var creditedAccountName = comp.creditedAccount.name;
                    if (comp.creditedAccountRegion != comp.region.id) {
                        var matchingRegion = comp.regions.find(function(region) {
                            return region.id == comp.creditedAccountRegion;
                        });
                        if (matchingRegion != null) {
                            creditedAccountName += ' (' + matchingRegion.name + ')';
                        } else {
                            console.log('Credited account region ' + comp.creditedAccountRegion + ' not found');
                        }
                    }
                    comp.creditedAccounts.push({
                        id: comp.creditedAccount.id,
                        name: creditedAccountName,
                        sum: comp.creditedAccountSum,
                        expanded: true,
                        removing: false
                    });
                    comp.creditedAccountAlreadyExists = false;
                    comp.creditedAccountSum = null;
                    comp.creditedAccountRegion = -1;
                    comp.creditedAccount = null;
                }
            },
            removeCreditedAccount: function(index) {
                var comp = this;
                var creditedAccountToRemove = comp.creditedAccounts[index];
                if (creditedAccountToRemove.sum > 0) {
                    creditedAccountToRemove.removing = true;
                } else {
                    comp.reallyRemoveCreditedAccount(index);
                }
            },
            reallyRemoveCreditedAccount: function(index) {
                var comp = this;
                if (index >= 0 && index < comp.creditedAccounts.length) {
                    var removedCreditedAccount = comp.creditedAccounts[index];
                    var removedSum = utils.intOrDefault(removedCreditedAccount.sum, 0);
                    comp.creditedAccounts.splice(index, 1);
                    if (removedSum > 0 && comp.creditedAccounts.length === 0) {
                        comp.creditedAccountSum = utils.intOrDefault(comp.creditedAccountSum, 0) + removedSum;
                    }
                } else {
                    console.log('Invalid credited account index: ' + index);
                    console.log(comp.creditedAccounts);
                }
            },
            abortCreditedAccountRemoval: function(index) {
                var comp = this;
                var creditedAccountToRemove = comp.creditedAccounts[index];
                creditedAccountToRemove.removing = false;
            },
            paymentRequestDetailsChanged: function(index) {
                var comp = this;
                console.log('details changed');
                var paymentRequest = comp.paymentRequests[index];
                paymentRequest.totalCurrentlyPaid = 0;
                console.log(comp.paymentRequestDetailsColumns);
                if (paymentRequest.details) {
                    paymentRequest.details.forEach(function(detail) {
                        var currentlyPaid = parseInt(detail.currentlyPaid, 10);
                        if (isNaN(currentlyPaid))
                            currentlyPaid = 0;
                        if (currentlyPaid <= 0) {
                            detail.selected = false;
                        } else {
                            detail.selected = true;
                            paymentRequest.totalCurrentlyPaid += currentlyPaid;
                        }
                        detail.green = (detail.remainingAmount - currentlyPaid) <= 0;
                    });
                }
                comp.$forceUpdate();
            },
            isInFocus: function(index) {
                var comp = this;
                var payment = index >= 0 ? comp.receipt.payments[index] : comp.receipt.newPayment;
                return payment.isFocused === true;
            },
            dueDateFocused: function(index) {
                var comp = this;
                var payment = index >= 0 ? comp.receipt.payments[index] : comp.receipt.newPayment;
                payment.isFocused = true;
                this.$forceUpdate();
            },
            dueDateBlurred: function(index) {
                var comp = this;
                var payment = index >= 0 ? comp.receipt.payments[index] : comp.receipt.newPayment;
                window.setTimeout(function() {
                    payment.isFocused = false;
                    comp.$forceUpdate();
                }, 500);
            },
            setDefaultDueDate: function(index) {
                var comp = this;
                var payment = index >= 0 ? comp.receipt.payments[index] : comp.receipt.newPayment;
                payment.dueDate = utils.formatDate(new Date(), 'dd/mm/yyyy');
                this.$forceUpdate();
            },
            anyTrue: utils.anyTrue,
            saveReceipt: function() {
                var comp = this;
                var payments = utils.merge(comp.receipt.newPayment, comp.receipt.payments).filter(function(p) {
                    var sum = parseInt(p.sum, 10);
                    return p.type >= 0 && !isNaN(sum) && sum > 0;
                });
                if (payments.length === 0) {
                    comp.overrideInvalidReceiptReason = 'יש להזין לפחות תשלום לא ריק אחד';
                    window.setTimeout(function() {
                        comp.overrideInvalidReceiptReason = null;
                    }, 3000);
                    return;
                }
                var parsedPayments = payments.map(function(payment) {
                    return {
                        type: parseInt(payment.type, 10),
                        sum: parseInt(payment.sum, 10),
                        bank: getBank(payment),
                        creditCard: getCreditCard(comp, payment),
                        dueDate: utils.parseDate(payment.dueDate)
                    };
                });
                var defaultCreditedAccount = getDefaultCreditedAccount(comp);
                var creditedAccounts = utils.merge(defaultCreditedAccount, comp.creditedAccounts).filter(function(creditedAccount) {
                    return utils.intOrDefault(creditedAccount.sum, 0) > 0;
                }).map(function(creditedAccount) {
                    return {
                        id: creditedAccount.id,
                        sum: parseInt(creditedAccount.sum, 10)
                    };
                });
                //console.log(comp.paymentRequests);
                var paymentRequestsData = comp.paymentRequests.map(function(paymentRequest) {
                    var teams = paymentRequest.details.map(function(detail) {
                        return {
                            id: detail.teamId,
                            sum: utils.intOrDefault(detail.currentlyPaid, 0)
                        };
                    }).filter(function(team) {
                        return team.sum > 0;
                    });
                    return {
                        id: paymentRequest.id || paymentRequest.Id || paymentRequest.order,
                        teams: teams
                    };
                }).filter(function(paymentRequestData) {
                    return paymentRequestData.teams.length > 0;
                });
                var receiptData = {
                    region: comp.region.id,
                    account: comp.account.id,
                    sum: utils.sumAll(payments, 'sum'),
                    date: comp.receipt.creationDate,
                    remarks: comp.receipt.remark,
                    payments: parsedPayments,
                    creditedAccounts: creditedAccounts,
                    paymentRequests: paymentRequestsData
                };
                //console.log(receiptData);
                comp.receiptProgress.creating = true;
                Vue.http.post('/api/v2/finance/receipt', receiptData).then(function (resp) {
                    comp.receiptProgress.creating = false;
                    comp.receiptProgress.created = true;
                    window.setTimeout(function() {
                        comp.receipt.id = resp.body.ReceiptId;
                        comp.confirm();
                    }, 3000);
                }, function(err) {
                    comp.receiptProgress.creating = false;
                    comp.receiptProgress.failed = true;
                    console.log(err);
                    window.setTimeout(function() {
                        comp.receiptProgress.failed = false;
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
            confirm: function () {
                var comp = this;
                this.$emit("close", comp.receipt);
            },
            reallyCancel: function() {
                this.$emit("close");
            },
            abortCancel: function() {
                this.confirmClosure = false;
            }
        },
        computed: {
            sumAll: function() {
                return this.sumAllPayments();
            }
        },
        watch: {
            sumAll: function(oldval, newval) {
                var comp = this;
                var totalSum = comp.sumAllPayments();
                for (var p = 0; p < comp.paymentRequests.length; p++) {
                    if (totalSum <= 0)
                        break;
                    var paymentRequest = comp.paymentRequests[p];
                    if (paymentRequest.details) {
                        for (var d = 0; d < paymentRequest.details.length; d++) {
                            if (totalSum <= 0)
                                break;
                            var detail = paymentRequest.details[d];
                            var currentPayment = detail.remainingAmount;
                            if (currentPayment > totalSum)
                                currentPayment = totalSum;
                            detail.currentlyPaid = currentPayment;
                            totalSum -= currentPayment;
                        }
                    }
                }
            }
        }
    });

    return NewReceiptComponent;
});

function getReceiptDate() {
    var time = parseInt($("#ReceiptCreationDate").text(), 10);
    if (!isNaN(time) && time > 0) {
        return new Date(time);
    } else {
        return new Date();
    }
}