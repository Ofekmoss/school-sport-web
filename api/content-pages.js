var Promise = require('promise');
var express = require('express');
var fs = require('fs');
var path = require('path');
var logger = require('../logger');
var data = require('./data');
var utils = require('./utils');
var settings = require('../settings');
var pagesData = require('./pages-data');
var sportsman = require('./sportsman');
var router = express.Router();

function ApplyPageTags(transaction, pageSeq, tags) {
    return new Promise(function (fulfil, reject) {
        function applyCurrentTag(index) {
            function InsertSingleTag(tagData) {
                var qs = 'Insert Into ContentPageTags (PageSeq, TagSeq) Values (@page, @tag)';
                var request = transaction.request();
                request.input('page', pageSeq);
                request.input('tag', tagData.Seq);
                request.query(qs, function (err, recordset) {
                    if (err)
                        logger.log('error', 'Error inserting tag ' + tagData.Seq + ' to page ' + pageSeq + ': ' + (err.message || err));
                    applyCurrentTag(index + 1);
                });
            }

            if (typeof tags == 'undefined' || !tags || index >= tags.length) {
                fulfil('OK');
            } else {
                var curTag = tags[index];
                if (curTag.Seq < 0) {
                    data.insertEntity(transaction, 'Tags', ['Name', 'Type'], {'Name': curTag.Name, 'Type': 1}).
                        then(function (seq) {
                            curTag.Seq = seq;
                            InsertSingleTag(curTag);
                        }, function(err) {
                            logger.log('error', 'Error inserting new tag: ' + (err.message || err));
                            applyCurrentTag(index + 1);
                        });
                } else {
                    InsertSingleTag(curTag);
                }
            }
        }

        var qs = 'Delete From ContentPageTags Where PageSeq=@page';
        var request = transaction.request();
        request.input('page', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error deleting existing tags for page ' + pageSeq + ': ' + (err.message || err));
                reject('מחיקת תגיות  קיימות נכשלה');
            }
            else {
                applyCurrentTag(0);
            }
        });
    });
}

function ApplyPageChampionships(transaction, pageSeq, champCategories) {
    return new Promise(function (fulfil, reject) {
        function applyCurrentChampionship(index) {
            function InsertSingleChampionship(categoryId) {
                var qs = 'Insert Into ContentPageChampionships (ContentPageSeq, ChampionshipCategoryId) Values (@page, @category)';
                var request = transaction.request();
                request.input('page', pageSeq);
                request.input('category', categoryId);
                request.query(qs, function (err, recordset) {
                    if (err)
                        logger.log('error', 'Error inserting championship category ' + categoryId + ' to page ' + pageSeq + ': ' + (err.message || err));
                    applyCurrentChampionship(index + 1);
                });
            }

            if (index >= champCategories.length) {
                fulfil('OK');
            } else {
                var curCategoryId = champCategories[index];
                InsertSingleChampionship(curCategoryId);
            }
        }

        var qs = 'Delete From ContentPageChampionships Where ContentPageSeq=@page';
        var request = transaction.request();
        request.input('page', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error deleting existing championships for page ' + pageSeq + ': ' + (err.message || err));
                reject('מחיקת תגיות  קיימות נכשלה');
            }
            else {
                applyCurrentChampionship(0);
            }
        });
    });
}

