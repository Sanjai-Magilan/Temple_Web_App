/**
 * Pooja Booking Controller
 * Handles pooja booking-related operations
 */

const poojaBookingModel = require("../models/poojaBookingModel");
const paymentModel = require("../models/paymentModel");

/**
 * List user pooja bookings
 */
exports.list = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const bookings = await poojaBookingModel.getUserBookings(
      req.user.id,
      50,
      0,
    );

    res.render("bookings/pooja/list", {
      title: "Pooja Bookings",
      user: req.user,
      bookings: bookings,
    });
  } catch (error) {
    console.error("Error loading pooja bookings:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load pooja bookings",
    });
  }
};

/**
 * Show pooja booking form
 */
exports.showNew = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    res.render("bookings/pooja/new", {
      title: "Book a Pooja",
      user: req.user,
      error: null,
      booking: null
    });
  } catch (error) {
    console.error("Error loading pooja booking form:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load pooja booking form",
    });
  }
};

exports.showContinue = async (req, res) => {
  try {
      if (!req.user) {
        return res.redirect("/login");
      }
  
      const bookingId = req.params.id;
      const booking = await poojaBookingModel.findById(bookingId);
  
      if (!booking) {
        return res.status(404).render("errors/404", {
          title: "Not Found",
          message: "Booking not found"
        });
      }
  
      if (Number(booking.user_id) !== Number(req.user.id)) {
        return res.status(403).render("errors/403", {
          title: "Unauthorized",
          message: "You are not authorized to view this booking"
        });
      }

      if (booking.status !== 'pending') {
         return res.redirect('/bookings/pooja');
      }
  
      res.render("bookings/pooja/new", {
        title: "Complete Pooja Booking",
        user: req.user,
        error: null,
        booking: booking
      });
    } catch (error) {
      console.error("Error loading pooja booking continue form:", error);
      res.status(500).render("errors/500", {
        title: "Server Error",
        message: "Failed to load booking details",
      });
    }
  };

exports.continuePayment = async (req, res) => {
  const bookingId = req.params.id;
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const booking = await poojaBookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    if (Number(booking.user_id) !== Number(req.user.id))
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    if (booking.status !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Booking is not pending" });
    if (!booking.payment_id)
      return res
        .status(400)
        .json({ success: false, message: "Payment not initialized" });

    const payment = await paymentModel.findById(booking.payment_id);
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    if (payment.status !== "pending")
      return res
        .status(400)
        .json({ success: false, message: "Payment already processed" });

    return res.json({
      success: true,
      order_id: payment.order_id,
      amount: payment.amount,
      key: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
      description: `Pooja booking ${booking.booking_number}`,
    });
  } catch (error) {
    console.error("Error resuming pooja booking payment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resume payment" });
  }
};

exports.cancelBooking = async (req, res) => {
  const bookingId = req.params.id;
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const booking = await poojaBookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    if (Number(booking.user_id) !== Number(req.user.id))
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    if (booking.status !== "pending")
      return res
        .status(400)
        .json({
          success: false,
          message: "Only pending bookings can be cancelled",
        });

    const affectedRows = await poojaBookingModel.cancelBookingById(bookingId);
    if (affectedRows > 0) return res.json({ success: true });

    return res.json({ success: false, message: "Booking not found" });
  } catch (error) {
    console.error("Controller Error (cancelBooking pooja):", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
