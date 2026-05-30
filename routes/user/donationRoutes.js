/**
 * Donation Routes
 */

const express = require("express");
const router = express.Router();
const donationController = require("../../controllers/donationController");
const authMiddleware = require("../../middleware/authMiddleware");
const receiptController = require("../../controllers/receiptController");

// List donations
router.get(
  "/admin/donations",
  (req, res, next) => { console.log('Hit /admin/donations'); next(); },
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  donationController.listAdmin,
);

router.get("/donations", authMiddleware.verifyToken, donationController.list);

// New donation form
router.get(
  "/donations/new",
  authMiddleware.verifyToken,
  donationController.showNew,
);

router.get(
  "/donations/:id/receipt",
  authMiddleware.verifyToken,
  receiptController.downloadDonationReceipt,
);

router.get(
  "/donations/:id/receipt/view",
  authMiddleware.verifyToken,
  receiptController.viewDonationReceipt,
);

module.exports = router;