function ApplyPageSections(transaction, pageSeq, sections) {
    return new Promise(function (fulfil, reject) {
        function ApplyAttachments(attachmentType, index, attachments, callback) {
            if (attachmentType == 0 || !attachments || index >= attachments.length) {
                callback(attachments);
            } else {
                var curAttachment = attachments[index];
                var attachmentData = {
                    AttachmentType: attachmentType,
                    FileName: curAttachment.Name,
                    FileSize: curAttachment.Size,
                    DateUploaded: curAttachment.DateUploaded
                };
                data.insertEntity(transaction, 'Attachments', ['AttachmentType', 'FileName', 'FileSize', 'DateUploaded'], attachmentData).
                    then(function (seq) {
                        curAttachment.Seq = seq;
                        ApplyAttachments(attachmentType, index + 1, attachments, callback);
                    }, function (err) {
                        transaction.rollback();
                        logger.log('error', 'Error inserting new attachment: %s', err.message);
                        reject('error inserting attachments');
                    });
            }
        }

        function ApplyContact(sectionData, callback) {
            if (sectionData.Type == 6) {
                var contactName = ((sectionData.Data || {}).Name || '').trim();
                if (contactName.length == 0) {
                    callback(0);
                } else {
                    var contactData = sectionData.Data;
                    if (contactData.Seq) {
                        data.updateEntity(transaction, 'Contacts', ['Name', 'Role', 'AboutMe', 'Picture', 'Email', 'HomePage',
                            'FacebookUrl', 'TwitterUrl', 'InstagramUrl', 'YouTubeUrl', 'LinkedInUrl'], contactData).then(function () {
                            callback(contactData.Seq);
                        }, function (err) {
                            transaction.rollback();
                            logger.log('error', 'Error updating contact: %s', err.message);
                            reject('error updating contact');
                        });
                    } else {
                        contactData.ContactType = 2;
                        data.insertEntity(transaction, 'Contacts', ['ContactType', 'Name', 'Role', 'AboutMe', 'Picture', 'Email', 'HomePage',
                            'FacebookUrl', 'TwitterUrl', 'InstagramUrl', 'YouTubeUrl', 'LinkedInUrl'], contactData).then(function (seq) {
                            callback(seq);
                        }, function (err) {
                            transaction.rollback();
                            logger.log('error', 'Error inserting new contact: %s', err.message);
                            reject('error inserting contact');
                        });
                    }
                }
            } else {
                callback(0);
            }
        }

        function ParseSectionData(sectionData, newAttachments) {
            var parsedData = sectionData.Data || '';
            if ((sectionData.Type == 1 || sectionData.Type == 5) && newAttachments.length > 0) {
                //images or files
                var attachmentSequences = parsedData.split(',').filter(function (x) {
                    return x && x.length > 0;
                });
                for (var i = 0; i < newAttachments.length; i++)
                    attachmentSequences.push(newAttachments[i].Seq);
                parsedData = attachmentSequences.join(',');
            }
            return parsedData;
        }

        function ApplyAttachmentsData(index, attachmentDataRows, callback) {
            if (typeof attachmentDataRows == 'undefined' || !attachmentDataRows || index >= attachmentDataRows.length) {
                callback();
            } else {
                var curAttachmentData = attachmentDataRows[index];
                curAttachmentData.ExternalLink = null;
                curAttachmentData.LinkedAttachmentName = null;
                if (curAttachmentData.CustomLink != null) {
                    switch (curAttachmentData.CustomLink.Type) {
                        case 1:
                            curAttachmentData.ExternalLink = curAttachmentData.CustomLink.ExternalUrl;
                            break;
                        case 2:
                            curAttachmentData.LinkedAttachmentName = curAttachmentData.CustomLink.FileName;
                            break;
                    }
                }
                data.updateEntity(transaction, 'Attachments', ['Description', 'ExternalLink', 'LinkedAttachmentName'], curAttachmentData).
                    then(function () {
                        ApplyAttachmentsData(index + 1, attachmentDataRows, callback);
                    }, function (err) {
                        transaction.rollback();
                        logger.log('error', 'Error updating attachment %d data: %s', curAttachmentData.Seq, err.message);
                        reject('error updating attachments');
                    })
            }
        }

        function applyCurrentSection(index) {
            function InsertSingleSection(sectionData) {
                function PerformInsert(newAttachments) {
                    if (typeof newAttachments == 'undefined')
                        newAttachments = [];
                    ApplyAttachmentsData(0, sectionData.AttachmentsData, function() {
                        if (typeof sectionData.Index == 'undefined' || sectionData.Index == null || sectionData.Index < 0)
                            sectionData.Index = index;
                        var fieldNames = ['PageSeq', '[Type]', '[Data]', '[SectionIndex]'];
                        var fieldValues = ['@page', '@type', '@data', '@index'];
                        var qs = 'Insert Into ContentSections (' + fieldNames.join(', ') + ') Values (' + fieldValues.join(', ') + ')';
                        var request = transaction.request();
                        request.input('page', pageSeq);
                        request.input('Type', sectionData.Type);
                        request.input('data', ParseSectionData(sectionData, newAttachments));
                        request.input('index', sectionData.Index);
                        request.query(qs, function (err, recordset) {
                            if (err)
                                logger.log('error', 'Error inserting section type ' + sectionData.Type + ' to page ' + pageSeq + ': ' + (err.message || err));
                            applyCurrentSection(index + 1);
                        });
                    });
                }

                var attachmentType = 0;
                switch (sectionData.Type) {
                    case 1:
                        attachmentType = 1;
                        break;
                    case 5:
                        attachmentType = 2;
                        break;
                }
                ApplyAttachments(attachmentType, 0, sectionData.NewAttachments, function(newAttachments) {
                    var contactPictures = [];
                    if (sectionData.NewContactPicture)
                        contactPictures.push(sectionData.NewContactPicture);
                    ApplyAttachments(3, 0, contactPictures, function(newContactPictures) {
                        if (newContactPictures && newContactPictures.length > 0) {
                            var newContactPicture = newContactPictures[0];
                            sectionData.NewContactPicture.Seq = newContactPicture.Seq;
                            sectionData.Data.Picture = newContactPicture.Seq;
                        } else {
                            if (sectionData.Data.Picture) {
                                sectionData.Data.Picture = sectionData.Data.Picture.Seq;
                            }
                        }
                        ApplyContact(sectionData, function(contactSeq) {
                            if (contactSeq)
                                sectionData.Data = contactSeq.toString();
                            PerformInsert(newAttachments);
                        });
                    });
                });
            }

            if (index >= sections.length) {
                fulfil('OK');
            } else {
                var curSection = sections[index];
                InsertSingleSection(curSection);
            }
        }

        var qs = 'Delete From ContentSections Where PageSeq=@page';
        var request = transaction.request();
        request.input('page', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error deleting existing sections for page ' + pageSeq + ': ' + (err.message || err));
                reject('Error deleting sections');
            }
            else {
                applyCurrentSection(0);
            }
        });
    });
}

