var manageUtils = require('./utils');
var sportsman = require('../../../api/sportsman');
var apiUtils = require('../../../api/utils');
var v2Utils = require('../../api/util');
var Season = require('../season');
var Finance =require('../finance');
var Teams = require('../admin/teams');
var Promise = require('promise');
var logger = require('../../../logger');
var settings = require('../../../settings');

function Manage(db) {
    this.db = db;
}

async function Read(db, filters, possibleConditions, baseSQL, recordMapper, callback) {
    function ApplyConditions(query, conditions) {
        var whatToAdd = (query.toLowerCase().indexOf('where ') > 0 ? ' And ' : ' Where ') + conditions.join(' And ') + ' ';
        var groupByIndex = query.toLowerCase().indexOf('group by');
        var orderByIndex = query.toLowerCase().indexOf('order by');
        var rightParenthesisLastIndex = query.lastIndexOf(')');
        var ignoreParenthesis = baseSQL.indexOf('--ignoreParenthesis') >= 0;
        if (!ignoreParenthesis && rightParenthesisLastIndex > 0 && rightParenthesisLastIndex > groupByIndex)
            groupByIndex = 0;
        if (groupByIndex > 0 || orderByIndex > 0) {
            var startIndex = groupByIndex > 0 ? groupByIndex : orderByIndex;
            query = manageUtils.spliceString(query, startIndex, 0, whatToAdd);
        } else {
            query += whatToAdd;
        }
        return query;
    }
    if (filters == null)
        filters = {};
    if (possibleConditions == null)
        possibleConditions = {};
    if (recordMapper == null) {
        recordMapper = function (row) {
            return row[0];
        };
    } else if (typeof recordMapper === 'string') {
        var fieldName = recordMapper.toString();
        recordMapper = function (row) {
            return row[fieldName];
        };
    }
    for (var filterKey in filters) {
        if (filters.hasOwnProperty(filterKey)) {
            if (filters[filterKey] === 'null' || filters[filterKey] === '') {
                filters[filterKey] = null;
            }
        }
    }
    if (filters.season == null || !filters.season)
        filters.season = Season.current();
    var connection = null;
    try {
        connection = await db.connect();
        var conditions;
        var qs = baseSQL + '';
        if (qs.indexOf('Union All ') > 0) {
            var arrQueries = qs.split('Union All ');
            for (var i = 0; i < arrQueries.length; i++) {
                conditions = manageUtils.buildSqlConditions(filters, possibleConditions, i);
                if (conditions.length > 0)
                    arrQueries[i] = ApplyConditions(arrQueries[i], conditions);
            }
            qs = arrQueries.join('Union All ');
        } else {
            conditions = manageUtils.buildSqlConditions(filters, possibleConditions);
            if (conditions.length > 0)
                qs = ApplyConditions(qs, conditions);
        }
        console.log(qs);
        var records = await connection.request(qs, filters);
        var dataItems = [];
        for (var i = 0; i < records.length; i++) {
            dataItems.push(recordMapper(records[i]));
        }
        //console.log(filters);
        callback(null, dataItems);
    }
    catch (err) {
        console.log('general error while reading');
        console.log('Base SQL is: ' + baseSQL);
        console.log('Filters: ');
        console.log(filters);
        console.log('Possible conditions: ');
        console.log(possibleConditions);
        console.log(err);
        logger.error('Error while reading manage API: ' + (err.message || err));
        callback('Error: ' +  (err.message || err));
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
}

async function Execute(db, sqlQuery, values, title, callback) {
    var connection = null;
    if (title == null || title.length === 0)
        title = 'executing API query';
    try {
        connection = await db.connect();
        await connection.request(sqlQuery, values);
        callback(null, "success");
    }
    catch (err) {
        console.log('general error while executing SQL');
        console.log(err);
        logger.error('Error while ' + title + ': ' + (err.message || err));
        callback('Error: ' +  (err.message || err));
    }
    finally {
        if (connection) {
            connection.complete();
        }
    }
}

async function AddAudit(db, userId, tableName, actionType, actionKey, callback) {
    var qs = 'Insert Into ApiAudit (Seq, ActionOwner, TableName, ActionType, ActionKey) ' +
        'Select IsNull(Max(Seq), 0)+1 As NewSeq, @owner, @table, @type, @key From ApiAudit';
    var params = {
        owner: userId,
        table: tableName,
        type: actionType,
        key: actionKey
    };
    await Execute(db, qs, params, 'adding audit record', function(err, resp) {
        callback(err, resp);
    });
}

async function ReadTokenLogins(db, season, callback) {
    var qs = 'Select Token, Identifier, Email, Expiration, [Code] ' +
        'From TokenLogins ' +
        'Where Len([Code])>0 And RIGHT(Identifier, 3)=\'-' + season + '\' ' +
        '   And LEFT(Identifier, CHARINDEX(\'-\', Identifier)) In (\'principal-\', \'representative-\')';
        //'   And Expiration>=GetDate()';
    var recordMapper = function(row) {
        return {
            Token: row['Token'],
            Identifier: row['Identifier'],
            Expiration: row['Expiration'],
            Code: row['Code']
        };
    };
    Read(db, {}, {}, qs, recordMapper, function(err, tokenRecords) {
        if (err) {
            callback(err);
            return;
        }
        var schoolTokenMapping = {};
        for (var i = 0; i < tokenRecords.length; i++) {
            var tokenRecord = tokenRecords[i];
            var identifierParts = tokenRecord.Identifier.split('-');
            var token = tokenRecord.Token;
            if (identifierParts.length === 3) {
                var schoolId = identifierParts[1];
                if (!schoolTokenMapping[schoolId]) {
                    schoolTokenMapping[schoolId] = {};
                }
                schoolTokenMapping[schoolId][identifierParts[0]] = {
                    Token: token,
                    Code: tokenRecord.Code,
                    Expiration: tokenRecord.Expiration
                };
            }
        }
        callback(null, schoolTokenMapping);
    });
}

function GenerateFooterCacheKey(token) {
    return 'dashboardFooterData-' + token;
}

function GetTeamIndex(db, team, callback) {
    if (team.TeamNumber != null) {
        //make it numeric
        var teamIndex = parseInt(team.TeamNumber, 10);
        if (!isNaN(teamIndex) && teamIndex >= 0) {
            callback(null, teamIndex);
        } else {
            teamIndex = null;
            switch (team.TeamNumber.replace("'", "")) {
                case 'א':
                    teamIndex = 1;
                    break;
                case 'ב':
                    teamIndex = 2;
                    break;
                case 'ג':
                    teamIndex = 3;
                    break;
                case 'ד':
                    teamIndex = 4;
                    break;
            }
            callback(null, teamIndex);
        }
    } else {
        var sql = 'Select IsNull(Max(TEAM_INDEX), -1) As MaxIndex ' +
            'From TEAMS ' +
            'Where DATE_DELETED Is Null';
        var recordMapper = function(row) {
            var teamIndex = row['MaxIndex'] + 1;
            if (teamIndex == 1)
                teamIndex++;
            return teamIndex;
        };
        Read(db,{'category': team.Category.Id, 'school': team.School},
            {category: 'CHAMPIONSHIP_CATEGORY_ID', school: 'SCHOOL_ID'}, sql, recordMapper,
            function(err, dataItems) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, dataItems[0]);
                }
            });
    }
}

