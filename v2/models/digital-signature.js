const axios = require('axios');
const fs = require('fs');
var path = require('path');
const https = require("https");
var sslRootCAs = require('ssl-root-cas');
var settings = require('../../settings');

//45dc827e-474d-4be7-9649-08db913fcf9c/Signed
//http://127.0.0.1:5000/v2/#/login?comsigndocid=45dc827e-474d-4be7-9649-08db913fcf9c/Signed

function digitalSignature(db) {
    this.db = db;
    this.client = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        }),
        baseURL: settings.wesignApi.baseUrl
    });
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    sslRootCAs.inject();
}

function getApiUrl(apiField) {
    return settings.wesignApi.baseUrl + settings.wesignApi[apiField];
}

function parseAxiosError(error) {
    if (error.isAxiosError) {
        if (error.response.status && error.response.statusText) {
            var msg = 'Error ' + error.response.status + ' (' + error.response.statusText + ')'
            return msg;
        } else {
            if (error.Error) {
                return error.Error;
            } else {
                console.log(error);
                return 'Unknown error';
            }
        }
    } else {
        if (error.data && error.data.title) {
            return error.data.title;
        } else {
            console.log(error);
            return 'Unknown error';
        }
    }
}

function parseBasicResponse(response, callback) {
    if (response == null) {
        callback('Response is null');
        return true;
    }
    if (!response.data) {
        callback('Response has no data');
        return true;
    }
    return false;
}

function parseSingleValue(response, callback, propertyName) {
    var value = response.data[propertyName];
    if (value == null || !value) {
        console.log(response);
        callback('Response has no ' + propertyName); //parsePropertyName(propertyName));
        return null;
    }
    return value;
}

function parseContactsResponse(response, callback) {
    if (parseBasicResponse(response, callback))
        return;
    callback(null, response.data.contacts || []);
}

function parseCreateContactResponse(response, callback) {
    if (parseBasicResponse(response, callback))
        return;
    var contactId = parseSingleValue(response, callback, 'contactId');
    if (contactId != null)
        callback(null, contactId);
}

function parseUserLoginResponse(response, callback) {
    if (parseBasicResponse(response, callback))
        return;
    var token = parseSingleValue(response, callback, 'token');
    var refreshToken = token != null ? parseSingleValue(response, callback, 'refreshToken') : null;
    if (token != null && refreshToken != null) {
        callback(null, {
            token: token,
            refreshToken: refreshToken
        });
    }
    //authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
}

function parseTemplateId(response, callback) {
    if (parseBasicResponse(response, callback))
        return;
    var templateId = parseSingleValue(response, callback, 'templateId');
    if (templateId != null)
        callback(null, templateId);
}

function parseTemplatesResponse(response, callback) {
    if (parseBasicResponse(response, callback))
        return;
    callback(null, response.data.templates || []);
}

function checkError(err) {
    if (err != null) {
        if (typeof err === 'string') {
            console.log(err);
        } else {
            if (err.hasOwnProperty('isAxiosError') && err.isAxiosError === true) {
                console.log('Axios error occurred: ' + parseAxiosError(err));
                console.log(err.response.data.errors);
            } else {
                console.log('Unknown error');
                console.log(err);
            }
        }
        return true;
    }
    return false;
}

function userLogin(client, callback) {
    var apiURL = getApiUrl('loginUrl');
    var requestParams =  {
        "email": settings.wesignUser.email,
        "password": settings.wesignUser.password
    };
    console.log('Sending POST request to ' + apiURL);
    client.post(apiURL, requestParams).then((response) => {
        parseUserLoginResponse(response, function(err, loginData) {
            if (err != null) {
                callback(err);
            } else {
                console.log('Success. Tokens:');
                console.log(loginData);
                callback(null, loginData);
            }
        })
    }, callback);
}

