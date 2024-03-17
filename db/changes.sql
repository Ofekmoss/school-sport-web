Alter Table ContentPages
Add ImportedArticleId int null
GO

--------------------------------

Alter Table ContentPages
Add [Index] [int] NULL
GO

--------------------------------

Alter Table ContentPages
Add [SubCaption] nvarchar(1024)
GO

Alter Table ContentPages
Add [AuthorSeq] [int] NULL
GO

ALTER TABLE [dbo].[ContentPages]  WITH CHECK ADD  CONSTRAINT [FK_ContentPages_Author] FOREIGN KEY([AuthorSeq])
REFERENCES [dbo].[Authors] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

--------------------------------

Alter Table ContentPages
Add [ShowAuthorDetails] [int] NULL
GO

--------------------------------

Alter Table Authors
Add [AboutMe] [nvarchar](max) NULL,
	[Picture] [int] NULL,
	[Email] [nvarchar](255) NULL,
	[HomePage] [nvarchar](255) NULL,
	[FacebookUrl] [nvarchar](255) NULL,
	[TwitterUrl] [nvarchar](255) NULL,
	[InstagramUrl] [nvarchar](255) NULL,
	[YouTubeUrl] [nvarchar](255) NULL,
	[LinkedInUrl] [nvarchar](255) NULL
GO

ALTER TABLE [dbo].[Authors]  WITH CHECK ADD  CONSTRAINT [FK_Authors_Picture] FOREIGN KEY([Picture])
REFERENCES [dbo].[Attachments] ([Seq])
ON UPDATE CASCADE
ON DELETE CASCADE
GO

--------------------------------

Alter Table ContentPages
Add [ChampionshipCategoryId] [int] NULL
GO

--------------------------------

Alter Table ContentPages
Add IsHidden int Null
GO

--------------------------------

Alter Table SportFields
Add ShortName nvarchar(100)
GO

--------------------------------

Alter Table Attachments
Add [ExternalLink] [nvarchar](512) NULL
GO

Alter Table Attachments
Add [LinkedAttachmentName] [nvarchar](256) NULL
GO

--------------------------------

Alter Table ContentPages
Add [Time] [datetime] NULL
GO

Alter Table ContentPages
Add [FacilityName] [nvarchar](255) NULL
GO

Alter Table ContentPages
Add [ActivityDuration] [nvarchar](50) NULL
GO

--------------------------------

Alter Table ContentPages
Alter Column ChampionshipCategoryId nvarchar(20) Null
GO