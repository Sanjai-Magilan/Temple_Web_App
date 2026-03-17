/**
 * Pooja Booking Controller
 * Handles pooja booking-related operations
 */

const poojaBookingModel = require("../models/poojaBookingModel");

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
exports.showNew = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const bookings = await poojaBookingModel.getUserBookings(
      req.user.id,
      50,
      0,
    );

    res.render("bookings/pooja/new", {
      title: "Book a Pooja",
      user: req.user,
      bookings: bookings,
      error: null,
    });
  } catch (error) {
    console.error("Error loading pooja booking form:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to load pooja booking form",
    });
  }
};