function createContacts(client, requestHeaders, contacts, callback) {
    function createSingleContact(index, contactIds) {
        if (typeof contactIds === 'undefined' || contactIds == null)
            contactIds = [];
        if (index >= contacts.length) {
            callback(null, contactIds);
            return;
        }

        var contact = contacts[index];
        //already exists?
        var apiURL = getApiUrl('contacts');
        console.log('Checking if contact with email ' + contact.email + ' already exists, URL is ' + apiURL);
        var urlWithParams = apiURL + '?key=' + encodeURIComponent(contact.email);
        client.get(urlWithParams, requestHeaders).then((response) => {
            parseContactsResponse(response, function(err, existingContacts) {
                if (err != null) {
                    callback(err);
                } else {
                    var Create = function() {
                        var apiURL = getApiUrl('contacts');
                        console.log('Creating new contact, URL is ' + apiURL);
                        var requestParams = {
                            "name": contact.name,
                            "email": contact.email,
                            "phone": contact.phone,
                            "defaultSendingMethod": 2, //Email
                            "sendingMethod": 2, //Email
                            "seals": []
                        };
                        //console.log(util.inspect(requestParams, {showHidden: false, depth: null}));
                        //console.log(requestParams);
                        client.post(apiURL, requestParams, requestHeaders).then((response) => {
                            parseCreateContactResponse(response, function(err, contactId) {
                                if (err != null) {
                                    console.log(response);
                                    callback(err);
                                } else {
                                    console.log('Contact created successfully, id: ' + contactId);
                                    contactIds.push(contactId);
                                    createSingleContact(index + 1, contactIds);
                                }
                            });
                        }, callback);
                    };
                    if (existingContacts.length > 0) {
                        var existingContact = existingContacts[0];
                        console.log('Contact ' + contact.name + ' (' + contact.email + ') already exists, id: ' + existingContact.id);
                        console.log(existingContact);
                        contactIds.push(existingContact.id);
                        createSingleContact(index + 1, contactIds);
                    } else {
                        Create();
                    }
                }
            });
        }, callback);
    }

    createSingleContact(0);
}

function createTemplate(client, requestHeaders, pdfFile, contacts, callback) {
    var pdfFileName = pdfFile.Name;
    var pdfFilePath = pdfFile.Path;
    //already exists?
    var apiURL = getApiUrl('createTemplateUrl');
    console.log('Checking if template for "' + pdfFileName + '" already exists, URL is ' + apiURL);
    var urlWithParams = apiURL + '?key=' + encodeURIComponent(pdfFileName);
    client.get(urlWithParams, requestHeaders).then((response) => {
        parseTemplatesResponse(response, function(err, existingTemplates) {
            if (err != null) {
                callback(err);
            } else {
                if (existingTemplates.length > 0) {
                    var templateId = existingTemplates[0].templateId;
                    console.log('Template already exists, id ' + templateId);
                    callback(null, templateId);
                    return;
                }
                console.log('Template does not exist, creating new template for "' + pdfFilePath + '"');
                const pdfContents = fs.readFileSync(pdfFilePath, {encoding: 'base64'});
                var requestParams = {
                    "base64File": 'data:application/pdf;base64,' + pdfContents,
                    "name": pdfFileName,
                    "metaData": '<?xml version="1.0"?>' +
                        '<PDFMetaData>' +
                        '	<PlaceholderColor>black</PlaceholderColor>' +
                        '	<Parenthesis>{}</Parenthesis>' +
                        '	<SkipValidation>true</SkipValidation>' +
                        '	<Fields>' +
                        contacts.map((contact, index) => {
                            var name = contact.inputField.name;
                            return '<Field Fieldname="' + name + '" Type="Graphic_Signature" IsMandatory="true" Value=""/>';
                        }).join('\n') +
                        '	</Fields>' +
                        '</PDFMetaData>',
                    "isOneTimeUseTemplate": false,
                    "sourceTemplateId": null
                };
                console.log('Sending POST request. URL: ' + apiURL);
                client.post(apiURL, requestParams, requestHeaders).then((response) => {
                    parseTemplateId(response, function(err, templateId) {
                        if (err != null) {
                            callback(err);
                        } else {
                            console.log('Created successfully. Template ID: ' + templateId);
                            callback(null, templateId);
                        }
                    });
                }, callback);
            }
        });
    }, callback);
}

