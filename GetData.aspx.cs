namespace SportSite
{
    using Newtonsoft.Json;
    using Sport.Championships;
    using Sport.Common;
    using Sport.Documents;
    //using Sport.Entities;
    using Sport.Rulesets;
    using Sport.Rulesets.Rules;
    using SportSite.Common;
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Runtime.CompilerServices;
    using System.Runtime.InteropServices;
    using System.Web.UI;
    using System.Web.UI.HtmlControls;

    public class GetData : System.Web.UI.Page
    {
        protected HtmlForm form1;

        private MatchOutcome GetOutcome(double scoreA, double scoreB)
        {
            MatchOutcome technicalA;
            if (base.Request.QueryString["technical_A"] == "1")
            {
                technicalA = MatchOutcome.TechnicalA;
            }
            else if (base.Request.QueryString["technical_B"] == "1")
            {
                technicalA = MatchOutcome.TechnicalB;
            }
            else if (scoreA > scoreB)
            {
                technicalA = MatchOutcome.WinA;
            }
            else
            {
                technicalA = (scoreB <= scoreA) ? MatchOutcome.Tie : MatchOutcome.WinB;
            }
            return technicalA;
        }

        private Match GetRequestMatch(Sport.Championships.Championship rawChamp, out string error)
        {
            Match match3;
            error = "";
            MatchChampionship objA = rawChamp as MatchChampionship;
            if (ReferenceEquals(objA, null))
            {
                error = "wrong championship type";
                match3 = null;
            }
            else
            {
                int num;
                if (!int.TryParse(base.Request.QueryString["match_number"], out num))
                {
                    error = "invalid match number";
                    match3 = null;
                }
                else
                {
                    Match match = null;
                    int num2 = 0;
                    while (true)
                    {
                        bool flag = num2 < objA.Phases.Count;
                        if (!flag || !ReferenceEquals(match, null))
                        {
                            if (ReferenceEquals(match, null))
                            {
                                error = "match not found";
                            }
                            match3 = match;
                            break;
                        }
                        MatchPhase phase = objA.Phases[num2];
                        int num3 = 0;
                        while (true)
                        {
                            flag = num3 < phase.Groups.Count;
                            if (!flag || !ReferenceEquals(match, null))
                            {
                                num2++;
                                break;
                            }
                            MatchGroup group = phase.Groups[num3];
                            int num4 = 0;
                            while (true)
                            {
                                flag = num4 < group.Rounds.Count;
                                if (!flag || !ReferenceEquals(match, null))
                                {
                                    num3++;
                                    break;
                                }
                                Round round = group.Rounds[num4];
                                int num5 = 0;
                                while (true)
                                {
                                    flag = num5 < round.Cycles.Count;
                                    if (!flag || !ReferenceEquals(match, null))
                                    {
                                        num4++;
                                        break;
                                    }
                                    Cycle cycle = round.Cycles[num5];
                                    int num6 = 0;
                                    while (true)
                                    {
                                        if (num6 < cycle.Matches.Count)
                                        {
                                            Match match2 = cycle.Matches[num6];
                                            if (match2.Number != num)
                                            {
                                                num6++;
                                                continue;
                                            }
                                            match = match2;
                                        }
                                        num5++;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return match3;
        }

        protected object GetResponse()
        {
            int num;
            object obj3;
            string message = "";
            object obj2 = null;
            if (!int.TryParse(base.Request.QueryString["ccid"], out num))
            {
                int num2;
                if (int.TryParse(base.Request.QueryString["symbol"], out num2) && (num2 > 0))
                {
                    obj3 = new SimpleError("Not supported"); //SportSite.Common.Tools.BuildWholeClubForm(num2.ToString(), false, null);
                }
                else
                {
                    obj3 = new SimpleError("Nothing here");
                }
            }
            else
            {
                Sport.Championships.Championship objA = null;
                try
                {
                    objA = Sport.Championships.Championship.GetChampionship(num);
                }
                catch (Exception exception)
                {
                    message = "Error creating championship:" + exception.ToString();
                }
                if (ReferenceEquals(objA, null))
                {
                    if (message.Length == 0)
                    {
                        message = "Championship does not exist";
                    }
                    obj3 = new SimpleError(message);
                }
                else
                {
                    if (base.Request.QueryString["technical"] == "1")
                    {
                        TechnicalResult rule = objA.ChampionshipCategory.GetRule(typeof(TechnicalResult)) as TechnicalResult;
                        obj2 = ReferenceEquals(rule, null) ? ((object) new SimpleMessage("No technical rule for this championship")) : ((object) rule);
                    }
                    else if (base.Request.QueryString["action"] != "set_match_result")
                    {
                        obj2 = new SimpleChampionship(objA);
                    }
                    else
                    {
                        Match requestMatch = this.GetRequestMatch(objA, out message);
                        if (message.Length > 0)
                        {
                            obj2 = new SimpleError(message);
                        }
                        else
                        {
                            double teamAScore = requestMatch.TeamAScore;
                            double teamBScore = requestMatch.TeamBScore;
                            requestMatch.SetResult(this.GetOutcome(teamAScore, teamBScore), teamAScore, teamBScore, requestMatch.PartsResult);
                            obj2 = new SimpleMessage("OK");
                        }
                    }
                    objA.Dispose();
                    obj3 = obj2;
                }
            }
            return obj3;
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            object response = this.GetResponse();
            base.Response.Clear();
            base.Response.AddHeader("Access-Control-Allow-Origin", "*");
            string s = "";
            if (response is string)
            {
                s = response.ToString();
            }
            else
            {
                JsonSerializerSettings settings = new JsonSerializerSettings {
                    ReferenceLoopHandling = ReferenceLoopHandling.Ignore
                };
                s = JsonConvert.SerializeObject(response, settings);
            }
            base.Response.Write(s);
            base.Response.End();
        }

        internal class SimpleChampionship
        {
            public SimpleChampionship(Sport.Championships.Championship championship)
            {
                if (!ReferenceEquals(championship, null))
                {
                    this.Teams = championship.Teams.OfType<Sport.Entities.Team>().ToList<Sport.Entities.Team>().ConvertAll<GetData.SimpleTeam>(t => new GetData.SimpleTeam(t)).ToArray();
                    List<GetData.SimpleRankingTable> list = new List<GetData.SimpleRankingTable>();
                    int phaseIndex = 0;
                    while (true)
                    {
                        if (phaseIndex >= championship.Phases.Count)
                        {
                            this.RankingTables = list.ToArray();
                            if (championship is CompetitionChampionship)
                            {
                                List<GetData.SimpleCompetitor> competitors = new List<GetData.SimpleCompetitor>();
                                Dictionary<string, bool> existingCompetitors = new Dictionary<string, bool>();
                                (championship as CompetitionChampionship).Phases.OfType<CompetitionPhase>().ToList<CompetitionPhase>().ForEach(phase => phase.Groups.OfType<CompetitionGroup>().ToList<CompetitionGroup>().ForEach(group => group.Competitions.OfType<Competition>().ToList<Competition>().ForEach(competition => competition.Competitors.OfType<Competitor>().ToList<Competitor>().ForEach(delegate (Competitor competitor) {
                                    string key = competitor.PlayerNumber + "_" + competitor.Competition.Group.Phase.Index;
                                    if (!existingCompetitors.ContainsKey(key))
                                    {
                                        competitors.Add(new GetData.SimpleCompetitor(competitor));
                                        existingCompetitors.Add(key, true);
                                    }
                                }))));
                                this.Competitors = competitors.ToArray();
                            }
                            this.GameStructure = new GetData.SimpleGameStructure(championship);
                            break;
                        }
                        GetData.SimpleRankingTable item = new GetData.SimpleRankingTable(championship, phaseIndex);
                        list.Add(item);
                        phaseIndex++;
                    }
                }
            }

            public GetData.SimpleTeam[] Teams { get; set; }

            public GetData.SimpleRankingTable[] RankingTables { get; set; }

            public GetData.SimpleCompetitor[] Competitors { get; set; }

            public GetData.SimpleGameStructure GameStructure { get; set; }
        }

        internal class SimpleCompetition
        {
            public SimpleCompetition(Competition competition)
            {
                this.PhaseIndex = competition.Group.Phase.Index;
                this.GroupIndex = competition.Group.Index;
                this.GroupName = competition.Group.Name;
                this.Name = competition.Name;
                this.CompetitorsRanking = new GetData.SimpleDataTable(competition.GetCompetitorsTable());
            }

            public int PhaseIndex { get; set; }

            public int GroupIndex { get; set; }

            public string GroupName { get; set; }

            public string Name { get; set; }

            public GetData.SimpleDataTable CompetitorsRanking { get; set; }
        }

        internal class SimpleCompetitor
        {
            public SimpleCompetitor(Competitor competitor)
            {
                int id;
                this.PhaseIndex = competitor.Competition.Group.Phase.Index;
                this.Name = competitor.Name;
                this.ShirtNumber = competitor.PlayerNumber;
                if ((competitor.GroupTeam == null) || (competitor.GroupTeam.TeamEntity == null))
                {
                    id = 0;
                }
                else
                {
                    id = competitor.GroupTeam.TeamEntity.Id;
                }
                this.TeamId = id;
                this.CompetitionName = competitor.Competition.Name;
                this.Position = competitor.Position;
                this.Result = competitor.Result.ToString();
                this.Score = competitor.Score;
            }

            public int PhaseIndex { get; set; }

            public string Name { get; set; }

            public int ShirtNumber { get; set; }

            public int TeamId { get; set; }

            public string CompetitionName { get; set; }

            public int Position { get; set; }

            public string Result { get; set; }

            public int Score { get; set; }
        }

        internal class SimpleDataTable
        {
            public SimpleDataTable(Sport.Documents.Data.Table table)
            {
                this.Caption = table.Caption;
                this.Headers = table.Headers.ToList<Sport.Documents.Data.Column>().ConvertAll<string>(header => header.Text).ToArray();
                if (table.Rows != null)
                {
                    this.Rows = table.Rows.ToList<Sport.Documents.Data.Row>().FindAll(row => row.Cells != null).ConvertAll<Row>(row => new Row(row)).ToArray();
                }
            }

            public string Caption { get; set; }

            public string[] Headers { get; set; }

            public Row[] Rows { get; set; }

            public class Row
            {
                public Row(Sport.Documents.Data.Row row)
                {
                    this.CellValues = row.Cells.ToList<Sport.Documents.Data.Cell>().ConvertAll<string>(cell => cell.Text).ToArray();
                }

                public string[] CellValues { get; set; }
            }
        }

        internal class SimpleError
        {
            public SimpleError(string message)
            {
                this.Error = message;
            }

            public string Error { get; set; }
        }

        internal class SimpleGameStructure
        {
            public SimpleGameStructure()
            {
                this.PartCount = 0;
                this.ExtensionCount = 0;
            }

            public SimpleGameStructure(Sport.Championships.Championship championship) : this()
            {
                if (!ReferenceEquals(championship, null))
                {
                    GameStructure rule = championship.ChampionshipCategory.GetRule(typeof(GameStructure)) as GameStructure;
                    if (!ReferenceEquals(rule, null))
                    {
                        this.PartCount = rule.SetPart;
                        this.ExtensionCount = rule.GameExtension;
                    }
                }
            }

            public int PartCount { get; set; }

            public int ExtensionCount { get; set; }
        }

        internal class SimpleMessage
        {
            public SimpleMessage(string message)
            {
                this.Message = message;
            }

            public string Message { get; set; }
        }

        internal class SimpleRankingTable
        {
            private SimpleRankingTable()
            {
            }

            public SimpleRankingTable(Sport.Championships.Championship championship, int phaseIndex)
            {
                int num1;
                List<string> list = new List<string> { 
                    "#",
                    "שם  קבוצה"
                };
                List<Row> rows = new List<Row>();
                if ((championship == null) || (championship.Phases == null))
                {
                    num1 = 1;
                }
                else
                {
                    num1 = (phaseIndex >= championship.Phases.Count) ? 1 : 0;
                }
                if (num1 == 0)
                {
                    int num2;
                    Phase objA = championship.Phases[phaseIndex];
                    this.PhaseName = objA.Name;
                    RankingTables rule = championship.ChampionshipCategory.GetRule(typeof(RankingTables)) as RankingTables;
                    RankingTable rankingTable = null;
                    if (!ReferenceEquals(rule, null) && !ReferenceEquals(objA, null))
                    {
                        RuleType ruleType = RuleType.GetRuleType(typeof(RankingTables));
                        if (!ReferenceEquals(ruleType, null))
                        {
                            int id = ruleType.Id;
                            string str = objA.Definitions.Get(id, "טבלת דירוג");
                            if (ReferenceEquals(str, null))
                            {
                                rankingTable = rule.DefaultRankingTable;
                            }
                            else
                            {
                                num2 = 0;
                                while (true)
                                {
                                    if (!((num2 < rule.Tables.Count) && ReferenceEquals(rankingTable, null)))
                                    {
                                        break;
                                    }
                                    if (rule.Tables[num2].Name == str)
                                    {
                                        rankingTable = rule.Tables[num2];
                                    }
                                    num2++;
                                }
                            }
                        }
                    }
                    if (!ReferenceEquals(rankingTable, null))
                    {
                        num2 = 0;
                        while (true)
                        {
                            if (num2 >= rankingTable.Fields.Count)
                            {
                                if (championship is CompetitionChampionship)
                                {
                                    list.Add("עמידה בתקנון");
                                }
                                string[] arrTitles = list.ToArray();
                                objA.Groups.OfType<Group>().ToList<Group>().ForEach(group => group.Teams.OfType<Sport.Championships.Team>().ToList<Sport.Championships.Team>().ForEach(team => rows.Add(new Row(team, rankingTable, arrTitles))));
                                break;
                            }
                            string title = rankingTable.Fields[num2].Title;
                            list.Add(title);
                            num2++;
                        }
                    }
                    this.Rows = rows.ToArray();
                    this.ColumnTitles = list.ToArray();
                    List<GetData.SimpleTeam> allTeams = new List<GetData.SimpleTeam>();
                    List<GetData.SimpleCompetition> allCompetitions = new List<GetData.SimpleCompetition>();
                    objA.Groups.OfType<Group>().ToList<Group>().ForEach(delegate (Group group) {
                        Action<Competition> action = null;
                        group.Teams.OfType<Sport.Championships.Team>().ToList<Sport.Championships.Team>().ForEach(team => allTeams.Add(new GetData.SimpleTeam(team)));
                        if (group is CompetitionGroup)
                        {
                            if (action == null)
                            {
                                action = competition => allCompetitions.Add(new GetData.SimpleCompetition(competition));
                            }
                            (group as CompetitionGroup).Competitions.OfType<Competition>().ToList<Competition>().ForEach(action);
                        }
                    });
                    this.Competitions = allCompetitions.ToArray();
                    this.Teams = allTeams.ToArray();
                }
                this.IsEmpty = list.Count == 0;
            }

            public bool IsEmpty { get; set; }

            public string[] ColumnTitles { get; set; }

            public Row[] Rows { get; set; }

            public string PhaseName { get; set; }

            public GetData.SimpleTeam[] Teams { get; set; }

            public GetData.SimpleCompetition[] Competitions { get; set; }

            public static GetData.SimpleRankingTable Empty =>
                new GetData.SimpleRankingTable { IsEmpty=true };

            public class Row
            {
                public Row(Sport.Championships.Team team, RankingTable rankingTable, string[] columnTitles)
                {
                    this.GroupName = team.Group.Name;
                    this.Team = new GetData.SimpleTeam(team);
                    this.Position = team.Position;
                    this.Values = new string[columnTitles.Length];
                    for (int i = 0; i < columnTitles.Length; i++)
                    {
                        this.Values[i] = this.GetColumnText(rankingTable, team, columnTitles, i);
                    }
                }

                private string GetColumnText(RankingTable rankingTable, Sport.Championships.Team team, string[] columnTitles, int colIndex)
                {
                    EquationVariables variables;
                    string name;
                    if (((team.Group.Phase.Championship is CompetitionChampionship) && !ReferenceEquals(rankingTable, null)) && (colIndex == (columnTitles.Length - 1)))
                    {
                        bool flag = true;
                        int index = 2;
                        while (true)
                        {
                            if (index < rankingTable.Fields.Count)
                            {
                                int num1;
                                string str = columnTitles[index];
                                variables = new EquationVariables();
                                team.SetFields(variables);
                                string s = rankingTable.Fields[index - 2].Evaluate(variables);
                                if ((str.IndexOf("נוספות") >= 0) || (str == "נקודות"))
                                {
                                    num1 = 1;
                                }
                                else
                                {
									num1 = (s == "???") ? 1 : 0;
                                }
                                if ((num1 != 0) || (!Sport.Common.Tools.IsInteger(s) || (int.Parse(s) > 0)))
                                {
                                    index++;
                                    continue;
                                }
                                flag = false;
                            }
                            name = flag ? "כן" : "לא";
                            break;
                        }
                    }
                    else
                    {
                        switch (colIndex)
                        {
                            case 0:
                                name = (team.Position + 1).ToString();
                                break;

                            case 1:
                                name = team.Name;
                                break;

                            default:
                                int num4;
                                if ((rankingTable == null) || (colIndex <= 1))
                                {
                                    num4 = 1;
                                }
                                else
                                {
									num4 = ((colIndex - 2) >= rankingTable.Fields.Count) ? 1 : 0;
                                }
                                if (num4 != 0)
                                {
                                    name = "";
                                }
                                else
                                {
                                    variables = new EquationVariables();
                                    team.SetFields(variables);
                                    name = rankingTable.Fields[colIndex - 2].Evaluate(variables);
                                }
                                break;
                        }
                    }
                    return name;
                }

                public string GroupName { get; set; }

                public GetData.SimpleTeam Team { get; set; }

                public int Position { get; set; }

                public string[] Values { get; set; }
            }
        }

        internal class SimpleResponse
        {
            public SimpleResponse(string response)
            {
                this.Response = response;
            }

            public string Response { get; set; }
        }

        internal class SimpleTeam
        {
            public SimpleTeam(Sport.Championships.Team team)
            {
                this.Id = team.Id;
                this.Name = team.Name;
                this.Index = team.Index;
                if (team is CompetitionTeam)
                {
                    this.GroupIndex = (team as CompetitionTeam).Group.Index;
                    int teamTotalScore = 0;
                    Sport.Documents.Data.Table[] fullReportTables = (team as CompetitionTeam).GetFullReportTables(ref teamTotalScore);
                    if (fullReportTables != null)
                    {
                        this.FullReportTables = fullReportTables.ToList<Sport.Documents.Data.Table>().ConvertAll<GetData.SimpleDataTable>(table => new GetData.SimpleDataTable(table)).ToArray();
                        this.TotalScore = teamTotalScore;
                    }
                }
            }

            public SimpleTeam(Sport.Entities.Team team)
            {
                this.Id = team.Id;
                this.Name = team.Name;
                this.Index = team.Index;
            }

            public int Id { get; set; }

            public string Name { get; set; }

            public int GroupIndex { get; set; }

            public int Index { get; set; }

            public GetData.SimpleDataTable[] FullReportTables { get; set; }

            public int TotalScore { get; set; }
        }
    }
}

