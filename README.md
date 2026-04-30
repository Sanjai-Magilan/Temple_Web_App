# Temple Management Web Application

Production web application for temple operations, including devotee authentication, family management, donations, hall and pooja bookings, payment processing, receipt generation, and admin workflows.

This README is written as a handover guide for a new engineering/operations team.

## 1) Product Summary

### Core Capabilities

- User registration and login (email/password + Google OAuth)
- OTP email verification for new registrations
- Role-based access (`user`, `admin`)
- Family profile and member management
- Donation management and payment tracking
- Hall booking and pooja booking workflows
- Razorpay order creation, payment verification, and webhook handling
- Receipt JSON generation and on-demand PDF download
- Admin booking/family/payment management flows

### Runtime Stack

- Node.js + Express
- MySQL (`mysql2/promise`)
- EJS templates + Bootstrap-based frontend assets
- Passport session auth + JWT helper utilities
- Razorpay integration
- Jest test suite
- Docker, Jenkins, and Kubernetes manifests

## 2) Repository Structure

```text
Temple_Web_App/
|-- app.js                      # Express bootstrap and middleware wiring
|-- package.json                # Scripts and dependencies
|-- config/                     # DB, auth, and payment configuration
|-- controllers/                # Request handlers (user + admin)
|-- models/                     # DB query layer
|-- routes/                     # Route groups (public/user/admin)
|-- middleware/                 # Auth, upload, validation middleware
|-- views/                      # EJS pages and partials
|-- public/                     # CSS/JS/assets
|-- utils/                      # Logger, mailer, receipt, cache, JWT utilities
|-- database/
|   |-- schema.sql              # Base schema
|   `-- migrations/             # Incremental SQL migrations
|-- tests/                      # Jest tests
|-- Dockerfile
|-- docker-compose.yml
|-- Jenkinsfile
`-- k8s/                        # Kubernetes manifests
```

## 3) Prerequisites

- Node.js 18+ recommended (minimum supported in `package.json` is 14)
- npm 6+
- MySQL 8.x (5.7 compatible schema design, but current dev infra uses 8)
- Razorpay test/live account (for payment flows)
- SMTP credentials (Gmail app password currently assumed)

## 4) Local Development Setup

1. Install dependencies:

```bash
npm install
```

2. Create/update `.env` in project root.

3. Initialize database:

```bash
mysql -u <user> -p -e "CREATE DATABASE IF NOT EXISTS temple_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u <user> -p temple_db < database/schema.sql
```

4. Apply SQL migrations from `database/migrations/` in order (if not already included in your DB snapshot).

5. Run the app:

```bash
npm run dev
```

Production run:

```bash
npm start
```

## 5) Environment Variables

Use this as your baseline `.env` contract.

```env
# App
NODE_ENV=development
PORT=3002
SESSION_SECRET=replace_with_secure_random_value

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=temple_db

# JWT
JWT_SECRET=replace_with_secure_random_value
JWT_EXPIRES_IN=1d

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3002/google/callback

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Email (OTP / notifications)
EMAIL_USER=
EMAIL_PASS=

# Temple details used in receipts/templates
TEMPLE_NAME=
TEMPLE_ADDRESS=
TEMPLE_PHONE=
TEMPLE_EMAIL=

# Optional receipt rendering tuning
RECEIPT_PDF_MAX_IDLE_PAGES=2
```

Notes:

- App default in code is `PORT=3000` if `PORT` is not set.
- Docker and k8s manifests currently expose/use container port `3002`.
- Keep `.env` out of version control and rotate all secrets during handover.

## 6) Available Scripts

```bash
npm start      # Start app with Node
npm run dev    # Start app with nodemon
npm test       # Run Jest suite with NODE_ENV=test
```

## 7) Route and Module Overview

High-level route groups:

- `/` public pages and landing
- Auth: login, register, OTP verify/resend, logout, Google OAuth
- `/dashboard` user/admin dashboard
- `/donations` donation pages and flows
- `/bookings/*` hall and pooja booking flows
- `/payment/*` Razorpay order creation, verify, webhook
- `/family/*` family-member operations
- `/admin/*` admin booking/family/payment management

