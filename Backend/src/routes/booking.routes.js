const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const router = express.Router();

// Members view the available time slots of a specific venue
router.get(
    '/facilities/:facilityId/slots',
    requireAuth,
    requireRole(['member']),
    bookingController.getAvailableSlots
);

// Member submits a reservation request
router.post(
    '/requests',
    requireAuth,
    requireRole(['member']),
    bookingController.submitBookingRequest
);

// Staff view all pending requests for the facilities they are responsible for
router.get(
    '/staff/pending',
    requireAuth,
    requireRole(['staff']),
    bookingController.getPendingRequests
);

// approve
router.post(
    '/requests/:requestId/approve',
    requireAuth,
    requireRole(['staff']),
    bookingController.approveRequest
);

// reject
router.post(
    '/requests/:requestId/reject',
    requireAuth,
    requireRole(['staff']),
    bookingController.rejectRequest
);

// Members view their own reservations
router.get(
    '/my',
    requireAuth,
    requireRole(['member']),
    bookingController.getMyBookings
);

// Member cancels reservation
router.post(
    '/:bookingId/cancel',
    requireAuth,
    requireRole(['member']),
    bookingController.cancelBooking
);

// View notifications
router.get(
    '/notifications',
    requireAuth,
    bookingController.getNotifications
);

// Mark a single notification as read
router.post(
    '/notifications/:notifId/read',
    requireAuth,
    bookingController.markNotificationRead
);

// Mark all notifications as read
router.post(
    '/notifications/read-all',
    requireAuth,
    bookingController.markAllNotificationsRead
);

// Staff view upcoming bookings
router.get(
    '/staff/upcoming',
    requireAuth,
    requireRole(['staff']),
    bookingController.getUpcomingBookings
);

// Employee confirmation completed
router.post(
    '/:bookingId/complete',
    requireAuth,
    requireRole(['staff']),
    bookingController.completeBooking
);

// Member cancels a pending request
router.post(
    '/requests/:requestId/cancel',
    requireAuth,
    requireRole(['member']),
    bookingController.cancelPendingRequest
);

// Staff search for alternative facilities
router.get(
    '/requests/:requestId/alternatives',
    requireAuth,
    requireRole(['staff']),
    bookingController.searchAlternatives
);

// Staff recommend alternative facilities
router.post(
    '/requests/:requestId/suggest-alternative',
    requireAuth,
    requireRole(['staff']),
    bookingController.suggestAlternative
);

// Member response the recommendation
router.post(
    '/requests/:requestId/respond-alternative',
    requireAuth,
    requireRole(['member']),
    bookingController.respondToAlternative
);

module.exports = router;