async function ReadUnconfirmedData(db, data, callback) {
    function GetFiltersAndNegation() {
        return new Promise(function (fulfil, reject) {
            if (data.Token) {
                var cacheKey = GenerateFooterCacheKey(data.Token);
                v2Utils.getCache(cacheKey, function(err, cacheValue) {
                    if (err) {
                        reject('Error reading cache: ' + err);
                    } else {
                        if (cacheValue == null) {
                            reject('Cache data for token ' + data.Token + ' has expired');
                        } else {
                            var cacheData = JSON.parse(cacheValue);
                            fulfil({
                                filters: cacheData.Filters,
                                negationCondition: cacheData.Negation
                            });
                        }
                    }
                });
            } else {
                fulfil({
                    filters: data.filters,
                    negationCondition: data.negationCondition
                });
            }
        });
    }

    GetFiltersAndNegation().then(async function(resp) {
        var filters = resp.filters;
        var negationCondition = resp.negationCondition;
        var connection = null;
        var regionId = filters.region;
        var sportId = filters.sport;
        var categoryId = filters.category;
        var clubs = filters.clubs;
        var isOpen = filters.isOpen;
        var season = filters.season || Season.current();
        var qs = '';
        try {
            connection = await db.connect();
            var extraConditions = '';
            if (regionId != null)
                extraConditions += 'And c.REGION_ID=@region ';
            if (sportId != null)
                extraConditions += 'And c.SPORT_ID=@sport ';
            if (filters.league)
                extraConditions += 'And c.IS_LEAGUE=1 ';
            if (filters.clubs)
                extraConditions += 'And c.IS_CLUBS=1 ';
            qs = 'Select Distinct s.SCHOOL_ID ' +
                'From SCHOOLS s Inner Join TEAMS t On t.SCHOOL_ID=s.SCHOOL_ID And t.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                'Where s.DATE_DELETED Is Null And c.SEASON=@season ' + extraConditions + //And c.CHAMPIONSHIP_STATUS>0 
                'Union All ' +
                'Select Distinct s.SCHOOL_ID ' +
                'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                'Where tr.Team Is Null And c.SEASON=@season ' + extraConditions; //c.CHAMPIONSHIP_STATUS>0 And 
            /*
            qs = 'Select Distinct sr.School, Count(tr.Id) As TeamCount ' +
                'From SchoolRegistrations sr Inner Join SCHOOLS s On sr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                '   Inner Join TeamRegistrations tr On tr.School=sr.School ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                'Where sr.Season=@season And c.SEASON=@season And sr.UserId Is Not Null'; //sr.Club=1 And
            if (regionId != null) {
                if (regionId == 0) {
                    qs += ' And sr.School In (' +
                        '   Select Distinct tr.School ' +
                        '   From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                        '       Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                        '   Where c.SEASON=@season And c.REGION_ID=@region' +
                        ')';
                } else {
                    qs += ' And s.REGION_ID=@region';
                }
            }
            if (filters.league) {
                qs += ' And sr.League=1';
            }
            if (filters.clubs) {
                qs += ' And sr.Club=1';
            }
            qs += ' ' +
                'Group By sr.School ' +
                'Having Count(tr.Id)>0';
            */
            var queryParams = {
                season: season,
                region: regionId,
                sport: sportId
            };
            var records = await connection.request(qs, queryParams);
            var allSchools = [];
            if (records != null && records.length > 0) {
                for (var i = 0; i < records.length; i++) {
                    allSchools.push(records[i]['SCHOOL_ID'])
                }
            }

            var filterSQL = regionId == null ? '' : ' And s.REGION_ID=@region ';
            qs = 'Select Distinct b.SchoolId ' +
                'From (' +
                '   Select a.SchoolId, Count(a.ConfirmedForm) As ConfirmedForms ' +
                '   From (' +
                '       Select cf.SchoolId, cf.ConfirmedForm, Max(cf.DateConfirmed) As LatestConfirmationDate ' +
                '       From Confirmations cf Inner Join SchoolRegistrations sr On cf.SchoolId=sr.School ' +
                '           Inner Join SCHOOLS s On sr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                '       Where cf.Season=@season And cf.ConfirmationValue=1 And sr.UserId Is Not Null ' +
                '           And cf.ConfirmedForm In (\'club-details\') ' + //, 'representative-teams', 'principal-teams'
                '           And sr.Season=@season ' + filterSQL + //And sr.Club=1
                '       Group By cf.SchoolId, cf.ConfirmedForm ' +
                '   ) as a ' +
                '   Group By a.SchoolId ' +
                '   Having Count(a.ConfirmedForm)=1 ' + //3
                ') as b';
            records = await connection.request(qs, queryParams);
            var allConfirmedSchools = [];
            var schoolsWithClubDetailApproval = [];
            if (records != null && records.length > 0) {
                for (var i = 0; i < records.length; i++) {
                    var schoolId = records[i]['SchoolId'];
                    allConfirmedSchools.push(schoolId)
                    schoolsWithClubDetailApproval.push(schoolId);
                }
            }
            var principalApprovalMapping = {};
            var representativeApprovalMapping = {};
            var supervisorApprovalMapping = {};
            qs = 'Select tr.School, tr.Approved, Count(tr.Id) As TeamCount ' +
                'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                'Where c.SEASON=@season '; // And School In (' + allConfirmedSchools.join(', ') + ')
            if (filters.league)
                qs += 'And c.IS_LEAGUE=1 ';
            if (filters.clubs)
                qs += 'And c.IS_CLUBS=1 ';
            qs += 'Group By tr.School, tr.Approved';
            records = await connection.request(qs, queryParams);
            if (records != null && records.length > 0) {
                for (var i = 0; i < records.length; i++) {
                    var row = records[i];
                    var schoolId = row['School'];
                    var approved = row['Approved'];
                    var teamCount = row['TeamCount'];
                    var key = schoolId.toString();
                    if (!principalApprovalMapping[key]) {
                        principalApprovalMapping[key] = {
                            School: schoolId,
                            Approved: 0,
                            Total: 0
                        };
                    }
                    if (!representativeApprovalMapping[key]) {
                        representativeApprovalMapping[key] = {
                            School: schoolId,
                            Approved: 0,
                            Total: 0
                        };
                    }
                    if (!supervisorApprovalMapping[key]) {
                        supervisorApprovalMapping[key] = {
                            School: schoolId,
                            Approved: 0,
                            Total: 0
                        };
                    }
                    principalApprovalMapping[key].Total += teamCount;
                    representativeApprovalMapping[key].Total += teamCount;
                    supervisorApprovalMapping[key].Total += teamCount;
                    if ((approved & Teams.Status.PrincipalApproval) > 0)
                        principalApprovalMapping[key].Approved += teamCount;
                    if ((approved & Teams.Status.RepresentativeApproval) > 0)
                        representativeApprovalMapping[key].Approved += teamCount;
                    if ((approved & Teams.Status.SupervisorApproval) > 0)
                        supervisorApprovalMapping[key].Approved += teamCount;
                }
            }
            //remove schools without full principal approval
            allConfirmedSchools = allConfirmedSchools.filter(currentSchoolId => {
                var principalApprovalData = principalApprovalMapping[currentSchoolId.toString()];
                return principalApprovalData && principalApprovalData.Approved === principalApprovalData.Total;
            });
            //remove schools without full representative approval
            allConfirmedSchools = allConfirmedSchools.filter(currentSchoolId => {
                var representativeApprovalData = representativeApprovalMapping[currentSchoolId.toString()];
                return representativeApprovalData && representativeApprovalData.Approved === representativeApprovalData.Total;
            });
            //remove schools without full supervisor approval
            allConfirmedSchools = allConfirmedSchools.filter(currentSchoolId => {
                var supervisorApprovalData = supervisorApprovalMapping[currentSchoolId.toString()];
                return supervisorApprovalData && supervisorApprovalData.Approved === supervisorApprovalData.Total;
            });
            if (data.Entity === 'schools') {
                var schoolData = [];
                var unconfirmedSchools = allSchools.filter(schoolId => allConfirmedSchools.indexOf(schoolId) === -1);
                if (unconfirmedSchools.length > 0) {
                    qs = 'Select s.SCHOOL_ID As [זיהוי בית ספר], ' +
                        '   s.SCHOOL_NAME As [שם בית ספר], ' +
                        '   s.SYMBOL As [סמל בית ספר], ' +
                        '   r.REGION_NAME As [מחוז], ' +
                        '   c.CITY_NAME As [רשות], ' +
                        '   \'[x]\' As [רכז?], ' +
                        '   \'[x]\' As [מנהל?], ' +
                        '   \'[x]\' As [נציג?], ' +
                        '   \'[x]\' As [מפקח?] ' +
                        'From SCHOOLS s Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                        '   Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                        'Where s.DATE_DELETED Is Null And s.SCHOOL_ID In (' + unconfirmedSchools.join(', ') + ')';
                    records = await connection.request(qs, queryParams);
                    for (var i = 0; i < records.length; i++) {
                        schoolData.push(records[i]);
                    }
                    for (var i = 0; i < schoolsWithClubDetailApproval.length; i++) {
                        var matchingSchool = schoolData.find(s => s['זיהוי בית ספר'] == schoolsWithClubDetailApproval[i]);
                        if (matchingSchool != null)
                            matchingSchool['רכז?'] = '[v]';
                    }
                    var tooltipText;
                    schoolData.forEach(currentSchool => {
                        var schoolId = currentSchool['זיהוי בית ספר'];
                        var principalApprovalData = principalApprovalMapping[schoolId.toString()];
                        var representativeApprovalData = representativeApprovalMapping[schoolId.toString()];
                        var supervisorApprovalData = supervisorApprovalMapping[schoolId.toString()];
                        if (principalApprovalData) {
                            if (principalApprovalData.Approved === principalApprovalData.Total) {
                                currentSchool['מנהל?'] = '[v] | מנהל אישר את כל הקבוצות';
                            } else {
                                tooltipText = 'מנהל אישר ' + principalApprovalData.Approved + ' מתוך ' +
                                    principalApprovalData.Total + ' קבוצות';
                                currentSchool['מנהל?'] += ' | ' + tooltipText;
                            }
                        }
                        if (representativeApprovalData) {
                            if (representativeApprovalData.Approved === representativeApprovalData.Total) {
                                currentSchool['נציג?'] = '[v] | נציג אישר את כל הקבוצות';
                            } else {
                                tooltipText = 'נציג אישר ' + representativeApprovalData.Approved + ' מתוך ' +
                                    representativeApprovalData.Total + ' קבוצות';
                                currentSchool['נציג?'] += ' | ' + tooltipText;
                            }
                        }
                        if (supervisorApprovalData) {
                            if (supervisorApprovalData.Approved === supervisorApprovalData.Total) {
                                currentSchool['מפקח?'] = '[v] | מפקח אישר את כל הקבוצות';
                            } else {
                                tooltipText = 'מפקח אישר ' + supervisorApprovalData.Approved + ' מתוך ' +
                                    supervisorApprovalData.Total + ' קבוצות';
                                currentSchool['מפקח?'] += ' | ' + tooltipText;
                            }
                        }
                    });
                }
                callback(null, schoolData);
                return;
            }
            var confirmedSchools = allConfirmedSchools.length;
            var totalSchools = allSchools.length;
            var totalUnconfirmedSchools = totalSchools - confirmedSchools;
            filterSQL = '';
            if (regionId != null)
                filterSQL += ' And c.REGION_ID=@region ';
            if (sportId != null)
                filterSQL += ' And c.SPORT_ID=@sport ';
            if (categoryId != null)
                filterSQL += ' And cc.CATEGORY=@category ';
            if (clubs != null)
                filterSQL += ' And c.IS_CLUBS=@clubs ';
            if (isOpen != null)
                filterSQL += ' And c.IS_OPEN=@open ';
            queryParams.sport = sportId;
            queryParams.category = categoryId;
            queryParams.clubs = clubs;
            queryParams.open = isOpen;
            qs = 'Select Distinct t.TEAM_ID As \"Id\", \'TEAMS\' As \"Table\"  ' +
                'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                'Where t.DATE_DELETED Is Null And (t.[STATUS]=1 Or t.[STATUS] Is Null) And c.SEASON=@season' + filterSQL + negationCondition + ' ' + //And c.CHAMPIONSHIP_STATUS>0 
                'Union All ' +
                'Select Distinct tr.Id As \"Id\", \'TeamRegistrations\' As \"Table\" ' +
                'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                'Where tr.Team Is Null And c.SEASON=@season' + filterSQL + negationCondition; //c.CHAMPIONSHIP_STATUS>0 And 
            records = await connection.request(qs, queryParams);
            var unconfirmedTeams = [];
            if (records != null && records.length > 0) {
                for (var i = 0; i < records.length; i++) {
                    var row = records[i];
                    unconfirmedTeams.push(row);
                }
            }

            if (data.Entity === 'teams') {
                var teamIds = unconfirmedTeams.filter(t => t.Table === 'TEAMS');
                var registrationTeamIds = unconfirmedTeams.filter(t => t.Table === 'TeamRegistrations');
                qs = '';
                if (teamIds.length > 0) {
                    //t.TEAM_ID As [זיהוי קבוצה],
                    qs += 'Select t.TEAM_ID, ' +
                        '   r.REGION_NAME As [מחוז], ' +
                        '   s.SYMBOL As [סמל בית ספר], ' +
                        '   s.SCHOOL_NAME As [שם בית ספר], ' +
                        '   cit.CITY_NAME As [רשות], ' +
                        '   c.CHAMPIONSHIP_NAME As [שם אליפות], ' +
                        '   cm.CATEGORY_NAME As [קטגורית גיל], ' +
                        '   dbo.GetTeamNumber(t.TEAM_INDEX, \'א\'\'\') As [קבוצה], ' +
                        '   t.[STATUS] As [סטטוס] ' +
                        'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                        '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                        '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                        '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                        '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                        '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                        'Where t.DATE_DELETED Is Null And t.TEAM_ID In (' + teamIds.map(t => t.Id).join(', ') + ')';
                }
                if (registrationTeamIds.length > 0) {
                    //tr.Id As [זיהוי קבוצה],
                    if (qs.length > 0)
                        qs += ' Union All ';
                    qs += 'Select 0 As TEAM_ID, ' +
                        '   r.REGION_NAME As [מחוז], ' +
                        '   s.SYMBOL As [סמל בית ספר], ' +
                        '   s.SCHOOL_NAME As [שם בית ספר], ' +
                        '   cit.CITY_NAME As [רשות], ' +
                        '   c.CHAMPIONSHIP_NAME As [שם אליפות], ' +
                        '   cm.CATEGORY_NAME As [קטגורית גיל], ' +
                        '   tr.TeamNumber As [קבוצה], ' +
                        '   0 As [סטטוס] ' +
                        'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                        '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                        '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                        '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                        '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                        '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                        'Where tr.Id In (' + registrationTeamIds.map(t => t.Id).join(', ') + ')';
                }
                records = await connection.request(qs, queryParams);
                var teamsData = [];
                if (records != null && records.length > 0) {
                    for (var i = 0; i < records.length; i++) {
                        var row = records[i];
                        var translatedStatus = 'לא פעילה';
                        switch (row['סטטוס']) {
                            case 0:
                                translatedStatus = 'ממתינה לאישור';
                                break;
                            case 1:
                                translatedStatus = 'רשומה';
                                break;
                        }
                        row['סטטוס'] = translatedStatus;
                        teamsData.push(row);
                    }

                    //override team number where needed
                    if (teamIds.length > 0) {
                        qs = 'Select Id, Team, TeamNumber From TeamRegistrations Where Team In (' + teamIds.map(t => t.Id).join(', ') + ')';
                        records = await connection.request(qs, queryParams);
                        if (records != null && records.length > 0) {
                            for (var i = 0; i < records.length; i++) {
                                var row = records[i];
                                let curTeamId = row['Team'];
                                var matchingTeamData = teamsData.find(t => t.TEAM_ID === curTeamId);
                                if (matchingTeamData != null) {
                                    matchingTeamData['קבוצה'] = row['TeamNumber'];
                                }
                            }
                        }
                    }
                }
                callback(null, teamsData);
                return;
            }

            var totalUnconfirmedTeams = unconfirmedTeams.length;
            qs = 'Select Distinct p.PLAYER_ID ' +
                'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                'Where p.DATE_DELETED Is Null And (p.[STATUS]=1 Or p.[STATUS]=3 Or p.[STATUS] Is Null) And c.SEASON=@season' + filterSQL + negationCondition; //And c.CHAMPIONSHIP_STATUS>0 
            records = await connection.request(qs, queryParams);
            var unconfirmedPlayers = [];
            if (records != null && records.length > 0) {
                for (var i = 0; i < records.length; i++) {
                    unconfirmedPlayers.push(records[i]['PLAYER_ID'])
                }
            }
            if (data.Entity === 'players') {
                //p.PLAYER_ID As [זיהוי שחקן],
                var playersData = [];
                if (unconfirmedPlayers.length > 0) {
                    qs = 'Select r.REGION_NAME As [מחוז], ' +
                        '   st.FIRST_NAME As [שם פרטי], ' +
                        '   st.LAST_NAME As [שם משפחה], ' +
                        '   st.ID_NUMBER As [תעודת זהות], ' +
                        '   dbo.TranslateGrade(@season-IsNull(st.GRADE, @season)) As [כיתה], ' +
                        '   dbo.BuildTeamName(s.SCHOOL_NAME, c.CITY_NAME, t.TEAM_INDEX, Null, Null) As [שם קבוצה], ' +
                        '   cm.CATEGORY_NAME As [קטגורית גיל], ' +
                        '   dbo.GetTeamNumber(t.TEAM_INDEX, \'א\'\'\') As [קבוצה], ' +
                        '   Case p.[STATUS] When 1 Then \'רשום\' When 2 Then \'מאושר\' When 3 Then \'לא מאושר\' Else \'\' End As [סטטוס], ' +
                        '   p.REMARKS As [הערות] ' +
                        'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                        '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                        '   Inner Join STUDENTS st On p.STUDENT_ID=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
                        '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                        '   Inner Join REGIONS r On s.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                        '   Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                        '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                        'Where p.DATE_DELETED Is Null And p.PLAYER_ID In (' + unconfirmedPlayers.join(', ') + ')';
                    records = await connection.request(qs, queryParams);
                    if (records != null && records.length > 0) {
                        for (var i = 0; i < records.length; i++) {
                            playersData.push(records[i]);
                        }
                    }
                }
                callback(null, playersData);
                return;
            }
            var totalUnconfirmedPlayers = unconfirmedPlayers.length;
            callback(null, {
                Token: data.Token || apiUtils.GeneratePassword(12, 12),
                Schools: totalUnconfirmedSchools,
                Teams: totalUnconfirmedTeams,
                Players: totalUnconfirmedPlayers
            });
        }
        catch (err) {
            logger.error('Error while reading unconfirmed data: ' + (err.message || err) +
                ' (last query: ' + qs);
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    }, function(err) {
        logger.error('Error while reading unconfirmed filters: ' + (err.message || err));
        callback(err);
    });
}

/// TEAMS ///
Manage.prototype.getTeams = function (options, user, callback) {
    var filters = {
        season: options.season,
        id: options.id,
        championship: options.championship,
        school: options.school,
        category: options.category,
        sport: options.sport,
        region: options.region
    };
    var db = this.db;
    Season.current(user, function(currentSeason) {
        if (filters.season == null || !filters.season)
            filters.season = currentSeason;
        var leagueClause = '';
        if (parseInt(options.region, 10) === 0) {
            leagueClause = ' And c.IS_LEAGUE=1 And c.IS_CLUBS=0 And c.IS_OPEN=0 ';
        }
        var baseSQL = 'Select tr.[Id], dbo.BuildTeamName(s.SCHOOL_NAME, cit.CITY_NAME, Null, Null, Null) + \' \' + tr.TeamNumber As DisplayName, ' +
            '   tr.[School], tr.[Competition], tr.[TeamNumber], tr.[CoachName], tr.[CoachPhoneNumber], tr.[CoachEmail], ' +
            '   tr.[Facility], tr.[Activity], tr.[HostingHours], tr.[Payment], tr.[Approved], tr.[CoachHelperName], tr.[CoachHelperPhoneNumber], ' +
            '   tr.[CoachHelperEmail], tr.[ManagerName], tr.[ManagerPhoneNumber], tr.[ManagerEmail], tr.[Team], ' +
            '   tr.[TeacherName], tr.[TeacherPhoneNumber], tr.[TeacherEmail], tr.[CoachCertification], ' +
            '   tr.[AlternativeFacilityName], tr.[AlternativeFacilityAddress], tr.[CreatedAt], s.SYMBOL, ' +
            '   s.SCHOOL_NAME, sr.REGION_ID, sr.REGION_NAME, s.CITY_ID, cit.CITY_NAME, c.SPORT_ID, sp.SPORT_NAME, cc.CATEGORY, cm.CATEGORY_NAME, c.CHAMPIONSHIP_ID, ' +
            '   c.CHAMPIONSHIP_NAME, px.[Order] As PaymentOrder, px.TotalAmount As PaymentTotalAmount, ' +
            '   px.Id As PaymentId, px.Method As PaymentMethod, px.Details As PaymentDetails, t.[STATUS] As AdminStatus, ' +
            '   t.TEAM_SUPERVISOR As SupervisorId, u.USER_FIRST_NAME As SupervisorFirstName, u.USER_LAST_NAME As SupervisorLastName,  ' +
            '   t.REGISTRATION_DATE As RegistrationDate, t.DATE_CONFIRMED As ConfirmationDate, t.PLAYER_NUMBER_FROM, t.PLAYER_NUMBER_TO, ' +
            '   t.TEAM_NUMBER, sreg.PrincipalName, sreg.PrincipalPhoneNumber, sreg.PrincipalEmail, ' +
            '   sreg.RepresentativeName, sreg.RepresentativePhoneNumber, sreg.RepresentativeEmail, ' +
            '   sreg.CoordinatorName, sreg.CoordinatorPhoneNumber, sreg.CoordinatorEmail, ' +
            '   sreg.TeacherName As RegTeacherName, sreg.TeacherPhoneNumber As RegTeacherPhoneNumber, sreg.TeacherEmail As RegTeacherEmail, ' +
            '   sreg.ParentsCommitteeName, sreg.ParentsCommitteePhoneNumber, sreg.ParentsCommitteeEmail, ' +
            '   sreg.StudentsRepresentativeName, sreg.StudentsRepresentativePhoneNumber, sreg.StudentsRepresentativeEmail, ' +
            '   sreg.AssociationRepresentativeName, sreg.AssociationRepresentativePhoneNumber, sreg.AssociationRepresentativeEmail, ' +
            '   f.FACILITY_ID As FacilityId, f.FACILITY_NAME As FacilityName, f.ADDRESS As FacilityAddress, ' +
            '   c.IS_CLUBS, c.IS_LEAGUE, \'new\' As "Type" ' +
            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS sr On s.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
            '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
            '   Left Join FACILITIES f On tr.Facility=f.FACILITY_ID And f.DATE_DELETED Is Null ' +
            '   Left Join PaymentRequests px On tr.Payment=px.Id And px.CancelTime Is Null ' +
            '   Left Join TEAMS t On tr.Team=t.TEAM_ID And t.DATE_DELETED Is Null ' +
            '   Left Join USERS u On t.TEAM_SUPERVISOR=u.[USER_ID] And u.DATE_DELETED Is Null ' +
            '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
            '   Left Join SchoolRegistrations sreg On s.SCHOOL_ID=sreg.School And sreg.Season=@season ' +
            'Where c.SEASON=@season ' + leagueClause + ' ' +
            'Union All ' +
            ' Select Null As "Id", dbo.BuildTeamName(s.SCHOOL_NAME, cit.CITY_NAME, t.TEAM_INDEX, Null, Null) As DisplayName, ' +
            '   t.SCHOOL_ID As "School", t.CHAMPIONSHIP_CATEGORY_ID As "Competition", dbo.GetTeamNumber(t.TEAM_INDEX, \'\') As "TeamNumber",  ' +
            '   Null As "CoachName", Null As "CoachPhoneNumber", Null As "CoachEmail", Null As "Facility", Null As "Activity", Null As "HostingHours",  ' +
            '   Null As "Payment", Null As "Approved", Null As "CoachHelperName", Null As "CoachHelperPhoneNumber",  ' +
            '   Null As "CoachHelperEmail", Null As "ManagerName", Null As "ManagerPhoneNumber", Null As "ManagerEmail",  ' +
            '   t.TEAM_ID As "Team", Null As "TeacherName", Null As "TeacherPhoneNumber", Null As "TeacherEmail",  ' +
            '   Null As "CoachCertification", Null As "AlternativeFacilityName", Null As "AlternativeFacilityAddress",  ' +
            '   Null As "CreatedAt", s.SYMBOL, s.SCHOOL_NAME, sr.REGION_ID, sr.REGION_NAME, s.CITY_ID, cit.CITY_NAME, c.SPORT_ID, sp.SPORT_NAME, cc.CATEGORY,  ' +
            '   cm.CATEGORY_NAME, c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, Null As "PaymentOrder",  ' +
            '   Null As "PaymentTotalAmount", Null As "PaymentId", Null As "PaymentMethod", Null As "PaymentDetails", t.[STATUS] As "AdminStatus", ' +
            '   t.TEAM_SUPERVISOR As SupervisorId, u.USER_FIRST_NAME As SupervisorFirstName, u.USER_LAST_NAME As SupervisorLastName,  ' +
            '   t.REGISTRATION_DATE As RegistrationDate, t.DATE_CONFIRMED As ConfirmationDate, t.PLAYER_NUMBER_FROM, t.PLAYER_NUMBER_TO, ' +
            '   t.TEAM_NUMBER, sreg.PrincipalName, sreg.PrincipalPhoneNumber, sreg.PrincipalEmail, ' +
            '   sreg.RepresentativeName, sreg.RepresentativePhoneNumber, sreg.RepresentativeEmail, ' +
            '   sreg.CoordinatorName, sreg.CoordinatorPhoneNumber, sreg.CoordinatorEmail, ' +
            '   sreg.TeacherName As RegTeacherName, sreg.TeacherPhoneNumber As RegTeacherPhoneNumber, sreg.TeacherEmail As RegTeacherEmail, ' +
            '   sreg.ParentsCommitteeName, sreg.ParentsCommitteePhoneNumber, sreg.ParentsCommitteeEmail, ' +
            '   sreg.StudentsRepresentativeName, sreg.StudentsRepresentativePhoneNumber, sreg.StudentsRepresentativeEmail, ' +
            '   sreg.AssociationRepresentativeName, sreg.AssociationRepresentativePhoneNumber, sreg.AssociationRepresentativeEmail, ' +
            '   Null As FacilityId, Null As FacilityName, Null As FacilityAddress, ' +
            '   c.IS_CLUBS, c.IS_LEAGUE, \'old\' As "Type" ' +
            'From TEAMS t  Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
            '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS sr On s.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
            '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
            '   Left Join TeamRegistrations tr On tr.Team=t.TEAM_ID ' +
            '   Left Join USERS u On t.TEAM_SUPERVISOR=u.[USER_ID] And u.DATE_DELETED Is Null ' +
            '   Left Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
            '   Left Join SchoolRegistrations sreg On s.SCHOOL_ID=sreg.School And sreg.Season=@season ' +
            'Where t.DATE_DELETED Is Null And c.SEASON=@season And tr.Id Is Null ' + leagueClause;
        var recordMapper = function(row) {
            var rawActivity = row['Activity'];
            var rawHostingHours = row['HostingHours'];
            var teamNumber = row['TeamNumber'];
            if ((teamNumber == null || teamNumber.length === 0) && row['TEAM_NUMBER'] != null)
                teamNumber = row['TEAM_NUMBER'];
            return {
                Id: row['Id'],
                Approved: row['Approved'],
                AdminStatus: row['AdminStatus'],
                TeamNumber: teamNumber,
                CreatedAt: row['CreatedAt'],
                TeamId: row['Team'],
                City: row['CITY_ID'],
                DisplayName: row['DisplayName'],
                Type: row['Type'],
                IsClub: row['IS_CLUBS'],
                IsLeague: row['IS_LEAGUE'],
                RegistrationDate: row['RegistrationDate'],
                ConfirmationDate: row['ConfirmationDate'],
                PlayerNumberFrom: row['PLAYER_NUMBER_FROM'],
                PlayerNumberTo: row['PLAYER_NUMBER_TO'],
                ActivityTimes: rawActivity == null ? null : JSON.parse(rawActivity),
                HostingHours: rawHostingHours == null ? null : JSON.parse(rawHostingHours),
                Championship: manageUtils.buildSimpleObject(row, 'CHAMPIONSHIP_ID', 'CHAMPIONSHIP_NAME'),
                Category: manageUtils.buildSimpleObject(row, 'Competition', 'CATEGORY_NAME'),
                Sport: manageUtils.buildSimpleObject(row, 'SPORT_ID', 'SPORT_NAME'),
                Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
                CityData: manageUtils.buildSimpleObject(row, 'CITY_ID', 'CITY_NAME'),
                School: manageUtils.buildCustomObject(row, '', ['School', 'SCHOOL_NAME', 'SYMBOL']),
                Facility: manageUtils.buildCustomObject(row, 'Facility', ['Id', 'Name', 'Address']),
                AlternativeFacility: manageUtils.buildCustomObject(row, 'AlternativeFacility', ['Name', 'Address']),
                Payment: manageUtils.buildCustomObject(row, 'Payment', ['Id', 'Order', 'TotalAmount', 'Method', 'Details']),
                Coach: manageUtils.buildContactObject(row, 'Coach', ['Certification']),
                CoachHelper: manageUtils.buildContactObject(row, 'CoachHelper'),
                Manager: manageUtils.buildContactObject(row, 'Manager'),
                Principal: manageUtils.buildContactObject(row, 'Principal'),
                Coordinator: manageUtils.buildContactObject(row, 'Coordinator'),
                Teacher: manageUtils.buildContactObject(row, 'Teacher'),
                Supervisor: manageUtils.buildCustomObject(row, 'Supervisor', ['Id', 'FirstName', 'LastName']),
                Representative: manageUtils.buildCustomObject(row, 'Representative', ['Name', 'PhoneNumber', 'Email']),
                RegistrationTeacher: manageUtils.buildCustomObject(row, 'RegTeacher', ['Name', 'PhoneNumber', 'Email']),
                ParentsCommittee: manageUtils.buildCustomObject(row, 'ParentsCommittee', ['Name', 'PhoneNumber', 'Email']),
                StudentsRepresentative: manageUtils.buildCustomObject(row, 'StudentsRepresentative', ['Name', 'PhoneNumber', 'Email']),
                AssociationRepresentative: manageUtils.buildCustomObject(row, 'AssociationRepresentative', ['Name', 'PhoneNumber', 'Email'])
            };
        };
        var possibleConditions = {
            'id': ['tr.Id', 't.TEAM_ID'],
            'championship': 'c.CHAMPIONSHIP_ID',
            'category': 'cc.CHAMPIONSHIP_CATEGORY_ID',
            'school': ['tr.School', 't.SCHOOL_ID'],
            'sport': 'c.SPORT_ID',
            'region': 'r.REGION_ID'
        };
        //console.log(filters);
        //console.log(possibleConditions);
        Read(db,filters, possibleConditions, baseSQL, recordMapper, function(err, teams) {
            if (err) {
                callback(err);
            } else {
                teams.forEach(team => {
                    if (team.Id != null)
                        team.TeamNumberDisplay = team.TeamNumber || '';
                    if (team.TeamNumberDisplay == null || team.TeamNumberDisplay.length === 0) {

                    }
                });
                var qs = 'Select [Team] As TeamId, Count(Student) As PlayerCount ' +
                    'From PlayerRegistrations ' +
                    'Where [Team] In (' + manageUtils.findNonEmptyMatchesOrDefault(teams, 'Id', 0).join(', ') + ') ' +
                    'Group By [Team] ' +
                    'Union All ' +
                    'Select TEAM_ID As TeamId, Count(PLAYER_ID) As PlayerCount ' +
                    'From PLAYERS ' +
                    'Where DATE_DELETED Is Null And TEAM_ID In (' + manageUtils.findNonEmptyMatchesOrDefault(teams, 'TeamId', 0).join(', ') + ') ' +
                    'Group By TEAM_ID';
                var recordMapper = function(row) {
                    return {
                        Team: row['TeamId'],
                        Players: row['PlayerCount']
                    };
                };
                // console.log(qs);
                Read(db, {}, {}, qs, recordMapper, function(err, dataItems) {
                    //console.log(dataItems);
                    var playerCountMapping = {};
                    if (typeof dataItems !== 'undefined' && dataItems != null) {
                        dataItems.forEach(dataItem => playerCountMapping[dataItem.Team.toString()] = dataItem.Players);
                    }
                    teams.forEach(team => {
                        team.PlayerCount = playerCountMapping[(team.Id || team.TeamId).toString()] || 0;
                    });
                    ReadTokenLogins(db, filters.season, function(err, schoolTokenMapping) {
                        if (err) {
                            console.log('Warning: error while reading token logins');
                            console.log(err);
                        }
                        if (schoolTokenMapping != null) {
                            teams.forEach(function (teamObject) {
                                var key = teamObject.School.School.toString();
                                var mapping = schoolTokenMapping[key] || {};
                                teamObject.Tokens = {
                                    Principal: (mapping['principal'] || {}).Token || '',
                                    Representative: (mapping['representative'] || {}).Token || ''
                                };
                            });
                        }
                        callback(null, teams);
                    });
                });
            }
        });
    });
};

Manage.prototype.getTeamNumbers = function (categoryId, schoolId, callback) {
    var filters = {
        category: categoryId,
        school: schoolId
    };
    var db = this.db;
    var baseSQL = 'Select Distinct TEAM_ID As "Id", IsNull(TEAM_NUMBER, dbo.GetTeamNumber(TEAM_INDEX, \'\')) As "TeamNumber" ' +
        'From TEAMS ' +
        'Where DATE_DELETED Is Null ' + //And CHAMPIONSHIP_CATEGORY_ID=17829 And SCHOOL_ID=1306 ' +
        'Union All ' +
        'Select Id, TeamNumber ' +
        'From TeamRegistrations';
        //'Where Competition=17829 And School=1306';
    var possibleConditions = {
        'category': ['CHAMPIONSHIP_CATEGORY_ID', 'Competition'],
        'school': ['SCHOOL_ID', 'School']
    };
    var recordMapper = function(row) {
        var rawActivity = row['Activity'];
        return {
            Id: row['Id'],
            TeamNumber: row['TeamNumber'],
        }
    };
    Read(db,filters, possibleConditions, baseSQL, recordMapper, callback);
};

Manage.prototype.addTeam = function (userId, team, callback) {
    if (team == null) {
        callback('אין קבוצה');
        return;
    }
    if (!team.School) {
        callback('חסרים נתוני בית ספר');
        return;
    }
    if (!team.Category) {
        callback('חסרים נתוני קטגוריית אליפות');
        return;
    }
    if (!team.Category.Id) {
        callback('זיהוי קטגוריית אליפות שגוי');
        return;
    }

    var db = this.db;
    var qs = null;
    if (team.Id != null) {
        //duplicate team.
        qs = 'Select IsNull(Max(Id), 0) As MaxId from TeamRegistrations';
        Read(db, null, null, qs, 'MaxId', function(err, dataItems) {
            if (err) {
                console.log(err);
                callback('Error reading new id: ' + (err.message || err));
            } else {
                var newTeamId = dataItems[0] + 1;
                logger.info('add-team', "Duplicating team " + team.Id + " as " + newTeamId);
                var rawActivity = team.ActivityTimes;
                var rawHostingHours = team.HostingHours;
                var createdAt = new Date();
                qs = 'Insert Into TeamRegistrations (' +
                    '[Id], School, Competition, TeamNumber, Facility, Activity, HostingHours, CreatedAt, ' +
                    'CoachName, CoachPhoneNumber, CoachEmail, ' +
                    'CoachHelperName, CoachHelperPhoneNumber, CoachHelperEmail, ' +
                    'ManagerName, ManagerPhoneNumber, ManagerEmail, ' +
                    'TeacherName, TeacherPhoneNumber, TeacherEmail, ' +
                    'CoachCertification, AlternativeFacilityName, AlternativeFacilityAddress) ' +
                    'Values (@id, @school, @competition, @teamNumber, @facility, @activity, @hostingHours, @createdAt, ' +
                    '@coachName, @coachPhone, @coachEmail, ' +
                    '@coachHelperName, @coachHelperPhone, @coachHelperEmail, ' +
                    '@managerName, @managerPhone, @managerEmail, ' +
                    '@teacherName, @teacherPhone, @teacherEmail, ' +
                    '@certification, @altFacilityName, @altFacilityAddress)';
                var queryParams = {
                    id: newTeamId,
                    school: team.School,
                    competition: team.Category.Id,
                    teamNumber: team.TeamNumber,
                    facility: team.Facility ? team.Facility.Id : null,
                    activity: rawActivity == null ? null : JSON.stringify(rawActivity),
                    hostingHours: rawHostingHours == null ? null : JSON.stringify(rawHostingHours),
                    createdAt: createdAt,
                    coachName: team.Coach ? team.Coach.Name : null,
                    coachPhone: team.Coach ? team.Coach.PhoneNumber : null,
                    coachEmail: team.Coach ? team.Coach.Email : null,
                    coachHelperName: team.CoachHelper ? team.CoachHelper.Name : null,
                    coachHelperPhone: team.CoachHelper ? team.CoachHelper.PhoneNumber : null,
                    coachHelperEmail: team.CoachHelper ? team.CoachHelper.Email : null,
                    managerName: team.Manager ? team.Manager.Name : null,
                    managerPhone: team.Manager ? team.Manager.PhoneNumber : null,
                    managerEmail: team.Manager ? team.Manager.Email : null,
                    teacherName: team.Teacher ? team.Teacher.Name : null,
                    teacherPhone: team.Teacher ? team.Teacher.PhoneNumber : null,
                    teacherEmail: team.Teacher ? team.Teacher.Email : null,
                    certification: team.Coach ? team.Coach.Certification : null,
                    altFacilityName: team.AlternativeFacility ? team.AlternativeFacility.Name : null,
                    altFacilityAddress: team.AlternativeFacility ? team.AlternativeFacility.Address : null
                };
                Execute(db, qs, queryParams, 'duplicating registration team', function(err, resp) {
                    if (err) {
                        console.log(err);
                        callback('Error adding new tam: ' + (err.message || err));
                    } else {
                        callback(null, {
                            newTeamId: newTeamId
                        });
                    }
                });
            }
        });
    } else {
        GetTeamIndex(db, team, function (err, teamIndex) {
            if (err) {
                callback('Error: ' + (err.message || err));
            } else {
                team.TeamIndex = teamIndex;
                //default value of new team status is 1 when added by admin
                if (team.AdminStatus == null || typeof team.AdminStatus === 'undefined')
                    team.AdminStatus = 2;
                //default value of registration date is now
                if (!team.RegistrationDate)
                    team.RegistrationDate = new Date();
                else if (typeof team.RegistrationDate === 'string')
                    team.RegistrationDate = new Date(team.RegistrationDate);
                qs = 'Insert Into TEAMS ' +
                    '   (' +
                    '       SCHOOL_ID, CHAMPIONSHIP_ID, CHAMPIONSHIP_CATEGORY_ID, [STATUS], TEAM_INDEX, TEAM_SUPERVISOR, ' +
                    '       REGISTRATION_DATE, PLAYER_NUMBER_FROM, PLAYER_NUMBER_TO, TEAM_NUMBER' +
                    '   ) ' +
                    '   Select @school, CHAMPIONSHIP_ID, @category, @status, @index, @supervisor, @registerDate, ' +
                    '       @numFrom, @numTo, @teamNum ' +
                    '   From CHAMPIONSHIP_CATEGORIES ' +
                    '   Where DATE_DELETED Is Null And CHAMPIONSHIP_CATEGORY_ID=@category';
                var params = {
                    school: team.School,
                    category: team.Category.Id,
                    status: team.AdminStatus,
                    index: team.TeamIndex,
                    supervisor: team.Supervisor,
                    registerDate: team.RegistrationDate,
                    numFrom: team.PlayerNumberFrom,
                    numTo: team.PlayerNumberTo,
                    teamNum: team.TeamNumber
                };
                Execute(db, qs, params, 'adding new team', function (err, resp) {
                    if (err) {
                        callback('Error: ' + (err.message || err));
                    } else {
                        qs = 'Select Max(TEAM_ID) As NewTeamId From TEAMS Where DATE_DELETED Is Null';
                        var recordMapper = function (row) {
                            return row['NewTeamId'];
                        };
                        Read(db, {}, {}, qs, recordMapper, function (err, dataItems) {
                            if (err) {
                                callback('Error: ' + (err.message || err));
                            } else {
                                var teamId = dataItems[0];
                                AddAudit(db, userId, 'TEAMS', 'add', teamId, function (err, resp) {
                                    //ignore audit error for now
                                    callback(null, {
                                        newTeamId: teamId
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });
    }
};

Manage.prototype.editTeam = function (userId, team, callback) {
    if (team == null) {
        callback('no data');
        return;
    }

    if (!team.Id && !team.TeamId) {
        callback('missing id');
        return;
    }

    console.log(team);
    callback('test');
    return;

    var db = this.db;
    GetTeamIndex(db, team, function(err, teamIndex) {
        if (err) {
            callback('Error: ' + (err.message || err));
        } else {
            team.TeamIndex = teamIndex;
            if (team.RegistrationDate != null && typeof team.RegistrationDate === 'string')
                team.RegistrationDate = new Date(team.RegistrationDate);
            var queryParams = [];
            var teamIds = [];
            var queries = [];
            if (team.Id) {
                var rawActivity = team.ActivityTimes;
                var rawHostingHours = team.HostingHours;
                teamIds.push(team.Id);
                queries.push('Update TeamRegistrations Set ' +
                    '   TeamNumber=@teamNumber, ' +
                    '   CoachName=@coachName, ' +
                    '   CoachPhoneNumber=@coachPhone, ' +
                    '   CoachEmail=@coachEmail, ' +
                    '   Facility=@facility, ' +
                    '   Activity=@activity, ' +
                    '   HostingHours=@hostingHours, ' +
                    '   [Approved]=@approved, ' +
                    '   CoachHelperName=@coachHelperName, ' +
                    '   CoachHelperPhoneNumber=@coachHelperPhone, ' +
                    '   CoachHelperEmail=@coachHelperEmail, ' +
                    '   ManagerName=@managerName, ' +
                    '   ManagerPhoneNumber=@managerPhone, ' +
                    '   ManagerEmail=@managerEmail, ' +
                    '   TeacherName=@teacherName, ' +
                    '   TeacherPhoneNumber=@teacherPhone, ' +
                    '   TeacherEmail=@teacherEmail, ' +
                    '   CoachCertification=@certification, ' +
                    '   AlternativeFacilityName=@altFacilityName, ' +
                    '   AlternativeFacilityAddress=@altFacilityAddress ' +
                    'Where [Id]=@team');
                queryParams.push({
                    team: team.Id,
                    teamNumber: team.TeamNumber,
                    coachName: team.Coach ? team.Coach.Name : null,
                    coachPhone: team.Coach ? team.Coach.PhoneNumber : null,
                    coachEmail: team.Coach ? team.Coach.Email : null,
                    facility: team.Facility ? team.Facility.Id : null,
                    activity: rawActivity == null ? null : JSON.stringify(rawActivity),
                    hostingHours: rawHostingHours == null ? null : JSON.stringify(rawHostingHours),
                    approved: team.Approved,
                    coachHelperName: team.CoachHelper ? team.CoachHelper.Name : null,
                    coachHelperPhone: team.CoachHelper ? team.CoachHelper.PhoneNumber : null,
                    coachHelperEmail: team.CoachHelper ? team.CoachHelper.Email : null,
                    managerName: team.Manager ? team.Manager.Name : null,
                    managerPhone: team.Manager ? team.Manager.PhoneNumber : null,
                    managerEmail: team.Manager ? team.Manager.Email : null,
                    teacherName: team.Teacher ? team.Teacher.Name : null,
                    teacherPhone: team.Teacher ? team.Teacher.PhoneNumber : null,
                    teacherEmail: team.Teacher ? team.Teacher.Email : null,
                    certification: team.Coach ? team.Coach.Certification : null,
                    altFacilityName: team.AlternativeFacility ? team.AlternativeFacility.Name : null,
                    altFacilityAddress: team.AlternativeFacility ? team.AlternativeFacility.Address : null
                });
            }
            if (team.TeamId) {
                teamIds.push(team.TeamId);
                queries.push('Update TEAMS Set ' +
                    '   [STATUS]=@status, ' +
                    '   TEAM_INDEX=@index, ' +
                    '   TEAM_SUPERVISOR=@supervisor, ' +
                    '   REGISTRATION_DATE=@registerDate, ' +
                    '   PLAYER_NUMBER_FROM=@numFrom, ' +
                    '   PLAYER_NUMBER_TO=@numTo, ' +
                    '   TEAM_NUMBER=@teamNum, ' +
                    '   DATE_LAST_MODIFIED=GetDate() ' +
                    'Where DATE_DELETED Is Null And TEAM_ID=@team');
                queryParams.push({
                    team: team.TeamId,
                    status: team.AdminStatus,
                    index: team.TeamIndex, //manageUtils.teamNumberToIndex(team.TeamNumber),
                    supervisor: team.Supervisor ? team.Supervisor.Id : null,
                    registerDate: team.RegistrationDate,
                    numFrom: team.PlayerNumberFrom,
                    numTo: team.PlayerNumberTo,
                    teamNum: team.TeamNumber
                });
            }

            if (queries.length === 0) {
                callback('fatal error: no query to run')
            } else {
                var qs = queries[0];
                var params = queryParams[0];
                var teamId = teamIds[0];
                Execute(db, qs, params, 'editing team', function (err, resp) {
                    if (err) {
                        callback('Error: ' + (err.message || err));
                    } else {
                        AddAudit(db, userId, 'TEAMS', 'edit', teamId, function (err, resp) {
                            //ignore audit error for now
                            if (queries.length > 1) {
                                qs = queries[1];
                                params = queryParams[1];
                                teamId = teamIds[1];
                                Execute(db, qs, params, 'editing team', function (err, resp) {
                                    if (err) {
                                        callback('Error: ' + (err.message || err));
                                    } else {
                                        AddAudit(db, userId, 'TEAMS', 'edit', teamId, function (err, resp) {
                                            //ignore audit error for now
                                            callback(null, {
                                                Status: 'Success'
                                            });
                                        });
                                    }
                                });
                            } else {
                                callback(null, {
                                    Status: 'Success'
                                });
                            }
                        });
                    }
                });
            }
        }
    });
};

Manage.prototype.deleteTeam = function (options, callback) {
    function getRejectReason(teamId) {
        return new Promise(function (fulfil, reject) {
            if (options.confirmed) {
                fulfil('');
            } else {
                var qs = 'Select Count(*) As HowMuch, \'שחקנים\' As [What] ' +
                    'From PLAYERS ' +
                    'Where DATE_DELETED Is Null ' +
                    'Union All ' +
                    'Select Count(*) As HowMuch, \'רישומים לאליפויות\' As [What] ' +
                    'From CHAMPIONSHIP_GROUP_TEAMS ' +
                    'Where DATE_DELETED Is Null ' +
                    'Union All ' +
                    'Select Count(*) As HowMuch, \'שחקני רישום\' As [What] ' +
                    'From PlayerRegistrations ' +
                    'Where Team=(Select Id From TeamRegistrations Where Team=@team)' +
                    '\n--ignoreParenthesis';
                var recordMapper = function (row) {
                    return {
                        what: row['What'],
                        howMuch: row['HowMuch']
                    };
                };
                var rejectReason = '';
                Read(db, {'team': teamId}, {team: ['TEAM_ID', 'TEAM_ID']}, qs,recordMapper, function (err, dataItems) {
                    for (var i = 0; i < dataItems.length; i++) {
                        var item = dataItems[i];
                        if (item.howMuch > 0) {
                            rejectReason = 'לא ניתן למחוק קבוצה זו. יש להסיר ' + item.what + ' קודם כל';
                            break;
                        }
                    }
                    fulfil(rejectReason);
                });
            }
        });
    }
    var userId = options.userId;
    var registrationId = options.registrationId;
    var teamId = options.teamId;
    var db = this.db;
    var qs;
    if (teamId) {
        getRejectReason(teamId).then(function(rejectReason) {
            if (rejectReason.length > 0) {
                logger.log('info', 'Trying to delete team ' + teamId + ', but it was rejected: ' + rejectReason);
                callback(rejectReason);
                return;
            }
            qs = 'Update TEAMS ' +
                '   Set DATE_DELETED=GetDate() ' +
                '   Where DATE_DELETED Is Null And TEAM_ID=@team';
            Execute(db, qs, {team: teamId}, 'deleting team', function (err, resp) {
                if (err) {
                    callback(err);
                } else {
                    qs = 'Update PLAYERS ' +
                        '   Set DATE_DELETED=GetDate() ' +
                        '   Where DATE_DELETED Is Null And TEAM_ID=@team';
                    Execute(db, qs, {team: teamId}, 'deleting team players', function (err, resp) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        qs = 'Update CHAMPIONSHIP_GROUP_TEAMS ' +
                            '   Set DATE_DELETED=GetDate() ' +
                            '   Where DATE_DELETED Is Null And TEAM_ID=@team';
                        Execute(db, qs, {team: teamId}, 'deleting team championship groups', function (err, resp) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            AddAudit(db, userId, 'TEAMS', 'delete', teamId, function (err, resp) {
                                //ignore audit error for now
                                if (registrationId) {
                                    qs = 'Delete From TeamRegistrations ' +
                                        'Where Id=@team';
                                    Execute(db, qs, {team: registrationId}, 'deleting registration team', function (err, resp) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            AddAudit(db, userId, 'TeamRegistrations', 'delete', registrationId, function (err, resp) {
                                                //ignore audit error for now
                                                callback(null, {
                                                    Status: 'Success'
                                                });
                                            });
                                        }
                                    });
                                } else {
                                    callback(null, {
                                        Status: 'Success'
                                    });
                                }
                            });
                        });
                    });
                }
            });
        }, function(err) {
            callback(err);
        });
    } else if (registrationId) {
        qs = 'Delete From TeamRegistrations ' +
            'Where Id=@team';
        Execute(db, qs, {team: registrationId}, 'deleting registration team', function (err, resp) {
            if (err) {
                callback(err);
            } else {
                AddAudit(db, userId, 'TeamRegistrations', 'delete', registrationId, function (err, resp) {
                    //ignore audit error for now
                    callback(null, {
                        Status: 'Success'
                    });
                });
            }
        });
    } else {
        callback("must pass team id or registration id");
    }
};
/// -------------------------------------------- ///

/// REGIONS ///
Manage.prototype.getRegions = function (options, user, callback) {
    if (typeof options === 'undefined' || options == null)
        options = {};
    var filters = {
        id: options.region
    };
    var db = this.db;
    Season.current(user, function(currentSeason) {
        var withChamps = options.withChampionships;
        var baseSQL = 'Select Distinct r.REGION_ID, r.REGION_NAME, r.[ADDRESS], r.PHONE, r.FAX, r.COORDINATOR As CoordinatorId, ' +
            '   u.USER_FIRST_NAME + \' \' + u.USER_LAST_NAME As CoordinatorName, u.USER_EMAIL As CoordinatorEmail ' +
            'From REGIONS r ';
        if (withChamps) {
            baseSQL += 'Inner Join CHAMPIONSHIPS c On c.REGION_ID=r.REGION_ID And c.DATE_DELETED Is Null And c.SEASON=@season ';
            filters.season = currentSeason;
            // And c.CHAMPIONSHIP_STATUS>0
        }
        baseSQL += '' +
            '   Left Join USERS u On r.COORDINATOR=u.[USER_ID] And u.DATE_DELETED Is Null ' +
            'Where r.DATE_DELETED Is Null';
        var recordMapper = function(row) {
            return {
                Id: row['REGION_ID'],
                Name: row['REGION_NAME'],
                Address: row['ADDRESS'],
                Phone: row['PHONE'],
                Fax: row['FAX'],
                Coordinator: manageUtils.buildCustomObject(row, 'Coordinator', ['Id', 'Name', 'Email'])
            };
        };
        Read(db,filters, {'id': 'r.REGION_ID'}, baseSQL, recordMapper, callback);
    });
};
/// -------------------------------------------- ///

/// CITIES ///
Manage.prototype.getCities = function (cityId, regionId, callback) {
    var filters = {
        id: cityId,
        region: regionId
    };
    var baseSQL = 'Select c.CITY_ID, c.CITY_NAME, c.REGION_ID, r.REGION_NAME, c.DATE_LAST_MODIFIED ' +
        'From CITIES c Left Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
        'Where c.DATE_DELETED Is Null';
    var recordMapper = function(row) {
        return {
            Id: row['CITY_ID'],
            Name: row['CITY_NAME'],
            LastModified: row['DATE_LAST_MODIFIED'],
            Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME')
        };
    };
    Read(this.db,filters, {'id': 'c.CITY_ID', 'region': 'c.REGION_ID'}, baseSQL, recordMapper, callback);
};
/// -------------------------------------------- ///

/// SPORTS ///
Manage.prototype.getSports = function (options, user, callback) {
    if (typeof options === 'undefined' || options == null)
        options = {};
    var filters = {
        id: options.id || null,
        type: options.type || null,
        region: options.region
    };
    var db = this.db;
    Season.current(user, function(currentSeason) {
        var withChamps = options.withChampionships;
        var baseSQL = 'Select Distinct s.SPORT_ID, s.SPORT_NAME, s.SPORT_TYPE ' +
            'From SPORTS s ';
        if (withChamps) {
            baseSQL += 'Inner Join CHAMPIONSHIPS c On c.SPORT_ID=s.SPORT_ID And c.DATE_DELETED Is Null And c.SEASON=@season ';
            filters.season = currentSeason;
            // And c.CHAMPIONSHIP_STATUS>0
        }
        baseSQL += '' +
            'Where s.DATE_DELETED Is Null ' +
            'Order By s.SPORT_NAME Asc';
        var recordMapper = function(row) {
            return {
                Id: row['SPORT_ID'],
                Name: row['SPORT_NAME'],
                Type: row['SPORT_TYPE']
            };
        };
        var possibleConditions = {
            'id': 's.SPORT_ID',
            'type': 's.SPORT_TYPE'
        };
        if (withChamps) {
            possibleConditions.region = 'c.REGION_ID';
        }
        Read(db,filters, possibleConditions, baseSQL, recordMapper, callback);
    });
};
/// -------------------------------------------- ///

/// SCHOOLS ///
Manage.prototype.getSchools = function (schoolId, season, schoolRegionId, schoolCityId, callback) {
    callback = manageUtils.applyCallbackArgument(arguments);
    let currentSeason = Season.current();
    var filters = {
        season: season,
        id: schoolId,
        region: schoolRegionId,
        city: schoolCityId
    };
    var baseSQL = 'Select sc.SCHOOL_ID, sc.SYMBOL, sc.SCHOOL_NAME, sc.[ADDRESS], sc.MAIL_ADDRESS, sc.ZIP_CODE, sc.EMAIL, sc.PHONE, sc.FAX, sc.MANAGER_NAME, ' +
        '   sc.MANAGER_CELL_PHONE, sc.FROM_GRADE, sc.TO_GRADE, sc.SUPERVISION_TYPE, sc.SECTOR_TYPE, sc.CLUB_STATUS, sc.DATE_LAST_MODIFIED, ' +
        '   sc.PLAYER_NUMBER_FROM, sc.PLAYER_NUMBER_TO, sc.REGION_ID, r.REGION_NAME, ' +
        '   sc.CITY_ID, c.CITY_NAME, sc.MAIL_CITY_ID, c_mail.CITY_NAME As MAIL_CITY_NAME, ' +
        '   sr.[Name] As RegistrationName, sr.[Type] As RegistrationType, sr.[Address] As RegistrationAddress, ' +
        '   sr.PhoneNumber As RegistrationPhoneNumber, sr.Fax As RegistrationFax, sr.Email As RegistrationEmail, ' +
        '   sr.PrincipalName As RegistrationPrincipalName, sr.PrincipalPhoneNumber As RegistrationPrincipalPhoneNumber,sr.PrincipalEmail As RegistrationPrincipalEmail, ' +
        '   sr.ChairmanName As RegistrationChairmanName, sr.ChairmanPhoneNumber As RegistrationChairmanPhoneNumber,sr.ChairmanEmail As RegistrationChairmanEmail, ' +
        '   sr.CoordinatorName As RegistrationCoordinatorName, sr.CoordinatorPhoneNumber As RegistrationCoordinatorPhoneNumber, sr.CoordinatorEmail As RegistrationCoordinatorEmail, ' +
        '   sr.RepresentativeName As RegistrationRepresentativeName, sr.RepresentativePhoneNumber As RegistrationRepresentativePhoneNumber, sr.RepresentativeEmail As RegistrationRepresentativeEmail, ' +
        '   sr.TeacherName As RegistrationTeacherName, sr.TeacherPhoneNumber As RegistrationTeacherPhoneNumber, sr.TeacherEmail As RegistrationTeacherEmail, ' +
        '   sr.ParentsCommitteeName As RegistrationParentsCommitteeName, sr.ParentsCommitteePhoneNumber As RegistrationParentsCommitteePhoneNumber, sr.ParentsCommitteeEmail As RegistrationParentsCommitteeEmail, ' +
        '   sr.StudentsRepresentativeName As RegistrationStudentsRepresentativeName, sr.StudentsRepresentativePhoneNumber As RegistrationStudentsRepresentativePhoneNumber, sr.StudentsRepresentativeEmail As RegistrationStudentsRepresentativeEmail, ' +
        '   sr.AssociationRepresentativeName As RegistrationAssociationRepresentativeName, sr.AssociationRepresentativePhoneNumber As RegistrationAssociationRepresentativePhoneNumber, sr.AssociationRepresentativeEmail As RegistrationAssociationRepresentativeEmail, ' +
        '   sr.AssociationNumber As RegistrationAssociationNumber, sr.Stage As RegistrationStage, sr.Club As RegistrationClub, sr.League As RegistrationLeague ' +
        'From SCHOOLS sc Inner Join REGIONS r On sc.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
        '   Left Join CITIES c On sc.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
        '   Left Join SchoolRegistrations sr On sr.School=sc.SCHOOL_ID And sr.Season=@season ' +
        '   Left Join CITIES c_mail On sc.MAIL_CITY_ID=c_mail.CITY_ID And c_mail.DATE_DELETED Is Null ' +
        'Where sc.DATE_DELETED Is Null';
    var recordMapper = function(row) {
        var registration = manageUtils.buildCustomObject(row, 'Registration*', []);
        if (registration != null) {
            registration.Principal = manageUtils.truncateContactData(registration, 'Principal');
            registration.Chairman = manageUtils.truncateContactData(registration, 'Chairman');
            registration.Coordinator = manageUtils.truncateContactData(registration, 'Coordinator');
            registration.Representative = manageUtils.truncateContactData(registration, 'Representative');

            registration.Teacher = manageUtils.truncateContactData(registration, 'Teacher');
            registration.ParentsCommittee = manageUtils.truncateContactData(registration, 'ParentsCommittee');
            registration.StudentsRepresentative = manageUtils.truncateContactData(registration, 'StudentsRepresentative');
            registration.AssociationRepresentative = manageUtils.truncateContactData(registration, 'AssociationRepresentative');
        }
        return {
            Id: row['SCHOOL_ID'],
            Symbol: row['SYMBOL'],
            Name: row['SCHOOL_NAME'],
            Address: row['ADDRESS'],
            MailAddress: row['MAIL_ADDRESS'],
            ZipCode: row['ZIP_CODE'],
            Email: row['EMAIL'],
            PhoneNumber: row['PHONE'],
            FaxNumber: row['FAX'],
            ManagerName: row['MANAGER_NAME'],
            ManagerCellPhone: row['MANAGER_CELL_PHONE'],
            GradeRange: {
                From: currentSeason - row['FROM_GRADE'],
                To: currentSeason - row['TO_GRADE']
            },
            SuperVisionType: row['SUPERVISION_TYPE'],
            SectorType: row['SECTOR_TYPE'],
            IsClub: row['CLUB_STATUS'] === 1,
            PlayerNumberRange: {
                From: row['PLAYER_NUMBER_FROM'],
                To: row['PLAYER_NUMBER_TO']
            },
            LastModified: row['DATE_LAST_MODIFIED'],
            Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
            City: manageUtils.buildSimpleObject(row, 'CITY_ID', 'CITY_NAME'),
            MailCity: manageUtils.buildSimpleObject(row, 'MAIL_CITY_ID', 'MAIL_CITY_NAME'),
            Registration: registration
        };
    };
    Read(this.db,filters, {'id': 'sc.SCHOOL_ID', 'region': 'sc.REGION_ID', 'city': 'sc.CITY_ID'}, baseSQL, recordMapper, callback);
};
/// -------------------------------------------- ///

/// STUDENTS ///
Manage.prototype.getStudents = function (studentId, idNumber, schoolId, grade, callback) {
    callback = manageUtils.applyCallbackArgument(arguments);
    let currentSeason = Season.current();
    var activeSeason = Season.active();
    var filters = {
        id: studentId,
        school: schoolId,
        idNumber: idNumber,
        grade: grade == null ? null : grade + activeSeason
    };
    if (studentId == null && idNumber == null && schoolId == null) {
        callback("Must provide id, id number, or school");
        return;
    }
    var baseSQL = 'Select st.STUDENT_ID, st.ID_NUMBER, st.FIRST_NAME, st.LAST_NAME, st.BIRTH_DATE, st.SCHOOL_ID, ' +
        '   st.GRADE, st.SEX_TYPE, sc.REGION_ID, sc.SCHOOL_NAME, sc.SYMBOL, r.REGION_NAME ' +
        'From STUDENTS st Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null ' +
        '   Inner Join REGIONS r On sc.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
        'Where st.DATE_DELETED Is Null';
    var recordMapper = function(row) {
        return {
            Id: row['STUDENT_ID'],
            FirstName: row['FIRST_NAME'],
            LastName: row['LAST_NAME'],
            IdNumber: row['ID_NUMBER'],
            BirthDate: row['BIRTH_DATE'],
            Gender: row['SEX_TYPE'],
            Grade: currentSeason - row['GRADE'],
            School: manageUtils.buildSimpleObject(row, 'SCHOOL_ID', 'SCHOOL_NAME'),
            Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME')
        };
    };
    Read(this.db,filters, {'id': 'st.STUDENT_ID', 'school': 'st.SCHOOL_ID', 'grade': 'st.GRADE', 'idNumber': 'st.ID_NUMBER' }, baseSQL, recordMapper, callback);
};
/// -------------------------------------------- ///

/// CHAMPIONSHIPS ///
Manage.prototype.getChampionships = function (options, user, callback) {
    var filters = {
        season: options.season,
        id: options.id,
        sport: options.sport,
        region: options.region
    };
    var db = this.db;
    Season.current(user, function(currentSeason) {
        if (filters.season == null || !filters.season)
            filters.season = currentSeason;
        var baseSQL = 'Select c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.REGION_ID, c.SPORT_ID, c.RULESET_ID,  ' +
            '   c.IS_CLUBS, c.IS_LEAGUE, c.IS_OPEN, c.CHAMPIONSHIP_STATUS, r.REGION_NAME, sp.SPORT_NAME, sp.SPORT_TYPE, ru.RULESET_NAME, ' +
            '   c.LAST_REGISTRATION_DATE As DateLastRegistration, c.[START_DATE] As DateStart, c.END_DATE As DateEnd, ' +
            '   c.ALT_START_DATE As DateAltStart, c.ALT_END_DATE As DateAltEnd, c.FINALS_DATE As DateFinals, c.ALT_FINALS_DATE As DateAltFinals, ' +
            '   u.[USER_ID] As SupervisorId, u.[USER_FIRST_NAME] + \' \' + u.[USER_LAST_NAME] As SupervisorName, u.USER_EMAIL As SupervisorEmail, ' +
            '   c.CHAMPIONSHIP_NUMBER, c.REMARKS, c.DATE_LAST_MODIFIED ' +
            'From CHAMPIONSHIPS c Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
            '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
            '   Left Join RULESETS ru On c.RULESET_ID=ru.RULESET_ID And ru.DATE_DELETED Is Null ' +
            '   Left Join USERS u On c.CHAMPIONSHIP_SUPERVISOR=u.[USER_ID] And u.DATE_DELETED Is Null ' +
            'Where c.DATE_DELETED Is Null And c.SEASON=@season';
        var recordMapper = function(row) {
            return {
                Id: row['CHAMPIONSHIP_ID'],
                Number: row['CHAMPIONSHIP_NUMBER'],
                Name: row['CHAMPIONSHIP_NAME'],
                IsClubs: row['IS_CLUBS'] == 1,
                IsLeague: row['IS_LEAGUE'] == 1,
                IsOpen: row['IS_OPEN'] == 1,
                Status: row['CHAMPIONSHIP_STATUS'],
                Remarks: row['REMARKS'],
                LastModified: row['DATE_LAST_MODIFIED'],
                Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
                //Sport: manageUtils.buildSimpleObject(row, 'SPORT_ID', 'SPORT_NAME'),
                Sport: manageUtils.buildCustomObject(row, 'SPORT_', ['ID', 'NAME', 'TYPE']),
                Ruleset: manageUtils.buildSimpleObject(row, 'RULESET_ID', 'RULESET_NAME'),
                Supervisor: manageUtils.buildContactObject(row, 'Supervisor', ['Id']),
                Dates: manageUtils.buildCustomObject(row, 'Date', ['LastRegistration', 'Start', 'End', 'AltStart', 'AltEnd', 'Finals', 'AltFinals']),
                Categories: []
            };
        };
        Read(db,filters, {'id': 'c.CHAMPIONSHIP_ID', 'region': 'c.REGION_ID', 'sport': 'c.SPORT_ID' }, baseSQL, recordMapper, function(err, championships) {
            if (err) {
                callback(err);
            } else {
                championships.forEach(championship => {
                    if (championship.Sport != null) {
                        championship.Sport.Id = championship.Sport.ID;
                        championship.Sport.id = championship.Sport.ID;
                        championship.Sport.Name = championship.Sport.NAME;
                        championship.Sport.name = championship.Sport.NAME;
                        championship.Sport.Type = championship.Sport.TYPE;
                        championship.Sport.type = championship.Sport.TYPE;
                    }
                });
                baseSQL = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, cm.CATEGORY_NAME, cc.REGISTRATION_PRICE, cc.[STATUS], cc.CHAMPIONSHIP_ID ' +
                    'From CHAMPIONSHIP_CATEGORIES cc Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                    'Where cc.DATE_DELETED Is Null And c.SEASON=@season';
                recordMapper = function(row) {
                    return {
                        Id: row['CHAMPIONSHIP_CATEGORY_ID'],
                        Name: row['CATEGORY_NAME'],
                        RegistrationPrice: row['REGISTRATION_PRICE'],
                        Status: row['STATUS'],
                        ChampionshipId: row['CHAMPIONSHIP_ID']
                    };
                };
                Read(db,filters, {'id': 'c.CHAMPIONSHIP_ID', 'sport': 'c.SPORT_ID', 'region': 'c.REGION_ID' }, baseSQL, recordMapper, function(err, categories) {
                    if (err) {
                        callback(err);
                    } else {
                        categories.forEach(category => {
                            var matchingChampionship = championships.find(c => c.Id === category.ChampionshipId);
                            if (matchingChampionship != null) {
                                matchingChampionship.Categories.push({
                                    Id: category.Id,
                                    Name: category.Name,
                                    RegistrationPrice: category.RegistrationPrice,
                                    Status: category.Status
                                });
                            }
                        });
                        callback(null, championships);
                    }
                });
            }
        });
    });
};
/// -------------------------------------------- ///

/// CHAMPIONSHIP_CATEGORIES ///
Manage.prototype.getCategories = function (options, user, callback) {
    var filters = {
        season: options.season,
        id: options.id,
        championship: options.championship,
        sport: options.sport
    };
    if (filters.id == null && filters.championship == null && filters.sport == null) {
        callback("Must provide id, championship, or sport");
        return;
    }
    var db = this.db;
    Season.current(user, function(currentSeason) {
        var baseSQL = '';
        var recordMapper = null;
        var possibleConditions = {};
        if (filters.championship == -1) {
            baseSQL = 'Select RAW_CATEGORY, CATEGORY_NAME ' +
                'From CATEGORY_MAPPING ' +
                'Order By CATEGORY_NAME Asc';
            recordMapper = function(row) {
                return {
                    Category: row['RAW_CATEGORY'],
                    Name: row['CATEGORY_NAME']
                };
            };
        } else {
            baseSQL = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, cm.CATEGORY_NAME, cc.REGISTRATION_PRICE, cc.[STATUS], ' +
                '   cc.CHAMPIONSHIP_ID, cc.CHARGE_SEASON, s.[NAME] As CHARGE_SEASON_NAME, c.CHAMPIONSHIP_NAME ' +
                'From CHAMPIONSHIP_CATEGORIES cc Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                '   Left Join SEASONS s On cc.CHARGE_SEASON=s.SEASON And s.DATE_DELETED Is Null ' +
                'Where cc.DATE_DELETED Is Null';
            recordMapper = function(row) {
                return {
                    Id: row['CHAMPIONSHIP_CATEGORY_ID'],
                    Name: row['CATEGORY_NAME'],
                    RegistrationPrice: row['REGISTRATION_PRICE'],
                    Status: row['STATUS'],
                    Championship: manageUtils.buildSimpleObject(row, 'CHAMPIONSHIP_ID', 'CHAMPIONSHIP_NAME'),
                    ChargeSeason: manageUtils.buildSimpleObject(row, 'CHARGE_SEASON', 'CHARGE_SEASON_NAME')
                };
            };
            possibleConditions = {
                'id': 'cc.CHAMPIONSHIP_CATEGORY_ID',
                'championship': 'cc.CHAMPIONSHIP_ID',
                'sport': 'c.SPORT_ID',
                'season': 'c.SEASON'
            }
            if (filters.id != null) {
                filters = v2Utils.removeField(filters, 'season');
                possibleConditions = v2Utils.removeField(possibleConditions, 'season');
            } else if (filters.season == null || !filters.season) {
                filters.season = currentSeason;
            }
        }
        //console.log(baseSQL);
        //console.log(filters);
        //console.log(possibleConditions);
        Read(db,filters, possibleConditions, baseSQL, recordMapper, callback);
    });
};

Manage.prototype.editCategory = function (categoryData, callback) {
    var params = {
        id: categoryData.id,
        chargeSeason: categoryData.chargeSeason,
        price: categoryData.price
    };
    if (params.id == null) {
        callback("Must provide id");
        return;
    }
    if (params.price == null) {
        callback("Must provide price");
        return;
    }
    var db = this.db;
    var qs = 'Update CHAMPIONSHIP_CATEGORIES ' +
        'Set CHARGE_SEASON=@chargeSeason, REGISTRATION_PRICE=@price ' +
        'Where CHAMPIONSHIP_CATEGORY_ID=@id';
    Execute(db, qs, params, 'editing category' + params.id, callback);
}
/// -------------------------------------------- ///

/// CATEGORY_NAMES ///
Manage.prototype.getCategoryNames = function (season, sportId, regionId, callback) {
    callback = manageUtils.applyCallbackArgument(arguments);
    var filters = {
        season: season,
        sport: sportId,
        region: regionId
    };
    var baseSQL = 'Select Distinct cc.CATEGORY, cm.CATEGORY_NAME, c.SPORT_ID, c.REGION_ID ' +
        'From CHAMPIONSHIP_CATEGORIES cc Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
        '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
        'Where cc.DATE_DELETED Is Null And c.SEASON=@season';
    var recordMapper = function(row) {
        return {
            Id: row['CATEGORY'],
            Name: row['CATEGORY_NAME'],
            Sport: row['SPORT_ID'],
            Region: row['REGION_ID']
        };
    };
    Read(this.db,filters, {'sport': 'c.SPORT_ID', 'region': 'c.REGION_ID' }, baseSQL, recordMapper, function(err, records) {
        if (err) {
            callback(err);
        } else {
            var categoryNames = [];
            for (var i = 0; i < records.length; i++) {
                let row = records[i];
                var categoryName = categoryNames.find(c => c.Id === row.Id);
                if (categoryName == null) {
                    categoryName = {
                        Id: row.Id,
                        Name: row.Name,
                        Sports: [],
                        Regions: []
                    };
                    categoryNames.push(categoryName);
                }
                if (categoryName.Sports.indexOf(row.Sport) < 0)
                    categoryName.Sports.push(row.Sport);
                if (categoryName.Regions.indexOf(row.Region) < 0)
                    categoryName.Regions.push(row.Region);
            }
            callback(null, categoryNames);
        }
    });
};
/// -------------------------------------------- ///

Manage.prototype.getTeamCounts = async function(options, user, callback) {
    var qs = '';
    var connection = null;
    var queryParams = {
        season: options.season
    };
    var db = this.db;
    Season.current(user, async function(currentSeason) {
        if (queryParams.season == null || !queryParams.season) {
            queryParams.season = currentSeason;
        }
        try {
            connection = await db.connect();
            qs = 'Select \'old\' As [Type], cc.CHAMPIONSHIP_CATEGORY_ID As CategoryId, c.CHAMPIONSHIP_ID As ChampionshipId, c.REGION_ID As RegionId, ' +
                '   c.SPORT_ID As SportId, Count(Distinct t.TEAM_ID) As TeamCount ' +
                'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.SEASON=@season ' +
                'Where t.DATE_DELETED Is Null ' +
                'Group By cc.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_ID, c.REGION_ID, c.SPORT_ID ' +
                'Union All ' +
                'Select \'new\' As [Type], cc.CHAMPIONSHIP_CATEGORY_ID As CategoryId, c.CHAMPIONSHIP_ID As ChampionshipId, c.REGION_ID As RegionId,  ' +
                '   c.SPORT_ID As SportId, Count(Distinct tr.Id) As TeamCount ' +
                'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.SEASON=@season ' +
                'Where tr.Team Is Null ' +
                'Group By cc.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_ID, c.REGION_ID, c.SPORT_ID';
            var records = await connection.request(qs, queryParams);
            var teamCountMapping = {
                ByRegion: {},
                BySport: {},
                ByChampionship: {},
                ByCategory: {}
            };
            if (records != null && records.length > 0) {
                for (var i = 0; i < records.length; i++) {
                    var row = records[i];
                    var count = row['TeamCount'];
                    var type = row['Type'];
                    for (var mappingField in teamCountMapping) {
                        var fieldName = mappingField.replace('By', '');
                        var key = row[fieldName + 'Id'].toString();
                        if (!teamCountMapping[mappingField][key]) {
                            teamCountMapping[mappingField][key] = {
                                old: 0,
                                new: 0,
                                total: 0
                            }
                        }
                        teamCountMapping[mappingField][key][type] += count;
                        teamCountMapping[mappingField][key].total += count;
                    }
                }
            }
            callback(null, teamCountMapping);
        }
        catch (err) {
            logger.error('Error while reading team counts: ' + (err.message || err) +
                ' (last query: ' + qs);
            callback(err);
        }
        finally {
            if (connection) {
                connection.complete();
            }
        }
    });
}

/// SEASONS ///
Manage.prototype.getSeasons = function (callback) {
    var baseSQL = 'Select Distinct s.SEASON As SeasonId, s.NAME As SeasonName ' +
            'From CHAMPIONSHIPS c Inner Join SEASONS s On c.SEASON=s.SEASON And s.DATE_DELETED Is Null ' +
            'Where c.DATE_DELETED Is Null And c.SEASON>=' + settings.firstRegistrationSeason + ' ' +
            'Order By s.SEASON Asc';
    var recordMapper = function(row) {
        return {
            Id: row['SeasonId'],
            Name: row['SeasonName']
        };
    };
    Read(this.db, {}, {}, baseSQL, recordMapper, function(err, records) {
        if (err) {
            callback(err);
        } else {
            var seasons = [];
            for (var i = 0; i < records.length; i++) {
                seasons.push(records[i]);
            }
            callback(null, seasons);
        }
    });
};
/// -------------------------------------------- ///

/// PLAYERS ///
// Manage.prototype.getPlayers = function (options, user, callback) {
//     //getTeams
//     var filters = {
//         season: options.season,
//         id: options.id,
//         championship: options.championship,
//         school: options.school,
//         category: options.category,
//         sport: options.sport,
//         region: options.region,
//         team: options.team,
//         student: options.student
//     };
//     var db = this.db;
//     var activeSeason = Season.active();
//     var teamId = options.team;
//     Season.current(user, function(currentSeason) {
//         if (filters.season == null || !filters.season)
//             filters.season = currentSeason;
//         var leagueClause = '';
//         if (parseInt(options.region, 10) === 0) {
//             leagueClause = ' And c.IS_LEAGUE=1 And c.IS_CLUBS=0 And c.IS_OPEN=0 ';
//         }
//         var baseSQL = 'Select pr.Team, Null As "TeamId", pr.Student As StudentId, pr.Approved, pr.CreatedAt, pr.Player As "PlayerId",  ' +
//             '   p.REGISTRATION_DATE As PlayerRegistrationDate, p.[STATUS] As PlayerAdminStatus, p.TEAM_NUMBER As PlayerShirtNumber, ' +
//             '   tr.TeamNumber, sc.CITY_ID, cit.CITY_NAME, pr.Approved, cc.CHAMPIONSHIP_CATEGORY_ID, ' +
//             '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, sp.SPORT_ID, sp.SPORT_NAME, cm.RAW_CATEGORY, cm.CATEGORY_NAME,  ' +
//             '   st.ID_NUMBER As StudentIdNumber, st.FIRST_NAME As StudentFirstName, st.LAST_NAME As StudentLastName, ' +
//             '   st.BIRTH_DATE As StudentBirthDate, st.SCHOOL_ID As StudentSchoolId, sc.SCHOOL_NAME As StudentSchoolName, ' +
//             '   sc.SYMBOL As StudentSchoolSymbol, st.GRADE As StudentGrade, st.SEX_TYPE As StudentGender, ' +
//             '   sr.REGION_ID As StudentRegionId, sr.REGION_NAME As StudentRegionName, p.DATE_LAST_MODIFIED, ' +
//             '   p.REMARKS, p.GOT_STICKER, c.SEASON, r.REGION_ID, r.REGION_NAME ' +
//             'From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.Team=tr.Id ' +
//             '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
//             '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
//             '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
//             '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
//             '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
//             '   Left Join PLAYERS p On pr.Player=p.PLAYER_ID And p.DATE_DELETED Is Null ' +
//             '   Left Join STUDENTS st On pr.Student=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
//             '   Left Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null ' +
//             '   Left Join REGIONS sr On sc.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
//             '   Left Join CITIES cit On sc.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
//             'Where c.SEASON=@season ' + leagueClause + ' ' +
//             'Union All ' +
//             'Select Null As "Team", p.TEAM_ID As "TeamId", p.STUDENT_ID As "StudentId", Null As "Approved", Null As "CreatedAt", p.PLAYER_ID As "PlayerId",  ' +
//             '   p.REGISTRATION_DATE As PlayerRegistrationDate, p.[STATUS] As PlayerAdminStatus, p.TEAM_NUMBER As PlayerShirtNumber, ' +
//             '   Convert(nvarchar(10), t.TEAM_INDEX) As "TeamNumber", sc.CITY_ID, cit.CITY_NAME, Null As "Approved", cc.CHAMPIONSHIP_CATEGORY_ID, ' +
//             '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, sp.SPORT_ID, sp.SPORT_NAME, cm.RAW_CATEGORY, cm.CATEGORY_NAME, ' +
//             '   st.ID_NUMBER As StudentIdNumber, st.FIRST_NAME As StudentFirstName, st.LAST_NAME As StudentLastName, ' +
//             '   st.BIRTH_DATE As StudentBirthDate, st.SCHOOL_ID As StudentSchoolId, sc.SCHOOL_NAME As StudentSchoolName, ' +
//             '   sc.SYMBOL As StudentSchoolSymbol, st.GRADE As StudentGrade, st.SEX_TYPE As StudentGender, ' +
//             '   sr.REGION_ID As StudentRegionId, sr.REGION_NAME As StudentRegionName, p.DATE_LAST_MODIFIED, ' +
//             '   p.REMARKS, p.GOT_STICKER, c.SEASON, r.REGION_ID, r.REGION_NAME ' +
//             'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
//             '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
//             '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
//             '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
//             '   Inner Join STUDENTS st On p.STUDENT_ID=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
//             '   Inner Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null ' +
//             '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
//             '   Left Join REGIONS sr On sc.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
//             '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
//             '   Left Join CITIES cit On sc.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
//             '   Left Join PlayerRegistrations pr On pr.Player=p.PLAYER_ID ' +
//             'Where p.DATE_DELETED Is Null And c.SEASON=@season And pr.Student Is Null ' + leagueClause;
//         if (teamId) {
//             baseSQL += '' +
//                 'Union All ' +
//                 'Select pr.Team, Null As "TeamId", pr.Student As StudentId, pr.Approved, pr.CreatedAt, pr.Player As "PlayerId",  ' +
//                 '   p.REGISTRATION_DATE As PlayerRegistrationDate, p.[STATUS] As PlayerAdminStatus, p.TEAM_NUMBER As PlayerShirtNumber, ' +
//                 '   tr.TeamNumber, sc.CITY_ID, cit.CITY_NAME, pr.Approved, cc.CHAMPIONSHIP_CATEGORY_ID, ' +
//                 '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, sp.SPORT_ID, sp.SPORT_NAME, cm.RAW_CATEGORY, cm.CATEGORY_NAME,  ' +
//                 '   st.ID_NUMBER As StudentIdNumber, st.FIRST_NAME As StudentFirstName, st.LAST_NAME As StudentLastName, ' +
//                 '   st.BIRTH_DATE As StudentBirthDate, st.SCHOOL_ID As StudentSchoolId, sc.SCHOOL_NAME As StudentSchoolName, ' +
//                 '   sc.SYMBOL As StudentSchoolSymbol, st.GRADE As StudentGrade, st.SEX_TYPE As StudentGender, ' +
//                 '   sr.REGION_ID As StudentRegionId, sr.REGION_NAME As StudentRegionName, p.DATE_LAST_MODIFIED, ' +
//                 '   p.REMARKS, p.GOT_STICKER, c.SEASON, r.REGION_ID, r.REGION_NAME ' +
//                 'From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.Team=tr.Id ' +
//                 '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
//                 '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
//                 '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
//                 '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
//                 '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
//                 '   Left Join PLAYERS p On pr.Player=p.PLAYER_ID And p.DATE_DELETED Is Null ' +
//                 '   Left Join STUDENTS st On pr.Student=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
//                 '   Left Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null ' +
//                 '   Left Join REGIONS sr On sc.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
//                 '   Left Join CITIES cit On sc.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
//                 'Where c.SEASON=@season ' + leagueClause;
//         }

//         console.log(baseSQL);
//         console.log(filters);
//         var recordMapper = function(row) {
//             var student = manageUtils.buildCustomObject(row, 'Student*', []);
//             student.School = manageUtils.truncateCustomData(student, 'School', ['Id', 'Name', 'Symbol', '', '', '']);
//             student.Region = manageUtils.truncateCustomData(student, 'Region', ['Id', 'Name']);
//             student.Grade = activeSeason - student.Grade;
//             student.City = manageUtils.buildSimpleObject(row, 'CITY_ID', 'CITY_NAME');
//             var player = {
//                 Team: row['Team'],
//                 TeamId: row['TeamId'],
//                 TeamNumber: row['TeamNumber'],
//                 CreatedAt: row['CreatedAt'],
//                 Approved: row['Approved'],
//                 Remarks: row['REMARKS'],
//                 GotSticker: row['GOT_STICKER'] === 1,
//                 Season: row['SEASON'],
//                 Player: manageUtils.buildCustomObject(row, 'Player', ['Id', 'RegistrationDate', 'AdminStatus', 'ShirtNumber']),
//                 Student: student,
//                 Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
//                 Championship: manageUtils.buildSimpleObject(row, 'CHAMPIONSHIP_ID', 'CHAMPIONSHIP_NAME'),
//                 Sport: manageUtils.buildSimpleObject(row, 'SPORT_ID', 'SPORT_NAME'),
//                 Category: manageUtils.buildSimpleObject(row, 'RAW_CATEGORY', 'CATEGORY_NAME', ['CHAMPIONSHIP_CATEGORY_ID']),
//                 LastModified: row['DATE_LAST_MODIFIED']
//             };
//             player.Category.Category = row['CHAMPIONSHIP_CATEGORY_ID'];
//             return player;
//         };
//         var possibleConditions = {
//             'id': ['pr.Player', 'p.PLAYER_ID'],
//             'team': ['pr.Team', 'p.TEAM_ID'],
//             'student': 'p.STUDENT_ID',
//             'championship': 'c.CHAMPIONSHIP_ID',
//             'category': 'cc.CHAMPIONSHIP_CATEGORY_ID',
//             'school': ['tr.School', 't.SCHOOL_ID'],
//             'region': 'r.REGION_ID',
//             'sport': 'sp.SPORT_ID'
//         };
//         if (teamId) {
//             possibleConditions['team'].push('tr.Team');
//         }
//         Read(db,filters, possibleConditions, baseSQL, recordMapper, callback);
//     });
// };

Manage.prototype.getPlayers = function (options, user, callback) {
    //getTeams
    var filters = {
        season: options.season,
        id: options.id,
        championship: options.championship,
        school: options.school,
        category: options.category,
        sport: options.sport,
        region: options.region,
        team: options.team,
        student: options.student
    };
    var db = this.db;
    var activeSeason = Season.active();
    var teamId = options.team;
    Season.current(user, function(currentSeason) {
        if (filters.season == null || !filters.season)
            filters.season = currentSeason;
        var leagueClause = '';
        if (parseInt(options.region, 10) === 0) {
            leagueClause = ' And c.IS_LEAGUE=1 And c.IS_CLUBS=0 And c.IS_OPEN=0 ';
        }
        var baseSQL = 'Select pr.Team, Null As "TeamId", pr.Student As StudentId, pr.Approved, pr.CreatedAt, pr.Player As "PlayerId",  ' +
            '   p.REGISTRATION_DATE As PlayerRegistrationDate, p.[STATUS] As PlayerAdminStatus, p.TEAM_NUMBER As PlayerShirtNumber, ' +
            '   tr.TeamNumber, sc.CITY_ID, cit.CITY_NAME, pr.Approved, cc.CHAMPIONSHIP_CATEGORY_ID, ' +
            '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, sp.SPORT_ID, sp.SPORT_NAME, cm.RAW_CATEGORY, cm.CATEGORY_NAME,  ' +
            '   st.ID_NUMBER As StudentIdNumber, st.FIRST_NAME As StudentFirstName, st.LAST_NAME As StudentLastName, ' +
            '   st.BIRTH_DATE As StudentBirthDate, st.SCHOOL_ID As StudentSchoolId, sc.SCHOOL_NAME As StudentSchoolName, ' +
            '   sc.SYMBOL As StudentSchoolSymbol, st.GRADE As StudentGrade, st.SEX_TYPE As StudentGender, ' +
            '   sr.REGION_ID As StudentRegionId, sr.REGION_NAME As StudentRegionName, p.DATE_LAST_MODIFIED, ' +
            '   p.REMARKS, p.GOT_STICKER, c.SEASON, r.REGION_ID, r.REGION_NAME ' +
            'From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.Team=tr.Id ' +
            '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
            '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
            '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
            '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
            '   Left Join PLAYERS p On pr.Player=p.PLAYER_ID And p.DATE_DELETED Is Null ' +
            '   Left Join STUDENTS st On pr.Student=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
            '   Left Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null ' +
            '   Left Join REGIONS sr On sc.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
            '   Left Join CITIES cit On sc.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
            'Where c.SEASON=@season ' + leagueClause + ' ';
        if (teamId) {
            baseSQL += '' +
                'Union All ' +
                'Select pr.Team, Null As "TeamId", pr.Student As StudentId, pr.Approved, pr.CreatedAt, pr.Player As "PlayerId",  ' +
                '   p.REGISTRATION_DATE As PlayerRegistrationDate, p.[STATUS] As PlayerAdminStatus, p.TEAM_NUMBER As PlayerShirtNumber, ' +
                '   tr.TeamNumber, sc.CITY_ID, cit.CITY_NAME, pr.Approved, cc.CHAMPIONSHIP_CATEGORY_ID, ' +
                '   c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, sp.SPORT_ID, sp.SPORT_NAME, cm.RAW_CATEGORY, cm.CATEGORY_NAME,  ' +
                '   st.ID_NUMBER As StudentIdNumber, st.FIRST_NAME As StudentFirstName, st.LAST_NAME As StudentLastName, ' +
                '   st.BIRTH_DATE As StudentBirthDate, st.SCHOOL_ID As StudentSchoolId, sc.SCHOOL_NAME As StudentSchoolName, ' +
                '   sc.SYMBOL As StudentSchoolSymbol, st.GRADE As StudentGrade, st.SEX_TYPE As StudentGender, ' +
                '   sr.REGION_ID As StudentRegionId, sr.REGION_NAME As StudentRegionName, p.DATE_LAST_MODIFIED, ' +
                '   p.REMARKS, p.GOT_STICKER, c.SEASON, r.REGION_ID, r.REGION_NAME ' +
                'From PlayerRegistrations pr Inner Join TeamRegistrations tr On pr.Team=tr.Id ' +
                '   Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is NULL ' +
                '   Inner Join SPORTS sp On c.SPORT_ID=sp.SPORT_ID And sp.DATE_DELETED Is Null ' +
                '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
                '   Left Join PLAYERS p On pr.Player=p.PLAYER_ID And p.DATE_DELETED Is Null ' +
                '   Left Join STUDENTS st On pr.Student=st.STUDENT_ID And st.DATE_DELETED Is Null ' +
                '   Left Join SCHOOLS sc On st.SCHOOL_ID=sc.SCHOOL_ID And sc.DATE_DELETED Is Null ' +
                '   Left Join REGIONS sr On sc.REGION_ID=sr.REGION_ID And sr.DATE_DELETED Is NULL ' +
                '   Left Join CITIES cit On sc.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                'Where c.SEASON=@season ' + leagueClause;
        }

        console.log(baseSQL);
        console.log(filters);
        var recordMapper = function(row) {
            var student = manageUtils.buildCustomObject(row, 'Student*', []);
            student.School = manageUtils.truncateCustomData(student, 'School', ['Id', 'Name', 'Symbol', '', '', '']);
            student.Region = manageUtils.truncateCustomData(student, 'Region', ['Id', 'Name']);
            student.Grade = activeSeason - student.Grade;
            student.City = manageUtils.buildSimpleObject(row, 'CITY_ID', 'CITY_NAME');
            var player = {
                Team: row['Team'],
                TeamId: row['TeamId'],
                TeamNumber: row['TeamNumber'],
                CreatedAt: row['CreatedAt'],
                Approved: row['Approved'],
                Remarks: row['REMARKS'],
                GotSticker: row['GOT_STICKER'] === 1,
                Season: row['SEASON'],
                Player: manageUtils.buildCustomObject(row, 'Player', ['Id', 'RegistrationDate', 'AdminStatus', 'ShirtNumber']),
                Student: student,
                Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
                Championship: manageUtils.buildSimpleObject(row, 'CHAMPIONSHIP_ID', 'CHAMPIONSHIP_NAME'),
                Sport: manageUtils.buildSimpleObject(row, 'SPORT_ID', 'SPORT_NAME'),
                Category: manageUtils.buildSimpleObject(row, 'RAW_CATEGORY', 'CATEGORY_NAME', ['CHAMPIONSHIP_CATEGORY_ID']),
                LastModified: row['DATE_LAST_MODIFIED']
            };
            player.Category.Category = row['CHAMPIONSHIP_CATEGORY_ID'];
            return player;
        };
        var possibleConditions = {
            'id': ['pr.Player', 'p.PLAYER_ID'],
            'team': ['pr.Team', 'p.TEAM_ID'],
            'student': 'p.STUDENT_ID',
            'championship': 'c.CHAMPIONSHIP_ID',
            'category': 'cc.CHAMPIONSHIP_CATEGORY_ID',
            'school': ['tr.School', 't.SCHOOL_ID'],
            'region': 'r.REGION_ID',
            'sport': 'sp.SPORT_ID'
        };
        if (teamId) {
            possibleConditions['team'].push('tr.Team');
        }
        Read(db,filters, possibleConditions, baseSQL, recordMapper, callback);
    });
};

Manage.prototype.deletePlayer = function (options, callback) {
    var userId = options.userId;
    var playerId = options.playerId;
    var registrationTeamId = options.teamId;
    var studentId = options.studentId;
    var db = this.db;
    var qs;
    if (playerId) {
        qs = 'Update PLAYERS ' +
            '   Set DATE_DELETED=GetDate() ' +
            '   Where DATE_DELETED Is Null And PLAYER_ID=@player';
        Execute(db, qs, {player: playerId}, 'deleting player', function (err, resp) {
            if (err) {
                callback(err);
                return;
            }
            qs = 'Update CHAMPIONSHIP_COMPETITION_COMPETITORS ' +
                '   Set DATE_DELETED=GetDate() ' +
                '   Where DATE_DELETED Is Null And PLAYER_ID=@player';
            Execute(db, qs, {player: playerId}, 'deleting player championship competitors', function (err, resp) {
                if (err) {
                    callback(err);
                    return;
                }
                AddAudit(db, userId, 'PLAYERS', 'delete', playerId, function (err, resp) {
                    //ignore audit error for now
                    qs = 'Delete From PlayerRegistrations ' +
                        'Where Player=@player';
                    Execute(db, qs, {player: playerId}, 'deleting registration player', function (err, resp) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        AddAudit(db, userId, 'PlayerRegistrations', 'delete', playerId, function (err, resp) {
                            //ignore audit error for now
                            if (registrationTeamId && studentId) {
                                qs = 'Delete From PlayerRegistrations ' +
                                    'Where Team=@team And Student=@student';
                                var values = {
                                    team: registrationTeamId,
                                    student: studentId
                                };
                                Execute(db, qs, values, 'deleting registration student from team', function (err, resp) {
                                    if (err) {
                                        callback(err);
                                        return;
                                    }
                                    var actionKey = registrationTeamId + '_' + studentId;
                                    AddAudit(db, userId, 'PlayerRegistrations', 'delete', actionKey, function (err, resp) {
                                        //ignore audit error for now
                                        callback(null, {
                                            Status: 'Success'
                                        });
                                    });
                                });
                            } else {
                                callback(null, {
                                    Status: 'Success'
                                });
                            }
                        });
                    });
                });
            });
        });
    } else if (registrationTeamId && studentId) {
        qs = 'Delete From PlayerRegistrations ' +
            'Where Team=@team And Student=@student';
        var values = {
            team: registrationTeamId,
            student: studentId
        };
        Execute(db, qs, values, 'deleting registration student from team', function (err, resp) {
            if (err) {
                callback(err);
                return;
            }
            var actionKey = registrationTeamId + '_' + studentId;
            AddAudit(db, userId, 'PlayerRegistrations', 'delete', actionKey, function (err, resp) {
                //ignore audit error for now
                callback(null, {
                    Status: 'Success'
                });
            });
        });
    } else {
        callback("must pass player id or registration team and student");
    }
};

/// -------------------------------------------- ///

/// FACILITIES ///
Manage.prototype.getFacilities = function (facilityId, regionId, schoolId, cityId, facilityNumber, callback) {
    callback = manageUtils.applyCallbackArgument(arguments);
    var filters = {
        id: facilityId,
        region: regionId,
        school: schoolId,
        city: cityId,
        number: facilityNumber
    };
    manageUtils.clearUndefinedValues(filters);

    var baseSQL = 'Select f.FACILITY_ID, f.FACILITY_NAME, f.[ADDRESS], f.[PHONE], f.FAX, f.DATE_LAST_MODIFIED, f.FACILITY_NUMBER, f.FACILITY_TYPE, ' +
        '   f.REGION_ID, r.REGION_NAME, ' +
        '   f.SCHOOL_ID As SchoolId, s.SCHOOL_NAME As SchoolName, s.SYMBOL As SchoolSymbol, ' +
        '   f.CITY_ID, c.CITY_NAME ' +
        'From FACILITIES f Left Join REGIONS r On f.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
        '   Left Join SCHOOLS s On f.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
        '   Left Join CITIES c On f.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
        'Where f.DATE_DELETED Is Null';
    var recordMapper = function(row) {
        return {
            Id: row['FACILITY_ID'],
            Name: row['FACILITY_NAME'],
            Address: row['ADDRESS'],
            PhoneNumber: row['PHONE'],
            FaxNumber: row['FAX'],
            Number: row['FACILITY_NUMBER'],
            Type: row['FACILITY_TYPE'],
            LastModified: row['DATE_LAST_MODIFIED'],
            Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
            City: manageUtils.buildSimpleObject(row, 'CITY_ID', 'CITY_NAME'),
            School: manageUtils.buildCustomObject(row, 'School', ['Id', 'Name', 'Symbol'])
        };
    };
    Read(this.db,filters, {'id': 'f.FACILITY_ID', 'region': 'f.REGION_ID', 'school': 'f.SCHOOL_ID', 'city': 'f.CITY_ID', 'number': 'f.FACILITY_NUMBER' },
        baseSQL, recordMapper, callback);
};
/// -------------------------------------------- ///

/// USERS ///
Manage.prototype.getUsers = function (userId, regionId, schoolId, cityId, userType, callback) {
    callback = manageUtils.applyCallbackArgument(arguments);
    var filters = {
        id: userId,
        region: regionId,
        school: schoolId,
        city: cityId,
        type: userType
    };

    var baseSQL = 'Select u.[USER_ID], u.USER_LOGIN, u.USER_FIRST_NAME, u.USER_LAST_NAME, u.USER_TYPE, u.DATE_LAST_MODIFIED, u.USER_EMAIL, ' +
        '   u.REGION_ID, r.REGION_NAME, ' +
        '   u.SCHOOL_ID As SchoolId, s.SCHOOL_NAME As SchoolName, s.SYMBOL As SchoolSymbol, ' +
        '   u.CITY_ID, c.CITY_NAME ' +
        'From USERS u Left Join REGIONS r On u.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
        '   Left Join SCHOOLS s On u.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
        '   Left Join CITIES c On u.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
        'Where u.DATE_DELETED Is Null';
    var recordMapper = function(row) {
        return {
            Id: row['USER_ID'],
            Login: row['USER_LOGIN'],
            FirstName: row['USER_FIRST_NAME'],
            LastName: row['USER_LAST_NAME'],
            Type: row['USER_TYPE'],
            Email: row['USER_EMAIL'],
            LastModified: row['DATE_LAST_MODIFIED'],
            Region: manageUtils.buildSimpleObject(row, 'REGION_ID', 'REGION_NAME'),
            City: manageUtils.buildSimpleObject(row, 'CITY_ID', 'CITY_NAME'),
            School: manageUtils.buildCustomObject(row, 'School', ['Id', 'Name', 'Symbol'])
        };
    };
    Read(this.db,filters, {'id': 'u.[USER_ID]', 'region': 'u.REGION_ID', 'school': 'u.SCHOOL_ID', 'city': 'u.CITY_ID', 'type': 'u.USER_TYPE' },
        baseSQL, recordMapper, callback);
};
/// -------------------------------------------- ///

/// MISC - non entities ///
function BuildProjectSportFilter(db, projectId, sportId) {
    return new Promise(function (fulfil, reject) {
        if (typeof sportId === 'undefined' || sportId == null || !sportId) {
            fulfil('');
        } else {
            var qs = 'Select SportName ' +
                'From ViewProjectSports ' +
                'Where  Season=@season';
            var filters = {
                id: sportId,
                project: projectId
            };
            var possibleConditions = {
                'id': 'Id',
                'project': 'Project'
            };
            var recordMapper = function (row) {
                return {
                    SportName: row['SportName']
                };
            };
            Read(db, filters, possibleConditions, qs, recordMapper, function (err, rows) {
                if (err) {
                    reject(err);
                } else {
                    if (rows != null && rows.length > 0) {
                        var sportName = rows[0].SportName;
                        fulfil(' And CHARINDEX(\'"name":"' + sportName + '"\', pt.Item1)>0 ');
                    } else {
                        reject('sport not found');
                    }
                }
            });
        }
    });
}

function GetNonEmptySportFields(db, filters, negationCondition) {
    return new Promise(function (fulfil, reject) {
        if (typeof filters.sport === 'undefined' || filters.sport == null || !filters.sport) {
            var qs = 'Select Distinct c.SPORT_ID, s.SPORT_NAME ' +
                'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                'Where cc.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + ' ' + //And c.CHAMPIONSHIP_STATUS>0 
                'Order By s.SPORT_NAME Asc';
            var recordMapper = function (row) {
                return {
                    Id: row['SPORT_ID'],
                    Name: row['SPORT_NAME']
                };
            };
            var possibleConditions = {
                region: 'c.REGION_ID'
            };
            Read(db, filters, possibleConditions, qs, recordMapper, function (err, sports) {
                if (err) {
                    reject(err);
                } else {
                    fulfil(sports);
                }
            });
        } else {
            fulfil(null);
        }
    });
}

Manage.prototype.getUpcomingEvents = function (connection, query, callback) {
    sportsman.GetUpcomingEvents(connection, query).then(function(upcomingEvents) {
        callback(null, upcomingEvents);
    }, function(err) {
        callback(err);
    });
};

Manage.prototype.getDashboardData = function (season, type, regionId, sportId, championshipId, categoryId, callback) {
    var filters = {
        season: season,
        region: regionId,
        sport: sportId,
        championship: championshipId,
        category: categoryId
    };
    var dashboardData;
    var baseSQL;
    var recordMapper;
    var db = this.db;
    var possibleConditions;
    if (parseInt(type, 10) >= 10) {
        //project
        type = parseInt(type, 10);
        var projectId = type > 10 ? type - 10 : null;
        dashboardData = {
            TeamsByGender: {
                Boys: 0,
                Girls: 0,
                Mixed: 0,
                Unknown: 0
            },
            PlayersByGender: {
                Boys: 0,
                Girls: 0,
                Unknown: 0
            },
            Total: {
                Teams: 0,
                Players: 0,
                Schools: 0,
                Cities: 0
            },
            SportFields: []
        };
        filters.project = projectId;
        baseSQL = 'Select Id, SportName ' +
            'From ViewProjectSports ' +
            'Where Season=@season';
        possibleConditions = {'project': 'Project'};
        recordMapper = function (row) {
            return {
                Id: row['Id'],
                Name: row['SportName']
            };
        };
        Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, projectSportFields) {
            if (err) {
                callback(err);
            } else {
                if (projectSportFields != null) {
                    projectSportFields.forEach(function(projectSportField) {
                        dashboardData.SportFields.push(projectSportField);
                    });
                }
                BuildProjectSportFilter(db, projectId, sportId).then(function(sportFilter) {
                    baseSQL = 'Select \'Boys\' As Gender, pt.Approved, CHARINDEX(\'"gender":"1"\', pt.Item1) As GenderIndex, Count(pt.Id) As TeamCount ' +
                        'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                        'Where pr.Season=@season ' + sportFilter +
                        'Group By pt.Approved, CHARINDEX(\'"gender":"1"\', pt.Item1) ' +
                        'Union All ' +
                        'Select \'Girls\' As Gender, pt.Approved, CHARINDEX(\'"gender":"2"\', pt.Item1) As GenderIndex, Count(pt.Id) As TeamCount ' +
                        'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                        'Where pr.Season=@season ' + sportFilter +
                        'Group By pt.Approved, CHARINDEX(\'"gender":"2"\', pt.Item1) ' +
                        'Union All ' +
                        'Select \'Mixed\' As Gender, pt.Approved, CHARINDEX(\'"gender":"3"\', pt.Item1) As GenderIndex, Count(pt.Id) As TeamCount ' +
                        'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                        'Where pr.Season=@season ' + sportFilter +
                        'Group By pt.Approved, CHARINDEX(\'"gender":"3"\', pt.Item1) ' +
                        'Union All ' +
                        'Select \'Unknown\' As Gender, pt.Approved, CHARINDEX(\'"gender":"0"\', pt.Item1) As GenderIndex, Count(pt.Id) As TeamCount ' +
                        'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                        'Where pr.Season=@season ' + sportFilter +
                        'Group By pt.Approved, CHARINDEX(\'"gender":"0"\', pt.Item1) ' +
                        '\n--ignoreParenthesis';
                    recordMapper = function (row) {
                        return {
                            Gender: row['Gender'],
                            Approved: row['Approved'],
                            GenderIndex: row['GenderIndex'],
                            TeamCount: row['TeamCount']
                        };
                    };
                    // And CHARINDEX('"name":"כדורסל"', pt.Item1)>0
                    possibleConditions = {'region': 'c.REGION_ID', 'project': 'pr.Project'};
					//logger.info('teams-by-gender', "SQL: " + baseSQL);
					//logger.info('teams-by-gender', "filters: ");
					//for (var key in filters) {
					//	logger.info('teams-by-gender', "filters['" + key + "'] = " + filters[key]);
					//}
                    Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, teamsByGender) {
                        if (err) {
                            callback(err);
                        } else {
                            var approvedOnly = false;
                            if (categoryId === 1) {
                                //approved only hack to avoid additional argument
                                approvedOnly = true;
                            }
                            if (teamsByGender != null) {
                                teamsByGender.forEach(function (teamByGender) {
                                    var genderIndex = teamByGender.GenderIndex;
                                    if (genderIndex > 0) {
                                        var gender = teamByGender.Gender;
                                        var approved = teamByGender.Approved;
                                        if (dashboardData.TeamsByGender.hasOwnProperty(gender)) {
                                            if (!dashboardData.TeamsByGender[gender])
                                                dashboardData.TeamsByGender[gender] = 0;
                                            if (!approvedOnly || (approvedOnly && (approved & 1) !== 0 && (approved & 2) !== 0))
                                                dashboardData.TeamsByGender[gender] += teamByGender.TeamCount;
                                        }
                                    }
                                });
                            }
                            baseSQL = 'Select \'Boys\' As Gender, pt.Approved, Count(pp.Id) As PlayerCount ' +
                                'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                'Where pr.Season=@season And pp.Gender=1 ' + sportFilter +
                                'Group By pt.Approved ' +
                                'Union All ' +
                                'Select \'Girls\' As Gender, pt.Approved, Count(pp.Id) As PlayerCount ' +
                                'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                'Where pr.Season=@season And pp.Gender=0 ' + sportFilter +
                                'Group By pt.Approved ' +
                                'Union All ' +
                                'Select \'Unknown\' As Gender, pt.Approved, Count(pp.Id) As PlayerCount ' +
                                'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                'Where pr.Season=@season And pp.Gender Is Null Or (pp.Gender<>1 And pp.Gender<>0)' + sportFilter +
                                'Group By pt.Approved ';
                            recordMapper = function (row) {
                                return {
                                    Gender: row['Gender'],
                                    Approved: row['Approved'],
                                    PlayerCount: row['PlayerCount']
                                };
                            };
                            Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, playersByGender) {
                                if (err) {
                                    callback(err);
                                } else {
                                    if (playersByGender != null) {
                                        playersByGender.forEach(function (playerByGender) {
                                            var gender = playerByGender.Gender;
                                            var approved = playerByGender.Approved;
                                            if (dashboardData.PlayersByGender.hasOwnProperty(gender)) {
                                                if (!dashboardData.PlayersByGender[gender])
                                                    dashboardData.PlayersByGender[gender] = 0;
                                                if (!approvedOnly || (approvedOnly && (approved & 1) !== 0 && (approved & 2) !== 0))
                                                    dashboardData.PlayersByGender[gender] += playerByGender.PlayerCount;
                                            }
                                        });
                                    }
                                    baseSQL = 'Select \'Teams\' As EntityName, Count(pt.Id) As EntitiesCount ' +
                                        'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                        'Where pr.Season=@season ' + sportFilter +
                                        'Union All ' +
                                        'Select \'Players\' As EntityName, Count(pp.Id) As EntitiesCount ' +
                                        'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                        '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                        'Where pr.Season=@season ' + sportFilter +
                                        'Union All ' +
                                        'Select \'Schools\' As EntityName, Count(ps.Id) As EntitiesCount ' +
                                        'From ProjectSchools ps Inner Join ProjectRegistrations pr On ps.ProjectRegistration=pr.Id ' +
                                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                        'Where pr.Season=@season ' +
                                        'Union All ' +
                                        'Select \'Cities\' As EntityName, Count(Distinct pr.City) As EntitiesCount ' +
                                        'From ProjectRegistrations pr Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                        'Where pr.Season=@season ' +
                                        'Union All ' +
                                        'Select \'Regions\' As EntityName, Count(Distinct c.REGION_ID) As EntitiesCount ' +
                                        'From ProjectRegistrations pr Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                        'Where pr.Season=@season';
                                    recordMapper = function (row) {
                                        return {
                                            Name: row['EntityName'],
                                            Count: row['EntitiesCount']
                                        };
                                    };
                                    Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, entityCounts) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            var regionCount = 0;
                                            if (entityCounts != null) {
                                                entityCounts.forEach(function (entityCount) {
                                                    var name = entityCount.Name;
                                                    if (name === 'Regions') {
                                                        regionCount = entityCount.Count;
                                                    } else if (dashboardData.Total.hasOwnProperty(name)) {
                                                        dashboardData.Total[name] = entityCount.Count;
                                                    }
                                                });
                                            }
                                        }
                                        if (projectId == 3 || projectId == 5) {
                                            //PELE
                                            dashboardData.Pele = {
                                                Percentage: 0,
                                                PlayersByGender: {
                                                    Boys: 0,
                                                    Girls: 0,
                                                    Unknown: 0
                                                },
                                                TeamsBySportFields: [],
                                                Total: {
                                                    ApprovedTeams: 0,
                                                    ApprovedCities: [],
                                                    ApprovedRegions: [],
                                                    Players: 0,
                                                    PelePlayers: 0,
                                                    Regions: regionCount,
                                                    Cities: dashboardData.Total.Cities
                                                }
                                            };
                                            baseSQL = 'Select pt.Approved, Count(pp.Id) As TotalPlayers,  ' +
                                                '   Sum(Case CHARINDEX(\'"isPele":1\', pp.Item1) When 0 Then 0 Else 1 End) As PeleCount ' +
                                                'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                                '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                                '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                                'Where pr.Season=@season And pr.Project=@project ' + sportFilter +
                                                'Group By pt.Approved';
                                            recordMapper = function (row) {
                                                return {
                                                    Total: row['TotalPlayers'],
                                                    Pele: row['PeleCount'],
                                                    Approved: row['Approved']
                                                };
                                            };
                                            Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, records) {
                                                if (err) {
                                                    callback(err);
                                                } else {
                                                    if (records != null && records.length > 0) {
                                                        dashboardData.Pele.Total.PelePlayers = 0;
                                                        dashboardData.Pele.Total.Players = 0;
                                                        dashboardData.Pele.Percentage = 0;
                                                        for (var i = 0; i < records.length; i++) {
                                                            var record = records[i];
                                                            var approved = record.Approved;
                                                            if (!approvedOnly || (approvedOnly && (approved & 1) !== 0 && (approved & 2) !== 0)) {
                                                                dashboardData.Pele.Total.PelePlayers += record.Pele;
                                                                dashboardData.Pele.Total.Players += record.Total;
                                                            }
                                                        }
                                                        if (dashboardData.Pele.Total.Players > 0) {
                                                            dashboardData.Pele.Percentage = (dashboardData.Pele.Total.PelePlayers / dashboardData.Pele.Total.Players) * 100;
                                                        }
                                                    }
                                                    baseSQL = 'Select \'Boys\' As Gender, pt.Approved, CHARINDEX(\'"isPele":1\', pp.Item1) As PeleIndex, Count(pp.Id) As PlayerCount ' +
														'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' + 
														'	Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' + 
														'Where pr.Season=@season And pp.Gender=1 ' + sportFilter +
														'Group By pt.Approved, CHARINDEX(\'"isPele":1\', pp.Item1) ' +
														'Union All ' +
														'Select \'Girls\' As Gender, pt.Approved, CHARINDEX(\'"isPele":1\', pp.Item1) As PeleIndex, Count(pp.Id) As PlayerCount ' + 
														'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' + 
														'	Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' + 
														'Where pr.Season=@season And pp.Gender=0 ' + sportFilter +
														'Group By pt.Approved, CHARINDEX(\'"isPele":1\', pp.Item1) ' + 
														'Union All ' + 
														'Select \'Unknown\' As Gender, pt.Approved, CHARINDEX(\'"isPele":1\', pp.Item1) As PeleIndex, Count(pp.Id) As PlayerCount ' + 
														'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' + 
														'	Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' + 
														'Where pr.Season=@season And pp.Gender Is Null Or (pp.Gender<>1 And pp.Gender<>0) ' + sportFilter +
														'Group By pt.Approved, CHARINDEX(\'"isPele":1\', pp.Item1) ' + '\n' +
                                                        '--ignoreParenthesis';
													/*'Select \'Boys\' As Gender, pt.Approved, Count(pp.Id) As PlayerCount ' +
                                                        'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                                        '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                                        'Where pr.Season=@season And CHARINDEX(\'"isPele":1\', pp.Item1)>0 And pp.Gender=1 ' + sportFilter +
                                                        'Group By pt.Approved ' +
                                                        'Union All ' +
                                                        'Select \'Girls\' As Gender, pt.Approved, Count(pp.Id) As PlayerCount ' +
                                                        'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                                        '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                                        'Where pr.Season=@season And CHARINDEX(\'"isPele":1\', pp.Item1)>0 And pp.Gender=0 ' + sportFilter +
                                                        'Group By pt.Approved ' +
                                                        'Union All ' +
                                                        'Select \'Unknown\' As Gender, pt.Approved, Count(pp.Id) As PlayerCount ' +
                                                        'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                                                        '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                                        '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                                        'Where pr.Season=@season And CHARINDEX(\'"isPele":1\', pp.Item1)>0 And pp.Gender Is Null Or (pp.Gender<>1 And pp.Gender<>0)' + sportFilter +
                                                        'Group By pt.Approved';*/
                                                    recordMapper = function (row) {
                                                        return {
                                                            Gender: row['Gender'],
                                                            Approved: row['Approved'],
															PeleIndex: row['PeleIndex'],
                                                            PlayerCount: row['PlayerCount']
                                                        };
                                                    };
													logger.info('players-by-gender', "SQL: " + baseSQL);
													logger.info('players-by-gender', "filters: ");
													for (var key in filters) {
														logger.info('players-by-gender', "filters['" + key + "'] = " + filters[key]);
													}
                                                    Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, playersByGender) {
                                                        if (err) {
															logger.info('players-by-gender', "Error: " + err);
                                                            callback(err);
                                                        } else {
															logger.info('players-by-gender', "Success");
                                                            if (playersByGender != null) {
                                                                playersByGender.forEach(function (playerByGender) {
																	var peleIndex = playerByGender.PeleIndex;
																	if (peleIndex > 0) {
																		var gender = playerByGender.Gender;
																		var approved = playerByGender.Approved;
																		
																		if (dashboardData.Pele.PlayersByGender.hasOwnProperty(gender)) {
																			if (!dashboardData.Pele.PlayersByGender[gender])
																				dashboardData.Pele.PlayersByGender[gender] = 0;
																			if (!approvedOnly || (approvedOnly && (approved & 1) !== 0 && (approved & 2) !== 0))
																				dashboardData.Pele.PlayersByGender[gender] += playerByGender.PlayerCount;
																		}
																	}
                                                                });
                                                            }
                                                            baseSQL = 'Select dbo.ExtractProjectSportName(pt.Item1) As SportName, pr.City, c.CITY_NAME, c.REGION_ID, ' +
                                                                '   r.REGION_NAME, pt.Approved, Count(pt.Id) As TeamCount ' +
                                                                'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                                                                '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                                                                '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                                                                'Where pr.Season=@season And pr.Project=@project ' + sportFilter + ' ' +
                                                                'Group By pt.Item1, pr.City, c.CITY_NAME, c.REGION_ID, r.REGION_NAME, pt.Approved';
                                                            filters.project = projectId;
                                                            recordMapper = function (row) {
                                                                return {
                                                                    City: {
                                                                        Id: row['City'],
                                                                        Name: row['CITY_NAME']
                                                                    },
                                                                    Region: {
                                                                        Id: row['REGION_ID'],
                                                                        Name: row['REGION_NAME']
                                                                    },
                                                                    SportName: row['SportName'],
                                                                    RawApproveValue: row['Approved'],
                                                                    TeamCount: row['TeamCount']
                                                                };
                                                            };
                                                            Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, records) {
                                                                if (err) {
                                                                    callback(err);
                                                                } else {
                                                                    dashboardData.Pele.Total.ApprovedTeams = 0;
                                                                    dashboardData.Pele.Total.ApprovedCities = [];
                                                                    dashboardData.Pele.Total.ApprovedRegions = [];
                                                                    dashboardData.Pele.TeamsBySportFields = [];
                                                                    if (records != null && records.length > 0) {
                                                                        var approvedCitiesMapping = {};
                                                                        var approvedRegionsMapping = {};
                                                                        var sportFieldMapping = {};
                                                                        for (var i = 0; i < records.length; i++) {
                                                                            var record = records[i];
                                                                            if (record.TeamCount > 0) {
                                                                                var cityKey = record.City.Id.toString();
                                                                                var regionKey = record.Region.Id.toString();
                                                                                var sportFieldName = record.SportName;
                                                                                var approved = record.RawApproveValue;
                                                                                if (!approvedCitiesMapping[cityKey]) {
                                                                                    approvedCitiesMapping[cityKey] = {
                                                                                        Id: record.City.Id,
                                                                                        Name: record.City.Name,
                                                                                        ApprovedTeams: 0,
                                                                                        NonApprovedTeams: 0
                                                                                    }
                                                                                }
                                                                                if (!approvedRegionsMapping[regionKey]) {
                                                                                    approvedRegionsMapping[regionKey] = {
                                                                                        Id: record.Region.Id,
                                                                                        Name: record.Region.Name,
                                                                                        ApprovedTeams: 0,
                                                                                        NonApprovedTeams: 0
                                                                                    }
                                                                                }
                                                                                if (!sportFieldMapping[sportFieldName]) {
                                                                                    sportFieldMapping[sportFieldName] = {
                                                                                        Name: sportFieldName,
                                                                                        ApprovedTeams: 0,
                                                                                        NonApprovedTeams: 0
                                                                                    };
                                                                                }
                                                                                if ((approved & 1) !== 0 && (approved & 2) !== 0) {
                                                                                    dashboardData.Pele.Total.ApprovedTeams += record.TeamCount;
                                                                                    approvedCitiesMapping[cityKey].ApprovedTeams += record.TeamCount;
                                                                                    approvedRegionsMapping[regionKey].ApprovedTeams += record.TeamCount;
                                                                                    sportFieldMapping[sportFieldName].ApprovedTeams += record.TeamCount;
                                                                                } else {
                                                                                    approvedCitiesMapping[cityKey].NonApprovedTeams += record.TeamCount;
                                                                                    approvedRegionsMapping[regionKey].NonApprovedTeams += record.TeamCount;
                                                                                    sportFieldMapping[sportFieldName].NonApprovedTeams += record.TeamCount;
                                                                                }
                                                                            }
                                                                        }
                                                                        for (var cityId in approvedCitiesMapping) {
                                                                            if (approvedCitiesMapping.hasOwnProperty(cityId)) {
                                                                                dashboardData.Pele.Total.ApprovedCities.push(approvedCitiesMapping[cityId]);
                                                                            }
                                                                        }
                                                                        for (var regionId in approvedRegionsMapping) {
                                                                            if (approvedRegionsMapping.hasOwnProperty(regionId)) {
                                                                                dashboardData.Pele.Total.ApprovedRegions.push(approvedRegionsMapping[regionId]);
                                                                            }
                                                                        }
                                                                        for (var sportName in sportFieldMapping) {
                                                                            if (sportFieldMapping.hasOwnProperty(sportName)) {
                                                                                dashboardData.Pele.TeamsBySportFields.push(sportFieldMapping[sportName]);
                                                                            }
                                                                        }
                                                                        dashboardData.Pele.Total.ApprovedCities = dashboardData.Pele.Total.ApprovedCities.filter(x => x.ApprovedTeams > 0);
                                                                        dashboardData.Pele.Total.ApprovedRegions = dashboardData.Pele.Total.ApprovedRegions.filter(x => x.ApprovedTeams > 0);
                                                                    }
                                                                    dashboardData.Total.ApprovedCitiesCount = dashboardData.Pele.Total.ApprovedCities.length;
                                                                    dashboardData.Total.ApprovedRegionsCount = dashboardData.Pele.Total.ApprovedRegions.length;
                                                                    callback(null, dashboardData);
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        } else {
                                            callback(null, dashboardData);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }, function(err) {
                    callback(err);
                });
            }
        });
        return;
    }
    switch (parseInt(type, 10)) {
        case 1:
            filters.clubs = 1;
            break;
        case 3:
            filters.clubs = 0;
            filters.region = 0;
            filters.league = 1;
            filters.isOpen = 0;
            break;
        case 4:
            filters.clubs = 0;
            filters.region = 0;
            filters.isOpen = 1;
            break;
    }

    dashboardData = {
        Payments: {
            TotalAmount: 0,
            PaidAmount: 0
        },
        TeamsByGender: {
            Boys: 0,
            Girls: 0,
            Unknown: 0
        },
        PlayersByGender: {
            Boys: 0,
            Girls: 0,
            Unknown: 0
        },
        Total: {
            Teams: 0,
            RegistrationTeams: 0,
            Players: 0,
            Schools: 0,
            RegistrationSchools: 0,
            Championships: 0,
            Cities: 0,
            RegistrationCities: 0,
            Matches: 0
        },
        FooterData: {
            TotalUnconfirmedSchools: 0,
            TotalUnconfirmedTeams: 0,
            TotalUnconfirmedPlayers: 0
        },
        TeamsBySportFields: [],
        TeamsBySchools: [],
        PlayersBySportFields: [],
        TeamsByCities: [],
        ChampionshipsBySportFields: [],
        MatchesBySportFields: [],
        NonEmptySportFields: null
    };

    if (championshipId === 1) {
        filters.championship = null;
        baseSQL = 'Select c.CHAMPIONSHIP_ID ' +
            'From CHAMPIONSHIPS c ' +
            'Where c.DATE_DELETED Is Null And c.SEASON=@season'; //And c.CHAMPIONSHIP_STATUS>0 
        recordMapper = function (row) {
            return {
                Id: row['CHAMPIONSHIP_ID']
            };
        };
        possibleConditions = {'region': 'c.REGION_ID', 'sport': 'c.SPORT_ID', 'clubs': 'c.IS_CLUBS', 'league': 'c.IS_LEAGUE', 'isOpen': 'c.IS_OPEN'};
        Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, championshipRows) {
            if (err) {
                callback(err);
            } else {
                var championshipIds = championshipRows.map(row => row.Id);
                //console.log(championshipIds);
                callback(null, championshipIds);
            }
        });
        return;
    }

    if (parseInt(type, 10) >= 3 && parseInt(regionId, 10) > 0) {
        //when filtering by region, type of 3 or more is not relevant
        callback(null, dashboardData);
        return;
    }

    baseSQL = 'Select Sum(IsNull(p.TotalAmount, 0)) As TotalAmount ' +
        'From PaymentRequests p Left Join (' +
        '   Select a.PaymentId, a.LatestTeam, s.REGION_ID, cc.CATEGORY, cc.CHAMPIONSHIP_CATEGORY_ID, c.CHAMPIONSHIP_ID, ' +
        '       c.SPORT_ID, c.SEASON, c.IS_CLUBS, c.IS_LEAGUE, c.IS_OPEN ' +
        '   From (' +
        '       Select p.Id As PaymentId, Max(tr.Id) As LatestTeam ' +
        '       From TeamRegistrations tr Inner Join PaymentRequests p On tr.Payment=p.Id ' +
        '       Where p.CancelTime Is Null ' +
        '       Group By p.Id ' +
        '   ) as a Inner Join TeamRegistrations tr On a.LatestTeam=tr.Id ' +
        '       Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
        '       Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
        '       Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' + //And c.CHAMPIONSHIP_STATUS>0 
        ') as b On p.Id=b.PaymentId ' +
        'Where p.CancelTime Is Null And b.SEASON=@season';
    if (Array.isArray(championshipId) && championshipId.length > 0) {
        filters.championship = null;
        baseSQL += ' And b.CHAMPIONSHIP_ID Not In (' + championshipId.join(', ') + ')';
    }
    recordMapper = function(row) {
        return {
            TotalAmount: row['TotalAmount'],
            PaidAmount: 0
        };
    };
    possibleConditions = {'region': 'b.REGION_ID', 'sport': 'b.SPORT_ID', 'championship': 'b.CHAMPIONSHIP_ID',
        'category': 'b.CATEGORY', 'clubs': 'b.IS_CLUBS', 'league': 'b.IS_LEAGUE', 'isOpen': 'b.IS_OPEN' };
    var financeOptions = {
        season: season
    };
    if (regionId != null)
        financeOptions.region = parseInt(regionId, 10);
    if (type != null)
        financeOptions.type = parseInt(type, 10);
    //season, type, regionId, sportId, championshipId, categoryId
    //Read(db,filters, possibleConditions,baseSQL, recordMapper, function(err, payments) {
    Finance.getAccounts(financeOptions, function (err, accounts) {
        if (err) {
            callback(err);
        } else {
            /*
            if (payments != null && payments.length > 0) {
                var paymentRow = payments[0];
                if (paymentRow.TotalAmount != null)
                    dashboardData.Payments.TotalAmount = paymentRow.TotalAmount;
                if (paymentRow.PaidAmount != null)
                    dashboardData.Payments.PaidAmount = paymentRow.PaidAmount;
            }
            */
            var gotSport = sportId != null && sportId > 0;
            var gotChampionship = championshipId != null && championshipId > 0;
            var gotCategory = categoryId != null && categoryId > 1;
            if (gotSport || gotChampionship || gotCategory) {
                accounts.forEach(account => {
                    var itemsBuffer = [];
                    if (account.sports != null) {
                        if (gotChampionship || gotCategory) {
                            account.sports.forEach(sport => {
                                if (sport.championships != null) {
                                    if (gotCategory) {
                                        sport.championships.forEach(championship => {
                                            if (championship.categories != null) {
                                                var matchingCategories = championship.categories.filter(cat => cat.category == categoryId);
                                                matchingCategories.forEach(matchingCategory => {
                                                    itemsBuffer.push(matchingCategory);
                                                });
                                            } else if (gotChampionship && championship.id == championshipId) {
                                                itemsBuffer.push(championship);
                                            }
                                        });
                                    } else if (gotChampionship) {
                                        var matchingChampionship = sport.championships.find(championship => championship.id == championshipId);
                                        if (matchingChampionship != null)
                                            itemsBuffer.push(matchingChampionship);
                                    }
                                } else if (gotSport && sport.id == sportId) {
                                    itemsBuffer.push(sport);
                                }
                            });
                        } else if (gotSport) {
                            var matchingSport = account.sports.find(sport => sport.id == sportId);
                            if (matchingSport != null)
                                itemsBuffer.push(matchingSport);
                        }
                    }
                    if (itemsBuffer.length > 0) {
                        account.totalAmount = 0;
                        account.paidAmount = 0;
                        itemsBuffer.forEach(item => {
                            account.totalAmount += item.totalAmount;
                            account.paidAmount += item.paidAmount;
                        });
                    }
                });
            }
            dashboardData.Payments.TotalAmount = 0;
            dashboardData.Payments.PaidAmount = 0;
            accounts.forEach(account => {
                if (account.totalAmount != null) {
                    dashboardData.Payments.TotalAmount += parseInt(account.totalAmount, 10);
                }
                if (account.paidAmount != null) {
                    dashboardData.Payments.PaidAmount += parseInt(account.paidAmount, 10);
                }
            });
            var negationCondition = (Array.isArray(championshipId) && championshipId.length > 0) ? ' And c.CHAMPIONSHIP_ID Not In (' + championshipId.join(', ') + ') ' : '';
            var unconfirmedDataParams = {
                filters: filters,
                negationCondition: negationCondition
            };
            ReadUnconfirmedData(db, unconfirmedDataParams, function(err, unconfirmedData) {
                if (err) {
                    callback(err);
                } else {
                    if (unconfirmedData != null) {
                        var cacheKey = GenerateFooterCacheKey(unconfirmedData.Token);
                        var cacheData = {
                            Filters: filters,
                            Negation: negationCondition
                        };
                        v2Utils.setCache(cacheKey, JSON.stringify(cacheData), 3600);
                        dashboardData.FooterData.Token = unconfirmedData.Token;
                        dashboardData.FooterData.TotalUnconfirmedSchools = unconfirmedData.Schools;
                        dashboardData.FooterData.TotalUnconfirmedTeams = unconfirmedData.Teams;
                        dashboardData.FooterData.TotalUnconfirmedPlayers = unconfirmedData.Players;
                    }
                    GetNonEmptySportFields(db, filters, negationCondition).then(function(nonEmptySportFields) {
                        dashboardData.NonEmptySportFields = nonEmptySportFields;
                        baseSQL = 'Select \'Boys\' As Gender, Count(t.TEAM_ID) As TeamCount ' +
                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                            '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                            'Where t.DATE_DELETED Is Null And c.SEASON=@season And CHARINDEX(N\'תלמידים\', cm.CATEGORY_NAME)>0 ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                            'Union All ' +
                            'Select \'Girls\' As Gender, Count(t.TEAM_ID) As TeamCount ' +
                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                            '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                            'Where t.DATE_DELETED Is Null And c.SEASON=@season And CHARINDEX(N\'תלמידות\', cm.CATEGORY_NAME)>0 ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                            'Union All ' +
                            'Select \'Unknown\' As Gender, Count(t.TEAM_ID) As TeamCount ' +
                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                            '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                            'Where t.DATE_DELETED Is Null And c.SEASON=@season And Len(IsNull(cm.CATEGORY_NAME, \'\'))=0' + negationCondition; //And c.CHAMPIONSHIP_STATUS>0 
                        recordMapper = function (row) {
                            return {
                                Gender: row['Gender'],
                                TeamCount: row['TeamCount']
                            };
                        };
                        possibleConditions = {'region': 'c.REGION_ID', 'sport': 'c.SPORT_ID', 'championship': 'c.CHAMPIONSHIP_ID',
                            'category': 'cc.CATEGORY', 'clubs': 'c.IS_CLUBS', 'league': 'c.IS_LEAGUE', 'isOpen': 'c.IS_OPEN'};
                        console.log(filters);
                        console.log(possibleConditions);
                        Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, teamsByGender) {
                            if (err) {
                                callback(err);
                            } else {
                                if (teamsByGender != null) {
                                    teamsByGender.forEach(function (teamByGender) {
                                        var gender = teamByGender.Gender;
                                        if (dashboardData.TeamsByGender.hasOwnProperty(gender))
                                            dashboardData.TeamsByGender[gender] = teamByGender.TeamCount;
                                    });
                                }
                                baseSQL = 'Select \'Boys\' As Gender, Count(p.PLAYER_ID) As PlayerCount ' +
                                    'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                    '   Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID And s.DATE_DELETED Is Null ' +
                                    '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                    'Where p.DATE_DELETED Is Null And c.SEASON=@season ' + //And c.CHAMPIONSHIP_STATUS>0 
                                    '   And (s.SEX_TYPE=1 Or (IsNull(s.SEX_TYPE, 0)=0 And CHARINDEX(N\'תלמידים\', cm.CATEGORY_NAME)>0)) ' + negationCondition +
                                    'Union All ' +
                                    'Select \'Girls\' As Gender, Count(p.PLAYER_ID) As PlayerCount ' +
                                    'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                    '   Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID And s.DATE_DELETED Is Null ' +
                                    '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                    'Where p.DATE_DELETED Is Null And c.SEASON=@season ' + //And c.CHAMPIONSHIP_STATUS>0 
                                    '   And (s.SEX_TYPE=2 Or (IsNull(s.SEX_TYPE, 0)=0 And CHARINDEX(N\'תלמידות\', cm.CATEGORY_NAME)>0)) ' + negationCondition +
                                    'Union All ' +
                                    'Select \'Unknown\' As Gender, Count(p.PLAYER_ID) As PlayerCount ' +
                                    'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                                    '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                    '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                    '   Inner Join STUDENTS s On p.STUDENT_ID=s.STUDENT_ID And s.DATE_DELETED Is Null ' +
                                    '   Left Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                    'Where p.DATE_DELETED Is Null And c.SEASON=@season ' + //And c.CHAMPIONSHIP_STATUS>0 
                                    '   And IsNull(s.SEX_TYPE, 0)=0 And Len(IsNull(cm.CATEGORY_NAME, \'\'))=0 ' + negationCondition;
                                recordMapper = function (row) {
                                    return {
                                        Gender: row['Gender'],
                                        PlayerCount: row['PlayerCount']
                                    };
                                };
                                Read(db, filters, possibleConditions,baseSQL, recordMapper, function (err, playersByGender) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        if (playersByGender != null) {
                                            playersByGender.forEach(function (playerByGender) {
                                                var gender = playerByGender.Gender;
                                                if (dashboardData.PlayersByGender.hasOwnProperty(gender))
                                                    dashboardData.PlayersByGender[gender] = playerByGender.PlayerCount;
                                            });
                                        }
                                        baseSQL = 'Select \'Teams\' As EntityName, Count(t.TEAM_ID) As EntitiesCount ' +
                                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            'Where t.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + // And t.[STATUS]=2 //And c.CHAMPIONSHIP_STATUS>0 
                                            'Union All ' +
                                            'Select \'RegistrationTeams\' As EntityName, Count(tr.Id) As EntitiesCount  ' +
                                            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            'Where tr.Team Is Null And c.SEASON=@season ' + negationCondition + //c.CHAMPIONSHIP_STATUS>0 And 
                                            'Union All ' +
                                            'Select \'Players\' As EntityName, Count(Distinct p.STUDENT_ID) As EntitiesCount ' +
                                            'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            'Where p.DATE_DELETED Is Null And p.[STATUS]=2 And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                            'Union All ' +
                                            'Select \'Schools\' As EntityName, Count(Distinct s.SCHOOL_ID) As EntitiesCount ' +
                                            'From SCHOOLS s Inner Join TEAMS t On t.SCHOOL_ID=s.SCHOOL_ID And t.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            'Where s.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                            'Union All ' +
                                            'Select \'RegistrationSchools\' As EntityName, Count(Distinct s.SCHOOL_ID) As EntitiesCount ' +
                                            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                            'Where tr.Team Is Null And c.SEASON=@season ' + negationCondition + //c.CHAMPIONSHIP_STATUS>0 And 
                                            'Union All ' +
                                            'Select \'Championships\' As EntityName, Count(Distinct cc.CHAMPIONSHIP_CATEGORY_ID) As EntitiesCount ' +
                                            'From CHAMPIONSHIPS c Inner Join CHAMPIONSHIP_CATEGORIES cc On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And cc.DATE_DELETED Is Null ' +
                                            'Where c.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                            'Union All ' +
                                            'Select \'Cities\' As EntityName, Count(Distinct cit.CITY_ID) As EntitiesCount ' +
                                            'From CITIES cit Inner Join SCHOOLS s On s.CITY_ID=cit.CITY_ID And s.DATE_DELETED Is Null ' +
                                            '	Inner Join TEAMS t On t.SCHOOL_ID=s.SCHOOL_ID And t.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            'Where cit.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                            'Union All ' +
                                            'Select \'RegistrationCities\' As EntityName, Count(Distinct cit.CITY_ID) As EntitiesCount ' +
                                            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                            '   Inner Join CITIES cit On s.CITY_ID=cit.CITY_ID And cit.DATE_DELETED Is Null ' +
                                            'Where tr.Team Is Null And c.SEASON=@season ' + negationCondition + //c.CHAMPIONSHIP_STATUS>0 And 
                                            'Union All ' +
                                            'Select \'Matches\' As EntityName, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As EntitiesCount ' +
                                            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                            '	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                            'Where cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null And c.SEASON=@season' + negationCondition; //And c.CHAMPIONSHIP_STATUS>0 
                                        recordMapper = function (row) {
                                            return {
                                                Name: row['EntityName'],
                                                Count: row['EntitiesCount']
                                            };
                                        };
                                        Read(db, filters, possibleConditions,baseSQL, recordMapper, function (err, entityCounts) {
                                            if (err) {
                                                callback(err);
                                            } else {
                                                //console.log(entityCounts);
                                                if (entityCounts != null) {
                                                    entityCounts.forEach(function (entityCount) {
                                                        var name = entityCount.Name;
                                                        if (dashboardData.Total.hasOwnProperty(name))
                                                            dashboardData.Total[name] = entityCount.Count;
                                                    });
                                                }
                                                var extraDataItems = [
                                                    {
                                                        propertyName: 'TeamsBySportFields',
                                                        entityName: 'Sport',
                                                        idField: 'SPORT_ID',
                                                        dbQuery: 'Select s.SPORT_ID, s.SPORT_NAME, t.[STATUS], Count(Distinct t.TEAM_ID) As EntityCount ' +
                                                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                                                            'Where t.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By s.SPORT_ID, s.SPORT_NAME, t.[STATUS] ' +
                                                            'Union All ' +
                                                            'Select s.SPORT_ID, s.SPORT_NAME, 0 As [STATUS], Count(Distinct tr.Id) As EntityCount ' +
                                                            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                                                            'Where tr.Team Is Null And c.SEASON=@season ' + negationCondition + //c.CHAMPIONSHIP_STATUS>0 And 
                                                            'Group By s.SPORT_ID, s.SPORT_NAME',
                                                        nameFunction: function (row) {
                                                            return row['SPORT_NAME'];
                                                        }
                                                    },
                                                    {
                                                        propertyName: 'TeamsBySchools',
                                                        entityName: 'School',
                                                        idField: 'SCHOOL_ID',
                                                        dbQuery: 'Select s.SCHOOL_ID, s.SCHOOL_NAME, ci.CITY_NAME, t.[STATUS], Count(Distinct t.TEAM_ID) As EntityCount ' +
                                                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                                            '   Left Join CITIES ci On s.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null ' +
                                                            'Where t.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By s.SCHOOL_ID, s.SCHOOL_NAME, ci.CITY_NAME, t.[STATUS] ' +
                                                            'Union All ' +
                                                            'Select s.SCHOOL_ID, s.SCHOOL_NAME, ci.CITY_NAME, 0 As [STATUS], Count(Distinct tr.Id) As EntityCount ' +
                                                            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                                            '   Left Join CITIES ci On s.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null ' +
                                                            'Where tr.Team Is Null And c.SEASON=@season ' + negationCondition + //c.CHAMPIONSHIP_STATUS>0 And 
                                                            'Group By s.SCHOOL_ID, s.SCHOOL_NAME, ci.CITY_NAME',
                                                        nameFunction: function (row) {
                                                            var schoolName = row['SCHOOL_NAME'];
                                                            var cityName = row['CITY_NAME'];
                                                            if (cityName != null && schoolName.indexOf(cityName) < 0) {
                                                                schoolName += ' ' + cityName;
                                                            }
                                                            return schoolName;
                                                        }
                                                    },
                                                    {
                                                        propertyName: 'PlayersBySportFields',
                                                        entityName: 'Sport',
                                                        idField: 'SPORT_ID',
                                                        dbQuery: 'Select s.SPORT_ID, s.SPORT_NAME, p.[STATUS], Count(Distinct p.PLAYER_ID) As EntityCount ' +
                                                            'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                                                            'Where p.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By s.SPORT_ID, s.SPORT_NAME, p.[STATUS]',
                                                        nameFunction: function (row) {
                                                            return row['SPORT_NAME'];
                                                        }
                                                    },
                                                    {
                                                        propertyName: 'TeamsByCities',
                                                        entityName: 'City',
                                                        idField: 'CITY_ID',
                                                        dbQuery: 'Select ci.CITY_ID, ci.CITY_NAME, t.[STATUS], Count(Distinct t.TEAM_ID) As EntityCount ' +
                                                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                                            '   Inner Join CITIES ci On s.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null ' +
                                                            'Where t.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By ci.CITY_ID, ci.CITY_NAME, t.[STATUS] ' +
                                                            'Union All ' +
                                                            'Select ci.CITY_ID, ci.CITY_NAME, 0 As [STATUS], Count(Distinct tr.Id) As EntityCount ' +
                                                            'From TeamRegistrations tr Inner Join CHAMPIONSHIP_CATEGORIES cc On tr.Competition=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SCHOOLS s On tr.School=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                                                            '   Left Join CITIES ci On s.CITY_ID=ci.CITY_ID And ci.DATE_DELETED Is Null ' +
                                                            'Where tr.Team Is Null And c.SEASON=@season ' + negationCondition + //c.CHAMPIONSHIP_STATUS>0 And 
                                                            'Group By ci.CITY_ID, ci.CITY_NAME',
                                                        nameFunction: function (row) {
                                                            return row['CITY_NAME'];
                                                        }
                                                    },
                                                    {
                                                        propertyName: 'ChampionshipsBySportFields',
                                                        entityName: 'Sport',
                                                        idField: 'SPORT_ID',
                                                        countOnly: true,
                                                        dbQuery: 'Select s.SPORT_ID, s.SPORT_NAME, Count(Distinct cc.CHAMPIONSHIP_CATEGORY_ID) As EntityCount ' +
                                                            'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                                                            'Where cc.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By s.SPORT_ID, s.SPORT_NAME',
                                                        nameFunction: function (row) {
                                                            return row['SPORT_NAME'];
                                                        }
                                                    },
                                                    {
                                                        propertyName: 'MatchesBySportFields',
                                                        entityName: 'Sport',
                                                        idField: 'SPORT_ID',
                                                        countOnly: true,
                                                        dbQuery: 'Select s.SPORT_ID, s.SPORT_NAME, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As EntityCount ' +
                                                            'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null  ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                                                            'Where cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By s.SPORT_ID, s.SPORT_NAME',
                                                        nameFunction: function (row) {
                                                            return row['SPORT_NAME'];
                                                        }
                                                    }
                                                ];
                                                if (filters.sport && filters.sport > 0) {
                                                    extraDataItems.push({
                                                        propertyName: 'TeamsByCategories',
                                                        entityName: 'Category',
                                                        idField: 'CATEGORY',
                                                        dbQuery: 'Select cc.CATEGORY, cm.CATEGORY_NAME, t.[STATUS], Count(Distinct t.TEAM_ID) As EntityCount ' +
                                                            'From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                                            'Where t.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By cc.CATEGORY, cm.CATEGORY_NAME, t.[STATUS]',
                                                        nameFunction: function (row) {
                                                            return row['CATEGORY_NAME'];
                                                        }
                                                    });
                                                    extraDataItems.push({
                                                        propertyName: 'PlayersByCategories',
                                                        entityName: 'Category',
                                                        idField: 'CATEGORY',
                                                        dbQuery: 'Select cc.CATEGORY, cm.CATEGORY_NAME, p.[STATUS], Count(Distinct p.PLAYER_ID) As EntityCount ' +
                                                            'From PLAYERS p Inner Join TEAMS t On p.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                                            'Where p.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By cc.CATEGORY, cm.CATEGORY_NAME, p.[STATUS]',
                                                        nameFunction: function (row) {
                                                            return row['CATEGORY_NAME'];
                                                        }
                                                    });
                                                    extraDataItems.push({
                                                        propertyName: 'ChampionshipsByCategories',
                                                        entityName: 'Category',
                                                        idField: 'CATEGORY',
                                                        countOnly: true,
                                                        dbQuery: 'Select cc.CATEGORY, cm.CATEGORY_NAME, Count(Distinct cc.CHAMPIONSHIP_CATEGORY_ID) As EntityCount ' +
                                                            'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                                            'Where cc.DATE_DELETED Is Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By cc.CATEGORY, cm.CATEGORY_NAME',
                                                        nameFunction: function (row) {
                                                            return row['CATEGORY_NAME'];
                                                        }
                                                    });
                                                    extraDataItems.push({
                                                        propertyName: 'MatchesByCategories',
                                                        entityName: 'Category',
                                                        idField: 'CATEGORY',
                                                        countOnly: true,
                                                        dbQuery: 'Select cc.CATEGORY, cm.CATEGORY_NAME, Count(mat.CHAMPIONSHIP_CATEGORY_ID) As EntityCount ' +
                                                            'From CHAMPIONSHIP_MATCHES mat Inner Join CHAMPIONSHIP_CATEGORIES cc On mat.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
                                                            '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
                                                            '   Inner Join CATEGORY_MAPPING cm On cc.CATEGORY=cm.RAW_CATEGORY ' +
                                                            'Where mat.DATE_DELETED Is Null And mat.[TIME] Is Not Null And c.SEASON=@season ' + negationCondition + //And c.CHAMPIONSHIP_STATUS>0 
                                                            'Group By cc.CATEGORY, cm.CATEGORY_NAME',
                                                        nameFunction: function (row) {
                                                            return row['CATEGORY_NAME'];
                                                        }
                                                    });
                                                }
                                                var buildExtraItem = function(extraItemIndex) {
                                                    if (extraItemIndex >= extraDataItems.length) {
                                                        callback(null, dashboardData);
                                                    } else {
                                                        var currentDataItem = extraDataItems[extraItemIndex];
                                                        baseSQL = currentDataItem.dbQuery;
                                                        recordMapper = function (row) {
                                                            var dataObject = {};
                                                            dataObject[currentDataItem.entityName] = {
                                                                Id: row[currentDataItem.idField],
                                                                Name: currentDataItem.nameFunction(row)
                                                            };
                                                            dataObject.Status = row['STATUS'];
                                                            dataObject.Count = row['EntityCount'];
                                                            return dataObject;
                                                        };
                                                        Read(db, filters, possibleConditions,baseSQL, recordMapper, function (err, records) {
                                                            if (err) {
                                                                callback(err);
                                                            } else {
                                                                if (records != null) {
                                                                    var mapping = {};
                                                                    for (var i = 0; i < records.length; i++) {
                                                                        var row = records[i];
                                                                        var id = row[currentDataItem.entityName].Id;
                                                                        if (id) {
                                                                            var key = id.toString();
                                                                            var entity = currentDataItem.propertyName.split('By')[0];
                                                                            var statusPropertyName = entity + 'ByStatus';
                                                                            var countPropertyName = entity + 'Count';
                                                                            if (!mapping[key]) {
                                                                                mapping[key] = {};
                                                                                mapping[key][currentDataItem.entityName + 'Name'] = row[currentDataItem.entityName].Name;
                                                                                mapping[key][currentDataItem.entityName + 'Id'] = id;
                                                                                if (currentDataItem.countOnly) {
                                                                                    mapping[key][countPropertyName] = row.Count;
                                                                                } else {
                                                                                    mapping[key][statusPropertyName] = {
                                                                                        'New': 0,
                                                                                        'Registered': 0,
                                                                                        'Confirmed': 0
                                                                                    };
                                                                                }
                                                                            }
                                                                            if (!currentDataItem.countOnly) {
                                                                                switch (row.Status) {
                                                                                    case 0:
                                                                                        mapping[key][statusPropertyName].New = row.Count;
                                                                                        break;
                                                                                    case 1:
                                                                                        mapping[key][statusPropertyName].Registered = row.Count;
                                                                                        break;
                                                                                    case 2:
                                                                                        mapping[key][statusPropertyName].Confirmed = row.Count;
                                                                                        break;
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                                if (!dashboardData[currentDataItem.propertyName])
                                                                    dashboardData[currentDataItem.propertyName] = [];
                                                                for (var id in mapping) {
                                                                    dashboardData[currentDataItem.propertyName].push(mapping[id]);
                                                                }
                                                                buildExtraItem(extraItemIndex + 1);
                                                            }
                                                        });
                                                    }
                                                };
                                                buildExtraItem(0);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }, function(err) {
                        callback(err);
                    });
                }
            });
        }
    });
};

Manage.prototype.getPeleData = function (season, peleFilter, regionId, sportId, projectId, callback) {
    if (projectId == null)
        projectId = 3; //default is PELE
    var filters = {
        region: regionId,
        project: projectId
    };
    if (season)
        filters.season = season;
    var db = this.db;
    BuildProjectSportFilter(db, projectId, sportId).then(function(sportFilter) {
        var baseSQL = '';
        var recordMapper = null;
        switch (peleFilter) {
            case 'cities':
                baseSQL = 'Select c.CITY_NAME, Count(Distinct pt.Id) As TeamCount ' +
                    'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                    '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                    'Where pr.Season=@season ' + sportFilter + ' ' +
                    'Group By c.CITY_NAME';
                recordMapper = function (row) {
                    return {
                        City: row['CITY_NAME'],
                        TeamCount: row['TeamCount']
                    };
                };
                break;
            case 'regions':
                baseSQL = 'Select r.REGION_NAME, Count(Distinct pt.Id) As TeamCount ' +
                    'From ProjectTeams pt Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                    '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                    '   Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                    'Where pr.Season=@season ' + sportFilter + ' ' +
                    'Group By r.REGION_NAME';
                recordMapper = function (row) {
                    return {
                        Region: row['REGION_NAME'],
                        TeamCount: row['TeamCount']
                    };
                };
                break;
            case 'sports-all-teams':
            case 'sports-approved-teams':
                baseSQL = 'Select dbo.ExtractProjectSportName(pt.Item1) As SportName, pt.Approved, Count(pt.Id) As TeamCount ' +
                    'From ProjectTeams pt ' +
                    '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                    '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                    'Where pr.Season=@season ' + sportFilter + ' ' +
                    'Group By dbo.ExtractProjectSportName(pt.Item1), pt.Approved ' +
                    '\n--ignoreParenthesis';
                recordMapper = function (row) {
                    return {
                        Sport: row['SportName'],
                        Approved: row['Approved'],
                        TeamCount: row['TeamCount']
                    };
                };
                break;
            case 'sports-all-players':
            case 'sports-pele-players':
                baseSQL = 'Select dbo.ExtractProjectSportName(pt.Item1) As SportName, Count(pp.Id) As TotalPlayers, ' +
                    '   Sum(Case CHARINDEX(\'"isPele":1\', pp.Item1) When 0 Then 0 Else 1 End) As PeleCount ' +
                    'From ProjectPlayers pp Inner Join ProjectTeams pt On pp.ProjectTeam=pt.Id ' +
                    '   Inner Join ProjectRegistrations pr On pt.ProjectRegistration=pr.Id ' +
                    '   Inner Join CITIES c On pr.City=c.CITY_ID And c.DATE_DELETED Is Null ' +
                    'Where pr.Season=@season ' + sportFilter + ' ' +
                    'Group By dbo.ExtractProjectSportName(pt.Item1) ' +
                    '\n--ignoreParenthesis';
                recordMapper = function (row) {
                    return {
                        Sport: row['SportName'],
                        PlayerCount: row['TotalPlayers'],
                        PeleCount: row['PeleCount']
                    };
                };
                break;
        }
        if (baseSQL.length === 0) {
            callback('Invalid pele filter');
            return;
        }
        var possibleConditions = {'region': 'c.REGION_ID', 'project': 'pr.Project'};
        Read(db, filters, possibleConditions, baseSQL, recordMapper, function (err, records) {
            if (err) {
                callback(err);
            } else {
                var sportMapping = {};
                if (peleFilter.indexOf('sports-') >= 0) {
                    var sports = [];
                    if (peleFilter.indexOf('-teams') > 0) {
                        var allTeams =  peleFilter.indexOf('-all-') > 0;
                        for (var i = 0; i < records.length; i++) {
                            var record = records[i];
                            var approved = record.Approved;
                            if (!sportMapping[record.Sport]) {
                                sportMapping[record.Sport] = 0;
                            }
                            if (allTeams || (!allTeams && (approved & 1) !== 0 && (approved & 2) !== 0)) {
                                sportMapping[record.Sport] += record.TeamCount;
                            }
                        }
                        for (var sportName in sportMapping) {
                            sports.push({
                                Sport: sportName,
                                TeamCount: sportMapping[sportName]
                            });
                        }
                        sports = sports.filter(sport => sport.TeamCount > 0);
                    } else if (peleFilter.indexOf('-players') > 0) {
                        var allPlayers =  peleFilter.indexOf('-all-') > 0;
                        for (var i = 0; i < records.length; i++) {
                            var record = records[i];
                            if (!sportMapping[record.Sport]) {
                                sportMapping[record.Sport] = 0;
                            }
                            sportMapping[record.Sport] += allPlayers ? record.PlayerCount : record.PeleCount;
                        }
                        for (var sportName in sportMapping) {
                            sports.push({
                                Sport: sportName,
                                PlayerCount: sportMapping[sportName]
                            });
                        }
                        sports = sports.filter(sport => sport.PlayerCount > 0);
                    } else {
                        sports = null;
                    }
                    if (sports == null) {
                        callback('Invalid pele filter');
                    } else {
                        if (peleFilter === 'sports-approved-teams' || peleFilter === 'sports-all-teams') {
                            var dummyCategoryId = peleFilter === 'sports-approved-teams' ? 1 : null;
                            (new Manage(require('../db'))).getDashboardData(
                                season, projectId + 10, regionId, sportId, null, dummyCategoryId, function(err, dashboardData) {
                                var teamsByGender = dashboardData ? dashboardData.TeamsByGender : null;
                                var playersByGender = dashboardData ? dashboardData.PlayersByGender : null;
                                var peleData = dashboardData ? dashboardData.Pele : null;
                                callback(null, {
                                    Sports: sports,
                                    TeamsByGender: teamsByGender,
                                    PlayersByGender: playersByGender,
                                    Pele: peleData
                                });
                            });
                        } else {
                            callback(null, sports);
                        }
                    }
                } else {
                    callback(null, records);
                }
            }
        });
    }, function(err) {
        callback(err);
    });
};

Manage.prototype.getUnconfirmedDashboardData = function (token, entity, callback) {
    var db = this.db;
    var unconfirmedDataParams = {
        Token: token,
        Entity: entity
    };
    ReadUnconfirmedData(db, unconfirmedDataParams, function(err, unconfirmedData) {
        if (err) {
            callback(err);
        } else {
            if (unconfirmedData != null) {
                //refresh cache
                var cacheKey = GenerateFooterCacheKey(unconfirmedData.Token);
                v2Utils.getCache(cacheKey, function(err, cacheValue) {
                    if (err) {
                        callback(null, unconfirmedData);
                    } else {
                        if (cacheValue == null) {
                            callback(null, unconfirmedData);
                        } else {
                            v2Utils.setCache(cacheKey, cacheValue, 3600);
                            callback(null, unconfirmedData);
                        }
                    }
                });
            } else {
                callback('no data');
            }
        }
    });
};
/// -------------------------------------------- ///

Manage.prototype.getPaymentRequests = function(callback) {
    var db = this.db;
    var baseSQL = 'Select Id, PayerName, [Time] ' +
        'From PaymentRequests ' +
        'Where CancelTime Is Null ' +
        'Order By [Id] Desc';
    var recordMapper = function(row) {
        return {
            Id: row['Id'],
            PayerName: row['PayerName'],
            Time: row['Time']
        }
    };
    Read(db,{}, {}, baseSQL, recordMapper, callback);
}

Manage.prototype.readTokenLogins = ReadTokenLogins;

module.exports = new Manage(require('../db'));