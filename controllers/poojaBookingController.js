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
exports.showNew = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    res.render("bookings/pooja/new", {
      title: "Book a Pooja",
      user: req.user,
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

const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

const buildReceiptData = (booking) => {
  const userName =
    `${booking.first_name || ""} ${booking.last_name || ""}`.trim() || "Guest";
  const receiptNumber = `POOJA-REC-${booking.booking_number}`;

  return {
    receipt_number: receiptNumber,
    receipt_date: new Date(booking.created_at).toLocaleDateString("en-IN"),
    booking_number: booking.booking_number,
    pooja_name: booking.pooja_name,
    pooja_type: booking.pooja_type || "",
    booking_date: new Date(booking.booking_date).toLocaleDateString("en-IN"),
    booking_time: booking.booking_time,
    devotee_name: booking.devotee_name,
    gotra: booking.gotra || "",
    nakshatra: booking.nakshatra || "",
    special_instructions: booking.special_instructions || "",
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
    const booking = await poojaBookingModel.getReceiptDetails(bookingId);

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
      "../views/receipts/pooja.ejs",
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
      `attachment; filename=pooja-receipt-${receiptData.receipt_number}.pdf`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating pooja receipt:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to generate receipt.",
    });
  }
};