const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const Mustache = require('mustache');
const Promise = require('promise');
const pdf = require('html-pdf');
const convertHTMLToPDF = require("pdf-puppeteer");
const sql = require('mssql');
const settings = require('../../settings');
const logger = require('../../logger');

const localEmailSettings = {
    from_address: "noreply@schoolsport.org.il",
    from_name: "התאחדות הספורט לבתי ספר בישראל"
};

function CreateDbConnection(callback) {
    let connectionFunc = null;
    if (sql.ConnectionPool)
        connectionFunc = sql.ConnectionPool;
    else
        connectionFunc = sql.Connection;
    let connection = new connectionFunc(settings.sportsmanDb, function (err) {
        if (err) {
            callback('Error connecting to database: ' + (err.message || err), null);
        } else {
            callback(null, connection);
        }
    });
}

function CreateWebConnection(callback) {
	let connectionFunc = null;
	if (sql.ConnectionPool)
		connectionFunc = sql.ConnectionPool;
	else
		connectionFunc = sql.Connection;
	let connection = new connectionFunc(settings.sqlConfig, function (err) {
		if (err) {
			callback('Error connecting to database: ' + (err.message || err), null);
		} else {
			callback(null, connection);
		}
	});
}

function mkdirTree(dir) {
    if (!fs.existsSync(dir)) {
        let parent = path.dirname(dir);
        mkdirTree(parent);
        fs.mkdirSync(dir);
    }
}

/**
 * @return {boolean}
 */
function IsValidEmail(rawEmail, allowBlank) {
    if (typeof allowBlank == 'undefined')
        allowBlank = false;
    if (rawEmail == null || rawEmail.length === 0)
        return allowBlank;
    let email = rawEmail.trim();
    if (email.length === 0)
        return allowBlank;
    let parts = email.split('@');
    if (parts.length != 2)
        return false;
    let name = parts[0].trim(), domain = parts[1].trim().toLowerCase();
    if (name.length === 0 || domain.length === 0)
        return false;
    if (domain.substr(0, 1) == '.' || domain.substr(domain.length - 1, 1) == '.' || domain.indexOf('.') < 0)
        return false;
    if (domain.indexOf('example.') == 0 || domain.indexOf('test.') == 0)
        return false;
    return true;
}

function createPDF(templateName, pdfFileName, dataObject, contentFolder) {
    return new Promise(function(fulfil, reject) {
        let templateFile = fs.readFileSync('v2/templates/' + templateName, {encoding: 'utf8'});
        let rawHTML = Mustache.render(templateFile, dataObject);
		CreateWebConnection(function(err, connection) {
			if (err) {
				logger.error('Error creating connection for saving pdf to database: ' + (err.message || err));
			} else {
				var qs = 'Insert Into PDF_Archive (TemplateName, PdfFileName, RawHTML) Values (@template, @pdf, @html)';
				let request = connection.request();
				request.input('template', templateName);
				request.input('pdf', pdfFileName);
				request.input('html', rawHTML);
				request.query(qs, function (err, queryResponse) {
					if (err) {
						logger.error('Error saving pdf to database: ' + (err.message || err));
					}
				});
			}
		});
		convertHTMLToPDF(rawHTML, function(pdfBuffer) {
			if (pdfFileName && contentFolder) {
				//create actual file
				let dir = path.join(settings.contentRoot, contentFolder);
				mkdirTree(dir);
				let pdfPath = path.join(dir, pdfFileName);
				//delete if exists
				if (fs.existsSync(pdfPath)) {
					fs.unlinkSync(pdfPath);
				}
				fs.writeFileSync(pdfPath, pdfBuffer);
				fulfil(pdfPath);
				/*
				pdf.create(rawHTML, {format: 'A4'}).toFile(pdfPath, function (err, pdfResponse) {
					if (err) {
						reject(err);
					} else {
						fulfil(pdfPath);
					}
				});
				*/
			} else {
				//return the buffer
				fulfil(pdfBuffer);
			}
		}, {}, {args: ["--no-sandbox"]});
    });
}

