# k6 Load Test Architecture

## 📐 Test Suite Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     k6 Load Testing Suite                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                       │
        ▼                      ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  load-test   │      │ focused-test │      │multi-scenario│
│     .js      │      │     .js      │      │    -test.js  │
├──────────────┤      ├──────────────┤      ├──────────────┤
│ Mixed        │      │ Single       │      │ Concurrent   │
│ Scenarios    │      │ Scenario     │      │ Scenarios    │
│              │      │              │      │              │
│ 20% Browsing │      │ Choose One:  │      │ 5 VUs Browse │
│ 50% Auth     │      │ - Browsing   │      │ 10-20 VUs    │
│ 20% API Heavy│      │ - Auth       │      │ Auth Ramping │
│ 10% Admin    │      │ - API Heavy  │      │ 3 VUs API    │
│              │      │ - Admin      │      │ 2 VUs Admin  │
│              │      │              │      │ + Spike Test │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                      │
       └─────────────────────┼──────────────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │   config.js   │
                    ├──────────────┤
                    │ - Base URL    │
                    │ - Credentials │
                    │ - Thresholds  │
                    │ - Scenarios   │
                    │ - Sleep Times │
                    └───────┬───────┘
                            │
            ┌───────────────┼───────────────┐
            │               │                │
            ▼               ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Scenarios  │ │    Utils     │ │   Scripts    │
    ├──────────────┤ ├──────────────┤ ├──────────────┤
    │ browsing.js  │ │ helpers.js   │ │run-tests.sh  │
    │authenticated │ │ - HTTP utils │ │monitor-db.sh │
    │ api-heavy.js │ │ - Auth utils │ └──────────────┘
    │ admin.js     │ │ - Metrics    │
    └──────────────┘ └──────────────┘
```

## 🔄 Test Execution Flow

```
User Runs Test
     │
     ▼
┌─────────────────┐
│ k6 Initializes  │
│ - Loads config  │
│ - Sets up VUs   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  setup()        │
│ - Verify app    │
│ - Log config    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Main Test Loop (each VU)           │
│                                     │
│  1. Select Scenario                 │
│     ├─ 20% → browsingUserFlow()     │
│     ├─ 50% → authenticatedUserFlow()│
│     ├─ 20% → apiHeavyUserFlow()     │
│     └─ 10% → adminUserFlow()        │
│                                     │
│  2. Execute Flow                    │
│     ├─ HTTP Requests                │
│     ├─ Validations (checks)         │
│     ├─ Metrics Collection           │
│     └─ Think Time (sleep)           │
│                                     │
│  3. Repeat Until Duration Ends      │
└────────────────┬────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  teardown()   │
         │ - Final stats │
         │ - Cleanup     │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Generate      │
         │ Summary       │
         │ Report        │
         └───────────────┘
```

## 🎭 User Scenario Flows

### 1. Browsing User Flow (Anonymous)

```
Start
  │
  ├─► GET / (Homepage)
  │   └─► Check: Status 200
  │   └─► Sleep 1-3s
  │
  ├─► GET /login (Login Page)
  │   └─► Check: Status 200
  │   └─► Sleep 1-3s
  │
  ├─► GET /register (Register Page)
  │   └─► Check: Status 200
  │   └─► Sleep 1-3s
  │
End
```

### 2. Authenticated User Flow

```
Start
  │
  ├─► POST /login
  │   └─► Extract Auth Token/Cookie
  │   └─► Check: Login Success
  │   └─► Sleep 2s
  │
  ├─► GET /dashboard [Auth]
  │   └─► Check: Status 200, Not Redirected
  │   └─► Sleep 1-3s
  │
  ├─► GET /profile [Auth]
  │   └─► Check: Status 200
  │   └─► Sleep 1.5s
  │
  ├─► GET /family [Auth]
  │   └─► Check: Status 200
  │   └─► Sleep 1.5s
  │
  ├─► GET /donations [Auth]
  │   └─► Check: Status 200
  │   └─► Sleep 1.5s
  │
  ├─► GET /donations/new [Auth]
  │   └─► Check: Status 200
  │   └─► Sleep 1-3s
  │
  ├─► GET /logout [Auth]
  │   └─► Check: Status 200/302
  │
End
```

### 3. API Heavy User Flow

```
Start
  │
  ├─► POST /login
  │   └─► Extract Auth Token
  │   └─► Sleep 0.5s (minimal)
  │
  ├─► Rapid API Calls (×3)
  │   ├─► GET /dashboard [Auth]
  │   ├─► GET /profile [Auth]
  │   ├─► GET /family [Auth]
  │   └─► GET /donations [Auth]
  │   └─► Sleep 0.3s between each
  │
  ├─► Dashboard Refreshes (×2)
  │   └─► GET /dashboard [Auth]
  │   └─► Sleep 0.5s
  │
  ├─► POST /profile/update [Auth]
  │   └─► Random data
  │   └─► Check: Status 2xx/3xx
  │   └─► Sleep 0.5s
  │
  ├─► Family Checks (×2)
  │   └─► GET /family [Auth]
  │   └─► Sleep 0.3s
  │
End
```

### 4. Admin User Flow

```
Start
  │
  ├─► POST /login (Admin Credentials)
  │   └─► Extract Auth Token
  │   └─► Sleep 2s
  │
  ├─► GET /admin [Auth+Role]
  │   └─► Check: Status 200, Not Redirected
  │   └─► Sleep 1.5s
  │
  ├─► GET /admin/donations [Auth+Role]
  │   └─► Check: Status 200
  │   └─► Sleep 1.5s (DB-heavy query)
  │
  ├─► GET /admin/bookings [Auth+Role]
  │   └─► Check: Status 200/404
  │   └─► Sleep 1.5s
  │
  ├─► GET /admin/payment-history [Auth+Role]
  │   └─► Check: Status 200/404
  │   └─► Sleep 1-3s
  │
