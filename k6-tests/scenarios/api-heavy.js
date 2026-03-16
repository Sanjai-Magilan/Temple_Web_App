/**
 * API Heavy User Scenario
 *
 * Simulates users performing multiple API operations and database-heavy tasks.
 * This scenario focuses on testing database connection pools and query performance.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { config } from "../config.js";
import * as helpers from "../utils/helpers.js";

// Cache for session to prevent excessive login attempts
let cachedAuth = null;
let authTimestamp = 0;
const AUTH_CACHE_DURATION = 300; // 5 minutes in seconds

/**
 * Execute API-heavy user flow
 * Performs multiple rapid API calls to stress database and backend
 */
export function apiHeavyUserFlow() {
  const baseUrl = config.baseUrl;
  const credentials = config.testUsers.user;

  // Login to get authentication (or reuse cached session)
  let authResult;
  const now = Date.now() / 1000;

  if (cachedAuth && now - authTimestamp < AUTH_CACHE_DURATION) {
    authResult = cachedAuth;
  } else {
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
    console.error("❌ Login failed, skipping API heavy flow");
    return;
  }

  const authParams = helpers.getAuthParams(authResult);

  // Minimal think time - simulating rapid API usage
  sleep(0.5);

  // Rapid fire API requests to stress the system
  const apiEndpoints = [
    { url: `${baseUrl}/dashboard`, name: "Dashboard API" },
    { url: `${baseUrl}/profile`, name: "Profile API" },
    { url: `${baseUrl}/family`, name: "Family API" },
    { url: `${baseUrl}/donations`, name: "Donations API" },
  ];

  // Make multiple rapid API calls
  for (let i = 0; i < 3; i++) {
    // Randomly select an endpoint
    const endpoint = helpers.randomItem(apiEndpoints);

    const response = helpers.makeGetRequest(
      endpoint.url,
      { ...authParams, tags: { name: endpoint.name, scenario: "api_heavy" } },
      "API",
    );

    check(response, {
      [`${endpoint.name} successful`]: (r) => r.status >= 200 && r.status < 400,
      [`${endpoint.name} fast response`]: (r) => r.timings.duration < 500,
    });

    helpers.apiErrorRate.add(response.status < 200 || response.status >= 400);

    // Very short sleep between API calls
    sleep(0.3);
  }

  // Make some dashboard refreshes (common user behavior)
  for (let i = 0; i < 2; i++) {
    const dashboardResponse = helpers.makeGetRequest(
      `${baseUrl}/dashboard`,
      {
        ...authParams,
        tags: { name: "Dashboard Refresh", scenario: "api_heavy" },
      },
      "API",
    );

    check(dashboardResponse, {
      "dashboard refresh successful": (r) => r.status >= 200 && r.status < 400,
    });

    sleep(0.5);
  }

  // Test profile updates (write operations)
  const profileUpdatePayload = JSON.stringify({
    phone: `+91${helpers.randomInt(7000000000, 9999999999)}`,
    address: `Test Address ${helpers.randomInt(1, 1000)}`,
  });

  const updateResponse = helpers.makePostRequest(
    `${baseUrl}/profile/update`,
    profileUpdatePayload,
    {
      ...authParams,
      headers: helpers.getHeaders(authResult.token),
      tags: { name: "Profile Update" },
    },
    "API",
  );

  check(updateResponse, {
    "profile update response": (r) => r.status >= 200 && r.status < 400,
  });

  sleep(0.5);

  // Simulate checking family members multiple times
  for (let i = 0; i < 2; i++) {
    const familyResponse = helpers.makeGetRequest(
      `${baseUrl}/family`,
      { ...authParams, tags: { name: "Family Check", scenario: "api_heavy" } },
      "API",
    );

    check(familyResponse, {
      "family check successful": (r) => r.status >= 200 && r.status < 400,
    });

    sleep(0.3);
  }
}

export default apiHeavyUserFlow;
