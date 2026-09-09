const express = require('express');
const equipmentReportController = require('../controllers/equipment-report.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', authMiddleware.requireAuth, equipmentReportController.createReport);
router.get('/mine', authMiddleware.requireAuth, equipmentReportController.getMyReports);
router.get('/', authMiddleware.requireAuth, equipmentReportController.getAllReports);
router.patch('/:reportId/status', authMiddleware.requireAuth, equipmentReportController.updateReportStatus);

module.exports = router;