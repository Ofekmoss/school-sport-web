define ([], function() {

    var grades = [{id : 1, name: 'א'}, {id : 2, name: 'ב'}, {id : 3, name: 'ג'}, {id : 4, name: 'ד'},
        {id : 5, name: 'ה'}, {id : 6, name: 'ו'}, {id : 7, name: 'ז'}, {id : 8, name: 'ח'},
        {id : 9, name: 'ט'}, {id : 10, name: 'י'}, {id : 11, name: 'י"א'}, {id : 12, name: 'י"ב'}];

    function getGradeText(grade) {
        return grade >= 0 && grade < grades.length ? grades[grade].name : '';
    }

    function getGenderText(value) {
        if (value === null || value === 0) {
            return '';
        }

        return value === 1 ? 'בן' : 'בת';
    }

    function getDateText(value) {
        if (value) {
            value = new Date(value);
            if (isNaN(value)) {
                return null;
            }
            return ('0' + value.getDate()).slice(-2) + "/" +
                ('0' + (value.getMonth() + 1)).slice(-2) + "/" +
                ('000' + value.getFullYear()).slice(-4);
        }
        return value;
    }

    return {
        getDateText: getDateText,
        getChampionships: function(filters) {
            var query = '';
            if (filters) {
                if (filters.region !== null && filters.region >= 0) {
                    if (query.length > 0)
                        query += '&';
                    query += 'region=' + filters.region;
                }
                if (filters.sport !== null && filters.sport > 0) {
                    if (query.length > 0)
                        query += '&';
                    query += 'sport=' + filters.sport;
                }
            }

            return Vue.http.get('/api/v2/manage/championships?' + query).then(function(result) {
                return result.data.filter(function(championship) {
                    return true; //championship.Status > 0;
                }).map(function(championship){
                    championship.IsOpen = championship.IsOpen ? 'פתוחה' : 'סגורה';
                    if (championship.Dates) {
                        championship.Dates.LastRegistration = getDateText(championship.Dates.LastRegistration);
                        championship.Dates.Start = getDateText(championship.Dates.Start);
                        championship.Dates.End = getDateText(championship.Dates.End);
                        championship.Dates.AltStart = getDateText(championship.Dates.AltStart);
                        championship.Dates.AltEnd = getDateText(championship.Dates.AltEnd);
                        championship.Dates.Finals = getDateText(championship.Dates.Finals);
                        championship.Dates.AltFinals = getDateText(championship.Dates.AltFinals);
                    }
                    championship.id = championship.Id;
                    championship.name = championship.Name;
                    championship.isClubs = championship.IsClub;
                    championship.isLeague = championship.IsLeague;
                    championship.isOpen = championship.IsOpen;
                    championship.status = championship.Status;
                    return championship;
                });
            });
        },
        getTeams: function(filters) {
            var query = '';
            /* if (!filters && !filters.championship) {
                return;
            } */

            if (filters.championship) {
                query += 'championship=' + filters.championship;
            }

            if (filters.category) {
                query += '&category=' + filters.category;
            }

            if (typeof filters.region !== 'undefined' && filters.region != null) {
                query += '&region=' + filters.region;
            }

            if (filters.sport) {
                query += '&sport=' + filters.sport;
            }

            var url = '/api/v2/manage/teams?' + query;
            return Vue.http.get(url).then(function(res){
                return res.data.map(function(team){

                    if (team.Coach ) {
                        team.Coach.certification = team.Coach.Certification === null ? '' : team.Coach.Certification ? 'כן' : 'לא';
                    }
                    if (team.CreatedAt != null) {
                        team.createdAt = getDateText(team.CreatedAt);
                        team.CreatedAt = new Date(team.CreatedAt);
                    }
                    team.registrationDate = getDateText(team.RegistrationDate);
                    team.RegistrationDate = new Date(team.RegistrationDate);
                    if (team.ConfirmationDate != null) {
                        team.confirmationDate = getDateText(team.ConfirmationDate);
                        team.ConfirmationDate = new Date(team.ConfirmationDate);
                    }
                    if (team.AdminStatus){
                        team.AdminStatus_value = [{
                            Id: 0,
                            Name: 'לא פעילה',
                        }, {
                            Id: 1,
                            Name: 'קבוצה פעילה',
                        }, {
                            Id: 2,
                            Name: 'מאושרת על ידי רכז התאחדות',
                        }][team.AdminStatus].Name;
                    }
                    return team;
                });
            });
        },
        getTeamNumbers: function(categoryId, schoolId) {
            var url = '/api/v2/manage/teams/' + categoryId + '/' + schoolId + '/team-numbers';
            return Vue.http.get(url).then(function(res) {
                return res.data.map(function (x) {
                    return x;
                });
            });
        },
        getSchoolRegistrationData: function(schoolId) {
            var url = '/api/v2/manage/schools/' + schoolId;
            return Vue.http.get(url).then(function(res) {
                return res.data.Registration;
            });
        },
        getPlayers: function(params) {
            if (!params.team) {
                return Promise.reject("missing team id");
            }

            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/players?' + query.join('&')).then(function(res) {
                return res.data.map(function (player) {
                    if (player.Student) {
                        player.Student.Grade = getGradeText(player.Student.Grade);
                        player.Student.Gender = getGenderText(player.Student.Gender);
                        player.BirthDate = getDateText(player.Student.BirthDate);
                    }
                    if (player.Player) {
                        player.Player.RegistrationDate = getDateText(player.Player.RegistrationDate);
                        switch (player.Player.AdminStatus) {
                            case 3 :
                                player.Status = 'לא מאושר';
                                if (player.Remarks)
                                    player.Status += ' (' + player.Remarks + ')';
                                break;
                            case 2 :
                                player.Status = 'מאושר';
                                break;
                            case 1 :
                                player.Status = 'רשום';
                                break;
                        }
                    }
                    if (player.Student && player.Student.School && player.Student.School.Name) {
                        player.TeamName = player.Student.School.Name + (player.TeamNumber || ' - ' + player.TeamNumber);
                    }
                    return player;
                });
            });
        },
        getStudents: function(filters) {
            var self = this;

            var query = '';
            if (!filters || !filters.school) {
                return;
            }

            query += 'school=' + filters.school;

            return Vue.http.get('/api/v2/manage/students?' + query).then(function(result) {
                result.data = result.data.filter(function(student){
                    return student.Grade <= 14
                }).map(function(student){
                    student.Grade = getGradeText(student.Grade);
                    student.BirthDate = getDateText(student.BirthDate);
                    student.Gender = getGenderText(student.Gender);
                    return student;
                });
                return result;
            });
        },
        getRegions: function(){
            return Vue.http.get('/api/v2/manage/regions').then(function(res) {
                return res.data.map(function(region){
                    region.id = region.Id;
                    region.name = region.Name;
                    return region;
                });
            });
        },
        getRegionsWithChampionships: function(){
            return Vue.http.get('/api/v2/manage/regions?withchampionships=1').then(function(res) {
                return res.data.map(function(region){
                    region.id = region.Id;
                    region.name = region.Name;
                    return region;
                });
            });
        },
        getSeasons: function(){
            return Vue.http.get('/api/v2/manage/seasons').then(function(res) {
                return res.data.map(function(season){
                    season.id = season.Id;
                    season.name = season.Name;
                    return season;
                });
            });
        },
        getSports: function(region){
            var q = '';
            if (region !== undefined) {
                q = 'region=' + region;
            }
            return Vue.http.get('/api/v2/manage/sports?' + q).then(function(res) {
                return res.data.map(function(sport){
                    sport.id = sport.Id;
                    sport.name = sport.Name;
                    return sport;
                });
            });
        },
        getSportsWithChampionships: function(region){
            var q = 'withchampionships=1';
            if (region !== undefined) {
                q += '&region=' + region;
            }
            return Vue.http.get('/api/v2/manage/sports?' + q).then(function(res) {
                return res.data.map(function(sport){
                    sport.id = sport.Id;
                    sport.name = sport.Name;
                    return sport;
                });
            });
        },
        getCategoryNames: function(region, sport, season){
            var qParams = [];
            if (region !== undefined && region != null) {
                qParams.push('region=' + region);
            }
            if (sport !== undefined && sport != null) {
                qParams.push('sport=' + sport);
            }
            if (season !== undefined && season != null) {
                qParams.push('season=' + season);
            }
            return Vue.http.get('/api/v2/manage/category-names?' + qParams.join('&')).then(function(res) {
                return res.data.map(function(category){
                    return {
                        id: category.Id,
                        name: category.Name
                    };
                });
            });
        },
        getCategories: function(filters){
            var query = '';
            if (!filters || !filters.championship) {
                return;
            }

            query += 'championship=' + filters.championship;

            return Vue.http.get('/api/v2/manage/categories?' + query).then(function(res){
                return res.data;
            });
        },
        getSchools: function(filters) {
            var query = '';

            if (filters) {
                if (filters.region >= 0) {
                    if (query.length > 0)
                        query += '&';
                    query += 'region=' + filters.region;
                }
                if (filters.city > 0) {
                    if (query.length > 0)
                        query += '&';
                    query += 'city=' + filters.city;
                }
            }

            return Vue.http.get('/api/v2/manage/schools?' + query).then(function(res){
                return res.data.map(function(item){
                    item.id = item.Id;
                    item.name = item.Name;
                    item.symbol = item.Symbol;
                    return item;
                });
            });
        },
        getCities : function(filters) {
            var query = '';

            if (filters) {
                if (filters.region >= 0) {
                    if (query.length > 0)
                        query += '&';
                    query += 'region=' + filters.region;
                }
            }

            return Vue.http.get('/api/v2/cities?' + query).then(function(res){
                return res.data;
            });
        },
        getGrades: function() {
            return grades;
        },

        getFacilities: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });
            return Vue.http.get('/api/v2/manage/facilities?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getEvents: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/upcoming-events?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getGeneralData: function() {
            return Vue.http.get('/api/v2/general-data').then(function(res){
                return res.data;
            });
        },
        deleteTeam: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });
            return Vue.http.delete('/api/v2/manage/teams?' + query.join('&'));
        },
        deletePlayer: function(playerId) {
            if (!playerId) {
                return;
            }

            return Vue.http.delete('/api/v2/manage/players/' + playerId);
        },
        editTeam: function(team) {
            return Vue.http.put('/api/v2/manage/teams', team);
        },
        addTeam: function(team) {
            return Vue.http.post('/api/v2/manage/teams', team);
        },
        getDashboardData: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getUsers: function(params) {
            var q = '';
            if (params.type) {
                q += 'type=' + params.type;
            }

            return Vue.http.get('/api/v2/manage/users?' + q).then(function(res){
                return res.data;
            });
        },
        getPeleAppliedTeamsBySport: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard/pele/sports-all-teams?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getPeleApprovedTeamsBySport: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard/pele/sports-approved-teams?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getTeamsByRegion: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard/pele/regions?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getTeamsByCity: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard/pele/cities?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getApprovedPlayersBySport: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard/pele/sports-all-players?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getPelePlayersBySport: function(params) {
            var query = [];
            Object.keys(params).forEach(function(key) {
                if (params[key] !== null) {
                    query.push(key + '=' + params[key]);
                }
            });

            return Vue.http.get('/api/v2/manage/dashboard/pele/sports-pele-players?' + query.join('&')).then(function(res){
                return res.data;
            });
        },
        getTeamsCount: function(){
            return Vue.http.get('/api/v2/manage/teams/counts').then(function(res) {
                return res.data;
            });
        },
    }
});