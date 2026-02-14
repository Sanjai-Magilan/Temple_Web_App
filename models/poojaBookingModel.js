/**
 * Pooja Booking Model
 * Handles pooja booking-related database operations
 */

const pool = require("../config/database");

/**
 * Generate unique booking number
 */
const generateBookingNumber = async (connection) => {
  let bookingNumber;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    bookingNumber = `POOJA-${year}${month}-${random}`;

    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM pooja_bookings WHERE booking_number = ?",
      [bookingNumber],
    );

    exists = rows[0].count > 0;
    attempts++;
  }

  if (exists) {
    throw new Error("Failed to generate unique booking number");
  }

  return bookingNumber;
};

/**
 * Create pooja booking
 */
exports.create = async (bookingData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const bookingNumber = await generateBookingNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO pooja_bookings 
       (booking_number, user_id, family_id, pooja_name, pooja_type, booking_date, booking_time,
        devotee_name, gotra, nakshatra, special_instructions, amount, payment_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingNumber,
        bookingData.user_id,
        bookingData.family_id || null,
        bookingData.pooja_name,
        bookingData.pooja_type || null,
        bookingData.booking_date,
        bookingData.booking_time,
        bookingData.devotee_name,
        bookingData.gotra || null,
        bookingData.nakshatra || null,
        bookingData.special_instructions || null,
        bookingData.amount,
        bookingData.payment_id || null,
        bookingData.status || "pending",
      ],
    );

    const bookingId = result.insertId;

    // Update payment with related_id
    if (bookingData.payment_id) {
      await connection.execute(
        "UPDATE payments SET related_id = ? WHERE id = ?",
        [bookingId, bookingData.payment_id],
      );
    }

    await connection.commit();

    // Get created booking
    const [rows] = await pool.execute(
      "SELECT * FROM pooja_bookings WHERE id = ?",
      [bookingId],
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error("Error creating pooja booking:", error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Find booking by ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM pooja_bookings WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding pooja booking by ID:", error);
    throw error;
  }
};

/**
 * Find booking by booking number
 */
exports.findByBookingNumber = async (bookingNumber) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM pooja_bookings WHERE booking_number = ?",
      [bookingNumber],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding pooja booking by booking number:", error);
    throw error;
  }
};

/**
 * Update booking status
 */
exports.updateStatus = async (bookingId, status, cancellationReason = null) => {
  try {
    await pool.execute(
      `UPDATE pooja_bookings 
       SET status = ?, cancellation_reason = ?, cancelled_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        status,
        cancellationReason,
        status === "cancelled" ? new Date() : null,
        bookingId,
      ],
    );
    return true;
  } catch (error) {
    console.error("Error updating pooja booking status:", error);
    throw error;
  }
};

/**
 * Get user bookings
 */
exports.getUserBookings = async (userId, limit = 20, offset = 0) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM pooja_bookings
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId],
    );
    return rows;
  } catch (error) {
    console.error("Error getting user pooja bookings:", error);
    throw error;
  }
};

/**
 * Cancel booking by ID
 */
exports.cancelBookingById = async (bookingId) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM pooja_bookings WHERE id = ?",
      [bookingId],
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting pooja booking by ID:", error);
    throw error;
  }
};
