# Database Schema Documentation

## Overview
This schema is designed for a Temple Management System, optimized for low-cost hosting (MySQL 5.7+ compatible with Hostinger).

## Database Design Principles

1. **Normalization**: Proper 3NF normalization to reduce redundancy
2. **Indexes**: Strategic indexes on foreign keys and frequently queried columns
3. **Storage Optimization**: 
   - Use appropriate data types (INT UNSIGNED, VARCHAR with proper lengths)
   - TEXT columns only where necessary
   - DECIMAL for monetary values
4. **Performance**: Indexes on foreign keys, status fields, and date fields
5. **Data Integrity**: Foreign key constraints with appropriate CASCADE/SET NULL actions

## Table Relationships

```
users (1) ──< (many) family_members (many) >── (1) families
users (1) ──< (many) donations
users (1) ──< (many) hall_bookings
users (1) ──< (many) pooja_bookings
users (1) ──< (many) payments
users (1) ──< (many) news (author)
users (1) ──< (many) blogs (author)
users (1) ──< (many) gallery (uploader)

families (1) ──< (many) family_members
families (1) ──< (many) donations
families (1) ──< (many) hall_bookings
families (1) ──< (many) pooja_bookings
families (1) ──< (many) payments

payments (1) ──< (1) donations
payments (1) ──< (1) hall_bookings
payments (1) ──< (1) pooja_bookings
```

## Table Descriptions

### Core Tables

#### users
- Stores all user accounts (admin and regular users)
- Role-based access: 'admin' or 'user'
- Email and phone verification flags
- Indexed on email, phone, role, and active status

#### families
- Groups users into families
- Head user is the primary contact
- Stores family address information

#### family_members
- Many-to-many relationship between users and families
- Tracks relationship type (head, spouse, child, etc.)
- Allows users to belong to multiple families if needed

### Payment Tables

#### payments
- Central payment tracking for Razorpay integration
- Stores payment IDs, order IDs, and full Razorpay response
- Links to users/families and related records (donations, bookings)
- Status tracking: pending, completed, failed, refunded

#### donations
- Tracks all temple donations
- Supports anonymous donations
- Generates receipt numbers
- Links to payment records

### Booking Tables

#### hall_bookings
- Manages temple hall/venue bookings
- Tracks booking dates, times, event details
- Status: pending, confirmed, cancelled, completed
- Unique booking numbers for reference

#### pooja_bookings
- Manages pooja/ritual bookings
- Stores devotee details (name, gotra, nakshatra)
- Tracks booking date and time
- Status management similar to hall bookings

### Content Tables

#### news
- Temple news and announcements
- Slug-based URLs for SEO
- Featured news support
- View tracking

#### blogs
- Blog posts and articles
- Category and tag support
- Featured content flag
- View tracking

#### gallery
- Photo/video gallery
- Category-based organization
- Display order for sorting
- View tracking

## Installation

1. Create database:
   ```sql
   CREATE DATABASE temple_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE temple_db;
   ```

2. Run schema:
   ```bash
   mysql -u your_user -p temple_db < database/schema.sql
   ```

3. Update admin password in application (the placeholder hash in schema.sql should be replaced)

## Indexes Strategy

Indexes are created on:
- All foreign keys (for JOIN performance)
- Frequently queried columns (email, phone, status, dates)
- Unique constraints (email, booking numbers, receipt numbers)
- Search columns (slug, category, tags)

## Performance Considerations

1. **Connection Pooling**: Use connection pooling (already configured in `config/database.js`)
2. **Query Optimization**: Use indexes for WHERE clauses and JOINs
3. **Pagination**: Always paginate large result sets
4. **Image Storage**: Store image paths, not binary data (use file system or CDN)
5. **Archive Old Data**: Consider archiving old bookings/donations after a period

## Security Notes

1. **Password Hashing**: Use bcrypt (already in dependencies)
2. **SQL Injection**: Use parameterized queries (mysql2 supports this)
3. **Input Validation**: Validate all user inputs
4. **Role-Based Access**: Check user roles before sensitive operations

## Future Enhancements

- Add audit logs table for tracking changes
- Add notifications table for user notifications
- Add settings table for temple configuration
- Add feedback/comments table for user feedback



