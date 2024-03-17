var express = require('express');
var Promise = require('promise');
var logger = require('../logger');
var data = require('./data');
var settings = require('../settings');
var consumer = require('./schoolsport-consumer');
var cache = require('./cache');
var flowers = require('./sport-flowers');
var sportsman = require('./sportsman');
var pagesData = require('./pages-data');
var ifaService = require('./ifa-service');
var banners = require('./banners');
var utils = require('./utils');
var fs = require('fs');
var xl = require('excel4node');
var officegen = require('officegen');
var httpRequest = require('request');
var Season = require('../v2/models/season');
var router = express.Router();

String.prototype.compareTo = function(s) {
    return (this == s) ? 0 : ((this > s) ? -1 : 1);
};

function ReadSQL(connection, qs, title, noError) {
    return new Promise(function (fulfil, reject) {
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading ' + title + ': ' + (err.message || err));
                if (noError) {
                    fulfil([]);
                } else {
                    reject('error reading data');
                }
            }
            else {
                fulfil(recordset);
            }
        });
    });
}

function ReadPageTypes(connection, noError) {
    if (typeof noError == 'undefined')
        noError = false;
    return ReadSQL(connection, 'Select Seq, [Type] From ContentPages', 'page types', noError);
}

//260125
//260125

function GetPracticeCamps(connection) {
    return new Promise(function (fulfil, reject) {
        var qs = 'Select PRACTICE_CAMP_ID From HiddenPracticeCamps';
        var request = connection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading hidden practice camps: ' + (err.message || err));
                reject('ERROR');
            } else {
                var hiddenCampsMapping = {};
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    var key = row['PRACTICE_CAMP_ID'].toString();
                    hiddenCampsMapping[key] = true;
                }
                sportsman.CreateConnection().then(function (sportsmanConnection) {
                    qs = 'Select p.PRACTICE_CAMP_ID, p.SPORT_ID, s.SPORT_NAME, p.DATE_START, p.DATE_FINISH, p.BASE_PRICE, p.REMARKS ' +
                        'From PRACTICE_CAMPS p Inner Join SPORTS s On p.SPORT_ID=s.SPORT_ID ' +
                        'Where p.DATE_START>=GetDate() And p.DATE_DELETED Is Null And s.DATE_DELETED Is Null ' +
                        'Order By p.DATE_START Asc';
                    request = sportsmanConnection.request();
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading practice camps for v5: ' + (err.message || err));
                            reject('ERROR');
                        } else {
                            //adjust to actual display for now
                            var practiceCamps = [];
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                var id = row['PRACTICE_CAMP_ID'];
                                if (!hiddenCampsMapping[id.toString()]) {
                                    var remarks = row['REMARKS'];
                                    var dateStart = utils.FormatDate(row['DATE_START'], 'dd/MM/yyyy');
                                    var dateFinish = utils.FormatDate(row['DATE_FINISH'], 'dd/MM/yyyy');
                                    var name = 'מחנה אימון ' + row['SPORT_NAME'] + ' מ-' + dateStart + ' עד ' + dateFinish;
                                    if (remarks) {
                                        name += ' (' + remarks + ')';
                                    }
                                    var practiceCamp = {
                                        id: row['PRACTICE_CAMP_ID'],
                                        name: name
                                    };
                                    practiceCamps.push(practiceCamp);
                                }
                            }
                            fulfil(practiceCamps);
                        }
                    });
                }, function (err) {
                    reject('ERROR');
                });
            }
        });
    });
}

function ReadLoggedUser(session) {
    if (session && session.user && session.user.seq) {
        return {
            seq: session.user.seq,
            name: session.user.username,
            displayName: session.user.displayName,
            role: session.user.role,
            schoolSymbol: session.user.schoolSymbol,
            state: session.user.state
        }
    }

    return null;
}

function ParseV2Article(icon, row, imageUrl) {
    return {
        icon: icon,
        seq: row['Seq'],
        imageUrl: imageUrl,
        title: row['Description'],
        subCaption: row['SubCaption'],
        date: row['Date'],
        sportFieldId: row['SportFieldSeq'],
        sportFieldName: row['SportFieldName']
    };
}

router.get('/test-excel', function (req, res) {
    var excelFileName = 'test-new.xlsx';
    var excelFullPath = settings.excelRoot + '\\' + excelFileName;
    var xlsx = officegen ({
        'type': 'xlsx'
    });
    xlsx.on ('finalize', function (written) {

    });

    xlsx.on('error', function (err) {
        logger.error('Error while creating excel: ' + (err.message || err));
    });
    var sheet = xlsx.makeNewSheet();
    sheet.name = 'Excel Test';
    sheet.data[0] = [];
    sheet.data[0][0] = 'כותרת מספר 1';
    sheet.data[0][1] = 'כותרת מספר 2';
    sheet.data[0][2] = 'כותרת מספר 3';
    sheet.data[1] = [];
    sheet.data[1][0] = 'שורה ראשונה, תא ראשון';
    sheet.data[1][1] = 'שורה ראשונה, תא שני';
    sheet.data[1][2] = 'שורה ראשונה, תא שלישי';
    sheet.data[2] = [];
    sheet.data[2][0] = 'שורה שנייה, תא ראשון';
    sheet.data[2][1] = 'שורה שנייה, תא שני';
    sheet.data[2][2] = 'שורה שנייה, תא שלישי';
    var out = fs.createWriteStream (excelFullPath);
    out.on ('error', function (err) {
        logger.error('Error creating excel file: ' + (err.message || err));
        res.sendStatus(500);
    });
    out.on ('close', function () {
        res.send(excelFileName);
    });
    xlsx.generate(out);


    /*
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('דו"ח קבוצות', {
        'sheetView': {
            'rightToLeft': true
        }
    });
    ws.cell(1, 1).string('כותרת מספר 1');
    ws.cell(1, 2).string('כותרת מספר 2');
    ws.cell(1, 3).string('כותרת מספר 3');
    ws.cell(2, 1).string('שורה ראשונה, תא ראשון');
    ws.cell(2, 2).string('שורה ראשונה, תא שני');
    ws.cell(2, 3).string('שורה ראשונה, תא שלישי');
    ws.cell(3, 1).string('שורה שנייה, תא ראשון');
    ws.cell(3, 2).string('שורה שנייה, תא שני');
    ws.cell(3, 3).string('שורה שנייה, תא שלישי');
    wb.write(excelFullPath);
    */
});

router.get('/test-loglig', function (req, res) {
    var url = 'http://loglig.com:8080/api/Leauges/RegisteredCompetitionAthletes/3300';
    //res.send('<b>מודגש</b>');
    httpRequest.get({url: url, json: true}, (err, getDataResponse, data) => {
        if (err) {
            logger.error('Error reading loglig data: ' + (err.message || err));
            res.send(500);
        } else if (res.statusCode === 200) {
            // you can use data here - already parsed as json
            var htmlResponse = '<div style="direction: rtl; text-align: right;">';
            htmlResponse += '<p>תחרות: ' + data.Header2.replace('רשימת משתתפים: ', '') + '</p>';
            htmlResponse += '<p>מקצוע: ' + data.Header3.replace('במקצוע:', '').trim() + '</p>';
            htmlResponse += '<table>';
            htmlResponse += '<tr><th>שם משתתף</th><th>מועדון</th><th>שנת לידה</th><th>מספר חולצה</th><th>זיהוי משתמש לוגליג</th><th>זיהוי עונה לוגליג</th>';
            var fields = ['FullName', 'ClubName', 'BirthDay', 'AthleteNumber', 'UserId', 'SeasonId'];
            data.items.forEach(function(curItem) {
                htmlResponse += '<tr><td>' + fields.map(function(field) {
                    return curItem[field];
                }).join('</td><td>') + '</td></tr>';
            });
            htmlResponse += '</table>';
            htmlResponse += '</div>';
            res.status(200).send(htmlResponse);
        } else {
            logger.error('Status of ' + res.statusCode + ' while reading loglig data');
            res.sendStatus(res.statusCode);
        }
    });
});

router.get('/ifa-register-status', function (req, res) {
    var idNumber = req.query.id;
    if (!idNumber || idNumber.length == 0) {
        res.send(400);
        return;
    }

    ifaService.RegisterStatus(idNumber).then(function(playerStatus) {
        res.status(200).send(playerStatus);
    }, function(err) {
        res.status(500).send('error consuming service');
    });
});

//utils.GeneratePassword(12, 12)

router.get('/random-token', function (req, res) {
    var minLength = parseInt(req.query.min);
    var maxLength = parseInt(req.query.max);
    if (isNaN(minLength) || minLength <= 0)
        minLength = 8;
    if (isNaN(maxLength) || maxLength <= 0 || maxLength < minLength)
        maxLength = minLength;
    res.status(200).send(utils.GeneratePassword(minLength, maxLength));
});

router.post('/excel', function (req, res) {
    var headers = req.body.Headers;
    var rows = req.body.Rows;
    var baseName = req.query.name || 'excel';
    //var sheetName = req.query.sheet || 'גיליון 1';
    if (!headers || headers.length == 0 || !rows || rows.length == 0) {
        res.sendStatus(400);
        return;
    }

    var validRows = rows.filter(function(x) {
        return x.length == headers.length;
    });
    if (validRows.length == 0) {
        res.sendStatus(400);
        return;
    }

    var excelFileName = baseName + '_';
    if (req.session && req.session.user && req.session.user.seq)
        excelFileName += req.session.user.seq + '_';
    excelFileName += utils.GeneratePassword(12, 12) + '.xlsx';
    var excelFullPath = settings.excelRoot + '\\' + excelFileName;
    var xlsx = officegen ({
        'type': 'xlsx'
    });
    xlsx.on('error', function (err) {
        logger.error('Error while creating excel: ' + (err.message || err));
    });
    var sheet = xlsx.makeNewSheet();
    //sheet.name = 'Excel Test';
    sheet.data[0] = [];
    for (var i = 0; i < headers.length; i++) {
        var curHeader = headers[i] || 'עמודה מספר ' + (i + 1);
        sheet.data[0][i] = curHeader;
    }
    for (var i = 0; i < validRows.length; i++) {
        var currentRow = validRows[i];
        sheet.data[i + 1] = currentRow;
    }
    var out = fs.createWriteStream (excelFullPath);
    out.on ('error', function (err) {
        logger.error('Error creating excel file: ' + (err.message || err));
        res.sendStatus(500);
    });
    out.on ('close', function () {
        res.send(excelFileName);
    });
    xlsx.generate(out);
});

router.get('/all-global-data', function (req, res) {
    function ReadLocalData() {
        return new Promise(function (fulfil, reject) {
            var localData = {
                PageTypes: []
            };
            ReadPageTypes(req.connection, true).then(function(pageTypes) {
                localData.PageTypes = pageTypes;
                fulfil(localData);
            });
        });
    }

    function RealAllSportsmanData() {
        return new Promise(function (fulfil, reject) {
            var sportsmanData = {
                Regions: [],
                PermanentChampionships: [],
                SeasonsInUse: []
            };
            sportsman.Regions().then(function(regions) {
                sportsmanData.Regions = regions;
                sportsman.PermanentChampionships().then(function(permanentChampionships) {
                    sportsmanData.PermanentChampionships = permanentChampionships;
                    sportsman.SeasonsInUse().then(function(seasonsInUse) {
                        sportsmanData.SeasonsInUse = seasonsInUse;
                        fulfil(sportsmanData);
                    }, function(err) {
                        //send partial data:
                        fulfil(sportsmanData);
                    });
                }, function(err) {
                    sportsman.SeasonsInUse().then(function(seasonsInUse) {
                        sportsmanData.SeasonsInUse = seasonsInUse;
                        fulfil(sportsmanData);
                    }, function(err) {
                        //send partial data:
                        fulfil(sportsmanData);
                    });
                });
            }, function(err) {
                logger.verbose('error reading regions: ' + err);
                sportsman.PermanentChampionships().then(function(permanentChampionships) {
                    sportsmanData.PermanentChampionships = permanentChampionships;
                    sportsman.SeasonsInUse().then(function(seasonsInUse) {
                        sportsmanData.SeasonsInUse = seasonsInUse;
                        fulfil(sportsmanData);
                    }, function(err) {
                        //send partial data:
                        fulfil(sportsmanData);
                    });
                }, function(err) {
                    sportsman.SeasonsInUse().then(function(seasonsInUse) {
                        sportsmanData.SeasonsInUse = seasonsInUse;
                        fulfil(sportsmanData);
                    }, function(err) {
                        //send partial data:
                        fulfil(sportsmanData);
                    });
                });
            });
        });
    }

    var allData = {
        Login: null,
        ContentMapping: settings.contentMapping,
        SportFieldIcons: settings.sportFieldIcons,
        PageTypes: null,
        Sportsman: null
    };
    allData.Login = ReadLoggedUser(req.session);
    ReadLocalData().then(function(localData) {
        allData.PageTypes = localData.PageTypes;
        RealAllSportsmanData().then(function(sportsmanData) {
            allData.Sportsman = sportsmanData;
            res.send(allData);
        }, function(err) {
            logger.log('verbose', 'General error reading sportsman data: ' + err);
            res.send(allData);
        });
    });
});

/*

*/

router.get('/Sportsman', function (req, res) {
    res.send(settings.Sportsman);
});

