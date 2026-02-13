/**
 * Payment Model
 * Handles payment-related database operations
 */

const pool = require("../config/database");

/**
 * Create payment record
 */
exports.create = async (paymentData) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO payments (order_id, user_id, family_id, amount, currency, payment_method, status, payment_type, related_id, razorpay_response)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        //paymentData.payment_id,
        paymentData.order_id,
        paymentData.user_id || null,
        paymentData.family_id || null,
        paymentData.amount,
        paymentData.currency || "INR",
        paymentData.payment_method || null,
        paymentData.status || "pending",
        paymentData.payment_type,
        paymentData.related_id || null,
        paymentData.razorpay_response
          ? JSON.stringify(paymentData.razorpay_response)
          : null,
      ],
    );
    return result.insertId;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

/**
 * Find payment by Razorpay payment ID
 */
exports.findByPaymentId = async (paymentId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM payments WHERE payment_id = ?",
      [paymentId],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding payment by payment ID:", error);
    throw error;
  }
};

/**
 * Find payment by Razorpay order ID
 */
exports.findByOrderId = async (orderId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM payments WHERE order_id = ?",
      [orderId],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding payment by order ID:", error);
    throw error;
  }
};

/**
 * Find payment by internal ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM payments WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding payment by ID:", error);
    throw error;
  }
};

/**
 * Update payment status
 */
exports.updateStatus = async (paymentId, status, razorpayResponse = null) => {
  try {
    const updateFields = ["status = ?"];
    const updateValues = [status, paymentId];

    if (razorpayResponse) {
      updateFields.push("razorpay_response = ?");
      updateValues.splice(1, 0, JSON.stringify(razorpayResponse));
    }

    await pool.execute(
      `UPDATE payments SET ${updateFields.join(", ")}, updated_at = NOW() WHERE payment_id = ?`,
      updateValues,
    );
    return true;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

/**
 * Update payment with full details
 */
exports.update = async (paymentId, paymentData) => {
  try {
    await pool.execute(
      `UPDATE payments 
       SET payment_method = ?, status = ?, razorpay_response = ?, updated_at = NOW()
       WHERE payment_id = ?`,
      [
        paymentData.payment_method || null,
        paymentData.status,
        paymentData.razorpay_response
          ? JSON.stringify(paymentData.razorpay_response)
          : null,
        paymentId,
      ],
    );
    return true;
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};

/**
 * Update payment by order ID (used when payment_id is received)
 */
exports.updateByOrderId = async (orderId, paymentId, paymentData) => {
  try {
    await pool.execute(
      `UPDATE payments 
       SET payment_id = ?, payment_method = ?, status = ?, razorpay_response = ?, updated_at = NOW()
       WHERE order_id = ?`,
      [
        paymentId,
        paymentData.payment_method || null,
        paymentData.status,
        paymentData.razorpay_response
          ? JSON.stringify(paymentData.razorpay_response)
          : null,
        orderId,
      ],
    );
    return true;
  } catch (error) {
    console.error("Error updating payment by order ID:", error);
    throw error;
  }
};

/**
 * Get user payments
 */
exports.getUserPayments = async (userId, limit = 20, offset = 0) => {
  try {
    let query, params;
    if (userId) {
      query = `SELECT * FROM payments 
               WHERE user_id = ? 
               ORDER BY created_at DESC 
               LIMIT ${limit} OFFSET ${offset}`;
      params = [Number(userId)];
    } else {
      // Admin view - get all payments
      query = `SELECT * FROM payments 
               ORDER BY created_at DESC 
               LIMIT ${limit} OFFSET ${offset}`;
      params = [];
    }
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error("Error getting user payments:", error);
    throw error;
  }
};

/**
 * Check if payment already exists (idempotency check)
 */
exports.paymentExists = async (paymentId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as count FROM payments WHERE payment_id = ?",
      [paymentId],
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error("Error checking payment existence:", error);
    throw error;
  }
};
