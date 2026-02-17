const express = require("express");
const router = express.Router();
const paymentController = require("../../controllers/admin/paymentHistoryController");
const authMiddleware = require("../../middleware/authMiddleware");

router.get('/admin/payments', authMiddleware.verifyToken, authMiddleware.requireRole('admin'),
    paymentController.paymentHistory);


module.exports = router;