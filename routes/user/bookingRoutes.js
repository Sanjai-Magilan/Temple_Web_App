/**
 * Booking Routes
 */

const express = require("express");
const router = express.Router();
const hallBookingController = require("../../controllers/hallBookingController");
const poojaBookingController = require("../../controllers/poojaBookingController");
const authMiddleware = require("../../middleware/authMiddleware");
const logger = require("../../utils/logger");
logger.info("hallBookingController:", hallBookingController);
logger.info("poojaBookingController:", poojaBookingController);
logger.info("authMiddleware:", authMiddleware);
const receiptController = require("../../controllers/receiptController");
// Hall booking routes
router.get(
  "/bookings/hall",
  authMiddleware.verifyToken,
  hallBookingController.list,
);
router.get(
  "/bookings/hall/new",
  authMiddleware.verifyToken,
  hallBookingController.showNew,
);

// Continue and cancel routes for hall bookings
router.get(
  "/bookings/hall/continue/:id",
  authMiddleware.verifyToken,
  hallBookingController.continuePayment,
);

router.delete(
  "/bookings/hall/cancel/:id",
  authMiddleware.verifyToken,
  hallBookingController.cancelBooking,
);

//router.get("/bookings/hall/new", (req, res) => res.send("OK"));

// Pooja booking routes
router.get(
  "/bookings/pooja",
  authMiddleware.verifyToken,
  poojaBookingController.list,
);
router.get(
  "/bookings/pooja/new",
  authMiddleware.verifyToken,
  poojaBookingController.showNew,
);

router.get(
  "/bookings/hall/:id/receipt",
  authMiddleware.verifyToken,
  receiptController.downloadHallReceipt
);

router.get(
  "/bookings/pooja/:id/receipt",
  authMiddleware.verifyToken,
  receiptController.downloadPoojaReceipt
);

router.get(
  "/bookings/pooja/continue/:id",
  authMiddleware.verifyToken,
  poojaBookingController.continuePayment,
);

router.delete(
  "/bookings/pooja/cancel/:id",
  authMiddleware.verifyToken,
  poojaBookingController.cancelBooking,
);

module.exports = router;