function ApplyTagsAndSections(transaction, pageData) {
    return new Promise(function (fulfil, reject) {
        ApplyPageTags(transaction, pageData.Seq, pageData.Tags || []).then(function () {
            ApplyPageSections(transaction, pageData.Seq, pageData.Sections || []).then(function () {
                fulfil(pageData);
            }, function (err) {
                transaction.rollback();
                reject('Error applying sections: ' + (err.message || err));
            });
        }, function (err) {
            transaction.rollback();
            reject('Error applying tags: ' + (err.message || err));
        });
    });
}

function ApplyPageAuthor(transaction, pageData) {
    return new Promise(function (fulfil, reject) {
        if ((pageData.AuthorSeq == null || !pageData.AuthorSeq || pageData.AuthorSeq == 0) && pageData.AuthorName) {
            data.insertEntity(transaction, 'Contacts', ['Name', 'ContactType'], {'Name': pageData.AuthorName, 'ContactType': 1}).
                then(function (seq) {
                    pageData.AuthorSeq = seq;
                    data.updateEntity(transaction, 'ContentPages', ['AuthorSeq'], pageData).
                        then(function () {
                            fulfil('SUCCESS');
                        }, function (err) {
                            transaction.rollback();
                            logger.log('error', 'Error updating page ' + pageData.Seq + ' author: ' + (err.message || err));
                            reject('error updating author');
                        });
                }, function(err) {
                    transaction.rollback();
                    logger.log('error', 'Error inserting new author: ' + (err.message || err));
                    reject('error inserting author');
                });
        } else {
            fulfil('OK');
        }
    });
}

function SetPageVisibility(user, connection, pageData) {
    return new Promise(function (fulfil, reject) {
        if (!utils.VerifyUser(user, [1, 3])) {
            reject(401);
        } else {
            var fields = ['IsHidden'];
            data.updateEntity(connection, 'ContentPages', fields, pageData).then(function () {
                fulfil(200);
            }, function(err) {
                logger.log('error', 'Error setting page visibility: ' + (err.message || err));
                reject(500);
            });
        }
    });
}

router.get('/region-pages', function (req, res) {
    var qs = 'Select ContentPageSeq, REGION_ID, IsNull(PageIndex, 99999) As PageIndex ' +
        'From RegionPages';
    var request = req.connection.request();
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error getting all region pages: ' + (err.message || err));
            res.sendStatus(500);
        } else {
            res.send(recordset);
        }
    });
});

router.put('/region-page', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var pageSeq = req.body.PageSeq;
    var region = req.body.Region;
    var qs = 'Select Max(IsNull(PageIndex, 0)) As MaxIndex ' +
        'From RegionPages ' +
        'Where REGION_ID=@region';
    var request = req.connection.request();
    request.input('region', region);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error getting maximum index for page ' + pageSeq + ', region ' + region + ': ' + (err.message || err));
            res.sendStatus(500);
        } else {
            var maxIndex = (recordset && recordset.length > 0) ? parseInt(recordset[0]['MaxIndex']) : 0;
            if (isNaN(maxIndex))
                maxIndex = 0;
            var pageIndex = maxIndex + 1;
            qs = 'Insert Into RegionPages (ContentPageSeq, REGION_ID, PageIndex) ' +
                'Values (@seq, @region, @index)';
            request = req.connection.request();
            request.input('seq', pageSeq);
            request.input('region', region);
            request.input('index', pageIndex);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error inserting region page: ' + (err.message || err));
                    res.sendStatus(500);
                } else {
                    res.send({
                        Index: pageIndex
                    });
                }
            });
        }
    });
});

