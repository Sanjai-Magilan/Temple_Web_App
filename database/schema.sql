-- Temple Management System Database Schema
-- Optimized for low-cost hosting (MySQL 5.7+)
-- Created for Hostinger shared hosting

-- Drop tables if they exist (for fresh install)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS gallery;
DROP TABLE IF EXISTS blogs;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS pooja_bookings;
DROP TABLE IF EXISTS hall_bookings;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS families;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table
-- Stores all user accounts (admin and regular users)
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active TINYINT(1) DEFAULT 1,
    email_verified TINYINT(1) DEFAULT 0,
    phone_verified TINYINT(1) DEFAULT 0,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Families Table
-- Groups users into families for joint bookings and donations
CREATE TABLE families (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    family_name VARCHAR(200) NOT NULL,
    head_user_id INT UNSIGNED NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_head_user (head_user_id),
    INDEX idx_family_name (family_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Family Members Table
-- Stores family members including children and dependents
-- user_id is nullable - allows storing members without user accounts (e.g., children)
CREATE TABLE family_members (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    family_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NULL COMMENT 'Nullable for members without user accounts',
    member_name VARCHAR(200) NOT NULL COMMENT 'Full name of the family member',
    relationship VARCHAR(50) NOT NULL COMMENT 'head, spouse, child, parent, sibling, etc.',
    email VARCHAR(255) NULL,
    mobile VARCHAR(20) NULL,
    address TEXT NULL,
    occupation VARCHAR(100) NULL,
    age INT UNSIGNED NULL,
    date_of_birth DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_family (family_id),
    INDEX idx_user (user_id),
    INDEX idx_relationship (relationship)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT TABLES
-- ============================================

-- Payments Table
-- Central payment tracking (for Razorpay integration)
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Razorpay payment ID',
    order_id VARCHAR(255) NOT NULL COMMENT 'Razorpay order ID',
    user_id INT UNSIGNED NULL COMMENT 'Can be null for guest payments',
    family_id INT UNSIGNED NULL COMMENT 'If payment is for a family',
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50) COMMENT 'card, upi, netbanking, etc.',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_type ENUM('donation', 'hall_booking', 'pooja_booking', 'other') NOT NULL,
    related_id INT UNSIGNED NULL COMMENT 'ID of related record (donation_id, booking_id, etc.)',
    razorpay_response TEXT COMMENT 'Store full Razorpay response JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    INDEX idx_payment_id (payment_id),
    INDEX idx_order_id (order_id),
    INDEX idx_user (user_id),
    INDEX idx_family (family_id),
    INDEX idx_status (status),
    INDEX idx_payment_type (payment_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donations Table
-- Tracks all donations made to the temple
CREATE TABLE donations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL COMMENT 'Null for anonymous donations',
    family_id INT UNSIGNED NULL,
    amount DECIMAL(10, 2) NOT NULL,
    donation_type VARCHAR(100) COMMENT 'general, specific_pooja, construction, etc.',
    purpose TEXT COMMENT 'Optional purpose/note',
    payment_id INT UNSIGNED NULL COMMENT 'Link to payments table',
    is_anonymous TINYINT(1) DEFAULT 0,
    receipt_number VARCHAR(50) UNIQUE,
    receipt_generated TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_family (family_id),
    INDEX idx_payment (payment_id),
    INDEX idx_receipt (receipt_number),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BOOKING TABLES
-- ============================================

-- Hall Bookings Table
-- Manages temple hall/venue bookings
CREATE TABLE hall_bookings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    family_id INT UNSIGNED NULL,
    hall_name VARCHAR(100) NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    event_type VARCHAR(100) COMMENT 'wedding, function, ceremony, etc.',
    event_description TEXT,
    expected_guests INT UNSIGNED,
    amount DECIMAL(10, 2) NOT NULL,
    payment_id INT UNSIGNED NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    INDEX idx_booking_number (booking_number),
    INDEX idx_user (user_id),
    INDEX idx_family (family_id),
    INDEX idx_booking_date (booking_date),
    INDEX idx_status (status),
    INDEX idx_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pooja Bookings Table
-- Manages pooja/ritual bookings
CREATE TABLE pooja_bookings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT UNSIGNED NOT NULL,
    family_id INT UNSIGNED NULL,
    pooja_name VARCHAR(200) NOT NULL,
    pooja_type VARCHAR(100) COMMENT 'daily, special, festival, etc.',
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    devotee_name VARCHAR(200) NOT NULL COMMENT 'Name of person for whom pooja is performed',
    gotra VARCHAR(100),
    nakshatra VARCHAR(100),
    special_instructions TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_id INT UNSIGNED NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    INDEX idx_booking_number (booking_number),
    INDEX idx_user (user_id),
    INDEX idx_family (family_id),
    INDEX idx_booking_date (booking_date),
    INDEX idx_status (status),
    INDEX idx_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONTENT TABLES
-- ============================================

-- News Table
-- Temple news and announcements
CREATE TABLE news (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(255),
    author_id INT UNSIGNED NOT NULL,
    is_published TINYINT(1) DEFAULT 0,
    is_featured TINYINT(1) DEFAULT 0,
    views INT UNSIGNED DEFAULT 0,
    published_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_slug (slug),
    INDEX idx_author (author_id),
    INDEX idx_published (is_published),
    INDEX idx_featured (is_featured),
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blogs Table
-- Temple blog posts and articles
CREATE TABLE blogs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(255),
    author_id INT UNSIGNED NOT NULL,
    category VARCHAR(100),
    tags VARCHAR(500) COMMENT 'Comma-separated tags',
    is_published TINYINT(1) DEFAULT 0,
    is_featured TINYINT(1) DEFAULT 0,
    views INT UNSIGNED DEFAULT 0,
    published_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_slug (slug),
    INDEX idx_author (author_id),
    INDEX idx_category (category),
    INDEX idx_published (is_published),
    INDEX idx_featured (is_featured),
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gallery Table
-- Temple photo/video gallery
CREATE TABLE gallery (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_path VARCHAR(500) NOT NULL COMMENT 'Path to image file',
    image_type ENUM('image', 'video') DEFAULT 'image',
    category VARCHAR(100) COMMENT 'events, festivals, daily, etc.',
    uploaded_by INT UNSIGNED NOT NULL,
    is_featured TINYINT(1) DEFAULT 0,
    display_order INT UNSIGNED DEFAULT 0,
    views INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_category (category),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_featured (is_featured),
    INDEX idx_display_order (display_order),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Insert default admin user (password should be hashed in application)
-- Password: 'admin123' (must be changed after first login)
-- Note: This is just a placeholder. Actual password hashing should be done in the application
INSERT INTO users (email, phone, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES ('admin@temple.com', '7418802603', '$2a$10$PLACEHOLDER_HASH_REPLACE_IN_APP', 'Admin', 'User', 'admin', 1, 1);


