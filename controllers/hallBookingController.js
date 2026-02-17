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
      booking: null // Explicitly pass null for new bookings
    });
  } catch (error) {
    console.error("Error loading hall booking form:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load hall booking form",
    });
  }
};

exports.showContinue = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const bookingId = req.params.id;
    const booking = await hallBookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).render("errors/404", {
        title: "Not Found",
        message: "Booking not found"
      });
    }

    // Verify ownership
    if (Number(booking.user_id) !== Number(req.user.id)) {
      return res.status(403).render("errors/403", {
        title: "Unauthorized",
        message: "You are not authorized to view this booking"
      });
    }

    // Verify status (optional, but usually we only continue pending bookings)
    if (booking.status !== 'pending') {
       return res.redirect('/bookings/hall');
    }
    
    // Parse food_meals if it's a string, ensuring it's an array for the view
    if (booking.food_meals && typeof booking.food_meals === 'string') {
        booking.food_meals = booking.food_meals.split(',').map(s => s.trim());
    } else if (!booking.food_meals) {
        booking.food_meals = [];
    }

    res.render("bookings/hall/new", {
      title: "Complete Hall Booking",
      user: req.user,
      error: null,
      booking: booking
    });
  } catch (error) {
    console.error("Error loading hall booking continue form:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load booking details",
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
