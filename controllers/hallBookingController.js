/**
 * Hall Booking Controller
 * Handles hall booking-related operations
 */

const hallBookingModel = require("../models/hallBookingModel");
const paymentModel = require("../models/paymentModel");
/**
 * List user hall bookings
 */
exports.list = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const bookings = await hallBookingModel.getUserBookings(req.user.id, 50, 0);

    res.render("bookings/hall/list", {
      title: "Hall Bookings",
      user: req.user,
      bookings: bookings,
    });
  } catch (error) {
    console.error("Error loading hall bookings:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load hall bookings",
    });
  }
};

/**
 * Show hall booking form
 */
exports.showNew = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    res.render("bookings/hall/new", {
      title: "Book a Hall",
      user: req.user,
      error: null,
    });
  } catch (error) {
    console.error("Error loading hall booking form:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load hall booking form",
    });
  }
};

exports.continuePayment = async (req, res) => {
  const bookingId = req.params.id;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const booking = await hallBookingModel.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (Number(booking.user_id) !== Number(req.user.id)) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Booking is not pending" });
    }

    if (!booking.payment_id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment not initialized" });
    }

    const payment = await paymentModel.findById(booking.payment_id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Payment already processed" });
    }

    return res.json({
      success: true,
      order_id: payment.order_id,
      amount: payment.amount,
      key: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
      description: `Hall booking ${booking.booking_number}`,
    });
  } catch (error) {
    console.error("Error resuming hall booking payment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resume payment" });
  }
};

exports.cancelBooking = async (req, res) => {
  const bookingId = req.params.id;
  console.log("Cancel Booking ID:", bookingId);

  try {
    console.log(hallBookingModel.findById(bookingId));
    const result = await hallBookingModel.cancelBookingById(bookingId);

    if (result > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Booking not found" });
    }
  } catch (err) {
    console.error("Controller Error (cancelBooking):", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
