var utils = require('./utils');

function Functionaries(db) {
    this.db = db;
}

Functionaries.prototype.list = function (options, callback) {
    function applyOptions(pNames, conditions, requestParams) {
        if (typeof pNames === 'string') {
            pNames = [pNames];
        }
        pNames.forEach(function(pName) {
            if (options[pName] != null) {
                var fieldName = 'f.' + pName.toUpperCase() + '_ID';
                conditions.push(fieldName + '=@' + pName);
                requestParams[pName] = options[pName];
            }
        });
    }
    var self = this;
    self.db.connect().then(function (connection) {
        var additionalFields = '';
        var additionalTables = '';
        var conditions = ['f.DATE_DELETED Is Null'];
        var requestParams = {};
        if (options.full) {
            additionalFields = ', ' +
                'f.[ADDRESS], f.[PHONE], f.FAX, f.ZIP_CODE, f.EMAIL, f.CELL_PHONE, f.FUNCTIONARY_NUMBER, f.ID_NUMBER, ' +
                'f.FUNCTIONARY_STATUS, f.HAS_ANOTHER_JOB, f.WORK_ENVIROMENT, f.SEX_TYPE, f.BIRTH_DATE, ' +
                'f.SENIORITY, f.PAYMENT, f.REMARKS, r.REGION_NAME, c.CITY_NAME, s.SCHOOL_NAME, s.SYMBOL';
            additionalTables = ' ' +
                'Left Join REGIONS r On f.REGION_ID=r.REGION_ID And r.DATE_DELETED Is Null ' +
                'Left Join CITIES c On f.CITY_ID=c.CITY_ID And c.DATE_DELETED Is Null ' +
                'Left Join SCHOOLS s On f.SCHOOL_ID=s.SCHOOL_ID And s.DATE_DELETED Is Null';
        }
        if (options.id) {
            options.functionary = options.id;
            applyOptions('functionary', conditions, requestParams);
        } else {
            applyOptions(['region', 'city', 'school'], conditions, requestParams);
            var types = [];
            if (options.type) {
                types.push(options.type);
            } else if (options.types) {
                types = options.types.split(',');
            }
            types = types.filter(t => {
                var n = parseInt(t, 10);
                return !isNaN(n) && n > 0;
            });
            if (types.length > 0) {
                conditions.push('FUNCTIONARY_TYPE In (' + types.join(', ') + ')');
            }
        }
        var qs = 'Select f.FUNCTIONARY_ID, f.FUNCTIONARY_NAME, f.FUNCTIONARY_TYPE, f.REGION_ID, f.CITY_ID, f.SCHOOL_ID' +
            additionalFields + ' ' +
            'From FUNCTIONARIES f' +
            additionalTables + ' ' +
            'Where ' + conditions.join(' And ');
        connection.request(qs, requestParams).then(function (records) {
            connection.complete();
            var result = records.map(function (record) {
                var dataRow = {
                    id: record['FUNCTIONARY_ID'],
                    name: record['FUNCTIONARY_NAME'],
                    type: record['FUNCTIONARY_TYPE'],
                    region: record['REGION_ID'],
                    city: record['CITY_ID'],
                    school: record['SCHOOL_ID']
                };
                if (options.full) {
                    dataRow.region = utils.getBasicEntity(record, 'REGION_');
                    dataRow.city = utils.getBasicEntity(record, 'CITY_');
                    dataRow.school = utils.getBasicEntity(record, 'SCHOOL_', null, ['symbol']);
                    dataRow.address = record['ADDRESS'];
                    dataRow.phone = record['PHONE'];
                    dataRow.fax = record['FAX'];
                    dataRow.zipCode = record['ZIP_CODE'];
                    dataRow.email = record['EMAIL'];
                    dataRow.cellPhone = record['CELL_PHONE'];
                    dataRow.number = record['FUNCTIONARY_NUMBER'];
                    dataRow.idNumber = record['ID_NUMBER'];
                    dataRow.status = record['FUNCTIONARY_STATUS'];
                    dataRow.anotherJob = record['HAS_ANOTHER_JOB'];
                    dataRow.workEnvironment = record['WORK_ENVIROMENT'];
                    dataRow.gende = record['SEX_TYPE'];
                    dataRow.birthDate = record['BIRTH_DATE'];
                    dataRow.seniority = record['SENIORITY'];
                    dataRow.payment = record['PAYMENT'];
                    dataRow.remarks = record['REMARKS'];
                }
                return dataRow;
            });
            callback(null, result);
        }, function (err) {
            connection.complete();
            callback(err);
        });
    }, function (err) {
        callback(err);
    });
};


module.exports = new Functionaries(require('./db'));