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
