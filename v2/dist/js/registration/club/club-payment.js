define(["templates/registration", "services/access", "services/products", "dialog", "consts", "utils"], function (
    templates, Access, Products, Dialog, consts, utils) {

    var productPrices = {};

    function getTeamProduct(hasTotoSupport, sportId) {
        if (sportId == 81)
            return 1054;
        if (sportId == 86)
            return 1053;
        if (hasTotoSupport)
            return 101;
        return 100;
    }
    function getTeamPrice(hasTotoSupport, sportId) {
        return productPrices[getTeamProduct(hasTotoSupport, sportId)];
    }

    function readCompetitions(comp, callback) {
        Vue.http.get('/api/v2/registration/club/competitions')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.sports.length; i++) {
                        var sport = resp.body.sports[i];
                        var categories = {};
                        for (var c = 0; c < sport.categories.length; c++) {
                            var category = sport.categories[c];
                            categories[category.id] = category;
                        }
                        sport.categories = categories;
                        comp.sports[sport.id] = sport;
                    }
                    callback();
                },
                function (err) {
                    callback(err);
                }
            );
    }

    function readTeams(comp, callback) {
        readCompetitions(comp, function (err) {
            if (!err) {
                Vue.http.get('/api/v2/registration/club/teams')
                    .then(
                        function (resp) {
                            var teams = [];
                            var paidSinglePaymentCompetitions = {};
                            for (var i = 0; i < resp.body.length; i++) {
                                var team = resp.body[i];
                                team.sport = comp.sports[team.sport];
                                //team.price = getTeamPrice(team.hasTotoSupport, team.sport.id);
                                //console.log(team.sport.name + ', ' + team.price);
                                //console.log(team);
                                if (team.sport) {
                                    team.competition = team.sport.categories[team.competition];

                                    if (team.competition) {
                                        if (team.sport.name.indexOf('כדורסל') >= 0) {
                                            // console.log(team);
                                        }
                                        if (team.payment != null) {
                                            if (team.sport.isOnePaymentPerCategory ) {
                                                paidSinglePaymentCompetitions[team.competition.category] = true;
                                            }
                                            comp.paidTeams.push(team);
                                        }
                                        else {
                                            team.paymentIndex = 0;
                                            teams.push(team);
                                        }
                                        if (team.sport.isOnePaymentPerCategory) {
                                            if (team.sport.name.indexOf('כדורסל') >= 0) {
                                                // console.log(paidSinglePaymentCompetitions[team.competition.category]);
                                            }
                                            if (paidSinglePaymentCompetitions[team.competition.category]) {
                                                team.removePayment = true;
                                            }
                                            else {
                                                paidSinglePaymentCompetitions[team.competition.category] = true;
                                            }
                                        }
                                    }
                                }
                            }

                            comp.teams = teams;

                            callback();
                        },
                        function (err) {
                            callback(err);
                        }
                    );
            }
        });
    }

    function updatePaymentTeamPrice(payment, team) {
        for (var i = 0; i < payment.details.items.length; i++) {
            var item = payment.details.items[i];
            if (item.teams) {
                for (var t = 0; t < item.teams.length; t++) {
                    if (item.teams[t] === team.id) {
                        team.price = item.price;
                        return;
                    }
                }
            }
        }
    }

    function readPreviousPayments(comp) {
        Vue.http.get('/api/v2/registration/club/payments')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        var payment = resp.body[i];

                        payment.teams = [];
                        payment.time = new Date(payment.time);
                        payment.contacts = payment.details.contacts;
                        for (var t = 0; t < comp.paidTeams.length; t++) {
                            var team = comp.paidTeams[t];
                            if (team.payment === payment.id) {
                                updatePaymentTeamPrice(payment, team);
                                payment.teams.push(team);
                            }
                        }
                        payment.showChampionshipColumn = false;
                        for (var t = 0; t < payment.teams.length; t++) {
                            var curTeam = payment.teams[t];
                            if (curTeam.sport.name.indexOf('ספיישל') >= 0) {
                                payment.showChampionshipColumn = true;
                                break;
                            }
                        }
                        var order = null;
                        for (var n = 0; n < comp.orders.length; n++) {
                            var o = comp.orders[n];
                            if (o.id === payment.order) {
                                order = o;
                                break;
                            }
                        }
                        if (!order) {
                            order = {
                                id: payment.order,
                                time: payment.time,
                                payments: []
                            };
                            comp.orders.push(order);
                        }
                        order.payments.push(payment);
                    }
                    comp.orders.sort(function (a, b) { return b.id - a.id; });
                },
                function (err) {
                    console.log(err);
                }
            );
    }

    var RegistrationClubPaymentComponent = Vue.extend({
        template: templates["club-payment"],
        data: function () {
            return {
                user: Access.user,
                payments: [],
                sports: {},
                email: null,
                coordinator: null,
                // Not in use at the moment
                //teamPrice: null,
                teams: [],
                paidTeams: [],
                orders: [],
                paying: false,
                inactiveSeason: false
            };
        },
        mounted: function () {
            var comp = this;
            Vue.http.get('/api/v2/login')
                .then(
                    function (resp) {
                        comp.coordinator = consts.coordinators[resp.body.region];
                    },
                    function (err) {
                        console.log(err);
                    }
                );
            Products.get(function (err, products) {
                if (err) {
                    console.log(err);
                }
                else {
                    for (var productId in products) {
                        productPrices[productId] = products[productId].price;
                    }
                    comp.reload();
                }
            });
            comp.inactiveSeason = utils.inactiveSeason(comp);
            if (comp.inactiveSeason) {
                //check if school is authorized
                utils.checkSeasonAuthorization(comp.user, function(err, authorized) {
                    if (authorized == true) {
                        comp.inactiveSeason = false;
                    }
                });
            }
        },
        computed: {
            canPay: function () {
                for (var i = 0; i < this.teams.length; i++) {
                    var team = this.teams[i];
                    if (team.paymentIndex == null || team.paymentIndex >= this.payments.length) {
                        return false;
                    }
                }

                for (var i = 0; i < this.payments.length; i++) {
                    var payment = this.payments[i];
                    if (payment.method == null || payment.payerName == null || payment.payerName.length === 0) {
                        return false;
                    }
                    for (var c = 0; c < payment.contacts.length; c++) {
                        var contact = payment.contacts[c];
                        if (contact.name == null || contact.name.length === 0) {
                            return false;
                        }
                    }
                }
                return true;
            }
        },
        methods: {
            reload: function () {
                this.teams.splice(0, this.teams.length);
                this.payments.splice(0, this.payments.length);
                this.orders.splice(0, this.orders.length);
                this.paidTeams.splice(0, this.paidTeams.length);
                var comp = this;
                readTeams(comp, function (err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    readPreviousPayments(comp);
                    Vue.http.get('/api/v2/registration/club/details')
                        .then(
                            function (resp) {
                                // console.log(resp.body);
                                comp.email = resp.body.coordinator.email;
                                comp.name = resp.body.coordinator.name;
                                comp.representative = resp.body.representative;
                                var payment = {
                                    payerName: resp.body.school.name,
                                    contacts: [
                                        resp.body.principal || {}
                                    ]
                                };
                                payment.contacts[0].role = "מנהל";
                                comp.payments.push(payment);
                                comp.paying = false;
                            },
                            function (err) {
                                console.log(err);
                            }
                        );
                });
            },
            getPaymentTotal: function (index) {
                var price = 0;
                for (var i = 0; i < this.teams.length; i++) {
                    var team = this.teams[i];
                    if (team.paymentIndex === index && !team.removePayment) {
                        price += team.price;
                    }
                }
                return price;
            },
            hasPaymentToPay: function () {
                return true;
                /*
                for (var i = 0; i < this.payments.length; i++) {
                    if (this.getPaymentTotal(i) > 0) {
                        return true;
                    }
                }
                return false;
                */
            },
            addPayment: function () {
                this.payments.push({
                    contacts: [{}]
                });
            },
            removePayment: function(payment, index) {
                this.payments.splice(index, 1);
                for (var i= 0; i< this.teams.length; i++ ) {
                    var team = this.teams[i];
                    if (team.paymentIndex == index){
                        team.paymentIndex = 0;
                    }
                }
            },
            addContact: function (payment) {
                payment.contacts.push({ new: true });
            },
            saveContactAndSendPayment: function(payment, index) {
                var formId = 'add-contacts-form';
                var nodes = document.querySelectorAll('#' + formId + ' :invalid');
                if (nodes.length > 0){
                    return;
                }
                payment.contacts[index].new = false;
            },
            removeContact: function (payment, index) {
                payment.contacts.splice(index, 1);
            },
            isFormValid: function() {

                var payments = this.payments;
                var result = true;
                for (var i in payments) {
                    var payment = payments[i];

                    for (var j in payment.contacts) {
                        var contact = payment.contacts[j];
                        if (!(contact.role && contact.name && contact.phoneNumber && contact.email)) {
                            result = false;
                            break;
                        }
                    }
                }

                return result;
            },
            cancelOrder: function(order) {
                var comp = this;
                Dialog.open("general/message-box", {
                        cancelText: 'בטל',
                        message: 'האם לבטל את דרישת התשלום?',
                        caption: 'ביטול דרישת תשלום'
                    },
                    function(err, result) {
                        if (!result) {
                            return;
                        }


                        Vue.http.post('/api/v2/registration/club/payments/'+ order.id + '/cancel').then(function(res) {
                            var index = comp.orders.indexOf(order);
                            if (index >=0 ) {
                                comp.orders.splice(index, 1);
                            }
                        });
                    });
            },
            downloadPayment: function(order) {
                utils.downloadPayment(order.id);
            },
            next: function() {
                var comp = this;
                comp.$emit("next", 3);
            },
            commit: function () {
                var payments = [];
                for (var i = 0; i < this.payments.length; i++) {
                    var teams = [];
                    var prices = {};
                    var items = [];
                    for (var t = 0; t < this.teams.length; t++) {
                        var team = this.teams[t];
                        if (team.paymentIndex === i) {
                            var calculatedPrice = team.removePayment ? 0 : team.price;
                            var item = prices[calculatedPrice];
                            if (!item) {
                                prices[calculatedPrice] = item = {
                                    product: getTeamProduct(team.hasTotoSupport, team.sport.id),
                                    price: calculatedPrice,
                                    quantity: 0,
                                    teams: []
                                };
                                items.push(item);
                            }
                            teams.push(team.id);
                            item.teams.push(team.id);
                            item.quantity++;
                        }
                    }
                    var payment = this.payments[i];
                    payment.teams = teams;
                    var newPayment = {
                        payerName: payment.payerName,
                        method: payment.method,
                        totalAmount: items.reduce(function(total, item) {
                            total += item.price * item.quantity;
                            return total;
                        }, 0),
                        details: {
                            contacts: payment.contacts,
                            items: items
                        }
                    };

                    //if (newPayment.totalAmount != 0) {
                    payments.push(newPayment);
                    //}
                }
                var comp = this;
                // console.log(payments.map(p => p.details.contacts.map(c => c.name).join(', ')).join(', '));
                // console.log('name: ' + comp.representative.name);
                comp.paying = true;
                Vue.http.post('/api/v2/registration/club/payment', payments)
                    .then(
                        function (resp) {
                            comp.reload();
                            Dialog.open("general/message-box",
                                {
                                    wide: true,
                                    caption: "הרשמה נקלטה",
                                    message:
                                    "1. הרשמתך למועדוני ספורט בית ספריים נקלטה במערכת<br/>" +
                                    "2. דרישת תשלום נשלחה למייל " + payments.map(function (p) {
                                        return p.details.contacts.map(function (c) { return c.email; }).join(", ");
                                    }).join(", ") + "<br/>" +
                                    "3. מייל נשלח אל " + payments.map(function(p) {
                                        return p.details.contacts.map(function(c) { return c.name; }).join(', ');
                                    }).join(', ') + " – מנהל/ת בית הספר (בדקו גם בתיבת הספאם/דואר זבל) יש לוודא את אישורו/ה עבור הקבוצות בלינק המצורף בגוף המייל.<br />" +
                                    "4. מייל נשלח אל " + comp.representative.name + " – נציג/ה ברשות המקומית (בדקו גם בתיבת הספאם/דואר זבל) יש לוודא את אישורו/ה עבור הקבוצות בלינק המצורף בגוף המייל.<br />" +
                                    "5. יש לוודא את אישור הקבוצות ע\"י הפיקוח על החינוך הגופני מחוזכם.<br />" +
                                    "6. אישור סופי של הקבוצות ישלח למייל " + comp.email + "<br/>" +
                                    "7. מספר אישור הרשמה " + resp.body.order + "<br/>" +
                                    "8. לשאלות בנוגע להרשמה ניתן לפנות לרכז/ת " +
                                    (comp.coordinator ? "מחוז " + comp.coordinator.areaName + "<br/>&nbsp;&nbsp; במייל " + comp.coordinator.mail + " <br/>&nbsp;&nbsp; בנייד " + comp.coordinator.phone : "המחוז")
                                }, function () {
                                    if (comp.teams.length === 0) {
                                        comp.$emit("next", 3);
                                    }
                                });
                        },
                        function (err) {
                            comp.paying = false;
                            Dialog.open('general/error-message', {
                                caption: "פעולה נכשלה",
                                message: typeof err.body === "string" ? err.body : "שגיאה בביצוע התשלום"
                            });
                        }
                    );
            }
        }
    });

    return RegistrationClubPaymentComponent;
});
