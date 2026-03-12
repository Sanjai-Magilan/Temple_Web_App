/**
 * Main k6 Load Test Script
 *
 * This is the main entry point for the k6 load tests.
 * It orchestrates different user scenarios to simulate realistic load on the application.
 *
 * Run with: k6 run load-test.js
 * Or specify scenario: k6 run -e SCENARIO=smoke load-test.js
 * Or specify base URL: k6 run -e BASE_URL=http://production.com load-test.js
 */

import { sleep } from "k6";
import { config, getTestOptions } from "./config.js";
import * as helpers from "./utils/helpers.js";

// Import scenario functions
import browsingUserFlow from "./scenarios/browsing.js";
import authenticatedUserFlow from "./scenarios/authenticated.js";
import apiHeavyUserFlow from "./scenarios/api-heavy.js";
import adminUserFlow from "./scenarios/admin.js";

// Get the scenario from environment variable or use default
const SCENARIO = __ENV.SCENARIO || "load";

// Configure test options based on selected scenario
export const options = getTestOptions(SCENARIO);

/**
 * Setup function - runs once before all iterations
 * Use this to prepare test data or verify system availability
 */
export function setup() {
  console.log("=".repeat(60));
  console.log(`Starting k6 Load Test`);
  console.log(`Scenario: ${SCENARIO}`);
  console.log(`Target URL: ${config.baseUrl}`);
  console.log(`Test User: ${config.testUsers.user.email}`);
  console.log("=".repeat(60));

  // Verify application is reachable
  const healthCheck = helpers.makeGetRequest(
    config.baseUrl,
    {},
    "Health Check",
  );

  if (!helpers.isSuccessful(healthCheck) && !helpers.isRedirect(healthCheck)) {
    console.error(
      `WARNING: Application may not be accessible at ${config.baseUrl}`,
    );
    console.error(`Health check returned status: ${healthCheck.status}`);
  } else {
    console.log(`✓ Application is reachable`);
  }

  return {
    startTime: new Date().toISOString(),
    scenario: SCENARIO,
  };
}

/**
 * Default function - runs for each virtual user iteration
 * This is where the main test logic happens
 */
export default function (data) {
  // Randomly select a user behavior pattern to simulate realistic mixed load
  // Adjust these weights based on your expected user distribution
  const userType = helpers.randomInt(1, 100);

  if (userType <= 20) {
    // 20% of users are just browsing (anonymous)
    browsingUserFlow();
  } else if (userType <= 70) {
    // 50% of users are authenticated and performing normal actions
    authenticatedUserFlow();
  } else if (userType <= 90) {
    // 20% of users are API-heavy (power users)
    apiHeavyUserFlow();
  } else {
    // 10% of users are admins
    adminUserFlow();
  }

  // Random sleep between user sessions
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
}

/**
 * Teardown function - runs once after all iterations complete
 * Use this for cleanup or final reporting
 */
export function teardown(data) {
  console.log("=".repeat(60));
  console.log(`Load Test Completed`);
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log(`Scenario: ${data.scenario}`);
  console.log("=".repeat(60));
  console.log("Check the summary above for detailed metrics.");
  console.log("Look for:");
  console.log("  - http_req_duration: Response times");
  console.log("  - http_req_failed: Error rate");
  console.log("  - http_reqs: Request throughput");
  console.log("  - vus: Virtual users");
  console.log("=".repeat(60));
}

/**
 * Handle test errors and thresholds
 * This function is called when thresholds are crossed
 */
export function handleSummary(data) {
  // You can customize summary output here
  // For now, return default summary
  return {
    stdout: JSON.stringify(data, null, 2),
  };
}
