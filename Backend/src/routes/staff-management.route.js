const express = require('express');
const staffManagementController = require('../controllers/staff-management.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, staffManagementController.getAllStaff);
router.post('/', requireAuth, staffManagementController.createStaff);
router.put('/:staffId', requireAuth, staffManagementController.updateStaff);
router.delete('/:staffId', requireAuth, staffManagementController.deleteStaff);
router.patch('/:staffId/status', requireAuth, staffManagementController.updateStaffStatus);

module.exports = router;
