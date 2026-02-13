/**
 * Admin Booking Routes
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/admin/bookingController');
const authMiddleware = require('../../middleware/authMiddleware');

// List bookings (requires admin role)
// Assuming 'admin' is the role name. If not, we might need to adjust.
// Based on typical systems, 'admin' is standard.
router.get('/bookings', authMiddleware.verifyToken, bookingController.list);

module.exports = router;
