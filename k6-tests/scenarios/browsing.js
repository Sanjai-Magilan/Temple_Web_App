/**
 * Browsing User Scenario
 *
 * Simulates a user browsing the website without authentication.
 * This scenario represents anonymous visitors exploring the site.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { config } from "../config.js";
import * as helpers from "../utils/helpers.js";

/**
 * Execute browsing user flow
 * Simulates a user visiting various public pages
 */
export function browsingUserFlow() {
  const baseUrl = config.baseUrl;

  // Visit homepage
  const homeResponse = helpers.makeGetRequest(
    `${baseUrl}/`,
    { tags: { name: "Homepage" } },
    "Homepage",
  );

  check(homeResponse, {
    "homepage loaded": (r) => r.status === 200,
    "homepage has content": (r) => r.body.length > 0,
  });

  // Think time - user reads the homepage
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);

  // Visit login page (but don't log in)
  const loginPageResponse = helpers.makeGetRequest(
    `${baseUrl}/login`,
    { tags: { name: "Login Page" } },
    "Login Page",
  );

  check(loginPageResponse, {
    "login page loaded": (r) => r.status === 200,
  });

  // Think time
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);

  // Visit register page
  const registerPageResponse = helpers.makeGetRequest(
    `${baseUrl}/register`,
    { tags: { name: "Register Page" } },
    "Register Page",
  );

  check(registerPageResponse, {
    "register page loaded": (r) => r.status === 200,
  });

  // Think time before leaving
  helpers.randomSleep(config.sleepDuration.min, config.sleepDuration.max);
}

export default browsingUserFlow;
