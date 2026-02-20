/**
 * Authentication Routes
 */

const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authController");
const validationMiddleware = require("../../middleware/validationMiddleware");
const authMiddleware = require("../../middleware/authMiddleware");
const jwtUtils = require("../../utils/jwt");
const passport = require("passport");

// Registration routes
router.get(
    "/register",
    authMiddleware.optionalAuth,
    authController.showRegister,
);
router.post(
    "/register",
    authMiddleware.optionalAuth,
    validationMiddleware.validateRegistration,
    authController.register,
);

// Login routes
router.get("/login", authMiddleware.optionalAuth, authController.showLogin);
router.post(
    "/login",
    authMiddleware.optionalAuth,
    validationMiddleware.validateLogin,
    authController.login,
);

//Google Login starts here
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    }),
);

// Google callback
// Google callback
router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
    }),
    authController.googleCallback,
);

// Old OTP Routes (Removed)
// router.post('/send-otp', authMiddleware.optionalAuth, authController.sendOtp);
// router.post('/verify-otp', authMiddleware.optionalAuth, authController.verifyOtp);
// router.get('/resend-otp', authMiddleware.optionalAuth, authController.resendOtp);

// Logout route
router.post("/logout", authController.logout);
router.get("/logout", authController.logout);

// OTP Verification routes
router.get("/verify-otp", authController.showOTPPage);
router.post("/verify-otp", authController.verifyOTP);

// Resend OTP route
router.post("/resend-otp", authController.resendOTP);

// Complete profile (phone) routes for Google users
router.get(
    "/complete-profile",
    authMiddleware.verifyToken,
    authController.showCompleteProfile,
);
router.post(
    "/complete-profile",
    authMiddleware.verifyToken,
    authController.savePhone,
);

// router.get("/complete-profile", authMiddleware.verifyToken, authController.showCompleteProfile);
// router.post("/complete-profile", authMiddleware.verifyToken, authController.savePhone);

router.get("/forgot-password", authController.showForgotPassword);
router.post("/forgot-password", authController.requestPasswordReset);

// Verify Reset OTP routes
router.get("/verify-reset-otp", authController.showVerifyResetOTP);
router.post("/verify-reset-otp", authController.verifyResetOTP);
router.post("/resend-reset-otp", authController.resendResetOTP);

// Reset Password routes
router.get("/reset-password", authController.showResetPassword);
router.post("/reset-password", authController.resetPassword);


module.exports = router;
