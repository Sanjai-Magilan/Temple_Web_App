/**
 * Hall Booking Controller
 * Handles hall booking-related operations
 */

const hallBookingModel = require("../models/hallBookingModel");

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

        // Fetch booking
        const [rows] = await db.execute(
            "SELECT * FROM hall_bookings WHERE id = ?",
            [bookingId]
        );

        if (!rows.length) {
            return res.redirect("/bookings");
        }

        // Render payment page
        res.render("payment", {
            booking: rows[0]
        });

    } catch (err) {

        console.error(err);
        res.redirect("/bookings");
    }
};

exports.cancelBooking = async (req, res) => {

    const bookingId = req.params.id;
    console.log("Cancel Booking ID:", bookingId);

    try {

        console.log(hallBookingModel.findById(bookingId))
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
            message: "Server error"
        });
    }
};
