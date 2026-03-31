/**
 * Payment Model
 * Handles payment-related database operations
 */

const pool = require("../config/database");

const ALLOWED_SORT_FIELDS = new Set([
  "created_at",
  "amount",
  "status",
  "payment_method",
  "payment_type",
]);

const ALLOWED_SORT_ORDERS = new Set(["ASC", "DESC"]);

const create = async (paymentData) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO payments
       (order_id, user_id, family_id, amount, currency, payment_method, status, payment_type, related_id, razorpay_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

const findByPaymentId = async (paymentId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM payments WHERE payment_id = ?",
      [paymentId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error finding payment by payment ID:", error);
    throw error;
  }
};

const findByOrderId = async (orderId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM payments WHERE order_id = ?",
      [orderId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error finding payment by order ID:", error);
    throw error;
  }
};

const findById = async (id) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error finding payment by ID:", error);
    throw error;
  }
};

const updateStatus = async (paymentId, status, razorpayResponse = null) => {
  try {
    const updateFields = ["status = ?"];
    const updateValues = [status];

    if (razorpayResponse) {
      updateFields.push("razorpay_response = ?");
      updateValues.push(JSON.stringify(razorpayResponse));
    }

    updateValues.push(paymentId);

    await pool.execute(
      `UPDATE payments
       SET ${updateFields.join(", ")}, updated_at = NOW()
       WHERE payment_id = ?`,
      updateValues
    );

    return true;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

const update = async (paymentId, paymentData) => {
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
      ]
    );

    return true;
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};

const updateByOrderId = async (orderId, paymentId, paymentData) => {
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
      ]
    );

    return true;
  } catch (error) {
    console.error("Error updating payment by order ID:", error);
    throw error;
  }
};

const getUserPayments = async (userId, limit = 20, offset = 0) => {
  try {
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const safeOffset = Math.max(Number(offset), 0);

    let query;
    let params;

    if (userId) {
      query = `
        SELECT * FROM payments
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [Number(userId), safeLimit, safeOffset];
    } else {
      query = `
        SELECT * FROM payments
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [safeLimit, safeOffset];
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error("Error getting user payments:", error);
    throw error;
  }
};

const getPendingPaymentsByType = async (userId, paymentType) => {
  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM payments
       WHERE user_id = ?
         AND payment_type = ?
         AND status = 'pending'
       ORDER BY created_at DESC`,
      [Number(userId), paymentType]
    );

    return rows;
  } catch (error) {
    console.error("Error getting pending payments by type:", error);
    throw error;
  }
};

const paymentExists = async (paymentId) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS count FROM payments WHERE payment_id = ?",
      [paymentId]
    );

    return rows[0].count > 0;
  } catch (error) {
    console.error("Error checking payment existence:", error);
    throw error;
  }
};

const getAllPayments = async ({
  search,
  filter,
  sort,
  order,
  method,
  payment_type,
  limit,
  offset,
}) => {
  try {
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const safeOffset = Math.max(Number(offset), 0);

    let safeSort = ALLOWED_SORT_FIELDS.has(sort) ? sort : "created_at";
    let safeOrder = ALLOWED_SORT_ORDERS.has(String(order || "").toUpperCase())
      ? String(order).toUpperCase()
      : "DESC";

    if (filter === "recent") {
      safeSort = "created_at";
      safeOrder = "DESC";
    } else if (filter === "high") {
      safeSort = "amount";
      safeOrder = "DESC";
    } else if (filter === "low") {
      safeSort = "amount";
      safeOrder = "ASC";
    }

    const whereClauses = ["1=1"];
    const values = [];

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      whereClauses.push(
        "(p.payment_id LIKE ? OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ? OR u.email LIKE ?)"
      );
      values.push(searchTerm, searchTerm, searchTerm);
    }

    if (method && String(method).trim()) {
      whereClauses.push("p.payment_method = ?");
      values.push(String(method).trim());
    }

    if (payment_type && String(payment_type).trim()) {
      whereClauses.push("p.payment_type = ?");
      values.push(String(payment_type).trim());
    }

    const whereSql = ` WHERE ${whereClauses.join(" AND ")}`;

    const baseQuery = `
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN hall_bookings hb ON p.id = hb.payment_id AND p.payment_type = 'hall_booking'
      LEFT JOIN pooja_bookings pb ON p.id = pb.payment_id AND p.payment_type = 'pooja_booking'
    `;

    const dataQuery = `
      SELECT
        p.payment_id,
        p.user_id,
        p.created_at,
        p.payment_method,
        p.amount,
        p.currency,
        p.status,
        p.payment_type,
        u.first_name AS first_name,
        u.last_name AS last_name,
        u.email AS user_email,
        hb.start_time AS start_time,
        hb.end_time AS end_time,
        pb.booking_time AS booking_time,
        COALESCE(hb.booking_date, pb.booking_date) AS booking_date
      ${baseQuery}
      ${whereSql}
      ORDER BY p.${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      ${baseQuery}
      ${whereSql}
    `;

    const [countResult] = await pool.execute(countQuery, values);
    const [rows] = await pool.execute(dataQuery, [
      ...values,
      safeLimit,
      safeOffset,
    ]);

    return {
      payments: rows,
      totalCount: countResult[0].total,
    };
  } catch (error) {
    console.error("Error getting all payments:", error);
    throw error;
  }
};

module.exports = {
  create,
  findByPaymentId,
  findByOrderId,
  findById,
  updateStatus,
  update,
  updateByOrderId,
  getUserPayments,
  getPendingPaymentsByType,
  paymentExists,
  getAllPayments,
};
