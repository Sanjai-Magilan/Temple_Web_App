/**
 * Complete Example: Session-Based Authentication with k6
 *
 * This example demonstrates all best practices for testing
 * Node.js + Express applications with session cookies:
 *
 * ✅ Proper HTTP 302 redirect handling
 * ✅ http.cookieJar() for automatic cookie management
 * ✅ Correct status code checks (>= 200 && < 400)
 * ✅ group() for logical organization
 * ✅ Realistic user behavior with session reuse
 * ✅ Comprehensive error logging
 *
 * Run: k6 run examples/session-auth-example.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests under 2s
    http_req_failed: ["rate<0.1"], // Error rate under 10%
    checks: ["rate>0.95"], // 95% of checks pass
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3002";

// Session cache (per VU) - prevents excessive logins
let sessionJar = null;
let sessionTimestamp = 0;
const SESSION_DURATION = 300; // 5 minutes

/**
 * Login and get session cookie jar
 */
function login(email, password) {
  const jar = http.cookieJar();

  const payload = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  const response = http.post(`${BASE_URL}/login`, payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirects: 0, // Don't follow redirects - we want to capture the 302
    jar: jar, // Use cookie jar to store session cookies
    tags: { name: "Login" },
  });

  // Check for successful login (200 or 302)
  const success = check(response, {
    "login status is 200 or 302": (r) => r.status >= 200 && r.status < 400,
    "login response time OK": (r) => r.timings.duration < 1000,
  });

  if (!success) {
    console.error(`❌ Login failed!`);
    console.error(`   Status: ${response.status}`);
    console.error(`   Body: ${response.body.substring(0, 200)}`);
    return { success: false, jar: null };
  }

  // Verify session cookie was set
  const cookies = response.cookies;
  const hasSessionCookie =
    cookies && (cookies["connect.sid"] || cookies["session"]);

  if (!hasSessionCookie) {
    console.warn(`⚠️  Login succeeded but no session cookie found`);
    console.warn(
      `   Available cookies: ${JSON.stringify(Object.keys(cookies || {}))}`,
    );
  }

  return { success: true, jar: jar };
}

/**
 * Make authenticated request using session cookie jar
 */
function makeAuthRequest(url, jar, name) {
  return http.get(url, {
    jar: jar, // Cookie jar automatically includes session cookies
    redirects: 5,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    tags: { name: name },
  });
}

/**
 * Main test scenario
 */
export default function () {
  const credentials = {
    email: __ENV.TEST_USER_EMAIL || "testuser@example.com",
    password: __ENV.TEST_USER_PASSWORD || "Test@123",
  };

  // ==================== GROUP 1: Authentication ====================
  let auth = group("01. Login", () => {
    const now = Date.now() / 1000;

    // Reuse session if still valid (realistic behavior)
    if (sessionJar && now - sessionTimestamp < SESSION_DURATION) {
      return { success: true, jar: sessionJar };
    }

    // Perform new login
    const result = login(credentials.email, credentials.password);

    if (result.success) {
      sessionJar = result.jar;
      sessionTimestamp = now;
    }

    return result;
  });

  if (!auth.success) {
    console.error("❌ Skipping test - authentication failed");
    return;
  }

  sleep(1); // User reads the page after login

  // ==================== GROUP 2: Homepage/Dashboard ====================
  group("02. Homepage/Dashboard", () => {
    const response = makeAuthRequest(
      `${BASE_URL}/dashboard`,
      auth.jar,
      "Dashboard",
    );

    check(response, {
      "dashboard loaded successfully": (r) => r.status >= 200 && r.status < 400,
      "not redirected to login": (r) => !r.url.includes("/login"),
      "dashboard loads quickly": (r) => r.timings.duration < 2000,
    });

    sleep(2); // User reads dashboard
  });

  // ==================== GROUP 3: Profile ====================
  group("03. Profile", () => {
    const response = makeAuthRequest(
      `${BASE_URL}/profile`,
      auth.jar,
      "Profile",
    );

    check(response, {
      "profile accessible": (r) => r.status >= 200 && r.status < 400,
      "profile loads in time": (r) => r.timings.duration < 1500,
    });

    sleep(1.5);
  });

  // ==================== GROUP 4: API Calls ====================
  group("04. API Operations", () => {
    const endpoints = [
      { url: "/family", name: "Family" },
      { url: "/donations", name: "Donations" },
      { url: "/bookings/pooja", name: "Bookings" },
    ];

    endpoints.forEach((endpoint) => {
      const response = makeAuthRequest(
        `${BASE_URL}${endpoint.url}`,
        auth.jar,
        endpoint.name,
      );

      check(response, {
        [`${endpoint.name} accessible`]: (r) =>
          r.status >= 200 && r.status < 400,
        [`${endpoint.name} responds quickly`]: (r) => r.timings.duration < 1500,
      });

      sleep(1); // Think time between API calls
    });
  });

  // ==================== GROUP 5: Logout (Optional) ====================
  // Note: Many tests don't explicitly logout - session expires naturally
  // Uncomment if your app has a logout endpoint:
  /*
  group("05. Logout", () => {
    const response = http.get(`${BASE_URL}/logout`, {
      jar: auth.jar,
      redirects: 5,
      tags: { name: "Logout" },
    });

    check(response, {
      "logout successful": (r) => r.status >= 200 && r.status < 400,
    });
  });
  */

  sleep(1); // Final think time
}

/**
 * Test lifecycle functions
 */
export function setup() {
  console.log("=".repeat(60));
  console.log("🚀 Starting Session-Based Authentication Test");
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   VUs: ${options.vus}, Duration: ${options.duration}`);
  console.log("=".repeat(60));

  // Health check
  const health = http.get(BASE_URL);
  if (health.status < 200 || health.status >= 400) {
    console.error(`⚠️  WARNING: Application may not be accessible`);
    console.error(`   Status: ${health.status}`);
  } else {
    console.log("✅ Application is reachable");
  }

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log("=".repeat(60));
  console.log("✅ Test Completed");
  console.log(`   Started: ${data.startTime}`);
  console.log(`   Ended: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
}
