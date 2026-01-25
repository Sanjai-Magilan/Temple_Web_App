# Forgot Password Feature - Database Setup

## Overview
This migration adds password reset functionality to the application by adding token fields to the `users` table.

## Required Changes
- Add `reset_token` column (VARCHAR 255)
- Add `reset_token_expires` column (DATETIME)
- Add index on `reset_token` for performance

## Prerequisites
- MySQL 5.7 or higher
- Access to the `temple_db` database
- Database credentials configured in `.env` file

---

## Installation Methods

### Method 1: Using MySQL Command Line (Recommended)

```bash
mysql -u root -p temple_db < database/SETUP_FORGOT_PASSWORD.sql
```

Enter your MySQL password when prompted.

---

### Method 2: Using phpMyAdmin

1. Open phpMyAdmin in your browser
2. Select the `temple_db` database from the left sidebar
3. Click on the **SQL** tab
4. Copy and paste the SQL below
5. Click **Go** to execute

```sql
USE temple_db;

ALTER TABLE users 
    ADD COLUMN reset_token VARCHAR(255) NULL COMMENT 'Password reset token',
    ADD COLUMN reset_token_expires DATETIME NULL COMMENT 'Token expiration time',
    ADD INDEX idx_reset_token (reset_token);
```

---

### Method 3: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Open a new SQL tab
4. Paste the SQL below
5. Click the lightning bolt icon (Execute)

```sql
USE temple_db;

ALTER TABLE users 
    ADD COLUMN reset_token VARCHAR(255) NULL COMMENT 'Password reset token',
    ADD COLUMN reset_token_expires DATETIME NULL COMMENT 'Token expiration time',
    ADD INDEX idx_reset_token (reset_token);
```

---

### Method 4: Automated Setup Script (Safe)

Use the provided setup script that checks if columns already exist:

```bash
mysql -u root -p temple_db < database/migrations/add_password_reset_tokens.sql
```

Or use the complete setup:

```bash
mysql -u root -p temple_db < database/SETUP_FORGOT_PASSWORD.sql
```

---

## Verification

After running the migration, verify the changes:

```sql
USE temple_db;
DESCRIBE users;
```

You should see the new columns:
- `reset_token` (varchar(255), nullable)
- `reset_token_expires` (datetime, nullable)

Check the index:
```sql
SHOW INDEX FROM users WHERE Key_name = 'idx_reset_token';
```

---

## Rollback (If Needed)

To remove the forgot password feature:

```sql
USE temple_db;

ALTER TABLE users 
    DROP INDEX idx_reset_token,
    DROP COLUMN reset_token,
    DROP COLUMN reset_token_expires;
```

---

## Testing After Migration

1. Start the application:
   ```bash
   npm start
   ```

2. Navigate to: `http://localhost:3002/login`

3. Click **"Forgot password?"** link

4. Enter a registered email address

5. Follow the reset link to test the feature

---

## Troubleshooting

### Error: "Column 'reset_token' already exists"
**Solution:** The migration has already been run. No action needed.

### Error: "Table 'users' doesn't exist"
**Solution:** Run the main schema first: `database/schema.sql`

### Error: "Access denied"
**Solution:** Check your MySQL credentials in the `.env` file

### Error: "Unknown database 'temple_db'"
**Solution:** Create the database first:
```sql
CREATE DATABASE IF NOT EXISTS temple_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## For New Team Members

If you're setting up the project for the first time:

1. **First**, run the main schema:
   ```bash
   mysql -u root -p temple_db < database/schema.sql
   ```

2. **Then**, run this migration:
   ```bash
   mysql -u root -p temple_db < database/SETUP_FORGOT_PASSWORD.sql
   ```

3. **Finally**, start the application:
   ```bash
   npm install
   npm start
   ```

---

## Migration Info

- **Feature:** Forgot Password
- **Date:** January 25, 2026
- **Author:** Development Team
- **Breaking:** No (backward compatible)
- **Required:** Yes (for forgot password feature)

---

## Questions?

If you encounter any issues running this migration, please contact the development team or create an issue in the repository.