function FilterArticles(connection, articles, isLeague, leagueFilters) {
    return new Promise(function (fulfil, reject) {
        if (typeof leagueFilters === 'undefined')
            leagueFilters = null;
        if (articles.length > 0 && (isLeague || leagueFilters != null)) {
            const pageIds = articles.map(article => article.seq);
            let qs = 'Select ContentPageSeq, ChampionshipCategoryId ' +
                'From ContentPageChampionships ' +
                'Where ContentPageSeq In (' + pageIds.join(', ') + ')';
            let request = connection.request();
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading championship categories: ' + (err.message || err));
                    reject('ERROR');
                } else {
                    let categoryIds = [];
                    let pageChampionshipMapping = {};
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        const currentCategoryId = row['ChampionshipCategoryId'];
                        categoryIds.push(currentCategoryId);
                        const key = row['ContentPageSeq'].toString();
                        if (!pageChampionshipMapping[key])
                            pageChampionshipMapping[key] = [];
                        pageChampionshipMapping[key].push(currentCategoryId);
                    }
                    sportsman.CreateConnection().then(function(sportsmanConnection) {
                        qs = 'Select cc.CHAMPIONSHIP_CATEGORY_ID, c.SPORT_ID, s.SPORT_NAME, cc.CATEGORY, c.IS_CLUBS, c.IS_LEAGUE ' +
                            'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
                            '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
                            'Where cc.DATE_DELETED Is Null And cc.CHAMPIONSHIP_CATEGORY_ID In (' + categoryIds.join(', ') + ')';
                        request = sportsmanConnection.request();
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading categories club and league info: ' + (err.message || err));
                                reject('ERROR');
                            } else {
                                let categoryMapping = {};
                                for (var i = 0; i < recordset.length; i++) {
                                    var row = recordset[i];
                                    const key = row['CHAMPIONSHIP_CATEGORY_ID'].toString();
                                    categoryMapping[key] = {
                                        clubs: row['IS_CLUBS'] == 1,
                                        league: row['IS_LEAGUE'] == 1,
                                        sport: {
                                            id: row['SPORT_ID'],
                                            name: row['SPORT_NAME']
                                        },
                                        rawCategory: row['CATEGORY']
                                    };
                                }
                                // console.log(categoryMapping);
                                let filteredArticles = articles.filter(article => {
                                    const articleCategories = pageChampionshipMapping[article.seq.toString()] || [];
                                    if (articleCategories.length > 0) {
                                        let matchingCategory = articleCategories.find(categoryId => {
                                            const categoryData = categoryMapping[categoryId.toString()];
                                            if (isLeague)
                                                return categoryData['league'] == true;
                                            if (leagueFilters != null) {
                                                if (categoryData['clubs'] == true) {
                                                    return false;
                                                } else {
                                                    var sportId = categoryData['sport'].id;
                                                    var rawCategory = categoryData['rawCategory'];
                                                    return leagueFilters.find(f => f.sport == sportId && f.category == rawCategory) != null;
                                                }
                                            }
                                            return true;
                                        });
                                        return matchingCategory != null;
                                    }
                                    return false;
                                });
                                fulfil(filteredArticles);
                            }
                        });
                    }, function(err) {
                        reject('ERROR');
                    });
                }
            });
        } else {
            fulfil(articles);
        }
    });
}

router.get('/homepage-articles', function (req, res) {
    var region = req.query.region;
    var isLeague = req.query.league == 'true';
    var qsAll, qsFilterRegion;
    var request = req.connection.request();

    if (!region) {
        qsAll = 'Select cp.Seq, cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
            '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u1.DisplayName, u1.UserLogin) As CreatorName, ' +
            '   sf.Name As SportFieldName, ' +
            '   pt.PictureSeq As MainImageSeq, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att.[FileName] As MainImageUrl, ' +
            '   \'/content/Cropped/\' + Convert(nvarchar(10), pt.PictureSeq) + \'/\' + ci.[FileName] As CroppedImageUrl, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att2.[FileName] As MainImageUrl2, ' +
            '   \'/content/Cropped/\' + Convert(nvarchar(10), pt2.PictureSeq) + \'/\' + ci2.[FileName] As CroppedImageUrl2, ' +
            '   fp.[Index] ' +
            'From ContentPages cp Inner Join FeaturedPages fp On fp.PageSeq=cp.Seq ' +
            '   Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
            '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
            '   Left Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
            '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=2 ' +
            '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
            '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
            '   Left Join PageThumbnails pt2 On pt2.PageSeq=cp.Seq And pt2.ThumbnailType=1 ' +
            '   Left Join Attachments att2 On pt2.PictureSeq=att2.Seq And att2.AttachmentType=5 ' +
            '   Left Join CroppedImages ci2 On pt2.PictureSeq=ci2.ImageSeq ' +
            'Where (cp.IsHidden Is Null Or cp.IsHidden=0) ' +
            'Order By fp.[Index] Asc';
    } else {
        qsFilterRegion = 'Select cp.Seq, cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
            '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u1.DisplayName, u1.UserLogin) As CreatorName, ' +
            '   sf.Name As SportFieldName, ' +
            '   pt.PictureSeq As MainImageSeq, ' +
            '   rp.REGION_ID AS Region, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att.[FileName] As MainImageUrl, ' +
            '   \'/content/Cropped/\' + Convert(nvarchar(10), pt.PictureSeq) + \'/\' + ci.[FileName] As CroppedImageUrl, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att2.[FileName] As MainImageUrl2, ' +
            '   \'/content/Cropped/\' + Convert(nvarchar(10), pt2.PictureSeq) + \'/\' + ci2.[FileName] As CroppedImageUrl2, ' +
            '   fp.[Index] ' +
            'From ContentPages cp Inner Join FeaturedPages fp On fp.PageSeq=cp.Seq ' +
            '   Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
            '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
            '   Left Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
            '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=2 ' +
            '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
            '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
            '   Left Join PageThumbnails pt2 On pt2.PageSeq=cp.Seq And pt2.ThumbnailType=1 ' +
            '   Left Join Attachments att2 On pt2.PictureSeq=att2.Seq And att2.AttachmentType=5 ' +
            '   Left Join CroppedImages ci2 On pt2.PictureSeq=ci2.ImageSeq ' +
            '   Left Join RegionPages rp On rp.ContentPageSeq=cp.Seq ' +
            'Where (cp.IsHidden Is Null Or cp.IsHidden=0) ' +
            '   And rp.REGION_ID=@region ' +
            'Order By fp.[Index] Asc';
        request.input('region', region);
    }

    request.query(qsAll || qsFilterRegion, function (err, recordset) {
        if (err) {
            logger.error('Error reading homepage articles: ' + (err.message || err));
            res.send(500);
        } else {
            //adjust to actual display for now
            var articles = [];
            var imageMapping = {};
            for (var i = 0; i < recordset.length; i++) {
                var row = recordset[i];
                var pageSeq = row['Seq'];
                var key = pageSeq.toString();
                var article = articles.find(function(x) {
                    return x.seq === pageSeq;
                });
                if (article == null) {
                    article = ParseV2Article('user-id.png', row, '');
                    articles.push(article);
                    imageMapping[key] = {
                        CroppedImageUrl: null,
                        CroppedImageUrl2: null,
                        MainImageUrl: null,
                        MainImageUrl2: null
                    };
                }
                for (var propName in imageMapping[key]) {
                    if (imageMapping[key][propName] == null) {
                        imageMapping[key][propName] = row[propName];
                    }
                }
            }
            articles.forEach(function(article) {
                var imageData = imageMapping[article.seq.toString()];
                var rawImage = imageData['CroppedImageUrl'] || imageData['CroppedImageUrl2'] || imageData['MainImageUrl'] || imageData['MainImageUrl2'];
                article.imageUrl = rawImage ? settings.protocol + '://' + req.headers.host + rawImage : null;
            });
            var leagueFilters = utils.BuildLeagueFilters(req.query);
            FilterArticles(req.connection, articles, isLeague, leagueFilters).then(function(filteredArticles) {
                //limit amount of sent articles
                if (settings.v5Articles && settings.v5Articles.mainArticleCount) {
                    res.send(filteredArticles.slice(0, settings.v5Articles.mainArticleCount));
                } else {
                    res.send(filteredArticles);
                }
            }, function(err) {
                res.send(500);
            });
        }
    });
});

router.get('/homepage-advertisement', function (req, res) {
    banners.ReadBanners(1, true).then(function(rawBannerData) {
        //adjust to actual display for now
        var videoPath = settings.protocol + '://' + req.headers.host + '/content/Banners/' + rawBannerData.Seq + '/' + rawBannerData.FileName;
        var banner = {
            videoPath: videoPath,
            externalLink: rawBannerData.ExternalLink
        };
        res.send(banner);
    }, function(err) {
        res.send(500);
    })
});