router.post('/region-page', function (req, res) {
    function FindOriginalIndex(connection, pageSeq, region) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select PageIndex From RegionPages ' +
                'Where ContentPageSeq=@seq And REGION_ID=@region';
            var request = connection.request();
            request.input('seq', pageSeq);
            request.input('region', region);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error getting original index: ' + (err.message || err));
                    reject('ERROR');
                } else {
                    var pageIndex = (recordset && recordset.length > 0) ? recordset[0]['PageIndex'] || 0 : 0;
                    fulfil(pageIndex);
                }
            });
        });
    }

    function GetPageWithExistingIndex(connection, pageIndex, region) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select ContentPageSeq From RegionPages ' +
                'Where PageIndex=@index And REGION_ID=@region';
            var request = connection.request();
            request.input('region', region);
            request.input('index', pageIndex);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error getting existing page index: ' + (err.message || err));
                    reject('ERROR');
                } else {
                    var pageSeq = (recordset && recordset.length > 0) ? recordset[0]['ContentPageSeq'] || 0 : 0;
                    fulfil(pageSeq);
                }
            });
        });
    }

    function UpdateConflictingPage(connection, pageSeq, pageIndex, region) {
        return new Promise(function (fulfil, reject) {
            if (pageSeq > 0 && pageIndex > 0) {
                var qs = 'Update RegionPages ' +
                    'Set PageIndex=@index ' +
                    'Where ContentPageSeq=@seq And REGION_ID=@region';
                var request = connection.request();
                request.input('seq', pageSeq);
                request.input('region', region);
                request.input('index', pageIndex);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error updating conflicting page index: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        fulfil('OK');
                    }
                });
            } else {
                fulfil('nothing to update');
            }
        });
    }

    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var pageSeq = req.body.PageSeq;
    var region = req.body.Region;
    var pageIndex = req.body.PageIndex;
    FindOriginalIndex(req.connection, pageSeq, region).then(function(originalIndex) {
        GetPageWithExistingIndex(req.connection, pageIndex, region).then(function(pageToUpdate) {
            UpdateConflictingPage(req.connection, pageToUpdate, originalIndex, region).then(function() {
                var qs = 'Update RegionPages ' +
                    'Set PageIndex=@index ' +
                    'Where ContentPageSeq=@seq And REGION_ID=@region';
                var request = req.connection.request();
                request.input('seq', pageSeq);
                request.input('region', region);
                request.input('index', pageIndex);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error updating region page: ' + (err.message || err));
                        res.sendStatus(500);
                    } else {
                        res.send({
                            OriginalIndex: originalIndex,
                            PageWithOriginalIndex: pageToUpdate
                        });
                    }
                });
            }, function(err) {
                res.sendStatus(500);
            });
        }, function(err) {
            res.sendStatus(500);
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.delete('/region-page', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        res.sendStatus(401);
        return;
    }

    var pageSeq = req.query.page;
    var region = req.query.region;
    var qs = 'Delete From RegionPages ' +
        'Where ContentPageSeq=@seq And REGION_ID=@region';
    var request = req.connection.request();
    request.input('seq', pageSeq);
    request.input('region', region);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error deleting region page: ' + (err.message || err));
            res.sendStatus(500);
        } else {
            res.send('OK');
        }
    });
});

