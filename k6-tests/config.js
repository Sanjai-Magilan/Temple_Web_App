export const config = {
  // Base URL of the application under test
  // Can be overridden with environment variable: K6_BASE_URL
  baseUrl: __ENV.BASE_URL || "http://localhost:3002",

  // Test credentials for authentication
  testUsers: {
    // Regular test user credentials
    user: {
      email: __ENV.TEST_USER_EMAIL || "testuser@example.com",
      password: __ENV.TEST_USER_PASSWORD || "Test@123",
    },
    // Admin user credentials (for admin tests)
    admin: {
      email: __ENV.TEST_ADMIN_EMAIL || "admin@example.com",
      password: __ENV.TEST_ADMIN_PASSWORD || "Admin@123",
    },
  },

  // Test thresholds - define success criteria
  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ["p(95)<500"],
    // 99% of requests should complete within 1000ms
    "http_req_duration{expected_response:true}": ["p(99)<1000"],
    // Error rate should be less than 10% (adjusted for realistic expectations)
    http_req_failed: ["rate<0.1"],
    // Login duration should be fast
    "http_req_duration{name:Login}": ["p(95)<800"],
    // Dashboard load should be fast
    "http_req_duration{name:Dashboard}": ["p(95)<600"],
    // API calls should be responsive
    "http_req_duration{name:API}": ["p(95)<400"],
  },

  // Sleep durations (think time between actions) in seconds
  sleepDuration: {
    min: 1, // Minimum sleep between actions
    max: 3, // Maximum sleep between actions
    afterLogin: 2, // Think time after login
    betweenActions: 1.5, // Think time between user actions
  },

  // Load test scenarios configuration
  scenarios: {
    // Smoke test - minimal load to verify system works
    smoke: {
      executor: "constant-vus",
      vus: 2,
      duration: "30s",
    },

    // Load test - normal expected load
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 10 }, // Ramp up to 10 users
        { duration: "5m", target: 10 }, // Stay at 10 users
        { duration: "2m", target: 20 }, // Ramp up to 20 users
        { duration: "5m", target: 20 }, // Stay at 20 users
        { duration: "2m", target: 0 }, // Ramp down to 0
      ],
    },

    // Stress test - push beyond normal load
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 20 }, // Ramp up to 20 users
        { duration: "5m", target: 20 }, // Stay at 20
        { duration: "2m", target: 50 }, // Ramp up to 50
        { duration: "5m", target: 50 }, // Stay at 50
        { duration: "2m", target: 100 }, // Ramp up to 100
        { duration: "5m", target: 100 }, // Stay at 100
        { duration: "3m", target: 0 }, // Ramp down
      ],
    },

    // Spike test - sudden load increase
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 }, // Normal load
        { duration: "30s", target: 200 }, // Sudden spike
        { duration: "3m", target: 200 }, // Maintain spike
        { duration: "1m", target: 20 }, // Return to normal
        { duration: "1m", target: 0 }, // Ramp down
      ],
    },

    // Soak test - sustained load over time
    soak: {
      executor: "constant-vus",
      vus: 30,
      duration: "30m",
    },
  },
};

/**
 * Get scenario configuration by name
 * @param {string} scenarioName - Name of the scenario (smoke, load, stress, spike, soak)
 * @returns {object} Scenario configuration
 */
export function getScenarioConfig(scenarioName = "load") {
  const scenario = config.scenarios[scenarioName];
  if (!scenario) {
    console.warn(
      `Scenario "${scenarioName}" not found, using "load" as default`,
    );
    return config.scenarios.load;
  }
  return scenario;
}

/**
 * Get options for k6 test run
 * @param {string} scenarioName - Name of the scenario to run
 * @returns {object} k6 options object
 */
export function getTestOptions(scenarioName = "load") {
  const scenarioConfig = getScenarioConfig(scenarioName);

  return {
    scenarios: {
      default: scenarioConfig,
    },
    thresholds: config.thresholds,
  };
}

export default config;