router.get('/article/:article', function (req, res) {
    function ReadTags(pageSeq) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select Distinct t.[Name] As TagName ' +
                'From ContentPageTags cpt Left Join Tags t On cpt.TagSeq=t.Seq ' +
                'Where cpt.PageSeq=@seq';
            var request = req.connection.request();
            request.input('seq', pageSeq);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading article ' + pageSeq + ' tags: ' + (err.message || err));
                    reject('ERROR');
                } else {
                    var tags = [];
                    for (var i = 0; i < recordset.length; i++) {
                        tags.push(recordset[i]['TagName'])
                    }
                    fulfil(tags);
                }
            });
        });
    }

    function GetContacts(contactIds) {
        return new Promise(function (fulfil, reject) {
            if (contactIds.length === 0) {
                fulfil([]);
            } else {
                var qs = 'Select c.Seq, c.[Role], c.[Name], c.Staff, c.AboutMe, c.Picture, a.[FileName] As PictureName, c.Email, c.HomePage, ' +
                        '   c.FacebookUrl, c.TwitterUrl, c.InstagramUrl, c.YouTubeUrl, c.LinkedInUrl, ' +
                        '   c.[Category], c.[Region], c.PhoneNumber ' +
                        'From Contacts c Left Join Attachments a On c.Picture=a.Seq ' +
                        'Where c.Seq In (' + contactIds.join(', ') + ')';
                var request = req.connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading article ' + pageSeq + ' contacts: ' + (err.message || err));
                        reject('ERROR');
                    } else {

                        var regions = [];
                        var contactMapping = {};
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var pictureName = row['PictureName'];
                            var imageUrl = pictureName ? '/content/Contacts/' + pageSeq + '/' + row['PictureName'] : null;
                            var regionId = row['Region'];
                            if (regionId != null)
                                regions.push(regionId);
                            var currentContact = {
                                seq: row['Seq'],
                                role: row['Role'],
                                name: row['Name'],
                                staff: row['Staff'] == 1,
                                about: row['AboutMe'],
                                image: imageUrl ? settings.protocol + '://' + req.headers.host + imageUrl : null,
                                email: row['Email'],
                                homePage: row['HomePage'],
                                category: row['Category'],
                                phoneNumber: row['PhoneNumber'],
                                region: regionId ? {
                                    id: regionId,
                                    name: ''
                                } : null,
                                socialUrls: {
                                    Facebook: row['FacebookUrl'],
                                    Twitter: row['TwitterUrl'],
                                    Instagram: row['InstagramUrl'],
                                    YouTube: row['YouTubeUrl'],
                                    LinkedIn: row['LinkedInUrl']
                                }
                            };
                            contactMapping[currentContact.seq.toString()] = currentContact;
                        }
                        var contacts = [];
                        for (var i = 0; i < contactIds.length; i++) {
                            var matchingContact = contactMapping[contactIds[i].toString()];
                            if (matchingContact != null)
                                contacts.push(matchingContact);
                        }
                        if (regions.length === 0) {
                            fulfil(contacts);
                        } else {
                            sportsman.CreateConnection().then(function (sportsmanConnection) {
                                qs = 'Select REGION_ID, REGION_NAME ' +
                                    'From REGIONS ' +
                                    'Where REGION_ID In (' + regions.join(', ') + ') And DATE_DELETED Is Null';
                                request = sportsmanConnection.request();
                                request.query(qs, function (err, recordset) {
                                    if (err) {
                                        logger.error('Error reading contact regions: ' + (err.message || err));
                                        reject('ERROR');
                                    } else {
                                        var regionMapping = {};
                                        for (var i = 0; i < recordset.length; i++) {
                                            var row = recordset[i];
                                            regionMapping[row['REGION_ID'].toString()] = row['REGION_NAME'];
                                        }
                                        contacts.forEach(contact => {
                                            if (contact.region) {
                                                contact.region.name = regionMapping[contact.region.id.toString()];
                                            }
                                        });
                                        fulfil(contacts);
                                    }
                                });
                            }, function(err) {
                                reject(err);
                            });
                        }
                    }
                });
            }
        });
    }

    function ReadSections(pageSeq) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select cs.[Type] As SectionType, cs.SectionIndex, cs.[Data] ' +
                'From ContentSections cs ' +
                'Where cs.PageSeq=@seq ' +
                'Order By cs.SectionIndex Asc';
            var request = req.connection.request();
            request.input('seq', pageSeq);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading article ' + pageSeq + ' sections: ' + (err.message || err));
                    reject('ERROR');
                } else {
                    var sections = [];
                    var attachmentIds = [];
                    var contactIds = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        var sectionType = row['SectionType'];
                        var rawData = row['Data'];
                        if (sectionType === 1 || sectionType === 5) {
                            var rawAttachments = rawData.split(',');
                            rawAttachments.forEach(function (rawAttachment) {
                                var attachmentId = parseInt(rawAttachment);
                                if (!isNaN(attachmentId) && attachmentId > 0) {
                                    attachmentIds.push(attachmentId);
                                    sections.push({
                                        type: sectionType,
                                        data: attachmentId
                                    })
                                }
                            });
                        } else if (sectionType === 6) {
                            var contactId = parseInt(rawData);
                            if (!isNaN(contactId) && contactId > 0)
                                contactIds.push(contactId);
                        } else {
                            sections.push({
                                type: sectionType,
                                data: rawData
                            })
                        }
                    }
                    GetContacts(contactIds).then(function(contacts) {
                        contacts.forEach(function(contact) {
                            sections.push({
                                type: 6,
                                contact: contact
                            })
                        });
                        if (attachmentIds.length > 0) {
                            qs = 'Select Seq, [FileName], [FileSize], [DateUploaded], [Description] ' +
                                'From Attachments ' +
                                'Where Seq In (' + attachmentIds.join(', ') + ')';
                            request = req.connection.request();
                            request.query(qs, function (err, recordset) {
                                if (err) {
                                    logger.error('Error reading article ' + pageSeq + ' attachments: ' + (err.message || err));
                                    reject('ERROR');
                                } else {
                                    for (var i = 0; i < recordset.length; i++) {
                                        var row = recordset[i];
                                        let attachmentSeq = row['Seq'];
                                        let attachmentFileName = row['FileName'];
                                        let matchingSection = sections.find(s => s.data === attachmentSeq);
                                        if (matchingSection != null) {
                                            switch (matchingSection.type) {
                                                case 1:
                                                    var imageUrl = '/content/Images/' + pageSeq + '/' + attachmentFileName;
                                                    matchingSection.data = settings.protocol + '://' + req.headers.host + imageUrl;
                                                    break;
                                                case 5:
                                                    var fileUrl = '/content/Files/' + pageSeq + '/' + attachmentFileName;
                                                    matchingSection.attachment = {
                                                        seq: attachmentSeq,
                                                        name: row['FileName'],
                                                        size: row['FileSize'],
                                                        uploaded: row['DateUploaded'],
                                                        description: row['Description'],
                                                        url: settings.protocol + '://' + req.headers.host + fileUrl
                                                    };
                                                    matchingSection.data = null;
                                                    break;
                                            }

                                        }
                                    }
                                    fulfil(sections);
                                }
                            });
                        } else {
                            fulfil(sections);
                        }
                    }, function(err) {
                        reject(err);
                    });
                }
            });
        });
    }

    function ReadSimilarArticles(pageSeq, sport, regionMapping) {
        return new Promise(function (fulfil, reject) {
            var qs = 'Select cp.Seq, cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
                '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u1.DisplayName, u1.UserLogin) As CreatorName, ' +
                '   sf.Name As SportFieldName, ' +
                '   rp.REGION_ID, ' +
                '   pt.PictureSeq As MainImageSeq, ' +
                '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att.[FileName] As MainImageUrl, ' +
                '   \'/content/Cropped/\' + Convert(nvarchar(10), pt.PictureSeq) + \'/\' + ci.[FileName] As CroppedImageUrl ' +
                'From ContentPages cp Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
                '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
                '   Left Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
                '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=1 ' +
                '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
                '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
                '   Left Join RegionPages rp On rp.ContentPageSeq=cp.Seq ' +
                'Where (cp.IsHidden Is Null Or cp.IsHidden=0) And (att.[FileName] Is Not Null Or (pt.PictureSeq Is Not Null And ci.[FileName] Is Not Null)) ' +
                '   And cp.SportFieldSeq=@sport And cp.Seq<>@page ' +
                'Order By cp.[Date] Desc';
            var request = req.connection.request();
            request.input('page', pageSeq);
            request.input('sport', sport);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading article ' + pageSeq + ' similar articles: ' + (err.message || err));
                    reject('ERROR');
                } else {
                    var similarArticles = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var row = recordset[i];
                        let currentPageSeq = row['Seq'];
                        if (similarArticles.findIndex(function (x) {
                                return x.id === currentPageSeq;
                            }) < 0) {
                            var similarArticle = {};
                            var rawImage = row['MainImageUrl'] || row['CroppedImageUrl'];
                            var imageUrl = rawImage ? settings.protocol + '://' + req.headers.host + rawImage : null;
                            similarArticle.id = currentPageSeq;
                            similarArticle.sport = sport;
                            similarArticle.sportName = row['SportFieldName'];
                            similarArticle.mainImage = imageUrl;
                            similarArticle.region = row['REGION_ID'];
                            similarArticle.regionName = similarArticle.region != null ? regionMapping[similarArticle.region.toString()] : null;
                            similarArticle.title = row['Description'];
                            similarArticle.subTitle = row['SubCaption'];
                            similarArticle.createdAt = row['Date'];
                            similarArticle.from = row['AuthorName'];
                            similarArticles.push(similarArticle);
                        }
                    }
                    fulfil(similarArticles);
                }
            });
        });
    }

    function ReadRegionArticles(pageSeq, regionId, regionName) {
        return new Promise(function (fulfil, reject) {
            if (regionId) {
                var qs = 'Select cp.Seq, cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
                    '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u1.DisplayName, u1.UserLogin) As CreatorName, ' +
                    '   sf.Name As SportFieldName,\n' +
                    '   pt.PictureSeq As MainImageSeq,\n' +
                    '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att.[FileName] As MainImageUrl, ' +
                    '   \'/content/Cropped/\' + Convert(nvarchar(10), pt.PictureSeq) + \'/\' + ci.[FileName] As CroppedImageUrl ' +
                    'From RegionPages rp Inner Join ContentPages cp On rp.ContentPageSeq=cp.Seq ' +
                    '   Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
                    '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
                    '   Left Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
                    '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=1 ' +
                    '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
                    '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
                    'Where (cp.IsHidden Is Null Or cp.IsHidden=0) ' +
                    '   And (att.[FileName] Is Not Null Or (pt.PictureSeq Is Not Null And ci.[FileName] Is Not Null)) ' +
                    '   And rp.REGION_ID=@region And cp.Seq<>@page ' +
                    'Order By cp.[Date] Desc';
                var request = req.connection.request();
                request.input('page', pageSeq);
                request.input('region', regionId);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading article ' + pageSeq + ' region articles: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        var regionArticles = [];
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            let currentPageSeq = row['Seq'];
                            if (regionArticles.findIndex(function (x) {
                                    return x.id === currentPageSeq;
                                }) < 0) {
                                var regionArticle = {};
                                var rawImage = row['MainImageUrl'] || row['CroppedImageUrl'];
                                var imageUrl = rawImage ? settings.protocol + '://' + req.headers.host + rawImage : null;
                                regionArticle.id = currentPageSeq;
                                regionArticle.mainImage = imageUrl;
                                regionArticle.sport = row['SportFieldSeq'];
                                regionArticle.sportName = row['SportFieldName'];
                                regionArticle.region = regionId;
                                regionArticle.regionName = regionName;
                                regionArticle.title = row['Description'];
                                regionArticle.subTitle = row['SubCaption'];
                                regionArticle.createdAt = row['Date'];
                                regionArticle.from = row['AuthorName'];
                                regionArticles.push(regionArticle);
                            }
                        }
                        fulfil(regionArticles);
                    }
                });
            } else {
                fulfil([]);
            }
        });
    }

    var pageSeq = req.params.article;
    var showHidden = req.query.showhidden == '1';
    sportsman.Regions().then(function(regions) {
        var regionMapping = {};
        regions.forEach(function(region) {
            regionMapping[region['REGION_ID'].toString()] = region['REGION_NAME'];
        });
        var qs = 'Select cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
            '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u1.DisplayName, u1.UserLogin) As CreatorName, ' +
            '   sf.Name As SportFieldName, ' +
            '   rp.REGION_ID, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + at.[FileName] As DefaultImageUrl,' +
            '   pt.PictureSeq As MainImageSeq, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att.[FileName] As MainImageUrl, ' +
            '   \'/content/Cropped/\' + Convert(nvarchar(10), pt.PictureSeq) + \'/\' + ci.[FileName] As CroppedImageUrl, ' +
            '   \'/content/Images/\' + Convert(nvarchar(10), cp.Seq) + \'/\' + att2.[FileName] As MainImageUrl2, ' +
            '   \'/content/Cropped/\' + Convert(nvarchar(10), pt2.PictureSeq) + \'/\' + ci2.[FileName] As CroppedImageUrl2 ' +
            'From ContentPages cp Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
            '   Left Join Attachments at On cp.DefaultImageSeq=at.Seq ' +
            '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
            '   Left Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
            '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=2 ' +
            '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
            '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
            '   Left Join PageThumbnails pt2 On pt2.PageSeq=cp.Seq And pt2.ThumbnailType=1 ' +
            '   Left Join Attachments att2 On pt2.PictureSeq=att2.Seq And att2.AttachmentType=5 ' +
            '   Left Join CroppedImages ci2 On pt2.PictureSeq=ci2.ImageSeq ' +
            '   Left Join RegionPages rp On rp.ContentPageSeq=cp.Seq ' +
            'Where ';
        if (!showHidden) {
            qs += '(cp.IsHidden Is Null Or cp.IsHidden=0) And ';
        }
        qs += 'cp.Seq=@seq';
        var request = req.connection.request();
        request.input('seq', pageSeq);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading article ' + pageSeq + ': ' + (err.message || err));
                res.send(500);
            } else {
                //adjust to actual display for now
                if (recordset && recordset.length > 0) {
                    var article = {};
                    var row = recordset[0];
                    var rawImage = row['DefaultImageUrl'] || row['MainImageUrl'] || row['MainImageUrl2'] || row['CroppedImageUrl2'] || row['CroppedImageUrl'];
                    var imageUrl = rawImage ? settings.protocol + '://' + req.headers.host + rawImage : null;
                    article.id = pageSeq;
                    article.mainImage = imageUrl;
                    article.title = row['Description'];
                    article.subTitle = row['SubCaption'];
                    article.createdAt = row['Date'];
                    article.from = row['AuthorName'];
                    article.region = row['REGION_ID'];
                    article.regionName = article.region != null ? regionMapping[article.region.toString()] : null;
                    article.sport = row['SportFieldSeq'];
                    article.sportName = row['SportFieldName'];
                    ReadTags(pageSeq).then(function (tags)  {
                        article.tags = tags;
                        ReadSimilarArticles(pageSeq, article.sport, regionMapping).then(function(similarArticles) {
                            article.similarArticles = similarArticles;
                            ReadRegionArticles(pageSeq, article.region, article.regionName).then(function(regionArticles) {
                                article.regionArticles = regionArticles;
                                ReadSections(pageSeq).then(function (sections) {
                                    article.sections = sections;
                                    res.send(article);
                                }, function (err) {
                                    res.send(500);
                                });
                            }, function(err) {
                                res.send(500);
                            });
                        }, function (err) {
                            res.send(500);
                        });
                    }, function(err) {
                        res.send(500);
                    });
                } else {
                    res.send({});
                }
            }
        });
    }, function(err) {
        res.send(500);
    });
});

router.get('/recent-articles', function (req, res) {
    var region = req.query.region;

    var isLeague = req.query.league == 'true';
    var qs = 'Select cp.Seq, cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
        '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u1.DisplayName, u1.UserLogin) As CreatorName, ' +
        '   sf.Name As SportFieldName, pt.PictureSeq As ImageSeq, rp.REGION_ID AS Region, cp.[Index], ' +
        '   dbo.ExtractPageImageUrl(cp.Seq, pt.PictureSeq, ci.[FileName], att.[FileName]) As ImageUrl ' +
        'From ContentPages cp Inner Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
        '   Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
        '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
        '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=1 ' +
        '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
        '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
        '   Left Join RegionPages rp On rp.ContentPageSeq=cp.Seq ' +
        'Where cp.[Type]=2 And cp.[Index] Is Not Null And cp.[Index]>0 And (cp.IsHidden Is Null Or cp.IsHidden=0) ';
    if (region != null)
        qs += 'And rp.REGION_ID=@region ';
    qs += 'Order By cp.[Index] Asc';
    var request = req.connection.request();
    if (region != null)
        request.input('region', region);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading recent articles: ' + (err.message || err));
            res.send(500);
        } else {
            //adjust to actual display for now
            var articles = [];
            for (var i = 0; i < recordset.length; i++) {
                var row = recordset[i];
                var pageSeq = row['Seq'];
                var rawUrl = row['ImageUrl'];
                var imageUrl = rawUrl ? settings.protocol + '://' + req.headers.host + rawUrl : null;
                var existingArticle = articles.find(function(x) {
                    return x.seq === pageSeq;
                });
                if (existingArticle == null) {
                    articles.push(ParseV2Article('', row, imageUrl));
                } else {
                    //overwrite with better thumbnail if exists
                    if (rawUrl && rawUrl.indexOf('214x234') >= 0) //58x39
                        existingArticle.imageUrl = imageUrl;
                }
            }
            var leagueFilters = utils.BuildLeagueFilters(req.query);
            FilterArticles(req.connection, articles, isLeague, leagueFilters).then(function(filteredArticles) {
                res.send(filteredArticles);
            }, function(err) {
                res.send(500);
            });
        }
    });
});

