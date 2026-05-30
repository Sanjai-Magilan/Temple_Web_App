const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");

const getTempleProfile = () => ({
  name: process.env.TEMPLE_NAME || "Temple Trust",
  address: process.env.TEMPLE_ADDRESS || "Temple Address",
  phone: process.env.TEMPLE_PHONE || "",
  email: process.env.TEMPLE_EMAIL || "",
  pin_code: process.env.TEMPLE_PIN_CODE || "",
  trust_reg_no: process.env.TEMPLE_TRUST_REG_NO || "",
  cert_80g_no: process.env.TEMPLE_80G_CERT_NO || "",
  cert_80g_validity: process.env.TEMPLE_80G_VALIDITY || "",
  exemption_percentage: process.env.TEMPLE_80G_EXEMPTION || "",
  bank_name: process.env.TEMPLE_BANK_NAME || "",
  bank_account: process.env.TEMPLE_BANK_ACCOUNT || "",
  bank_ifsc: process.env.TEMPLE_BANK_IFSC || "",
  website_url: process.env.TEMPLE_WEBSITE_URL || "",
});

const numberToWords = (value) => {
  const units = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const twoDigits = (num) => {
    if (num < 20) return units[num];
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return unit ? `${tens[ten]} ${units[unit]}` : tens[ten];
  };

  const threeDigits = (num) => {
    if (num < 100) return twoDigits(num);
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = `${units[hundred]} Hundred`;
    return rest ? `${prefix} ${twoDigits(rest)}` : prefix;
  };

  const inrWords = (num) => {
    if (num === 0) return "Zero";
    let remaining = num;
    const parts = [];

    const crore = Math.floor(remaining / 10000000);
    if (crore) {
      parts.push(`${twoDigits(crore)} Crore`);
      remaining %= 10000000;
    }

    const lakh = Math.floor(remaining / 100000);
    if (lakh) {
      parts.push(`${twoDigits(lakh)} Lakh`);
      remaining %= 100000;
    }

    const thousand = Math.floor(remaining / 1000);
    if (thousand) {
      parts.push(`${twoDigits(thousand)} Thousand`);
      remaining %= 1000;
    }

    if (remaining) {
      parts.push(threeDigits(remaining));
    }

    return parts.join(" ");
  };

  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "";

  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute);
  const fraction = Math.round((absolute - whole) * 100);
  const words = inrWords(whole);
  if (!fraction) return words;
  return `${words} and ${inrWords(fraction)} Paise`;
};

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
      generated_at: new Date().toISOString(),
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
    const foodMeals = record.food_meals
      ? record.food_meals
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean)
      : [];

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
      food_required: Boolean(record.food_required),
      food_meals: foodMeals,
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

  base.payment.amount_words = numberToWords(base.payment.amount || 0);

  const display = {
    donation_purpose: "",
    specific_deity: "",
    dedication: "",
    gotra: base.details?.gotra || "",
    nakshatra: base.details?.nakshatra || "",
    donor_contact: [base.payer.phone, base.payer.email].filter(Boolean).join(" | "),
    payment_reference: base.payment.payment_id || base.payment.order_id || "",
  };

  if (type === "donation") {
    display.donation_purpose =
      base.details.purpose || base.details.donation_type || "Donation";
    display.specific_deity = base.details.donation_type || "General";
    display.dedication = base.details.purpose || "";
  } else if (type === "hall_booking") {
    display.donation_purpose = "Hall Booking";
    display.specific_deity = base.details.hall_name || "";
    display.dedication = base.details.event_description || "";
  } else if (type === "pooja_booking") {
    display.donation_purpose = base.details.pooja_name || "Pooja Booking";
    display.specific_deity = base.details.pooja_type || base.details.pooja_name || "";
    display.dedication = base.details.special_instructions || "";
  }

  base.display = display;

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
