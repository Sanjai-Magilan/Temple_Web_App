/**
 * Pooja Booking Controller
 * Handles pooja booking-related operations
 */

const poojaBookingModel = require("../models/poojaBookingModel");
const paymentModel = require("../models/paymentModel");
const bookingCache = require("../utils/bookingCache");
const pool = require("../config/database");

/**
 * List user pooja bookings
 */
exports.list = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const dbBookings = await poojaBookingModel.getUserBookings(
      req.user.id,
      50,
      0,
    );
    
    // Also fetch pending bookings from cache
    const pendingPayments = await paymentModel.getPendingPaymentsByType(req.user.id, "pooja_booking");
    const cachedBookings = [];
    
    for (const payment of pendingPayments) {
      const cachedData = bookingCache.get(payment.order_id);
      if (cachedData) {
        cachedBookings.push({
          ...cachedData,
          id: `p-${payment.id}`, // Use payment id with p- prefix for cached bookings
          booking_number: "POOJA-PENDING-" + payment.id,
          created_at: cachedData.cachedAt,
          payment_id: payment.id,
          is_cached: true
        });
      }
    }

    res.render("bookings/pooja/list", {
      title: "Pooja Bookings",
      user: req.user,
      bookings: [...cachedBookings, ...dbBookings],
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
              booking_number: "POOJA-PENDING-" + paymentId,
              created_at: cachedData.cachedAt,
              payment_id: payment.id,
              is_cached: true
            };
          }
        }
      } else {
        booking = await poojaBookingModel.findById(bookingParam);
      }
  
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
  const bookingParam = req.params.id;
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    let booking;
    let paymentOrderId = null;
    let paymentAmount = null;

    if (bookingParam.startsWith("p-")) {
      const paymentId = bookingParam.substring(2);
      const payment = await paymentModel.findById(paymentId);
      if (payment && payment.order_id) {
        const cachedData = bookingCache.get(payment.order_id);
        if (cachedData) {
          booking = {
            ...cachedData,
            id: bookingParam,
            payment_id: payment.id,
          };
          paymentOrderId = payment.order_id;
          paymentAmount = payment.amount;
        }
      }
    } else {
      booking = await poojaBookingModel.findById(bookingParam);
      if (booking && booking.payment_id) {
        const payment = await paymentModel.findById(booking.payment_id);
        if (payment) {
          paymentOrderId = payment.order_id;
          paymentAmount = payment.amount;
        }
      }
    }

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
    if (!paymentOrderId)
      return res
        .status(400)
        .json({ success: false, message: "Payment not initialized" });

    return res.json({
      success: true,
      order_id: paymentOrderId,
      amount: paymentAmount,
      key: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
      description: `Pooja booking ${booking.booking_number || "Pending"}`,
    });
  } catch (error) {
    console.error("Error resuming pooja booking payment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resume payment" });
  }
};

exports.cancelBooking = async (req, res) => {
  const bookingParam = req.params.id;
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (bookingParam.startsWith("p-")) {
      const paymentId = bookingParam.substring(2);
      const payment = await paymentModel.findById(paymentId);
      if (payment && Number(payment.user_id) === Number(req.user.id)) {
        // Delete from cache if exists
        if (payment.order_id) {
          bookingCache.delete(payment.order_id);
        }
        // Delete payment entry to be clean
        await pool.execute("DELETE FROM payments WHERE id = ?", [paymentId]);
        return res.json({ success: true });
      }
    }

    const booking = await poojaBookingModel.findById(bookingParam);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    if (Number(booking.user_id) !== Number(req.user.id))
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    if (booking.status !== "pending")
      return res.status(400).json({
        success: false,
        message: "Only pending bookings can be cancelled",
      });

    const affectedRows = await poojaBookingModel.cancelBookingById(bookingParam);
    if (affectedRows > 0) return res.json({ success: true });

    return res.json({ success: false, message: "Booking not found" });
  } catch (error) {
    console.error("Controller Error (cancelBooking pooja):", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
