var path = require('path');
var Season = require('./season');
var settings = require('../../settings');
var logger = require('../../logger');
var Excel = require('./excel');
var Finance = settings.v2test ? require('./finance') : require('./finance');
var Data = require('./manage/data');

function Schools(db) {
    this.db = db;
}

Schools.prototype.list = async function (options, callback) {
    var connection = null;
    try {
        connection = await this.db.connect();
        var records = await connection.request(
            "Select s.SCHOOL_ID as \"School\", s.SCHOOL_NAME as \"Name\", s.SYMBOL as \"Symbol\", " +
            "   s.REGION_ID as \"Region\", r.REGION_NAME as \"RegionName\", " +
            "   s.CITY_ID as \"City\", c.CITY_NAME as \"CityName\" " +
            "from SCHOOLS as s " +
            "  join REGIONS as r on s.REGION_ID = r.REGION_ID " +
            "  join CITIES as c on s.CITY_ID = c.CITY_ID " +
            "where s.DATE_DELETED is null " +
            (options.region ? " and s.REGION_ID = @region " : "") +
            (options.city ? " and s.CITY_ID = @city " : ""),
            options);

        var schools = records.map(function (x) {
            return {
                id: x.School,
                name: x.Name,
                symbol: x.Symbol,
                region: {
                    id: x.Region,
                    name: x.RegionName
                },
                city: {
                    id: x.City,
                    name: x.CityName
                }
            };
        });

        callback(null, schools);
    }
    catch (err) {
        callback(err);
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};

function ApplyContacts(school, record, fields) {
    fields.forEach(function(field) {
        school[field.toLowerCase()] = {
            name: record[field + 'Name'],
            phoneNumber: record[field + 'PhoneNumber'],
            email: record[field + 'Email']
        };
    });
}

Schools.prototype.getClubConfirmations = function (season, schoolId, callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "Select ConfirmedForm, Max(DateConfirmed) As LatestConfirmationDate " +
                    "From Confirmations " +
                    "Where Season=@season And ConfirmedForm In ('club-details', 'representative-teams', 'principal-teams') And SchoolId=@school " +
                    "Group By ConfirmedForm",
                    {season: season, school: schoolId})
                    .then(
                        function (records) {
                            connection.complete();
                            var clubConfirmations = {};
                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                clubConfirmations[record['ConfirmedForm']] = record['LatestConfirmationDate'];
                            }
                            callback(null, clubConfirmations);
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Schools.prototype.getClubPaidAmount = async function (season, schoolId, callback) {
    var connection = null;
    try {
        connection = await this.db.connect();
        var records = await connection.request(
            "Select Sum(c.PRICE) As TotalPaid " +
            "From CHARGES c Inner Join ACCOUNTS a On c.ACCOUNT_ID=a.ACCOUNT_ID And a.DATE_DELETED Is Null " +
            "   Inner Join CHAMPIONSHIP_CATEGORIES cc On c.CHAMPIONSHIP_CATEGORY=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
            "   Inner Join CHAMPIONSHIPS ch On cc.CHAMPIONSHIP_ID=ch.CHAMPIONSHIP_ID " +
            "Where c.DATE_DELETED Is Null And ch.SEASON=@season And ch.IS_CLUBS=1 And c.[STATUS]=2 And a.SCHOOL_ID=@school",
            {school: schoolId, season: season});
        var paidAmount = 0;
        if (records != null && records.length > 0) {
            paidAmount = records[0]['TotalPaid'];
        }
        callback(null, paidAmount);
    }
    catch (err) {
        logger.error(err);
        callback(null, 0);
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
};

Schools.prototype.listRegistrations = function (season, options, callback) {
    var self = this;
    var db = self.db;
    Data.readTokenLogins(db, season, function(err, schoolTokenMapping) {
        if (err) {
            console.log('Warning: error while reading token logins');
            console.log(err);
        }
        db.connect().then(function (connection) {
            var qs = "Select s.SCHOOL_ID, s.SYMBOL, s.REGION_ID, s.CLUB_STATUS, sr.Club, " +
                "   Case sr.[Type] When 0 Then 'א''-ו''' When 1 Then 'א''-ח''' When 2 Then 'ז''-ט''' When 3 Then 'ז''-י\"ב' When 4 Then 'ט''-י\"ב' When 5 Then 'י''-י\"ב' Else '' End As GradeType, " +
                "   sr.[Name] as SchoolName, sr.PhoneNumber As SchoolPhoneNumber, sr.Fax As SchoolFax, sr.Email As SchoolEmail, sr.[Address] As SchoolAddress, " +
                "   sr.PrincipalName, sr.PrincipalPhoneNumber, sr.PrincipalEmail, " +
                "   sr.ChairmanName, sr.ChairmanPhoneNumber, sr.ChairmanEmail, " +
                "   sr.CoordinatorName, sr.CoordinatorPhoneNumber, sr.CoordinatorEmail, " +
                "   sr.RepresentativeName, sr.RepresentativePhoneNumber, sr.RepresentativeEmail, " +
                "   sr.TeacherName, sr.TeacherPhoneNumber, sr.TeacherEmail, " +
                "   sr.ParentsCommitteeName, sr.ParentsCommitteePhoneNumber, sr.ParentsCommitteeEmail, " +
                "   sr.StudentsRepresentativeName, sr.StudentsRepresentativePhoneNumber, sr.StudentsRepresentativeEmail, " +
                "   sr.AssociationRepresentativeName, sr.AssociationRepresentativePhoneNumber, sr.AssociationRepresentativeEmail, " +
                "   sr.AssociationValidApproval, sr.AssociationNumber, r.REGION_NAME, " +
                "   c.CITY_ID, c.CITY_NAME, " +
                "   u.USER_ID As SchoolUserId " +
                "From SchoolRegistrations sr Inner Join SCHOOLS s On sr.[School]=s.SCHOOL_ID And s.DATE_DELETED Is Null " +
                "   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null " +
                "   Left Join USERS u On u.SCHOOL_ID=s.SCHOOL_ID And u.USER_TYPE=2 And u.DATE_DELETED Is Null " +
                "   Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null " +
                "Where sr.[Season]=@season" +
                (options.region ? " and s.REGION_ID = @region" : "") +
                (options.clubs ? " and sr.Club = 1" : "") +
                (options.league ? " and sr.League = 1" : "");
            var queryParams = {
                season: season,
                region: options.region
            };
            connection.request(qs, queryParams).then(function (records) {
                var schoolRegistrations = [];
                var schoolIdMapping = {};
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    var associationNumber = record['AssociationNumber'] || '';
                    //console.log(record);
                    var schoolRegistration = {
                        id: record.SCHOOL_ID,
                        name: record['SchoolName'],
                        symbol: record['SYMBOL'],
                        //region: record['REGION_ID'],
                        isClub: record['CLUB_STATUS'] == 1 || record['Club'] == 1,
                        phoneNumber: record['SchoolPhoneNumber'],
                        fax: record['SchoolFax'],
                        email: record['SchoolEmail'],
                        address: record['SchoolAddress'],
                        gradeType: record['GradeType'],
                        user: record['SchoolUserId'],
                        association: {
                            set: associationNumber.length > 0 ? 'כן' : 'לא',
                            number: associationNumber,
                            approved: record['AssociationValidApproval'] == 1 ? 'כן' : 'לא'
                        },
                        region: {
                            id: record['REGION_ID'],
                            name: record['REGION_NAME']
                        },
                        city: {
                            id: record['CITY_ID'],
                            name: record['CITY_NAME']
                        }
                    };
                    schoolIdMapping[schoolRegistration.id.toString()] = true;
                    if (schoolTokenMapping != null) {
                        var key = schoolRegistration.id.toString();
                        var mapping = schoolTokenMapping[key];
                        if (mapping) {
                            schoolRegistration.tokens = {
                                Principal: mapping['principal'] || '',
                                Representative: mapping['representative'] || ''
                            };
                        }
                    }
                    ApplyContacts(schoolRegistration, record,
                        ['Principal', 'Chairman', 'Coordinator', 'Representative',
                            'Teacher', 'ParentsCommittee', 'StudentsRepresentative', 'AssociationRepresentative']);
                    schoolRegistrations.push(schoolRegistration);
                }

                if (schoolRegistrations.length > 0) {
                    //read digital signatures
                    qs = "Select PdfFileName, PdfCaption, ComsignDocumentId, DateCreated, DateLastSigned " +
                        "From DigitalSignatures Where PdfFileName In ('" +
                        Object.keys(schoolIdMapping).map(schoolId =>
                            'ClubRegistrationForm-' + schoolId + '-' + season + '.pdf').join("', '") +
                        "')";
                    connection.request(qs, queryParams).then(function (digitalSignatureRecords) {
                        connection.complete();
                        var recordSchoolMapping = {};
                        for (var i = 0; i < digitalSignatureRecords.length; i++) {
                            var digitalSignatureRecord = digitalSignatureRecords[i];
                            var tmp = digitalSignatureRecord.PdfFileName.split('-');
                            recordSchoolMapping[tmp[1].toString()] = digitalSignatureRecord;
                        }
                        schoolRegistrations.forEach(schoolRegistration => {
                            var matchingDigitalSignatureRecord = recordSchoolMapping[schoolRegistration.id.toString()];
                            if (matchingDigitalSignatureRecord) {
                                schoolRegistration.digitalSignatureDetails = {
                                    PdfFileName: matchingDigitalSignatureRecord.PdfFileName,
                                    PdfCaption: matchingDigitalSignatureRecord.PdfCaption,
                                    DocumentId: matchingDigitalSignatureRecord.ComsignDocumentId,
                                    DateCreated: matchingDigitalSignatureRecord.DateCreated,
                                    DateLastSigned: matchingDigitalSignatureRecord.DateLastSigned
                                };
                            }
                        });
                        callback(null, schoolRegistrations);
                    }, function (err) {
                        connection.complete();
                        callback(err);
                    });
                } else {
                    //empty
                    connection.complete();
                    callback(null, schoolRegistrations);
                }
            }, function (err) {
                connection.complete();
                callback(err);
            });
        }, function (err) {
            callback(err);
        });
    });
};

Array.prototype.distinct = function(field) {
    if (typeof field === 'undefined')
        field = null;
    let distinctItems = [];
    let mapping = {};
    this.forEach(item => {
        let rawValue = field ? item[field] : item;
        const key = rawValue == null ? '' : rawValue.toString();
        if (!mapping[key]) {
            distinctItems.push(item);
            mapping[key] = true;
        }
    });
    return distinctItems;
};

Array.prototype.sum = function(field) {
    if (typeof field === 'undefined')
        field = null;
    let totalSum = 0;
    this.forEach(item => {
        const rawValue = field ? item[field] : item;
        if (rawValue != null) {
            const numericValue = parseFloat(rawValue);
            if (!isNaN(numericValue)) {
                totalSum += numericValue;
            }
        }
    });
    return totalSum;
};

Schools.prototype.generateClubReport = async function (season, options, callback) {
    var self = this;
    var connection = null;
    if (!options.clubs && !options.league) {
        callback('Must choose clubs or league');
        return;
    }
    options.season = season;
    if (options.clubs)
        options.type = 1;
    else if (options.league)
        options.type = 3;
    Finance.getAccounts(options, async function (err, accounts) {
        if (err) {
            callback(err);
            return;
        }
        var accountSchoolMapping = {};
        if (accounts != null)
        {
            accounts.forEach(account => {
                if (account.school) {
                    accountSchoolMapping[account.school.id.toString()] = {
                        TotalAmount: account.totalAmount,
                        PaidAmount: account.paidAmount
                    };
                }
            });
        }
        try {
            connection = await self.db.connect();
            let regionName = null;
            let records = null;
            let qs = '';
            // await Promise.resolve()
            if (options.region) {
                qs = 'Select REGION_NAME From REGIONS Where REGION_ID=@region And DATE_DELETED Is Null';
                records = await connection.request(qs, {region: options.region});
                if (records != null && records.length > 0)
                    regionName = 'מחוז ' + records[0]['REGION_NAME'];
            } else {
                regionName = 'כל המחוזות';
            }

            // TODO: build actual excel file
            qs = 'Select NAME From SEASONS Where SEASOn=@season And DATE_DELETED Is Null';
            records = await connection.request(qs, {season: season});
            let seasonName = records != null && records.length > 0 ? records[0]['NAME'] : 'N/A';
            var excelFileName = 'דוח מועדונים עונת ' +
                seasonName.replace('"', '') + ' ' + regionName + '.xls';
            var fullExcelPath = path.join(settings.contentRoot, excelFileName);
            console.log('Generating club report, region: ' + options.region + ', clubs? ' + options.clubs + ', league? ' + options.league + ', expected file path: ' + fullExcelPath);
            qs = 'Select s.SCHOOL_ID, s.SCHOOL_NAME, cit.CITY_NAME, cc.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, cm.CATEGORY_NAME, sp.SPORT_ID, sp.SPORT_NAME, ' +
                '   px.TotalAmount As PaymentTotalAmount, 0 As PaymentPaidAmount, c.IS_CLUBS, c.IS_LEAGUE ' +
                'From TeamRegistrations tr Inner Join SchoolRegistrations sr On tr.School=sr.School And sr.Season=@season ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
                '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                '   Left Join PaymentRequests px On tr.Payment=px.Id And px.CancelTime Is Null ' +
                'Where c.SEASON=@season';
            if (options.clubs)
                qs += ' And c.IS_CLUBS=1 And sr.Club=1 '; //And sr.League Is Null ';
            if (options.league)
                qs += ' And c.IS_LEAGUE=1 And sr.League=1 '; // And sr.Club Is Null
            if (options.region)
                qs += ' And c.REGION_ID=@region';
            qs += ' Order By cit.CITY_NAME Asc, s.SCHOOL_NAME Asc';
            records = await connection.request(qs, {season: season, region: options.region || 0 });
            const sports = records.map((record) => ({Id: record['SPORT_ID'], Name: record['SPORT_NAME']})).distinct('Id');
            sports.forEach(sport => {
                sport.categories = records.filter(record => record['SPORT_ID'] == sport.Id).map((record) => ({Id: record['CHAMPIONSHIP_CATEGORY_ID'], Name: record['CATEGORY_NAME']})).distinct('Name');
                sport.categories.sort(function(c1, c2) {
                    var value1 = c1['Name'];
                    var value2 = c2['Name'];
                    if (value1 < value2)
                        return -1;
                    if (value1 > value2)
                        return 1;
                    return 0;
                });
            });
            sports.sort(function(s1, s2) {
                var value1 = s1['Name'];
                var value2 = s2['Name'];
                if (value1 < value2)
                    return -1;
                if (value1 > value2)
                    return 1;
                return 0;
            });
            const schools = records.map((record) => ({Id: record['SCHOOL_ID'], Name: record['SCHOOL_NAME'], City: record['CITY_NAME']})).distinct('Id');
            schools.forEach(school => {
                const matchingRecords = records.filter(record => record['SCHOOL_ID'] == school.Id);
                const categoryPayments = matchingRecords.map((record) => ({CategoryId: record['CHAMPIONSHIP_CATEGORY_ID'], Amount: record['PaymentTotalAmount']})).distinct('CategoryId');
                var matchingAccount = accountSchoolMapping[school.Id.toString()];
                if (matchingAccount) {
                    school.TotalPayment = matchingAccount.TotalAmount;
                    school.TotalPaid = matchingAccount.PaidAmount;
                } else {
                    school.TotalPayment = categoryPayments[0].Amount || 0;
                    school.TotalPaid = matchingRecords[0].PaymentPaidAmount || 0;
                }
                school.TotalRegistrations = matchingRecords.length;
                school.RegistrationMapping = {};
                matchingRecords.forEach(matchingRecord => {
                    const key = matchingRecord['SPORT_ID'] + '_' + matchingRecord['CATEGORY_NAME'];
                    if (!school.RegistrationMapping[key])
                        school.RegistrationMapping[key] = 0;
                    school.RegistrationMapping[key]++;
                });
            });
            var rows = [];
            var cells = ['', '', ''];
            sports.forEach((sport, index) => {
                cells.push(sport.Name);
                for (var i = 0; i < sport.categories.length - 1; i++)
                    cells.push('');
            });
            cells.push('סה"כ');
            cells.push('');
            cells.push('');
            rows.push(cells);
            cells = ['#', 'שם בית ספר', 'רשות מקומית'];
            sports.forEach((sport, sportIndex) => {
                sport.categories.forEach((category, categoryIndex) => {
                    cells.push(category.Name);
                });
            });
            cells.push('');
            cells.push('לתשלום');
            cells.push('שולם');
            rows.push(cells);
            var totalsMapping = {};
            var sportTotals = {};
            schools.forEach((school, schoolIndex) => {
                cells = [(rows.length - 1).toString(), school.Name, school.City];
                sports.forEach((sport, sportIndex) => {
                    sport.categories.forEach((category, categoryIndex) => {
                        const key = sport.Id + '_' + category.Name;
                        var curValue = parseInt(school.RegistrationMapping[key] || '0');
                        cells.push(school.RegistrationMapping[key] || '');
                        totalsMapping[key] = (totalsMapping[key] || 0) + curValue;
                        sportTotals[sport.Id.toString()] = (sportTotals[sport.Id.toString()] || 0) + curValue;
                    });
                });
                cells.push(school.TotalRegistrations);
                cells.push((school.TotalPayment - school.TotalPaid) || '0');
                cells.push(school.TotalPaid || '0');
                totalsMapping['registrations'] = (totalsMapping['registrations'] || 0) + parseInt(school.TotalRegistrations || '0');
                totalsMapping['payment'] = (totalsMapping['payment'] || 0) + parseInt((school.TotalPayment - school.TotalPaid) || '0');
                totalsMapping['paid'] = (totalsMapping['paid'] || 0) + parseInt(school.TotalPaid || '0');
                rows.push(cells);
            });

            //add sum row
            cells = ['', '', 'סה"כ'];
            sports.forEach((sport, sportIndex) => {
                sport.categories.forEach((category, categoryIndex) => {
                    const key = sport.Id + '_' + category.Name;
                    cells.push(totalsMapping[key] || '0');
                });
            });
            cells.push( totalsMapping['registrations'] || '0');
            cells.push(totalsMapping['payment'] || '0');
            cells.push(totalsMapping['paid'] || '0');
            rows.push(cells);

            //sports total
            cells = ['', '', ''];
            sports.forEach((sport, index) => {
                var curTotal = sportTotals[sport.Id.toString()] || 0;
                var curText = curTotal > 0 ? sport.Name + ' (סה"כ: ' + curTotal + ')' : '';
                cells.push(curText);
                for (var i = 0; i < sport.categories.length - 1; i++)
                    cells.push('');
            });
            cells.push('');
            cells.push('');
            cells.push('');
            rows.push(cells);
            callback(null, {
                Rows: rows,
                FileName: excelFileName
            });
        } catch (err) {
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
    /*
        var workbook = Excel.create();
        var sheet = workbook.sheet('Sheet1'); //'דו"ח מועדונים');
        var headerStyle = {
            font: {
                bold: true
            },
            fill: {
                patternType: 'solid',
                fgColor: {rgb: '33CCCC'},
                bgColor: {rgb: '000000'}
            },
            border: {
                bottom: {
                    style: "thin",
                    color: {rgb: '000000'}
                },
                left: {
                    style: "thin",
                    color: {rgb: '000000'}
                }
            }
        };

        var recordStyle = {
            fill: {
                patternType: 'solid',
                fgColor: {rgb: 'FFFFFF'},
                bgColor: {rgb: '000000'}
            },
            border: {
                bottom: {
                    style: "thin",
                    color: {rgb: 'EEEEEE'}
                }
            }
        };

        var percentageFormat = "0.00%";
        var numberFormat = "0";
        const defaultCellWidth = 8;

        // Setting column width
        sheet.width(0, 5)
            .width(1, 15)
            .width(2, 15);

        sheet.style(headerStyle); // Can change style like this - will take effect where we set cell value
        sheet.row(0);

        let colIndex = 3;
        sports.forEach((sport, index) => {
            sheet.col(colIndex).string(sport.Name);
            colIndex += sport.categories.length;
        });
        sheet.width(colIndex, 10);
        sheet.col(colIndex++).string('סה"כ');
        sheet.row(1);
        sheet.col(0).string('#');
        sheet.col(1).string('שם בית ספר');
        sheet.col(2).string('רשות מקומית');
        colIndex = 3;
        sports.forEach((sport, sportIndex) => {
            sport.categories.forEach((category, categoryIndex) => {
                sheet.col(colIndex++).string(category.Name); //.replace(' ', '\n')
            });
        });
        for (let i = 3; i <colIndex; i++) {
            sheet.width(i, defaultCellWidth);
        }
        sheet.col(colIndex++).string('');
        sheet.width(colIndex, defaultCellWidth);
        sheet.col(colIndex++).string('לתשלום');
        sheet.width(colIndex, defaultCellWidth);
        sheet.col(colIndex++).string('שולם');
        let rowIndex = 2;
        sheet.style(recordStyle); // Can change style like this - will take effect where we set cell value
        var totalsMapping = {};
        var sportTotals = {};
        schools.forEach((school, schoolIndex) => {
            sheet.row(rowIndex++);
            sheet.col(0).string(rowIndex - 2);
            sheet.col(1).string(school.Name);
            sheet.col(2).string(school.City);
            colIndex = 3;
            sports.forEach((sport, sportIndex) => {
                sport.categories.forEach((category, categoryIndex) => {
                    const key = sport.Id + '_' + category.Name;
                    var curValue = parseInt(school.RegistrationMapping[key] || '0');
                    sheet.col(colIndex++).string(school.RegistrationMapping[key] || '');
                    totalsMapping[key] = (totalsMapping[key] || 0) + curValue;
                    sportTotals[sport.Id.toString()] = (sportTotals[sport.Id.toString()] || 0) + curValue;
                });
            });
            sheet.col(colIndex++).string(school.TotalRegistrations);
            sheet.col(colIndex++).string((school.TotalPayment - school.TotalPaid) || '0');
            sheet.col(colIndex++).string(school.TotalPaid || '0');
            totalsMapping['registrations'] = (totalsMapping['registrations'] || 0) + parseInt(school.TotalRegistrations || '0');
            totalsMapping['payment'] = (totalsMapping['payment'] || 0) + parseInt((school.TotalPayment - school.TotalPaid) || '0');
            totalsMapping['paid'] = (totalsMapping['paid'] || 0) + parseInt(school.TotalPaid || '0');
        });

        //add sum row
        sheet.row(rowIndex++);
        sheet.col(0).string('');
        sheet.col(1).string('');
        sheet.col(2).string('סה"כ');
        colIndex = 3;
        sports.forEach((sport, sportIndex) => {
            sport.categories.forEach((category, categoryIndex) => {
                const key = sport.Id + '_' + category.Name;
                sheet.col(colIndex++).string(totalsMapping[key] || '0');
            });
        });
        sheet.col(colIndex++).string( totalsMapping['registrations'] || '0');
        sheet.col(colIndex++).string(totalsMapping['payment'] || '0');
        sheet.col(colIndex++).string(totalsMapping['paid'] || '0');

        //sports total
        sheet.row(0);
        colIndex = 3;
        sports.forEach((sport, index) => {
            var curTotal = sportTotals[sport.Id.toString()] || 0;
            if (curTotal > 0) {
                sheet.col(colIndex).string(sport.Name + ' (סה"כ: ' + curTotal + ')');
            }
            colIndex += sport.categories.length;
        });

        // Saving to file
        workbook.saveAs(fullExcelPath);

        callback(null, excelFileName);
    */
};

Schools.prototype.getRegistration = function (schoolId, season, callback) {
    var self = this;
    this.db.connect()
        .then(
            function (connection) {
                //console.log('region: ' + options.region + ', clubs? ' + options.clubs + ', league? ' + options.league);
                connection.request(
                    "Select s.SCHOOL_ID, s.SYMBOL, s.REGION_ID, " +
                    "   Case sr.[Type] When 0 Then 'א''-ו''' When 1 Then 'א''-ח''' When 2 Then 'ז''-ט''' When 3 Then 'ז''-י\"ב' When 4 Then 'ט''-י\"ב' When 5 Then 'י''-י\"ב' Else '' End As GradeType, " +
                    "   sr.[Name] as SchoolName, sr.PhoneNumber As SchoolPhoneNumber, sr.Fax As SchoolFax, sr.Email As SchoolEmail, sr.[Address] As SchoolAddress, " +
                    "   sr.PrincipalName, sr.PrincipalPhoneNumber, sr.PrincipalEmail, " +
                    "   sr.ChairmanName, sr.ChairmanPhoneNumber, sr.ChairmanEmail, " +
                    "   sr.CoordinatorName, sr.CoordinatorPhoneNumber, sr.CoordinatorEmail, " +
                    "   sr.RepresentativeName, sr.RepresentativePhoneNumber, sr.RepresentativeEmail, " +
                    "   sr.TeacherName, sr.TeacherPhoneNumber, sr.TeacherEmail, " +
                    "   sr.ParentsCommitteeName, sr.ParentsCommitteePhoneNumber, sr.ParentsCommitteeEmail, " +
                    "   sr.StudentsRepresentativeName, sr.StudentsRepresentativePhoneNumber, sr.StudentsRepresentativeEmail, " +
                    "   sr.AssociationRepresentativeName, sr.AssociationRepresentativePhoneNumber, sr.AssociationRepresentativeEmail, " +
                    "   sr.AssociationValidApproval, sr.AssociationNumber " +
                    "From SCHOOLS as s " +
                    "  left outer join SchoolRegistrations as sr on sr.[School]=s.SCHOOL_ID and sr.[Season]=@season " +
                    "Where s.SCHOOL_ID = @school and s.DATE_DELETED Is Null",
                    {season: season, school: schoolId})
                    .then(
                        function (records) {
                            connection.complete();

                            if (records.length === 0) {
                                callback();
                            }
                            else {
                                var record = records[0];
                                var associationNumber = record['AssociationNumber'] || '';
                                //console.log(record);
                                var school = {
                                    id: record.SCHOOL_ID,
                                    name: record['SchoolName'],
                                    symbol: record['SYMBOL'],
                                    region: record['REGION_ID'],
                                    phoneNumber: record['SchoolPhoneNumber'],
                                    fax: record['SchoolFax'],
                                    email: record['SchoolEmail'],
                                    address: record['SchoolAddress'],
                                    gradeType: record['GradeType'],
                                    association: {
                                        set: associationNumber.length > 0 ? 'כן' : 'לא',
                                        number: associationNumber,
                                        approved: record['AssociationValidApproval'] == 1 ? 'כן' : 'לא'
                                    }
                                };
                                ApplyContacts(school, record,
                                    ['Principal', 'Chairman', 'Coordinator', 'Representative',
                                        'Teacher', 'ParentsCommittee', 'StudentsRepresentative', 'AssociationRepresentative']);
                                callback(null, school);
                            }
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

Schools.prototype.getPossiblePlayers = function (schoolId, options, callback) {
    var season = options.season;
    var self = this;
    var activeSeason = Season.active();
    this.db.connect()
        .then(
            function (connection) {
                var gradeFrom = options.league ? 9 : 6;
                connection.request(
                    "Select STUDENT_ID As \"Student\", " +
                    "   ID_NUMBER As \"IdNumber\", " +
                    "   FIRST_NAME As \"FirstName\", " +
                    "   LAST_NAME As \"LastName\", " +
                    "   BIRTH_DATE As \"BirthDate\", " +
                    "   GRADE As \"Grade\" " +
                    "From STUDENTS " +
                    "Where SCHOOL_ID=@school " +
                    "   And STUDENT_ID Not In (" +
                    "       Select Distinct pr.Student " +
                    "       From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.Team=tr.Id " +
                    "           Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "           Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "       Where tr.School=@school And c.SEASON=@season" +
                    "   ) " +
                    "   And STUDENT_ID Not In (" +
                    "       Select Distinct p.STUDENT_ID " +
                    "       From SchoolDeletedPlayers sdp Inner Join PLAYERS p On sdp.Player=p.PLAYER_ID And p.DATE_DELETED Is Null " +
                    "           Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is NUll " +
                    "           Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null " +
                    "           Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null " +
                    "       Where sdp.School=@school And c.SEASON=@season" +
                    "   ) " +
                    "   And DATE_DELETED Is Null " +
                    "   And GRADE Is Not NUll " +
                    "   And (@season-GRADE)<12 And (@season-GRADE)>=" + gradeFrom,
                    {season: season, school: schoolId})
                    .then(
                        function (records) {
                            connection.complete();
                            var possiblePlayers = [];
                            for (var i = 0; i < records.length; i++) {
                                var record = records[i];
                                var possiblePlayer = {
                                    student: record.Student,
                                    idNumber: record.IdNumber,
                                    firstName: record.FirstName,
                                    lastName: record.LastName,
                                    birthDate: record.BirthDate,
                                    grade: activeSeason - parseInt(record.Grade)
                                };
                                possiblePlayers.push(possiblePlayer);
                            }
                            callback(null, possiblePlayers);

                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};

module.exports = new Schools(require('./db'));