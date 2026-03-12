# k6 Load Testing Suite

Comprehensive load testing suite for the Temple Web Application using [k6](https://k6.io/).

## 📋 Overview

This test suite simulates realistic user behavior patterns to test:

- **Authentication performance** (login, sessions)
- **Database-heavy operations** (queries, connections)
- **Concurrent user scenarios**
- **System bottlenecks** (CPU, memory, DB pool limits)
- **API response times and throughput**

## 🏗️ Project Structure

```
k6-tests/
├── config.js                    # Test configuration and scenarios
├── load-test.js                 # Main load test (mixed scenarios)
├── focused-test.js              # Single scenario test
├── multi-scenario-test.js       # Advanced multi-scenario test
├── utils/
│   └── helpers.js              # Helper functions and utilities
└── scenarios/
    ├── browsing.js             # Anonymous user browsing
    ├── authenticated.js        # Logged-in user actions
    ├── api-heavy.js           # API-intensive operations
    └── admin.js               # Admin user operations
```

## 🚀 Prerequisites

### 1. Install k6

**Linux:**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS:**

```bash
brew install k6
```

**Windows:**

```bash
choco install k6
```

**Or use Docker:**

```bash
docker pull grafana/k6:latest
```

### 2. Prepare Your Application

1. **Start your application:**

   ```bash
   npm start
   # Application should be running at http://localhost:3002
   ```

2. **Setup test users:**

   ```bash
   cd k6-tests
   node setup-test-users.js
   ```

   This script will:
   - Register test users (testuser@example.com and admin@example.com)
   - Verify their email addresses
   - Set appropriate roles (user/admin)

   **Manual Setup (Alternative):**
   If the script doesn't work, create test users manually:

   ```sql
   -- Test user (regular user)
   INSERT INTO users (email, password, role, email_verified)
   VALUES ('testuser@example.com', '<hashed_password>', 'user', TRUE);

   -- Admin user
   INSERT INTO users (email, password, role, email_verified)
   VALUES ('admin@example.com', '<hashed_password>', 'admin', TRUE);
   ```

   Or register through your application and manually verify emails.

3. **Verify credentials** in `config.js` match your setup:
   ```javascript
   testUsers: {
       user: {
           email: 'testuser@example.com',
           password: 'Test@123',
       },
       admin: {
           email: 'admin@example.com',
           password: 'Admin@123',
       }
   }
   ```

## 🧪 Running Tests

### Quick Start (Smoke Test)

Test with minimal load to verify everything works:

```bash
cd k6-tests
k6 run -e SCENARIO=smoke load-test.js
```

### Standard Load Test

Simulate normal expected load:

```bash
k6 run -e SCENARIO=load load-test.js
```

### Available Test Scripts

#### 1. **load-test.js** - Main Load Test (Recommended)

Mixed user scenarios with configurable load profiles:

```bash
# Smoke test (2 VUs, 30s)
k6 run -e SCENARIO=smoke load-test.js

# Load test (ramps to 20 VUs, 16 minutes)
k6 run -e SCENARIO=load load-test.js

# Stress test (ramps to 100 VUs, 24 minutes)
k6 run -e SCENARIO=stress load-test.js

# Spike test (sudden spike to 200 VUs)
k6 run -e SCENARIO=spike load-test.js

# Soak test (30 VUs for 30 minutes)
k6 run -e SCENARIO=soak load-test.js
```

#### 2. **focused-test.js** - Single Scenario Test

Test a specific user journey:

```bash
# Test only browsing users
k6 run -e TEST_TYPE=browsing -e VUS=5 -e DURATION=5m focused-test.js

# Test only authenticated users
k6 run -e TEST_TYPE=authenticated -e VUS=10 -e DURATION=5m focused-test.js

# Test API-heavy operations
k6 run -e TEST_TYPE=api-heavy -e VUS=5 -e DURATION=5m focused-test.js

# Test admin operations
k6 run -e TEST_TYPE=admin -e VUS=2 -e DURATION=5m focused-test.js
```

#### 3. **multi-scenario-test.js** - Advanced Multi-Scenario

Run multiple scenarios concurrently:

```bash
k6 run multi-scenario-test.js
```

This runs:

- 5 browsing users (constant)
- 10-20 authenticated users (ramping)
- 3 API-heavy users (constant)
- 2 admin users (constant)
- 50-user spike at 5-minute mark

## ⚙️ Configuration

### Environment Variables

Override default settings with environment variables:

```bash
# Change target URL
k6 run -e BASE_URL=http://staging.example.com load-test.js

# Change test credentials
k6 run -e TEST_USER_EMAIL=user@test.com -e TEST_USER_PASSWORD=pass123 load-test.js

# Combine multiple settings
k6 run -e BASE_URL=http://localhost:3002 \
       -e SCENARIO=stress \
       -e TEST_USER_EMAIL=test@example.com \
       load-test.js
```

### Modifying Test Scenarios

Edit `config.js` to adjust:

- Number of virtual users
- Ramp-up/ramp-down durations
- Think times between actions
- Performance thresholds
- Test scenarios

Example - modify load test:

```javascript
load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '2m', target: 10 },   // Your custom stages
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
    ],
}
```

## 📊 Understanding Results

### Key Metrics

After running a test, you'll see:

```
checks.........................: 98.50%  ✓ 1970      ✗ 30
data_received..................: 8.2 MB  41 kB/s
data_sent......................: 1.1 MB  5.5 kB/s
http_req_blocked...............: avg=1.2ms    min=1µs    med=3µs    max=300ms  p(95)=5ms    p(99)=20ms
http_req_connecting............: avg=600µs    min=0s     med=0s     max=100ms  p(95)=2ms    p(99)=10ms
http_req_duration..............: avg=150ms    min=10ms   med=120ms  max=2s     p(95)=400ms  p(99)=800ms
  { expected_response:true }...: avg=145ms    min=10ms   med=118ms  max=1.5s   p(95)=380ms  p(99)=750ms
http_req_failed................: 0.50%   ✗ 10        ✓ 1990
http_req_receiving.............: avg=500µs    min=50µs   med=400µs  max=50ms   p(95)=2ms    p(99)=5ms
http_req_sending...............: avg=50µs     min=10µs   med=40µs   max=5ms    p(95)=150µs  p(99)=500µs
http_req_tls_handshaking.......: avg=0s       min=0s     med=0s     max=0s     p(95)=0s     p(99)=0s
http_req_waiting...............: avg=149.5ms  min=10ms   med=119ms  max=2s     p(95)=398ms  p(99)=795ms
http_reqs......................: 2000    10/s
iteration_duration.............: avg=5.2s     min=3s     med=5s     max=8s     p(95)=7s     p(99)=7.5s
iterations.....................: 400     2/s
vus............................: 10      min=0       max=20
vus_max........................: 20      min=20      max=20
```

### What to Look For

**✅ Good Signs:**

- ✓ `http_req_failed` < 1% (low error rate)
- ✓ `http_req_duration p(95)` < 500ms (fast responses)
- ✓ `checks` > 95% (most validations pass)

**⚠️ Warning Signs:**

- ⚠️ `http_req_failed` > 1% (errors increasing)
- ⚠️ `http_req_duration p(95)` > 1s (slow responses)
- ⚠️ Increasing response times as VUs increase

**❌ Critical Issues:**

- ❌ `http_req_failed` > 5% (high error rate)
- ❌ Response times > 3s
- ❌ `checks` < 80% (many validations failing)
- ❌ Database connection errors
- ❌ Timeouts

### Threshold Failures

If thresholds fail, you'll see:

```
✗ http_req_duration...........: avg=1.2s  p(95)=2.5s
    ✗ p(95)<500 - threshold failed
```

This means the test **failed** its performance criteria.

## 🔍 Monitoring During Tests

### Real-time Monitoring

While test runs, watch your application:

**1. Monitor Application Logs:**

```bash
tail -f logs/app.log
```

**2. Monitor Database:**

```bash
# MySQL/MariaDB
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
mysql -u root -p -e "SHOW STATUS LIKE 'Max_used_connections';"

# Check slow queries
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

**3. Monitor System Resources:**

```bash
# CPU and Memory
htop

# Or
top

# Connection count
netstat -an | grep :3002 | wc -l

# Check Node.js process
ps aux | grep node
```

### Docker Monitoring (if using Docker)

```bash
# Container stats
docker stats

# Container logs
docker logs -f temple_web_app
```

## 🐛 Troubleshooting

### Issue: Tests Fail Immediately

**Problem:** Connection refused or 404 errors

**Solution:**

```bash
# 1. Verify app is running
curl http://localhost:3002/

# 2. Check correct port in config.js
# 3. Ensure no firewall blocking
```

### Issue: All Login Requests Fail

**Problem:** Authentication errors

**Solution:**

```bash
# 1. Verify test user exists and credentials are correct
# 2. Check login endpoint: POST /login
# 3. Verify password hashing matches
# 4. Check response format in helpers.js extractAuthToken()
```

### Issue: High Error Rate (> 5%)

**Problem:** Application overloaded

**Solution:**

```bash
# 1. Check database connection pool size
# 2. Monitor database query performance
# 3. Check for memory leaks
# 4. Verify CPU isn't saturated
# 5. Check for N+1 query problems
```

### Issue: Slow Response Times

**Problem:** Performance bottleneck

**Solution:**

```bash
# 1. Enable query logging to find slow queries
# 2. Add database indexes
# 3. Implement caching (Redis)
# 4. Optimize database queries
# 5. Check for blocking operations
# 6. Increase database connection pool
```

### Issue: Database Connection Errors

**Problem:** Connection pool exhausted

**Solution:**

```javascript
// In config/database.js, increase pool size:
{
  connectionLimit: 20, // Increase this
  queueLimit: 0,
  waitForConnections: true
}
```

## 📈 Advanced Usage

### Generate HTML Report

```bash
k6 run --out json=results.json load-test.js
```

Then use k6's HTML reporter or integrate with Grafana.

### Run with Docker

```bash
docker run --rm -i \
  -v $(pwd):/k6-tests \
  grafana/k6:latest \
  run /k6-tests/load-test.js
```

### Integrate with CI/CD

```yaml
# .github/workflows/load-test.yml
name: Load Test
on: [push]
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start app
        run: npm start &
      - name: Run k6 smoke test
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
          k6 run -e SCENARIO=smoke k6-tests/load-test.js
```

## 🎯 Test Strategy Recommendations

### Development

- Run **smoke tests** before commits
- Keep VUs low (2-5)
- Duration: 30s - 1m

### Staging

- Run **load tests** before deployment
- Simulate expected production load
- Duration: 10-20m

### Pre-Production

- Run **stress tests** to find limits
- Run **spike tests** to test auto-scaling
- Duration: 20-30m

### Production Monitoring

- Run **soak tests** periodically
- Test sustained load over time
- Duration: 30m - 2h

## 📚 Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)

## 🤝 Contributing

To add new scenarios:

1. Create new scenario file in `scenarios/`
2. Import in main test file
3. Add to scenario distribution logic
4. Update this README

## 📄 License

Same as main application.

## 💡 Tips

- Start small with smoke tests
- Gradually increase load
- Monitor your application during tests
- Set realistic thresholds
- Test one thing at a time when debugging
- Always run tests in a non-production environment first
- Keep test data separate from real user data

---

**Need Help?** Check the troubleshooting section or review k6 documentation.

**Happy Load Testing! 🚀**
