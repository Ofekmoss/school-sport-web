var express = require("express");
var router = express.Router();

var util = require("../util");

var Championships = require("../../models/admin/championships");

router.get("/championships", util.requireRole("admin"), function (req, res) {
  if (req.session.user) {
    var options = {};
    if (req.body.season) {
      options.season = parseInt(req.body.season);
    }

    Championships.getRaw(options, function (err, result) {
      util.sendResult(res, err, result);
    });
  } else {
    util.sendResult(res, { status: 403 });
  }
});

module.exports = router;