function updateTemplateFields(client, requestHeaders, pdfFileName, templateId, contacts, callback) {
    var apiURL = getApiUrl('createTemplateUrl') + "/" + templateId;
    var requestParams = {
        "name": pdfFileName,
        "fields": {
            "signatureFields": contacts.map(contact => {
                return {
                    "signingType": 1, //Graphic
                    "name": contact.inputField.name,
                    "x": contact.inputField.x,
                    "y": contact.inputField.y,
                    "width": contact.inputField.width,
                    "height": contact.inputField.height,
                    "mandatory": false,
                    "fieldGroup": 0,
                    "page": contact.inputField.page
                };
            })
        }
    }
    console.log('Sending PUT request. URL: ' + apiURL);
    client.put(apiURL, requestParams, requestHeaders).then((response) => {
        console.log("Success.");
        callback(null, 'success');
    }, callback);
}

function createDocumentCollection(client, requestHeaders, pdfFileName, templateId, contacts, callback) {
    var apiURL = getApiUrl('createDocumentCollection');
    var requestParams = {
        "documentMode": 1,
        "documentName": pdfFileName,
        "templates": [
            templateId
        ],
        "senderNote": "שלום, נא לחתום על המסמך המצורף",
        "signers": contacts.map((contact, index) => {
            var note = 'שלום ' + contact.displayName + ', ' +
                'נא לחתום על המסמך';
            return {
                "contactId": contact.id,
                "sendingMethod": 2, //Email
                "signerAttachments": [],
                "signerFields": [
                    {
                        "templateId": templateId,
                        "fieldName": contact.inputField.name,
                        "fieldValue": ""
                    }
                ],
                "linkExpirationInHours": 100,
                "senderNote": note,
                "senderAppendices": []
            };
        }),
        "rediretUrl": "https://www.schoolsport.org.il/v2/#/login?comsigndocid=[docId]/[docStatus]",
        "senderAppendices": [],
        "notifications": {
            "shouldSend": true,
            "shouldSendSignedDocument": true
        }
    };
    console.log('Sending POST request. URL: ' + apiURL);
    client.post(apiURL, requestParams, requestHeaders).then((response) => {
        console.log("Success. Response:");
        console.log(response.data);
        callback(null, response.data.documentCollectionId);
    }, callback);
}

function getDocumentCollection(client, requestHeaders, documentCollectionId, callback) {
    var apiURL = getApiUrl('createDocumentCollection');
    var urlWithParam = apiURL + '/' + documentCollectionId + '/json';
    console.log('Sending GET request. URL: ' + urlWithParam);
    client.get(urlWithParam, requestHeaders).then((response) => {
        //console.log("Success. Read " + response.data.length + " bytes of data");
        if (response.data.files && response.data.files.length > 0) {
            var base64Data = response.data.files[0].data;
            callback(null, Buffer.from(base64Data, 'base64'));
        } else {
            callback('response has no files');
        }
    }, callback);
}

function writeToDatabase(connection, pdfFileName, pdfCaption, initiator, documentId, callback) {
    var qs = 'Select * From DigitalSignatures Where PdfFileName=@fileName';
    var queryParams = {
        fileName: pdfFileName
    };
    connection.request(qs, queryParams).then(function(records) {
        if (records != null && records.length > 0) {
            //already exists
            qs = 'Update DigitalSignatures Set ' +
                '   PdfCaption=@caption, ' +
                '   ComsignDocumentId=@documentId, ' +
                '   DateCreated=GetDate(), ' +
                '   Initiator=@initiator ' +
                'Where PdfFileName=@fileName';
        } else {
            //add a new row
            qs = 'Insert Into DigitalSignatures (PdfFileName, PdfCaption, ComsignDocumentId, DateCreated, Initiator) ' +
                'Values (@fileName, @caption, @documentId, @now, @initiator)';
        }
        queryParams.caption = pdfCaption;
        queryParams.documentId = documentId;
        queryParams.now = new Date();
        queryParams.initiator = initiator;
        connection.request(qs, queryParams).then(function(records) {
            callback(null, 'success');
        }, function(err) {
            console.log('error inserting or updating data row');
            console.log(qs);
            console.log(queryParams);
            console.log(err);
            callback(err);
        });
    }, function(err) {
        console.log('error reading from digital signatures');
        callback(err);
    });
}