router.get('/search-articles', function (req, res) {
    function ReadTags(pages) {
        return new Promise(function (fulfil, reject) {
            if (pages == null || pages.length === 0) {
                fulfil({})
            } else {
                var qs = 'Select Distinct cpt.PageSeq, t.[Name] As TagName ' +
                    'From ContentPageTags cpt Left Join Tags t On cpt.TagSeq=t.Seq ' +
                    'Where cpt.PageSeq In (' + pages.join(', ') + ')';
                var request = req.connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading tags: ' + (err.message || err));
                        reject('ERROR');
                    } else {
                        var tagMapping = {};
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var tagName = row['TagName'];
                            var key = row['PageSeq'].toString();
                            if (!tagMapping[key]) {
                                tagMapping[key] = [];
                            }
                            tagMapping[key].push(tagName);
                        }
                        fulfil(tagMapping);
                    }
                });
            }
        });
    }

    function GetSearchFields(searchTerm, wholeWord) {
        /**
         * @return {string}
         */
        function BuildFieldLikes(fieldName) {
            var term = searchTerm + '';
            while (term.indexOf("'") >= 0)
                term = term.replace("'", "&quot;");
            while (term.indexOf("&quot;") >= 0)
                term = term.replace("&quot;", "\'");
            if (wholeWord) {
                return '(' + fieldName + '=N\'' + term + '\' Or ' + fieldName + ' Like N\'' + term + ' %\' ' +
                    'Or ' + fieldName + ' Like N\'% ' + term + '\'' + ' Or ' + fieldName + ' Like N\'% ' + term + ' %\')';
            } else {
                return fieldName + ' Like N\'%' + term + '%\''
            }
        }

        /**
         * @return {string}
         */
        function GetDateComparison() {
            if (searchTerm.indexOf('/') > 0) {
                var dateParts = searchTerm.split('/');
                if (dateParts.length > 1) {
                    var firstPart = parseInt(dateParts[0], 10);
                    var secondPart = parseInt(dateParts[1], 10);
                    var thirdPart = dateParts.length > 2 ? parseInt(dateParts[2], 10) : 0;
                    var day = 0, month = 0, year = 0;
                    if (secondPart >= 2000 && firstPart > 0 && firstPart <= 12) {
                        month = firstPart;
                        year = secondPart;
                    } else if (firstPart > 0 && firstPart <= 31 && secondPart > 0 && secondPart <= 12) {
                        day = firstPart;
                        month = secondPart;
                        year = thirdPart;
                    }
                    if (day > 0 || month > 0) {
                        var dateFields = [];
                        if (day > 0) {
                            dateFields.push('DATEPART(day, cp.[Date])=' + day);
                        }
                        if (month > 0) {
                            dateFields.push('DATEPART(month, cp.[Date])=' + month);
                        }
                        if (year >= 2000) {
                            dateFields.push('DATEPART(year, cp.[Date])=' + year);
                        }
                        return dateFields.join(' And ');
                    }
                }
            }
            return '';
        }

        var searchFields = [];
        var dateComparison = GetDateComparison();
        if (dateComparison.length > 0) {
            searchFields.push(dateComparison);
        } else {
            searchFields.push('cp.Seq In (' +
                '   Select Distinct cpt.PageSeq ' +
                '   From ContentPageTags cpt Left Join Tags t On cpt.TagSeq=t.Seq' +
                '   Where ' + BuildFieldLikes('t.Name') +
                ')');
            searchFields.push('cp.Seq In (' +
                '   Select Distinct PageSeq ' +
                '   From ContentSections' +
                '   Where [Type]=2 And ' + BuildFieldLikes('[Data]') +
                ')');
            searchFields.push(BuildFieldLikes('cp.[Description]'));
            searchFields.push(BuildFieldLikes('cp.[SubCaption]'));
            searchFields.push(BuildFieldLikes('sf.Name'));
            searchFields.push(BuildFieldLikes('u1.DisplayName'));
        }
        return searchFields;
    }

    var rawSearchTerm = req.query.q || '';
    var wholeWord = rawSearchTerm.indexOf('"') === 0 && rawSearchTerm.lastIndexOf('"') === rawSearchTerm.length - 1;
    var searchTerm = utils.SanitizeDatabaseValue(rawSearchTerm);
    if (searchTerm.length === 0) {
        res.send([]);
        return;
    }
    var qs = 'Select cp.Seq, cp.[Description], cp.[Date], cp.SportFieldSeq, cp.SubCaption, ' +
        '   IsNull(u1.DisplayName, u1.UserLogin) As AuthorName, IsNull(u2.DisplayName, u2.UserLogin) As CreatorName, ' +
        '   sf.Name As SportFieldName, ' +
        '   pt.PictureSeq As ImageSeq,  ' +
        '   dbo.ExtractPageImageUrl(cp.Seq, pt.PictureSeq, ci.[FileName], att.[FileName]) As ImageUrl, ' +
        '   cp.[Index] ' +
        'From ContentPages cp Inner Join SportFields sf On cp.SportFieldSeq=sf.Seq ' +
        '   Left Join Users u1 On cp.AuthorSeq=u1.Seq ' +
        '   Left Join Users u2 On cp.CreatorSeq=u2.Seq ' +
        '   Left Join PageThumbnails pt On pt.PageSeq=cp.Seq And pt.ThumbnailType=1 ' +
        '   Left Join Attachments att On pt.PictureSeq=att.Seq And att.AttachmentType=5 ' +
        '   Left Join CroppedImages ci On pt.PictureSeq=ci.ImageSeq ' +
        'Where cp.[Type]=2 And (cp.IsHidden Is Null Or cp.IsHidden=0) And (' + GetSearchFields(searchTerm, wholeWord).join(' Or ') + ') ' +
        'Order By cp.[Date] Desc';
    var request = req.connection.request();
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error searching articles: ' + (err.message || err));
            res.send(500);
        } else {
            //adjust to actual display for now
            var articles = [];
            var pageSequences = [];
            for (var i = 0; i < recordset.length; i++) {
                var row = recordset[i];
                var pageSeq = row['Seq'];
                var rawUrl = row['ImageUrl'];
                var imageUrl = rawUrl == null ? null : settings.protocol + '://' + req.headers.host + row['ImageUrl'];
                articles.push({
                    seq: pageSeq,
                    mainImage: imageUrl,
                    title: row['Description'],
                    date: row['Date'],
                    description: row['SubCaption'],
                    sportFieldName: row['SportFieldName'],
                    authorName: row['AuthorName'],
                    tags: []
                });
                pageSequences.push(pageSeq);
            }
            ReadTags(pageSequences).then(function(tagMapping) {
                articles.forEach(function(article) {
                    article.tags = tagMapping[article.seq.toString()] || [];
                });
                res.send(articles);
            });
        }
    });
});

router.get('/sport-fields', function (req, res) {
    var qs = 'Select Seq, Name ' +
        'From SportFields ' +
        'Where Seq < 900 ' +
        'Order By [Name]';
    var request = req.connection.request();
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading sport fields: ' + (err.message || err));
            res.send(500);
        } else {
            //adjust to actual display for now
            var sportFields = [];
            for (var i = 0; i < recordset.length; i++) {
                var row = recordset[i];
                sportFields.push({
                    id: row['Seq'],
                    name: row['Name']
                });
            }
            res.send(sportFields);
        }
    });
});

router.get('/homepage-partners', function (req, res) {
    var pageSeq = settings.contentMapping.RoadTripPartners;
    if (!pageSeq) {
        logger.error('Road trip partners are not defined in settings');
        res.send(500);
        return;
    };
    var qs = 'Select cs.[Data] As Images ' +
        'From ContentPages cp Inner Join ContentSections cs On cs.PageSeq=cp.Seq ' +
        'Where cp.Seq=@seq And cs.[Type]=1';
    var request = req.connection.request();
    request.input('seq', pageSeq);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading homepage partners: ' + (err.message || err));
            res.send(500);
        } else {
            var images = [];
            if (recordset && recordset.length > 0) {
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    (row['Images'] + '').split(',').forEach(function(pictureSeq) {
                        var numericSeq = parseInt(pictureSeq, 10);
                        if (!isNaN(numericSeq) && numericSeq > 0) {
                            images.push(numericSeq);
                        }
                    });
                }
            }
            if (images.length > 0) {
                qs = 'Select \'/content/Images/' + pageSeq + '/\' + [FileName] As ImageUrl, ExternalLink\n' +
                    'From Attachments\n' +
                    'Where Seq In (' + images.join(', ') + ')';
                request = req.connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading homepage partner images: ' + (err.message || err));
                        res.send(500);
                    } else {
                        //adjust to actual display for now
                        var partners = [];
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var rawImage = row['ImageUrl'];
                            var imageUrl = rawImage ? settings.protocol + '://' + req.headers.host + rawImage : null;
                            partners.push({
                                imageUrl: imageUrl,
                                link: row['ExternalLink']
                            });
                        }
                        res.send(partners);
                    }
                });
            } else {
                res.send([]);
            }
        }
    });
});

router.get('/professional-material', function (req, res) {
    var pageSeq = settings.contentMapping.ProfessionalMaterial;
    var searchTerm = req.query.q;
    if (!pageSeq) {
        logger.error('Professional material page is not defined in settings');
        res.send(500);
        return;
    };
    var qs = 'Select cs.[Data] As Attachments ' +
        'From ContentPages cp Inner Join ContentSections cs On cs.PageSeq=cp.Seq ' +
        'Where cp.Seq=@seq And cs.[Type]=5';
    var request = req.connection.request();
    request.input('seq', pageSeq);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading professional material: ' + (err.message || err));
            res.send(500);
        } else {
            var attachmentIds = [];
            if (recordset && recordset.length > 0) {
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    (row['Attachments'] + '').split(',').forEach(function(attachmentSeq) {
                        var numericSeq = parseInt(attachmentSeq, 10);
                        if (!isNaN(numericSeq) && numericSeq > 0) {
                            attachmentIds.push(numericSeq);
                        }
                    });
                }
            }
            if (attachmentIds.length > 0) {
                var queries = attachmentIds.map(function(attachmentSeq) {
                    return 'Select Seq, [FileName], [FileSize], [DateUploaded], [Description]\n' +
                        'From Attachments\n' +
                        'Where Seq=' + attachmentSeq;
                });
                qs = queries.join('\nUNION ALL\n');
                request = req.connection.request();
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error reading professional material attachments: ' + (err.message || err));
                        res.send(500);
                    } else {
                        //adjust to actual display for now
                        var professionalMaterialAttachments = [];
                        for (var i = 0; i < recordset.length; i++) {
                            var row = recordset[i];
                            var fileName = row['FileName'];
                            var extension = fileName.split('.').slice(-1)[0];
                            var type = 0;
                            var link = settings.protocol + '://' + req.headers.host + '/content/Files/' + pageSeq + '/' + fileName;
                            switch (extension) {
                                case 'pdf':
                                    type = 1;
                                    break;
                                case 'doc':
                                case 'docx':
                                    type = 2;
                                    break;
                            }
                            professionalMaterialAttachments.push({
                                id: row['Seq'],
                                type: type,
                                link: link,
                                fileName: fileName,
                                fileSizeBytes: row['FileSize'],
                                date: row['DateUploaded'],
                                description: row['Description']
                            });
                        }
                        if (searchTerm) {
                            professionalMaterialAttachments = professionalMaterialAttachments.filter(function(x) {
                                return x.description.indexOf(searchTerm) >= 0;
                            });
                        }
                        res.send(professionalMaterialAttachments);
                    }
                });
            } else {
                res.send([]);
            }
        }
    });
});

router.get('/championship-category-details', function (req, res) {
    var category = req.query.category;
    if (category == null || !category) {
        res.sendStatus(400);
        return;
    }
    var qs = 'Select cc.CATEGORY, cc.CHAMPIONSHIP_ID, cm.CATEGORY_NAME, c.REGION_ID, c.SEASON, c.SPORT_ID ' +
        'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
        '   Left Join CATEGORY_MAPPING cm On cm.RAW_CATEGORY=cc.CATEGORY ' +
        'Where cc.DATE_DELETED Is Null And cc.CHAMPIONSHIP_CATEGORY_ID=@category';
    sportsman.CreateConnection().then(function(connection) {
        var request = connection.request();
        request.input('category', category);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading championship category details: ' + (err.message || err));
                res.send(500);
            } else {
                //adjust to actual display for now
                var categoryDetails = {};
                if (recordset.length === 1) {
                    var row = recordset[0];
                    categoryDetails = {
                        id: category,
                        category: row['CATEGORY'],
                        championship: row['CHAMPIONSHIP_ID'],
                        sport: row['SPORT_ID'],
                        region: row['REGION_ID'],
                        season: row['SEASON'],
                        name: row['CATEGORY_NAME']
                    };
                }
                res.send(categoryDetails);
            }
        });
    }, function(err) {
        res.send(500);
    });
});

router.get('/season-data', function (req, res) {
    var season = req.query.season || Season.current();
    if (season == null || !season) {
        res.sendStatus(400);
        return;
    }
    var qs = 'Select [NAME], [STATUS], [START_DATE], [END_DATE] ' +
        'From SEASONS ' +
        'Where DATE_DELETED Is Null And SEASON=@season';
    sportsman.CreateConnection().then(function (connection) {
        var request = connection.request();
        request.input('season', season);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading data for season ' + season + ': ' + (err.message || err));
                res.send(500);
            } else {
                if (recordset.length === 0) {
                    res.status(200).send({});
                } else {
                    var row = recordset[0];
                    res.status(200).send({
                        id: season,
                        name: row['NAME'],
                        status: row['STATUS'],
                        start: row['START_DATE'],
                        end: row['END_DATE']
                    });
                }
            }
        });
    }, function (err) {
        res.send(500);
    });
});

router.get('/game-result-seasons', function (req, res) {
    var region = req.query.region;
    var qs = 'Select c.SEASON, s.NAME, s.[STATUS], Count(cm.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
        'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
        '   Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
        '   Inner Join SEASONS s On c.SEASON=s.SEASON And s.DATE_DELETED Is Null ' +
        'Where cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null And c.SEASON>=' + settings.firstGameResultsSeason + ' ';
    if (region)
        qs += ' And c.REGION_ID=@region ';
    qs += 'Group By c.SEASON, s.NAME, s.[STATUS] ' +
        'Order By c.SEASON Asc';
    var currentSeason = Season.current();
    sportsman.CreateConnection().then(function(connection) {
        var request = connection.request();
        if (region)
            request.input('region', region);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading game result seasons: ' + (err.message || err));
                res.send(500);
            } else {
                //adjust to actual display for now
                var seasons = [];
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    var season = {
                        id: row['SEASON'],
                        name: row['NAME'],
                        status: row['STATUS'],
                        matches: row['MatchesCount']
                    };
                    season.current = season.id == currentSeason;
                    seasons.push(season);
                }
                if (seasons.length > 0) {
                    var currents = seasons.filter(s => s.current === true);
                    if (currents.length === 0)
                        seasons[seasons.length - 1].current = true;
                }
                res.send(seasons);
            }
        });
    }, function(err) {
        res.send(500);
    });
});

