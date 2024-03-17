define ([], function() {
    var SelectionTypes = {
        None: 0,
        Single: 1,
        Multiple: 2
    };

    var TabTypes = {
        DASHBOARD: 0,
        TEAMS: 1,
        PLAYERS: 2,
        SCHOOLS: 3,
        CHAMPIONSHIPS: 4,
        PROJECTS: 5,
        TRANSFERS: 6
    };

    return {
        stateStr: 'manage:tabs:state',
        coachCertifications: {
            1: 'מורה לחנ"ג',
            2: 'מדריך/ה',
            3: 'מאמן/ת'
        },
        sportTypes: [
            {id: 1, name: 'ליגת מועדונים'},
            {id: 2, name: 'מפעלים / אירועים מחוזיים'},
            {id: 3, name: 'אליפות תיכוניים'},
            {id: 4, name: 'אליפויות ארציות'},
            {id: 10, name: 'כל הפרויקטים'},
            {id: 11, name: 'זוזו'},
            {id: 12, name: 'פכ"ל'},
            {id: 13, name: 'פל"א'},
            {id: 15, name: 'שווים בספורט'}
        ],
        coordinators: {
            1: {
                areaName: "ירושלים",
                name: "נועה פונדק",
                phone:"050-6356457",
                mail: "jerusalem@schoolsport.org.il",
                officePhone: "02-5601355"
            },
            2: {
                areaName: "צפון",
                name: "אוסנת קרסנטי אטיאס",
                phone:"050-6341541",
                mail: "osnatka@education.gov.il",
                officePhone: "04-6500314"
            },
            3: {
                areaName: "חיפה",
                name: "מתן נחמיאס",
                phone:"052-7457890",
                mail: "matan@schoolsport.org.il",
                officePhone: "04-8307556"
            },
            4: {
                areaName: "מרכז",
                name: "ליהיא שמחס",
                phone: "054-4737201",
                mail: "lihi@schoolsport.org.il",
                officePhone: "03-5619080"
            },
            5: {
                areaName: "תל אביב",
                name: "יורי שאינסקי",
                phone:"050-8188035",
                mail: "urishainski@schoolsport.org.il",
                officePhone: "050-8188035" //"03-6896734"
            },
            6: {
                areaName: "דרום",
                name: "אלי חכמון",
                phone:"052-2899253",
                mail: "elisport12@gmail.com",
                officePhone: "08-9760676"
            }
        },
        days: ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"],
        allCategoriesHebName: 'כל הקטגוריות',
        MaxTeamPlayers: 20,
        tabDefinitions: [
            {
                title: 'לוח בקרה',
                image: 'img/dashboard.svg',
                type: TabTypes.DASHBOARD,
                canInstantiate: false,
                permanent: true
            },
            {
                title: 'קבוצות',
                minimumFilter: 'championship',
                image: 'img/icon-teams.svg',
                type: TabTypes.TEAMS,
                canInstantiate: true,
                buttons: {
                    new: true,
                    export: true,
                    columnsSelect: true,
                },
                selectionType: SelectionTypes.Multiple,
                isSelectAll: false,
                columns: [
                    {
                        key: 'TeamNumber',
                        name: 'קבוצה',
                        active: true,
                        type: 'text',
                        linkToTab: '2',
                        linkParams: 'id'
                    },
                    {
                        key: 'School.School',
                        name: 'בית ספר',
                        active: true,
                        type: 'text',
                    }
                    ,{
                        key: 'School.SCHOOL_NAME',
                        name: 'שם בית ספר',
                        active: true,
                        type: 'text'
                    },
                    {
                        key: 'School.SYMBOL',
                        name: 'סמל בית ספר',
                        active: true,
                        type: 'text'
                    }
                    // ,{
                    //     key: 'coach.name',
                    //     name: 'מאמן',
                    //     active: true,
                    //     editable: true,
                    //     type: 'text',
                    //
                    // }
                    ,{
                        key: 'Coach.Email',
                        name: 'אימייל מאמן',
                        active: false,
                        type: 'text'
                    },{
                        key: 'Coach.PhoneNumber',
                        name: 'טלפון מאמן',
                        active: true,
                        type: 'text'
                    },{
                        key: 'Coach.Name',
                        name: 'שם מאמן',
                        active: false,
                        type: 'text',
                        editable: true
                    },
                    // {
                    //     key: 'CoachCertification',
                    //     name: 'המאמן עבר השתלמות',
                    //     lookup: {
                    //         "0": "לא",
                    //         "1": "כן"
                    //     }
                    // },
                    {
                        key: 'Facility.Name',
                        name: 'מתקן',
                        active: true
                    },
                    // {
                    //     key: 'facility.address',
                    //     name: 'כתובת מתקן',
                    //     active: false,
                    //     type: 'text'
                    // },
                    {
                        key: 'Facility.Id',
                        name: 'מזהה מתקן',
                        active: false,
                        type: 'text'
                    },{
                        key: 'AlternativeFacility.Name',
                        name: 'מתקן חלופי',
                        active: false,
                        type: 'text'
                    },{
                        key: 'AlternativeFacility.Address',
                        name: 'כתובת מתקן חלופי',
                        active: false,
                        type: 'text'
                    },
                    // {
                    //     key: 'school.principal',
                    //     name: 'מנהל/ת',
                    //     active: false,
                    //     type: 'text'
                    // },
                    {
                        key: 'Teacher.Name',
                        name: 'מורה אחראי',
                        active: false,
                        type: 'text'
                    },{
                        key: 'Teacher.PhoneNumber',
                        name: 'טלפון מורה אחראי',
                        active: false,
                        type: 'text'
                    },{
                        key: 'Teacher.Email',
                        name: 'מייל מורה אחראי',
                        active: false,
                        type: 'text'
                    },
                    {
                        key: 'ActivityTimes',
                        name: 'ימים ושעות פעילות',
                        active: true,
                        type: 'activity'
                    },
                    {
                        key: 'Sport.Name',
                        name: 'ענף ספורט',
                        active: true,
                        type: 'text',
                        options: 'sports'
                    },
                    // {
                    //     key: "order",
                    //     name: 'דרישת תשלום',
                    //     type: 'documentNumber',
                    //     active: true
                    // },
                    // {
                    //     name: 'סטטוס',
                    //     key: 'teamStatus',
                    //     active: true,
                    //     lookup: {
                    //         "1": "רשומה",
                    //         "2": "מאושרת"
                    //     },
                    //     type: 'text'
                    // },
                    // {
                    //     key: "approved",
                    //     name: 'אישור נציג',
                    //     type: 'teamApproved',
                    //     extras: { approved: 4 },
                    //     active: true
                    // },
                    // {
                    //     key: "approved",
                    //     name: 'אישור מנהל',
                    //     type: 'teamApproved',
                    //     extras: { approved: 2 },
                    //     active: true
                    // },
                    // {
                    //     key: "approved",
                    //     name: 'אישור מפקח',
                    //     type: 'teamApproved',
                    //     extras: { approved: 8, notApproved: 16 },
                    //     active: true
                    // }
                    {
                        key: 'Manager.Name',
                        name: 'מנהל',
                        active: false,
                        type: 'text'
                    },{
                        key: 'Manager.Email',
                        name: 'אימייל מנהל',
                        active: false,
                        type: 'text'
                    },{
                        key: 'Manager.PhoneNumber',
                        name: 'טלפון מנהל',
                        active: false,
                        type: 'text'
                    },
                    // {
                    //     key: 'chairman.name',
                    //     name: 'יו"ר',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'chairman.email',
                    //     name: 'אימייל יו"ר',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'chairman.phoneNumber',
                    //     name: 'טלפון יו"ר',
                    //     active: false,
                    //     type: 'text'
                    // },
                    // {
                    //     key: 'coordinator.name',
                    //     name: 'רכז',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'coordinator.email',
                    //     name: 'אימייל רכז',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'coordinator.phoneNumber',
                    //     name: 'טלפון רכז',
                    //     active: false,
                    //     type: 'text'
                    // }, {
                    //     key: 'representative.name',
                    //     name: 'נציג',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'representative.email',
                    //     name: 'אימייל נציג',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'representative.phoneNumber',
                    //     name: 'טלפון נציג',
                    //     active: false,
                    //     type: 'text'
                    // },{
                    //     key: 'createdAt',
                    //     name: 'תאריך הוספה',
                    //     active: false,
                    //     type: 'date',
                    // }
                ],
                newRecord: [
                    {
                        key: 'school',
                        name: 'בית ספר',
                        disabled: false,
                        required: true,
                        type: 'select', // select, text,
                        options: 'schools', //if type is select
                        data: null
                    },
                    {
                        key: 'sport',
                        name: 'ענף',
                        disabled: false,
                        required: true,
                        type: 'select', // select, text,
                        options: 'sports', //if type is select
                        data: null
                    },
                    {
                        key: 'category',
                        name: 'קטגוריה',
                        disabled: false,
                        required: true,
                        type: 'select', // select, text,
                        options: 'sports',
                        optionsFunc: function(sports, record){
                            var sportField = record[1];
                            if (sportField.data === null) {
                                return [];
                            }

                            var result = sports.find(function(sport){
                                return sport.id === sportField.data;
                            });

                            return result.categories;
                        },
                        data: null
                    },
                    // {
                    //     key: 'teamNumber',
                    //     name: 'קבוצה',
                    //     disabled: true,
                    //     required: false,
                    //     type: 'text', // select, text,
                    //     func: 'getTeamNumber', //prefill value from computation
                    //     data: null
                    // },
                    {
                        key: 'coachName',
                        name: 'שם מאמן',
                        disabled: false,
                        required: false,
                        type: 'text', // select, text,
                        data: null
                    },
                    {
                        key: 'coachPhoneNumber',
                        name: 'טלפון מאמן',
                        disabled: false,
                        required: false,
                        type: 'text', // select, text,
                        data: null,
                        pattern: '(^05[\\d]{8}$|^05[\\d]-[\\d]{7}$)'
                    },
                    {
                        key: 'coachEmail',
                        name: 'אימייל מאמן',
                        disabled: false,
                        required: false,
                        type: 'text', // select, text,
                        data: null,
                        pattern: '^.{1,}@.{1,}\\..{1,}$'
                    },
                    {
                        key: 'isEducated',
                        name: 'האם עבר השתלמות מאמן ללא תעודת הוראה?',
                        disabled: false,
                        required: false,
                        type: 'checkbox', // select, text, checkbox
                        data: null
                    },
                    {
                        key: 'day',
                        name: 'יום',
                        disabled: false,
                        required: false,
                        type: 'select', // select, text,
                        options:  [
                            { id: 0, name: "א'"},
                            { id: 1, name: "ב'"},
                            { id: 2, name: "ג'"},
                            { id: 3, name: "ד'"},
                            { id: 4, name: "ה'"},
                            { id: 5, name: "ו'"},
                            { id: 6, name: "ש'"}],
                        data: null
                    },
                    {
                        key: 'startHour',
                        name: 'שעות פעילות',
                        disabled: false,
                        required: false,
                        type: 'activity-times', // select, text, activity-times
                        startHours: [{id: 0, name: '12:00'}],
                        endHours: [{id: 0, name: '12:00'}],
                        calc: function() {},
                        data: {start: null, end: null}
                    }
                ],
                totalWidth: 10,
                records: []
            },
            {
                title: 'שחקנים',
                image: 'img/icon-players.svg',
                type: TabTypes.PLAYERS,
                canInstantiate: true,
                minimumFilter: 'championship',
                buttons: {
                    new: true,
                    export: true,
                    columnsSelect: true,
                },
                selectionType: SelectionTypes.Multiple,
                isSelectAll: false,
                columns: [
                    {
                        key: 'student.firstName',
                        name: 'שם פרטי',
                        active: true
                    },
                    {
                        key: 'student.lastName',
                        name: 'שם משפחה',
                        active: true
                    },
                    {
                        key: 'student.birthDate',
                        name: 'תאריך לידה',
                        type: 'date',
                        maxAge: true,
                        active: true
                    },
                    {
                        key: 'student.idNumber',
                        name: 'מספר זהות',
                        active: true
                    },
                    {
                        key: 'createdAt',
                        name: 'תאריך הוספה',
                        type: 'date',
                        active: true
                    },
                    /*
                    {
                        key: 'deletedAt',
                        name: 'תאריך הסרה',
                        type: 'date',
                        active: true
                    },
                    */
                    {
                        key: 'team.name',
                        name: 'שם קבוצה',
                        active: true
                    },
                    {
                        key: 'team.number',
                        name: 'קבוצה',
                        active: true
                    },
                    {
                        key: 'championship.region.name',
                        name: 'מחוז',
                        active: true
                    },
                    {
                        key: 'school.symbol',
                        name: 'סימול בית ספר',
                        active: true
                    },
                    {
                        key: 'championship.name',
                        name: 'אליפות',
                        active: true
                    },
                    {
                        key: 'championship.sport.name',
                        name: 'ענף ספורט',
                        active: false
                    },
                    {
                        key: 'Category.Name',
                        name: 'קטגוריה',
                        active: false,
                        type: 'text'
                    },
                    {
                        name: 'סטטוס',
                        key: 'playerStatus',
                        active: true,
                        type: '',
                        tooltip: true,
                        lookup: {
                            "1": "רשום",
                            "2": "אושר",
                            "3": "לא אושר",
                            "5": "ממתין לאישור העברה",
                            "9": "רישום הוסר"
                        }
                    },
                    {
                        name: 'תמונה',
                        key: 'picture',
                        active: true,
                        type: 'imageLink'
                    },
                    {
                        name: 'בדיקה רפואית',
                        key: 'medicalApproval',
                        active: true,
                        type: 'imageLink'
                    },
                    {
                        name: 'ספח ת"ז',
                        key: 'idSlip',
                        active: true,
                        type: 'imageLink'
                    }
                ],
                totalWidth: 10,
                records: []
            },
            {
                title: 'בתי ספר',
                image: 'img/icon-schools.svg',
                type: TabTypes.SCHOOLS,
                canInstantiate: true,
                buttons: {
                    new: true,
                    export: true,
                    columnsSelect: true,
                }
            },
            {
                title: 'אליפויות',
                image: 'img/icon-championships.svg',
                type: TabTypes.CHAMPIONSHIPS,
                canInstantiate: true,
                buttons: {
                    new: true,
                    export: true,
                    columnsSelect: true,
                },
                selectionType: SelectionTypes.Multiple,
                isSelectAll: false,
                columns: [
                    {
                        key: 'name',
                        name: 'שם אליפות',
                        active: true
                    },
                    {
                        key: 'region.name',
                        name: 'מחוז',
                        active: true
                    },
                    {
                        key: 'sport.name',
                        name: 'ענף ספורט',
                        active: true
                    },
                    {
                        key: 'isOpen',
                        name: 'סוג אליפות',
                        active: true
                    },
                    {
                        key: 'status',
                        name: 'סטטוס אליפות',
                        active: true
                    },
                    {
                        key: 'categories',
                        name: 'קטגוריות',
                        active: true
                    },
                    {
                        key: 'ruleset.name',
                        name: 'תקנון',
                        active: true
                    },
                    {
                        key: 'remarks',
                        name: 'הערות',
                        active: true
                    },
                    {
                        key: 'supervisor.name',
                        name: 'שם אחראי אליפות',
                        active: true
                    },
                    {
                        key: 'supervisor.email',
                        name: 'מייל אחראי אליפות',
                        active: true
                    },
                    {
                        key: 'dates.lastRegistration',
                        name: 'תאריך רישום אחרון',
                        type: 'date',
                        active: false
                    },
                    {
                        key: 'dates.start',
                        name: 'מועד פתיחת אליפות',
                        type: 'date',
                        active: false
                    },
                    {
                        key: 'dates.end',
                        name: 'מועד סיום אליפות',
                        type: 'date',
                        active: false
                    },
                    {
                        key: 'dates.finals',
                        name: 'מועד גמר',
                        type: 'date',
                        active: false
                    },
                    {
                        key: 'alternativeDates.start',
                        name: 'מועד פתיחה חלופי',
                        type: 'date',
                        active: false
                    },
                    {
                        key: 'alternativeDates.end',
                        name: 'מועד סיום חלופי',
                        type: 'date',
                        active: false
                    },
                    {
                        key: 'alternativeDates.finals',
                        name: 'מועד גמר חלופי',
                        type: 'date',
                        active: false
                    }
                ],
                totalWidth: 10,
                records: []
            },
            {
                title: 'העברות',
                image: 'img/user.svg',
                type: TabTypes.TRANSFERS,
                canInstantiate: true,
                buttons: {
                    new: true,
                    export: true,
                    columnsSelect: true,
                },
                selectionType: SelectionTypes.Multiple,
                isSelectAll: false,
                columns: [
                    {
                        key: "idNumber",
                        name: "ת.ז.",
                        active: true
                    },
                    {
                        key: "firstName",
                        name: "שם פרטי",
                        active: true
                    },
                    {
                        key: "lastName",
                        name: "שם משפחה",
                        active: true
                    },{
                        key: "birthDate",
                        name: "תאריך לידה",
                        type: "date",
                        active: true
                    },{
                        key: "grade",
                        name: "כיתה",
                        active: true,
                        lookup: {
                            "0": "א'",
                            "1": "ב'",
                            "2": "ג'",
                            "3": "ד'",
                            "4": "ה'",
                            "5": "ו'",
                            "6": "ז'",
                            "7": "ח'",
                            "8": "ט'",
                            "9": "י'",
                            "10": "י\"א",
                            "11": "י\"ב"
                        }
                    },{
                        key: 'school.name',
                        name: 'בית ספר מבקש',
                        active: true
                    },{
                        key: 'city',
                        name: 'רשות מבקשת',
                        active: true
                    },{
                        key: 'sport.name',
                        name: 'ענף ספורט',
                        active: true
                    },{
                        key: 'school.region',
                        name: 'מחוז מבקש',
                        active: true
                    }
                    ,{
                        key: 'school.symbol',
                        name: 'סמל מבקש',
                        active: true
                    },{
                        key: 'school.principal',
                        name: 'מנהל בית ספר מבקש',
                        active: false
                    },{
                        key: 'teacher.name',
                        name: 'מורה',
                        active: false
                    },{
                        key: 'teacher.phoneNumber',
                        name: 'טלפון מורה',
                        active: false
                    },{
                        key: 'teacher.email',
                        name: 'מייל מורה',
                        active: false
                    },{
                        key: 'currentSchool.name',
                        name: 'בית ספר נוכחי',
                        active: true
                    },{
                        key: 'currentCity',
                        name: 'רשות נוכחית',
                        active: true
                    },{
                        key: 'currentSchool.region',
                        name: 'מחוז נוכחי',
                        active: true
                    }
                    ,{
                        key: 'currentSchool.symbol',
                        name: 'סמל נוכחי',
                        active: true
                    }
                ],
                totalWidth: 10,
                records: []
            },
            {
                title: 'תכניות',
                image: 'img/icon-badge.svg',
                type: TabTypes.PROJECTS,
                canInstantiate: true,
                buttons: {
                    new: true,
                    export: true,
                    columnsSelect: true,
                },
                selectionType: SelectionTypes.Multiple,
                isSelectAll: false,
                columns: [
                    {
                        key: 'city.name',
                        name: 'שם רשות',
                        active: true
                    },
                    {
                        key: 'region.name',
                        name: 'מחוז',
                        active: true
                    },
                    {
                        key: 'items',
                        name: 'ענפי ספורט',
                        active: true
                    },
                    {
                        key: 'schoolCount',
                        name: 'בתי ספר',
                        active: true
                    },
                    {
                        key: 'teamCount',
                        name: 'כיתות',
                        active: true
                    },
                    {
                        key: 'studentCount',
                        name: 'תלמידים',
                        active: true
                    }
                ],
                totalWidth: 10,
                records: []
            },
        ],
        tabTypes: TabTypes
    }
});