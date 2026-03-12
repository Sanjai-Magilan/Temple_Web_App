/**
 * Focused Load Test Script
 *
 * This script tests specific scenarios independently.
 * Use this when you want to focus on a particular user journey.
 *
 * Run with: k6 run -e TEST_TYPE=authenticated focused-test.js
 */

import { sleep } from "k6";
import { config } from "./config.js";
import * as helpers from "./utils/helpers.js";

// Import scenario functions
import browsingUserFlow from "./scenarios/browsing.js";
import authenticatedUserFlow from "./scenarios/authenticated.js";
import apiHeavyUserFlow from "./scenarios/api-heavy.js";
import adminUserFlow from "./scenarios/admin.js";

// Get test type from environment variable
const TEST_TYPE = __ENV.TEST_TYPE || "authenticated";
const VUS = parseInt(__ENV.VUS) || 10;
const DURATION = __ENV.DURATION || "5m";

// Configure test options
export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: config.thresholds,
  timeout: config.timeout,
};

export function setup() {
  console.log("=".repeat(60));
  console.log(`Focused Test: ${TEST_TYPE}`);
  console.log(`Virtual Users: ${VUS}`);
  console.log(`Duration: ${DURATION}`);
  console.log(`Target URL: ${config.baseUrl}`);
  console.log("=".repeat(60));

  return { testType: TEST_TYPE };
}

export default function (data) {
  // Execute only the specified test type
  switch (data.testType) {
    case "browsing":
      browsingUserFlow();
      break;
    case "authenticated":
      authenticatedUserFlow();
      break;
    case "api-heavy":
      apiHeavyUserFlow();
      break;
    case "admin":
      adminUserFlow();
      break;
    default:
      console.error(`Unknown test type: ${data.testType}`);
      authenticatedUserFlow();
  }

  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
}

export function teardown(data) {
  console.log("=".repeat(60));
  console.log(`Focused Test Completed: ${data.testType}`);
  console.log("=".repeat(60));
}
