const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, notificationController.getNotifications);
router.post('/:notifId/read', requireAuth, notificationController.markNotificationRead);
router.post('/read-all', requireAuth, notificationController.markAllNotificationsRead);

module.exports = router;
