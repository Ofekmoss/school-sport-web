var multiparty = require('multiparty')

module.exports = function () {
    return function (req, res, next) {
        var contentType = req.headers["content-type"];
        if (!contentType) {
            next();
            return;
        }

        var i = contentType.indexOf(";");
        if (i >= 0) {
            contentType = contentType.slice(0, i);
        }

        if (contentType === "multipart/form-data") {
            var form = new multiparty.Form();
            form.parse(req, function (err, fields, files) {
                if (err) {
                    res.status(500).send(err);
                }
                else {
                    for (var key in fields) {
                        req.body[key] = fields[key][0];
                    }
                    for (var key in files) {
                        req.body[key] = files[key][0];
                    }

                    next();
                }
            });
        }
        else {
            next();
        }
    };
};