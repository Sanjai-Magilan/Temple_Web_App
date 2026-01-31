-- Migration: Add OTP fields to users table
-- Created: 2026-01-29
-- Purpose: Add email OTP verification fields for user registration

ALTER TABLE users
ADD COLUMN email_otp VARCHAR(6) NULL COMMENT 'Email verification OTP',
ADD COLUMN email_otp_expires DATETIME NULL COMMENT 'OTP expiration time';

-- Add index for faster OTP lookups
CREATE INDEX idx_email_otp ON users (email_otp);

-- Verify the changes
DESCRIBE users;


-- Add password reset OTP fields to users table
-- These fields are separate from email_otp to avoid conflicts between
-- registration verification and password reset flows

ALTER TABLE users 
ADD COLUMN password_reset_otp VARCHAR(255) NULL COMMENT 'Password reset OTP (hashed with bcrypt)',
ADD COLUMN password_reset_expires DATETIME NULL COMMENT 'Password reset OTP expiration time';


