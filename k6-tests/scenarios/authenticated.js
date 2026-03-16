/**
 * Authenticated User Scenario
 *
 * Simulates a logged-in user performing typical actions like:
 * - Logging in
 * - Viewing dashboard
 * - Viewing profile
 * - Viewing family members
 * - Browsing donations
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { config } from "../config.js";
import * as helpers from "../utils/helpers.js";

// Cache for session to prevent excessive login attempts
// In a real scenario, users don't log in for every single action
let cachedAuth = null;
let authTimestamp = 0;
const AUTH_CACHE_DURATION = 300; // 5 minutes in seconds

/**
 * Execute authenticated user flow
 * Simulates a complete user session with login and authenticated actions
 */
export function authenticatedUserFlow() {
  const baseUrl = config.baseUrl;
  const credentials = config.testUsers.user;

  // Step 1: Login (or reuse cached session)
  let authResult;
  const now = Date.now() / 1000;

  // Reuse session if available and not expired (realistic user behavior)
  if (cachedAuth && now - authTimestamp < AUTH_CACHE_DURATION) {
    authResult = cachedAuth;
    // console.log("♻️  Reusing cached session");
  } else {
    // Perform fresh login
    authResult = helpers.performLogin(
      baseUrl,
      credentials.email,
      credentials.password,
    );

    if (authResult.success) {
      cachedAuth = authResult;
      authTimestamp = now;
    }
  }

  if (!authResult.success) {
    console.error("❌ Login failed, skipping authenticated flow");
    return;
  }

  // Think time after login (simulate user reading the page)
  sleep(config.sleepDuration.afterLogin);

  // Create authenticated request parameters
  const authParams = helpers.getAuthParams(authResult);

  // Step 2: Access dashboard
  const dashboardResponse = helpers.makeGetRequest(
    `${baseUrl}/dashboard`,
    { ...authParams, tags: { name: "Dashboard" } },
    "Dashboard",
  );

  check(dashboardResponse, {
    "dashboard loaded": (r) => r.status >= 200 && r.status < 400,
    "dashboard is authenticated": (r) => !r.url.includes("/login"),
    "dashboard loaded in time": (r) => r.timings.duration < 2000,
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);

  // Step 3: View profile
  const profileResponse = helpers.makeGetRequest(
    `${baseUrl}/profile`,
    { ...authParams, tags: { name: "Profile" } },
    "Profile",
  );

  check(profileResponse, {
    "profile loaded": (r) => r.status >= 200 && r.status < 400,
    "profile response time": (r) => r.timings.duration < 1500,
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.betweenActions);

  // Step 4: View family members
  const familyResponse = helpers.makeGetRequest(
    `${baseUrl}/family`,
    { ...authParams, tags: { name: "Family" } },
    "Family",
  );

  check(familyResponse, {
    "family page loaded": (r) => r.status >= 200 && r.status < 400,
    "family response time": (r) => r.timings.duration < 1500,
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.betweenActions);

  // Step 5: View donations
  const donationsResponse = helpers.makeGetRequest(
    `${baseUrl}/donations`,
    { ...authParams, tags: { name: "Donations" } },
    "Donations",
  );

  check(donationsResponse, {
    "donations page loaded": (r) => r.status >= 200 && r.status < 400,
    "donations response time": (r) => r.timings.duration < 1500,
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.betweenActions);

  // Step 6: View new donation form
  const newDonationResponse = helpers.makeGetRequest(
    `${baseUrl}/donations/new`,
    { ...authParams, tags: { name: "New Donation" } },
    "New Donation",
  );

  check(newDonationResponse, {
    "new donation page loaded": (r) => r.status === 200,
  });

  // Think time before logout
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);

  // Step 7: Logout (optional - if logout endpoint exists)
  const logoutResponse = helpers.makeGetRequest(
    `${baseUrl}/logout`,
    { ...authParams, tags: { name: "Logout" } },
    "Logout",
  );

  check(logoutResponse, {
    "logout successful": (r) => r.status === 200 || r.status === 302,
  });
}

export default authenticatedUserFlow;
