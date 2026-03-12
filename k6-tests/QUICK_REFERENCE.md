# Quick Reference Guide for k6 Load Tests

## One-Line Commands

### Quick Tests (for development)

```bash
# Smoke test - verify everything works
k6 run -e SCENARIO=smoke load-test.js

# Quick 2-minute test with 5 users
k6 run --vus 5 --duration 2m load-test.js
```

### Standard Tests (for staging)

```bash
# Load test - normal expected load
k6 run -e SCENARIO=load load-test.js

# Test specific scenario
k6 run -e TEST_TYPE=authenticated -e VUS=10 -e DURATION=5m focused-test.js
```

### Stress Tests (for capacity planning)

```bash
# Stress test - find the breaking point
k6 run -e SCENARIO=stress load-test.js

# Spike test - sudden load increase
k6 run -e SCENARIO=spike load-test.js

# Soak test - sustained load (30 minutes)
k6 run -e SCENARIO=soak load-test.js
```

### Advanced Tests

```bash
# Multi-scenario with mixed load
k6 run multi-scenario-test.js

# Custom VUs and duration
k6 run --vus 20 --duration 10m load-test.js
```

## Environment Variables

```bash
# Change target URL
k6 run -e BASE_URL=http://staging.example.com load-test.js

# Change test credentials
k6 run -e TEST_USER_EMAIL=user@test.com -e TEST_USER_PASSWORD=pass123 load-test.js

# Combine multiple variables
k6 run -e BASE_URL=http://localhost:3002 \
       -e SCENARIO=load \
       -e TEST_USER_EMAIL=test@example.com \
       load-test.js
```

## Test Types for Focused Tests

```bash
# Browsing only (anonymous users)
k6 run -e TEST_TYPE=browsing focused-test.js

# Authenticated users only
k6 run -e TEST_TYPE=authenticated focused-test.js

# API-heavy operations only
k6 run -e TEST_TYPE=api-heavy focused-test.js

# Admin operations only
k6 run -e TEST_TYPE=admin focused-test.js
```

## Output Options

```bash
# Save results to JSON
k6 run --out json=results.json load-test.js

# Run with specific log level
k6 run --log-output=stdout load-test.js

# Run quietly (only summary)
k6 run --quiet load-test.js
```

## Using Docker

```bash
# Run with Docker
docker run --rm -i \
  --network=host \
  -v $(pwd):/k6-tests \
  grafana/k6:latest \
  run /k6-tests/load-test.js

# With environment variables
docker run --rm -i \
  --network=host \
  -v $(pwd):/k6-tests \
  -e BASE_URL=http://localhost:3002 \
  grafana/k6:latest \
  run -e SCENARIO=smoke /k6-tests/load-test.js
```

## Common Workflows

### Before Committing Code

```bash
cd k6-tests
k6 run -e SCENARIO=smoke load-test.js
# Should complete in < 1 minute
```

### Before Deploying to Staging

```bash
cd k6-tests
k6 run -e SCENARIO=load load-test.js
# Runs for ~16 minutes
```

### Testing New Feature

```bash
cd k6-tests
k6 run -e TEST_TYPE=authenticated -e VUS=10 -e DURATION=5m focused-test.js
```

### Finding Performance Limits

```bash
cd k6-tests
k6 run -e SCENARIO=stress load-test.js
# Watch for when errors start appearing
```

### Checking for Memory Leaks

```bash
cd k6-tests
k6 run -e SCENARIO=soak load-test.js
# Monitor app memory during 30-minute test
```

## Interpreting Results

### Good Results ✅

```
checks.........................: 99.50% ✓ 1990  ✗ 10
http_req_duration..............: avg=120ms  p(95)=350ms  p(99)=600ms
http_req_failed................: 0.50%  ✗ 10   ✓ 1990
http_reqs......................: 2000   20/s
```

### Warning Signs ⚠️

```
checks.........................: 95.00% ✓ 1900  ✗ 100
http_req_duration..............: avg=500ms  p(95)=1.5s  p(99)=3s
http_req_failed................: 5.00%  ✗ 100  ✓ 1900
```

### Critical Issues ❌

```
checks.........................: 80.00% ✓ 1600  ✗ 400
http_req_duration..............: avg=2s     p(95)=5s    p(99)=10s
http_req_failed................: 20.00% ✗ 400  ✓ 1600
```

## Thresholds

Thresholds define pass/fail criteria:

- `http_req_duration`: Response times
- `http_req_failed`: Error rate
- `checks`: Validation pass rate

If any threshold fails, k6 exits with error code 1.

## Quick Troubleshooting

**Tests fail immediately:**

```bash
# Check if app is running
curl http://localhost:3002/
```

**Login failures:**

- Verify test user exists in database
- Check credentials in config.js
- Test login manually

**High error rates:**

- Check database connection pool
- Monitor database during test
- Check application logs

**Slow responses:**

- Enable slow query log
- Check for missing indexes
- Monitor CPU/memory usage

## More Information

See [README.md](README.md) for complete documentation.
