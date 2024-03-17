var Schools = require('../schools');
var Facilities = require('../facilities');

var teams = [{"id":279,"school":null,"item1":"{\"name\":\"טניס\"}","item2":"{\"name\":\"מרכז הטניס\"}","item3":"{}","ages":3,"activity":[{"day":"0","endTime":1050,"startTime":990},{"day":"3","endTime":1050,"startTime":990}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.323Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:51.010Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4483,"name":"מרכז הטניס","address":null,"type":null},"coach":{"name":"קטיה מלכה","phoneNumber":"054-2479085","email":"wallaitamar@walla.co.il","gender":0,"certification":1}},{"id":280,"school":null,"item1":"{\"name\":\"טניס\"}","item2":"{\"name\":\"מרכז הטניס\"}","item3":"{\"alternativeFacility\":\"מרכז הטניס\"}","ages":24,"activity":[{"day":"0","endTime":1110,"startTime":1050},{"day":"3","endTime":1110,"startTime":1050}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.323Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:33.993Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4483,"name":"מרכז הטניס","address":null,"type":null},"coach":{"name":"יעל שחף","phoneNumber":"052-4490140","email":"gliziyael@gmail.com","gender":0,"certification":1}},{"id":281,"school":null,"item1":"{\"name\":\"טניס\"}","item2":"{\"name\":\"טניס\"}","item3":"{}","ages":12,"activity":[{"day":"0","endTime":1050,"startTime":990},{"day":"3","endTime":1050,"startTime":990}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.326Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:33.993Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4483,"name":"מרכז הטניס","address":null,"type":null},"coach":{"name":"יעל שחף","phoneNumber":"052-4490140","email":"gliziyael@gmail.com","gender":0,"certification":1}},{"id":282,"school":null,"item1":"{\"name\":\"טניס\"}","item2":"{\"name\":\"מרכז הטניס\"}","item3":"{}","ages":6,"activity":[{"day":"1","endTime":1170,"startTime":1110},{"day":"4","endTime":1170,"startTime":1110}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.330Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:33.996Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4483,"name":"מרכז הטניס","address":null,"type":null},"coach":{"name":"קטיה מלכה","phoneNumber":"054-2479085","email":"wallaitamar@walla.co.il","gender":0,"certification":1}},{"id":283,"school":null,"item1":"{\"name\":\"קארטה\",\"gender\":\"3\"}","item2":"{\"name\":\"הפועל באר שבע \"}","item3":"{}","ages":127,"activity":[{"day":"0","endTime":1200,"startTime":1140},{"day":"3","endTime":1200,"startTime":1140}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.330Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:33.996Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":228,"name":null,"address":null,"type":null},"coach":{"name":"פרדרג רוגוז'סקי","phoneNumber":"0535322200","email":"progozar@gmail.com","gender":1,"certification":1}},{"id":284,"school":null,"item1":"{\"name\":\"איגרוף\",\"gender\":\"3\"}","item2":"{\"name\":\"\"}","item3":"{}","ages":504,"activity":[{"day":"0","endTime":1260,"startTime":1110},{"day":"2","endTime":1260,"startTime":1170},{"day":"4","endTime":960,"startTime":900}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.333Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:34.000Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"דימה רזניקוב","phoneNumber":"054-4605091","email":"dima1777@gmail.com","gender":1,"certification":1}},{"id":285,"school":null,"item1":"{\"name\":\"איגרוף\",\"gender\":\"3\"}","item2":"{\"name\":\"הפועל באר שבע \"}","item3":"{}","ages":15,"activity":[{"day":"0","endTime":1170,"startTime":1080},{"day":"2","endTime":1170,"startTime":1080}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.333Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:34.000Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"דימה רזניקוב","phoneNumber":"054-4605091","email":"dima1777@gmail.com","gender":1,"certification":1}},{"id":294,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב \"}","item3":"{}","ages":31,"activity":[{"day":"0","endTime":1020,"startTime":960},{"day":"2","endTime":1020,"startTime":960}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.336Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.723Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך ","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":295,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב \"}","item3":"{}","ages":31,"activity":[{"day":"1","endTime":1020,"startTime":960},{"day":"3","endTime":1020,"startTime":960}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.340Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.723Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך ","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":296,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב\"}","item3":"{}","ages":31,"activity":[{"day":"0","endTime":1080,"startTime":1020},{"day":"2","endTime":1080,"startTime":1020}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.340Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.726Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך ","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":297,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב\"}","item3":"{}","ages":31,"activity":[{"day":"1","endTime":1080,"startTime":1020},{"day":"3","endTime":1080,"startTime":1020}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.340Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.726Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":299,"school":null,"item1":"{\"name\":\"אתלטיקה\"}","item2":"{\"name\":\"אתלטי הנגב\"}","item3":"{\"alternativeFacility\":\"בית ספר גבים \"}","ages":127,"activity":[{"day":"0","endTime":960,"startTime":900},{"day":"1","endTime":960,"startTime":900}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.343Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.730Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4484,"name":null,"address":null,"type":null},"coach":{"name":"ברוך ","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":300,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב \"}","item3":"{\"alternativeFacility\":\"ביה\\\"ס גבים \"}","ages":31,"activity":[{"day":"2","endTime":960,"startTime":900},{"day":"3","endTime":960,"startTime":900}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.346Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.730Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4485,"name":"","address":null,"type":null},"coach":{"name":"ברוך ","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":301,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב\"}","item3":"{}","ages":127,"activity":[{"day":"1","endTime":1140,"startTime":1080},{"day":"4","endTime":1140,"startTime":1080}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.346Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:22:14.730Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":304,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":\"אתלטי הנגב \"}","item3":"{}","ages":511,"activity":[{"day":"1","endTime":1200,"startTime":1140},{"day":"4","endTime":1200,"startTime":1140}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.350Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:48.920Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך ","phoneNumber":"BOSH1947@GMAIL.COM","email":"052-4606713","gender":1,"certification":1}},{"id":313,"school":null,"item1":"{\"name\":\"ג׳ודו\"}","item2":"{\"name\":\"אתגר בנגב\"}","item3":"{}","ages":127,"activity":[{"day":"0","endTime":1230,"startTime":1170},{"day":"1","endTime":1230,"startTime":1170}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:35:30.353Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:48.920Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4486,"name":"בית ספר אשכול ","address":null,"type":null},"coach":{"name":"אבי אגר ","phoneNumber":"054-9840498","email":"iritlavi135@gmail.com","gender":1,"certification":1}},{"id":314,"school":null,"item1":"{\"name\":\"ג׳ודו\",\"gender\":\"3\"}","item2":"{\"name\":\"אצגר בנגב\"}","item3":"{}","ages":126,"activity":[{"day":"0","endTime":1230,"startTime":1170},{"day":"2","endTime":1230,"startTime":1170}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:48.923Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.816Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4487,"name":"בית ספר אשכול","address":null,"type":null},"coach":{"name":"אבי אגר ","phoneNumber":"054-9840498","email":"iritlavi135@gmail.com","gender":1,"certification":1}},{"id":315,"school":null,"item1":"{\"name\":\"ג׳ודו\",\"gender\":\"3\"}","item2":"{\"name\":\"אתגר בנגב\"}","item3":"{}","ages":124,"activity":[{"day":"1","endTime":1200,"startTime":1140},{"day":"4","endTime":1200,"startTime":1140}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:48.923Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.820Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4486,"name":"בית ספר אשכול ","address":null,"type":null},"coach":{"name":"אבי אגר","phoneNumber":"054-9840498","email":"iritlavi135@gmail.com","gender":1,"certification":1}},{"id":316,"school":null,"item1":"{\"name\":\"ג׳ודו\"}","item2":"{\"name\":\"אתגר בנגב\"}","item3":"{}","ages":127,"activity":[{"day":"1","endTime":960,"startTime":900},{"day":"4","endTime":960,"startTime":900}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:48.926Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.820Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4486,"name":"בית ספר אשכול ","address":null,"type":null},"coach":{"name":"אבי אגר","phoneNumber":"054-9840498","email":"iritlavi135@gmail.com","gender":1,"certification":1}},{"id":317,"school":null,"item1":"{\"name\":\"ג׳ודו\",\"gender\":\"3\"}","item2":"{\"name\":\"אתגר בנגב\"}","item3":"{}","ages":124,"activity":[{"day":"2","endTime":1110,"startTime":1050},{"day":"4","endTime":1110,"startTime":1050}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:48.926Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.823Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4486,"name":"בית ספר אשכול ","address":null,"type":null},"coach":{"name":"אבי אגר","phoneNumber":"054-9840498","email":"iritlavi135@gmail.com","gender":1,"certification":1}},{"id":319,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מכבי באר שבע \"}","item3":"{}","ages":3,"activity":[{"day":"0","endTime":1020,"startTime":960},{"day":"2","endTime":1020,"startTime":960}],"approved":null,"approvals":{},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"רוי","phoneNumber":"roybengera@hotmail.com;","email":"052-6054768","gender":1,"certification":1}},{"id":321,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מכבי באר שבע \"}","item3":"{}","ages":6,"activity":[{"day":"0","endTime":1080,"startTime":1020},{"day":"2","endTime":1080,"startTime":1020}],"approved":null,"approvals":{},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"רוי","phoneNumber":"052-6054768","email":"052-6054768","gender":1,"certification":1}},{"id":324,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מכבי באר שבע \"}","item3":"{}","ages":3,"activity":[{"day":"1","endTime":1020,"startTime":960},{"day":"3","endTime":1020,"startTime":960}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.826Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.296Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"רוי ","phoneNumber":"roybengera@hotmail.com;","email":"052-6054768","gender":1,"certification":1}},{"id":326,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מכבי באר שבע \"}","item3":"{}","ages":56,"activity":[{"day":"0","endTime":1140,"startTime":1080},{"day":"4","endTime":1140,"startTime":1080}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.826Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.296Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"רוי ","phoneNumber":"roybengera@hotmail.com;","email":"roybengera@hotmail.com;","gender":1,"certification":1}},{"id":330,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מכבי באר שבע \"}","item3":"{}","ages":24,"activity":[{"day":"1","endTime":1140,"startTime":1080},{"day":"3","endTime":1140,"startTime":1080}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.830Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.296Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"רוי ","phoneNumber":"roybengera@hotmail.com;","email":"052-6054768","gender":1,"certification":1}},{"id":339,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מ.ס באר שבע \"}","item3":"{}","ages":7,"activity":[{"day":"0","endTime":1020,"startTime":960},{"day":"1","endTime":1020,"startTime":960}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.830Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.300Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4500,"name":null,"address":null,"type":null},"coach":{"name":"שלומי בן גרא ","phoneNumber":"052-6054771","email":"052-6054771","gender":1,"certification":1}},{"id":340,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true}","item2":"{\"name\":\"מ.ס באר שבע \"}","item3":"{}","ages":7,"activity":[{"day":"0","endTime":1020,"startTime":960},{"day":"1","endTime":1020,"startTime":960}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.833Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.300Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":4501,"name":null,"address":null,"type":null},"coach":{"name":"שלומי בן גרא ","phoneNumber":"052-6054771","email":"052-6054771","gender":1,"certification":1}},{"id":351,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"1\"}","item2":"{\"name\":\"הפועל באר שבע \"}","item3":"{}","ages":120,"activity":[{"day":"0","endTime":1080,"startTime":990},{"day":"1","endTime":1080,"startTime":990},{"day":"3","endTime":1080,"startTime":990},{"day":"4","endTime":1080,"startTime":990}],"approved":null,"approvals":{},"facility":{"id":732,"name":"אצטדיון וסרמיל","address":null,"type":null},"coach":{"name":"חאבייר רואה","phoneNumber":"050-7990445","email":"office@hbsfc.co.il","gender":1,"certification":1}},{"id":352,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"1\"}","item2":"{\"name\":\"הפועל באר שבע \"}","item3":"{}","ages":7,"activity":[{"day":"0","endTime":1200,"startTime":1110},{"day":"3","endTime":1200,"startTime":1110},{"day":"4","endTime":1200,"startTime":1110}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.840Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.300Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":732,"name":"אצטדיון וסרמיל","address":null,"type":null},"coach":{"name":"אלי אישה","phoneNumber":"050-3902023","email":"office@hbsfc.co.il","gender":1,"certification":1}},{"id":353,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"1\"}","item2":"{\"name\":\"הפועל באר שבע \"}","item3":"{}","ages":7,"activity":[{"day":"2","endTime":1200,"startTime":1110},{"day":"3","endTime":1200,"startTime":1110},{"day":"4","endTime":1200,"startTime":1110}],"approved":3,"approvals":{"project-team:1":{"userId":4015,"time":"2020-01-22T12:34:51.843Z","firstName":"אלימלך","lastName":"קסאי"},"project-team:2":{"userId":4106,"time":"2020-02-13T14:21:27.303Z","firstName":"אבי","lastName":"כליף"}},"facility":{"id":732,"name":"אצטדיון וסרמיל","address":null,"type":null},"coach":{"name":"מוטי דהן","phoneNumber":"052-6052031","email":"office@hbsfc.co.il","gender":1,"certification":1}},{"id":354,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"1\"}","item2":"{\"name\":\"הפועל באר שבע \"}","item3":"{}","ages":3,"activity":[{"day":"0","endTime":1200,"startTime":1110},{"day":"2","endTime":1200,"startTime":1110}],"approved":null,"approvals":{},"facility":{"id":732,"name":"אצטדיון וסרמיל","address":null,"type":null},"coach":{"name":"מישל פפיסמדוב","phoneNumber":"050-4504556","email":"office@hbsfc.co.il","gender":1,"certification":1}},{"id":355,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"3\"}","item2":"{\"name\":\"מ.ס באר שבע\"}","item3":"{}","ages":120,"activity":[{"day":"0","endTime":1140,"startTime":1080},{"day":"4","endTime":1140,"startTime":1080}],"approved":null,"approvals":{},"facility":{"id":4591,"name":"אמפי פארק","address":"אמפי","type":"מגרש"},"coach":{"name":"שלומי בן גרא","phoneNumber":"052-6054771","email":"luna11bg@gmail.com","gender":1,"certification":1}},{"id":453,"school":null,"item1":"{\"name\":\"אתלטיקה\"}","item2":"{\"name\":\"אתלטי הנגב\"}","item3":"{\"alternativeFacility\":\"מכללת קיי\"}","ages":15,"activity":[{"day":"2","endTime":1020,"startTime":960},{"day":"3","endTime":1110,"startTime":1050}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.180Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-23T09:53:10.136Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך שפירא","phoneNumber":"bebrit3@gmail.com","email":"0503993777","gender":1,"certification":1}},{"id":485,"school":null,"item1":"{\"name\":\"איגרוף\",\"gender\":\"1\"}","item2":"{\"name\":null}","item3":"{}","ages":504,"activity":[{"day":"0","endTime":1110,"startTime":1050},{"day":"2","endTime":1110,"startTime":1050}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.180Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.563Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4488,"name":"טאובל ","address":null,"type":null},"coach":{"name":"דימה רזניקוב","phoneNumber":"dima1777@gmail.com","email":"054-4605091","gender":1,"certification":1}},{"id":486,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":7,"activity":[{"day":"0","endTime":1140,"startTime":1020},{"day":"2","endTime":1140,"startTime":1020}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.183Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.570Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך שפירא","phoneNumber":"052-4606713","email":"bosh1947@gmail.com","gender":1,"certification":1}},{"id":487,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":28,"activity":[{"day":"1","endTime":1140,"startTime":1020},{"day":"3","endTime":1140,"startTime":1020}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.183Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.573Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך שפירא","phoneNumber":"052-4606713","email":"bosh1947@gmail.com","gender":1,"certification":1}},{"id":488,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":112,"activity":[{"day":"0","endTime":1170,"startTime":1080},{"day":"3","endTime":1170,"startTime":1080}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.183Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.576Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך שפירא","phoneNumber":"052-4606713","email":"bosh1947@gmail.com","gender":1,"certification":1}},{"id":489,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":480,"activity":[{"day":"0","endTime":1140,"startTime":1020},{"day":"2","endTime":1140,"startTime":1020}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.186Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.576Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך שפירא","phoneNumber":"052-4606713","email":"bosh1947@gmail.com","gender":1,"certification":1}},{"id":490,"school":null,"item1":"{\"name\":\"אתלטיקה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":448,"activity":[{"day":"2","endTime":1230,"startTime":1140},{"day":"4","endTime":1230,"startTime":1140}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.186Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.580Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":4385,"name":"מכללת קיי","address":"מכללת קיי באר שבע ","type":null},"coach":{"name":"ברוך שפירא","phoneNumber":"052-4606713","email":"bosh1947@gmail.com","gender":1,"certification":1}},{"id":491,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"2\"}","item2":"{\"name\":\"מכבי באר שבע נשים\"}","item3":"{}","ages":480,"activity":[{"day":"1","endTime":1230,"startTime":1140},{"day":"3","endTime":1230,"startTime":1140}],"approved":3,"approvals":{"project-team:2":{"userId":4106,"time":"2020-02-13T14:20:50.186Z","firstName":"אבי","lastName":"כליף"},"project-team:1":{"userId":4015,"time":"2020-01-22T12:30:45.583Z","firstName":"אלימלך","lastName":"קסאי"}},"facility":{"id":733,"name":"רייסר באר שבע","address":null,"type":null},"coach":{"name":"אורי היקלי","phoneNumber":"054-6590990","email":"ori444@013.net","gender":1,"certification":1}},{"id":492,"school":null,"item1":"{\"name\":\"כדורגל\",\"team\":true,\"gender\":\"2\"}","item2":"{\"name\":\"מכבי באר שבע נשים\"}","item3":"{}","ages":31,"activity":[{"day":"0","endTime":1110,"startTime":1020},{"day":"2","endTime":1110,"startTime":1020}],"approved":null,"approvals":{},"facility":{"id":733,"name":"רייסר באר שבע","address":null,"type":null},"coach":{"name":"אורי היקלי","phoneNumber":"054-6590990","email":"ori444@013.net","gender":1,"certification":1}},{"id":493,"school":null,"item1":"{\"name\":\"כדורסל\",\"team\":true,\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":28,"activity":[{"day":"0","endTime":1110,"startTime":1020},{"day":"2","endTime":1110,"startTime":1020}],"approved":null,"approvals":{},"facility":{"id":504,"name":"באר שבע - תיכון רגר","address":null,"type":null},"coach":{"name":"עמית רשף","phoneNumber":"amitreshef@gmail.com","email":"052-8375813","gender":1,"certification":1}},{"id":494,"school":null,"item1":"{\"name\":\"כדורסל\",\"team\":true,\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":112,"activity":[{"day":"1","endTime":1110,"startTime":1020},{"day":"3","endTime":1110,"startTime":1020}],"approved":null,"approvals":{},"facility":{"id":504,"name":"באר שבע - תיכון רגר","address":null,"type":null},"coach":{"name":"עמית רשף","phoneNumber":"amitreshef@gmail.com","email":"052-8375813","gender":1,"certification":1}},{"id":495,"school":null,"item1":"{\"name\":\"כדורסל\",\"team\":true,\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":112,"activity":[{"day":"2","endTime":1170,"startTime":1080},{"day":"4","endTime":1170,"startTime":1080}],"approved":null,"approvals":{},"facility":{"id":4561,"name":null,"address":null,"type":null},"coach":{"name":"עמית רשף","phoneNumber":"amitreshef@gmail.com","email":"052-8375813","gender":1,"certification":1}},{"id":496,"school":null,"item1":"{\"name\":\"כדורסל\",\"team\":true,\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":448,"activity":[{"day":"0","endTime":1230,"startTime":1140},{"day":"2","endTime":1230,"startTime":1140}],"approved":null,"approvals":{},"facility":{"id":247,"name":null,"address":null,"type":null},"coach":{"name":"עמית רשף","phoneNumber":"amitreshef@gmail.com","email":"052-8375813","gender":1,"certification":1}},{"id":497,"school":null,"item1":"{\"name\":\"כדורסל\",\"team\":true,\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":448,"activity":[{"day":"1","endTime":1230,"startTime":1140},{"day":"3","endTime":1230,"startTime":1140}],"approved":null,"approvals":{},"facility":{"id":247,"name":null,"address":null,"type":null},"coach":{"name":"עמית רשף","phoneNumber":"amitreshef@gmail.com","email":"052-8375813","gender":1,"certification":1}},{"id":498,"school":null,"item1":"{\"name\":\"קארטה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":28,"activity":[{"day":"0","endTime":1110,"startTime":1020},{"day":"3","endTime":1110,"startTime":1020}],"approved":null,"approvals":{},"facility":{"id":228,"name":null,"address":null,"type":null},"coach":{"name":"פרדרג רוגוז'סקי","phoneNumber":"progozar@gmail.com","email":"053-5322200","gender":1,"certification":1}},{"id":499,"school":null,"item1":"{\"name\":\"קארטה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":112,"activity":[{"day":"2","endTime":1170,"startTime":1080},{"day":"4","endTime":1170,"startTime":1080}],"approved":null,"approvals":{},"facility":{"id":228,"name":null,"address":null,"type":null},"coach":{"name":"פרדרג רוגוז'סקי","phoneNumber":"progozar@gmail.com","email":"053-5322200","gender":1,"certification":1}},{"id":500,"school":null,"item1":"{\"name\":\"קארטה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":224,"activity":[{"day":"0","endTime":1230,"startTime":1140},{"day":"2","endTime":1230,"startTime":1140}],"approved":null,"approvals":{},"facility":{"id":4562,"name":null,"address":null,"type":null},"coach":{"name":"פרדרג רוגוז'סקי","phoneNumber":"progozar@gmail.com","email":"053-5322200","gender":1,"certification":1}},{"id":501,"school":null,"item1":"{\"name\":\"קארטה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":448,"activity":[{"day":"1","endTime":1230,"startTime":1140},{"day":"4","endTime":1230,"startTime":1140}],"approved":null,"approvals":{},"facility":{"id":228,"name":null,"address":null,"type":null},"coach":{"name":"פרדרג רוגוז'סקי","phoneNumber":"progozar@gmail.com","email":"053-5322200","gender":1,"certification":1}},{"id":502,"school":null,"item1":"{\"name\":\"קארטה\",\"gender\":\"3\"}","item2":"{\"name\":null}","item3":"{}","ages":448,"activity":[{"day":"2","endTime":1230,"startTime":1140},{"day":"4","endTime":1230,"startTime":1140}],"approved":null,"approvals":{},"facility":{"id":228,"name":null,"address":null,"type":null},"coach":{"name":"פרדרג רוגוז'סקי","phoneNumber":"progozar@gmail.com","email":"053-5322200","gender":1,"certification":1}}];

var teams1 = [
    {
        item1: '{}',
        item2: '{}',
        item3: '{}',
        ages: 1000,
        studentCount: '12',
        id: 1
    }
];

var projects = {
    1: {
        "id": 51,
        "city": {
            "id": 247,
            "name": "אבו גוש",
            "symbol": '1234',
            "managerName": 'גיא קוסובר',
            "address": 'נס ציונה אשש'
        },
        "status": 1,
        "item1": "א",
        "item2": "א",
        "item3": "א",
        "manager": {
            "name": 'aaa',
            "phoneNumber": '0505050505',
            "email": 'l@ss.com'
        },
        "supervisor": {
            "name": 'aaa',
            "phoneNumber": '0505050505',
            "email": 'l@ss.com'
        },
        "schools": [
            {
                "id": 1000,
                "school": 51,
                "name": "מקיף אבו גוש",
                "symbol": "148080",
                "scheme": 0,
                "schemeDescription": 'תיאור חשוב',
                "details": {
                    "type": 3,
                    "address": "אבו-גוש",
                    "phoneNumber": '0505055050',
                    "fax": '0505055050',
                    "email": 'l@s',
                    canChange: true
                },
                "principal": {
                    "name": "t",
                    "phoneNumber": "0505055050",
                    "email": "l@s",
                    canChange: true
                },
                "coordinator": {
                    "name": "t",
                    "phoneNumber": "0505055050",
                    "email": "l@s",
                    canChange: true
                }
            },
            {
                "id": 1001,
                "school": 4574,
                "name": "טכנולוגי הארמון",
                "symbol": "268029",
                "scheme": 2,
                "schemeDescription": 'תיאור חשוב',
                "details": {
                    "type": null,
                    "address": "אבו גוש רח' הואדי 14 90845",
                    "phoneNumber": "02-5790852",
                    "fax": "02-5346152",
                    "email": "",
                    canChange: true
                },
                "principal": {
                    "name": null,
                    "phoneNumber": null,
                    "email": null
                },
                "coordinator": {
                    "name": null,
                    "phoneNumber": null,
                    "email": null
                },
                teams: teams1
            }
        ]
    },
    3: {
        id: 1,
        name: 'רשות',
        symbol: '1234',
        managerName: 'גיא קוסובר',
        address: 'האילנות כפר סירקין',
        socioEconomicRank: 3,
        status: 0,
        geographicIndex: 3,
        item1: '{"tp":"10000","ep":"1000","ecp":"200","cp":"2000"}',
        manager: { name: 'מר מנהל', phoneNumber: "0521245670", email: "manager@gmail.com"},
        supervisor: { name: 'מר מפקח', phoneNumber: "0521245671", email: "supervisor@gmail.com"},
        teams: teams,
        city: {
            address: "בדיקה2",
            geographicIndex: 1,
            id: 352,
            managerName: "בדיקה1",
            name: "גזית",
            socioEconomicRank: 2,
            symbol: 123
        }
    }

};

var sports = [
    { id: 1, name: 'כדורגל' },
    { id: 2, name: 'כדורסל' },
    { id: 3, name: 'כדורעף' },
    { id: 4, name: 'שחיה' },
    { id: 5, name: 'זריקת אבנים' },
    { id: 6, name: 'ריצה מהירה' }
];

var peleStage = 1;

function ProjectRegistration() {
}

ProjectRegistration.prototype.getProjectRegistration = function (projectId, cityId, options, callback) {
    var result = projects[projectId];
    if (!result) {
        projects[projectId] = result = {};
    }

    callback(null, result);
};

ProjectRegistration.prototype.updateProjectRegistration = function (projectId, cityId, data, callback) {
    var project = projects[projectId];
    if (!project) {
        projects[projectId] = project = {};
    }

    if (!(data.status && Object.keys(data).length == 1)) {
        project.city = data.city;
        project.manager = data.manager;
        project.supervisor = data.supervisor;

        project.item1 = data.item1;
        project.item2 = data.item2;
        project.item3 = data.item3;
        project.status = data.status;
    }

    callback(null, {status: project.status});
};

ProjectRegistration.prototype.insertProjectSchool = function (projectId, cityId, data, callback) {

    if (data.school) {
        Schools.get(data.school, function (err, school) {
            if (err) {
                callback(err);
            }
            else if (!school) {
                callback("School not found");
            }
            else {
                var project = projects[projectId];
                if (!project) {
                    projects[projectId] = project = {};
                }

                if (!project.schools) {
                    project.schools = [];
                }

                data.id = data.school;
                data.name = school.name;
                data.symbol = school.symbol;
                project.schools.push(data);

                callback();
            }
        });
    }
    else {
        callback("School is missing");
    }
};

ProjectRegistration.prototype.getProjectSchool = function (projectId, cityId, school, callback) {
    var project = projects[projectId];

    if (project && project.schools) {
        for (var i = 0; i < project.schools.length; i++) {
            var school = project.schools[i];
            if (school.id == school) {
                callback(null, school);
                return
            }
        }
    }
    callback({status: 404, message: "School not found in project"});
};

ProjectRegistration.prototype.updateProjectSchool = function (projectId, cityId, school, data, callback) {
    var project = projects[projectId];

    var school = null;
    if (project && project.schools) {
        for (var i = 0; i < project.schools.length; i++) {
            var s = project.schools[i];
            if (s.id == school) {
                school = s;
                break;
            }
        }
    }

    if (school == null) {
        callback({status: 404, message: "School not found in project"});
        return;
    }

    if (data.details) {
        if (school.details && !school.details.canChange) {
            callback({status: 403, message: "Error updating school details"});
            return;
        }
        school.details = data.details;
        school.details.canChange = true;
    }
    if (data.principal) {
        if (school.principal && !school.principal.canChange) {
            callback({status: 403, message: "Error updating school contacts"});
            return;
        }
        school.principal = data.principal;
        school.principal.canChange = true;
    }
    if (data.coordinator) {
        school.coordinator = data.coordinator;
    }
    if (data.scheme != null) {
        school.scheme = data.scheme;
        school.schemeDescription = data.schemeDescription;
    }
    if (!school.stage) {
        school.stage = 1;
    }
    callback();
};

ProjectRegistration.prototype.getProjectTeams = function(projectId, cityId, withPlayers, callback){
    var teams = projects[projectId].teams;
    if (withPlayers) {
        for (var n = 0; n < teams.length; n++) {
            var team = teams[n];
            if (!team.players) {
                team.players = [];
            }
        }
    }

    teams.forEach(function(team){
        Facilities.getFacilitiesByCity(null, function(val, facilities) {
            var facility = facilities.find(function(f){return f.id == team.facility.id});
            team.facility = Object.assign({}, facility);
        });
    });
    callback(null, teams);
};

ProjectRegistration.prototype.insertProjectPlayer = function(projectId, cityId, teamId, player, callback){
    var teams = projects[projectId].teams;
    var t = teams.find(function(team) {
        return team.id == teamId;
    });

    var id = 1;
    for (var n = 0; n < t.players.length; n++) {
        var p = t.players[n];

        if (p.id >= id) {
            id = p.id + 1;
        }
    }
    player.id = id;
    t.players.push(player);
    callback(null, {id: id});
};

ProjectRegistration.prototype.updateProjectPlayer = function(projectId, cityId, teamId, playerId, player, callback){
    var teams = projects[projectId].teams;
    var t = teams.find(function(team) {
        return team.id == teamId;
    });

    var p = t.players.find(function (player) {
        return player.id == playerId;
    });
    if (p) {
        p.firstName = player.firstName;
        p.lastName = player.lastName;
        p.idNumberType = player.idNumberType;
        p.idNumber = player.idNumber;
        p.birthDate = player.birthDate;
        p.gender = player.gender;
        p.item1 = player.item1;
    }
    callback();
};

ProjectRegistration.prototype.deleteProjectPlayers = function(projectId, cityId, teamId, players, callback){
    var teams = projects[projectId].teams;
    var t = teams.find(function(team) {
        return team.id == teamId;
    });

    players.forEach(function(playerId) {
        for (var i = 0; i < t.players.length; i++) {
            if (t.players[i].id === playerId) {
                t.players.splice(i, 1);
                break;
            }
        }
    });

    callback(null, true);
};

ProjectRegistration.prototype.deleteProjectTeams = function(projectId, cityId, teamsToRemove, callback) {
    var project = projects[projectId];
    teamsToRemove.forEach( function(teamId) {
        project.teams = project.teams.filter(function(team){
            return team.id !== teamId
        });
    });

    callback(null, true);
};

ProjectRegistration.prototype.insertProjectTeam = function(projectId, cityId, data, callback) {
    var project = projects[projectId];
    var newTeamId = 0;
    // data.id = 1;

    if (projectId == 3) {

        for (var n = 0; n < project.teams.length; n++) {
            var team = project.teams[n];
            if (team.id >= newTeamId) {
                newTeamId = team.id + 1;
            }
        }
        if (data.facility && !data.facility.id) {
            Facilities.insertFacility(null, data.facility, function(val, res) {
                data.facility.id = res.id;
            });
        }
        data.id = newTeamId;
        project.teams.push(data);

    } else if (projectId == 1) {
        var school = project.schools.map(function(school) {
            return school.id
        }).indexOf(data.school);

        if (!project.schools[school].teams) {
            project.schools[school].teams = [];
        }

        project.schools[school].teams.forEach(function(team){
            if (team.id > newTeamId){
                newTeamId = team.id;
            }
        });
        newTeamId++;
        data.id = newTeamId;
        project.schools[school].teams.push(data);
    }

    callback(null, {id: newTeamId});

};


ProjectRegistration.prototype.updateProjectTeam = function(projectId, cityId, teamId, data, callback) {
    var project = projects[projectId];
    var team = {};
    if (projectId == 3) {
        team = project.teams.find(function(t) { return t.id == teamId});
    } else {
        var school = project.schools.map(function(school) {
            return school.id
        }).indexOf(data.school);
        var teamIndex = project.schools[school].teams.map(function(team){
            return team.id
        }).indexOf(data.id);

        team = project.schools[school].teams[teamIndex];
    }
    team.isGroupSport = data.isGroupSport;
    team.gender = data.gender;
    team.ages = data.ages;
    team.studentCount = data.studentCount;
    team.item1 = data.item1;
    team.item2 = data.item2;
    team.item3 = data.item3;
    team.activity = data.activity;
    team.coach = data.coach;

    if (data.facility && !data.facility.id) {
        Facilities.insertFacility(null, data.facility, function (val, res) {
            team.facility.id = res.id;
            callback(null, true);
        });
    } else {
        team.facility = data.facility;
        callback(null, true);
    }
};

ProjectRegistration.prototype.readPeleSports = function (cityId, callback) {
    callback(null, sports);
};

ProjectRegistration.prototype.saveProject = function (cityId, project, callback) {
    callback(null, true);
};


module.exports = new ProjectRegistration();