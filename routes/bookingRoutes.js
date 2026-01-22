/**
 * Booking Routes
 */

const express = require("express");
const router = express.Router();
const hallBookingController = require("../controllers/hallBookingController");
const poojaBookingController = require("../controllers/poojaBookingController");
const authMiddleware = require("../middleware/authMiddleware");

// console.log("hallBookingController:", hallBookingController);
// console.log("poojaBookingController:", poojaBookingController);
// console.log("authMiddleware:", authMiddleware);

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

module.exports = router;
