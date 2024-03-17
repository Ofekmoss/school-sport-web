
function Finance() {

}


var teamPayments = [
    {
        payment: 19000019,
        order: 19000033,
        school: {
            symbol: "999999",
            name: "בית ספר בדיקה",
            region: "מחוז אחלה"
        },
        payerName: "מנהל בית ספר",
        details: {
            contacts: [
                {name: "מר מנהל", phoneNumber: "03-9999999", email: "principal@mail.com"}
            ]
        },
        totalAmount: 2000
    }
];

var products = [
    {id: 1, name: "רישום קבוצה לאליפות ארצית", price: 250},
    {id: 2, name: "רישום תלמיד בודד לתחרות", price: 20},
    {id: 3, name: " רישום מועדון חדש", price: 600},
    {id: 4, name: "הרשמה למחנה אימון", price: 345},
    {id: 5, name: "רישום קבוצה לליגת מועדונים", price: 500},
    {id: 6, name: "רישום לליגת על", price: 1000},
    {id: 7, name: "רישום למפעלי ספורט", price: 55},
    {id: 8, name: "רישום לכדורגל", price: 250},
    {id: 9, name: "רישום לשחמט", price: 200},
    {id: 13, name: "הרשמה להשתלמות ארצית", price: 50},
    {id: 14, name: "הרשמה מראש ל - 20 שע'", price: 125},
    {id: 15, name: "מנוי חופשי להשתלמויות", price: 150},
    {id: 16, name: "הרשמה להשתלמות מחוזית", price: 25},
    {id: 17, name: "רישום לליגת מרכזי מצוינות ", price: 70},
    {id: 18, name: "הרשמה לקורס שופטים", price: 50},
    {id: 19, name: "הרשמה לליגת כדורעף חופים", price: 200},
    {id: 20, name: "הרשמה לטורניר היחידה לצעירים", price: 40},
    {id: 21, name: "הרשמה למפעלי ספורט", price: 40},
    {id: 22, name: "דמי ביטול השתתפות", price: 120},
    {id: 23, name: "לינה", price: 0},
    {id: 24, name: "הרשמה לטורניר ISF", price: 200},
    {id: 25, name: "רישום מועדון לקט-עף", price: 85},
    {id: 26, name: "רישום מועדון לקט-סל", price: 100},
    {id: 27, name: "רישום מועדון יסודי", price: 100},
    {id: 28, name: "סגירת שנה קודמת", price: 0},
    {id: 29, name: "סגירת שנה נוכחית", price: 0},
    {id: 30, name: "הסעות", price: 70},
    {id: 31, name: "זיכוי מועדונים", price: 0},
    {id: 32, name: "כנס מורים לחנ\"ג ירושלים", price: 40},
    {id: 33, name: "כנס חינוך גופני מחוז ירושלים", price: 30},
    {id: 34, name: "רישום למפעלי הספורט ח.מ", price: 30},
    {id: 35, name: "הרצאה", price: 0},
    {id: 36, name: "שלט פרסום", price: 0},
    {id: 37, name: "שונות", price: 50},
    {id: 38, name: "רישום למפעלי הספורט תשס\"ט", price: 45},
    {id: 39, name: "ערעור", price: 500},
    {id: 40, name: "הרשמה להשתלמות מורה / מאמן", price: 500},
    {id: 41, name: "אירוח אליפות ארצית", price: 145},
    {id: 42, name: "רישום לאליפות ארצית בכ.חופים", price: 150},
    {id: 43, name: "רישום לאליפות ארצית בכושר גופני", price: 250},
    {id: 44, name: "רישום לאליפות ארצית בשחיה", price: 150},
    {id: 45, name: "הרשמה לאליפות משחקים של פעם", price: 20},
    {id: 46, name: "הרשמה אליפות ארצית כ.חופים", price: 150},
    {id: 47, name: "אולימפיאדת הילדים", price: 120},
    {id: 1047, name: "דמי רישום לפרחי ספורט", price: 0},
    {id: 1048, name: " דמי רישום  כדורסל 3*3 תלמידות", price: 500},
    {id: 1049, name: "דמי רישום כדורסל 3*3 תלמידים", price: 500},
    {id: 1050, name: "הרשמה לגמר הארצי בניווט", price: 50},
    {id: 1051, name: "כביסה", price: 0},
    {id: 100, name: "רישום קבוצה מועדונים", price: 500},
    {id: 101, name: "רישום קבוצה מועדונים - נתמכת טוטו", price: 750},
    {id: 200, name: "רישום קבוצה ליגות התיכוניים", price: 1000},
];

Finance.prototype.getProducts = function (callback) {
    callback(null, products);
};

Finance.prototype.getProduct = function (product, callback) {
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        if (product === p.id) {
            callback(null, product);
            return;
        }
    }
    callback();
};

Finance.prototype.listTeamPayments = function (options, callback) {
    callback(null, teamPayments);
};

Finance.prototype.updatePaymentsPayment = function (payments, callback) {
    for (var p = 0; p < payments.length; p++) {
        var payment = payments[p];

        for (var i = 0; i < teamPayments.length; i++) {
            var teamPayment = teamPayments[i];
            if (teamPayment.payment === payment.payment) {
                teamPayment.amountPaid = (teamPayment.amountPaid || 0) + payment.amount;
            }
        }
    }
    callback();
};

module.exports = new Finance();