router.get('/', function (req, res) {
    function GetRegionPages(connection, region) {
        return new Promise(function (fulfil, reject) {
            if (region < 0) {
                fulfil(null);
            } else {
                var qs = 'Select ContentPageSeq, IsNull(PageIndex, 99999) As PageIndex ' +
                    'From RegionPages ' +
                    'Where REGION_ID=@region';
                var request = connection.request();
                request.input('region', region);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error getting region ' + region + ' pages: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        var regionPages = [];
                        for (var i = 0; i < recordset.length; i++) {
                            var regionPage = {};
                            data.copyRecord(recordset[i], regionPage);
                            regionPages.push(regionPage);
                        }
                        fulfil(regionPages);
                    }
                });
                /*
                var qs = "Select Seq, ChampionshipCategoryId " +
                    "From ContentPages " +
                    "Where ChampionshipCategoryId Is Not Null And SubString(ChampionshipCategoryId, 1, 2)<>'sf'";
                var request = connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error getting pages attached to championship: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        if (recordset.length == 0) {
                            fulfil(null);
                        } else {
                            var allPages = [];
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                var curPage = {};
                                data.copyRecord(row, curPage);
                                allPages.push(curPage);
                            }
                            var allCategories = utils.DistinctArray(allPages.map(function(x) {
                                return x.ChampionshipCategoryId;
                            }));
                            sportsman.CreateConnection().then(function (sportsmanConnection) {
                                qs = 'Select cc.CHAMPIONSHIP_CATEGORY_ID ' +
                                    'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID ' +
                                    'Where c.REGION_ID=@region And cc.CHAMPIONSHIP_CATEGORY_ID In (' + allCategories.join(', ') + ') ' +
                                    '   And cc.DATE_DELETED Is Null And c.DATE_DELETED Is Null';
                                var request = sportsmanConnection.request();
                                request.input('region', region);
                                request.query(qs, function (err, recordset) {
                                    if (err) {
                                        logger.error('Error getting categories for region ' + region + ': ' + (err.message || err));
                                        reject('ERROR');
                                    } else {
                                        var existingCategories = {};
                                        for (var i = 0; i < recordset.length; i++) {
                                            var row = recordset[i];
                                            var categoryId = row['CHAMPIONSHIP_CATEGORY_ID'];
                                            existingCategories[categoryId.toString()] = true;
                                        }
                                        var matchingPages = allPages.filter(function(x) {
                                            return (existingCategories[x.ChampionshipCategoryId.toString()] == true);
                                        });
                                        fulfil(matchingPages.map(function(x) {
                                            return x.Seq;
                                        }));
                                    }
                                });
                            }, function(err) {
                                logger.error('Error creating sportsman connection to read region articles: ' + (err.message || err));
                                reject('ERROR');
                            });
                        }
                    }
                });
                */
            }
        });
    }

    var pageType = utils.GetSafeNumber(req.query.type);
    var recent = utils.GetSafeNumber(req.query.recent);
    var sportField = utils.GetSafeNumber(req.query.sport);
    var region = utils.GetSafeNumber(req.query.region, -1);
    GetRegionPages(req.connection, region).then(function(regionPages) {
        if (region >= 0 && (regionPages == null || regionPages.length == 0)) {
            res.send([]);
        } else {
            var specificPages = regionPages == null ? [] : regionPages.map(function (x) {
                return x.ContentPageSeq;
            });
            pagesData.read(req.connection, req.session.user, 0, pageType, sportField, specificPages).then(function (pages) {
                if (regionPages != null && regionPages.length > 0) {
                    var indexMapping = {};
                    regionPages.forEach(function(x) {
                        indexMapping[x.ContentPageSeq.toString()] = x.PageIndex;
                    });
                    pages.forEach(function(page) {
                        page.RegionIndex = indexMapping[page.Seq.toString()];
                    });
                }
                if (recent > 0) {
                    var recentPages = [];
                    var pageTypes = (pageType > 0) ? [pageType] : utils.DistinctArray(pages.map(function (x) {
                        return x.Type;
                    }));
                    for (var i = 0; i < pageTypes.length; i++) {
                        var matchingPages = pages.filter(function (x) {
                            return x.Type == pageTypes[i];
                        });
                        for (var j = 0; j < recent; j++) {
                            if (j >= matchingPages.length)
                                break;
                            recentPages.push(matchingPages[j]);
                        }
                    }
                    res.send(recentPages);
                    return;
                }
                res.send(pages);
            }, function (err) {
                res.status(400).send(err);
            });
        }
    }, function(err) {
        res.status(400).send(err);
    });
});

router.get('/:page', function (req, res) {
    pagesData.read(req.connection, req.session.user, req.params.page).then(function(pages) {
        var page = (pages && pages.length > 0) ? pages[0] : {};
        res.send(page);
    }, function(err) {
        res.status(400).send(err);
    });
});

router.get('/championship/:category', function (req, res) {
    var categoryId = req.params.category;
    var qs = 'Select cp.Seq, cp.[Type], cp.DefaultImageSeq, cp.SportFieldSeq, cp.[Date], cp.[Description], cp.[SubCaption], ' +
        '   sf.[Name] As SportFieldName, a.FileName As DefaultImageName, a.Description As DefaultImageDescription ' +
        'From ContentPages cp Inner Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
        '   Left Join Attachments a On cp.DefaultImageSeq=a.Seq ' +
        '   Left Join ContentPageChampionships cpc On cp.Seq=cpc.ContentPageSeq ' +
        'Where cpc.ChampionshipCategoryId=@category';
    var request = req.connection.request();
    request.input('category', categoryId);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading championship category pages: ' + (err.message || err));
            res.status(400).send('קריאת נתונים נכשלה');
        }
        else {
            var pages = [];
            for (var i = 0; i < recordset.length; i++) {
                var row = recordset[i];
                var page = {};
                data.copyRecord(row, page, ['Seq', 'Type', 'SportFieldSeq', 'Date', 'Description', 'SubCaption', 'SportFieldName']);
                if (row.DefaultImageSeq) {
                    page.DefaultImage = {};
                    data.copyRecord(row, page.DefaultImage, ['Seq', 'Name', 'Description'], 'DefaultImage');
                }
                pages.push(page);
            }
            res.send(pages);
        }
    });
});


