# k6 Load Testing Suite - Summary

## 📁 What Was Created

A complete, production-ready k6 load testing suite with the following structure:

```
k6-tests/
├── README.md                    # Complete documentation
├── QUICK_REFERENCE.md          # Quick command reference
├── .env.example                # Environment configuration template
├── config.js                   # Test configuration and scenarios
├── load-test.js                # Main load test (recommended)
├── focused-test.js             # Single scenario test
├── multi-scenario-test.js      # Advanced multi-scenario test
├── run-tests.sh               # Interactive test runner script ⭐
├── monitor-db.sh              # Database monitoring script
├── utils/
│   └── helpers.js             # Reusable helper functions
└── scenarios/
    ├── browsing.js            # Anonymous user browsing
    ├── authenticated.js       # Logged-in user actions
    ├── api-heavy.js          # API-intensive operations
    └── admin.js              # Admin user operations
```

## 🎯 Quick Start

### 1. Install k6

```bash
# Linux
sudo apt-get install k6

# macOS
brew install k6
```

### 2. Start Your Application

```bash
npm start
# Should run at http://localhost:3002
```

### 3. Create Test Users

You need test users in your database:

- Regular user: testuser@example.com / Test@123
- Admin user: admin@example.com / Admin@123

Register these through your app or insert directly into database.

### 4. Run Your First Test

```bash
cd k6-tests

# Option A: Use the interactive menu
./run-tests.sh

# Option B: Run directly
k6 run -e SCENARIO=smoke load-test.js
```

## 📊 Test Scenarios Available

### Pre-configured Scenarios (in config.js)

1. **smoke** - Quick verification (2 VUs, 30s)
2. **load** - Normal load (10-20 VUs, 16m)
3. **stress** - Find limits (up to 100 VUs, 24m)
4. **spike** - Sudden load (200 VUs spike)
5. **soak** - Sustained load (30 VUs, 30m)

### User Behavior Scenarios

1. **browsing** - Anonymous users visiting pages
2. **authenticated** - Logged-in users performing actions
3. **api-heavy** - Power users making many API calls
4. **admin** - Admin users accessing admin features

## 🚀 Common Commands

```bash
# Quick smoke test (recommended first test)
k6 run -e SCENARIO=smoke load-test.js

# Standard load test
k6 run -e SCENARIO=load load-test.js

# Focus on authenticated users only
k6 run -e TEST_TYPE=authenticated -e VUS=10 -e DURATION=5m focused-test.js

# Advanced mixed scenarios
k6 run multi-scenario-test.js

# With custom URL
k6 run -e BASE_URL=http://staging.example.com load-test.js
```

## 🔧 What Each File Does

### Main Test Scripts

- **load-test.js** ⭐ - Best for most testing. Mixes all user types (20% browsing, 50% authenticated, 20% API-heavy, 10% admin)
- **focused-test.js** - Test one specific user journey at a time
- **multi-scenario-test.js** - Advanced: runs multiple scenarios concurrently with different profiles

### Configuration

- **config.js** - All settings in one place:
  - Base URL
  - Test credentials
  - Performance thresholds
  - Scenario definitions
  - Sleep durations

### Helper Scripts

- **run-tests.sh** ⭐ - Interactive menu to run tests easily. Just run `./run-tests.sh`
- **monitor-db.sh** - Run in separate terminal to watch database performance during tests

### Utilities

- **utils/helpers.js** - Reusable functions for:
  - HTTP requests with error handling
  - Authentication (token extraction, login)
  - Random data generation
  - Response validation
  - Custom metrics

### Scenarios

Each scenario file contains a specific user journey:

- **browsing.js** - Homepage → Login page → Register page
- **authenticated.js** - Login → Dashboard → Profile → Family → Donations → Logout
- **api-heavy.js** - Rapid API calls to stress database
- **admin.js** - Admin login → Admin dashboard → Admin features

## 📈 Understanding Results

After a test runs, you'll see:

```
checks.........................: 99.00% ✓ 990   ✗ 10
http_req_duration..............: avg=150ms  p(95)=400ms
http_req_failed................: 0.50%  ✗ 5    ✓ 995
http_reqs......................: 1000   10/s
```

**Key metrics:**

- `checks` - % of validations that passed (aim for >95%)
- `http_req_duration` - Response times (p95 should be <500ms)
- `http_req_failed` - Error rate (should be <1%)
- `http_reqs` - Requests per second (throughput)

## ⚙️ Customization

### Change Test Duration/Load

Edit `config.js`:

```javascript
load: {
    stages: [
        { duration: '2m', target: 10 },   // Ramp to 10 VUs
        { duration: '5m', target: 10 },   // Stay at 10
        { duration: '2m', target: 0 },    // Ramp down
    ],
}
```

### Change Performance Thresholds

Edit `config.js`:

```javascript
thresholds: {
    http_req_duration: ['p(95)<500'],        // 95% under 500ms
    http_req_failed: ['rate<0.01'],          // <1% errors
}
```

### Add New User Scenario

1. Create new file in `scenarios/`
2. Export a function with your user flow
3. Import in `load-test.js`
4. Add to the distribution logic

### Test Different Endpoints

Edit scenario files to add your endpoints:

```javascript
const response = helpers.makeGetRequest(
  `${baseUrl}/your-endpoint`,
  authParams,
  "Your Endpoint Name",
);
```

## 🔍 Monitoring During Tests

### Watch Application Logs

```bash
tail -f logs/app.log
```

### Monitor Database (separate terminal)

```bash
cd k6-tests
./monitor-db.sh 5    # Refresh every 5 seconds
```

### System Resources

```bash
htop  # or top
```

### Network Connections

```bash
netstat -an | grep :3002 | wc -l
```

## ⚠️ Important Notes

1. **Never run load tests against production** without proper planning
2. **Start small** - always run smoke test first
3. **Adjust test users** - update credentials in config.js
4. **Monitor database** - watch for connection pool exhaustion
5. **Check thresholds** - they define pass/fail criteria
6. **Realistic data** - use actual user patterns in tests

## 🎓 Recommended Test Workflow

1. **Development**: Run smoke tests before commits

   ```bash
   k6 run -e SCENARIO=smoke load-test.js
   ```

2. **Pre-deployment**: Run load tests in staging

   ```bash
   k6 run -e SCENARIO=load load-test.js
   ```

3. **Capacity planning**: Run stress tests to find limits

   ```bash
   k6 run -e SCENARIO=stress load-test.js
   ```

4. **Memory leak detection**: Run soak tests
   ```bash
   k6 run -e SCENARIO=soak load-test.js
   ```

## 📚 Documentation

- **README.md** - Complete documentation with troubleshooting
- **QUICK_REFERENCE.md** - Quick command reference
- **This file** - Overview and summary

## 🐛 Troubleshooting

**Tests fail immediately?**

- Check if app is running: `curl http://localhost:3002/`
- Verify port in config.js

**Login failures?**

- Verify test users exist in database
- Check credentials in config.js
- Test login manually first

**High error rates?**

- Check database connection pool size
- Monitor database during test
- Look for slow queries

**Need more help?**

- See README.md troubleshooting section
- Check k6 docs: https://k6.io/docs/

## 🎉 You're Ready!

Start with the interactive runner:

```bash
cd k6-tests
./run-tests.sh
```

Or run a quick smoke test:

```bash
cd k6-tests
k6 run -e SCENARIO=smoke load-test.js
```

Happy load testing! 🚀
