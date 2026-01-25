/**
 * User Model
 * Handles all user-related database operations
 */

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Find user by email
 */
exports.findByEmail = async (email) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, email_verified, phone_verified, created_at FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

/**
 * Find user by ID
 */
exports.findById = async (id) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, email_verified, phone_verified, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
};

/**
 * Find user by phone
 */
exports.findByPhone = async (phone) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, phone, password_hash, first_name, last_name, role, is_active, email_verified, phone_verified, created_at FROM users WHERE phone = ?',
      [phone]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error finding user by phone:', error);
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
      'INSERT INTO users (email, phone, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userData.email,
        userData.phone,
        passwordHash,
        userData.first_name,
        userData.last_name,
        userData.role || 'user',
        userData.is_active !== undefined ? userData.is_active : 1
      ]
    );

    const userId = result.insertId;

    // Get created user (without password)
    const [rows] = await connection.execute(
      'SELECT id, email, phone, first_name, last_name, role, is_active, email_verified, phone_verified, created_at FROM users WHERE id = ?',
      [userId]
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    console.error('Error creating user:', error);
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
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Error updating last login:', error);
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
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Check if email exists
 */
exports.emailExists = async (email) => {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw error;
  }
};

/**
 * Check if phone exists
 */
exports.phoneExists = async (phone) => {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE phone = ?',
      [phone]
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    throw error;
  }
};
//profile model functions
exports.findById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
};

exports.updateProfile = async (id, data) => {
  const { first_name, last_name, phone } = data;
  await pool.execute(
    'UPDATE users SET first_name=?, last_name=?, phone=? WHERE id=?',
    [first_name, last_name, phone, id]
  );
};

/**
 * Create password reset token
 */
exports.createPasswordResetToken = async (email) => {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    return token;
  } catch (error) {
    console.error('Error creating password reset token:', error);
    throw error;
  }
};

/**
 * Find user by reset token
 */
exports.findByResetToken = async (token) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, first_name, last_name, reset_token_expires FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error finding user by reset token:', error);
    throw error;
  }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (token, newPassword) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify token is valid
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = rows[0].id;

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await connection.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, userId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error('Error resetting password:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Clear reset token
 */
exports.clearResetToken = async (userId) => {
  try {
    await pool.execute(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [userId]
    );
  } catch (error) {
    console.error('Error clearing reset token:', error);
    throw error;
  }
};


