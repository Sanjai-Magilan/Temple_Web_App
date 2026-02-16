/**
 * Donation Model
 * Handles donation-related database operations
 */

const pool = require("../config/database");

/**
 * Create donation record
 */
exports.create = async (donationData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO donations 
       (user_id, family_id, amount, donation_type, purpose, payment_id, is_anonymous, receipt_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        donationData.user_id || null,
        donationData.family_id || null,
        donationData.amount,
        donationData.donation_type || "general",
        donationData.purpose || null,
        donationData.payment_id || null,
        donationData.is_anonymous || 0,
        receiptNumber,
      ],
    );

    const donationId = result.insertId;

    // Update payment with related_id
    if (donationData.payment_id) {
      await connection.execute(
        "UPDATE payments SET related_id = ? WHERE id = ?",
        [donationId, donationData.payment_id],
      );
    }

    await connection.commit();

    // Get created donation
    const [rows] = await pool.execute("SELECT * FROM donations WHERE id = ?", [
      donationId,
    ]);

    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error("Error creating donation:", error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Generate unique receipt number
 */
const generateReceiptNumber = async (connection) => {
  let receiptNumber;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    receiptNumber = `DON-${year}-${random}`;

    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM donations WHERE receipt_number = ?",
      [receiptNumber],
    );

    exists = rows[0].count > 0;
    attempts++;
  }

  if (exists) {
    throw new Error("Failed to generate unique receipt number");
  }

  return receiptNumber;
};

/**
 * Find donation by ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM donations WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding donation by ID:", error);
    throw error;
  }
};

/**
 * Get user donations
 */
exports.getUserDonations = async (userId, limit = 20, offset = 0) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, p.status as payment_status, p.payment_method 
       FROM donations d
       LEFT JOIN payments p ON d.payment_id = p.id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, String(limit), String(offset)],
    );

    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as count FROM donations WHERE user_id = ?",
      [userId],
    );

    return {
      donations: rows,
      total: countRows[0].count,
    };
  } catch (error) {
    console.error("Error getting user donations:", error);
    throw error;
  }
};
exports.getReceiptData = async (donationId) => {
  const [rows] = await pool.execute(
    `SELECT d.*, 
            p.payment_id AS razorpay_payment_id,
            p.order_id,
            p.payment_method,
            p.status AS payment_status,
            p.currency,
            p.amount AS payment_amount,
            p.created_at AS payment_created_at,
            p.updated_at AS payment_updated_at,
            u.first_name, u.last_name, u.email, u.phone
     FROM donations d
     LEFT JOIN payments p ON d.payment_id = p.id
     LEFT JOIN users u ON d.user_id = u.id
     WHERE d.id = ?`,
    [donationId],
  );
  return rows[0] || null;
};

exports.updateReceiptJson = async (donationId, receiptJson) => {
  await pool.execute(
    `UPDATE donations 
     SET receipt_json = ?, receipt_generated = 1, updated_at = NOW()
     WHERE id = ?`,
    [JSON.stringify(receiptJson), donationId],
  );
};

/**
 * Get all donations (for admin)
 */
exports.getAllDonations = async (limit = 20, offset = 0, search = "", type = "") => {
  try {
    let query = `
       SELECT d.*, p.status as payment_status, p.payment_method,
              u.first_name, u.last_name, u.email
       FROM donations d
       LEFT JOIN payments p ON d.payment_id = p.id
       LEFT JOIN users u ON d.user_id = u.id
    `;

    const params = [];
    const whereConditions = [];

    if (search) {
      whereConditions.push(`(d.receipt_number LIKE ? OR u.first_name LIKE ? OR u.email LIKE ?)`);
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (type) {
      whereConditions.push(`d.donation_type = ?`);
      params.push(type);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }

    query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;

    params.push(String(limit), String(offset));

    const [rows] = await pool.execute(query, params);

    // Get total count for pagination
    let countQuery = `
       SELECT COUNT(*) as count 
       FROM donations d
       LEFT JOIN users u ON d.user_id = u.id
    `;
    const countParams = [];
    const countWhereConditions = [];

    if (search) {
      countWhereConditions.push(`(d.receipt_number LIKE ? OR u.first_name LIKE ? OR u.email LIKE ?)`);
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam);
    }

    if (type) {
      countWhereConditions.push(`d.donation_type = ?`);
      countParams.push(type);
    }

    if (countWhereConditions.length > 0) {
      countQuery += ` WHERE ` + countWhereConditions.join(' AND ');
    }

    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      donations: rows,
      total: countRows[0].count,
    };
  } catch (error) {
    console.error("Error getting all donations:", error);
    throw error;
  }
};