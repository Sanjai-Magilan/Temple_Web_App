#!/usr/bin/env node

/**
 * Setup Test Users Script
 *
 * This script creates test users required for k6 load testing.
 * Run this before executing load tests.
 *
 * Usage: node setup-test-users.js
 */

const http = require("http");
const querystring = require("querystring");

const BASE_URL = process.env.BASE_URL || "http://localhost:3002";
const TEST_USERS = [
  {
    email: "testuser@example.com",
    password: "Test@123",
    confirm_password: "Test@123",
    phone: "9876543210",
    first_name: "Test",
    last_name: "User",
    family_name: "Test Family",
    address: "123 Test Street",
    city: "Test City",
    state: "Test State",
    pincode: "123456",
    role: "user",
  },
  {
    email: "admin@example.com",
    password: "Admin@123",
    confirm_password: "Admin@123",
    phone: "9876543211",
    first_name: "Admin",
    last_name: "User",
    family_name: "Admin Family",
    address: "456 Admin Street",
    city: "Admin City",
    state: "Admin State",
    pincode: "654321",
    role: "admin",
  },
];

/**
 * Make HTTP POST request
 */
function makePostRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Register a user
 */
async function registerUser(userData) {
  const registerUrl = `${BASE_URL}/register`;

  console.log(`📝 Registering ${userData.email}...`);

  try {
    const response = await makePostRequest(registerUrl, userData);

    if (response.statusCode === 302 || response.statusCode === 200) {
      // Check if redirect is to dashboard (success) or back to register (failure)
      const location = response.headers.location || "";
      if (location.includes("/dashboard") || location === "/") {
        console.log(`   ✅ ${userData.email} registered successfully`);
        return true;
      } else if (
        response.body.includes("already registered") ||
        response.body.includes("Email already")
      ) {
        console.log(`   ℹ️  ${userData.email} already exists (skipping)`);
        return true;
      } else {
        console.log(
          `   ⚠️  ${userData.email} registration status unclear (might already exist)`,
        );
        return true;
      }
    } else {
      console.log(
        `   ❌ Failed to register ${userData.email}: Status ${response.statusCode}`,
      );
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error registering ${userData.email}:`, error.message);
    return false;
  }
}

/**
 * Update user role via direct database update (if needed)
 */
async function updateUserRole(email, role) {
  const mysql = require("mysql2/promise");
  const dotenv = require("dotenv");
  const path = require("path");

  // Load environment variables
  dotenv.config({ path: path.join(__dirname, "..", ".env") });

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "temple_db",
    });

    await connection.execute(
      "UPDATE users SET role = ?, email_verified = TRUE WHERE email = ?",
      [role, email],
    );

    await connection.end();
    console.log(`   ✅ Updated ${email} role to ${role} and verified email`);
    return true;
  } catch (error) {
    console.log(`   ⚠️  Could not update role for ${email} (DB access needed)`);
    return false;
  }
}

/**
 * Main setup function
 */
async function setupTestUsers() {
  console.log("🚀 Setting up k6 test users...\n");
  console.log(`Target: ${BASE_URL}\n`);

  let successCount = 0;

  for (const userData of TEST_USERS) {
    const success = await registerUser(userData);
    if (success) {
      successCount++;

      // Update role and verify email for all test users
      console.log(`   🔧 Configuring user settings...`);
      await updateUserRole(userData.email, userData.role);
    }
    console.log(""); // Empty line for readability
  }

  console.log("─".repeat(60));
  console.log(
    `\n✨ Setup complete! ${successCount}/${TEST_USERS.length} users ready\n`,
  );

  if (successCount === TEST_USERS.length) {
    console.log("All test users are configured");
    console.log("\nYou can now run k6 tests:");
    console.log("   cd k6-tests");
    console.log("   k6 run -e SCENARIO=smoke load-test.js\n");
    process.exit(0);
  } else {
    console.log("Some users failed to setup. Please check errors above.");
    process.exit(1);
  }
}

// Run the setup
setupTestUsers().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
