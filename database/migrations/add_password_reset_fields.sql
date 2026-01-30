-- Add password reset OTP fields to users table
-- These fields are separate from email_otp to avoid conflicts between
-- registration verification and password reset flows

ALTER TABLE users 
ADD COLUMN password_reset_otp VARCHAR(255) NULL COMMENT 'Password reset OTP (hashed with bcrypt)',
ADD COLUMN password_reset_expires DATETIME NULL COMMENT 'Password reset OTP expiration time';
