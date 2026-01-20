-- Migration: Add additional fields to family_members table
-- Run this on existing databases to add the new columns

-- Make user_id nullable and add new columns
ALTER TABLE family_members 
    MODIFY COLUMN user_id INT UNSIGNED NULL COMMENT 'Nullable for members without user accounts',
    ADD COLUMN member_name VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'Full name of the family member' AFTER user_id,
    ADD COLUMN email VARCHAR(255) NULL AFTER relationship,
    ADD COLUMN mobile VARCHAR(20) NULL AFTER email,
    ADD COLUMN address TEXT NULL AFTER mobile,
    ADD COLUMN occupation VARCHAR(100) NULL AFTER address,
    ADD COLUMN age INT UNSIGNED NULL AFTER occupation,
    ADD COLUMN date_of_birth DATE NULL AFTER age,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER added_at,
    ADD INDEX idx_relationship (relationship);

-- Update existing records to set member_name from users table
UPDATE family_members fm
INNER JOIN users u ON fm.user_id = u.id
SET fm.member_name = CONCAT(u.first_name, ' ', u.last_name),
    fm.email = u.email,
    fm.mobile = u.phone
WHERE fm.user_id IS NOT NULL;

-- Remove the default from member_name after updating existing records
ALTER TABLE family_members 
    ALTER COLUMN member_name DROP DEFAULT;

