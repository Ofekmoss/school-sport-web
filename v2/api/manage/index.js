var express = require('express');
var router = express.Router();

router.use('/teams', require('./teams'));
router.use('/players', require('./players'));
router.use('/championships', require('./championships'));
router.use('/schools', require('./schools'));
router.use('/students', require('./students'));
router.use('/sports', require('./sports'));
router.use('/regions', require('./regions'));
router.use('/cities', require('./cities'));
router.use('/categories', require('./categories'));
router.use('/category-names', require('./category-names'));
router.use('/seasons', require('./seasons'));
router.use('/facilities', require('./facilities'));
router.use('/users', require('./users'));
router.use('/upcoming-events', require('./upcoming-events'));
router.use('/dashboard', require('./dashboard'));

module.exports = router;