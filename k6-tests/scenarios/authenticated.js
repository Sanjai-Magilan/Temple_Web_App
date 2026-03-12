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

/**
 * Execute authenticated user flow
 * Simulates a complete user session with login and authenticated actions
 */
export function authenticatedUserFlow() {
  const baseUrl = config.baseUrl;
  const credentials = config.testUsers.user;

  // Step 1: Login
  const authResult = helpers.performLogin(
    baseUrl,
    credentials.email,
    credentials.password,
  );

  if (!authResult.success) {
    console.error("Login failed, skipping authenticated flow");
    return;
  }

  // Think time after login
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
    "dashboard loaded": (r) => r.status === 200,
    "dashboard is authenticated": (r) => !r.url.includes("/login"),
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
    "profile loaded": (r) => r.status === 200,
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
    "family page loaded": (r) => r.status === 200,
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
    "donations page loaded": (r) => r.status === 200,
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
