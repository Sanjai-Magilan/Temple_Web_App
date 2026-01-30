/**
 * Database Migration Script for Password Reset Feature
 * Run password reset OTP fields migration
 */

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runMigration() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "2005",
      database: process.env.DB_NAME || "temple_db",
      multipleStatements: true,
    });

    console.log("Connected to database...");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add_password_reset_fields.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Running migration: add_password_reset_fields.sql");

    // Execute migration
    await connection.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("Password reset fields added to users table:");
    console.log("  - password_reset_otp (VARCHAR(255))");
    console.log("  - password_reset_expires (DATETIME)");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("⚠️  Fields already exist. Migration skipped.");
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed.");
    }
  }
}

// Run the migration
runMigration();
