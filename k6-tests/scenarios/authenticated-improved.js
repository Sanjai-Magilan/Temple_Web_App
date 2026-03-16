/**
 * Improved Authenticated User Scenario
 *
 * This script demonstrates proper session-based authentication with k6:
 * - Uses http.cookieJar() for automatic cookie management
 * - Handles HTTP 302 redirects properly
 * - Uses group() for logical organization
 * - Simulates realistic user behavior
 * - Proper status code checks (>= 200 && < 400)
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { config } from "../config.js";
import * as helpers from "../utils/helpers.js";

// Session cache to prevent excessive logins (realistic behavior)
let cachedAuth = null;
let authTimestamp = 0;
const AUTH_CACHE_DURATION = 300; // 5 minutes

/**
 * Execute authenticated user flow with proper session management
 */
export function authenticatedUserFlow() {
  const baseUrl = config.baseUrl;
  const credentials = config.testUsers.user;

  // ==================== GROUP: Authentication ====================
  let authResult = group("01. Authentication", () => {
    const now = Date.now() / 1000;

    // Reuse session if still valid (realistic user behavior)
    if (cachedAuth && now - authTimestamp < AUTH_CACHE_DURATION) {
      // console.log("♻️  Reusing existing session");
      return cachedAuth;
    }

    // Perform login
    const result = helpers.performLogin(
      baseUrl,
      credentials.email,
      credentials.password,
    );

    if (result.success) {
      cachedAuth = result;
      authTimestamp = now;
      // console.log("✅ New session created");
    } else {
      console.error("❌ Authentication failed");
    }

    return result;
  });

  // Exit if login failed
  if (!authResult.success) {
    console.error("❌ Skipping flow due to authentication failure");
    return;
  }

  // User reads the login confirmation
  sleep(config.sleepDuration.afterLogin);

  // Get authenticated request parameters with cookie jar
  const authParams = helpers.getAuthParams(authResult);

  // ==================== GROUP: Dashboard ====================
  group("02. Dashboard", () => {
    const dashboardResponse = helpers.makeGetRequest(
      `${baseUrl}/dashboard`,
      { ...authParams, tags: { name: "Dashboard" } },
      "Dashboard",
    );

    check(dashboardResponse, {
      "dashboard loaded successfully": (r) => r.status >= 200 && r.status < 400,
      "dashboard is authenticated (not redirected to login)": (r) =>
        !r.url.includes("/login"),
      "dashboard loads quickly": (r) => r.timings.duration < 2000,
    });

    // User reads dashboard content
    helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
  });

  // ==================== GROUP: Profile ====================
  group("03. Profile Management", () => {
    // View profile
    const profileResponse = helpers.makeGetRequest(
      `${baseUrl}/profile`,
      { ...authParams, tags: { name: "Profile View" } },
      "Profile",
    );

    check(profileResponse, {
      "profile page loaded": (r) => r.status >= 200 && r.status < 400,
      "profile loads in time": (r) => r.timings.duration < 1500,
    });

    // User reviews their profile information
    helpers.randomSleep(config.sleepDuration.betweenActions);
  });

  // ==================== GROUP: Family Management ====================
  group("04. Family Members", () => {
    const familyResponse = helpers.makeGetRequest(
      `${baseUrl}/family`,
      { ...authParams, tags: { name: "Family List" } },
      "Family",
    );

    check(familyResponse, {
      "family page accessible": (r) => r.status >= 200 && r.status < 400,
      "family page loads quickly": (r) => r.timings.duration < 1500,
    });

    // User reviews family members
    helpers.randomSleep(config.sleepDuration.betweenActions);
  });

  // ==================== GROUP: Donations ====================
  group("05. Donations", () => {
    // View donations list
    const donationsResponse = helpers.makeGetRequest(
      `${baseUrl}/donations`,
      { ...authParams, tags: { name: "Donations List" } },
      "Donations",
    );

    check(donationsResponse, {
      "donations page loaded": (r) => r.status >= 200 && r.status < 400,
      "donations response time": (r) => r.timings.duration < 1500,
    });

    sleep(config.sleepDuration.betweenActions);

    // View new donation form
    const newDonationResponse = helpers.makeGetRequest(
      `${baseUrl}/donations/new`,
      { ...authParams, tags: { name: "New Donation Form" } },
      "New Donation",
    );

    check(newDonationResponse, {
      "new donation form accessible": (r) => r.status >= 200 && r.status < 400,
    });

    // User fills out form
    helpers.randomSleep(config.sleepDuration.betweenActions);
  });

  // ==================== GROUP: Bookings ====================
  group("06. Pooja Bookings", () => {
    const bookingsResponse = helpers.makeGetRequest(
      `${baseUrl}/bookings/pooja`,
      { ...authParams, tags: { name: "Pooja Bookings" } },
      "Bookings",
    );

    check(bookingsResponse, {
      "bookings page accessible": (r) => r.status >= 200 && r.status < 400,
      "bookings response time": (r) => r.timings.duration < 2000,
    });

    // User reviews available poojas
    helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
  });

  // Final think time before user leaves
  sleep(config.sleepDuration.betweenActions);
}

export default authenticatedUserFlow;