router.delete('/:page', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    var pageSeq = req.params.page;
    if (pageSeq == 'recent') {
        pageSeq = req.query.page || 0;
        if (!pageSeq) {
            res.status(400).send('invalid page seq');
        } else {
            var qs = 'Update ContentPages Set [Index]=Null Where Seq=@page';
            var request = req.connection.request();
            request.input('page', pageSeq);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error removing page ' + pageSeq + ' from recent pages list: ' + (err.message || err));
                    res.status(500).send('ERROR');
                }
                else {
                    res.status(200).send('OK');
                }
            });
        }
        return;
    }
    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        var qs = 'Delete From ContentPageTags Where PageSeq=@seq';
        var request = transaction.request();
        request.input('seq', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error deleting from ContentPageTags, page ' + pageSeq + ': ' + (err.message || err));
                transaction.rollback();
                res.status(500).send('ERROR');
            }
            else {
                qs = 'Delete From ContentSections Where PageSeq=@seq';
                request = transaction.request();
                request.input('seq', pageSeq);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error deleting from ContentSections, page ' + pageSeq + ': ' + (err.message || err));
                        transaction.rollback();
                        res.status(500).send('ERROR');
                    }
                    else {
                        qs = 'Delete From ContentPages Where Seq=@seq';
                        request = transaction.request();
                        request.input('seq', pageSeq);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error deleting from ContentPages, page ' + pageSeq + ': ' + (err.message || err));
                                transaction.rollback();
                                res.status(500).send('ERROR');
                            }
                            else {
                                transaction.commit(function (err, recordset) {
                                    logger.log('info', 'Page %d deleted', pageSeq);
                                    res.status(200).send('OK');
                                });
                            }
                        });
                    }
                });
            }
        });
    });
});

router.post('/', function (req, res) {
    function CopyAttachments(pageData) {
        if (pageData.Sections && pageData.Sections.length > 0) {
            var directoryNameMapping = {
                '1': 'Images',
                '5': 'Files',
                '6': 'Contacts'
            };
            for (var i = 0; i < pageData.Sections.length; i++) {
                var section = pageData.Sections[i];
                if ([1, 5, 6].indexOf(section.Type) >= 0) {
                    var attachments = [];
                    switch (section.Type) {
                        case 1:
                        case 5:
                            attachments = section.NewAttachments;
                            break;
                        case 6:
                            attachments = [section.NewContactPicture];
                            break;
                    }
                    if (attachments && attachments.length > 0) {
                        var dirName = directoryNameMapping[section.Type.toString()];
                        var sourceDir = path.join(settings.contentRoot, '/' + dirName + '/new');;
                        var targetDir = path.join(settings.contentRoot, '/' + dirName + '/' + pageData.Seq);
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir);
                        }
                        for (var j = 0; j < attachments.length; j++) {
                            var curAttachment = attachments[j];
                            var curFileName = curAttachment.Name;
                            var sourcePath = sourceDir + '\\' + curFileName;
                            var targetPath = targetDir + '\\' + curFileName;
                            fs.createReadStream(sourcePath).pipe(fs.createWriteStream(targetPath));
                        }
                    }
                }
            }
        }
    }

    function UpdateDefaultImage(transaction, pageSeq, defaultImageSeq) {
        return new Promise(function (fulfil, reject) {
            if (defaultImageSeq > 0) {
                var qs = 'Update ContentPages Set DefaultImageSeq=@image Where Seq=@page'
                var request = transaction.request();
                request.input('image', defaultImageSeq);
                request.input('page', pageSeq);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        transaction.rollback();
                        reject('Error updating default image: ' + (err.message || err));
                    }
                    else {
                        fulfil('OK');
                    }
                });
            } else {
                fulfil('OK');
            }
        });
    }

    function GetDefaultImage(pageData) {
        var defaultImageSeq = 0;
        if (pageData.Sections) {
            for (var i = 0; i < pageData.Sections.length; i++) {
                var curSection = pageData.Sections[i];
                if (curSection.Type == 1 && curSection.NewAttachments && curSection.NewAttachments.length > 0) {
                    defaultImageSeq = curSection.NewAttachments[0].Seq;
                    break;
                }
            }
        }
        return defaultImageSeq;
    }

    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        var fields = ['Type', 'Description', 'Date', 'SportFieldSeq', 'CreatorSeq', 'SubCaption', 'AuthorSeq',
            'ShowAuthorDetails', 'Time', 'FacilityName', 'ActivityDuration'];
        if (req.body.page.DefaultImageSeq)
            fields.push('DefaultImageSeq');
        if (req.body.page.AuthorSeq == null || !req.body.page.AuthorSeq)
            req.body.page.AuthorSeq = 1;
        data.insertEntity(transaction, 'ContentPages', fields, req.body.page).
            then(function (seq) {
                req.body.page.Seq = seq;
                var champCategories = req.body.page.ChampionshipCategoryIds || [];
                ApplyPageChampionships(transaction, req.body.page.Seq, champCategories).then(function() {
                    ApplyPageAuthor(transaction, req.body.page).then(function() {
                        ApplyTagsAndSections(transaction, req.body.page).then(function(pageData) {
                            var defaultImageSeq = GetDefaultImage(pageData);
                            UpdateDefaultImage(transaction, req.body.page.Seq, defaultImageSeq).then(function() {
                                transaction.commit(function (err, recordset) {
                                    logger.log('info', 'Page %d inserted', seq);
                                    try {
                                        CopyAttachments(req.body.page);
                                    } catch (err) {
                                        logger.log('error', 'error copying new images for page ' + req.body.page.Seq + ': ' + err);
                                    }
                                    res.status(200).send(pageData);
                                });
                            }, function(err) {
                                logger.log('error', err);
                                res.status(500).send('ERROR');
                            });
                        }, function(err) {
                            logger.log('error', err);
                            res.status(500).send('ERROR');
                        });
                    }, function(err) {
                        transaction.rollback();
                        logger.log('error', 'general error updating page: ' + (err.message || err));
                        res.status(500).send(err);
                    });
                }, function(err) {
                    transaction.rollback();
                    res.status(500).send(err);
                });
            }, function (err) {
                transaction.rollback();
                logger.log('error', 'Error inserting new page: %s', err.message);
                res.status(500).send('ERROR');
            })
    });
});

