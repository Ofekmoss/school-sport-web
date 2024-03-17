define(["templates/registration", "services/access", "services/products", "dialog", "utils"], function (templates, Access, Products, Dialog, utils) {
    function readCompetitions(comp, callback) {
        Vue.http.get('/api/v2/registration/league/competitions')
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

    function readTeams(comp, teamId, callback) {
        readCompetitions(comp, function (err) {
            if (!err) {
                Vue.http.get('/api/v2/registration/league/teams/' + encodeURIComponent(teamId))
                    .then(
                        function (resp) {
                            var team = resp.body;
                            team.sport = comp.sports[team.sport];
                            if (team.sport) {
                                team.competition = team.sport.categories[team.competition];

                                if (team.competition) {
                                    comp.team = team;
                                }
                            }

                            callback();
                        },
                        function (err) {
                            callback(err);
                        }
                    );
            }
        });
    }

    function readPreviousPayments(comp) {
        if (!comp.team) {
            return;
        }
        Vue.http.get('/api/v2/registration/league/payments')
            .then(
                function (resp) {
                    for (var i = 0; i < resp.body.length; i++) {
                        var payment = resp.body[i];
                        payment.time = new Date(payment.time);

                        if (payment.id === comp.team.payment) {
                            comp.payment = payment;
                            comp.payment.contacts = payment.details.contacts;
                            break;
                        }
                    }
                },
                function (err) {
                    console.log(err);
                }
            );
    }

    var RegistrationLeaguePaymentComponent = Vue.extend({
        template: templates["league-payment"],
        data: function () {
            return {
                user: Access.user,
                payment: null,
                sports: {},
                teamId: null,
                teamPrice: null,
                team: null,
                paying: false,
                inactiveSeason: false
            };
        },
        mounted: function () {
            var comp = this;
            comp.teamId = window.location.hash.split("=")[1];
            Products.getById(200, function (err, product) {
                comp.teamPrice = product.price;
                comp.reload();
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
                if (this.payment == null || this.payment.order != null || this.payment.payerName == null || this.payment.payerName.length === 0) {
                    return false;
                }
                for (var c = 0; c < this.payment.contacts.length; c++) {
                    var contact = this.payment.contacts[c];
                    if (contact.name == null || contact.name.length === 0) {
                        return false;
                    }
                }
                return true;
            }
        },
        methods: {
            reload: function () {
                var comp = this;
                readTeams(comp, comp.teamId, function (err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    readPreviousPayments(comp);
                    //console.log(comp.team);
                    if (comp.team.payment == null) {
                        Vue.http.get('/api/v2/registration/league/details')
                            .then(
                                function (resp) {
                                    // console.log(resp.body);
                                    comp.representative = resp.body.representative;
                                    comp.payment = {
                                        payerName: resp.body.school.name,
                                        contacts: [
                                            resp.body.principal || {}
                                        ]
                                    };
                                    comp.payment.contacts[0].role = "מנהל";
                                    comp.paying = false;
                                },
                                function (err) {
                                    console.log(err);
                                }
                            );
                    }
                });
            },
            addContact: function (payment) {
                console.log('adding');
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
            next: function () {
                this.$emit("next", 3);
            },
            commit: function () {
                if (this.team && this.team.payment == null && this.team.active && this.payment.order == null) {
                    var payments = [
                        {
                            payerName: this.payment.payerName,
                            method: 1, //this.payment.method,
                            totalAmount: this.teamPrice,
                            details: {
                                contacts: this.payment.contacts,
                                items: [
                                    {product: 200, price: this.teamPrice, quantity: 1, teams: [this.team.id]}
                                ]
                            }
                        }
                    ];

                    var comp = this;
                    comp.paying = true;
                    Vue.http.post('/api/v2/registration/league/payment', payments)
                        .then(
                            function (resp) {
                                var emails = payments.map(function (p) {
                                    return p.details.contacts.map(function (c) { return c.email; }).join(", ");
                                }).join(", ");
                                var names = payments.map(function (p) {
                                    return p.details.contacts.map(function (c) { return c.name; }).join(", ");
                                }).join(", ");
                                var coordinatorEmail = comp.team.sportName == 'כדורסל' ?
                                    'roie@schoolsport.org.il' : 'matan@schoolsport.org.il';
                                var coordinatorPhone = comp.team.sportName == 'כדורסל' ?
                                    '050-8680520' : '052-7457890';
                                Dialog.open("general/message-box",
                                    {
                                        wide: true,
                                        caption: "הרשמה נקלטה",
                                        message:
                                            "1. הרשמתך לליגת התיכוניים נקלטה במערכת<br/>" +
                                            "2. דרישת תשלום נשלחה למייל " + emails + "<br/>" +
                                            "3. מייל נשלח אל " + names + " – מנהל/ת בית הספר (בדקו גם בתיבת הספאם/דואר זבל) יש לוודא את אישורו/ה עבור הקבוצות בלינק המצורף בגוף המייל." + "<br />" +
                                            "4. מייל נשלח אל " + comp.representative.name + " – נציג/ה ברשות המקומית (בדקו גם בתיבת הספאם/דואר זבל) יש לוודא את אישורו/ה עבור הקבוצות בלינק המצורף בגוף המייל." + "<br />" +
                                        "5. יש לוודא את אישור הקבוצות ע\"י הפיקוח על החינוך הגופני מחוזכם" + "<br />" +
                                        "6. אישור סופי של הקבוצות ישלח למייל " + comp.team.teacher.email + "<br/>" +
                                            "7. מספר אישור הרשמה " + resp.body.order + "<br/>" +
                                            "8. לשאלות בנוגע להרשמה ניתן לפנות לרכז אליפות התיכוניים " +
                                        "<br/>&nbsp;&nbsp; במייל " + coordinatorEmail + " <br/>&nbsp;&nbsp; בנייד " + coordinatorPhone
                                    }, function () {
                                        comp.next();
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
            },
            cancelPayment: function() {
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

                        Vue.http.post('/api/v2/registration/league/payments/'+ comp.payment.order + '/cancel').then(function(res) {
                            comp.reload();
                        });
                    });
            },
            downloadPayment: function() {
                var comp = this;
                utils.downloadPayment(comp.payment.order);
            }
        }
    });

    return RegistrationLeaguePaymentComponent;
});
