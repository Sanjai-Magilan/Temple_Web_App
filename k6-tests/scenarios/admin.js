/**
 * Admin User Scenario
 *
 * Simulates admin users performing administrative tasks.
 * These operations typically involve complex queries and data aggregation.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { config } from "../config.js";
import * as helpers from "../utils/helpers.js";

/**
 * Execute admin user flow
 * Simulates admin accessing admin-only features
 */
export function adminUserFlow() {
  const baseUrl = config.baseUrl;
  const credentials = config.testUsers.admin;

  // Admin login
  const authResult = helpers.performLogin(
    baseUrl,
    credentials.email,
    credentials.password,
  );

  if (!authResult.success) {
    console.error("Admin login failed, skipping admin flow");
    return;
  }

  const authParams = helpers.getAuthParams(authResult);

  sleep(config.sleepDuration.afterLogin);

  // Access admin dashboard
  const adminDashboardResponse = helpers.makeGetRequest(
    `${baseUrl}/admin`,
    { ...authParams, tags: { name: "Admin Dashboard" } },
    "Admin Dashboard",
  );

  check(adminDashboardResponse, {
    "admin dashboard loaded": (r) => r.status === 200,
    "admin dashboard not redirected": (r) => !r.url.includes("/login"),
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.betweenActions);

  // View admin donations list (database-heavy query)
  const adminDonationsResponse = helpers.makeGetRequest(
    `${baseUrl}/admin/donations`,
    { ...authParams, tags: { name: "Admin Donations" } },
    "Admin Donations",
  );

  check(adminDonationsResponse, {
    "admin donations loaded": (r) => r.status === 200,
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.betweenActions);

  // View admin booking management
  const adminBookingsResponse = helpers.makeGetRequest(
    `${baseUrl}/admin/bookings`,
    { ...authParams, tags: { name: "Admin Bookings" } },
    "Admin Bookings",
  );

  check(adminBookingsResponse, {
    "admin bookings response": (r) => r.status === 200 || r.status === 404, // 404 if route doesn't exist
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.betweenActions);

  // View payment history (database-heavy aggregation query)
  const paymentHistoryResponse = helpers.makeGetRequest(
    `${baseUrl}/admin/payment-history`,
    { ...authParams, tags: { name: "Payment History" } },
    "Payment History",
  );

  check(paymentHistoryResponse, {
    "payment history response": (r) => r.status === 200 || r.status === 404,
  });

  // Think time before leaving
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
}

export default adminUserFlow;
