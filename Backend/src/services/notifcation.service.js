const { pool } = require('../config/db');

const getNotifications = async (userId) => {
  const result = await pool.query(
    `
    SELECT notif_id, message, is_read, type, sending_at
    FROM public.notification_histories
    WHERE user_id = $1
    ORDER BY sending_at DESC
    LIMIT 50
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    notifId: row.notif_id,
    message: row.message,
    isRead: row.is_read,
    type: row.type,
    sendingAt: row.sending_at,
  }));
};

const markNotificationRead = async (notifId, userId) => {
  const result = await pool.query(
    `
    UPDATE public.notification_histories
    SET is_read = TRUE
    WHERE notif_id = $1 AND user_id = $2
    RETURNING notif_id
    `,
    [notifId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Notification not found');
  }

  return { notifId, isRead: true };
};

const markAllNotificationsRead = async (userId) => {
  await pool.query(
    `
    UPDATE public.notification_histories
    SET is_read = TRUE
    WHERE user_id = $1 AND is_read = FALSE
    `,
    [userId]
  );

  return { message: 'All notifications marked as read' };
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
