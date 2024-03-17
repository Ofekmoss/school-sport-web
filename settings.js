var isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    protocol: 'http',
    sqlConfig: {
        //user: 'mir',
        //password: 'a9ern$Deta',
        //server: '10.1.1.111',
        user: 'sa',
        password: 'a9ernAmo',
        server: 'localhost',
        database: 'SchoolSportWeb',
        options: {
//            encrypt: true
//        trustedConnection: 'Yes'
        }
    },
    logFile: 'D:\\BitBucket\\school-sport-web\\logs\\schoolsportweb.log',
    contentRoot: 'C:\\MIR\\SchoolSportWeb\\content',
    excelRoot: 'C:\\MIR\\SchoolSportWeb\\Excel',
    flowersAttachmentsFolder: 'C:\\MIR\\SportFlowers\\content\\attachments',
    schoolContent: 'C:\\MIR\\Testing\\SchoolSportWeb\\schools',
    cityContent: 'C:\\MIR\\Testing\\SchoolSportWeb\\cities',
    sportsmanLatestVersion: {
        Link: 'https://www.schoolsport.org.il/content/Files/106/Sportsman%201.431.exe',
        Version: '1.431'
    },
    sportFlowersDb: {
        //user: 'mir',
        //password: 'a9ern$Deta',
        //server: '10.1.1.111',
        user: 'sa',
        password: 'a9ernAmo',
        server: 'localhost',
        database: 'SportFlowers',
        options: {

        }
    },
    sportsmanDb: {
        /*
        user: 'SchoolSportService2',
        password: 'mir5869Amo',
        server: '192.168.0.2',
        database: 'SchoolSportDb',
        */
        user: 'sa',
        password: 'a9ernAmo',
        server: 'localhost',
        database: 'SchoolSportDb',
        options: {

        },
        MinuteOffset: 0
    },
    competitionsDb: {
        user: 'SchoolSportWebUser',
        password: 'schoolSport123456',
        server: '192.168.0.2',
        database: 'Competitions',
        options: {
            tdsVersion: "7_1"
        },
        MinuteOffset: 0
    },
    schoolSportServices: {
        ExpireTimeSeconds: 900,
        DataServiceUrl: 'http://www.schoolsport.co.il:8080/ISF/SportServices/DataService.asmx?wsdl'
    },
    footballService: {
        ServiceUrl: 'http://ext.football.org.il/IFAWS/IFAWS.asmx?wsdl',
        Username: 'Futsal',
        Password: 'ifa2018'
    },
    feedbackMail: {
        host: "mail.smtp2go.com",
        port: 465,
        secure: true,
        username: "schoolsportfeedback",
        password: "cTN0ZzJobXIydHMz",
        address: "yahav@mir.co.il",  //"isa@isa2000.org.il"
        name: "התאחדות הספורט לבתי ספר בישראל",
        subject: "משוב מאתר ההתאחדות",
        rateLimitSpan: 5, //minutes
        rateLimitAmount: 5
    },
    Sportsman: {
        UserOffset: 90000,
        RedirectRegistration: false,
        PlayerFilesFolder: 'D:\\BitBucket\\SchoolSport\\SportServices\\Pictures',
        PdfPreviewFolder: 'C:\\MIR\\SchoolSportWeb\\PDF',
        DataGatewayUrl: 'http://localhost/api/common/sportsman-data',
        RawDataGatewayUrl: 'http://localhost:52318/GetData.aspx',
        FootballSportFieldIds: [16, 17, 18, 79]
    },
    contentMapping: {
        IsfInfo: {
            Links: [
                {Seq: 51, Name: 'תקנון ומטרות ההתאחדות'},
                {Seq: 25, Name: 'פירוט מטרות מקצועיות התאחדות'},
                {Seq: 53, Name: 'מידע ועקרונות פעולה מועדוני ספורט בית ספריים'},
                {Seq: 54, Name: 'קוד אתי התאחדות הספורט לבתי ספר'},
                {Seq: 55, Name: 'דירקטוריון התאחדות הספורט לבתי ספר'},
                {Seq: 56, Name: 'צוות התאחדות בתי הספר'},
                {Seq: 57, Name: 'תבחינים לבחירת בתי ספר להפעלת תוכנית מיוחדת לכיתות ה-ו'},
                {Seq: 58, Name: 'קריטריונים לתגמול מאמנים מצטיינים'}
            ]
        },
        ClubForms: 75,
        BusinessPartners: 30,
        RoadTripPartners: 23,
        ProfessionalMaterial: 9,
        SeminarsAndConventions: 49,
        SportEvents: {
            Takanon: 18,
            Committees: 16
        },
        YoungSportsmen: {
            About: 28,
            PracticeCamp: {
                Intro: 29,
                Volleyball: 30,
                Athletics: 31,
                Handball: 32,
                Championships: 33
            }
        },
        SportFlowers: {
            ProfessionalMaterials: 19,
            Seminars: 20
        },
        Admin: {
            Downloads: 106
        }
    },
    v2test: false,
    sportFieldIcons: {
        "15": "flaticon-basketball-1",
        "16": "flaticon-volleyball-ball",
        "17": "flaticon-football-player-setting-ball",
        "18": "flaticon-handball",
        "19": "flaticon-beach-volleyball",
        "20": "flaticon-football-player-setting-ball",
        "21": "flaticon-ping-pong-1",
        "22": "flaticon-horse",
        "23": "flaticon-swimming-silhouett",
        "24": "flaticon-track-field",
        "25": "flaticon-runer-silhouette-running-fast",
        "26": "flaticon-weightlifting",
        "28": "flaticon-compass",
        "29": "flaticon-man-cycling",
        "30": "flaticon-tennis-raquet-and-ball",
        "31": "flaticon-fitness",
        "43": "flaticon-volleyball-ball",
        "46": "flaticon-basketball-1",
        "55": "flaticon-karate",
        "56": "flaticon-ball",
        "58": "flaticon-gymnastics",
        "66": "flaticon-net",
        "67": "flaticon-man-bowling",
        "70": "flaticon-basketball",
        "71": "flaticon-volleyball-ball",
        "72": "flaticon-beach-volleyball",
        "74": "flaticon-game",
        "76": "flaticon-shuttlecock",
        "77": "flaticon-game",
        "78": "flaticon-game",
        "79": "flaticon-football-field"
    },
    clubFormData: {
        paymentData: {
            installments: 4,
            lastPaymentDate: '28.12.2019'
        }
    },
    onePaymentPerCategorySports: [74, 76, 18],
    contentSiteBaseUrl: 'http://127.0.0.1:4200/#/',
    siteBaseUrl: 'http://127.0.0.1:5000',
    firstRegistrationSeason: 69,
    firstGameResultsSeason: 69,
    useChampionshipNameSportFields: [18],
    wesignUser: {
        email: 'guy@mir.co.il',
        password: 'rccrhj15!'
    },
    wesignApi: {
        baseUrl: 'https://wse.comsigntrust.com/api/v3',
        loginUrl: '/users/login',
        createTemplateUrl: '/templates',
        createDocumentCollection: '/documentcollections',
        contacts: '/contacts'
    }
};
