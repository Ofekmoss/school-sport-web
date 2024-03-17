CREATE TABLE [dbo].[Attachments](
	[Seq] [int] NOT NULL,
	[AttachmentType] [int] NOT NULL,
	[FileName] [nvarchar](256) COLLATE Hebrew_CI_AS NOT NULL,
	[FileSize] [int] NULL,
	[DateUploaded] [datetime] NOT NULL,
	[Description] [nvarchar](1024) COLLATE Hebrew_CI_AS NULL,
	[ExternalLink] [nvarchar](512) COLLATE Hebrew_CI_AS NULL,
    [LinkedAttachmentName] [nvarchar](256) NULL,
 CONSTRAINT [PK_Attachments] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Tags](
	[Seq] [int] NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[Type] [int] NOT NULL,
 CONSTRAINT [PK_ContentTags] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UN_ContentTags] UNIQUE NONCLUSTERED
(
	[Name] ASC,
	[Type] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Users](
	[Seq] [int] NOT NULL,
	[UserLogin] [nvarchar](50) NOT NULL,
	[Password] [nvarchar](100) NULL,
	[DisplayName] [nvarchar](256) NULL,
	[Role] [int] NULL,
 CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

Insert Into [Users] ([Seq], [UserLogin], [DisplayName], [Role]) Values (1, 'yahav', 'יהב', 1)
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[SportFields](
	[Seq] [int] NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
 CONSTRAINT [PK_SportFields] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[ContentPages](
	[Seq] [int] NOT NULL,
	[Type] [int] NOT NULL,
	[Description] [nvarchar](255) NOT NULL,
	[Date] [datetime] NOT NULL,
	[DefaultImageSeq] [int] NULL,
	[CreatorSeq] [int] NULL,
	[SportFieldSeq] [int] NULL,
    [ImportedArticleId] [int] NULL,
    [Index] [int] NULL,
    [AuthorSeq] [int] NULL,
    [SubCaption] [nvarchar](1024) NULL,
    [ShowAuthorDetails] [int] NULL,
    [ChampionshipCategoryId] nvarchar(20) NULL,
    [IsHidden] [int] NULL,
    [Time] [datetime] NULL,
    [FacilityName] [nvarchar](255) NULL,
    [ActivityDuration] [nvarchar](50) NULL,
 CONSTRAINT [PK_ContentPages] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[ContentPages]  WITH CHECK ADD  CONSTRAINT [FK_ContentPages_Creator] FOREIGN KEY([CreatorSeq])
REFERENCES [dbo].[Users] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[ContentPages]  WITH CHECK ADD  CONSTRAINT [FK_ContentPages_DefaultImage] FOREIGN KEY([DefaultImageSeq])
REFERENCES [dbo].[Attachments] ([Seq])
GO

ALTER TABLE [dbo].[ContentPages]  WITH CHECK ADD  CONSTRAINT [FK_ContentPages_SportField] FOREIGN KEY([SportFieldSeq])
REFERENCES [dbo].[SportFields] ([Seq])
GO

ALTER TABLE [dbo].[ContentPages]  WITH CHECK ADD  CONSTRAINT [FK_ContentPages_Author] FOREIGN KEY([AuthorSeq])
REFERENCES [dbo].[Contacts] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[ContentPageTags](
	[PageSeq] [int] NOT NULL,
	[TagSeq] [int] NOT NULL,
 CONSTRAINT [PK_PageTags] PRIMARY KEY CLUSTERED
(
	[PageSeq] ASC,
	[TagSeq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[ContentPageTags]  WITH CHECK ADD  CONSTRAINT [FK_PageTags_Page] FOREIGN KEY([PageSeq])
REFERENCES [dbo].[ContentPages] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[ContentPageTags]  WITH CHECK ADD  CONSTRAINT [FK_PageTags_Tag] FOREIGN KEY([TagSeq])
REFERENCES [dbo].[Tags] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[ContentSections](
	[PageSeq] [int] NOT NULL,
	[Type] [int] NOT NULL,
	[Data] [nvarchar](max) NOT NULL,
	[SectionIndex] [int] NOT NULL,
 CONSTRAINT [PK_ContentSections_1] PRIMARY KEY CLUSTERED
(
	[PageSeq] ASC,
	[SectionIndex] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[ContentSections]  WITH CHECK ADD  CONSTRAINT [FK_ContentSections_Page] FOREIGN KEY([PageSeq])
REFERENCES [dbo].[ContentPages] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Sequences](
	[TableName] [varchar](50) NOT NULL,
	[Value] [int] NOT NULL,
 CONSTRAINT [PK_Sequences] PRIMARY KEY CLUSTERED
(
	[TableName] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO

Insert Into Sequences ([TableName], [Value]) Values ('ContentPages', 0);
Insert Into Sequences ([TableName], [Value]) Values ('Tags', 0);
Insert Into Sequences ([TableName], [Value]) Values ('Attachments', 0);
Insert Into Sequences ([TableName], [Value]) Values ('Users', 0);
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[FeaturedPages](
	[PageSeq] [int] NOT NULL,
	[Index] [int] NOT NULL,
 CONSTRAINT [PK_FeaturedPages] PRIMARY KEY CLUSTERED
(
	[PageSeq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[FeaturedPages]  WITH CHECK ADD  CONSTRAINT [FK_FeaturedPages_Page] FOREIGN KEY([PageSeq])
REFERENCES [dbo].[ContentPages] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Contacts](
	[Seq] [int] NOT NULL,
	[ContactType] [int] NULL,
	[Name] [nvarchar](255) NOT NULL,
	[AboutMe] [nvarchar](max) NULL,
	[Picture] [int] NULL,
	[Email] [nvarchar](255) NULL,
	[HomePage] [nvarchar](255) NULL,
	[FacebookUrl] [nvarchar](255) NULL,
	[TwitterUrl] [nvarchar](255) NULL,
	[InstagramUrl] [nvarchar](255) NULL,
	[YouTubeUrl] [nvarchar](255) NULL,
	[LinkedInUrl] [nvarchar](255) NULL,
 CONSTRAINT [PK_Authors] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO
USE [SchoolSportWeb]
GO
ALTER TABLE [dbo].[Contacts]  WITH CHECK ADD  CONSTRAINT [FK_Authors_Picture] FOREIGN KEY([Picture])
REFERENCES [dbo].[Attachments] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE

-----------------------------------------------------------

CREATE TABLE [dbo].[SportFieldColors](
	[SportFieldSeq] [int] NOT NULL,
	[Color] [nvarchar](20) NOT NULL,
 CONSTRAINT [PK_SportFieldColors] PRIMARY KEY CLUSTERED
(
	[SportFieldSeq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[SportFieldColors]  WITH CHECK ADD  CONSTRAINT [FK_SportFieldColors_SportField] FOREIGN KEY([SportFieldSeq])
REFERENCES [dbo].[SportFields] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Seasons](
	[HebrewYear] [int] NOT NULL,
	[Name] [nvarchar](50) NOT NULL,
	[IsCurrent] [int] NULL,
	[FirstDay] [datetime] NULL,
   	[LastDay] [datetime] NULL
 CONSTRAINT [PK_Seasons] PRIMARY KEY CLUSTERED
(
	[HebrewYear] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UN_Season_Name] UNIQUE NONCLUSTERED
(
	[Name] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

Update Seasons Set FirstDay=CAST(CAST(HebrewYear - 3761 AS varchar) + '-09-01' AS DATETIME)
GO

Update Seasons Set LastDay=CAST(CAST(HebrewYear - 3760 AS varchar) + '-08-31 23:59:59' AS DATETIME)
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[CroppedImages](
	[ImageSeq] [int] NOT NULL,
	[AspectRatio] [nvarchar](50) NOT NULL,
	[FileName] [nvarchar](256) NOT NULL,
	[DateUpdated] [datetime] NOT NULL,
	[MetaData] nvarchar(256) NULL,
 CONSTRAINT [PK_CroppedImages] PRIMARY KEY CLUSTERED
(
	[ImageSeq] ASC,
	[AspectRatio] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UN_CroppedImages_Name] UNIQUE NONCLUSTERED
(
	[ImageSeq] ASC,
	[FileName] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO
ALTER TABLE [dbo].[CroppedImages]  WITH CHECK ADD  CONSTRAINT [FK_CroppedImages_Image] FOREIGN KEY([ImageSeq])
REFERENCES [dbo].[Attachments] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE

-----------------------------------------------------------

CREATE TABLE [dbo].[PageThumbnails](
	[PageSeq] [int] NOT NULL,
	[ThumbnailType] [int] NOT NULL,
	[PictureSeq] [int] NOT NULL,
 CONSTRAINT [PK_PageThumbnails] PRIMARY KEY CLUSTERED
(
	[PageSeq] ASC,
	[ThumbnailType] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[PageThumbnails]  WITH CHECK ADD  CONSTRAINT [FK_PageThumbnails_Picture] FOREIGN KEY([PictureSeq])
REFERENCES [dbo].[Attachments] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Banners](
	[Seq] [int] NOT NULL,
	[AttachmentSeq] [int] NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[Frequency] [int] NOT NULL,
	[Type] [int] NOT NULL,
	[DateCreated] [datetime] NULL,
	[UploadedBy] [int] NULL,
 CONSTRAINT [PK_Banners] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (IGNORE_DUP_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[Banners]  WITH CHECK ADD  CONSTRAINT [FK_Banners_Attachment] FOREIGN KEY([AttachmentSeq])
REFERENCES [dbo].[Attachments] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[Banners]  WITH CHECK ADD  CONSTRAINT [FK_Banners_Uploader] FOREIGN KEY([UploadedBy])
REFERENCES [dbo].[Users] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE

-----------------------------------------------------------

CREATE TABLE [dbo].[RegionColors](
	[RegionId] [int] NOT NULL,
	[Color] [nvarchar](20) NOT NULL,
 CONSTRAINT [PK_RegionColors] PRIMARY KEY CLUSTERED
(
	[RegionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[StudentsAddedBySchools](
	[SCHOOL_SYMBOL] [nvarchar](7) NOT NULL,
	[STUDENT_ID_NUMBER] [int] NOT NULL,
	[DATE_CREATED] [datetime] NOT NULL,
 CONSTRAINT [PK_SiteUsersAudit] PRIMARY KEY CLUSTERED
(
	[SCHOOL_SYMBOL] ASC,
	[STUDENT_ID_NUMBER] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[StudentGradeMapping](
	[GRADE_OFFSET] [int] NOT NULL,
	[GRADE_NAME] [nvarchar](10) NOT NULL,
 CONSTRAINT [PK_StudentGradeMapping] PRIMARY KEY CLUSTERED
(
	[GRADE_OFFSET] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[SchoolChangeRequests](
	[STUDENT_ID] [int] NOT NULL,
	[TARGET_SCHOOL_SYMBOL] [nvarchar](7) NOT NULL,
 CONSTRAINT [PK_SchoolChangeRequests] PRIMARY KEY CLUSTERED
(
	[STUDENT_ID] ASC,
	[TARGET_SCHOOL_SYMBOL] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[SchoolChangeRequests]  WITH CHECK ADD  CONSTRAINT [FK_SchoolChangeRequests_STUDENT] FOREIGN KEY([STUDENT_ID])
REFERENCES [dbo].[STUDENTS] ([STUDENT_ID])
GO

ALTER TABLE [dbo].[SchoolChangeRequests] CHECK CONSTRAINT [FK_SchoolChangeRequests_STUDENT]
GO

-----------------------------------------------------------

USE [SchoolSportDb]
GO

CREATE TABLE [dbo].[SCHOOL_SPORT_WEB_VIEWS](
	[VIEW_ID] [int] NOT NULL,
	[VIEW_NAME] [nvarchar](255) NOT NULL,
	[VIEW_CAPTION] [nvarchar](255) NOT NULL,
	[IS_DISABLED] [int] NULL,
 CONSTRAINT [PK_VIEWS] PRIMARY KEY CLUSTERED
(
	[VIEW_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [UN_SCHOOL_SPORT_WEB_VIEWS_NAME] UNIQUE NONCLUSTERED
(
	[VIEW_NAME] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

USE [SchoolSportDb]
GO

CREATE TABLE [dbo].[MATCH_SCORE_OVERRIDE](
	[CHAMPIONSHIP_CATEGORY_ID] [int] NOT NULL,
	[PHASE] [int] NOT NULL,
	[NGROUP] [int] NOT NULL,
	[ROUND] [int] NOT NULL,
	[MATCH] [int] NOT NULL,
	[TEAM_A_SCORE] [real] NOT NULL,
	[TEAM_B_SCORE] [real] NOT NULL,
	[UserSeq] [int] NULL,
	[DateUpdated] [datetime] NULL,
	[CYCLE] [int] NOT NULL,
	[ORIGINAL_SCORE_A] [real] NULL,
	[ORIGINAL_SCORE_B] [real] NULL,
	[Approved] [int] NULL,
	[RESULT] [int] NULL,
	[ORIGINAL_RESULT] [int] NULL,
 CONSTRAINT [PK_MATCH_SCORE_OVERRIDE] PRIMARY KEY CLUSTERED
(
	[CHAMPIONSHIP_CATEGORY_ID] ASC,
	[PHASE] ASC,
	[NGROUP] ASC,
	[ROUND] ASC,
	[CYCLE] ASC,
	[MATCH] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]


-----------------------------------------------------------

CREATE TABLE [dbo].[HiddenPracticeCamps](
	[PRACTICE_CAMP_ID] [int] NOT NULL,
 CONSTRAINT [PK_HiddenPracticeCamps] PRIMARY KEY CLUSTERED
(
	[PRACTICE_CAMP_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[SchoolClubData](
	[SchoolSymbol] [nvarchar](10) NOT NULL,
	[PropertyName] [nvarchar](255) NOT NULL,
	[PropertyValue] [nvarchar](255) NULL,
 CONSTRAINT [PK_SchoolClubData] PRIMARY KEY CLUSTERED
(
	[SchoolSymbol] ASC,
	[PropertyName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[SchoolClubTeamOrders](
	[SchoolSymbol] [nvarchar](10) NOT NULL,
	[CHAMPIONSHIP_CATEGORY_ID] [int] NOT NULL,
	[Amount] [int] NOT NULL,
 CONSTRAINT [PK_SchoolClubTeamOrders] PRIMARY KEY CLUSTERED
(
	[SchoolSymbol] ASC,
	[CHAMPIONSHIP_CATEGORY_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[AuthorizedPages](
	[PageSeq] [int] NOT NULL,
	[PermittedRole] [int] NOT NULL,
 CONSTRAINT [PK_AuthorizedPages] PRIMARY KEY CLUSTERED
(
	[PageSeq] ASC,
	[PermittedRole] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[AuthorizedPages]  WITH CHECK ADD  CONSTRAINT [FK_AuthorizedPages_Page] FOREIGN KEY([PageSeq])
REFERENCES [dbo].[ContentPages] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[AuthorizedPages] CHECK CONSTRAINT [FK_AuthorizedPages_Page]
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[RegionPages](
	[ContentPageSeq] [int] NOT NULL,
	[REGION_ID] [int] NOT NULL,
	[PageIndex] [int] NULL,
 CONSTRAINT [PK_RegionPages] PRIMARY KEY CLUSTERED
(
	[ContentPageSeq] ASC,
	[REGION_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[RegionPages]  WITH CHECK ADD  CONSTRAINT [FK_RegionPages_Page] FOREIGN KEY([ContentPageSeq])
REFERENCES [dbo].[ContentPages] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[RegionPages] CHECK CONSTRAINT [FK_RegionPages_Page]
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[MatchForms](
	[CHAMPIONSHIP_CATEGORY_ID] [int] NOT NULL,
	[match_number] [int] NOT NULL,
	[ContentPath] [nvarchar](255) NULL,
 CONSTRAINT [PK_MatchForms] PRIMARY KEY CLUSTERED
(
	[CHAMPIONSHIP_CATEGORY_ID] ASC,
	[match_number] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[Links](
	[Seq] [int] NOT NULL,
	[Url] [nvarchar](1024) NOT NULL,
	[Description] [nvarchar](1024) NULL,
	[SortIndex] [int] NULL,
 CONSTRAINT [PK_Links] PRIMARY KEY CLUSTERED
(
	[Seq] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

-----------------------------------------------------------

CREATE TABLE [dbo].[ClubFacilityData](
	[REGION_ID] [int] NOT NULL,
	[SportFieldSeq] [int] NOT NULL,
	[WeekDay] [int] NOT NULL,
	[RawData] [nvarchar](512) NULL,
 CONSTRAINT [PK_ClubFacilityData] PRIMARY KEY CLUSTERED
(
	[REGION_ID] ASC,
	[SportFieldSeq] ASC,
	[WeekDay] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[ClubFacilityData]  WITH CHECK ADD  CONSTRAINT [FK_ClubFacilityData_SportField] FOREIGN KEY([SportFieldSeq])
REFERENCES [dbo].[SportFields] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[ClubFacilityData] CHECK CONSTRAINT [FK_ClubFacilityData_SportField]
GO

-----------------------------------------------------------

CREATE TABLE [dbo].[ContentPageChampionships](
	[ContentPageSeq] [int] NOT NULL,
	[ChampionshipCategoryId] [nvarchar](20) NOT NULL,
 CONSTRAINT [PK_ContentPageChampionships] PRIMARY KEY CLUSTERED
(
	[ContentPageSeq] ASC,
	[ChampionshipCategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [dbo].[ContentPageChampionships]  WITH CHECK ADD  CONSTRAINT [FK_ContentPageChampionships_Championships] FOREIGN KEY([ContentPageSeq])
REFERENCES [dbo].[ContentPages] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[ContentPageChampionships] CHECK CONSTRAINT [FK_ContentPageChampionships_Championships]
GO