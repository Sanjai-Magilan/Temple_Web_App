/**
 * Donation Controller
 * Handles donation-related operations
 */

const donationModel = require('../models/donationModel');

/**
 * List user donations
 */
exports.list = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

    const donations = await donationModel.getUserDonations(req.user.id, 50, 0);

    res.render('donations/list', {
      title: 'My Donations',
      user: req.user,
      donations: donations
    });
  } catch (error) {
    console.error('Error loading donations:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load donations'
    });
  }
};

/**
 * Show donation form
 */
exports.showNew = (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

    res.render('donations/new', {
      title: 'Make a Donation',
      user: req.user,
      error: null
    });
  } catch (error) {
    console.error('Error loading donation form:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load donation form'
    });
  }
};




/**
 * Admin list donations
 */
exports.adminList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || null;

    const result = await donationModel.getAllDonations(limit, offset, search);

    res.render('donations/admin_list', {
      title: 'Donation Management',
      user: req.user,
      donations: result.donations,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit),
      search: search
    });
  } catch (error) {
    console.error('Error loading donations for admin:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load donations'
    });
  }
};

const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

const buildReceiptData = (donation) => {
  const donorName = donation.is_anonymous
    ? "Anonymous"
    : `${donation.first_name || ""} ${donation.last_name || ""}`.trim() || "Guest";

  return {
    receipt_number: donation.receipt_number,
    receipt_date: new Date(donation.created_at).toLocaleDateString("en-IN"),
    amount: donation.amount,
    amount_formatted: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: donation.currency || "INR",
    }).format(donation.amount),
    donation_type: donation.donation_type,
    purpose: donation.purpose || "",
    donor_name: donorName,
    donor_email: donation.email || "",
    donor_phone: donation.phone || "",
    payment_method: donation.payment_method || "",
    payment_id: donation.razorpay_payment_id || "",
    order_id: donation.order_id || "",
    currency: donation.currency || "INR",
  };
};

exports.downloadReceipt = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const donationId = Number(req.params.id);
    const donation = await donationModel.getReceiptDetails(donationId);

    if (!donation) {
      return res.status(404).render("errors/404", {
        title: "Not Found",
        message: "Receipt not found.",
      });
    }

    const isOwner = donation.user_id && donation.user_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).render("errors/403", {
        title: "Forbidden",
        message: "You do not have permission to access this receipt.",
      });
    }

    if (donation.payment_status !== "completed" || !donation.receipt_number) {
      return res.status(400).render("errors/403", {
        title: "Unavailable",
        message: "Receipt is not available for this donation.",
      });
    }

   let receiptData = donation.receipt_data
  ? typeof donation.receipt_data === "string"
    ? JSON.parse(donation.receipt_data)
    : donation.receipt_data
  : buildReceiptData(donation);

    if (!donation.receipt_data) {
      await donationModel.updateReceiptData(donationId, receiptData);
    }

    const templatePath = path.join(
      __dirname,
      "../views/receipts/donation.ejs",
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
  `attachment; filename=receipt-${receiptData.receipt_number}.pdf`,
);
res.setHeader("Content-Length", pdfBuffer.length);
res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Failed to generate receipt.",
    });
  }
};
