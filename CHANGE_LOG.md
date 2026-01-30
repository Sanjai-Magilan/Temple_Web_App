everyone should update ur changes in the change log

Installed packages: [nodemailer, passport, passport-google-oauth20]
Add new column in "Users" table
ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0, ADD COLUMN email_otp VARCHAR(6), ADD COLUMN email_otp_expires DATETIME;  
///this is to store the email is verified or not and to store email otp and its expires date with time.

Completed by : Dharun Kumar S (Time:09:50pm, Date:28-01-2026)
