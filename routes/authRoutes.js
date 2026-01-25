/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validationMiddleware = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

// Registration routes
router.get('/register', authMiddleware.optionalAuth, authController.showRegister);
router.post('/register', authMiddleware.optionalAuth, validationMiddleware.validateRegistration, authController.register);

// Login routes
router.get('/login', authMiddleware.optionalAuth, authController.showLogin);
router.post('/login', authMiddleware.optionalAuth, validationMiddleware.validateLogin, authController.login);

// Logout route
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

// Forgot password routes
router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

// Reset password routes
router.get('/reset-password', authController.showResetPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;



