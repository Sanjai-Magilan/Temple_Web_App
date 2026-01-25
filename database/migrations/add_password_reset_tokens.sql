-- Migration: Add password reset token fields to users table
-- Run this to enable forgot password functionality

ALTER TABLE users 
    ADD COLUMN reset_token VARCHAR(255) NULL COMMENT 'Password reset token',
    ADD COLUMN reset_token_expires DATETIME NULL COMMENT 'Token expiration time',
    ADD INDEX idx_reset_token (reset_token);
