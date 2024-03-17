USE [SchoolSportDb]
GO

CREATE VIEW [dbo].[ViewTeams]
AS
Select c.SEASON, t.TEAM_ID As [זיהוי קבוצה], '' As [שם קבוצה], r.REGION_NAME As [מחוז], c.CHAMPIONSHIP_NAME + ' ' + IsNull(cm.CATEGORY_NAME, '') As [אליפות],
	t.REGISTRATION_DATE As [תאריך רישום|date], t.SCHOOL_ID, s.SYMBOL As [סמל בית ספר],
	Case t.[STATUS] When 1 Then 'רשומה' When 2 Then 'מאושרת' Else '' End As [סטטוס רישום],
	s.SCHOOL_NAME, cit.CITY_NAME, t.PLAYERS_COUNT As [שחקנים רשומים], c.CHAMPIONSHIP_ID, cc.CHAMPIONSHIP_CATEGORY_ID
From TEAMS t Inner Join CHAMPIONSHIP_CATEGORIES cc On t.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID
	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID
	Inner Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID
	Left Join CITIES cit On s.CITY_ID=cit.CITY_ID
	Left Join CATEGORY_MAPPING cm On cc.[CATEGORY]=cm.RAW_CATEGORY
	Left Join REGIONS r On s.REGION_ID=r.REGION_ID
Where t.DATE_DELETED Is Null And cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null And s.DATE_DELETED Is Null

GO

------------------------------------------------------------------------------------------------

USE [SchoolSportDb]
GO

CREATE VIEW [dbo].[ViewPlayers]
AS
Select vt.SEASON, st.STUDENT_ID As [זיהוי תלמיד], p.PLAYER_ID As [זיהוי  שחקן], st.FIRST_NAME As [שם פרטי], st.LAST_NAME As [שם משפחה],
	st.BIRTH_DATE As [תאריך לידה|date], st.ID_NUMBER As [מספר זהות], p.REGISTRATION_DATE As [תאריך רישום|date], vt.[זיהוי קבוצה], '' As [שם קבוצה],
	r.REGION_NAME As [מחוז], vt.SCHOOL_NAME, vt.CITY_NAME, vt.[סמל בית ספר], vt.[אליפות]
From PLAYERS p Inner Join ViewTeams vt On p.TEAM_ID=vt.[זיהוי קבוצה]
	Inner Join STUDENTS st On p.STUDENT_ID=st.STUDENT_ID
	Inner Join SCHOOLS s On st.SCHOOL_ID=s.SCHOOL_ID
	Left Join REGIONS r On s.REGION_ID=r.REGION_ID
Where p.DATE_DELETED Is Null And st.DATE_DELETED Is Null

GO

------------------------------------------------------------------------------------------------

USE [SchoolSportDb]
GO

