/**
 * Capacity Analysis Test
 *
 * Purpose: Determine the maximum number of concurrent users the webapp
 *          can handle while maintaining acceptable response times and
 *          a low error rate.
 *
 * Strategy: Gradually ramp up virtual users (VUs) in steps, hold each
 *           step for observation, then continue until the system shows
 *           signs of degradation (high latency / elevated error rate).
 *
 * Run:
 *   k6 run k6-tests/capacity-test.js
 *
 * Override base URL:
 *   k6 run -e BASE_URL=http://localhost:3000 k6-tests/capacity-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3002";

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate("capacity_error_rate");
const homepageTrend = new Trend("homepage_duration", true);
const loginTrend = new Trend("login_page_duration", true);
const dashboardTrend = new Trend("dashboard_duration", true);
const totalRequests = new Counter("total_requests");

// ─── Thresholds (pass/fail criteria) ─────────────────────────────────────────
export const options = {
  // Ramp-up capacity ladder:
  //  10 VUs  → baseline (healthy system)
  //  50 VUs  → light load
  // 100 VUs  → moderate load
  // 150 VUs  → heavy load
  // 200 VUs  → stress level
  // 250 VUs  → high stress
  // 300 VUs  → target ceiling
  //   0 VUs  → cool-down
  stages: [
    { duration: "30s", target: 10 }, // Warm-up: 10 concurrent users
    { duration: "1m", target: 10 }, // Hold: observe baseline
    { duration: "30s", target: 50 }, // Ramp to 50 users
    { duration: "1m", target: 50 }, // Hold: light load
    { duration: "30s", target: 100 }, // Ramp to 100 users
    { duration: "1m", target: 100 }, // Hold: moderate load
    { duration: "30s", target: 150 }, // Ramp to 150 users
    { duration: "1m", target: 150 }, // Hold: heavy load
    { duration: "30s", target: 200 }, // Ramp to 200 users
    { duration: "1m", target: 200 }, // Hold: stress level
    { duration: "30s", target: 250 }, // Ramp to 250 users
    { duration: "1m", target: 250 }, // Hold: high stress
    { duration: "30s", target: 300 }, // Ramp to 300 users
    { duration: "2m", target: 300 }, // Hold: target ceiling
    { duration: "1m", target: 0 }, // Cool-down: ramp down
  ],

  thresholds: {
    // ✅  95 % of ALL requests must complete within 2 s
    http_req_duration: ["p(95)<2000"],
    // ✅  99 % of all requests within 5 s
    "http_req_duration{expected_response:true}": ["p(99)<5000"],
    // ✅  Error rate must stay below 10 %
    capacity_error_rate: ["rate<0.10"],
    // ✅  Homepage p95 < 1.5 s
    homepage_duration: ["p(95)<1500"],
    // ✅  Login page p95 < 1.5 s
    login_page_duration: ["p(95)<1500"],
    // ✅  Dashboard p95 < 2 s (requires auth → heavier)
    dashboard_duration: ["p(95)<2000"],
  },
};

// ─── Setup ────────────────────────────────────────────────────────────────────
export function setup() {
  console.log("=".repeat(65));
  console.log("  TEMPLE WEB APP — CAPACITY ANALYSIS (300 USERS)");
  console.log("=".repeat(65));
  console.log(`  Target URL : ${BASE_URL}`);
  console.log(
    `  Strategy   : Stepped ramp-up  (10 → 50 → 100 → 150 → 200 → 250 → 300 VUs)`,
  );
  console.log(`  Total time : ~15 minutes`);
  console.log("=".repeat(65));

  // Quick availability check
  const res = http.get(`${BASE_URL}/`, { timeout: "10s" });
  if (res.status === 0) {
    console.error(`❌  Cannot reach ${BASE_URL}. Is the server running?`);
  } else {
    console.log(`✅  Server is reachable (HTTP ${res.status})`);
  }
  return { startTime: new Date().toISOString() };
}

// ─── Main Virtual-User Function ───────────────────────────────────────────────
export default function () {
  // Each VU randomly picks one of three user journeys,
  // mirroring real-world mixed traffic patterns.
  const roll = Math.random();

  if (roll < 0.4) {
    // 40 % — Anonymous browser (lightest path)
    anonymousBrowse();
  } else if (roll < 0.75) {
    // 35 % — Authenticated user (normal path)
    authenticatedJourney();
  } else {
    // 25 % — Public info pages (news / index pages)
    publicInfoJourney();
  }
}

// ─── User Journey: Anonymous Browse ──────────────────────────────────────────
function anonymousBrowse() {
  // 1. Homepage
  let res = http.get(`${BASE_URL}/`, {
    tags: { journey: "anonymous", page: "homepage" },
  });
  recordMetric(res, homepageTrend, "Homepage", [
    [
      "homepage status 200 or redirect",
      (r) => r.status === 200 || r.status === 302,
    ],
  ]);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));

  // 2. Login page
  res = http.get(`${BASE_URL}/login`, {
    tags: { journey: "anonymous", page: "login" },
  });
  recordMetric(res, loginTrend, "Login Page", [
    ["login page accessible", (r) => r.status === 200 || r.status === 302],
  ]);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));

  // 3. Register page
  res = http.get(`${BASE_URL}/register`, {
    tags: { journey: "anonymous", page: "register" },
  });
  check(res, {
    "register page accessible": (r) => r.status === 200 || r.status === 302,
  });
  errorRate.add(res.status >= 400 || res.status === 0);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));
}

// ─── User Journey: Authenticated User ────────────────────────────────────────
function authenticatedJourney() {
  // Use a dedicated k6 cookie jar so sessions don't leak between VUs
  const jar = http.cookieJar();

  // 1. Load login page to get any CSRF token / session cookie
  let res = http.get(`${BASE_URL}/login`, {
    jar,
    tags: { journey: "auth", page: "login" },
  });
  recordMetric(res, loginTrend, "Login Page", [
    ["login page loaded", (r) => r.status === 200 || r.status === 302],
  ]);
  totalRequests.add(1);
  sleep(randomBetween(0.5, 1));

  // 2. Submit login credentials
  res = http.post(
    `${BASE_URL}/login`,
    {
      email: __ENV.TEST_EMAIL || "testuser@example.com",
      password: __ENV.TEST_PASSWORD || "Test@123",
    },
    {
      jar,
      redirects: 5,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      tags: { journey: "auth", page: "login-submit" },
    },
  );
  const loginOk =
    res.status === 200 ||
    res.status === 302 ||
    (res.url && res.url.includes("dashboard"));
  check(res, { "login attempt responded": () => loginOk });
  errorRate.add(res.status >= 500); // only server errors count against capacity
  totalRequests.add(1);
  sleep(randomBetween(1, 2));

  // 3. Visit dashboard (may redirect to login if credentials are demo/invalid)
  res = http.get(`${BASE_URL}/dashboard`, {
    jar,
    redirects: 5,
    tags: { journey: "auth", page: "dashboard" },
  });
  recordMetric(res, dashboardTrend, "Dashboard", [
    ["dashboard responded", (r) => r.status === 200 || r.status === 302],
  ]);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));

  // 4. Visit profile page
  res = http.get(`${BASE_URL}/profile`, {
    jar,
    redirects: 5,
    tags: { journey: "auth", page: "profile" },
  });
  check(res, {
    "profile responded": (r) => r.status === 200 || r.status === 302,
  });
  errorRate.add(res.status >= 500);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));
}

// ─── User Journey: Public Info Pages ─────────────────────────────────────────
function publicInfoJourney() {
  // 1. Homepage
  let res = http.get(`${BASE_URL}/`, {
    tags: { journey: "public", page: "homepage" },
  });
  recordMetric(res, homepageTrend, "Homepage", [
    ["homepage ok", (r) => r.status === 200 || r.status === 302],
  ]);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));

  // 2. News/announcements
  res = http.get(`${BASE_URL}/news`, {
    tags: { journey: "public", page: "news" },
  });
  check(res, {
    "news page responded": (r) =>
      r.status === 200 || r.status === 302 || r.status === 404,
  });
  errorRate.add(res.status >= 500);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));

  // 3. Pooja booking info (public-facing)
  res = http.get(`${BASE_URL}/pooja-booking`, {
    tags: { journey: "public", page: "pooja" },
  });
  check(res, {
    "pooja page responded": (r) =>
      r.status === 200 || r.status === 302 || r.status === 404,
  });
  errorRate.add(res.status >= 500);
  totalRequests.add(1);
  sleep(randomBetween(1, 2));
}

// ─── Teardown ─────────────────────────────────────────────────────────────────
export function teardown(data) {
  console.log("\n" + "=".repeat(65));
  console.log("  CAPACITY TEST COMPLETE");
  console.log("=".repeat(65));
  console.log(`  Started : ${data.startTime}`);
  console.log(`  Ended   : ${new Date().toISOString()}`);
  console.log("\n  HOW TO READ THE RESULTS:");
  console.log("  ─────────────────────────────────────────────────────────");
  console.log(
    "  • homepage_duration  / login_page_duration / dashboard_duration",
  );
  console.log(
    "    → p95 shows the worst acceptable response time for 95 % of users.",
  );
  console.log(
    "    → A sudden jump in p95 at a certain VU level marks the capacity limit.",
  );
  console.log("  • capacity_error_rate");
  console.log(
    "    → Should stay < 10 %. Spikes mean the server is overwhelmed.",
  );
  console.log("  • http_req_duration");
  console.log("    → Overall request latency across all journeys.");
  console.log("  • vus (in the metrics table)");
  console.log(
    "    → The VU count when thresholds start failing is your capacity ceiling.",
  );
  console.log("=".repeat(65));
}

// ─── Custom Summary ───────────────────────────────────────────────────────────
export function handleSummary(data) {
  // Pretty-print a capacity verdict alongside the standard k6 summary.
  const metrics = data.metrics;

  const p95All = metrics.http_req_duration?.values?.["p(95)"] ?? "N/A";
  const p99All = metrics.http_req_duration?.values?.["p(99)"] ?? "N/A";
  const errRate = metrics.capacity_error_rate?.values?.rate ?? "N/A";
  const totalReqs = metrics.total_requests?.values?.count ?? "N/A";
  const maxVUs = metrics.vus_max?.values?.max ?? "N/A";
  const p95Home = metrics.homepage_duration?.values?.["p(95)"] ?? "N/A";
  const p95Login = metrics.login_page_duration?.values?.["p(95)"] ?? "N/A";
  const p95Dash = metrics.dashboard_duration?.values?.["p(95)"] ?? "N/A";

  const fmt = (v) => (typeof v === "number" ? `${v.toFixed(0)} ms` : v);
  const pct = (v) => (typeof v === "number" ? `${(v * 100).toFixed(2)} %` : v);

  const verdict =
    typeof errRate === "number" &&
    errRate < 0.1 &&
    typeof p95All === "number" &&
    p95All < 2000
      ? "✅  PASSED — System handled the load within acceptable limits."
      : "⚠️   DEGRADED — Thresholds breached. Check metrics for the VU level where degradation started.";

  const report = `
${"=".repeat(65)}
  TEMPLE WEB APP — CAPACITY ANALYSIS SUMMARY
${"=".repeat(65)}
  Peak concurrent users tested : ${maxVUs} VUs
  Total requests sent          : ${totalReqs}

  RESPONSE TIMES (p95)
  ─────────────────────────────────────────────────────────
  All requests      : ${fmt(p95All)}    (threshold < 2000 ms)
  Homepage          : ${fmt(p95Home)}   (threshold < 1500 ms)
  Login page        : ${fmt(p95Login)}  (threshold < 1500 ms)
  Dashboard         : ${fmt(p95Dash)}   (threshold < 2000 ms)

  RESPONSE TIMES (p99)
  ─────────────────────────────────────────────────────────
  All requests (p99): ${fmt(p99All)}

  ERROR RATE
  ─────────────────────────────────────────────────────────
  Capacity error rate: ${pct(errRate)}  (threshold < 10 %)

  VERDICT
  ─────────────────────────────────────────────────────────
  ${verdict}
${"=".repeat(65)}
`;

  return {
    stdout: report,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function recordMetric(res, trend, name, checks) {
  trend.add(res.timings.duration);
  const checkObj = {};
  for (const [label, fn] of checks) {
    checkObj[label] = fn;
  }
  check(res, checkObj);
  errorRate.add(res.status >= 500 || res.status === 0);
}
