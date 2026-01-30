everyone should update ur changes in the change log

Installed packages: [nodemailer, passport, passport-google-oauth20]
Add new column in "Users" table
ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0, ADD COLUMN email_otp VARCHAR(6), ADD COLUMN email_otp_expires DATETIME;  
///this is to store the email is verified or not and to store email otp and its expires date with time.

Completed by : Dharun Kumar S (Time:09:50pm, Date:28-01-2026)

Forgot Password Feature with OTP Email Verification
Add new columns in "Users" table
ALTER TABLE users ADD COLUMN password_reset_otp VARCHAR(255) NULL, ADD COLUMN password_reset_expires DATETIME NULL;
///this is to store password reset OTP (bcrypt hashed) and its expiration time separate from registration OTP.

Files Created: database/migrations/add_password_reset_fields.sql, database/run-password-reset-migration.js, views/auth/forgot-password.ejs, views/auth/verify-reset-otp.ejs, views/auth/reset-password.ejs, FORGOT_PASSWORD_GUIDE.md

Files Modified (all changes appended at end): models/userModel.js (4 functions added), utils/mailer.js (1 function added), controllers/authController.js (7 functions added), routes/authRoutes.js (6 routes added), views/auth/login.ejs (1 line added for forgot password link)

Routes: GET/POST /forgot-password, GET/POST /verify-reset-otp, POST /resend-reset-otp, GET/POST /reset-password
Flow: Email input -> OTP sent to email -> OTP verification -> New password -> Login with new password
Security: OTP bcrypt hashed, 10-minute expiry, one-time use, separate fields prevent conflicts with registration OTP

Completed by : S.T.Devi (Time:06:45pm, Date:30-01-2026)
