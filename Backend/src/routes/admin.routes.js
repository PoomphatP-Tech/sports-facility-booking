const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, requireRole(['admin']), adminController.getAllAdmins);
router.post('/', requireAuth, requireRole(['admin']), adminController.createAdmin);
router.put('/:adminId', requireAuth, requireRole(['admin']), adminController.updateAdmin);
router.delete('/:adminId', requireAuth, requireRole(['admin']), adminController.deleteAdmin);

module.exports = router;
