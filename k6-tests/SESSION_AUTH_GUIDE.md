# Session-Based Authentication Guide for k6

## Overview

This guide explains how to properly test Node.js + Express applications that use **session-based authentication** (cookies like `connect.sid`) with k6 load testing.

## Key Concepts

### 1. HTTP 302 Redirects

Express applications often return **HTTP 302 redirects** after successful login:

```
POST /login → 302 Redirect to /dashboard
```

**Important**: Treat `302` as a successful login, not an error!

### 2. Session Cookies

After login, the server sends a session cookie (e.g., `connect.sid`):

```
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly
```

All subsequent authenticated requests **must include this cookie**.

### 3. Cookie Jar Management

k6 provides `http.cookieJar()` to automatically manage cookies:

```javascript
const jar = http.cookieJar();
http.post(url, payload, { jar: jar }); // Stores cookies
http.get(url, { jar: jar }); // Sends stored cookies
```

## Best Practices

### ✅ DO: Use Proper Status Checks

```javascript
// ✅ CORRECT - Accepts 2xx and 3xx
check(response, {
  success: (r) => r.status >= 200 && r.status < 400,
});

// ❌ WRONG - Rejects redirects
check(response, {
  success: (r) => r.status === 200,
});
```

### ✅ DO: Disable Redirects for Login

```javascript
http.post(loginUrl, payload, {
  redirects: 0, // Capture 302 and session cookie
  jar: jar, // Store session cookie
});
```

### ✅ DO: Use Cookie Jar for All Authenticated Requests

```javascript
// Login stores session in jar
const auth = login(email, password);

// All subsequent requests use the same jar
http.get("/dashboard", { jar: auth.jar });
http.get("/profile", { jar: auth.jar });
http.get("/donations", { jar: auth.jar });
```

### ✅ DO: Cache Sessions (Realistic Behavior)

Users don't log in for every action. Cache sessions:

```javascript
let cachedSession = null;
let sessionTimestamp = 0;
const SESSION_DURATION = 300; // 5 minutes

function getSession() {
  const now = Date.now() / 1000;

  if (cachedSession && now - sessionTimestamp < SESSION_DURATION) {
    return cachedSession; // Reuse existing session
  }

  // Create new session
  cachedSession = login(email, password);
  sessionTimestamp = now;
  return cachedSession;
}
```

### ✅ DO: Use group() for Organization

```javascript
import { group } from "k6";

export default function () {
  group("01. Login", () => {
    /* login logic */
  });
  group("02. Dashboard", () => {
    /* dashboard logic */
  });
  group("03. Profile", () => {
    /* profile logic */
  });
}
```

### ✅ DO: Log Failures with Details

```javascript
if (!success) {
  console.error(`❌ Login failed`);
  console.error(`   Status: ${response.status}`);
  console.error(`   Body: ${response.body.substring(0, 200)}`);
  console.error(
    `   Cookies: ${JSON.stringify(Object.keys(response.cookies || {}))}`,
  );
}
```

## Common Mistakes to Avoid

### ❌ DON'T: Reject Redirects as Errors

```javascript
// ❌ WRONG
check(response, {
  "login success": (r) => r.status === 200, // Rejects 302!
});

// ✅ CORRECT
check(response, {
  "login success": (r) => r.status >= 200 && r.status < 400,
});
```

### ❌ DON'T: Manually Manage Cookies

```javascript
// ❌ WRONG - Error-prone manual cookie handling
const cookieValue = extractCookie(response);
http.get(url, {
  headers: { Cookie: `connect.sid=${cookieValue}` },
});

// ✅ CORRECT - Let k6 handle it
const jar = http.cookieJar();
http.post(loginUrl, payload, { jar: jar });
http.get(url, { jar: jar }); // Cookies sent automatically
```

### ❌ DON'T: Login on Every Request

```javascript
// ❌ WRONG - Unrealistic load
export default function() {
  login(); // Login every iteration
  getDashboard();
}

// ✅ CORRECT - Reuse sessions
let session = null;
export default function() {
  if (!session) session = login();
  getDashboard(session);
}
```

## Complete Example

See [examples/session-auth-example.js](examples/session-auth-example.js) for a complete working example.

Quick test:

```bash
cd k6-tests
k6 run examples/session-auth-example.js
```

## Integration with Existing Tests

Your existing k6 tests have been updated with these improvements:

1. **[utils/helpers.js](utils/helpers.js)** - Core authentication functions now use `http.cookieJar()`
2. **[scenarios/authenticated.js](scenarios/authenticated.js)** - Updated with proper status checks
3. **[scenarios/api-heavy.js](scenarios/api-heavy.js)** - Fixed all status checks
4. **[scenarios/admin.js](scenarios/admin.js)** - Updated for session management

### Running Updated Tests

```bash
# Smoke test (quick verification)
k6 run -e SCENARIO=smoke load-test.js

# Load test (standard load)
k6 run -e SCENARIO=load load-test.js

# Improved authenticated flow
k6 run -e TEST_TYPE=authenticated focused-test.js
```

## Troubleshooting

### Login Returns 302 But Tests Fail

**Check**: Are you treating 302 as success?

```javascript
✅ r.status >= 200 && r.status < 400
❌ r.status === 200
```

### Subsequent Requests Redirect to /login

**Check**: Are you using the cookie jar?

```javascript
✅ http.get(url, { jar: authJar })
❌ http.get(url) // No session cookie sent!
```

### High Login Error Rate

**Check**:

1. Are test credentials valid?
2. Is the application running?
3. Check application logs for errors

```bash
# Verify manually
curl -X POST http://localhost:3002/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=testuser@example.com&password=Test@123" \
  -v
```

### Session Expires During Test

**Solution**: Increase cache duration or implement token refresh:

```javascript
const SESSION_DURATION = 600; // 10 minutes instead of 5
```

## Performance Metrics

Good test results should show:

```
✅ checks.........................: 99%+
✅ http_req_duration (p95)........: < 2000ms
✅ http_req_failed................: < 1%
✅ login_errors...................: < 0.1%
```

## Next Steps

1. Run the example: `k6 run examples/session-auth-example.js`
2. Review your application's actual login flow
3. Adjust status code checks if your app uses different codes
4. Monitor session duration and adjust caching accordingly
5. Check application logs during tests to verify behavior

## References

- [k6 Cookie Documentation](https://k6.io/docs/using-k6/cookies/)
- [k6 HTTP Authentication](https://k6.io/docs/examples/http-authentication/)
- [Express Session Documentation](https://expressjs.com/en/resources/middleware/session.html)
