const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/admin/paymentHistoryController");
const receiptController = require("../../controllers/receiptController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get(
  "/admin/payments",
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  paymentController.paymentHistory,
);

router.get(
  "/admin/payments/:paymentId/receipt",
  authMiddleware.verifyToken,
  authMiddleware.requireRole("admin"),
  receiptController.downloadAdminPaymentReceipt,
);

module.exports = router;