router.get('/game-result-sports', function (req, res) {
    var region = req.query.region;
    var season = req.query.season;
    var seasonFilter = season ? 'c.SEASON=@season' :
        'c.SEASON=(Select MAX(SEASON) From SEASONS Where DATE_DELETED Is Null And [STATUS]=1)';
    var qs = 'Select * From (' +
            '   Select c.SPORT_ID, s.SPORT_NAME, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
            '   From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
            '       Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
            '       Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
            '   Where cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null And ' + seasonFilter + ' ';
    if (region)
        qs += '     And c.REGION_ID=@region ';
    qs += '     Group By c.SPORT_ID, s.SPORT_NAME ';
    qs += '     Union All ' +
        '       Select c.SPORT_ID, s.SPORT_NAME, Count(cco.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
        '       From CHAMPIONSHIP_COMPETITIONS cco Inner Join CHAMPIONSHIP_CATEGORIES cca On cco.CHAMPIONSHIP_CATEGORY_ID=cca.CHAMPIONSHIP_CATEGORY_ID And cca.DATE_DELETED Is Null ' +
        '           Inner Join CHAMPIONSHIPS c On cca.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
        '           Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
        '       Where cco.DATE_DELETED Is Null And cco.[TIME] Is Not Null And ' + seasonFilter + ' ';
    if (region)
        qs += '     And c.REGION_ID=@region ';
    qs += '     Group By c.SPORT_ID, s.SPORT_NAME';
    qs += ') as a ';
    qs += 'Order By a.SPORT_NAME';
    sportsman.CreateConnection().then(function(connection) {
        var request = connection.request();
        if (region)
            request.input('region', region);
        if (season)
            request.input('season', season);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading game result sports: ' + (err.message || err));
                res.send(500);
            } else {
                //adjust to actual display for now
                var sports = [];
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    sports.push({
                        id: row['SPORT_ID'],
                        name: row['SPORT_NAME']
                    });
                }
                res.send(sports);
            }
        });
    }, function(err) {
        res.send(500);
    });
});

router.get('/game-result-championships', function (req, res) {
    var sport = parseInt(req.query.sport);
    var region = parseInt(req.query.region);
    var season = req.query.season;
    var seasonFilter = season ? 'c.SEASON=@season' :
        'c.SEASON=(Select MAX(SEASON) From SEASONS Where DATE_DELETED Is Null And [STATUS]=1)';
    if (!(region || sport) || region < 0 || sport < 0) {
        res.send(400);
        return;
    }

    // build SQL query
    var qs = 'Select * From (' +
        '   Select c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.REGION_ID, r.REGION_NAME, c.SPORT_ID, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
        '   From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
        '       Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
        '       Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
        '   Where cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null And ' + seasonFilter + ' ';
    // add more filters, if needed
    if (sport) {
        qs += ' And c.SPORT_ID=@sport ';
    }
    if (region >= 0) {
        qs += ' And c.REGION_ID=@region ';
    }
    // finalize query
    qs += ' Group By c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.REGION_ID, r.REGION_NAME, c.SPORT_ID ';
    qs += ' Union All ' +
        '       Select c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.REGION_ID, r.REGION_NAME, c.SPORT_ID, Count(cco.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
        '       From CHAMPIONSHIP_COMPETITIONS cco Inner Join CHAMPIONSHIP_CATEGORIES cca On cco.CHAMPIONSHIP_CATEGORY_ID=cca.CHAMPIONSHIP_CATEGORY_ID And cca.DATE_DELETED Is Null ' +
        '           Inner Join CHAMPIONSHIPS c On cca.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
        '           Inner Join REGIONS r On c.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
        '   Where cco.DATE_DELETED Is Null And cco.[TIME] Is Not Null And ' + seasonFilter + ' ';
    // add more filters, if needed
    if (sport) {
        qs += ' And c.SPORT_ID=@sport ';
    }
    if (region >= 0) {
        qs += ' And c.REGION_ID=@region ';
    }
    // finalize query
    qs += '   Group By c.CHAMPIONSHIP_ID, c.CHAMPIONSHIP_NAME, c.REGION_ID, r.REGION_NAME, c.SPORT_ID ';
    qs += ') as a ';
    qs += 'Order By a.CHAMPIONSHIP_NAME, a.REGION_NAME';

    sportsman.CreateConnection().then(function(connection) {
        var request = connection.request();
        request.input('sport', sport);
        if (region >= 0) {
            request.input('region', region);
        }
        if (season) {
            request.input('season', season);
        }
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading game result championships: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                //adjust to actual display for now
                var championships = [];
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    var champName = row['CHAMPIONSHIP_NAME'];
                    if (row['REGION_ID'] > 0) {
                        champName += ' (' + row['REGION_NAME'] + ')';
                    }
                    championships.push({
                        id: row['CHAMPIONSHIP_ID'],
                        name: champName,
                        regionId: row['REGION_ID'],
                        sportId: row['SPORT_ID']
                    });
                }
                res.send(championships);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/game-result-categories', function (req, res) {
    var championship = parseInt(req.query.championship);
    if (isNaN(championship) || championship <= 0) {
        res.send(400);
        return;
    }

    var qs = 'Select * From (' +
        '   Select cc.CHAMPIONSHIP_CATEGORY_ID, cmp.CATEGORY_NAME, Count(cm.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
        '   From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cc.DATE_DELETED Is Null ' +
        '       Inner Join CATEGORY_MAPPING cmp On cc.[CATEGORY]=cmp.RAW_CATEGORY ' +
        '   Where cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null And cc.CHAMPIONSHIP_ID=@championship ' +
        '   Group By cc.CHAMPIONSHIP_CATEGORY_ID, cmp.CATEGORY_NAME ' +
        '   Union All ' +
        '   Select cca.CHAMPIONSHIP_CATEGORY_ID, cmp.CATEGORY_NAME, Count(cca.CHAMPIONSHIP_CATEGORY_ID) As MatchesCount ' +
        '   From CHAMPIONSHIP_COMPETITIONS cco Inner Join CHAMPIONSHIP_CATEGORIES cca On cco.CHAMPIONSHIP_CATEGORY_ID=cca.CHAMPIONSHIP_CATEGORY_ID And cca.DATE_DELETED Is Null ' +
        '      Inner Join CATEGORY_MAPPING cmp On cca.[CATEGORY]=cmp.RAW_CATEGORY ' +
        '   Where cco.DATE_DELETED Is Null And cco.[TIME] Is Not Null And cca.CHAMPIONSHIP_ID=@championship ' +
        '   Group By cca.CHAMPIONSHIP_CATEGORY_ID, cmp.CATEGORY_NAME ';
    qs += ') as a ';
    qs += 'Order By a.CATEGORY_NAME';
    sportsman.CreateConnection().then(function(connection) {
        var request = connection.request();
        request.input('championship', championship);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading game result categories: ' + (err.message || err));
                res.send(500);
            } else {
                //adjust to actual display for now
                var categories = [];
                for (var i = 0; i < recordset.length; i++) {
                    var row = recordset[i];
                    categories.push({
                        id: row['CHAMPIONSHIP_CATEGORY_ID'],
                        name: row['CATEGORY_NAME']
                    });
                }
                res.send(categories);
            }
        });
    }, function(err) {
        res.send(500);
    });
});

