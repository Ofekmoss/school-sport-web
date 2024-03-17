var reportUtils = {
    _clearFiltersPositionTimer: 0,
    FieldType: {
        Ordinary: 1,
        Date: 2
    },
    _possibleFieldTypes: [],
    possibleFieldTypes: function() {
        if (reportUtils._possibleFieldTypes.length == 0) {
            reportUtils._possibleFieldTypes.push({
                Key: 'date',
                Type: reportUtils.FieldType.Date
            });
        }
        return reportUtils._possibleFieldTypes;
    },
    parseFieldType: function(fieldName) {
        for (var i = 0; i < reportUtils.possibleFieldTypes().length; i++) {
            var possibleFieldType = reportUtils.possibleFieldTypes()[i];
            if (fieldName.endsWith('|' + possibleFieldType.Key))
                return possibleFieldType.Type;
        }
        return reportUtils.FieldType.Ordinary;
    },
    cleanFieldName: function(fieldName) {
        var clean = fieldName + '';
        reportUtils.possibleFieldTypes().forEach(function(x) {
            clean = clean.replace('|' + x.Key, '');
        });
        return clean;
    },
    applySpecialCases: function(viewName, rows, $filter) {
        if (viewName == 'ViewTeams' || viewName == 'ViewPlayers') {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                row['שם קבוצה'] = reportUtils.buildTeamName(row);
            }
            return {
                Column: 'תאריך רישום',
                Descending: true
            }
        }
        if (viewName == 'ViewMatches') {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                console.log(row['PreviousGroupName_A']);
                row['קבוצה א\''] = reportUtils.getPreviousPhaseTeam(row, 'A') || eventsUtils.BuildTeamName(row, 'A');
                row['קבוצה ב\''] = reportUtils.getPreviousPhaseTeam(row, 'B') || eventsUtils.BuildTeamName(row, 'B');
                row['תוצאה'] = reportUtils.buildGameResult(row);
                if (row['RawDate']) {
                    var parsedDate = reportUtils.parseRawDate(row['RawDate']);
                    row['תאריך'] = parsedDate.Date;
                    row['שעה'] = parsedDate.Time;
                }
            }
            return {
                Column: 'אליפות',
                Descending: false
            }
        }
        return null;
    },
    getPreviousPhaseTeam: function(row, teamLetter) {
        var groupIndex = row['PreviousGroupIndex_' + teamLetter];
        if (groupIndex != null) {
            var groupName = row['PreviousGroupName_' + teamLetter];
            if (groupName != null && groupName.length > 0)
                return groupName + ' מיקום ' + (groupIndex + 1);
        }
        return null;
    },
    buildGameResult: function(row) {
        var gameResult = '';
        var result = row['RESULT'];
        var scoreA = row['TEAM_A_SCORE'];
        var scoreB = row['TEAM_B_SCORE'];
        var partsResult = row['PARTS_RESULT'];
        if (result != null && scoreA != null && scoreB != null) {
            gameResult = scoreA + ' - ' + scoreB;
            /*
            if (partsResult != null && partsResult.length > 0) {
                while (partsResult.indexOf('|') > 0)
                    partsResult = partsResult.replace('|', ',');
                gameResult += ' (' + partsResult + ')';
            }
            */
        }
        return gameResult;

    },
    parseRawDate: function(rawDate) {
        //2018-05-28T02:00:35.000Z
        var date = '';
        var time = '';
        var mainParts = rawDate.split('T');
        if (mainParts.length == 2) {
            dateParts = mainParts[0].split('-');
            timeParts = mainParts[1].split(':');
            if (dateParts.length == 3) {
                date = [dateParts[2], dateParts[1], dateParts[0]].join('/');
            }
            if (timeParts.length > 2) {
                time = [timeParts[0], timeParts[1]].join(':');
            }
        }
        return {
            Date: date,
            Time: time
        };
    },
    buildTeamName: function(dataRow) {
        var schoolName = dataRow['SCHOOL_NAME'];
        var cityName = dataRow['CITY_NAME'] || '';
        var teamName = schoolName;
        if (teamName.indexOf(cityName) < 0)
            teamName += ' ' + cityName;
        return teamName;
    },
    applyFieldTypes: function(fields, rows, $filter) {
        var dateFields = fields.filter(function(x) {
            return x.Type == reportUtils.FieldType.Date;
        });
        if (dateFields.length > 0) {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                dateFields.forEach(function(dateField) {
                    var dateFieldName = dateField.Name;
                    var curValue = row[dateFieldName];
                    row['original_' + dateFieldName] = curValue;
                    row[dateFieldName] = $filter('date')(curValue, 'dd/MM/yyyy');
                });
            }
        }
    },
    applyFilters: function(fields, rows) {
        if (!fields || fields.length == 0 || !rows || rows.length == 0)
            return [];

        var filteredFields = fields.filter(function(x) {
            return x.FilterText && x.FilterText.length > 0;
        });

        if (filteredFields.length > 0) {
            var filteredRows = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var matchingAll = true;
                for (var j = 0; j < filteredFields.length; j++) {
                    var filteredField = filteredFields[j];
                    var currentValue = (row[filteredField.Name] || '').toString();
                    if (currentValue.indexOf(filteredField.FilterText) < 0) {
                        matchingAll = false;
                        break;
                    }
                }
                if (matchingAll)
                    filteredRows.push(row);
            }
            return filteredRows;
        } else {
            return rows;
        }
    },
    sort: function(rows, sortColumn, fields, isDescending) {
        if (!rows || rows.length == 0 || !sortColumn || !fields || fields.length == 0)
            return;
        if (typeof isDescending == 'undefined')
            isDescending = false;
        var matchingField = fields.findItem(function(x) {
            return x.Title == sortColumn;
        });
        if (matchingField == null)
            return;
        var propName = (matchingField.Type == reportUtils.FieldType.Date) ? 'original_' + matchingField.Name : matchingField.Name;
        var biggerThanReturnValue = isDescending ? -1 : 1;
        var smallerThanReturnValue = isDescending ? 1 : -1;
        rows.sort(function(r1, r2) {
            var v1 = r1[propName];
            var v2 = r2[propName];
            var bigger = (v1 > v2);
            return bigger ? biggerThanReturnValue : ((v1 < v2) ? smallerThanReturnValue : 0);
        });
    },
    InitClearFiltersPositionTimer: function() {
        if (reportUtils._clearFiltersPositionTimer)
            window.clearInterval(reportUtils._clearFiltersPositionTimer);
        reportUtils._clearFiltersPositionTimer = window.setInterval(function() {
            $(".clear-filter:visible").each(function() {
                var oClearFilter = $(this);
                var oSortIcon = oClearFilter.parents("th").find(".sortIcon:visible");
                if (oSortIcon.length == 1) {
                    oClearFilter.css("top", "35px");
                } else {
                    oClearFilter.css("top", "15px");
                }
            });
        }, 500);
    }
};

