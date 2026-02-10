/**
 * Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const adminDashboardController = require('../controllers/adminDashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// User dashboard
router.get('/dashboard', authMiddleware.verifyToken, dashboardController.userDashboard);

// Admin dashboard
router.get('/admin', authMiddleware.verifyToken, authMiddleware.requireRole('admin'),
    dashboardController.adminDashboard);

// Manage Users
router.get('/admin/users', authMiddleware.verifyToken, authMiddleware.requireRole('admin'), adminDashboardController.manageUsers);

//Payment History
router.get('/admin/payments', authMiddleware.verifyToken, authMiddleware.requireRole('admin'), adminDashboardController.paymentHistory);

module.exports = router;