End
```

## 🎚️ Load Patterns

### Smoke Test

```
VUs
 2 │████████████████████████
   │
 0 └────────────────────────
   0s                    30s
```

### Load Test

```
VUs
20 │          ████████████████████████
   │      ████                        ████
10 │  ████                                ████
   │██                                        ██
 0 └────────────────────────────────────────────
   0  2m  4m  6m  8m 10m 12m 14m 16m
```

### Stress Test

```
VUs
100│                          ██████████
   │                      ████          ███
 50│          ████████████                  ███
   │      ████                                  ██
 20│  ████                                        ██
   │██                                              █
  0└───────────────────────────────────────────────────
   0  2m  4m  6m  8m 10m 12m 14m 16m 18m 20m 22m 24m
```

### Spike Test

```
VUs
200│          ████████
   │         █        █
 20│  ███████          ██████
   │██                       ██
  0└──────────────────────────────
   0  1m  2m  3m  4m  5m  6m  7m
```

## 🎯 Metric Collection Points

```
Request Lifecycle:
┌──────────────────────────────────────────────┐
│                                              │
│  DNS         Connect      TLS        Send   │
│  Lookup      to Server    Handshake  Request│
│    │            │            │          │    │
│    ▼            ▼            ▼          ▼    │
│  ┌───┐        ┌───┐        ┌───┐     ┌───┐  │
│  │ 1 │───────►│ 2 │───────►│ 3 │────►│ 4 │  │
│  └───┘        └───┘        └───┘     └───┘  │
│    │            │            │          │    │
│    ▼            ▼            ▼          ▼    │
│  Blocked     Connecting  TLS_Handshake Send  │
│  (metric)    (metric)    (metric)   (metric) │
│                                              │
└──────────────────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │  Wait for       │
         │  Response       │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Receive        │
         │  Response       │
         │  (Receiving)    │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Total Duration │
         │  (http_req_     │
         │   duration)     │
         └─────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Run Checks     │
         │  - Status code  │
         │  - Body content │
         │  - Custom logic │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Update Metrics │
         │  - Success rate │
         │  - Error rate   │
         │  - Trends       │
         └─────────────────┘
```

## 🗂️ File Dependencies

```
load-test.js
    ├── import config.js
    │   └── exports: config, getTestOptions
    │
    ├── import utils/helpers.js
    │   └── exports: HTTP utils, Auth utils, Metrics
    │
    └── import scenarios/*.js
        ├── browsing.js
        │   └── uses: helpers, config
        ├── authenticated.js
        │   └── uses: helpers, config
        ├── api-heavy.js
        │   └── uses: helpers, config
        └── admin.js
            └── uses: helpers, config
```

## 🎛️ Configuration Hierarchy

```
Environment Variables (Highest Priority)
    ├── BASE_URL
    ├── TEST_USER_EMAIL
    ├── TEST_USER_PASSWORD
    ├── SCENARIO
    └── ...
        │
        ▼
config.js (Default Values)
    ├── baseUrl: 'http://localhost:3002'
    ├── testUsers: { ... }
    ├── thresholds: { ... }
    ├── scenarios: { ... }
    └── sleepDuration: { ... }
        │
        ▼
Test Scripts (Use Configuration)
    ├── load-test.js
    ├── focused-test.js
    └── multi-scenario-test.js
```

## 📊 Metrics Flow

```
Individual Requests
        │
        ├─► http_req_duration
        ├─► http_req_blocked
        ├─► http_req_connecting
        ├─► http_req_sending
        ├─► http_req_receiving
        ├─► http_req_waiting
        └─► http_req_failed
            │
            ▼
    Custom Metrics
        ├─► errorRate
        ├─► loginErrorRate
        └─► apiErrorRate
            │
            ▼
    Aggregations
        ├─► avg (average)
        ├─► min (minimum)
        ├─► med (median, p50)
        ├─► max (maximum)
        ├─► p(90) (90th percentile)
        ├─► p(95) (95th percentile)
        └─► p(99) (99th percentile)
            │
            ▼
    Threshold Checks
        ├─► Pass → Exit 0
        └─► Fail → Exit 1
            │
            ▼
    Summary Report
        └─► Console Output
```

## 🔧 Helper Functions Organization

```
helpers.js
    │
    ├── HTTP Utilities
    │   ├── getHeaders()
    │   ├── getFormHeaders()
    │   ├── makeGetRequest()
    │   └── makePostRequest()
    │
    ├── Authentication
    │   ├── extractAuthToken()
    │   ├── extractSessionCookie()
    │   ├── performLogin()
    │   └── getAuthParams()
    │
    ├── Utilities
    │   ├── randomSleep()
    │   ├── randomInt()
    │   ├── randomItem()
    │   ├── isSuccessful()
    │   ├── isRedirect()
    │   ├── logResponse()
    │   └── validateResponse()
    │
    └── Metrics
        ├── errorRate
        ├── loginErrorRate
        └── apiErrorRate
```

This architecture provides:

- ✅ Modularity and reusability
- ✅ Easy configuration management
- ✅ Separation of concerns
- ✅ Scalable test scenarios
- ✅ Comprehensive metrics collection
- ✅ Clear execution flow
