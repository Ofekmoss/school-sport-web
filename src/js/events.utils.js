var eventsUtils = {
    BuildTeamName: function(sportsmanEvent, teamLetter) {
        var schoolProp = teamLetter ? 'Team' + teamLetter + '_School' : 'SCHOOL_NAME';
        var cityProp = teamLetter ? 'Team' + teamLetter + '_City' : 'CITY_NAME';
        var indexProp = teamLetter ? 'Team' + teamLetter + '_Index' : 'TEAM_INDEX';
        var schoolName = sportsmanEvent[schoolProp];
        var cityName = sportsmanEvent[cityProp];
        var teamIndex = indexProp.length > 0 ? sportUtils.GetHebrewLetter(sportsmanEvent[indexProp]) : '';
        var teamName = schoolName + '';
        if (cityName && cityName.length > 0 && teamName.indexOf(cityName) < 0)
            teamName += ' ' + cityName;
        if (teamIndex.length > 0)
            teamName += " " + teamIndex + "'";
        if (teamName.indexOf('-') > 0)
            teamName = teamName.replace('-', ' - ');
        return teamName;
    },
    BuildGameDetails: function(sportsmanEvent) {
        //, sportsmanEvent.GROUP_NAME
        return [
            sportsmanEvent.PHASE_NAME, sportsmanEvent.ROUND_NAME, sportsmanEvent.CYCLE_NAME,
            sportsmanEvent.SPORT_FIELD_NAME
        ].filter(function (x) {
                return x != null && x.length > 0;
            }).join(', ');
    },
    BuildSportsmanDetails: function(sportsmanEvent) {
        if (sportsmanEvent.ChampionshipType == 2) {
            return sportsmanEvent.SPORT_FIELD_NAME;
        }

        if (!sportsmanEvent.DailyEvents || sportsmanEvent.DailyEvents.length < 2) {
            var team_A = eventsUtils.BuildTeamName(sportsmanEvent, 'A');
            var team_B = eventsUtils.BuildTeamName(sportsmanEvent, 'B');
            return team_A + ' מול ' + team_B;
        }

        var firstMatch = sportsmanEvent.DailyEvents[0];
        var firstPhase = firstMatch.PHASE_NAME, firstRound = firstMatch.ROUND_NAME, firstCycle = firstMatch.CYCLE_NAME;
        var samePhase = true, sameRound = true, sameCycle = true;
        for (var i = 1; i < sportsmanEvent.DailyEvents.length; i++) {
            var curDailyEvent = sportsmanEvent.DailyEvents[i];
            if (curDailyEvent.PHASE_NAME != firstPhase)
                samePhase = false;
            if (curDailyEvent.ROUND_NAME != firstRound)
                sameRound = false;
            if (curDailyEvent.CYCLE_NAME != firstCycle)
                sameCycle = false;
        }
        if (samePhase && sameRound && sameCycle)
            return [firstPhase, firstRound, firstCycle].join(', ');
        else if (samePhase && sameRound)
            return [firstPhase, firstRound].join(', ');
        else if (samePhase)
            return firstPhase;
        var lastPhase = sportsmanEvent.DailyEvents.lastItem().PHASE_NAME;
        return firstPhase + ' עד ' + lastPhase;
    }
};
