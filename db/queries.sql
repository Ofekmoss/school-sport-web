Select s.* Into TMP_PAKAL_SCHOOLS_15_11_2018
From SCHOOLS s Inner Join USERS u On u.USER_LOGIN=s.SYMBOL
Where s.SCHOOL_ID In (
	Select Distinct SCHOOL_ID From TEAMS
	Where CHAMPIONSHIP_CATEGORY_ID In (
		Select CHAMPIONSHIP_CATEGORY_ID From CHAMPIONSHIP_CATEGORIES
		Where CHAMPIONSHIP_ID In (
			Select CHAMPIONSHIP_ID From CHAMPIONSHIPS
			Where SPORT_ID=83
		) And DATE_DELETED Is Null
	) And DATE_DELETED Is Null
) And s.DATE_DELETED Is Null

-------------------------------------------------------------------------------

Select Distinct s.SYMBOL, s.SCHOOL_NAME, m.TotalPlayers
From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID
	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID
	Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID
	Left Join (
		Select TEAM_ID, Count(PLAYER_ID) As TotalPlayers
		From PLAYERS
		Where DATE_DELETED Is Null
		Group By TEAM_ID
	) As m On t.TEAM_ID=m.TEAM_ID
Where c.SPORT_ID=83 And t.SCHOOL_ID In (
	Select Distinct SCHOOL_ID
	From TMP_PAKAL_SCHOOLS_15_11_2018
) And t.DATE_DELETED Is Null And m.TotalPlayers>20

-------------------------------------------------------------------------------

Declare @CurrentPageSeq int;
Declare @CurrentChampionship nvarchar(20);

Declare db_cursor Cursor For
Select Seq, ChampionshipCategoryId
From ContentPages
Where ChampionshipCategoryId Is Not Null And Len(ChampionshipCategoryId)>0

Open db_cursor
Fetch Next From db_cursor Into @CurrentPageSeq, @CurrentChampionship

While @@FETCH_STATUS = 0
Begin
      Insert Into ContentPageChampionships (ContentPageSeq, ChampionshipCategoryId)
	  Values (@CurrentPageSeq, @CurrentChampionship)
      Fetch Next From db_cursor Into @CurrentPageSeq, @CurrentChampionship
End

Close db_cursor
Deallocate db_cursor