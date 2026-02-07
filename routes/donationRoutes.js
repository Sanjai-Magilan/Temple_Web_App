/**
 * Donation Routes
 */

const express = require("express");
const router = express.Router();
const donationController = require("../controllers/donationController");
const authMiddleware = require("../middleware/authMiddleware");

// List donations
router.get("/donations", authMiddleware.verifyToken, donationController.list);

// New donation form
router.get(
  "/donations/new",
  authMiddleware.verifyToken,
  donationController.showNew,
);

// Admin: List all donations
router.get(
  "/admin/donations",
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  donationController.adminList,
);
router.get(
  "/donations/:id/receipt",
  authMiddleware.verifyToken,
  donationController.downloadReceipt,
);
module.exports = router;
