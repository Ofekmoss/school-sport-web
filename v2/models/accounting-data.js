function Address(street, number, city, zipCode, state, stateCode) {
    this.Type = "Address";
    this.Street = street;
    this.Number = number;
    this.City = city;
    this.ZipCode = zipCode || 0;
    this.State = state;
    this.StateCode = stateCode;
}

function Entity(id, name, address, phoneNumber, licenseNumber) {
    this.Type = "Entity";
    this.Id = id;
    this.Name = name;
    this.Address = address || new Address();
    this.PhoneNumber = phoneNumber;
    this.LicenseNumber - licenseNumber;
}

function Business(licenseNumber, businessNumber, taxFile, name, address) {
    this.Type = "Business";
    this.LicenseNumber = licenseNumber;
    this.BusinessNumber = businessNumber;
    this.TaxFile = taxFile;
    this.Name = name;
    this.Address = address;
}

function DocumentDate(year, month, day) {
    this.Type = "Date";
    this.Year = year;
    this.Month = month;
    this.Day = day;
}

var PaymentMethod = {
    Cash: 1,
    Check: 2,
    CreditCard: 3,
    BankTransfer: 4
};

function CashPaymentDetail(amount) {
    this.Type = "CashPaymentDetail";
    this.Method = PaymentMethod.Cash;
    this.Amount = amount;
}

function CheckPaymentDetail(amount, bank, branch, account, checkNumber, dueDate) {
    this.Type = "CheckPaymentDetail";
    this.Method = PaymentMethod.Check;
    this.Amount = amount;
    this.Bank = bank;
    this.Branch = branch;
    this.Account = account;
    this.CheckNumber = checkNumber;
    this.DueDate = dueDate;
}

function CreditCardPaymentDetail(amount) {
    this.Type = "CreditCardPaymentDetail";
    this.Method = PaymentMethod.CreditCard;
    this.Amount = amount;
}

function BankTransferPaymentDetail(amount) {
    this.Type = "BankTransferPaymentDetail";
    this.Method = PaymentMethod.BankTransfer;
    this.Amount = amount;
}

function AccountBalance(accountId, accountName, balanceCode, balanceName, entity, startBalance, debit, credit, accountingField) {
    this.Type = "AccountBalance";
    this.AccountId = accountId;
    this.AccountName = accountName;
    this.BalanceCode = balanceCode;
    this.BalanceName = balanceName;
    this.Entity = entity;
    this.StartBalance = startBalance;
    this.Debit = debit;
    this.Credit = credit;
    this.AccountingField = accountingField;
}

function Receipt(identifier, timestamp, customer, discount, vat, totalAmount, documentDate, details) {
    this.Type = "Receipt";
    this.Identifier = identifier;
    this.Timestamp = timestamp;
    this.Customer = customer || new Entity();
    this.Discount = discount;
    this.VAT = vat;
    this.TotalAmount = totalAmount;
    this.DocumentDate = documentDate;
    this.Details = details || [];

    this.Subtotal = function () { return this.TotalAmount - this.VAT - this.Discount; };
}

function AccountingData(accountBalances, receipts) {
    this.Type = "AccountingData";
    this.AccountBalances = accountBalances;
    this.Receipts = receipts;
}

var customers = [
    new Entity("1001", "לקוח 1", null, "03-0000001", 511079162),
    new Entity("1002", "לקוח 2", null, "03-0000002", 91),
    new Entity("1003", "לקוח 3", null, "03-0000003"),
    new Entity("1004", "לקוח 4", null, "03-0000004"),
    new Entity("1005", "לקוח 5", new Address("הרחוב", 10, "העיר"), "03-0000005"),
    new Entity("1006", "לקוח 6", null, "03-0000006"),
    new Entity("1007", "לקוח 7", null, "03-0000007")
];

var BusinessDetails = new Business(580242220,
    580242220,
    935257642,
    "התאחדות הספורט לבתי הספר בישראל",
    new Address("המסגר", 59, "תל-אביב-יפו", 6721709));


var checkDetails = [
    new CheckPaymentDetail(0, 4, 701, 80492348, 100102, null),
    new CheckPaymentDetail(0, 2, 100, 20211293, 200039, null),
    new CheckPaymentDetail(0, 1, 140, 57828421, 103, null),
    new CheckPaymentDetail(0, 10, 556, 82134759, 30023, null),
    new CheckPaymentDetail(0, 7, 65, 66578319, 100002, null),
    new CheckPaymentDetail(0, 4, 302, 11029340, 201343, null),
    new CheckPaymentDetail(0, 3, 14, 10234, 100014, null)
];

function addMinutes(date, minutes) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function random(max) {
    return Math.floor(Math.random()*max);
}

function generateData(from, to) {
    var income = new AccountBalance("50001", "הכנסות", "500", "הכנסות",
        null, 4000, 0, 0, 1000);

    var receipts =[];
    var identifier = 10049;
    var timestamp = addMinutes(from, 200+random(600));

    while (timestamp < to)
    {
        var customerIndex = random(7);
        var receipt = new Receipt(identifier++,
            timestamp, customers[customerIndex], 0, 0, (random(1000) + 1)*5,
            new DocumentDate(timestamp.getFullYear(), timestamp.getMonth() + 1, timestamp.getDate()));

        income.Credit += receipt.TotalAmount;
        var amountLeft = receipt.TotalAmount;
        while (amountLeft > 0)
        {
            var nextPayment = Math.min(amountLeft, Math.floor((Math.random()*amountLeft/10)+1)*20);
            if (Math.random() > 0.5)
            {
                receipt.Details.push(new BankTransferPaymentDetail(nextPayment));
            }
            else
            {
                var cd = checkDetails[customerIndex];
                cd.CheckNumber += random(12);
                var dueDate = addDays(timestamp, random(60));
                receipt.Details.push(new CheckPaymentDetail(nextPayment, cd.Bank, cd.Branch, cd.Account, cd.CheckNumber,
                    new DocumentDate(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate())));
            }
            amountLeft -= nextPayment;
        }
        receipts.push(receipt);

        timestamp = addMinutes(timestamp, 200 + random(600));
    }

    return new AccountingData([ income ], receipts);
}

function emptyData() {
    var income = new AccountBalance("50001", "הכנסות", "500", "הכנסות",
        null, 0, 0, 0, 1000);

    var receipts = [];
    return new AccountingData([ income ], receipts);
}

module.exports = {
    get: async function (from, to, callback) {
        try {
            var accountingData = emptyData();//generateData(from, to);
            callback(null, accountingData);
        }
        catch (err) {
            callback(err);
        }

    }
};