function getDocumentIdFromFileName(connection, pdfFileName, callback) {
    var qs = 'Select ComsignDocumentId From DigitalSignatures Where PdfFileName=@fileName';
    var queryParams = {
        fileName: pdfFileName
    };
    connection.request(qs, queryParams).then(function(records) {
        var documentId = records != null && records.length > 0 ? records[0]['ComsignDocumentId'] : null;
        callback(null, documentId);
    }, function(err) {
        console.log('error reading from digital signatures');
        callback(err);
    });
}

digitalSignature.prototype.active = function () {
    return true;
};

digitalSignature.prototype.send = async function (options, callback) {
    var client = this.client;
    var contacts = options.contacts;
    var connection = null;
    try {
        connection = await this.db.connect();
    } catch (ex) {
        console.log('error creating connection')
        console.log(ex);
        connection = null;
    }
    if (connection == null) {
        callback('no connection to database');
        return;
    }

    userLogin(client, function(err, loginData) {
        if (checkError(err)) {
            callback(err);
            return;
        }
        var token = loginData.token;
        var requestHeaders = {
            headers: {
                'Authorization': `Bearer ` + token
            }
        };

        var pdfFilePath = options.PDF.Path;
        var pdfFileName = options.PDF.Name;
        var pdfFileCaption = options.PDF.Caption;
        var pdfActualFile = path.basename(options.PDF.Path);
        createContacts(client, requestHeaders, contacts, function(err, contactIds) {
            if (checkError(err)) {
                callback(err);
                return;
            }
            contacts.forEach((contact, index) => {
                contact.id = contactIds[index];
                if (!contact.inputField.name)
                    contact.inputField.name = 'signer' + (index + 1);
                if (!contact.displayName)
                    contact.displayName = contact.name;
            });
            console.log('Creating template for "' + pdfFilePath + '" for contacts ' + contacts.map(c => c.id).join(', '));
            createTemplate(client, requestHeaders, options.PDF, contacts, function(err, templateId) {
                if (checkError(err)) {
                    callback(err);
                    return;
                }
                updateTemplateFields(client, requestHeaders, pdfFileName, templateId, contacts, function (err, resp) {
                    if (checkError(err)) {
                        callback(err);
                        return;
                    }
                    createDocumentCollection(client, requestHeaders, pdfFileName, templateId, contacts, function (err, documentCollectionId) {
                        if (checkError(err)) {
                            callback(err);
                            return;
                        }
                        writeToDatabase(connection, pdfActualFile, pdfFileCaption,options.initiator,
                            documentCollectionId, function(err) {
                                if (checkError(err)) {
                                    callback(err);
                                    return;
                                }
                                console.log('All done.');
                                callback(null, 'OK');
                            });
                    });
                });
            });
        });
    });
};

digitalSignature.prototype.download = async function (options, callback) {
    var client = this.client;
    var connection = null;
    var pdfActualFile = options.PdfFileName;
    if (pdfActualFile == null || pdfActualFile == '') {
        callback('missing file name');
        return;
    }
    try {
        connection = await this.db.connect();
    } catch (ex) {
        console.log('error creating connection')
        console.log(ex);
        connection = null;
    }
    if (connection == null) {
        callback('no connection to database');
        return;
    }
    getDocumentIdFromFileName(connection, pdfActualFile, function(err, documentId) {
        if (checkError(err)) {
            callback(err);
            return;
        }
        if (documentId == null || documentId.length === 0) {
            callback('file "' + pdfActualFile + '" is not signed yet');
            return;
        }

        userLogin(client, function(err, loginData) {
            if (checkError(err)) {
                callback(err);
                return;
            }
            var token = loginData.token;
            var requestHeaders = {
                headers: {
                    'Authorization': `Bearer ` + token
                }
            };
            getDocumentCollection(client, requestHeaders, documentId, function(err, binaryString) {
                if (checkError(err)) {
                    callback(err);
                    return;
                }
                callback(null, binaryString);
            });
        });
    });
};

module.exports = new digitalSignature(require('./db'));