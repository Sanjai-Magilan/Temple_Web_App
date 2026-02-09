const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

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


const buildReceiptData = (booking) => {
  const userName =
    `${booking.first_name || ""} ${booking.last_name || ""}`.trim() || "Guest";
  const receiptNumber = `HALL-REC-${booking.booking_number}`;

  return {
    receipt_number: receiptNumber,
    receipt_date: new Date(booking.created_at).toLocaleDateString("en-IN"),
    booking_number: booking.booking_number,
    hall_name: booking.hall_name,
    booking_date: new Date(booking.booking_date).toLocaleDateString("en-IN"),
    start_time: booking.start_time,
    end_time: booking.end_time,
    event_type: booking.event_type || "",
    event_description: booking.event_description || "",
    expected_guests: booking.expected_guests || "",
    amount: booking.amount,
    amount_formatted: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: booking.currency || "INR",
    }).format(booking.amount),
    user_name: userName,
    user_email: booking.email || "",
    user_phone: booking.phone || "",
    payment_method: booking.payment_method || "",
    payment_id: booking.razorpay_payment_id || "",
    order_id: booking.order_id || "",
    currency: booking.currency || "INR",
  };
};

exports.downloadReceipt = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const bookingId = Number(req.params.id);
    const booking = await hallBookingModel.getReceiptDetails(bookingId);

    if (!booking || booking.user_id !== req.user.id) {
      return res.status(403).render("errors/403", {
        title: "Forbidden",
        message: "You do not have permission to access this receipt.",
      });
    }

    if (booking.payment_status !== "completed") {
      return res.status(400).render("errors/403", {
        title: "Unavailable",
        message: "Receipt is not available for this booking.",
      });
    }

    const receiptData = buildReceiptData(booking);

    const templatePath = path.join(
      __dirname,
      "../views/receipts/hall.ejs",
    );
    const html = await ejs.renderFile(templatePath, { receipt: receiptData });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=hall-receipt-${receiptData.receipt_number}.pdf`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating hall receipt:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to generate receipt.",
    });
  }
};
