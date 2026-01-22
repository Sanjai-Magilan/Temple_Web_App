/**
 * Hall Booking Model
 * Handles hall booking-related database operations
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
    bookingNumber = `HALL-${year}${month}-${random}`;

    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM hall_bookings WHERE booking_number = ?",
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
 * Create hall booking
 */
exports.create = async (bookingData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const bookingNumber = await generateBookingNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO hall_bookings 
       (booking_number, user_id, family_id, hall_name, booking_date, start_time, end_time, 
        event_type, event_description, expected_guests, amount, payment_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingNumber,
        bookingData.user_id,
        bookingData.family_id || null,
        bookingData.hall_name,
        bookingData.booking_date,
        bookingData.start_time,
        bookingData.end_time,
        bookingData.event_type || null,
        bookingData.event_description || null,
        bookingData.expected_guests || null,
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
      "SELECT * FROM hall_bookings WHERE id = ?",
      [bookingId],
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error("Error creating hall booking:", error);
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
      "SELECT * FROM hall_bookings WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding hall booking by ID:", error);
    throw error;
  }
};

/**
 * Find booking by booking number
 */
exports.findByBookingNumber = async (bookingNumber) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM hall_bookings WHERE booking_number = ?",
      [bookingNumber],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding hall booking by booking number:", error);
    throw error;
  }
};

/**
 * Update booking status
 */
exports.updateStatus = async (bookingId, status, cancellationReason = null) => {
  try {
    await pool.execute(
      `UPDATE hall_bookings 
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
    console.error("Error updating hall booking status:", error);
    throw error;
  }
};

/**
 * Get user bookings
 */
exports.getUserBookings = async (userId, limit = 20, offset = 0) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM hall_bookings 
       WHERE user_id = ?
       ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
      [(userId, limit, offset)],
    );
    return rows;
  } catch (error) {
    console.error("Error getting user hall bookings:", error);
    throw error;
  }
};