router.get('/game-result-matches', function (req, res) {
    function ReadMatches(rows, phaseIndex, groupIndex, roundIndex, cycleIndex) {
        var matchingRows = rows.filter(function(row) {
            return row['PHASE'] === phaseIndex && row['NGROUP'] === groupIndex && row['ROUND'] === roundIndex && row['CYCLE'] === cycleIndex;
        });
        var matches = [];
        matchingRows.forEach(function(row) {
            var result = row['RESULT'];
            var facilityAddress = row['FACILITY_ADDRESS'] || '';
            var facilityCity = row['FACILITY_CITY'];
            if (facilityCity) {
                // add city if is not part of the address yet
                if (facilityAddress.length === 0) {
                    facilityAddress = facilityCity;
                } else if (facilityAddress.indexOf(facilityCity) < 0) {
                    facilityAddress += ' ' + facilityCity;
                }
            }
            var match = {
                index: row['MATCH'],
                date: [utils.PadZero(row['Day']), utils.PadZero(row['Month']), row['Year']].join('/'),
                hour: [utils.PadZero(row['Hour']), utils.PadZero(row['Minute'])].join(':'),
                facility: row['FACILITY_NAME'],
                facilityAddress: facilityAddress,
                team1: {
                    id: row['TEAM_A_ID'],
                    name: row['TEAM_A_NAME'],
                    score: result == null ? '' : row['TEAM_A_SCORE']
                },
                team2: {
                    id: row['TEAM_B_ID'],
                    name: row['TEAM_B_NAME'],
                    score: result == null ? '' : row['TEAM_B_SCORE']
                },
                result: result,
                smallPoints: utils.ParseSmallPoints(row['PARTS_RESULT']),
                gameNumber: row['match_number'],
                supervisorName: row['MatchSupervisorName'],
                supervisorPhone: row['MatchSupervisorPhone']
            };
            matches.push(match);
        });
        return matches;
    }

    var _cycleCounter = 0;
    function ReadCycles(rows, phaseIndex, groupIndex, roundIndex) {
        var matchingRows = rows.filter(function(row) {
            return row['PHASE'] === phaseIndex && row['NGROUP'] === groupIndex && row['ROUND'] === roundIndex;
        });
        var cycleMapping = {};
        var cycles = [];
        matchingRows.forEach(function(row) {
            var curCycleIndex = row['CYCLE'];
            if (!cycleMapping[curCycleIndex.toString()]) {
                cycles.push({
                    index: _cycleCounter,
                    Index: curCycleIndex,
                    name: row['CYCLE_NAME'],
                    matches: []
                });
                cycleMapping[curCycleIndex.toString()] = true;
            }
            _cycleCounter++;
        });
        cycles.forEach(function(cycle) {
            cycle.matches = ReadMatches(rows, phaseIndex, groupIndex, roundIndex, cycle.Index);
        });
        return cycles;
    }

    function ReadRounds(rows, phaseIndex, groupIndex) {
        var matchingRows = rows.filter(function(row) {
            return row['PHASE'] === phaseIndex && row['NGROUP'] === groupIndex;
        });
        var roundMapping = {};
        var rounds = [];
        matchingRows.forEach(function(row) {
            var curRoundIndex = row['ROUND'];
            if (!roundMapping[curRoundIndex.toString()]) {
                rounds.push({
                    index: curRoundIndex,
                    name: row['ROUND_NAME'],
                    cycles: []
                });
                roundMapping[curRoundIndex.toString()] = true;
            }
        });
        rounds.forEach(function(round) {
            round.cycles = ReadCycles(rows, phaseIndex, groupIndex, round.index);
        });
        return rounds;
    }

    function ReadGroups(rows, phaseIndex) {
        var matchingRows = rows.filter(function(row) {
            return row['PHASE'] === phaseIndex;
        });
        var groups = [];
        matchingRows.forEach(function(row) {
            var curGroupIndex = row['NGROUP'];
                groups.push({
                    index: curGroupIndex,
                    name: row['GROUP_NAME'],
                    rounds: ReadRounds([row], phaseIndex, curGroupIndex)
                });
            //}
        });
        //groups.forEach(function(group) {
        //    group.rounds = ReadRounds(rows, phaseIndex, group.index);
        //});

        var recent = {
            groupIndex: -1,
            roundIndex: -1,
            cycleIndex: -1,
            Cycle: null,
            Match: null,
            Group: null
        };
        groups.forEach(function(group) {
            var round = group.rounds[0];
            var cycle = round.cycles[0];
            if (group.index === recent.groupIndex && round.index === recent.roundIndex && cycle.Index === recent.cycleIndex) {
                //console.log('found same: ' + recent.Cycle.name);
                recent.Cycle.matches.push(cycle.matches[0]);
                group.delete = true;
            } else {
				recent.cycleIndex = cycle.Index;
				recent.Cycle = cycle;
				recent.groupIndex = group.index;
				recent.Group = group;
				recent.roundIndex = round.index;
			}
        });

        groups = groups.filter(function(group) {
            return !group.delete;
        });

        return groups;
    }

    function ReadPhases(rows) {
        var phaseMapping = {};
        var phases = [];
        rows.forEach(function(row) {
            var curPhaseIndex = row['PHASE'];
            if (!phaseMapping[curPhaseIndex.toString()]) {
                phases.push({
                    index:curPhaseIndex,
                    name: row['PHASE_NAME'],
                    groups: []
                });
                phaseMapping[curPhaseIndex.toString()] = true;
            }
        });
        phases.forEach(function(phase) {
            phase.groups = ReadGroups(rows, phase.index);
        });
        return phases;
    }

    function FindMatchTeam(match, allMatches, dataMapping, teamLetter) {
        var teamIndex = match['TEAM_' + teamLetter.toUpperCase() + '_INDEX'];
        if (teamIndex == null) {
            var relativeTeamIndex = match['relative_team_' + teamLetter.toLowerCase()];
            if (relativeTeamIndex != null) {
                var matchNumber = Math.abs(relativeTeamIndex);
                var matchingMatch = allMatches.find(m => {
                   return  m.match_number == matchNumber; //m.PHASE === match.PHASE && m.NGROUP === match.NGROUP && 
                });
                if (matchingMatch != null) {
                    var matchResult = matchingMatch.RESULT;
                    if (matchResult != null) {
                        var winnerIndex = null;
                        var loserIndex = null;
                        switch (matchResult) {
                            case 1:
                            case 3:
                                winnerIndex = matchingMatch.TEAM_A_INDEX;
                                loserIndex = matchingMatch.TEAM_B_INDEX;
                                break;
                            case 2:
                            case 4:
                                winnerIndex = matchingMatch.TEAM_B_INDEX;
                                loserIndex = matchingMatch.TEAM_A_INDEX;
                                break;
                        }
                        teamIndex = relativeTeamIndex > 0 ? winnerIndex : loserIndex;
                    } else {
                        var relativeName = (relativeTeamIndex > 0 ? 'מנצחת' : 'מפסידת') +
                            ' משחק ' + matchNumber;
                        //TEAM_ID
                        //TEAM_NAME
                        teamIndex = -1 * matchNumber;
                        var key = [match.PHASE, match.NGROUP, teamIndex].join('_');
                        dataMapping[key] = {
                            PHASE: match.PHASE,
                            NGROUP: match.NGROUP,
                            POSITION: teamIndex,
                            TEAM_ID: 0,
                            TEAM_NAME: relativeName
                        };
                    }
                } else {
                    //logger.log('verbose', 'no matching match for relative team ' + relativeTeamIndex + ', total matches: ' + allMatches.length);
                }
            }
        }
        if (teamIndex != null) {
            var key = [match.PHASE, match.NGROUP, teamIndex].join('_');
            return dataMapping[key] || null;
        }
        return null;
    }

    var category = parseInt(req.query.category);
    if (isNaN(category) || category <= 0) {
        res.send(400);
        return;
    }
    var qs = 'Select s.SPORT_TYPE ' +
        'From CHAMPIONSHIP_CATEGORIES cc Inner Join CHAMPIONSHIPS c On cc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null ' +
        '   Inner Join SPORTS s On c.SPORT_ID=s.SPORT_ID And s.DATE_DELETED Is Null ' +
        'Where cc.DATE_DELETED Is Null And cc.CHAMPIONSHIP_CATEGORY_ID=@category';
    sportsman.CreateConnection().then(function(connection) {
        var request = connection.request();
        request.input('category', category);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading sport type of category ' + category + ': ' + (err.message || err));
                res.send(500);
                return;
            }
            var sportType = recordset != null && recordset.length > 0 ? recordset[0]['SPORT_TYPE'] : null;
            if (sportType == null || (sportType != 1 && sportType != 2)) {
                res.status(400).send('Invalid championship category or missing sport type');
                return;
            }
            if (sportType == 1) {
                var url = settings.Sportsman.RawDataGatewayUrl + '?ccid=' + category; //'http://www.schoolsport.co.il:8080/GetData.aspx?ccid=' + category;
                httpRequest.get({url: url, json: true}, (err, getDataResponse, data) => {
                    if (err) {
                        logger.error('Error reading ranking tables: ' + (err.message || err));
                        res.send(500);
                    } else if (res.statusCode === 200) {
                        // you can use data here - already parsed as json
                        if (data.RankingTables == null) {
                            res.status(400).send('No data for this category');
                        } else {
                            var phases = [];
                            var competitorPhaseMapping = {};
                            if (data.Competitors != null) {
                                data.Competitors.forEach((competitor, index) => {
                                    var phaseKey = competitor.PhaseIndex.toString();
                                    var shirtNumberKey = competitor.ShirtNumber.toString();
                                    if (!competitorPhaseMapping[phaseKey])
                                        competitorPhaseMapping[phaseKey] = {};
                                    if (!competitorPhaseMapping[phaseKey][shirtNumberKey]) {
                                        competitorPhaseMapping[phaseKey][shirtNumberKey] = {
                                            shirtNumber: competitor.ShirtNumber,
                                            name: competitor.Name,
                                            team: competitor.TeamId,
                                            competitions: {}
                                        };
                                    }
                                    if (!competitorPhaseMapping[phaseKey][shirtNumberKey].competitions[competitor.CompetitionName]) {
                                        competitorPhaseMapping[phaseKey][shirtNumberKey].competitions[competitor.CompetitionName] = [];
                                    }
                                    competitorPhaseMapping[phaseKey][shirtNumberKey].competitions[competitor.CompetitionName].push({
                                        name: competitor.CompetitionName,
                                        position: competitor.Position,
                                        rawResult: competitor.Result,
                                        score: competitor.Score
                                    });
                                });
                                for (var rawPhaseIndex in competitorPhaseMapping) {
                                    var phaseCompetitors = [];
                                    for (var rawShirtNumber in competitorPhaseMapping[rawPhaseIndex]) {
                                        var phaseCompetitor = competitorPhaseMapping[rawPhaseIndex][rawShirtNumber];
                                        var competitorCompetitions = [];
                                        for (var competitionName in phaseCompetitor.competitions) {
                                            competitorCompetitions.push(phaseCompetitor.competitions[competitionName]);
                                        }
                                        phaseCompetitor.competitions = competitorCompetitions;
                                        phaseCompetitors.push(phaseCompetitor);
                                    }
                                    competitorPhaseMapping[rawPhaseIndex] = phaseCompetitors;
                                }
                            }
                            data.RankingTables.forEach((rankingTable, phaseIndex) => {
                                var competitions = [];
                                var teams = [];
                                var rankingTableRows = [];
                                var competitors = competitorPhaseMapping[phaseIndex.toString()] || [];
                                var groupMapping = {};
                                if (rankingTable.Competitions != null) {
                                    rankingTable.Competitions.forEach((competition, index) => {
                                        var competitorsRankingTable = null;
                                        if (competition.CompetitorsRanking != null) {
                                            competitorsRankingTable = {
                                                columns: competition.CompetitorsRanking.Headers || [],
                                                rows: (competition.CompetitorsRanking.Rows || []).map(row => row.CellValues || [])
                                            };
                                        }
                                        competitions.push({
                                            index: index,
                                            name: competition.Name,
                                            competitorsRankingTable: competitorsRankingTable
                                        });
                                        groupMapping[competition.GroupIndex.toString()] = competition.GroupName;
                                    });
                                }
                                if (rankingTable.Rows != null) {
                                    rankingTable.Rows.forEach((row, index) => {
                                        if (row.Team != null) {
                                            teams.push({
                                                id: row.Team.Id,
                                                name: row.Team.Name,
                                                group: row.Team.GroupIndex,
                                                position: row.Position,
                                                competitors: utils.ExcludeProperties(competitors.filter(competitor => competitor.team === row.Team.Id), ['team'])
                                            });
                                        }
                                        rankingTableRows.push(row.Values || []);
                                    });
                                }
                                var groups = [];
                                for (var groupIndex in groupMapping) {
                                    groups.push({
                                        index: parseInt(groupIndex, 10),
                                        name: groupMapping[groupIndex],
                                        teams: utils.ExcludeProperties(teams.filter(team => team.group === parseInt(groupIndex, 10)), ['group']),
                                        rankingTableRows: rankingTableRows
                                    });
                                }
                                phases.push({
                                    index: phaseIndex,
                                    name: rankingTable.PhaseName,
                                    rankingTableColumns: rankingTable.ColumnTitles || [],
                                    competitions: competitions,
                                    groups: groups
                                });
                            });
                            res.send(phases);
                        }
                    } else {
                        logger.error('Status of ' + res.statusCode + ' while reading competition category data');
                        res.send(res.statusCode);
                    }
                });
                return;
            }
            qs = 'Select cm.PHASE, cp.PHASE_NAME, cm.NGROUP, cg.GROUP_NAME, cm.[ROUND], cr.ROUND_NAME, cm.CYCLE, cc.CYCLE_NAME, cm.[MATCH], ' +
                '   cm.[TIME], cm.PARTS_RESULT, DATEPART(hour, cm.[TIME]) As "Hour", DATEPART(minute, cm.[TIME]) As "Minute", ' +
                '   DATEPART(day, cm.[TIME]) As "Day", DATEPART(month, cm.[TIME]) As "Month", DATEPART(year, cm.[TIME]) As "Year",  ' +
                '   cm.TEAM_A As TEAM_A_INDEX, cm.TEAM_B As TEAM_B_INDEX, cm.relative_team_a, cm.relative_team_b, cm.match_number, ' +
                '   cm.FACILITY_ID, cm.TEAM_A_SCORE, cm.TEAM_B_SCORE, cm.[RESULT], ' +
                '   f.FACILITY_NAME, f.ADDRESS As FACILITY_ADDRESS, fc.CITY_NAME As FACILITY_CITY, ' +
                '   match_supervisor.FUNCTIONARY_NAME As MatchSupervisorName, match_supervisor.PHONE As MatchSupervisorPhone ' +
                'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_CATEGORIES chc On cm.CHAMPIONSHIP_CATEGORY_ID=chc.CHAMPIONSHIP_CATEGORY_ID And chc.DATE_DELETED Is Null  ' +
                '   Inner Join CHAMPIONSHIPS c On chc.CHAMPIONSHIP_ID=c.CHAMPIONSHIP_ID And c.DATE_DELETED Is Null And c.CHAMPIONSHIP_STATUS>0 ' +
                '   Inner Join CHAMPIONSHIP_PHASES cp On cm.CHAMPIONSHIP_CATEGORY_ID=cp.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cp.PHASE ' +
                '   Inner Join CHAMPIONSHIP_GROUPS cg On cm.CHAMPIONSHIP_CATEGORY_ID=cg.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cg.PHASE And cm.NGROUP=cg.NGROUP ' +
                '   Inner Join CHAMPIONSHIP_ROUNDS cr On cm.CHAMPIONSHIP_CATEGORY_ID=cr.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cr.PHASE And cm.NGROUP=cr.NGROUP And cm.[ROUND]=cr.[ROUND] ' +
                '   Inner Join CHAMPIONSHIP_CYCLES cc On cm.CHAMPIONSHIP_CATEGORY_ID=cc.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cc.PHASE And cm.NGROUP=cc.NGROUP And cm.[ROUND]=cc.[ROUND] And cm.CYCLE=cc.CYCLE ' +
                '   Left Join FACILITIES f On cm.FACILITY_ID=f.FACILITY_ID And f.DATE_DELETED Is Null ' +
                '   Left Join CITIES fc On f.CITY_ID=fc.CITY_ID ' +
                '   Left Join CHAMPIONSHIP_MATCH_FUNCTIONARIES cmf On cm.CHAMPIONSHIP_CATEGORY_ID=cmf.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cmf.PHASE And cm.NGROUP=cmf.NGROUP And cm.[ROUND]=cmf.[ROUND] And cm.CYCLE=cmf.CYCLE And cm.MATCH=cmf.MATCH And cmf.[ROLE]=0 And cmf.DATE_DELETED Is Null ' +
                '   Left Join FUNCTIONARIES match_supervisor On cmf.FUNCTIONARY_ID=match_supervisor.FUNCTIONARY_ID And match_supervisor.DATE_DELETED Is Null ' +
                'Where cm.CHAMPIONSHIP_CATEGORY_ID=@category And cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null ' +
                'Order By Convert(date, cm.[TIME]), cm.PHASE, cm.NGROUP, cm.[ROUND], cm.CYCLE, f.FACILITY_NAME Asc, Convert(time, cm.[TIME])';
            request = connection.request();
            request.input('category', category);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error reading game result matches: ' + (err.message || err));
                    res.send(500);
                } else {
                    var matches = [];
                    for (var i = 0; i < recordset.length; i++) {
                        var match = utils.CopyRecord(recordset[i]);
                        matches.push(match);
                    }
                    if (matches.length > 0) {
                        qs = 'Select cgt.PHASE, cgt.NGROUP, cgt.[POSITION], cgt.TEAM_ID, ' +
                            '   dbo.BuildTeamName(s.SCHOOL_NAME, c.CITY_NAME, t.TEAM_INDEX, cg.GROUP_NAME, cgt.PREVIOUS_POSITION) As TEAM_NAME ' +
                            'From CHAMPIONSHIP_GROUP_TEAMS cgt Left Join TEAMS t On cgt.TEAM_ID=t.TEAM_ID And t.DATE_DELETED Is Null ' +
                            '   Left Join SCHOOLS s On t.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null ' +
                            '   Left Join CITIES c On s.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                            '   Left Join CHAMPIONSHIP_GROUPS cg On cgt.CHAMPIONSHIP_CATEGORY_ID=cg.CHAMPIONSHIP_CATEGORY_ID And cgt.PHASE-1=cg.PHASE And cgt.PREVIOUS_GROUP=cg.NGROUP ' +
                            'Where cgt.CHAMPIONSHIP_CATEGORY_ID=@category And cgt.DATE_DELETED Is Null';
                        request = connection.request();
                        request.input('category', category);
                        request.query(qs, function (err, recordset) {
                            if (err) {
                                logger.error('Error reading teams for game result matches: ' + (err.message || err));
                                res.send(500);
                            } else {
                                var dataMapping = {};
                                for (var i = 0; i < recordset.length; i++) {
                                    var row = recordset[i];
                                    var curData = utils.CopyRecord(row);
                                    var key = [row['PHASE'], row['NGROUP'], row['POSITION']].join('_');
                                    dataMapping[key] = curData;
                                }

                                matches.forEach(match => {
                                    var teamA = FindMatchTeam(match, matches, dataMapping, 'A');
                                    var teamB = FindMatchTeam(match, matches, dataMapping, 'B');
                                    if (teamA != null && teamB != null) {
                                        match.TEAM_A = teamA.TEAM_ID;
                                        match.TEAM_B = teamB.TEAM_ID;
                                        match.TEAM_A_ID = teamA.TEAM_ID;
                                        match.TEAM_B_ID = teamB.TEAM_ID;
                                        match.TEAM_A_NAME = teamA.TEAM_NAME;
                                        match.TEAM_B_NAME = teamB.TEAM_NAME;
                                    }
                                });
                                matches = matches.filter(match => match.TEAM_A_NAME != null && match.TEAM_B_NAME != null);
                                var phases = ReadPhases(matches);
                                res.send(phases);
                            }
                        });
                    } else {
                        res.send([]);
                    }
                }
            });
        });
    }, function(err) {
        res.send(500);
    });
});

router.get('/sportsman-data', function (req, res) {
    var url = 'http://www.schoolsport.org.il:8080/GetData.aspx';
    var parameters = [];
    for (var key in req.query) {
        if (req.query.hasOwnProperty(key)) {
            parameters.push(key + '=' + req.query[key]);
        }
    }
    if (parameters.length > 0) {
        url += '?' + parameters.join('&');
    }
    httpRequest.get({url: url, json: true}, (err, getDataResponse, data) => {
        if (err) {
            logger.error('Error reading sportsman data: ' + (err.message || err));
            res.send(500);
        } else if (res.statusCode === 200) {
            // you can use data here - already parsed as json
            res.status(200).send(data);
        } else {
            logger.error('Status of ' + res.statusCode + ' while reading sportsman data');
            res.sendStatus(res.statusCode);
        }
    });
});

