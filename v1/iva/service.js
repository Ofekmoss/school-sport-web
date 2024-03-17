var Promise = require('promise');
var sql = require('mssql');
var settings = require('../../settings');
var soap = require('soap');
var fs = require('fs');
var logger = require('../../logger');
var utils = require('../../api/utils');
var dateFormat = require('dateformat');

function createConnection(callback) {
    var connection = new sql.Connection(settings.sportsmanDb, function(err) {
        if (err) {
            callback(err);
        }
        else {
            callback(null, connection);
        }
    });
}

function GetAllPlayers(changedAfter, connection, callback) {
    var qs = 'Select CATEGORY, REGISTRATION_DATE, FIRST_NAME, LAST_NAME, GRADE, [GENDER], BIRTH_DATE, ID_NUMBER, TEAM_ID, TEAM_NAME, SCHOOL_SYMBOL,' +
        '   CHAMPIONSHIP_NAME, PIC_NAME, MEDICAL_EXAM, ID_VOUCHER ' +
        'From VolleyballPlayers ' +
        'Where CharIndex(\'י\'\'-י"ב\', CHAMPIONSHIP_NAME)=0 ';
    if (changedAfter != null)
        qs += 'And REGISTRATION_DATE>=@date ';
    qs += 'Order By REGISTRATION_DATE Asc, CHAMPIONSHIP_NAME Asc, TEAM_NAME Asc, FIRST_NAME Asc, LAST_NAME Asc';
    var request = connection.request();
    if (changedAfter != null)
        request.input('date', changedAfter);
    request.query(qs, function (err, recordset) {
        if (err) {
            var msg = 'Error reading volleyball players: ' + (err.message || err);
            callback(msg, null);
            return;
        }

        var allPlayers = [];
        for (var i = 0; i < recordset.length; i++) {
            var row = recordset[i];
            allPlayers.push({
                Id: row['ID_NUMBER'],
                RegisterDate: row['REGISTRATION_DATE'],
                FirstName: row['FIRST_NAME'],
                LastName: row['LAST_NAME'],
                Grade: row['GRADE'],
                Gender: row['GENDER'],
                BirthDate: row['BIRTH_DATE'],
                TeamNumber: row['TEAM_ID'],
                TeamName: row['TEAM_NAME'],
                SchoolSymbol: row['SCHOOL_SYMBOL'],
                Championship: row['CHAMPIONSHIP_NAME'],
                PicName: row['PIC_NAME'],
                MedicalExam: row['MEDICAL_EXAM'],
                IdVoucher: row['ID_VOUCHER']
            });
        }
        callback(null, allPlayers);
    });
}


var service = {
    IvaService: {
        IvaPort: {
            GetPlayers: function (args, callback) {
                var changedAfter = utils.ParseDateTime(args.changedAfter);
                var token = args.token;
                if (token != '8C64D209-8A3B-4CE8-93E1-E7CDE82DDFF1') {
                    logger.log('verbose', 'IVA GetPlayers called with invalid token');
                    callback({
                        result: {
                            PlayerInfo: []
                        }
                    });
                    return;
                }

                logger.log('verbose', 'IVA GetPlayers called, change after: ' + changedAfter);
                createConnection(function(err, connection) {
                    if (err != null) {
                        logger.log('error', 'Error creating connection: ' + (err.message || err));
                        callback({
                            result: {
                                PlayerInfo: []
                            }
                        });
                    } else {
                        GetAllPlayers(changedAfter, connection, function(err, allPlayers) {
                            if (err != null) {
                                logger.log('error', 'Error getting volleyball players: ' + (err.message || err));
                                callback({
                                    result: {
                                        PlayerInfo: []
                                    }
                                });
                            } else {
                                logger.log('verbose', 'IVA service returning ' + allPlayers.length + ' players');
                                callback({
                                    result: {
                                        PlayerInfo: allPlayers
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    }
};


var wsdl = fs.readFileSync('sport/iva/iva-service.wsdl', 'utf8');

function findKey(obj, val) {
    for (var n in obj)
        if (obj[n] === val)
            return n;
}

function serverSecurityEnvelope(body) {
    var defs = this.wsdl.definitions,
        ns = defs.$targetNamespace,
        encoding = '',
        alias = findKey(defs.xmlns, ns);
    var xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
        "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" " +
        encoding +
        this.wsdl.xmlnsInEnvelope + '>';
    if (typeof this.authenticate === 'function') {
        function getDate(d) {
            function pad(n) {
                return n < 10 ? '0' + n : n;
            }
            return d.getUTCFullYear() + '-'
                + pad(d.getUTCMonth() + 1) + '-'
                + pad(d.getUTCDate()) + 'T'
                + pad(d.getUTCHours()) + ':'
                + pad(d.getUTCMinutes()) + ':'
                + pad(d.getUTCSeconds()) + 'Z';
        }
        var now = new Date();
        var created = getDate(now);
        var expires = getDate(new Date(now.getTime() + (1000 * 600)));

        xml += "<soap:Header>" +
            "  <o:Security soap:mustUnderstand=\"1\" " +
                          "xmlns:o=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd\" " +
                          "xmlns:u=\"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd\">" +
            "    <u:Timestamp u:Id=\"_0\">" +
            "      <u:Created>" + created + "</u:Created>" +
            "      <u:Expires>" + expires + "</u:Expires>" +
            "    </u:Timestamp>" +
            "  </o:Security>" +
            "</soap:Header>";
    }
    xml += "<soap:Body>" +
        body +
        "</soap:Body>" +
        "</soap:Envelope>";

    return xml;
};

module.exports.start = function (server) {
    var soapServer = soap.listen(server, '/sport/iva', service, wsdl);
    //soapServer._envelope = serverSecurityEnvelope;
    /*
    soapServer.authenticate = function (security) {
        var token = security.UsernameToken;
        var username = typeof token.Username === 'string' ? token.Username : token.Username.$value;
        var password = typeof token.Password === 'string' ? token.Password : token.Password.$value;
        return username === 'iva' && password === 'SjFVWGZtD4';
    };
    */
};