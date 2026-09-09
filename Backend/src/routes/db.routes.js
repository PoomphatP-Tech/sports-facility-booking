const express = require('express');
const dbController = require('../controllers/db.controller');

const router = express.Router();

router.get('/ping', dbController.pingDatabase);

module.exports = router;
