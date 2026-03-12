/**
 * Advanced Multi-Scenario Load Test
 *
 * This script runs multiple scenarios concurrently with different configurations.
 * Use this for comprehensive load testing with mixed user behaviors.
 */

import { sleep } from "k6";
import { config } from "./config.js";
import * as helpers from "./utils/helpers.js";

// Import scenario functions
import browsingUserFlow from "./scenarios/browsing.js";
import authenticatedUserFlow from "./scenarios/authenticated.js";
import apiHeavyUserFlow from "./scenarios/api-heavy.js";
import adminUserFlow from "./scenarios/admin.js";

// Configure multiple scenarios running in parallel
export const options = {
  scenarios: {
    // Scenario 1: Browsing users (constant light load)
    browsing_users: {
      executor: "constant-vus",
      exec: "browsingScenario",
      vus: 5,
      duration: "10m",
      tags: { scenario_type: "browsing" },
    },

    // Scenario 2: Authenticated users (ramping load)
    authenticated_users: {
      executor: "ramping-vus",
      exec: "authenticatedScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 10 },
        { duration: "5m", target: 10 },
        { duration: "1m", target: 20 },
        { duration: "2m", target: 20 },
      ],
      tags: { scenario_type: "authenticated" },
    },

    // Scenario 3: API-heavy users (constant aggressive load)
    api_heavy_users: {
      executor: "constant-vus",
      exec: "apiHeavyScenario",
      vus: 3,
      duration: "10m",
      tags: { scenario_type: "api_heavy" },
    },

    // Scenario 4: Admin users (intermittent load)
    admin_users: {
      executor: "constant-vus",
      exec: "adminScenario",
      vus: 2,
      duration: "10m",
      tags: { scenario_type: "admin" },
    },

    // Scenario 5: Spike test (sudden load increase)
    spike_users: {
      executor: "ramping-vus",
      exec: "authenticatedScenario",
      startVUs: 0,
      startTime: "5m", // Start after 5 minutes
      stages: [
        { duration: "30s", target: 50 }, // Sudden spike
        { duration: "1m", target: 50 }, // Maintain
        { duration: "30s", target: 0 }, // Drop off
      ],
      tags: { scenario_type: "spike" },
    },
  },

  thresholds: {
    ...config.thresholds,
    // Additional thresholds for specific scenarios
    "http_req_duration{scenario_type:browsing}": ["p(95)<300"],
    "http_req_duration{scenario_type:api_heavy}": ["p(95)<600"],
    "http_req_duration{scenario_type:admin}": ["p(95)<800"],
  },

  timeout: config.timeout,
};

export function setup() {
  console.log("=".repeat(60));
  console.log("Advanced Multi-Scenario Load Test");
  console.log("Running multiple user types concurrently");
  console.log(`Target URL: ${config.baseUrl}`);
  console.log("=".repeat(60));
  console.log("Scenarios:");
  console.log("  - Browsing users: 5 VUs constant");
  console.log("  - Authenticated users: 0-20 VUs ramping");
  console.log("  - API heavy users: 3 VUs constant");
  console.log("  - Admin users: 2 VUs constant");
  console.log("  - Spike test: 0-50 VUs at 5min mark");
  console.log("=".repeat(60));

  return { startTime: new Date().toISOString() };
}

// Scenario executor functions
export function browsingScenario() {
  browsingUserFlow();
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
}

export function authenticatedScenario() {
  authenticatedUserFlow();
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
}

export function apiHeavyScenario() {
  apiHeavyUserFlow();
  sleep(1); // Shorter sleep for API-heavy users
}

export function adminScenario() {
  adminUserFlow();
  helpers.randomSleep(
    config.sleepDuration.min * 2,
    config.sleepDuration.max * 2,
  );
}

export function teardown(data) {
  console.log("=".repeat(60));
  console.log("Multi-Scenario Load Test Completed");
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
}
