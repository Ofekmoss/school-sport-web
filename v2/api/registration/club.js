var express = require('express');
var fs = require('fs');
const axios = require('axios');
var settings = require('../../../settings');
var logger = require('../../../logger');
var util = require('../util');
var PDF = require('../../processes/utils');
var multipart = require('../multipart');
var seasons = require('../../../api/seasons');

var Registration = settings.v2test ? require('../../test/registration/club') : require('../../models/registration');
var Schools = settings.v2test ? require('../../test/schools') : require('../../models/schools');
var Teams = settings.v2test ? require('../../test/admin/teams') : require('../../models/admin/teams');
var Access = settings.v2test ? require('../../test/access') : require('../../models/access');
var Season = settings.v2test ? require('../../test/season') : require('../../models/season');
var digitalSignature =  require('../../models/digital-signature');
const https = require("https");
const {cli} = require("winston");

var router = express.Router();

//require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();

router.get('/', util.requireSchoolLogin, function (req, res) {
    Registration.getClubRegistrationStage(req.session.user, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/details', util.requireSchoolLogin, function (req, res) {
    Registration.getClubRegistrationDetails({ user: req.session.user }, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/basic-prices', util.requireSchoolLogin, function (req, res) {
    Registration.getBasicPrices(req.session.user, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/first-confirmation-approval', util.requireSchoolLogin, function (req, res) {
    if (req.session.user && req.session.user.username) {
        Registration.approveFirstConfirmation(req.session.user.schoolID, function (err, result) {
            util.sendResult(res, err, result);
        });
    }
});

router.post('/details', util.requireSchoolLogin, function (req, res) {
    if (req.session.user && req.session.user.username) {
        Access.validate(req.session.user.username, req.body.password, function (err, result) {
            if (err) {
                util.sendResult(res, err);
            } else if (result) {
                Registration.setClubRegistrationDetails(req.session.user.id, req.session.user.schoolID, req.body, function (err, result) {
                    util.sendResult(res, err, result);
                });
            } else {
                res.status(401).send("כישלון באימות משתמש");
            }
        })
    }
});

router.get('/competitions', util.requireSchoolOrCityLogin, function (req, res) {
    Registration.getCompetitions(req.session.user, {club: true}, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.get('/teams', util.requireSchoolLogin, function (req, res) {
    Season.current(req.session.user, function(currentSeason) {
        var season = currentSeason;
        Registration.getClubTeams({user: req.session.user}, function (err, result) {
            // Set teams players files
            if (result == null || !result)
                result = [];
            for (var ti = 0; ti < result.length; ti++) {
                var team = result[ti];
                for (var pi = 0; pi < team.players.length; pi++) {
                    var player = team.players[pi];
                    if (player.student != null) {
                        player.picture = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/picture');
                        player.idSlip = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/id-slip');
                        player.medicalApproval = util.getFilePath(req.session.user.schoolID + '/students/' + player.idNumber + '/' + season + '/medical-approval');
                    }

                }
            }
            //console.log(result);
            util.sendResult(res, err, result);
        });
    });
});

router.post('/teams', util.requireSchoolLogin, function (req, res) {
    Registration.insertClubTeam(req.session.user.schoolID, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/status', function (req, res) {
    Registration.changeClubTeamStatus(req.body.teams, req.body.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.put('/teams/:id', util.requireSchoolLogin, function (req, res) {
    Registration.updateClubTeam(req.session.user.schoolID, parseInt(req.params.id), req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/:id/status', function (req, res) {
    Registration.changeClubTeamStatus(parseInt(req.params.id), req.body.status, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.delete('/teams/:id', util.requireSchoolLogin, function (req, res) {
    logger.log('info', 'School ' + req.session.user.schoolID + ' is deleting team ' + req.params.id);
    Registration.deleteClubTeam(req.session.user.schoolID, parseInt(req.params.id), function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/approve', util.requireSchoolLogin, function (req, res) {
    Registration.approveClubTeams(req.session.user.id, req.session.user.schoolID, 1, function (err, result) {
        Registration.generateApprovalLogins(req.session.user, function() {
            util.sendResult(res, err, result);
        });
    });
});

router.post('/teams/approve/principal', util.requireRole('principal-approval'), util.requireSchoolLogin, function (req, res) {
    var teamIds = req.body || [];
    Registration.approveClubTeams(req.session.user.id, req.session.user.schoolID, 0x2, function (err, result) {
        util.sendResult(res, err, result);
    }, req.session.user, teamIds);
});

router.post('/teams/approve/representative', util.requireRole('representative-approval'), util.requireSchoolLogin, function (req, res) {
    var teamIds = req.body || [];
    Registration.approveClubTeams(req.session.user.id, req.session.user.schoolID, 0x4, function (err, result) {
        util.sendResult(res, err, result);
    }, req.session.user, teamIds);
});

router.get('/payments', util.requireSchoolLogin, function (req, res) {
    Registration.getClubPayments(req.session.user, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/payments/:order/cancel', util.requireSchoolLogin, function (req, res) {
    Registration.cancelOrderPayments(req.session.user.schoolID, req.params.order, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/payment', util.requireSchoolLogin, function (req, res) {
    Registration.insertPayments(req.session.user, req.body, function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.post('/teams/:teamid/players', util.requireSchoolLogin, multipart(), function (req, res) {
    // Converting fields
    Season.current(req.session.user, function(currentSeason) {
        var season = currentSeason;
        if (req.body.external) {
            Registration.requestTransfer(req.session.user, req.body.idNumber,
                parseInt(req.params.teamid), function (err, result) {
                    util.sendResult(res, err, result);
                });
        }
        else {
            var student = JSON.parse(req.body.student);
            student.idNumber = parseInt(student.idNumber);
            var birthDate = new Date(student.birthDate);
            student.birthDate = ('000' + birthDate.getFullYear()).slice(-4) + "-" +
                ('0' + (birthDate.getMonth() + 1)).slice(-2) + "-" +
                ('0' + birthDate.getDate()).slice(-2);
            Registration.upsertTeamPlayer(req.session.user, parseInt(req.params.teamid), student, function (err) {
                if (req.body.picture && req.body.picture.path) {
                    util.moveFile(req.body.picture, req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/picture');
                }
                if (req.body.idSlip && req.body.idSlip.path) {
                    util.moveFile(req.body.idSlip, req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/id-slip');
                }
                if (req.body.medicalApproval && req.body.medicalApproval.path) {
                    util.moveFile(req.body.medicalApproval, req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/medical-approval');
                }
                var result = {
                    picture: util.getFilePath(req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/picture'),
                    idSlip: util.getFilePath(req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/id-slip'),
                    medicalApproval: util.getFilePath(req.session.user.schoolID + '/students/' + student.idNumber + '/' + season + '/medical-approval')
                };

                util.sendResult(res, err, result);
            });
        }
    });
});

router.get('/teams/:teamid/players/download/:filename', util.requireSchoolLogin, function (req, res) {

    var team = req.params.teamid;
    var filename = req.params.filename;
    Registration.getClubTeam(req.session.user, parseInt(team), function (err, teamResult) {
        if (typeof teamResult == 'undefined' || teamResult == null || !teamResult) {
            util.sendResult(res, null, {});
            return;
        }
        Registration.getCompetitions(req.session.user, {club: true}, function(err, competitionsResult){
            Registration.getClubRegistrationDetails({ user: req.session.user }, function (err, schoolResult) {
                var sport = competitionsResult.sports.find(function(s){
                    return s.id == teamResult.sport
                });
                var category = sport.categories.find(function (c) {
                    return c.id == teamResult.competition;
                });
                //console.log(teamResult);
                if (teamResult.maxStudentBirthday) {
                    teamResult.maxStudentBirthday = new Date(teamResult.maxStudentBirthday);
                    teamResult.players = teamResult.players.map(function(player){
                        if ( new Date(player.birthDate) < teamResult.maxStudentBirthday){
                            player.aboveMaxAge = true;
                        }
                        return player;
                    });
                }
                // console.log(teamResult.players);
                var players = teamResult.players.filter(function(player) {
                    return player.status == 2;
                }).map(function(player) {
                    player.grade = getGrade(player.grade);
                    player.originalBirthdate = player.birthDate;
                    if (player.birthDate instanceof Date) {
                        player.birthDate =
                            ('0' + player.birthDate.getDate()).slice(-2) + "/" +
                            ('0' + (player.birthDate.getMonth() + 1)).slice(-2) + "/" +
                            player.birthDate.getFullYear();
                    }
                    return player;
                }).filter(function(player) {
                    var hasGrade = (player.grade || '').length > 0;
                    var hasBirthdate = false;
                    if (player.originalBirthdate != null) {
                        var bDate = new Date(player.originalBirthdate);
                        hasBirthdate = bDate.getFullYear() > 1970;
                    }
                    return hasBirthdate && hasGrade;
                });
                for (var i = 0; i < players.length; i++) {
                    players[i].index = (i + 1);
                }
                if (util.MaxTeamPlayers) {
                    players = players.slice(0, util.MaxTeamPlayers);
                }
                while (players.length < util.MaxTeamPlayers) {
                    players.push({
                        index: players.length + 1,
                        shirtNumber: '',
                        firstName: '',
                        lastName: '',
                        birthDate: '',
                        idNumber: '',
                        grade: ''
                    });
                }
                var catParts = category ? category.name.split(' ') : ['', ''];
                //console.log(teamResult);
                var schoolName = schoolResult.school.name;
                if (teamResult.teamNumber != null && teamResult.teamNumber.length > 0) {
                    schoolName += ' קבוצה '+ teamResult.teamNumber;
                    if (teamResult.teamNumber.length === 1 &&
                        teamResult.teamNumber >= 'א' &&
                        teamResult.teamNumber <= 'ת') {
                        schoolName += "'";
                    }
                }
                var data = {
                    sport: sport.name,
                    championshipName: category.championshipName,
                    category: category ? category.name : "",
                    categoryGrades: catParts[0],
                    categoryGender: catParts[1],
                    season: category.season,
                    year: 2020,
                    schoolName: schoolName,
                    schoolRegion: schoolResult.school.region,
                    schoolSymbol: schoolResult.school.symbol,
                    schoolAddress: schoolResult.school.address,
                    schoolPhone: schoolResult.school.phoneNumber,
                    schoolFax: schoolResult.school.fax,
                    schoolZipCode: schoolResult.school.zipCode,
                    schoolEmail: schoolResult.school.email,
                    principalName: schoolResult.principal.name,
                    teacherCaption: 'רכז/ת מועדון',
                    teacherName: teamResult.coordinator.name,
                    teacherPhone: teamResult.coordinator.phoneNumber,
                    teacherEmail: teamResult.coordinator.email,
                    coachName: teamResult.coach.name,
                    coachPhone: teamResult.coach.phoneNumber,
                    coachEmail: teamResult.coach.email,
                    players: players
                };

                data.logo = fs.readFileSync('v2/templates/images/PDF-logo.png', {encoding: 'base64'});
                PDF.createPDF('PlayersReportTemplate.html', null, data).then(function (buffer) {
                    //fs.writeFileSync(filename, buffer);
                    delete data.logo; // no need to store it
                    res.setHeader('Content-type', 'application/pdf');
                    res.setHeader('Content-disposition', 'inline; filename"' + filename + '"');
                    util.sendResult(res, null, buffer);
                });
            });
        });
    });
});

router.get('/summary/download/:filename', util.requireSchoolLogin, function (req, res) {
    function BuildGenderCaption(gender, maleCaption, femaleCaption, defaultCaption) {
        var caption = defaultCaption;
        switch (gender) {
            case 1:
                caption = maleCaption;
                break;
            case 2:
                caption = femaleCaption;
                break;
        }
        return caption;
    }

    function GenderPrefix(gender) {
        return "";
    }

    var filename = req.params.filename;
    var startSignProcess = req.query.sign === '1';
    var downloadSignedFile = req.query.download === '1';
    var schoolId = req.session.user.schoolID;
    Season.current(req.session.user, function(currentSeason) {
        var isAdmin = req.session.user.roles && req.session.user.roles.indexOf('admin') >= 0;
        if (isAdmin) {
            //admin takes school and season from URL
            var tmp = filename.split('-');
            schoolId = parseInt(tmp[1], 10);
            if (tmp.length > 3) {
                var adminSeason = parseInt(tmp[2], 10);
                if (!isNaN(adminSeason) && adminSeason > 0)
                    currentSeason = adminSeason;
            }
        }
        console.log('creating summary document for school ' + schoolId + ', season ' + currentSeason);
        Schools.getClubConfirmations(currentSeason, schoolId, function(err, clubConfirmations) {
            if (err) {
                util.sendResult(res, err, {});
                return;
            }
            //console.log(clubConfirmations);
            var coordinatorApprovalDate = clubConfirmations['club-details'];
            var representativeApprovalDate = clubConfirmations['representative-teams'];
            var principalApprovalDate = clubConfirmations['principal-teams'];
            var principalSignature = util.repeat(' ', 8);
            var principalSeal = util.repeat(' ', 8);
            var representativeSignature = util.repeat(' ', 8);
            var representativeSeal = util.repeat(' ', 8);
            var principalApprovalText = 'הצהרה לא אושרה';
            var representativeApprovalText = 'הצהרה לא אושרה';
            if (principalApprovalDate) {
                principalApprovalText = 'הצהרה אושרה בתאריך ' +
                    util.parseDateTime(principalApprovalDate, 'DD/MM/YYYY') + ' בשעה ' +
                    util.parseDateTime(principalApprovalDate, 'HH:mm');
            }
            if (representativeApprovalDate) {
                representativeApprovalText = 'הצהרה אושרה בתאריך ' +
                    util.parseDateTime(representativeApprovalDate, 'DD/MM/YYYY') + ' בשעה ' +
                    util.parseDateTime(representativeApprovalDate, 'HH:mm');
            }
            var coordinatorApprovalText = coordinatorApprovalDate ? 'הצהרה אושרה בתאריך ' +
                util.parseDateTime(coordinatorApprovalDate, 'DD/MM/YYYY') + ' בשעה ' +
                util.parseDateTime(coordinatorApprovalDate, 'HH:mm')
                : 'הצהרה לא אושרה';
            /*
            if (!isAdmin && !coordinatorApprovalDate) {
                util.sendTextError(res, 'חסר אישור רכז/ת מועדון בית ספרי');
                return;
            }
            if (!isAdmin && !principalApprovalDate) {
                util.sendTextError(res, 'חסר אישור מנהל/ת בית ספר');
                return;
            }
            if (!isAdmin && !representativeApprovalDate) {
                util.sendTextError(res, 'חסר אישור נציג/ת הרשות המקומית');
                return;
            }
            */
            Schools.getClubPaidAmount(currentSeason, schoolId, function(err, totalPaidAmount) {
                if (err) {
                    util.sendResult(res, err, {});
                    return;
                }
                //console.log(totalPaidAmount);
                if (totalPaidAmount == null || isNaN(totalPaidAmount)) {
                    totalPaidAmount = 0;
                }
                var options = {
                    user: req.session.user,
                    school: schoolId,
                    season: currentSeason
                };
                Registration.getClubRegistrationDetails(options, function (err, clubDetails) {
                    if (err || typeof clubDetails == 'undefined' || clubDetails == null || !clubDetails) {
                        util.sendResult(res, err, {});
                        return;
                    }
                    var allClasses = ["א'-ו'", "א'-ח'", "ז'-ט'", "ז'-י\"ב", "ט'-י\"ב", "י'-י\"ב"];
                    var schoolClasses = clubDetails.school.type != null && clubDetails.school.type < allClasses.length ? allClasses[clubDetails.school.type] : null;
                    var associationText = '';
                    if (clubDetails.association.set) {
                        associationText = 'מועדון משויך לעמותה';
                        if (clubDetails.association.number)
                            associationText += ' מספר ' + clubDetails.association.number;
                        associationText += ', ';
                        associationText += clubDetails.association.validForThisYear ? 'קיים אישור ניהול תקין' : 'ללא אישור ניהול תקין';
                    } else {
                        associationText = 'מועדון לא משויך לעמותה';
                    }
                    associationText += '.';
                    if (principalApprovalDate) {
                        principalSignature = clubDetails.principal.name;
                        principalSeal = clubDetails.school.name;
                    }
                    if (representativeApprovalDate) {
                        representativeSignature = clubDetails.representative.name;
                        representativeSeal = clubDetails.school.cityName;
                    }
                    Registration.getClubTeams(options, function (err, clubTeams) {
                        if (err || typeof clubTeams == 'undefined' || clubTeams == null || !clubTeams) {
                            util.sendResult(res, err, {});
                        } else {
                            //console.log(clubTeams);
                            var inspectorApprovalText = '';
                            var teams = clubTeams.map(clubTeam => {
                                return {
                                    sport: clubTeam.sportName,
                                    category: clubTeam.categoryName,
                                    teamNumber: clubTeam.teamNumber,
                                    approved: clubTeam.approved,
                                    paymentAmount: clubTeam.price, //.paymentAmount,
                                    payerName: clubTeam.paymentPayerName,
                                    paymentPaidAmount: clubTeam.paymentPaidAmount,
                                    removePayment: clubTeam.removePayment || false
                                };
                            });
                            //console.log(teams);
                            var supervisorApprovedTeams = teams.filter(function(team) {
                                if (team.approved) {
                                    return (team.approved & Teams.Status.SupervisorApproval) > 0;
                                } else {
                                    return false;
                                }
                            });
                            if (!isAdmin && supervisorApprovedTeams.length === 0) {
                                //util.sendTextError(res, 'חסר אישור מפקח על החינוך הגופני');
                                //return;
                            }
                            if (supervisorApprovedTeams.length === 0) {
                                inspectorApprovalText = 'אין קבוצות מאושרות';
                            } else if (supervisorApprovedTeams.length === 1) {
                                inspectorApprovalText = 'אושרה קבוצה אחת';
                            } else {
                                inspectorApprovalText = 'אושרו ' + supervisorApprovedTeams.length + ' קבוצות';
                            }
                            var totalPayments = 0;
                            var totalPaid = 0;
                            teams.forEach((team, index) => {
                                if (!team.removePayment)
                                    totalPayments += team.paymentAmount;
                                totalPaid += team.paymentPaidAmount;
                                team.displayIndex = index + 1;
                                team.paymentStatus = 'N/A';
                                team.paymentAmountText = team.removePayment ? 'ללא תשלום' : team.paymentAmount;
                                team.paymentClass = team.removePayment ? 'removed-payment' : ''; //'strike-through' : '';
                            });
                            var teamsWithFacility = clubTeams.filter(clubTeam => clubTeam.facilityName != null && clubTeam.facilityName.length > 0);
                            var facilities = teamsWithFacility.map(team => {
                                return {
                                    sport: team.sportName,
                                    category: team.categoryName,
                                    facilityName: team.facilityName,
                                    facilityAddress: team.facilityAddress,
                                    activities: util.parseTeamActivities(team).map(a => {
                                        return {details: a};
                                    }),
                                    hostingHours: util.parseTeamHostingHours(team).map(a => {
                                        return {details: a};
                                    })
                                };
                            });
                            facilities.forEach(f => f.uniqueKey = [f.sport, f.category, f.facilityName, f.facilityAddress, f.activities].join('_'));
                            var facilityMapping = {};
                            facilities.forEach(f => {
                                if (facilityMapping[f.uniqueKey]) {
                                    f.remove = true;
                                } else {
                                    facilityMapping[f.uniqueKey] = true;
                                }
                            });
                            facilities = facilities.filter(f => !f.remove);
                            var logoDetails = [
                                {
                                    file: 'v2/templates/images/physical-education.png',
                                    altText: 'הפיקוח הארצי על החינוך הגופני',
                                    pages: [1, 2, 3]
                                },
                                {
                                    file: 'v2/templates/images/ministry-of-sport.jpeg',
                                    altText: 'משרד התרבות והספורט',
                                    pages: [1, 2, 4]
                                },
                                {
                                    file: 'v2/templates/images/ministry-of-education.jpeg',
                                    altText: 'משרד החינוך',
                                    pages: [1, 2, 3, 4]
                                },
                                {
                                    file: 'v2/templates/images/PDF-logo-2.png',
                                    altText: 'התאחדות הספורט לבתי הספר בישראל',
                                    pages: [1, 2, 3, 4]
                                }
                            ];
                            seasons.GetSeasonDetails(currentSeason).then(function(seasonData) {
                                var data = {
                                    season: seasonData.Name,
                                    year1: new Date(seasonData.FirstDay).getFullYear(),
                                    year2: new Date(seasonData.LastDay).getFullYear(),
                                    classes: schoolClasses,
                                    schoolName: clubDetails.school.name,
                                    schoolCity: clubDetails.school.cityName,
                                    schoolRegion: clubDetails.school.region,
                                    schoolSymbol: clubDetails.school.symbol,
                                    schoolAddress: clubDetails.school.address,
                                    schoolPhone: clubDetails.school.phoneNumber,
                                    schoolFax: clubDetails.school.fax,
                                    schoolZipCode: clubDetails.school.zipCode,
                                    schoolEmail: clubDetails.school.email,
                                    principalName: GenderPrefix(clubDetails.principal.gender) + clubDetails.principal.name,
                                    principalPhone: clubDetails.principal.phoneNumber,
                                    principalEmail: clubDetails.principal.email,
                                    principalGender: clubDetails.principal.gender,
                                    chairmanName: GenderPrefix(clubDetails.chairman.gender) + clubDetails.chairman.name,
                                    chairmanPhone: clubDetails.chairman.phoneNumber,
                                    chairmanEmail: clubDetails.chairman.email,
                                    chairmanGender: clubDetails.chairman.gender,
                                    coordinatorName: GenderPrefix(clubDetails.coordinator.gender) + clubDetails.coordinator.name,
                                    coordinatorPhone: clubDetails.coordinator.phoneNumber,
                                    coordinatorEmail: clubDetails.coordinator.email,
                                    coordinatorGender: clubDetails.coordinator.gender,
                                    representativeName: GenderPrefix(clubDetails.representative.gender) + clubDetails.representative.name,
                                    representativePhone: clubDetails.representative.phoneNumber,
                                    representativeEmail: clubDetails.representative.email,
                                    representativeGender: clubDetails.representative.gender,
                                    associationText: associationText,
                                    principalApprovalText: principalApprovalText,
                                    representativeApprovalText: representativeApprovalText,
                                    coordinatorApprovalText: coordinatorApprovalText,
                                    inspectorApprovalText: inspectorApprovalText,
                                    totalPayments: totalPayments,
                                    totalPaidAmount: totalPaidAmount,
                                    totalDebt: totalPayments - totalPaidAmount,
                                    teams: teams,
                                    facilities: facilities,
                                    principalSignature: principalSignature,
                                    representativeSignature: representativeSignature,
                                    principalSeal: principalSeal,
                                    representativeSeal: representativeSeal
                                };
                                if (settings.clubFormData) {
                                    if (settings.clubFormData.paymentData) {
                                        data.paymentInstallments = settings.clubFormData.paymentData.installments;
                                        data.lastPaymentDate = settings.clubFormData.paymentData.lastPaymentDate;
                                    }
                                }
                                data.principalCaption = BuildGenderCaption(data.principalGender, 'מנהל', 'מנהלת', 'מנהל/ת');
                                data.chairmanCaption = BuildGenderCaption(data.chairmanGender, 'יושב ראש', 'יושבת ראש', 'יושב/ת ראש');
                                data.coordinatorCaption = BuildGenderCaption(data.coordinatorGender, 'רכז מועדון', 'רכזת מועדון', 'רכז/ת מועדון');
                                data.representativeCaption = BuildGenderCaption(data.representativeGender, 'נציג ברשות', 'נציגה ברשות', 'נציג/ה ברשות');
                                data.paymentStyle = data.paymentInstallments ? '' : 'display: none;';
                                logoDetails.forEach(logoDetail => {
                                    try {
                                        logoDetail.imageData = fs.readFileSync(logoDetail.file, {encoding: 'base64'});
                                    }
                                    catch (err) {
                                        logoDetail.imageData = null;
                                        logger.error('Error loading "' + logoDetail.file + '" for club summary: ' + (err.message || err));
                                    }
                                });
                                for (var p = 1; p < 5; p++) {
                                    var dataProperty = 'page' + p + 'Logos'; //page1Logos
                                    data[dataProperty] = logoDetails.filter(logoDetail => logoDetail.pages.indexOf(p) >= 0);
                                }
                                var pdfFileName = 'ClubRegistrationForm-' + schoolId + '-' + currentSeason + '.pdf';
                                var pdfCaption = 'אסמכתא ' + data.schoolName + ' ' + data.season;
                                if (downloadSignedFile) {
                                    var downloadOptions = {
                                        PdfFileName: pdfFileName
                                    };
                                    digitalSignature.download(downloadOptions, function(err, downloadBuffer) {
                                        if (err) {
                                            if (typeof err === 'string') {
                                                util.sendResult(res, {
                                                    status: 400,
                                                    message: err
                                                }, {});
                                            } else {
                                                util.sendResult(res, err, {});
                                            }
                                            return;
                                        }
                                        var inlineFile = pdfFileName.replace('.pdf', '-signed.pdf');
                                        res.setHeader('Content-type', 'application/pdf');
                                        //res.setHeader('Content-length', 198577);
                                        res.setHeader('Content-disposition', 'inline; filename"' + inlineFile + '"');
                                        util.sendResult(res, null, downloadBuffer);
                                    });
                                } else if (startSignProcess) {
                                    var missingEmailMessage = 'מייל $title חסר או לא תקין';
                                    console.log('sending digital signature for school ' + schoolId + ', file ' + filename);
                                    if (!PDF.IsValidEmail(data.principalEmail, false)) {
                                        util.sendResult(res, {
                                            status: 400,
                                            message: missingEmailMessage.replace('$title', 'מנהל בית ספר')
                                        }, {});
                                        return;
                                    }
                                    if (!PDF.IsValidEmail(data.representativeEmail, false)) {
                                        util.sendResult(res, {
                                            status: 400,
                                            message: missingEmailMessage.replace('$title', 'נציג רשות')
                                        }, {});
                                        return;
                                    }
                                    var digitalSignatureContacts = [
                                        {
                                            name: data.principalName,
                                            email: data.principalEmail,
                                            phone: data.principalPhone,
                                            inputField: {
                                                x: 0.299,
                                                y: 0.915,
                                                width: 0.138,
                                                height: 0.047,
                                                page: 1
                                            }
                                        },
                                        {
                                            name: data.representativeName,
                                            email: data.representativeEmail,
                                            phone: data.representativePhone,
                                            inputField: {
                                                x: 0.322,
                                                y: 0.91,
                                                width: 0.126,
                                                height: 0.038,
                                                page: 2
                                            }
                                        }
                                    ];
                                    var digitalSignatureOptions = {
                                        PDF: {
                                            Name: PDF.RemoveQuotes(pdfCaption),
                                            Caption: pdfCaption,
                                            Path: ''
                                        },
                                        contacts: digitalSignatureContacts,
                                        initiator: req.session.user.id
                                    };
                                    PDF.createPDF('ClubSummaryTemplate.html', pdfFileName,
                                        data, 'DigitalSignatureFiles').then(function (pdfFilePath) {
                                        digitalSignatureOptions.PDF.Path = pdfFilePath;
                                        digitalSignature.send(digitalSignatureOptions, function(err, sendResponse) {
                                            if (err) {
                                                util.sendResult(res, err, {});
                                                return;
                                            }
                                            util.sendResult(res, null, sendResponse || 'done');
                                        });
                                    }, function(err) {
                                        util.sendResult(res, null, err.message);
                                    });
                                } else {
                                    PDF.createPDF('ClubSummaryTemplate.html', null, data).then(function (buffer) {
                                        //fs.writeFileSync(filename, buffer);
                                        if (data.logoLeft)
                                            delete data.logoLeft; // no need to store it
                                        if (data.logoRight)
                                            delete data.logoRight; // no need to store it
                                        if (data.logoMiddle)
                                            delete data.logoMiddle; // no need to store it
                                        res.setHeader('Content-type', 'application/pdf');
                                        res.setHeader('Content-disposition', 'inline; filename"' + filename + '"');
                                        util.sendResult(res, null, buffer);
                                    });
                                }
                            }, function(err) {
                                util.sendResult(res, null, err.message);
                            });
                        }
                    });
                });
            });
        });
    });
});

router.get('/teams/:teamid/transfers', util.requireSchoolLogin, function(req, res) {
    Registration.getTransferRequests(req.session.user, parseInt(req.params.teamid), function(err, result) {
        util.sendResult(res, err, result);
    })
});

router.delete('/teams/:teamid/players/:playerid', util.requireSchoolLogin, function (req, res) {
    Registration.deleteTeamPlayer(req.session.user.schoolID, parseInt(req.params.teamid), parseInt(req.params.playerid), function (err, result) {
        util.sendResult(res, err, result);
    });
});

router.delete('/teams/:teamid/transfers/:id', util.requireSchoolLogin, function (req, res) {
    Registration.deleteTransferRequest(req.session.user.schoolID, parseInt(req.params.teamid), parseInt(req.params.id), function (err, result) {
        util.sendResult(res, err, result);
    });
});

function getGrade(grade) {
    return {
        0: "א'",
        1: "ב'",
        2: "ג'",
        3: "ד'",
        4: "ה'",
        5: "ו'",
        6: "ז'",
        7: "ח'",
        8: "ט'",
        9: "י'",
        10: 'י"א',
        11: 'י"ב',
    }[grade]
}

module.exports = router;