CREATE VIEW [dbo].[ViewMatches]
AS
Select Distinct c.SEASON,
	cm.match_number As [מס'],
	s.SPORT_NAME As [ענף],
	r.REGION_NAME As [מחוז],
	c.CHAMPIONSHIP_NAME As [אליפות],
	mapping.CATEGORY_NAME As [קטגוריה],
	cp.PHASE_NAME As [שלב],
	cr.ROUND_NAME As [סיבוב],
	cyc.CYCLE_NAME As [מחזור],
	cg.GROUP_NAME As [בית],
	s_A.SCHOOL_NAME As TeamA_School,
	s_B.SCHOOL_NAME As TeamB_School,
	c_A.CITY_NAME As TeamA_City,
	c_B.CITY_NAME As TeamB_City,
	t_A.TEAM_INDEX As TeamA_Index,
	t_B.TEAM_INDEX As TeamB_Index,
	'' As [קבוצה א'],
	'' As [קבוצה ב'],
	'' As [תאריך],
	'' As [שעה],
	cm.[TIME] As RawDate,
	f.FACILITY_NAME As [מתקן],
	cm.TEAM_A_SCORE,
	cm.TEAM_B_SCORE,
	cm.RESULT,
	cm.PARTS_RESULT,
	'' As [תוצאה],
	cgt_A.PREVIOUS_POSITION As PreviousGroupIndex_A,
	cgt_B.PREVIOUS_POSITION As PreviousGroupIndex_B,
	prev_cg_A.GROUP_NAME As PreviousGroupName_A,
	prev_cg_B.GROUP_NAME As PreviousGroupName_B
From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID
	Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID
	Inner Join CHAMPIONSHIP_PHASES cp On cm.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cp.PHASE
	Inner Join CHAMPIONSHIP_ROUNDS cr On cm.CHAMPIONSHIP_CATEGORY_ID=cr.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cr.PHASE And cm.[ROUND]=cr.[ROUND]
	Inner Join CHAMPIONSHIP_CYCLES cyc On cm.CHAMPIONSHIP_CATEGORY_ID=cyc.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cyc.PHASE And cm.[ROUND]=cyc.[ROUND] And cm.CYCLE=cyc.CYCLE
	Inner Join CHAMPIONSHIP_GROUPS cg On cm.CHAMPIONSHIP_CATEGORY_ID=cg.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cg.PHASE And cm.NGROUP=cg.NGROUP
	Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID
	Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt_A On cm.CHAMPIONSHIP_CATEGORY_ID=cgt_A.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt_A.PHASE And cm.NGROUP=cgt_A.NGROUP And cm.TEAM_A=cgt_A.[POSITION]
	Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt_B On cm.CHAMPIONSHIP_CATEGORY_ID=cgt_B.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt_B.PHASE And cm.NGROUP=cgt_B.NGROUP And cm.TEAM_B=cgt_B.[POSITION]
	Left Join REGIONS r On c.REGION_ID=r.REGION_ID
	Left Join CATEGORY_MAPPING mapping On cc.CATEGORY=mapping.RAW_CATEGORY
	Left Join FACILITIES f On cm.FACILITY_ID=f.FACILITY_ID
	Left Join TEAMS t_A On cgt_A.TEAM_ID=t_A.TEAM_ID
	Left Join TEAMS t_B On cgt_B.TEAM_ID=t_B.TEAM_ID
	Left Join SCHOOLS s_A On t_A.SCHOOL_ID=s_A.SCHOOL_ID
	Left Join SCHOOLS s_B On t_B.SCHOOL_ID=s_B.SCHOOL_ID
	Left Join CITIES c_A On s_A.CITY_ID=c_A.CITY_ID
	Left Join CITIES c_B On s_B.CITY_ID=c_B.CITY_ID
	Left Join CHAMPIONSHIP_GROUPS prev_cg_A On cgt_A.PREVIOUS_GROUP Is Not Null And prev_cg_A.CHAMPIONSHIP_CATEGORY_ID=cgt_A.CHAMPIONSHIP_CATEGORY_ID And prev_cg_A.PHASE=cgt_A.PHASE-1 And prev_cg_A.NGROUP=cgt_A.PREVIOUS_GROUP
	Left Join CHAMPIONSHIP_GROUPS prev_cg_B On cgt_B.PREVIOUS_GROUP Is Not Null And prev_cg_B.CHAMPIONSHIP_CATEGORY_ID=cgt_B.CHAMPIONSHIP_CATEGORY_ID And prev_cg_B.PHASE=cgt_B.PHASE-1 And prev_cg_B.NGROUP=cgt_B.PREVIOUS_GROUP
Where cm.DATE_DELETED Is Null And c.DATE_DELETED Is Null And cc.DATE_DELETED Is Null

GO

------------------------------------------------------------------------------------------------

CREATE VIEW [dbo].[Futsal_Players] AS
Select 	t.CATEGORY, pe.REGISTRATION_DATE, s.FIRST_NAME, s.LAST_NAME, dbo.TranslateGrade(68 - s.GRADE) As GRADE,
	Case s.SEX_TYPE When 1 Then 'בן' When 2 Then 'בת' Else '' END AS [GENDER],
	Convert(nvarchar(20), DatePart(d, s.BIRTH_DATE)) + '/' + Convert(nvarchar(20), DatePart(m, s.BIRTH_DATE)) + '/' + Convert(nvarchar(20), DatePart(YYYY, s.BIRTH_DATE)) As BIRTH_DATE,
	s.ID_NUMBER,
	dbo.BuildTeamName(sch.SCHOOL_NAME, ci.CITY_NAME) As TEAM_NAME,
	r.REGION_NAME,
	cit.CITY_NAME,
	sch.SYMBOL As SCHOOL_SYMBOL,
	pe.TEAM_ID,
	dbo.BuildChampionshipName(t.CHAMPIONSHIP_NAME, tcd.CATEGORY_NAME) As CHAMPIONSHIP_NAME,
	t.SPORT_NAME,
	IsNull(tsf1.PIC_NAME, 'אין תמונה') As PIC_NAME,
	IsNull(tsf2.PIC_NAME, 'אין קובץ') As MEDICAL_EXAM,
	IsNull(tsf3.PIC_NAME, 'אין קובץ') As ID_VOUCHER
From PLAYERS pe Inner Join
(
	Select te.TEAM_ID, c.CHAMPIONSHIP_NAME, c.CATEGORY, te.SCHOOL_ID, s.SPORT_NAME
	From TEAMS te Inner Join (
			Select cc.CHAMPIONSHIP_CATEGORY_ID, ch.CHAMPIONSHIP_NAME, cc.CATEGORY, ch.SPORT_ID
			From CHAMPIONSHIP_CATEGORIES cc Inner Join  CHAMPIONSHIPS ch On cc.CHAMPIONSHIP_ID=ch.CHAMPIONSHIP_ID
			Where ch.SPORT_ID In (17, 79)
				And ch.SEASON=68 And ch.DATE_DELETED Is Null And cc.DATE_DELETED Is Null
		) As c On te.CHAMPIONSHIP_CATEGORY_ID=c.CHAMPIONSHIP_CATEGORY_ID
		Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID
	Where te.DATE_DELETED Is Null
) As t On pe.TEAM_ID=t.TEAM_ID
	Inner Join STUDENTS s On pe.STUDENT_ID=s.STUDENT_ID
	Inner Join SCHOOLS sch On t.SCHOOL_ID=sch.SCHOOL_ID
	Left Join REGIONS r On sch.REGION_ID=r.REGION_ID
	Left Join CITIES cit On sch.CITY_ID=cit.CITY_ID
	Left Join TEMP_STUDENT_FILES tsf1 On s.ID_NUMBER=tsf1.ID_NUMBER And tsf1.FILE_TYPE=1
	Left Join TEMP_STUDENT_FILES tsf2 On s.ID_NUMBER=tsf2.ID_NUMBER And tsf2.FILE_TYPE=2
	Left Join TEMP_STUDENT_FILES tsf3 On s.ID_NUMBER=tsf3.ID_NUMBER And tsf3.FILE_TYPE=3
	Left Join TEMP_CATEGORIES_DATA tcd On t.CATEGORY=tcd.RAW_CATEGORY
	Left Join CITIES ci On sch.CITY_ID=ci.CITY_ID
Where pe.DATE_DELETED Is Null

GO