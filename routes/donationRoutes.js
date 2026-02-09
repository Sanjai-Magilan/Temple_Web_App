/**
 * Donation Routes
 */

const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const authMiddleware = require('../middleware/authMiddleware');

// List donations
router.get('/donations', authMiddleware.verifyToken, donationController.list);

// New donation form
router.get('/donations/new', authMiddleware.verifyToken, donationController.showNew);

module.exports = router;



