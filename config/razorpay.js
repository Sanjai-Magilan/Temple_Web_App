/**
 * Razorpay Configuration
 * Initialize Razorpay instance with API keys
 */

const Razorpay = require("razorpay");
require("dotenv").config();

// Initialize Razorpay instance (only if keys are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn(
    "Warning: Razorpay keys not configured. Payment features will not work.",
  );
  // Create a mock object to prevent errors
  razorpay = {
    orders: {
      create: async () => {
        throw new Error("Razorpay not configured");
      },
    },
    payments: {
      fetch: async () => {
        throw new Error("Razorpay not configured");
      },
    },
  };
}

// Verify webhook signature
const crypto = require("crypto");

/**
 * Verify Razorpay webhook signature
 */
exports.verifyWebhookSignature = (webhookBody, signature, secret) => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(webhookBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};

/**
 * Verify payment signature
 */
exports.verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const text = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    return false;
  }
};

module.exports = razorpay;
module.exports.verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const text = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    return false;
  }
};

module.exports.verifyWebhookSignature = (webhookBody, signature, secret) => {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(webhookBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
};
