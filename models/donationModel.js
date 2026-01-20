/**
 * Donation Model
 * Handles donation-related database operations
 */

const pool = require('../config/database');

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
        donationData.donation_type || 'general',
        donationData.purpose || null,
        donationData.payment_id || null,
        donationData.is_anonymous || 0,
        receiptNumber
      ]
    );

    const donationId = result.insertId;

    // Update payment with related_id
    if (donationData.payment_id) {
      await connection.execute(
        'UPDATE payments SET related_id = ? WHERE id = ?',
        [donationId, donationData.payment_id]
      );
    }

    await connection.commit();

    // Get created donation
    const [rows] = await pool.execute(
      'SELECT * FROM donations WHERE id = ?',
      [donationId]
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error('Error creating donation:', error);
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
      'SELECT COUNT(*) as count FROM donations WHERE receipt_number = ?',
      [receiptNumber]
    );

    exists = rows[0].count > 0;
    attempts++;
  }

  if (exists) {
    throw new Error('Failed to generate unique receipt number');
  }

  return receiptNumber;
};

/**
 * Find donation by ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM donations WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error finding donation by ID:', error);
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
      [userId, limit, offset]
    );
    return rows;
  } catch (error) {
    console.error('Error getting user donations:', error);
    throw error;
  }
};



