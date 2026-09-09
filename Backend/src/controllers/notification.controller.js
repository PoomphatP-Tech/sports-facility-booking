const notificationService = require('../services/notifcation.service');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.getNotifications(userId);
    return res.status(200).json({ status: 'ok', data: result });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ status: 'error', message: 'internal server error' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notifId = parseInt(req.params.notifId, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ status: 'error', message: 'invalid notification id' });
    }
    const userId = req.user.id;
    const result = await notificationService.markNotificationRead(notifId, userId);
    return res.status(200).json({ status: 'ok', data: result });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ status: 'error', message: 'internal server error' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllNotificationsRead(userId);
    return res.status(200).json({ status: 'ok', data: result });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({ status: 'error', message: 'internal server error' });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
