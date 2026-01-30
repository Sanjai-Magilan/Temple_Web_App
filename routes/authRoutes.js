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
router.post('/verify-register-otp', authMiddleware.optionalAuth, authController.verifyRegisterOtp);

// Login routes
router.get('/login', authMiddleware.optionalAuth, authController.showLogin);
router.post('/login', authMiddleware.optionalAuth, validationMiddleware.validateLogin, authController.login);

// OTP Routes
router.post('/send-otp', authMiddleware.optionalAuth, authController.sendOtp);
router.post('/verify-otp', authMiddleware.optionalAuth, authController.verifyOtp);
router.get('/resend-otp', authMiddleware.optionalAuth, authController.resendOtp);

// Logout route
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

module.exports = router;



