/**
 * Hall Booking Controller
 * Handles hall booking-related operations
 */

const hallBookingModel = require("../models/hallBookingModel");
const paymentModel = require("../models/paymentModel");
const bookingCache = require("../utils/bookingCache");
const pool = require("../config/database");
/**
 * List user hall bookings
 */
exports.list = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const dbBookings = await hallBookingModel.getUserBookings(req.user.id, 50, 0);

    // Also fetch pending bookings from cache
    const pendingPayments = await paymentModel.getPendingPaymentsByType(req.user.id, "hall_booking");
    const cachedBookings = [];

    for (const payment of pendingPayments) {
      const cachedData = bookingCache.get(payment.order_id);
      if (cachedData) {
        cachedBookings.push({
          ...cachedData,
          id: `p-${payment.id}`, // Use payment id with p- prefix for cached bookings
          booking_number: "HALL-PENDING-" + payment.id,
          created_at: cachedData.cachedAt,
          payment_id: payment.id,
          is_cached: true
        });
      }
    }

    res.render("bookings/hall/list", {
      title: "Hall Bookings",
      user: req.user,
      bookings: [...cachedBookings, ...dbBookings],
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

    const bookingParam = req.params.id;
    let booking;

    if (bookingParam.startsWith('p-')) {
        const paymentId = bookingParam.substring(2);
        const payment = await paymentModel.findById(paymentId);
        if (payment && payment.order_id) {
            const cachedData = bookingCache.get(payment.order_id);
            if (cachedData) {
                booking = {
                    ...cachedData,
                    id: bookingParam,
                    booking_number: "HALL-PENDING-" + paymentId,
                    created_at: cachedData.cachedAt,
                    payment_id: payment.id,
                    is_cached: true
                };
            }
        }
    } else {
        booking = await hallBookingModel.findById(bookingParam);
    }

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
    const bookingParam = req.params.id;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let booking;
    let paymentOrderId = null;
    let paymentAmount = null;

    if (bookingParam.startsWith('p-')) {
        const paymentId = bookingParam.substring(2);
        const payment = await paymentModel.findById(paymentId);
        if (payment && payment.order_id) {
            const cachedData = bookingCache.get(payment.order_id);
            if (cachedData) {
                booking = { ...cachedData, id: bookingParam, payment_id: payment.id };
                paymentOrderId = payment.order_id;
                paymentAmount = payment.amount;
            }
        }
    } else {
        booking = await hallBookingModel.findById(bookingParam);
        if (booking && booking.payment_id) {
            const payment = await paymentModel.findById(booking.payment_id);
            if (payment) {
                paymentOrderId = payment.order_id;
                paymentAmount = payment.amount;
            }
        }
    }

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

    if (!paymentOrderId) {
      return res
        .status(400)
        .json({ success: false, message: "Payment not initialized" });
    }

    return res.json({
      success: true,
      order_id: paymentOrderId,
      amount: paymentAmount,
      key: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
      description: `Hall booking ${booking.booking_number || 'Pending'}`,
    });
  } catch (error) {
    console.error("Error resuming hall booking payment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resume payment" });
  }
};

exports.cancelBooking = async (req, res) => {
  const bookingParam = req.params.id;

  try {
    if (bookingParam.startsWith('p-')) {
        const paymentId = bookingParam.substring(2);
        const payment = await paymentModel.findById(paymentId);
        if (payment && Number(payment.user_id) === Number(req.user.id)) {
            if (payment.order_id) {
                bookingCache.delete(payment.order_id);
            }
            await pool.execute("DELETE FROM payments WHERE id = ?", [paymentId]);
            return res.json({ success: true });
        }
    }

    const result = await hallBookingModel.cancelBookingById(bookingParam);

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