router.get('/ranking-tables', function (req, res) {
    /**
     * @return {number}
     */
    function GetGameOutcome(gameResult, teamLetter) {
        if (gameResult != null) {
            switch (gameResult) {
                case 0:
                    return 3; //Draw
                case 1:
                    return teamLetter === 'A' ? 1 : 2; //Win or Lose
                case 2:
                    return teamLetter === 'B' ? 1 : 2; //Lose or Win
                case 3:
                    return teamLetter === 'A' ? 4 : 5; //Technical
                case 4:
                    return teamLetter === 'B' ? 4 : 5;
            }
        }
        return 0;
    }

    function GetGroupTeam(position, rawTeamData, columnIndexMapping, rowValues) {
        if (rawTeamData && rowValues) {
            //adjust to actual display for now
            var gamesColIndex = columnIndexMapping["games"];
            var winsColIndex = columnIndexMapping["wins"];
            var scoreColIndex = columnIndexMapping["score"];
            var drawsColIndex = columnIndexMapping["draws"];
            var losesColIndex = columnIndexMapping["loses"];
            var pointsForColIndex = columnIndexMapping["pointsFor"];
            var pointsAgainstColIndex = columnIndexMapping["pointsAgainst"];
            var setsForColIndex = columnIndexMapping["setsFor"];
            var setsAgainstColIndex = columnIndexMapping["setsAgainst"];
            var pointsFor = pointsForColIndex >= 0 ? rowValues[pointsForColIndex] : -1;
            var pointsAgainst = pointsAgainstColIndex >= 0 ? rowValues[pointsAgainstColIndex] : -1;
            var setsFor = setsForColIndex >= 0 ? rowValues[setsForColIndex] : -1;
            var setsAgainst = setsAgainstColIndex >= 0 ? rowValues[setsAgainstColIndex] : -1;
            // console.log(rawTeamData.Id);
            return {
                id: rawTeamData.Id,
                name: rawTeamData.Name,
                position: position,
                games: gamesColIndex >= 0 ? rowValues[gamesColIndex] : 0,
                wins: winsColIndex >= 0 ? rowValues[winsColIndex] : 0,
                score: scoreColIndex >= 0 ? rowValues[scoreColIndex] : 0,
                draws: drawsColIndex >= 0 ? rowValues[drawsColIndex] : 0,
                loses: losesColIndex >= 0 ? rowValues[losesColIndex] : 0,
                points: pointsFor >= 0 ? pointsFor : 0,
                pointsAgainst: pointsAgainst >= 0 ? pointsAgainst : 0,
                pointsDiff: pointsFor >= 0 && pointsAgainst >= 0 ? pointsFor - pointsAgainst : 0,
                pointsRatio: pointsFor >= 0 && pointsAgainst > 0 ? pointsFor / pointsAgainst : 0,
                sets: setsFor >= 0 ? setsFor : 0,
                setsAgainst: setsAgainst >= 0 ? setsAgainst : 0,
                setsDiff: setsFor >= 0 && setsAgainst >= 0 ? setsFor - setsAgainst : 0,
                setsRatio: setsFor >= 0 && setsAgainst > 0 ? setsFor / setsAgainst : 0,
                lastGamesOutcome: []
            };
        }
        return null;
    }

    var category = parseInt(req.query.category);
    var url = settings.Sportsman.RawDataGatewayUrl + '?ccid=' + category; //'http://www.schoolsport.co.il:8080/GetData.aspx?ccid=' + category;
    httpRequest.get({url: url, json: true}, (err, getDataResponse, data) => {
        if (err) {
            logger.error('Error reading ranking tables: ' + (err.message || err));
            res.send(500);
        } else if (res.statusCode === 200) {
            // you can use data here - already parsed as json
            var phases = [];
            var teamIds = [];
            if (data.RankingTables) {
                data.RankingTables.forEach(function (rankingTable) {
                    var phase = {
                        phaseName: rankingTable.PhaseName,
                        groups: []
                    };
                    var columnIndexMapping = {};
                    if (rankingTable.ColumnTitles) {
                        for (var colIndex = 0; colIndex < rankingTable.ColumnTitles.length; colIndex++) {
                            var title = rankingTable.ColumnTitles[colIndex];
                            switch (title) {
                                case "משחקים":
                                    columnIndexMapping["games"] = colIndex;
                                    break;
                                case "נצחונות":
                                case "ניצחונות":
                                case "נצחון":
                                case "ניצחון":
                                    columnIndexMapping["wins"] = colIndex;
                                    break;
                                case "ניקוד":
                                case "נקודות":
                                    columnIndexMapping["score"] = colIndex;
                                    break;
                                case "תיקו":
                                case "שיויון":
                                    columnIndexMapping["draws"] = colIndex;
                                    break;
                                case "הפסדים":
                                case "הפסד":
                                    columnIndexMapping["loses"] = colIndex;
                                    break;
                            }
                            if (title.indexOf('זכות') >= 0) {
                                if (title.indexOf("נק'") >= 0 || title.indexOf("נקודות") >= 0 || title.indexOf("סלי") >= 0) {
                                    columnIndexMapping["pointsFor"] = colIndex;
                                } else if (title.indexOf("מערכות") >= 0) {
                                    columnIndexMapping["setsFor"] = colIndex;
                                }
                            }
                            if (title.indexOf('חובה') >= 0) {
                                if (title.indexOf("נק'") >= 0 || title.indexOf("נקודות") >= 0 || title.indexOf("סלי") >= 0) {
                                    columnIndexMapping["pointsAgainst"] = colIndex;
                                } else if (title.indexOf("מערכות") >= 0) {
                                    columnIndexMapping["setsAgainst"] = colIndex;
                                }
                            }
                        }
                    }
                    if (rankingTable.Rows) {
                        rankingTable.Rows.forEach(function (row) {
                            if (row.Team) {
                                var groupName = row.GroupName;
                                var groupObject = phase.groups.find(function (x) {
                                    return x.name === groupName;
                                });
                                if (groupObject == null) {
                                    groupObject = {
                                        name: groupName,
                                        teams: []
                                    };
                                    phase.groups.push(groupObject);
                                }
                                groupObject.teams.push(GetGroupTeam(row.Position, row.Team, columnIndexMapping, row.Values));
                                teamIds.push(row.Team.Id);
                            }
                        });
                        phase.groups.forEach(function (groupObject) {
                            groupObject.teams.sort(function (t1, t2) {
                                var p1 = t1.position;
                                var p2 = t2.position;
                                if (p1 === p2)
                                    return 0;
                                if (p1 > p2)
                                    return 1;
                                return -1;
                            });
                        });
                    }
                    phases.push(phase);
                });
            }
            teamIds = Array.from(new Set(teamIds));
            // console.log(teamIds);
            if (teamIds.length > 0) {
                sportsman.CreateConnection().then(function (connection) {
                    var qs = 'Select cgt.TEAM_ID, cm.PHASE, cm.NGROUP, cm.RESULT, cm.[TIME], \'A\' As TeamLetter ' +
                        'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt On cm.CHAMPIONSHIP_CATEGORY_ID=cgt.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt.PHASE And cm.NGROUP=cgt.NGROUP And cm.TEAM_A=cgt.POSITION ' +
                        'Where cm.CHAMPIONSHIP_CATEGORY_ID=@category And cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null ' +
                        '   And cgt.TEAM_ID In (' + teamIds.join(', ') + ') ' +
                        'Union All ' +
                        'Select cgt.TEAM_ID, cm.PHASE, cm.NGROUP, cm.RESULT, cm.[TIME], \'B\' As TeamLetter ' +
                        'From CHAMPIONSHIP_MATCHES cm Inner Join CHAMPIONSHIP_GROUP_TEAMS cgt On cm.CHAMPIONSHIP_CATEGORY_ID=cgt.CHAMPIONSHIP_CATEGORY_ID And cm.PHASE=cgt.PHASE And cm.NGROUP=cgt.NGROUP And cm.TEAM_B=cgt.POSITION ' +
                        'Where cm.CHAMPIONSHIP_CATEGORY_ID=@category And cm.DATE_DELETED Is Null And cm.[TIME] Is Not Null ' +
                        '   And cgt.TEAM_ID In (' + teamIds.join(', ') + ') ' +
                        'Order By cm.[TIME] Desc';
                    var request = connection.request();
                    request.input('category', category);
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading recent games: ' + (err.message || err));
                            res.sendStatus(500);
                        } else {
                            var teamGameResultMapping = {};
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                var key = [row['PHASE'], row['NGROUP'], row['TEAM_ID']].join('_');
                                if (!teamGameResultMapping[key])
                                    teamGameResultMapping[key] = [];
                                var gameOutcome = GetGameOutcome(row['RESULT'], row['TeamLetter']);
                                if (gameOutcome > 0) {
                                    teamGameResultMapping[key].push(gameOutcome);
                                }
                            }
                            console.log(teamGameResultMapping);
                            var phaseIndex = 0;
                            phases.forEach(function (phase) {
                                var groupIndex = 0;
                                phase.groups.forEach(function (group) {
                                    group.teams.forEach(function (team) {
                                        var key = [phaseIndex, groupIndex, team.id].join('_');
                                        team.lastGamesOutcome = teamGameResultMapping[key] || [];
                                    });
                                    groupIndex++;
                                });
                                phaseIndex++;
                            });
                            res.send(phases);
                        }
                    });
                }, function (err) {
                    res.sendStatus(500);
                });
            } else {
                res.send(phases);
            }
        } else {
            logger.error('Status of ' + res.statusCode + ' while reading ranking tables');
            res.send(res.statusCode);
        }
    });
});

router.get('/hot-links', function (req, res) {
    sportsman.CreateConnection().then(function(sportsmanConnection) {
        var qs = 'Select Id As "id", Url As "linkUrl", Description As "description", DateCreated As "dateCreated", ImageUrl As "imageUrl" ' +
            'From HotLinks ' +
            'Where [Disabled] Is Null ' +
            'Order By Id Asc';
        var request = sportsmanConnection.request();
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error reading hot links: ' + (err.message || err));
                res.send(400);
            } else {
                res.send(recordset);
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

router.get('/sports', function (req, res) {
    var qs = 'Select Seq, [Name], ShortName From SportFields';
    var request = req.connection.request();
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading sport fields: ' + (err.message || err));
            res.send(400);
        }
        else {
            res.send(recordset);
        }
    });

    /*
     function ParseRawResponse(rawData) {
     if (rawData == null) {
     res.status(500).send('got null response from service');
     return null;
     }

     if (!rawData.GetSportsDataResult || !rawData.GetSportsDataResult.SimpleData) {
     res.status(500).send('response from service is not in expected format');
     return null;
     }

     return rawData.GetSportsDataResult.SimpleData;
     }

     var cacheKey = 'SchoolSportServices_SportsData';
     cache.read(cacheKey).then(function(sports) {
     logger.log('verbose', 'Taking ' + sports.length + ' sports from cache');
     res.send(sports);
     }, function() {
     consumer.sports.read().then(function(resp) {
     var allSports = ParseRawResponse(resp);
     if (allSports != null) {
     var sortedSports = allSports.map(function(x) {
     return {
     'Id': x.ID,
     'Name': x.Name
     };
     });
     sortedSports.sort(function(s1, s2) {
     return s1.Name.compareTo(s2.Name);
     });
     cache.write(cacheKey, sortedSports, settings.schoolSportServices.ExpireTimeSeconds).then(function() {
     res.send(sortedSports);
     }, function() {
     res.send(sortedSports);
     });
     }
     }, function(err) {
     res.status(400).send(err.message);
     });
     });
     */
});

router.get('/practice-camps-v5', function (req, res) {
    GetPracticeCamps(req.connection).then(function(practiceCamps) {
        res.send(practiceCamps);
    }, function(err) {
        res.sendStatus(500);
    });
});

router.post('/practice-camp-participant', function (req, res) {
    function VerifyParticipant(participant) {
        return new Promise(function (fulfil, reject) {
            var campId = parseInt(participant.camp, 10);
            if (isNaN(campId) || campId <= 0) {
                reject('Missing or illegal camp id');
                return;
            }
            console.log('Adding participant to camp ' + campId + '...');
            console.log(participant);
            GetPracticeCamps(req.connection).then(function(existingCamps) {
                var matchingCamp = existingCamps.find(function(c) { return c.id == campId; });
                if (matchingCamp == null) {
                    reject('This camp does not exist or not open for registration anymore');
                    return;
                }
                var name = (participant.name || '').trim();
                if (name.length === 0) {
                    reject('Missing name');
                    return;
                }
                var address = (participant.address || '').trim();
                if (address.length === 0) {
                    reject('Missing address');
                    return;
                }
                var email = (participant.email || '').trim();
                if (email.length === 0) {
                    reject('Missing email');
                    return;
                }
                if (!utils.IsValidEmail(email)) {
                    reject('Invalid email address');
                    return;
                }
                var cellular = (participant.cellular || '').trim();
                if (cellular.length === 0) {
                    reject('Missing cellular');
                    return;
                }
                var cardHolderName = (participant.cardHolderName || '').trim();
                if (cardHolderName.length === 0) {
                    reject('Missing card holder name');
                    return;
                }
                var cardHolderIdNumber = (participant.cardHolderIdNumber || '').trim();
                if (cardHolderIdNumber.length === 0) {
                    reject('Missing card holder id number');
                    return;
                }
                fulfil('OK');
            }, function(err) {
                reject(err);
            });
        });
    }
    var participant = req.body;
    //console.log('Got POST request for practice camp, type: ' + (typeof participant));
    //console.log(req.body);
    if (!participant.camp && (typeof participant === 'object')) {
        //maybe request from Angular, try to parse
        for (var key in participant) {
            if (key.indexOf('"camp"') > 0) {
                participant = JSON.parse(key);
                break;
            }
        }
    }
    VerifyParticipant(participant).then(function() {
        //verified
        sportsman.CreateConnection().then(function(sportsmanConnection) {
            var remarks = '';
            if (participant.coach)
                remarks = 'מאמן: ' + participant.coach;
            if (participant.hmo) {
                if (remarks.length > 0)
                    remarks += ', ';
                remarks += 'קופת חולים: ' + participant.hmo;
            }
            if (participant.parentName) {
                if (remarks.length > 0)
                    remarks += ', ';
                remarks += 'שם ההורה: ' + participant.parentName;
            }
            var qs = 'Insert Into PRACTICE_CAMP_PARTICIPANTS (' +
                '   PRACTICE_CAMP_ID, PARTICIPANT_NAME, PARTICIPANT_ADDRESS, PARTICIPANT_SCHOOL, PARTICIPANT_BIRTHDAY, ' +
                '   PARTICIPANT_PHONE, PARTICIPANT_CELL_PHONE, REMARKS, SEX_TYPE, PARTICIPANT_EMAIL, IS_CONFIRMED, ' +
                '   CARD_HOLDER_NAME, CARD_HOLDER_ID_NUMBER' +
                ') Values (' +
                '   @camp_id, @name, @address, @school, @birthday, @phone, @cellular, @remarks, @gender, @email, 0, ' +
                '   @cardHolderName, @cardHolderIdNumber' +
                ')';
            var request = sportsmanConnection.request();
            request.input('camp_id', participant.camp);
            request.input('name', participant.name);
            request.input('address', participant.address);
            request.input('school', participant.school);
            request.input('birthday', participant.birthdate);
            request.input('phone', participant.phone);
            request.input('cellular', participant.cellular);
            request.input('remarks', remarks);
            request.input('gender', participant.gender);
            request.input('email', participant.email);
            request.input('cardHolderName', participant.cardHolderName);
            request.input('cardHolderIdNumber', participant.cardHolderIdNumber);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error inserting v5 practice camp participant: ' + (err.message || err));
                    res.sendStatus(500);
                } else {
                    res.send('OK');
                }
            });
        }, function(err) {
            res.sendStatus(500);
        });
    }, function(err) {
        res.status(400).send(err);
    });
});

