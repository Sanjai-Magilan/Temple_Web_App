-- ==================================================
-- FORGOT PASSWORD FEATURE - DATABASE SETUP
-- ==================================================
-- Run this SQL script to add password reset functionality
-- 
-- Instructions:
-- 1. Open your MySQL client (phpMyAdmin, MySQL Workbench, or command line)
-- 2. Select the 'temple_db' database
-- 3. Execute this script
-- ==================================================

USE temple_db;

-- Check if columns already exist before adding them
SET @exist_reset_token := (SELECT COUNT(*) 
                            FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = 'temple_db' 
                            AND TABLE_NAME = 'users' 
                            AND COLUMN_NAME = 'reset_token');

SET @exist_reset_expires := (SELECT COUNT(*) 
                              FROM information_schema.COLUMNS 
                              WHERE TABLE_SCHEMA = 'temple_db' 
                              AND TABLE_NAME = 'users' 
                              AND COLUMN_NAME = 'reset_token_expires');

-- Add reset_token column if it doesn't exist
SET @sql_reset_token = IF(@exist_reset_token = 0,
    'ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL COMMENT "Password reset token"',
    'SELECT "Column reset_token already exists" AS message');

PREPARE stmt FROM @sql_reset_token;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add reset_token_expires column if it doesn't exist
SET @sql_reset_expires = IF(@exist_reset_expires = 0,
    'ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL COMMENT "Token expiration time"',
    'SELECT "Column reset_token_expires already exists" AS message');

PREPARE stmt FROM @sql_reset_expires;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on reset_token if it doesn't exist
SET @exist_index := (SELECT COUNT(*) 
                     FROM information_schema.STATISTICS 
                     WHERE TABLE_SCHEMA = 'temple_db' 
                     AND TABLE_NAME = 'users' 
                     AND INDEX_NAME = 'idx_reset_token');

SET @sql_index = IF(@exist_index = 0,
    'ALTER TABLE users ADD INDEX idx_reset_token (reset_token)',
    'SELECT "Index idx_reset_token already exists" AS message');

PREPARE stmt FROM @sql_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE users;

-- Success message
SELECT '✅ Password reset feature has been successfully added to the database!' AS Status;
