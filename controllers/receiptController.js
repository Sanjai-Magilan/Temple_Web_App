const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");
const receiptService = require("../utils/receiptService");
const receiptPdf = require("../utils/receiptPdf");
const paymentModel = require("../models/paymentModel");

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

exports.downloadAdminPaymentReceipt = async (req, res) => {
try {
const paymentId = String(req.params.paymentId || "").trim();
if (!paymentId) {
return res.status(400).render("errors/400", {
title: "Bad Request",
message: "Invalid payment ID.",
});
}

const payment = await paymentModel.findByPaymentId(paymentId);
if (!payment) {
return res.status(404).render("errors/404", {
title: "Not Found",
message: "Payment not found.",
});
}

if (payment.status !== "completed") {
return res.status(400).render("errors/400", {
title: "Bad Request",
message: "Receipt is available only for completed payments.",
});
}

if (!payment.related_id) {
return res.status(404).render("errors/404", {
title: "Not Found",
message: "Receipt source record not found.",
});
}

const sourceMap = {
donation: { type: "donation", model: donationModel },
hall_booking: { type: "hall_booking", model: hallBookingModel },
pooja_booking: { type: "pooja_booking", model: poojaBookingModel },
};

const source = sourceMap[payment.payment_type];
if (!source) {
return res.status(400).render("errors/400", {
title: "Bad Request",
message: "Unsupported payment type for receipt.",
});
}

const record = await source.model.getReceiptData(payment.related_id);
if (!record) {
return res.status(404).render("errors/404", {
title: "Not Found",
message: "Receipt not found.",
});
}

const receipt = await receiptService.ensureReceiptJsonFromRecord(
source.type,
record,
);
const pdf = await receiptPdf.renderReceiptPdf(receipt);
const buffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
const filename = sanitizeFilename(
"receipt-" + (receipt.receipt_number || payment.id) + ".pdf",
);

if (!buffer.length || buffer.slice(0, 4).toString() !== "%PDF") {
return res.status(500).render("errors/500", {
title: "Server Error",
message: "Receipt PDF generation failed.",
});
}

res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
res.setHeader("Content-Length", buffer.length);
res.end(buffer);
} catch (error) {
console.error("Error downloading admin receipt:", error);
return res.status(500).render("errors/500", {
title: "Server Error",
message: "Failed to generate receipt.",
});
}
};