Detailed mapping:

- `README/ROUTES_SUMMARY.md`

## 8) Payment and Receipt Workflow

### Razorpay

- Order creation endpoints per payment type
- Signature verification for client callback and webhook
- Idempotency checks in payment handling
- Payment status persisted in MySQL

Reference:

- `README/RAZORPAY_INTEGRATION.md`

### Receipts

- Receipt JSON stored in booking/donation records
- PDF generated on demand (EJS + Puppeteer)
- Access control enforced (admin or owning user)

Reference:

- `README/RECEIPT_WORKFLOW.MD`

## 9) OTP Authentication

- Registration sends a 6-digit OTP by email
- OTP verification required before login
- Resend cooldown and OTP expiry controls are implemented

Reference:

- `README/OTP_AUTHENTICATION_GUIDE.md`

## 10) Testing Strategy

Jest tests live in `tests/` and cover controllers and key utilities.

Run:

```bash
npm test
```

Before release, validate:

- Auth and OTP flow
- Donation, hall booking, and pooja booking happy paths
- Payment verify + webhook behavior
- Receipt download permissions
- Admin operations and route protection

## 11) Container and Deployment

### Docker (single host)

Build and run with compose:

```bash
docker compose up --build -d
```

Current compose behavior:

- App container `temple_app`
- MySQL container `temple_mysql`
- App published on host `3002`
- MySQL published on host `3307`

### Kubernetes

Manifest location: `k8s/`

- `deployment.yaml` (app)
- `service.yaml` (app service/nodeport)
- `mysql-deployment.yaml` (mysql)
- `mysql-service.yaml` (mysql service)

Expected secrets:

- `temple-secret` for app secrets/env
- `mysql-secret` for MySQL credentials

### CI/CD (Jenkins)

`Jenkinsfile` pipeline stages:

1. Install dependencies + run tests/lint fallback
2. Build Docker image
3. Docker Hub login
4. Push versioned + latest tags
5. Cleanup old images
6. Apply Kubernetes manifests

Default image repo in pipeline: `sanjaimagilan/temple_app`

## 12) Logging and Diagnostics

- HTTP request logs via `morgan`
- App-level logs via Winston utility in `utils/logger.js`
- Runtime log folder exists at `logs/`
- 404 and 500 EJS error pages are configured

## 13) Security Notes for Handover

- Rotate all credentials immediately (DB, JWT, session secret, OAuth, Razorpay, SMTP).
- Ensure `NODE_ENV=production` in production.
- Enable TLS termination at ingress/proxy layer.
- Verify webhook secret configuration before enabling live payments.
- Review session/cookie security settings for production domain and HTTPS.
- Revisit currently commented `helmet` usage in `app.js` and enable after compatibility testing.

## 14) Operational Runbook (Quick)

### Health Checks

- App responds on configured `PORT`
- DB connectivity succeeds on startup
- Payment webhook endpoint reachable from Razorpay

### Common Failure Points

- Wrong DB host/credentials
- Missing Razorpay keys or webhook secret
- SMTP credentials invalid (OTP emails fail)
- Google callback URL mismatch with OAuth app settings
- Missing Puppeteer runtime dependencies in restricted environments

## 15) Handover Checklist

- [ ] `.env` prepared for target environment
- [ ] Database schema + migrations applied
- [ ] Admin seed account validated
- [ ] Razorpay test transaction executed end-to-end
- [ ] OTP email flow validated
- [ ] Receipt PDF generation validated
- [ ] CI pipeline credentials updated (Docker/K8s)
- [ ] Kubernetes secrets created/rotated
- [ ] Team received access to logs/monitoring
- [ ] Team reviewed additional docs in `README/`

## 16) Additional Documentation

- `README/ROUTES_SUMMARY.md`
- `README/OTP_AUTHENTICATION_GUIDE.md`
- `README/RAZORPAY_INTEGRATION.md`
- `README/RECEIPT_WORKFLOW.MD`
- `database/README.md`
- `CHANGE_LOG.md`

## License

ISC