router.put('/:page/hide', function (req, res) {
    SetPageVisibility(req.session.user, req.connection, {'Seq': req.params.page, 'IsHidden': 1}).then(function() {
        res.status(200).send('OK');
    }, function(status) {
        res.sendStatus(status);
    });
});

router.put('/:page/unhide', function (req, res) {
    SetPageVisibility(req.session.user, req.connection, {'Seq': req.params.page, 'IsHidden': 0}).then(function() {
        res.status(200).send('OK');
    }, function(status) {
        res.sendStatus(status);
    });
});

router.put('/', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        var fields = ['Description', 'Date', 'SportFieldSeq', 'SubCaption', 'ShowAuthorDetails',
            'DefaultImageSeq', 'Time', 'FacilityName', 'ActivityDuration'];
        if (req.body.pageData.AuthorSeq)
            fields.push('AuthorSeq');
        data.updateEntity(transaction, 'ContentPages', fields, req.body.pageData).then(function () {
            var champCategories = req.body.pageData.ChampionshipCategoryIds || [];
            ApplyPageChampionships(transaction, req.body.pageData.Seq, champCategories).then(function() {
                ApplyPageAuthor(transaction, req.body.pageData).then(function () {
                    ApplyTagsAndSections(transaction, req.body.pageData).then(function (pageData) {
                        transaction.commit(function (err, recordset) {
                            logger.log('info', 'Page %d updated', req.body.pageData.Seq);
                            res.status(200).send(pageData);
                        });
                    }, function (err) {
                        logger.log('error', err);
                        res.status(500).send('ERROR');
                    });
                }, function (err) {
                    transaction.rollback();
                    logger.log('error', 'general error updating page: ' + (err.message || err));
                    res.status(500).send(err);
                });
            }, function(err) {
                transaction.rollback();
                res.status(500).send(err);
            });
        }, function (err) {
            transaction.rollback();
            logger.log('error', 'Error updating page %d: %s', req.body.pageData.Seq, err.message);
            res.status(500).send('ERROR');
        })
    });
});

router.post('/featured', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    function InsertFeaturedRecords(transaction, pageList) {
        return new Promise(function (fulfil, reject) {
            function ApplyCurrentRecord(index) {
                function InsertSingleRecord(pageData) {
                    var qs = 'Insert Into FeaturedPages (PageSeq, [Index]) Values(@page, @index)';
                    var request = transaction.request();
                    request.input('page', pageData.Seq);
                    request.input('index', pageData.Index);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            transaction.rollback();
                            logger.error('Error inserting featured page ' + pageData.Seq + ' with index ' + pageData.Index + ': ' + (err.message || err));
                            reject('failed to insert');
                        }
                        else {
                            ApplyCurrentRecord(index + 1);
                        }
                    });
                }

                if (index >= pageList.length) {
                    fulfil('OK');
                } else {
                    var curData = pageList[index];
                    InsertSingleRecord(curData);
                }
            }

            ApplyCurrentRecord(0);
        });
    }

    var pages = req.body.pages || [];
    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        var qs = 'Delete From FeaturedPages';
        var request = transaction.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                transaction.rollback();
                logger.error('Error deleting featured pages: ' + (err.message || err));
                res.status(500).send('ERROR');
            }
            else {
                InsertFeaturedRecords(transaction, pages).then(function() {
                    transaction.commit(function (err, recordset) {
                        logger.log('info', 'Featured pages list has been updated (' + pages.map(function(x) { return x.Seq; }).join(', ') + ')');
                        res.status(200).send('OK');
                    });
                }, function(err) {
                    logger.log('error', err);
                    res.status(500).send('ERROR');
                });
            }
        });
    });
});

