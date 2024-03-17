var Promise = require('promise');
var logger = require('../logger');
var data = require('./data');
var utils = require('./utils');

function FilterAuthorizedPages(connection, user, pages, seqProp) {
    return new Promise(function (fulfil, reject) {
        if (typeof seqProp == 'undefined')
            seqProp = 'Seq';
        var qs = 'Select PageSeq, PermittedRole ' +
            'From AuthorizedPages';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading authorized pages: ' + (err.message || err));
                reject('קריאת נתונים נכשלה');
            }
            else {
                var roleMapping = {};
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    var pageSeq = row['PageSeq'];
                    var role = row['PermittedRole'];
                    var key = pageSeq.toString();
                    if (!roleMapping[key])
                        roleMapping[key] = [];
                    roleMapping[key].push(role);
                }
                var userRole = (user != null && user && user.role) ? user.role : 0;
                var filteredPages = pages.filter(function(page) {
                    var seq = page[seqProp];
                    var permittedRoles = roleMapping[seq.toString()] || null;
                    return permittedRoles == null || permittedRoles.indexOf(userRole) >= 0;
                });
                fulfil(filteredPages);
            }
        });
    });
}

function ReadContentTags(connection, pageSeq) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select p.PageSeq, p.TagSeq, t.Name ' +
            'From ContentPageTags p Inner Join Tags t On p.TagSeq=t.Seq'
        if (pageSeq > 0)
            qs += ' And p.PageSeq=@page';
        var request = connection.request();
        if (pageSeq > 0)
            request.input('page', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading content tags: ' + (err.message || err));
                reject('קריאת נתונים נכשלה');
            }
            else {
                var tagMapping = {};
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    var pageSeq = row['PageSeq'];
                    var key = pageSeq.toString();
                    if (!tagMapping[key])
                        tagMapping[key] = [];
                    tagMapping[key].push({
                        'Seq': row['TagSeq'],
                        'Name': row['Name']
                    });
                }
                fulfil(tagMapping);
            }
        });
    });
}

function ReadPageChampionships(connection, pageSeq) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select ContentPageSeq, ChampionshipCategoryId ' +
            'From ContentPageChampionships'
        if (pageSeq > 0)
            qs += ' Where ContentPageSeq=@page';
        var request = connection.request();
        if (pageSeq > 0)
            request.input('page', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading page championships: ' + (err.message || err));
                reject('קריאת נתונים נכשלה');
            }
            else {
                var championshipMapping = {};
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    var pageSeq = row['ContentPageSeq'];
                    var champCategoryId = row['ChampionshipCategoryId'];
                    var key = pageSeq.toString();
                    if (!championshipMapping[key])
                        championshipMapping[key] = [];
                    championshipMapping[key].push(champCategoryId);
                }
                fulfil(championshipMapping);
            }
        });
    });
}

function ApplyContactSections(connection, contactSections) {
    return new Promise(function (fulfil, reject) {
        if (contactSections.length > 0) {
            var contactSequences = utils.DistinctArray(contactSections.map(function(x) { return parseInt(x.Data); }));
            var qs = 'Select c.Seq, c.[Name], c.[Role], c.AboutMe, c.[Picture] As PictureSeq, c.[Email], c.HomePage, ' +
                '   c.FacebookUrl, c.TwitterUrl, c.InstagramUrl, c.YouTubeUrl, c.LinkedInUrl, ' +
                '   a.FileName As PictureFileName, a.FileSize As PictureFileSize, a.DateUploaded As PictureDateUploaded ' +
                'From Contacts c Left Join Attachments a On c.[Picture]=a.Seq ' +
                'Where c.Seq In (' + contactSequences.join(', ') + ')';
            var request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading contacts: ' + (err.message || err));
                } else {
                    var contactMapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        var key = row['Seq'].toString();
                        contactMapping[key] = row;
                    }
                    for (var i = 0; i < contactSections.length; i++) {
                        var section = contactSections[i];
                        section.Data = contactMapping[section.Data.toString()] || {};
                        if (section.Data.PictureSeq) {
                            section.Data.Picture = {};
                            data.copyRecord(section.Data, section.Data.Picture, ['Seq', 'FileName', 'FileSize', 'DateUploaded'], 'Picture');
                        }
                    }
                }
                fulfil('OK');
            });
        } else {
            fulfil('OK');
        }
    });
}

