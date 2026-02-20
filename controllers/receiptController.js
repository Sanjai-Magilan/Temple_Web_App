const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");
const receiptService = require("../utils/receiptService");
const receiptPdf = require("../utils/receiptPdf");

const sanitizeFilename = (value) => {
  const base = value || "receipt";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const assertAccess = (req, record) => {
  if (!req.user) return false;
  if (req.user.role === "admin") return true;
  return Number(record.user_id) === Number(req.user.id);
};

const downloadReceipt = async (req, res, type, model) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).render("errors/400", {
      title: "Bad Request",
      message: "Invalid receipt request.",
    });
  }

  const record = await model.getReceiptData(id);
  if (!record) {
    return res.status(404).render("errors/404", {
      title: "Not Found",
      message: "Receipt not found.",
    });
  }

  if (!assertAccess(req, record)) {
    return res.status(403).render("errors/403", {
      title: "Forbidden",
      message: "You do not have permission to access this receipt.",
    });
  }

  if (record.payment_status !== "completed") {
    return res.status(400).render("errors/400", {
      title: "Bad Request",
      message: "Receipt is available only for completed payments.",
    });
  }

  const receipt = await receiptService.ensureReceiptJsonFromRecord(
    type,
    record,
  );
  const pdf = await receiptPdf.renderReceiptPdf(receipt);
  const buffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  const filename = sanitizeFilename(
    `receipt-${receipt.receipt_number || id}.pdf`,
  );

  if (!buffer.length || buffer.slice(0, 4).toString() !== "%PDF") {
    return res.status(500).render("errors/500", {
      title: "Server Error",
      message: "Receipt PDF generation failed.",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
};

exports.downloadDonationReceipt = async (req, res) => {
  await downloadReceipt(req, res, "donation", donationModel);
};

exports.downloadHallReceipt = async (req, res) => {
  await downloadReceipt(req, res, "hall_booking", hallBookingModel);
};

exports.downloadPoojaReceipt = async (req, res) => {
  await downloadReceipt(req, res, "pooja_booking", poojaBookingModel);
};