router.post('/:page/thumbnail', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    function ApplyNewAttachment(transaction, pageSeq, fileName, fileSize) {
        return new Promise(function (fulfil, reject) {
            if (fileName && fileSize) {
                var attachmentData = {
                    AttachmentType: 5,
                    FileName: fileName,
                    FileSize: fileSize,
                    DateUploaded: new Date()
                };
                data.insertEntity(transaction, 'Attachments', ['AttachmentType', 'FileName', 'FileSize', 'DateUploaded'], attachmentData).
                    then(function (attachmentSeq) {
                        fulfil(attachmentSeq);
                    }, function (err) {
                        transaction.rollback();
                        logger.log('error', 'Error inserting  attachment "' + fileName + '" for page ' + pageSeq + ': %s', err.message);
                       reject('ERROR');
                    });
            } else {
                fulfil(0);
            }
        });
    };

    var pageSeq = req.params.page;
    var thumbnailType = req.body.ThumbnailType;
    var thumbnailSeq = req.body.ThumbnailSeq;
    var fileName = req.body.FileName;
    var fileSize = req.body.FileSize;
    var transaction = req.connection.transaction();
    transaction.begin(function (err) {
        ApplyNewAttachment(transaction, pageSeq, fileName, fileSize).then(function(attachmentSeq) {
            if (attachmentSeq > 0)
                thumbnailSeq = attachmentSeq;
            var qs = 'Delete From [PageThumbnails] Where [PageSeq]=@page And [ThumbnailType]=@type';
            var request = transaction.request();
            request.input('page', pageSeq);
            request.input('type', thumbnailType);
            request.query(qs, function (err, recordset) {
                if (err) {
                    transaction.rollback();
                    logger.error('Error deleting from PageThumbnails table: ' + (err.message || err));
                    res.status(500).send('ERROR');
                }
                else {
                    qs = 'Insert Into [PageThumbnails] ([PageSeq], [ThumbnailType], [PictureSeq]) Values (@page, @type, @picture)';
                    request = transaction.request();
                    request.input('page', pageSeq);
                    request.input('type', thumbnailType);
                    request.input('picture', thumbnailSeq);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            transaction.rollback();
                            logger.error('Error inserting into PageThumbnails table (thumbnail ' + thumbnailSeq + '): ' + (err.message || err));
                            res.status(500).send('ERROR');
                        }
                        else {
                            transaction.commit(function (err, recordset) {
                                logger.log('info', 'Page ' + pageSeq + ' thumbnail ' + thumbnailType + ' has been set to ' + thumbnailSeq);
                                res.status(200).send({'Seq': thumbnailSeq});
                            });
                        }
                    });
                }
            });
        }, function(err) {
            res.status(500).send(err);
        });
    });
});

router.post('/recent', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 3])) {
        res.sendStatus(401);
        return;
    }

    function UpdateRecentRecords(transaction, pageType, pageList) {
        return new Promise(function (fulfil, reject) {
            function ApplyCurrentRecord(index) {
                function UpdateSingleRecord(pageData) {
                    var qs = 'Update ContentPages Set [Index]=@index Where Seq=@page And [Type]=@type';
                    var request = transaction.request();
                    request.input('page', pageData.Seq);
                    request.input('type', pageType);
                    request.input('index', pageData.Index);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            transaction.rollback();
                            logger.error('Error updating recent page ' + pageData.Seq + ' to index ' + pageData.Index + ': ' + (err.message || err));
                            reject('failed to update');
                        }
                        else {
                            ApplyCurrentRecord(index + 1);
                        }
                    });
                }

                if (index >= pageList.length) {
                    fulfil('OK');
                } else {
                    var curData = pageList[index];
                    UpdateSingleRecord(curData);
                }
            }

            ApplyCurrentRecord(0);
        });
    }

    var pages = req.body.pages || [];
    var pageType = parseInt(req.body.type);
    if (isNaN(pageType) || pageType <= 0) {
        res.status(400).send('invalid page type');
    } else {
        var transaction = req.connection.transaction();
        transaction.begin(function (err) {
            /* var qs = 'Update ContentPages Set [Index]=Null Where [Type]=@type';
            var request = transaction.request();
            request.input('type', pageType);
            request.query(qs, function (err, recordset) {
                if (err) {
                    transaction.rollback();
                    logger.error('Error resetting recent pages for type ' + pageType + ': ' + (err.message || err));
                    res.status(500).send('ERROR');
                } else { */

            UpdateRecentRecords(transaction, pageType, pages, 0).then(function (resp) {
                transaction.commit(function (err, recordset) {
                    logger.log('info', 'Recent pages list has been updated for type ' + pageType + ' (' + pages.map(function (x) {
                        return x.Seq;
                    }).join(', ') + ')');
                    res.status(200).send(resp);
                });
            }, function (err) {
                logger.log('error', err);
                res.status(500).send('ERROR');
            });
        });
    }
});

module.exports = router;