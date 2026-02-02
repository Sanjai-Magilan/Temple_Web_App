/**
 * Database Migration Script
 * Run OTP fields migration
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
      password: process.env.DB_PASSWORD || "3014",
      database: process.env.DB_NAME || "temple_db",
      multipleStatements: true,
    });

    console.log("Connected to database...");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "add_otp_fields.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Running migration: add_otp_fields.sql");

    // Execute migration
    const [results] = await connection.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("OTP fields added to users table:");
    console.log("  - email_otp (VARCHAR(6))");
    console.log("  - email_otp_expires (DATETIME)");
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

// Run migration
runMigration()
  .then(() => {
    console.log("\n All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n Error:", error);
    process.exit(1);
  });
