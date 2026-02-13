const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");

const getTempleProfile = () => ({
  name: process.env.TEMPLE_NAME || "Temple Trust",
  address: process.env.TEMPLE_ADDRESS || "Temple Address",
  phone: process.env.TEMPLE_PHONE || "",
  email: process.env.TEMPLE_EMAIL || "",
});

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const buildPayerName = (record) => {
  const name = [record.first_name, record.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Devotee";
};

const buildReceiptJson = (type, record) => {
  const receiptNumber =
    type === "donation" ? record.receipt_number : record.booking_number;

  const paymentAmount =
    typeof record.payment_amount === "number"
      ? record.payment_amount
      : record.amount;

  const payment = {
    payment_id: record.razorpay_payment_id || "",
    order_id: record.order_id || "",
    method: record.payment_method || "",
    status: record.payment_status || "",
    amount: Number(paymentAmount || 0),
    currency: record.currency || "INR",
    paid_at:
      record.payment_updated_at ||
      record.payment_created_at ||
      record.created_at,
  };

  const base = {
    receipt_type: type,
    receipt_number: receiptNumber || "",
    issued_at: new Date().toISOString(),
    temple: getTempleProfile(),
    payer: {
      user_id: record.user_id || null,
      name: buildPayerName(record),
      email: record.email || "",
      phone: record.phone || "",
    },
    payment,
    meta: {
      source: "temple_app",
      version: 1,
    },
  };

  if (type === "donation") {
    base.details = {
      donation_id: record.id,
      donation_type: record.donation_type || "",
      purpose: record.purpose || "",
      is_anonymous: Boolean(record.is_anonymous),
    };
  } else if (type === "hall_booking") {
    base.details = {
      booking_id: record.id,
      booking_number: record.booking_number || "",
      hall_name: record.hall_name || "",
      booking_date: record.booking_date || "",
      start_time: record.start_time || "",
      end_time: record.end_time || "",
      event_type: record.event_type || "",
      expected_guests: record.expected_guests || "",
      event_description: record.event_description || "",
    };
  } else if (type === "pooja_booking") {
    base.details = {
      booking_id: record.id,
      booking_number: record.booking_number || "",
      pooja_name: record.pooja_name || "",
      pooja_type: record.pooja_type || "",
      booking_date: record.booking_date || "",
      booking_time: record.booking_time || "",
      devotee_name: record.devotee_name || "",
      gotra: record.gotra || "",
      nakshatra: record.nakshatra || "",
      special_instructions: record.special_instructions || "",
    };
  }

  return base;
};

const ensureReceiptJsonFromRecord = async (type, record) => {
  const existing = safeParseJson(record.receipt_json);
  if (existing) return existing;

  const receipt = buildReceiptJson(type, record);

  if (type === "donation") {
    await donationModel.updateReceiptJson(record.id, receipt);
  } else if (type === "hall_booking") {
    await hallBookingModel.updateReceiptJson(record.id, receipt);
  } else if (type === "pooja_booking") {
    await poojaBookingModel.updateReceiptJson(record.id, receipt);
  }

  return receipt;
};

exports.ensureReceiptJsonFromRecord = ensureReceiptJsonFromRecord;

exports.ensureDonationReceiptJsonById = async (donationId) => {
  const record = await donationModel.getReceiptData(donationId);
  if (!record) return null;
  return ensureReceiptJsonFromRecord("donation", record);
};

exports.ensureHallReceiptJsonById = async (bookingId) => {
  const record = await hallBookingModel.getReceiptData(bookingId);
  if (!record) return null;
  return ensureReceiptJsonFromRecord("hall_booking", record);
};

exports.ensurePoojaReceiptJsonById = async (bookingId) => {
  const record = await poojaBookingModel.getReceiptData(bookingId);
  if (!record) return null;
  return ensureReceiptJsonFromRecord("pooja_booking", record);
};
