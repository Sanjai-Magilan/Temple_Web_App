/**
 * Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController');
const authMiddleware = require('../../middleware/authMiddleware');

// User dashboard
router.get('/dashboard', authMiddleware.verifyToken, dashboardController.userDashboard);

// Admin dashboard
router.get('/admin', authMiddleware.verifyToken, authMiddleware.requireRole('admin'), dashboardController.adminDashboard);

module.exports = router;



