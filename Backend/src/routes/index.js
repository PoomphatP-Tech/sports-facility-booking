const express = require('express');
const authRoutes = require('./auth.routes');
const dbRoutes = require('./db.routes');
const facilityRoutes = require('./facility.routes');
const bookingRoutes = require('./booking.routes');
const equipmentReportRoutes = require('./equipment-report.routes');
const partnerMatchingRoutes = require('./partner-matching.routes');
const staffManagementRoutes = require('./staff-management.route');
const notificationRoutes = require('./notification.routes');
const profileRoutes = require('./profile.route');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/db', dbRoutes);
router.use('/facilities', facilityRoutes);
router.use('/bookings', bookingRoutes);
router.use('/equipment-reports', equipmentReportRoutes);
router.use('/partner-matching', partnerMatchingRoutes);
router.use('/staff-management', staffManagementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/profile', profileRoutes);
router.use('/admins', adminRoutes);

module.exports = router;