function ReadContentPages(connection, loggedUser, pageSeq, pageType, sportFieldSeq, specificPages) {
    function AssignDefaultIndices(pages, pagesPerType, indexProperty, types) {
        if (typeof types == 'undefined' || types == null || types.length == 0)
            types = utils.DistinctArray(pages.map(function(x) { return x.Type; }));
        var matchingPages = [];
        var typeMapping = {};
        for (var i = 0; i < types.length; i++)
            typeMapping[types[i].toString()] = 0;
        for (var i = 0; i < pages.length; i++) {
            if (matchingPages.length >= (types.length * pagesPerType))
                break;
            var curPage = pages[i];
            var canAdd = false;
            for (var j = 0; j < types.length; j++) {
                var curType = types[j];
                if (curPage.Type == curType) {
                    typeMapping[curType.toString()]++;
                    canAdd = (typeMapping[curType.toString()] <= pagesPerType);
                    break;
                }
            }

            if (canAdd)
                matchingPages.push(curPage.Seq);
        }

        for (var i = 0; i < matchingPages.length; i++) {
            var pageSeq = matchingPages[i];
            var matchingPage = pages.filter(function(x) { return x.Seq == pageSeq; })[0];
            matchingPage[indexProperty] = i + 1;
        }
    }

    function HandleAttachments(attachmentRawSequences, attachmentSections) {
        function BuildCustomLink(attachmentRow)  {
            var externalLink = attachmentRow['ExternalLink'];
            var linkedAttachmentName = attachmentRow['LinkedAttachmentName'];
            if (externalLink != null && externalLink.length > 0)
                return {Type: 1, ExternalUrl: externalLink};
            if (linkedAttachmentName != null && linkedAttachmentName.length > 0)
                return {Type: 2, FileName: linkedAttachmentName};
            return null;
        }

        return new Promise(function (fulfil, reject) {
            if (attachmentRawSequences.length > 0) {
                var attachmentSequences = utils.DistinctArray(utils.FlattenArray(attachmentRawSequences));
                var qs = 'Select Seq, [FileName], FileSize, DateUploaded, Description, ExternalLink, LinkedAttachmentName ' +
                    'From Attachments ' +
                    'Where Seq In (' + attachmentSequences.join(', ') + ')';
                var request = connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading attachments: ' + (err.message || err));
                    } else {
                        var attachmentMapping = {};
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var key = row['Seq'].toString();
                            attachmentMapping[key] = row;
                        }
                        for (var i = 0; i < attachmentSections.length; i++) {
                            var section = attachmentSections[i];
                            section.Data = section.Data.split(',').map(function(x) {
                                var curAttachment = attachmentMapping[x];
                                if (curAttachment) {
                                    var attachmentData = {};
                                    data.copyRecord(curAttachment, attachmentData);
                                    attachmentData.CustomLink = BuildCustomLink(attachmentData);
                                    return attachmentData;
                                } else {
                                    return null;
                                }
                            }).filter(function(x) {
                                return x != null;
                            });
                        }
                    }
                    fulfil('OK');
                });
            } else {
                fulfil('OK');
            }
        });
    }

    pageSeq = parseInt(pageSeq);
    if (isNaN(pageSeq))
        pageSeq = 0;
    if (typeof pageType == 'undefined')
        pageType = 0;
    pageType = parseInt(pageType);
    if (isNaN(pageType))
        pageType = 0;
    if (typeof sportFieldSeq == 'undefined')
        sportFieldSeq = 0;
    if (typeof specificPages == 'undefined')
        specificPages = [];
    return new Promise(function (fulfil, reject) {
        var qs = 'Select cp.Seq, cp.[Type], cp.[Description], cp.[Date], cp.SportFieldSeq, cp.DefaultImageSeq,  ' +
            '   pt1.PictureSeq As SliderThumbnailSeq, pt2.PictureSeq As HomepageThumbnailSeq, ' +
            '   apt1.FileName As SliderThumbnailImage, apt2.FileName As HomepageThumbnailImage, ' +
            '   IsNull(cp.[Index], 0) As PageIndex, cp.IsHidden, cp.SubCaption, cp.AuthorSeq, cp.ShowAuthorDetails, ' +
            '   cp.[Time], cp.FacilityName, cp.ActivityDuration, ' +
            '   au.[Name] As AuthorName, au.AboutMe As AuthorAboutMe, aa.FileName As AuthorPictureName, au.Email As AuthorEmail, ' +
            '   au.HomePage As AuthorHomePage, au.FacebookUrl As AuthorFacebookUrl, au.TwitterUrl As AuthorTwitterUrl, ' +
            '   au.InstagramUrl As AuthorInstagramUrl, au.YouTubeUrl As AuthorYouTubeUrl, au.LinkedInUrl As AuthorLinkedInUrl, ' +
            '   IsNull(cs.[Type], 0) As SectionType, cs.[Data], IsNull(cs.SectionIndex, 0) As [Index], ' +
            '   cp.CreatorSeq, u.DisplayName As CreatorDisplayName, sf.[Name] As SportFieldName, ' +
            '   a.FileName As DefaultImageName, a.Description As DefaultImageDescription, IsNull(fp.[Index], 0) As FeaturedIndex ' +
            'From ContentPages cp Left Join ContentSections cs On cs.PageSeq=cp.Seq ' +
            '   Left Join Users u  On cp.CreatorSeq=u.Seq ' +
            '   Left Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
            '   Left Join Attachments a On cp.DefaultImageSeq=a.Seq '+
            '   Left Join FeaturedPages fp On cp.Seq=fp.PageSeq' +
            '   Left Join Contacts au On cp.AuthorSeq=au.Seq And au.ContactType=1 ' +
            '   Left Join Attachments aa On au.[Picture]=aa.Seq ' +
            '   Left Join PageThumbnails pt1 On pt1.PageSeq=cp.Seq And pt1.ThumbnailType=1 ' +
            '   Left Join PageThumbnails pt2 On pt2.PageSeq=cp.Seq And pt2.ThumbnailType=2 ' +
            '   Left Join Attachments apt1 On pt1.PictureSeq=apt1.Seq ' +
            '   Left Join Attachments apt2 On pt2.PictureSeq=apt2.Seq ';
        var filters = [];
        if (specificPages != null && specificPages.length > 0) {
            qs += ' Where cp.Seq In (' + specificPages.join(', ') + ')';
        } else {
            if (pageSeq > 0)
                filters.push({'Field': 'cp.Seq', 'Key': '@seq', 'Value': pageSeq});
            if (pageType > 0)
                filters.push({'Field': 'cp.[Type]', 'Key': '@type', 'Value': pageType});
            if (sportFieldSeq > 0)
                filters.push({'Field': 'cp.SportFieldSeq', 'Key': '@sport', 'Value': sportFieldSeq});
        }
        if (filters.length > 0) {
            qs += ' Where ' + filters.map(function (x) {
                return x.Field + '=' + x.Key;
            }).join(' And ');
        }
        qs += ' Order By cp.[Date] Desc';
        var request = connection.request();
        for (var i = 0; i < filters.length; i++) {
            var curFilter = filters[i];
            request.input(curFilter.Key.replace('@', ''), curFilter.Value);
        }
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading content page' + ((pageSeq > 0) ? ' ' + pageSeq : 's') + ': ' + (err.message || err));
                reject('קריאת נתונים נכשלה');
            }
            else {
                var pages = [];
                if (recordset.length > 0) {
                    var allRecords = recordset.slice(0);
                    FilterAuthorizedPages(connection, loggedUser, allRecords).then(function(authorizedRecords) {
                        var attachmentSections = [];
                        var contactSections = [];
                        ReadContentTags(connection, pageSeq).then(function(tagMapping) {
                            ReadPageChampionships(connection, pageSeq).then(function(championshipMapping) {
                                var pageMapping = {};
                                var attachmentRawSequences = [];
                                for (var i = 0; i < authorizedRecords.length; i++) {
                                    var row = authorizedRecords[i];
                                    var pageSeq = row['Seq'];
                                    var key = pageSeq.toString();
                                    var page = pageMapping[key];
                                    if (!page) {
                                        page = {};
                                        data.copyRecord(row, page, ['Seq', 'Type', 'Description', 'Date', 'SportFieldSeq', 'SportFieldName',
                                            'DefaultImageSeq', 'CreatorSeq', 'CreatorDisplayName', 'FeaturedIndex', 'PageIndex', 'IsHidden',
                                            'SubCaption', 'AuthorSeq', 'AuthorName', 'ShowAuthorDetails',
                                            'SliderThumbnailSeq', 'HomepageThumbnailSeq', 'SliderThumbnailImage', 'HomepageThumbnailImage',
                                            'Time', 'FacilityName', 'ActivityDuration']);
                                        page.Tags = tagMapping[page.Seq.toString()] || [];
                                        page.ChampionshipCategoryIds = championshipMapping[page.Seq.toString()] || [];
                                        page.Sections = [];
                                        if (row.DefaultImageSeq) {
                                            page.DefaultImage = {};
                                            data.copyRecord(row, page.DefaultImage, ['Seq', 'Name', 'Description'], 'DefaultImage');
                                        }
                                        if (row.AuthorSeq) {
                                            page.Author = {};
                                            data.copyRecord(row, page.Author, ['Seq', 'Name', 'AboutMe', 'PictureName', 'Email', 'HomePage',
                                                'FacebookUrl', 'TwitterUrl', 'InstagramUrl', 'YouTubeUrl', 'LinkedInUrl'], 'Author');
                                        }
                                        pages.push(page);
                                        pageMapping[key] = page;
                                    }
                                    var section = {};
                                    data.copyRecord(row, section, ['SectionType', 'Data', 'Index']);
                                    //logger.log('verbose', 'page ' + page.Seq + ', section ' + section.Index);
                                    section.Type = section.SectionType;
                                    page.Sections.push(section);
                                    if (section.Data) {
                                        switch (section.Type)
                                        {
                                            case 1:
                                            case 5:
                                                //images or files
                                                attachmentRawSequences.push(section.Data.split(','));
                                                attachmentSections.push(section);
                                                break;
                                            case 6:
                                                //contact
                                                var contactSeq = parseInt(section.Data);
                                                if (!isNaN(contactSeq) && contactSeq > 0)
                                                    contactSections.push(section);
                                                break;
                                        }
                                    }
                                }
                                for (var i = 0; i < pages.length; i++) {
                                    pages[i].Sections.sort(function(s1, s2) {
                                        return s2.Index > s1.Index;
                                    });
                                }

                                //default featured pages?
                                if (pages.length > 0 && pages.filter(function(x) { return x.FeaturedIndex > 0; }).length == 0)
                                    AssignDefaultIndices(pages, 2, 'FeaturedIndex');

                                //default recent pages?
                                if (pages.length > 0) {
                                    for (var i = 0; i < 3; i++) {
                                        var curType = i + 1;
                                        if (pages.filter(function (x) { return x.Type == curType && x.PageIndex > 0; }).length == 0)
                                            AssignDefaultIndices(pages, 6, 'PageIndex', [curType]);
                                    }
                                }

                                //handle images, files, and contacts
                                HandleAttachments(attachmentRawSequences, attachmentSections).then(function() {
                                    ApplyContactSections(connection, contactSections).then(function() {
                                        fulfil(pages);
                                    });
                                });
                            }, function(err) {
                                reject(err);
                            });
                        }, function(err) {
                            reject(err);
                        });
                    }, function(err) {
                        reject(err);
                    });
                } else {
                    fulfil(pages);
                }
            }
        });
    });
}
module.exports.read = ReadContentPages;
module.exports.tags = ReadContentTags;
module.exports.championships = ReadPageChampionships;
module.exports.applyContacts = ApplyContactSections;
module.exports.FilterAuthorizedPages = FilterAuthorizedPages;

