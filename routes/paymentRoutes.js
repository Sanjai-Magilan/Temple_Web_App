/**
 * Payment Routes
 * Handles Razorpay payment endpoints
 */

const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// Payment order creation (requires authentication)
router.post(
  "/donation/order",
  authMiddleware.verifyToken,
  paymentController.createDonationOrder,
);
router.post(
  "/hall-booking/order",
  authMiddleware.verifyToken,
  paymentController.createHallBookingOrder,
);
router.post(
  "/pooja-booking/order",
  authMiddleware.verifyToken,
  paymentController.createPoojaBookingOrder,
);

// Payment verification (requires authentication)
router.post(
  "/verify",
  authMiddleware.verifyToken,
  paymentController.verifyPayment,
);
// Payment success page (GET)
router.get("/success", paymentController.paymentSuccess);
router.get("/failure", paymentController.paymentFailure);
// Webhook endpoint (no authentication - uses signature verification)
// Note: Webhook body must be raw JSON for signature verification
router.post(
  "/webhook",
  (req, res, next) => {
    // Store raw body for signature verification
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      req.rawBody = data;
      req.body = JSON.parse(data);
      next();
    });
  },
  paymentController.handleWebhook,
);

module.exports = router;
