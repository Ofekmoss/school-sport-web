var express = require('express');

var router = express.Router();


router.use('/teams', require('./teams'));
router.use('/competitions', require('./competitions'));
router.use('/players' , require('./players'));
router.use('/schools' , require('./schools'));
router.use('/championships' , require('./championships'));
router.use('/projects' , require('./projects'));
router.use('/data', require('./data'));

module.exports = router;