function SendEmail(recipientEmail, emailSubject, emailAttachments, templateName, htmlContents, archiveFileName, dataObject) {
	function GetHTML() {
		return new Promise(function(fulfil, reject) {
			if (templateName && templateName.length > 0) {
				fs.readFile('v2/templates/' + templateName, {encoding: 'utf8'}, function (err, templateFileData) {
					if (err) {
						reject('Error loading template file: ' + (err.message || err));
					} else {
						let rawHTML = Mustache.render(templateFileData, dataObject);
						// Clearing whitespace to shirnk the mail to prevent trimming in gmail (~>120k)
						rawHTML = rawHTML.replace(/\>\s+/g, ">");
						rawHTML = rawHTML.replace(/\s+\</g, "<");
						rawHTML = rawHTML.replace(/[\r\n]\s+/g, " ");
						// Encoding to html entities because there is a problem with setting encoding in outlook
						rawHTML = rawHTML.replace(/[\u00A0-\u9999]/gim, function(i) {
							return '&#'+i.charCodeAt(0)+';';
						});
						fulfil(rawHTML);
					}
				});
			} else {
				fulfil(htmlContents);
			}
		});
	}
	
    return new Promise(function(fulfil, reject) {
		if (emailAttachments == null)
			emailAttachments = [];
		GetHTML().then(function(rawHTML) {
			if (archiveFileName) {
				fs.writeFileSync("v2/templates/Archive/" + archiveFileName, rawHTML, {encoding: 'utf8'});
			}
			let mailSettings = settings.feedbackMail || settings.mail;
			let smtpConfig = {
				host: mailSettings.host,
				port: mailSettings.port,
				secure: mailSettings.secure,
				auth: {
					user: mailSettings.username,
					pass: mailSettings.password
				},
				tls: {
					rejectUnauthorized: false
				}
			};
			let transporter = nodemailer.createTransport(smtpConfig);
			let transportData = {
				from: {
					name: localEmailSettings.from_name,
					address: localEmailSettings.from_address
				},
				to: recipientEmail,
				subject: emailSubject,
				attachments: emailAttachments,
				html: rawHTML
			};
			transporter.sendMail(transportData, function (err, mailSendInfo) {
				if (err) {
					reject('Error sending mail: ' + (err.message || err));
					console.log(err);
				} else {
					fulfil(mailSendInfo);
				}
			});
		}, function(err) {
			reject(err);
		});
	});
}

function FormatDate(date, sFormat) {
	let formatted = sFormat + '';
	let day = date.getDate();
	let paddedDay = day < 10 ? '0' + day : day.toString();
	let month = date.getMonth() + 1;
	let paddedMonth = month < 10 ? '0' + month : month.toString();
	let fullYear = date.getFullYear();
	while (formatted.indexOf('dd') >= 0)
		formatted = formatted.replace('dd', paddedDay);
	while (formatted.indexOf('d') >= 0)
		formatted = formatted.replace('d', day.toString());
	while (formatted.indexOf('MM') >= 0)
		formatted = formatted.replace('MM', paddedMonth);
	while (formatted.indexOf('M') >= 0)
		formatted = formatted.replace('M', month.toString());
	while (formatted.indexOf('yyyy') >= 0)
		formatted = formatted.replace('yyyy', fullYear.toString());
	return formatted;
}

function RemoveQuotes(data) {
	if (typeof data === 'undefined')
		data = null;
	if (data == null || data == '')
		return '';
	var clean = data.toString();
	while (clean.indexOf('"') >= 0)
		clean = clean.replace('"', '');
	while (clean.indexOf("'") >= 0)
		clean = clean.replace("'", '');
	return clean;
}

module.exports.CreateDbConnection = CreateDbConnection;
module.exports.mkdirTree = mkdirTree;
module.exports.IsValidEmail = IsValidEmail;
module.exports.createPDF = createPDF;
module.exports.SendEmail = SendEmail;
module.exports.FormatDate = FormatDate;
module.exports.RemoveQuotes = RemoveQuotes;
