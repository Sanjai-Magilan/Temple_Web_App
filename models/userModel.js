/**
 * User Model
 * Handles all user-related database operations
 */

const pool = require("../config/database");
const bcrypt = require("bcryptjs");

/**
 * Find user by email
 */
exports.findByEmail = async (email) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, email_verified, phone_verified, email_otp, email_otp_expires, created_at FROM users WHERE email = ?",
      [email],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  }
};

/**
 * Find user by ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, email_verified, phone_verified, email_otp, email_otp_expires, created_at FROM users WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
};

/**
 * Find user by phone
 */
exports.findByPhone = async (phone) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, email_verified, phone_verified, created_at FROM users WHERE phone = ?",
      [phone],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding user by phone:", error);
    throw error;
  }
};

/**
 * Create new user
 */
exports.create = async (userData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // Insert user
    const [result] = await connection.execute(
      "INSERT INTO users (email, phone, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userData.email,
        userData.phone,
        passwordHash,
        userData.first_name,
        userData.last_name,
        userData.role || "user",
        userData.is_active !== undefined ? userData.is_active : 1,
      ],
    );

    const userId = result.insertId;

    // Get created user (without password)
    const [rows] = await connection.execute(
      "SELECT id, email, phone, first_name, last_name, role, is_active, email_verified, phone_verified, created_at FROM users WHERE id = ?",
      [userId],
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error("Error creating user:", error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Update user last login
 */
exports.updateLastLogin = async (userId) => {
  try {
    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      userId,
    ]);
  } catch (error) {
    console.error("Error updating last login:", error);
    // Don't throw - this is not critical
  }
};

/**
 * Verify password
 */
exports.verifyPassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
};

/**
 * Check if email exists
 */
exports.emailExists = async (email) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as count FROM users WHERE email = ?",
      [email],
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw error;
  }
};

/**
 * Check if phone exists
 */
exports.phoneExists = async (phone) => {
  try {
    const [rows] = await pool.execute(
      "SELECT COUNT(*) as count FROM users WHERE phone = ?",
      [phone],
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error("Error checking phone existence:", error);
    throw error;
  }
};
//profile model functions
// exports.findById = async (id) => {
//   const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
//   return rows[0];
// };

exports.updateProfile = async (id, data) => {
  const { first_name, last_name, phone } = data;
  await pool.execute(
    "UPDATE users SET first_name=?, last_name=?, phone=? WHERE id=?",
    [first_name, last_name, phone, id],
  );
};

// Save email OTP for verification
exports.saveEmailOtp = async (userId, otp, expires) => {
  const saltRounds = 10;
  const hashedOtp = await bcrypt.hash(otp.toString(), saltRounds);
  await pool.execute(
    "UPDATE users SET email_otp = ?, email_otp_expires = ? WHERE id = ?",
    [hashedOtp, expires, userId],
  );
};

/**
 * Validate OTP for a user
 */
/**
 * Validate OTP for a user (with hash comparison)
 */
exports.verifyEmailOtp = async (email, otp) => {
  try {
    // First get the user with their hashed OTP
    const [rows] = await pool.execute(
      "SELECT id, email, email_otp, email_otp_expires FROM users WHERE email = ? AND email_otp IS NOT NULL AND email_otp_expires > NOW()",
      [email]
    );
    
    if (!rows[0]) {
      return null; // No valid OTP found or expired
    }
    
    // Compare the provided OTP with the hashed OTP
    const isValid = await bcrypt.compare(otp.toString(), rows[0].email_otp);
    
    return isValid ? rows[0] : null;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
};

// Note: Controller functions moved to authController.js

//update email verified
exports.verifyEmail = async (userId) => {
  await pool.execute(
    "UPDATE users SET email_verified = 1, email_otp = NULL, email_otp_expires = NULL WHERE id = ?",
    [userId],
  );
}; // adding routes for otp verification in authRoutes.js and corresponding controller functions in authController.js

exports.createGoogleUser = async ({ email, first_name, last_name }) => {
  const [result] = await pool.execute(
    `INSERT INTO users 
     (email, first_name, last_name, role, is_active, email_verified) 
     VALUES (?, ?, ?, 'user', 1, 1)`,
    [email, first_name, last_name]
  );

  return this.findById(result.insertId);
};