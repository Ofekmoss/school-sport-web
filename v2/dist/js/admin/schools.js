define(["templates/admin", "utils", "dialog", "services/access", "consts", "components/multiselect", "generic/data-table"],
    function (templates, utils, Dialog, Access, consts) {

        function readSchools(comp) {
            var query = parseInt(comp.competitionType) === 1 ? "clubs=1" : "league=1";
            if (comp.season) {
                query += '&season=' + comp.season;
            }
            if (comp.region >= 0) {
                query += '&region=' + comp.region;
            }
            comp.schools = [];
            Vue.http.get('/api/v2/admin/schools?' + query).then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    var school = resp.body[i];
                    //console.log(school);
                    if (school.isClub) {
                        school.schoolSummaryLink = '/api/v2/registration/club/summary/download/' +
                            ['school', school.id, comp.season, 'summary'].join('-') + '.pdf';
                    }
                    comp.schools.push(school);
                }
            }, function (err) {
                console.log(err);
            });
        }

        function readSeasons(comp) {
            comp.seasons.splice(0, comp.seasons.length);
            Vue.http.get('/api/v2/manage/seasons').then(function (resp) {
                for (var i = 0; i < resp.body.length; i++) {
                    comp.seasons.push(resp.body[i]);
                }
                Vue.http.get('/api/v2/cache?key=season').then(function (resp) {
                    var cachedSeason = resp.body.Value;
                    if (cachedSeason != null) {
                        comp.season = cachedSeason;
                    } else {
                        Vue.http.get('/api/v2/season').then(function (resp) {
                            var curSeason = resp.body.season;
                            if (curSeason) {
                                comp.season = curSeason;
                            }
                        });
                    }
                });
            });
        }

        function readRegions(comp) {
            comp.regions = [];
            comp.regions.push({
                id: null,
                name: 'כל המחוזות'
            });
            Vue.http.get('/api/v2/regions').then(function (resp) {
                //console.log(resp);
                for (var i = 0; i < resp.body.length; i++) {
                    var region = resp.body[i];
                    //console.log(region);
                    comp.regions.push(region);
                }
                if (Access.user.region > 0) {
                    comp.region = Access.user.region;
                }
                comp.updateCaption();
            }, function (err) {
                console.log(err);
            });
        }

        function generateTokenLinkItem(entityName, caption) {
            return {
                key: 'tokens.' + entityName + '.Token',
                name: 'לינק ' + caption,
                active: false,
                getter: function(school) {
                    if (school.tokens && school.tokens[entityName]) {
                        var token = school.tokens[entityName].Token || '';
                        if (token.length > 0)
                            return 'קיים';
                            //'קיים, בתוקף עד ' + utils.formatDate(school.tokens[entityName].Expiration);
                    }
                    return 'לא קיים לינק';
                },
                link: function(school) {
                    if (school.tokens && school.tokens[entityName]) {
                        var token = school.tokens[entityName].Token || '';
                        if (token.length > 0)
                            return 'https://www.schoolsport.org.il/v2/#/login?token=' + token;
                    }
                    return null;
                }
            };
        }

        var allColumns = [
            {
                key: 'name',
                name: 'שם בית ספר',
                active: true
            },
            {
                key: 'symbol',
                name: 'סימול בית ספר',
                active: true
            },
            {
                key: 'region.name',
                name: 'מחוז',
                active: true
            },
            {
                key: 'city.name',
                name: 'רשות',
                active: true
            },
            generateTokenLinkItem('Principal', 'מנהל'),
            {
                key: 'tokens.Principal.Code',
                name: 'סיסמת מנהל',
                active: false,
                type: 'password'
            },
            generateTokenLinkItem('Representative', 'נציג רשות'),
            {
                key: 'tokens.Representative.Code',
                name: 'סיסמת נציג רשות',
                active: false,
                type: 'password'
            },
            {
                key: 'gradeType',
                name: 'הגדרת כיתות',
                active: true
            },
            {
                key: 'address',
                name: 'כתובת',
                active: true
            },
            {
                key: 'phoneNumber',
                name: 'טלפון',
                active: true
            },
            {
                key: 'fax',
                name: 'פקס',
                active: true
            },
            {
                key: 'email',
                name: 'מייל',
                active: true
            },
            {
                key: 'principal.name',
                name: 'שם מנהל/ת בית הספר',
                active: true
            },
            {
                key: 'principal.phoneNumber',
                name: 'טלפון מנהל/ת בית הספר',
                active: true
            },
            {
                key: 'principal.email',
                name: 'מייל מנהל/ת בית הספר',
                active: true
            },
            {
                key: 'chairman.name',
                name: 'שם יו"ר',
                active: true
            },
            {
                key: 'chairman.phoneNumber',
                name: 'טלפון יו"ר',
                active: true
            },
            {
                key: 'chairman.email',
                name: 'מייל יו"ר',
                active: true
            },
            {
                key: 'coordinator.name',
                name: 'שם רכז/ת מועדון',
                active: true,
                clubOnly: true
            },
            {
                key: 'coordinator.phoneNumber',
                name: 'טלפון רכז/ת מועדון',
                active: true,
                clubOnly: true
            },
            {
                key: 'coordinator.email',
                name: 'מייל רכז/ת מועדון',
                active: true,
                clubOnly: true
            },
            {
                key: 'representative.name',
                name: 'שם נציג ברשות',
                active: true
            },
            {
                key: 'representative.phoneNumber',
                name: 'טלפון נציג ברשות',
                active: true
            },
            {
                key: 'representative.email',
                name: 'מייל נציג ברשות',
                active: true
            },
            {
                key: 'association.set',
                name: 'האם המועדון משויך לעמותה?',
                active: true,
                clubOnly: true
            },
            {
                key: 'association.approved',
                name: 'אישור ניהול תקין לעמותה?',
                active: true,
                clubOnly: true
            },
            {
                key: 'association.number',
                name: 'מספר עמותה',
                active: true,
                clubOnly: true
            },
            {
                key: "schoolSummaryLink",
                name: 'אסמכתא',
                type: 'link',
                active: true
            },
            {
                key: "id",
                name: 'התחברות',
                type: 'login',
                active: true
            }
        ];

        var SchoolsComponent = Vue.extend({
            template: templates["schools"],
            props: {
                region: {}
            },
            data: function () {
                return {
                    tabName: "כללי",
                    caption: "בתי ספר",
                    competitionType: 1,
                    teams: [],
                    schools: [],
                    columns: allColumns,
                    sports: [],
                    seasons: [],
                    season: null,
                    searchText: "",
                    isSelectAll: false,
                    selectedSchools: [],
                    regions: []
                };
            },
            mounted: function () {
                readSchools(this);
                readRegions(this);
                readSeasons(this);
            },
            watch: {
                competitionType: function () {
                    if (parseInt(this.competitionType) === 1) {
                        this.columns = allColumns;
                    } else {
                        this.columns = allColumns.filter(function(x) {
                            return !x.clubOnly;
                        });
                    }
                    readSchools(this);
                },
                region: function () {
                    this.updateCaption();
                    readSchools(this);
                },
                season: function() {
                    readSchools(this);
                }
            },
            methods: {
                updateCaption: function () {
                    var caption = "בתי ספר";
                    if (this.region > 0 && this.regions) {
                        for (var n = 0; n < this.regions.length; n++) {
                            var region = this.regions[n];
                            if (region.id == this.region) {
                                caption += " - " + region.name;
                                break;
                            }
                        }
                    }
                    this.caption = caption;
                },
                handleSelectionChange: function () {
                    this.selectedSchools.splice(0, this.selectedSchools.length);
                    for (var i = 0; i < this.schools.length; i++) {
                        var school = this.schools[i];
                        if (school.selected) {
                            this.selectedSchools.push(school);
                        }
                    }
                },
                generateClubReport: function() {
                    var comp = this;
                    var query = parseInt(this.competitionType) === 1 ? "clubs=1" : "league=1";
                    if (comp.season) {
                        query += '&season=' + comp.season;
                    }
                    if (this.region >= 0) {
                        query += '&region=' + this.region;
                    }
                    Vue.http.get('/api/v2/admin/schools/clubReport?' + query).then(function (resp) {
                        //console.log(resp.body);
                        utils.excelReport(resp.body.FileName, null, null, resp.body.Rows);
                        /*
                        var excelFileName = resp.body;
                        var excelUrl = '/content/' + encodeURIComponent(excelFileName);
                        utils.SaveToDisk(excelUrl, excelFileName);
                         */
                    }, function (err) {
                        console.log(err);
                    });

                }
            }
        });

        return SchoolsComponent;
    });