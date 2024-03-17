define(["templates/registration", "utils", "dialog"], function (templates, utils, Dialog) {
    function formatDate(date) {
        return ('0' + date.getDate()).slice(-2) + "/" +
            ('0' + (date.getMonth() + 1)).slice(-2) + "/" +
            ('000' + date.getFullYear()).slice(-4);
    }

    var PelePlayerDialogComponent = Vue.extend({
        template: templates["pele-player-dialog"],
        el: '#validated-form',
        data: function () {
            return {
                player: {
                    id: '',
                    firstName: '',
                    lastName: '',
                    idNumberType: '',
                    idNumber: '',
                    gender: '',
                    birthDate: '',
                    isPele: '',
                    peleJoinDate: ''

                },
                newPlayer: false,
                team: null,
                validYear: true,
                error: ''
            };
        },
        watch: {
            yearOfBirth: function() {
                var currentYear = new Date().getFullYear();
                var age = currentYear - this.player.yearOfBirth;
                this.validYear  = (age >= 9) && (age <= 19);
            },
            isPele: function() {
                if (this.player.peleJoinDate == null || !this.player.peleJoinDate) {
                    //this.player.peleJoinDate = formatDate(new Date());
                }
            }
        },
        computed: {
            yearOfBirth: function() {
                return this.player.yearOfBirth;
            },
            isPele: function() {
                return this.player.isPele;
            }
        },
        mounted: function () {

            var comp = this;
            // console.log(comp.sports);

            if (comp.player.id == null) {
                comp.newPlayer = true;
                comp.player.idNumberType = 1;
            } else {
                comp.player = Object.assign({}, comp.player);
            }

        },
        methods: {
            isValidIdNumber: function() {
                var comp = this;
                if (comp.player.idNumberType == '1') {
                    var idNumber = comp.player.idNumber;
                    if (idNumber.toString().length > 0)
                        return utils.isIdValid(idNumber);
                }
                return true;
            },
            cancel: function () {
                this.$emit("close");
            },
            confirm: function () {
                var comp = this;
                var url = '/api/v2/registration/project/3/player/' + comp.player.idNumber + '/teams';
                var playerTeamId = comp.team.id;
                comp.error = '';
                Vue.http.get(url).then(function(resp) {
                    var otherTeams = resp.data.filter(function(teamId) {
                        return teamId != playerTeamId;
                    });
                    if (otherTeams.length >= 2) {
                        var msg = (comp.player.gender == 1 ? 'ספורטאי זה כבר רשום ' : 'ספורטאית זו כבר רשומה ') +
                            'ל-' + otherTeams.length + ' קבוצות אחרות ' +
                            'לא ניתן להוסיף לקבוצה זו';
                        comp.error = msg;
                    } else {
                        var isPele = comp.player.isPele ? 1 : 0;
                        var item1 = { isPele : isPele } ;
                        if (isPele === 1) {
                            item1.peleJoinDate = comp.player.peleJoinDate;
                        }
                        var data = {
                            id: comp.player.id,
                            firstName: comp.player.firstName,
                            lastName: comp.player.lastName,
                            idNumberType: parseInt(comp.player.idNumberType),
                            idNumber: comp.player.idNumber,
                            birthDate: new Date(parseInt(comp.player.yearOfBirth), 0, 1),
                            gender: comp.player.gender,
                            item1: JSON.stringify(item1),
                            isPele: comp.player.isPele ? 1 : 0,
                            peleJoinDate: comp.player.isPele ? comp.player.peleJoinDate : ''
                        };
                        Vue.http.put('/api/v2/registration/project/3/teams/' + encodeURIComponent(comp.team.id) + '/players', data)
                            .then(function(resp) {
                                if (resp.data.id) {
                                    data.id = resp.data.id;
                                }
                                comp.$emit("close", { team: comp.team, player: data });
                            })
                            .catch( function (err) {
                                Dialog.open('general/error-message', {
                                    caption: "פעולה נכשלה",
                                    message: typeof err.body === "string" ? err.body : "שגיאה בשמירת קבוצה"
                                });
                            });
                    }
                }).catch( function (err) {
                    Dialog.open('general/error-message', {
                        caption: "פעולה נכשלה",
                        message: typeof err.body === "string" ? err.body : "שגיאה בשמירת קבוצה"
                    });
                });
            },
            validateForm: function () {

                var player = this.player;

                return (player.firstName != '' ) &&
                (player.lastName != '') &&
                (player.idNumberType !== '') &&
                (player.idNumber != '') &&
                (player.yearOfBirth && this.validYear) &&
                (player.gender !== undefined &&
                this.isValidIdNumber())
                    ? true : false;

            }
        }
    });

    return PelePlayerDialogComponent;
});