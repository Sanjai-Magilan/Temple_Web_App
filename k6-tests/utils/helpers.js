/**
 * Helper Utilities for k6 Load Tests
 *
 * This module contains reusable helper functions for making HTTP requests,
 * handling authentication, and common test operations.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics to track specific aspects of the test
export const errorRate = new Rate("errors");
export const loginErrorRate = new Rate("login_errors");
export const apiErrorRate = new Rate("api_errors");

/**
 * Generate common HTTP headers
 * @param {string|null} authToken - Optional JWT token for authentication
 * @returns {object} Headers object
 */
export function getHeaders(authToken = null) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "k6-load-test",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  return headers;
}

/**
 * Generate headers for form submissions
 * @param {string|null} authToken - Optional JWT token for authentication
 * @returns {object} Headers object
 */
export function getFormHeaders(authToken = null) {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "text/html,application/json",
    "User-Agent": "k6-load-test",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  return headers;
}

/**
 * Make a GET request with common error handling
 * @param {string} url - URL to request
 * @param {object} params - k6 request parameters
 * @param {string} name - Name for the request metric
 * @returns {object} HTTP response
 */
export function makeGetRequest(url, params = {}, name = "") {
  const requestParams = {
    ...params,
    tags: { ...params.tags, name: name || "GET" },
  };

  const response = http.get(url, requestParams);

  // Track errors (2xx or 3xx are considered success)
  const success = response.status >= 200 && response.status < 400;
  errorRate.add(!success);

  return response;
}

/**
 * Make a POST request with common error handling
 * @param {string} url - URL to request
 * @param {object|string} payload - Request body
 * @param {object} params - k6 request parameters
 * @param {string} name - Name for the request metric
 * @returns {object} HTTP response
 */
export function makePostRequest(url, payload, params = {}, name = "") {
  const requestParams = {
    ...params,
    tags: { ...params.tags, name: name || "POST" },
  };

  const response = http.post(url, payload, requestParams);

  // Track errors
  const success = check(response, {
    "status is 2xx or 3xx": (r) => r.status >= 200 && r.status < 400,
  });

  errorRate.add(!success);

  return response;
}

/**
 * Extract authentication token from login response
 * Supports multiple token formats (JWT in body, cookie, header)
 * @param {object} response - HTTP response from login
 * @returns {string|null} Authentication token or null if not found
 */
export function extractAuthToken(response) {
  // Try to extract from JSON body (JWT token)
  try {
    const body = JSON.parse(response.body);
    if (body.token) {
      return body.token;
    }
    if (body.data && body.data.token) {
      return body.data.token;
    }
  } catch (e) {
    // Not JSON or no token in body
  }

  // Try to extract from cookies
  const cookies = response.cookies;
  if (cookies && cookies.token) {
    return cookies.token[0].value;
  }
  if (cookies && cookies.jwt) {
    return cookies.jwt[0].value;
  }
  if (cookies && cookies.auth_token) {
    return cookies.auth_token[0].value;
  }

  // Try to extract from Authorization header
  const authHeader = response.headers["Authorization"];
  if (authHeader) {
    return authHeader.replace("Bearer ", "");
  }

  return null;
}

/**
 * Extract session cookie from response
 * @param {object} response - HTTP response
 * @returns {string|null} Session cookie string or null
 */
export function extractSessionCookie(response) {
  const cookies = response.cookies;
  if (!cookies) {
    return null;
  }

  // Common session cookie names
  const sessionCookieNames = ["connect.sid", "session", "sessionid", "sid"];

  for (const name of sessionCookieNames) {
    if (cookies[name]) {
      return `${name}=${cookies[name][0].value}`;
    }
  }

  return null;
}

/**
 * Perform login and return authentication credentials
 * @param {string} baseUrl - Base URL of the application
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} Object containing token and/or session cookie
 */
export function performLogin(baseUrl, email, password) {
  const loginUrl = `${baseUrl}/login`;

  // Use form-encoded login for session-based auth
  const formPayload = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  const loginResponse = http.post(loginUrl, formPayload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    tags: { name: "Login" },
    redirects: 0, // Don't follow redirects automatically so we can capture the session cookie
  });

  const loginSuccess = check(loginResponse, {
    "login successful": (r) =>
      r.status === 200 || r.status === 302 || r.status === 303,
    "login response time OK": (r) => r.timings.duration < 1000,
  });

  loginErrorRate.add(!loginSuccess);

  if (!loginSuccess) {
    console.error(`Login failed for ${email}: Status ${loginResponse.status}`);
  }

  // Extract authentication credentials
  const token = extractAuthToken(loginResponse);
  const sessionCookie = extractSessionCookie(loginResponse);

  if (!sessionCookie && loginSuccess) {
    console.warn(`Login succeeded but no session cookie found for ${email}`);
  }

  return {
    token: token,
    sessionCookie: sessionCookie,
    response: loginResponse,
    success: loginSuccess && sessionCookie !== null,
  };
}

/**
 * Create request parameters with authentication
 * @param {object} auth - Authentication object from performLogin
 * @returns {object} Request parameters with auth headers
 */
export function getAuthParams(auth) {
  const params = {
    headers: {},
    redirects: 5, // Follow redirects for authenticated requests
  };

  if (auth.token) {
    params.headers = getHeaders(auth.token);
  }

  if (auth.sessionCookie) {
    // Properly set Cookie header for session-based auth
    params.headers["Cookie"] = auth.sessionCookie;
    params.headers["Accept"] =
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  }

  return params;
}

/**
 * Random sleep between min and max seconds
 * @param {number} min - Minimum sleep duration
 * @param {number} max - Maximum sleep duration
 */
export function randomSleep(min, max) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select random item from array
 * @param {array} array - Array to select from
 * @returns {*} Random item from array
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if response is successful (2xx status)
 * @param {object} response - HTTP response
 * @returns {boolean} True if successful
 */
export function isSuccessful(response) {
  return response.status >= 200 && response.status < 300;
}

/**
 * Check if response is a redirect (3xx status)
 * @param {object} response - HTTP response
 * @returns {boolean} True if redirect
 */
export function isRedirect(response) {
  return response.status >= 300 && response.status < 400;
}

/**
 * Log response details for debugging
 * @param {object} response - HTTP response
 * @param {string} label - Label for the log
 */
export function logResponse(response, label = "Response") {
  console.log(
    `${label}: Status ${response.status}, Duration ${response.timings.duration}ms`,
  );
}

/**
 * Validate response with custom checks
 * @param {object} response - HTTP response
 * @param {object} checks - Object of check functions
 * @returns {boolean} True if all checks pass
 */
export function validateResponse(response, checks) {
  return check(response, checks);
}

export default {
  getHeaders,
  getFormHeaders,
  makeGetRequest,
  makePostRequest,
  extractAuthToken,
  extractSessionCookie,
  performLogin,
  getAuthParams,
  randomSleep,
  randomInt,
  randomItem,
  isSuccessful,
  isRedirect,
  logResponse,
  validateResponse,
  errorRate,
  loginErrorRate,
  apiErrorRate,
};