router.get('/hidden-practice-camps', function (req, res) {
    var type = req.query.type;
    var qs = 'Select PRACTICE_CAMP_ID From HiddenPracticeCamps';
    var request = req.connection.request();
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading hidden practice camps: ' + (err.message || err));
                res.send(400);
            }
            else {
                res.send(recordset);
            }
        });
});

router.get('/club-facility-data', function (req, res) {
    var qs = 'Select cfd.REGION_ID, cfd.SportFieldSeq, cfd.[WeekDay], sf.Name As SportFieldName, cfd.RawData ' +
        'From ClubFacilityData cfd Inner Join SportFields sf On cfd.SportFieldSeq=sf.Seq';
    var request = req.connection.request();
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading club facility data: ' + (err.message || err));
            res.send(500);
        }
        else {
            res.send(recordset);
        }
    });
});

router.get('/school-user-data', function (req, res) {
    sportsman.GetSchoolUserData(req.session.user.schoolSymbol).then(function(schoolUserData) {
        res.status(200).send(schoolUserData);
    }, function(err) {
        res.status(500).send(err);
    });
});

router.post('/toggle-practice-camp', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1])) {
        req.sendStatus(401);
        return;
    }

    var practiceCampID = req.body.PRACTICE_CAMP_ID;
    var qs = 'Select * From HiddenPracticeCamps Where PRACTICE_CAMP_ID=@id';
    var request = req.connection.request();
    request.input('id', practiceCampID);
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading hidden practice camp before toggling: ' + (err.message || err));
                res.sendStatus(500);
            } else {
                qs = '';
                if (recordset && recordset.length > 0 && recordset[0]['PRACTICE_CAMP_ID'] == practiceCampID) {
                    //delete
                    qs = 'Delete From HiddenPracticeCamps Where PRACTICE_CAMP_ID=@id'
                } else {
                    //insert
                    qs = 'Insert Into HiddenPracticeCamps (PRACTICE_CAMP_ID) Values (@id)'
                }
                request = req.connection.request();
                request.input('id', practiceCampID);
                request.query(qs, function (err, recordset) {
                    if (err) {
                        logger.error('Error toggling practice camp: ' + (err.message || err));
                        res.sendStatus(500);
                    } else {
                        res.send('OK');
                    }
                });
            }
        });
});

router.get('/tags', function (req, res) {
    var type = req.query.type;
    var qs = 'Select Seq, [Name], [Type] From Tags';
    if (type)
        qs += ' Where [Type]=@type';
    var request = req.connection.request();
    if (type)
        request.input('type', type);
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading tags: ' + (err.message || err));
                res.send(400);
            }
            else {
                res.send(recordset);
            }
        });
});

router.get('/contacts', function (req, res) {
    var type = req.query.type;
    var qs = 'Select c.Seq, c.[Picture] As PictureSeq, c.[Name], c.[Role], c.AboutMe, a.FileName As PictureName, c.Email, c.HomePage, ' +
        '    c.FacebookUrl, c.TwitterUrl, c.InstagramUrl, c.YouTubeUrl, c.LinkedInUrl ' +
        'From Contacts c Left Join Attachments a On c.[Picture]=a.Seq';
    var request = req.connection.request();
    if (type) {
        qs += ' Where c.ContactType=@type';
        request.input('type', type);
    }
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error reading contacts: ' + (err.message || err));
            res.send(400);
        }
        else {
            if (req.query.apply == 'pages') {
                var contacts = [];
                for (var i = 0; i < recordset.length; i++) {
                    var contact = {};
                    data.copyRecord(recordset[i], contact);
                    contacts.push(contact);
                }
                if (contacts.length > 0) {
                    var contactSequences = contacts.map(function(x) { return x.Seq; });
                    qs = 'Select PageSeq, [Data] As ContactSeq ' +
                        'From ContentSections ' +
                        'Where [Type]=6 And [Data] In (\'' + contactSequences.join('\', \'') + '\')';
                    request = req.connection.request();
                    request.query(qs, function (err, recordset) {
                        if (err) {
                            logger.error('Error reading contacts: ' + (err.message || err));
                        } else {
                            var pageMapping = {};
                            for (var i = 0; i < recordset.length; i++) {
                                var row = recordset[i];
                                pageMapping[row['ContactSeq'].toString()] = row['PageSeq'];
                            }
                            for (var i = 0; i < contacts.length; i++) {
                                var curContact = contacts[i];
                                if (curContact.PictureName) {
                                    var key = curContact.Seq.toString();
                                    if (pageMapping[key])
                                        curContact.PicturePageSeq = pageMapping[key];
                                }
                            }
                        }
                        res.send(contacts);
                    });
                } else {
                    res.send(contacts);
                }
            } else {
                res.send(recordset);
            }
        }
    });
});

router.get('/sportFieldColors', function (req, res) {
    var type = req.query.type;
    var qs = 'Select SportFieldSeq, [Color] From SportFieldColors';
    var request = req.connection.request();
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading sport field colors: ' + (err.message || err));
                res.send(400);
            }
            else {
                res.send(recordset);
            }
        });
});

router.get('/regionColors', function (req, res) {
    var type = req.query.type;
    var qs = 'Select RegionId, [Color] From RegionColors';
    var request = req.connection.request();
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading region colors: ' + (err.message || err));
                res.send(400);
            }
            else {
                res.send(recordset);
            }
        });
});

router.get('/pageTypes', function (req, res) {
    ReadPageTypes(req.connection).then(function(pageTypes) {
        res.send(pageTypes);
    }, function(err) {
        res.send(400);
    });
});

router.get('/content-mapping', function (req, res) {
    res.send(settings.contentMapping);
});

router.get('/logged-user', function (req, res) {
    var loggedUser = ReadLoggedUser(req.session);
    if (loggedUser != null) {
        loggedUser.Seq =  loggedUser.seq;
        loggedUser.Username =  loggedUser.name;
        loggedUser.DisplayName =  loggedUser.displayName;
        loggedUser.Role =  loggedUser.role;
        loggedUser.SchoolSymbol =  loggedUser.schoolSymbol;
    }
    res.send(loggedUser);
});

router.get('/eventsRange', function(req, res) {
    function LoadError(err) {
        res.status(400).send(err);
    }
    sportsman.EventsRange().then(function(sportsmanRange) {
        flowers.EventsRange().then(function(flowersRange) {
            var overallFirst = new Date(Math.min(sportsmanRange.First.getTime(), flowersRange.First.getTime()));
            var overallLast = new Date(Math.max(sportsmanRange.Last.getTime(), flowersRange.Last.getTime()));
            res.send({
                'SportsmanFirst': sportsmanRange.First,
                'SportsmanLast': sportsmanRange.Last,
                'FlowersFirst': flowersRange.First,
                'FlowersLast': flowersRange.Last,
                'OverallFirst': overallFirst,
                'OverallLast': overallLast
            });
        }, LoadError);
    }, LoadError);
});

router.get('/match-forms', function (req, res) {
    var category = req.query.category;
    var qs = 'Select CHAMPIONSHIP_CATEGORY_ID, match_number, ContentPath ' +
        'From MatchForms';
    if (category)
        qs += ' Where CHAMPIONSHIP_CATEGORY_ID=@category';
    var request = req.connection.request();
    if (category)
        request.input('category', category);
    request.query(qs,
        function (err, recordset) {
            if (err) {
                logger.error('Error reading match forms: ' + (err.message || err));
                res.send(400);
            }
            else {
                res.send(recordset);
            }
        });
});

router.post('/match-forms', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        req.sendStatus(401);
        return;
    }

    var category = req.body.Category;
    var matchNumber = req.body.Match;
    var contentPath = req.body.Path;
    var qs = 'Select IsNull(ContentPath, \'\') As ContentPath From MatchForms ' +
        'Where CHAMPIONSHIP_CATEGORY_ID=@category And match_number=@match';
    var request = req.connection.request();
    request.input('category', category);
    request.input('match', matchNumber);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error checking for existing form: ' + (err.message || err));
            res.sendStatus(500);
        } else {
            var exists = recordset && recordset.length > 0 && recordset[0]['ContentPath'] != null;
            qs = exists ?
                'Update MatchForms Set ContentPath=@path Where CHAMPIONSHIP_CATEGORY_ID=@category And match_number=@match' :
                'Insert Into MatchForms (CHAMPIONSHIP_CATEGORY_ID, match_number, ContentPath) Values (@category, @match, @path)';
            request = req.connection.request();
            request.input('category', category);
            request.input('match', matchNumber);
            request.input('path', contentPath);
            request.query(qs, function (err, recordset) {
                if (err) {
                    logger.error('Error ' + (exists ? 'updating' : 'inserting new') + ' match form: ' + (err.message || err));
                    res.sendStatus(500);
                } else {
                    res.send('OK');
                }
            });
        }
    });
});

router.delete('/match-forms', function (req, res) {
    if (!utils.VerifyUser(req.session.user, [1, 2])) {
        req.sendStatus(401);
        return;
    }

    var category = req.query.category;
    var matchNumber = req.query.match;
    var qs = 'Delete From MatchForms ' +
        'Where CHAMPIONSHIP_CATEGORY_ID=@category And match_number=@match';
    var request = req.connection.request();
    request.input('category', category);
    request.input('match', matchNumber);
    request.query(qs, function (err, recordset) {
        if (err) {
            logger.error('Error deleting match form: ' + (err.message || err));
            res.sendStatus(500);
        }
        else {
            res.send('OK');
        }
    });
});

router.post('/state', function (req, res) {
    if (req.session && req.session.user && req.session.user.seq) {
        var prevState = req.session.user.state;
        req.session.user.state = req.body.State;
        res.status(200).send({
            Previous: prevState
        });
    } else {
        res.sendStatus(401);
    }
});

router.get('/digital-signature-test', function (req, res) {
    var comsignDocumentId = req.query.documentId;
    if (comsignDocumentId == null || comsignDocumentId.length < 10) {
        logger.log('info', 'Got digital signature feedback, but no valid document id. (' + comsignDocumentId + ')');
        res.sendStatus(400);
        return;
    }
    logger.log('info', 'Digital signature feedback received, document id: ' + comsignDocumentId);
    res.send('test successful');
});

router.post('/digital-signature-test', function (req, res) {
    var comsignDocumentId = req.body.documentId;
    if (comsignDocumentId == null || comsignDocumentId.length < 10) {
        logger.log('info', 'Got digital signature feedback via POST, but no valid document id. (' + comsignDocumentId + ')');
        res.sendStatus(400);
        return;
    }
    comsignDocumentId = comsignDocumentId.replace('/Signed', '');
    while (comsignDocumentId.indexOf('/') >= 0)
        comsignDocumentId = comsignDocumentId.replace('/', '');
    logger.log('info', 'Digital signature feedback received via POST, document id: ' + comsignDocumentId);
    res.send('test successful');
});

router.post('/digital-signature', function (req, res) {
    var comsignDocumentId = req.body.documentId;
    if (comsignDocumentId == null || comsignDocumentId.length < 10) {
        res.sendStatus(400);
        return;
    }
    while (comsignDocumentId.indexOf('/') === 0)
        comsignDocumentId = comsignDocumentId.substring(1);
    while (comsignDocumentId.indexOf('//') >= 0)
        comsignDocumentId = comsignDocumentId.replace('//', '/');
    var signatureStatus = '';
    var temp = comsignDocumentId.split('/');
    if (temp.length > 1) {
        comsignDocumentId = temp[0];
        signatureStatus = temp[1];
    }
    sportsman.CreateConnection().then(function(sportsmanConnection) {
        var qs = 'Update DigitalSignatures ' +
            'Set DateLastSigned=GetDate(), [Status]=@status ' +
            'Where ComsignDocumentId=@doc';
        var request = sportsmanConnection.request();
        request.input('doc', comsignDocumentId);
        request.input('status', signatureStatus);
        request.query(qs, function (err, recordset) {
            if (err) {
                logger.error('Error updating last sign of document ' + comsignDocumentId + ': ' + (err.message || err));
                res.sendStatus(500);
            } else {
                logger.log('info', 'Comsign document ' + comsignDocumentId + ' last signature updated');
                res.send('OK');
            }
        });
    }, function(err) {
        res.sendStatus(500);
    });
});

module.exports = router;
