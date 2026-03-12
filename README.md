# Temple Management Web Application

A comprehensive Temple (TTD) Management System built with Node.js, Express, MySQL, and EJS.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL
- **View Engine**: EJS
- **Styling**: Bootstrap 5
- **Authentication**: JWT (to be implemented)
- **Payments**: Razorpay (to be implemented)

## Project Structure

```
templeApp/
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── config/               # Configuration files
│   └── database.js       # MySQL connection pool
├── controllers/          # MVC Controllers
│   └── indexController.js
├── models/               # MVC Models (database models)
├── views/                # EJS templates
│   ├── index.ejs
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
├── routes/               # Route definitions
│   └── index.js
├── middleware/           # Custom middleware (to be added)
├── public/              # Static files
│   └── css/
│       └── style.css
└── README.md
```

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:

   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database credentials and other settings

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Or start production server:
   ```bash
   npm start
   ```

## Hostinger Deployment Notes

- Ensure Node.js version is compatible (14+)
- Set `NODE_ENV=production` in production
- Configure database credentials in `.env`
- Use Hostinger's provided MySQL database
- Update `PORT` if required by Hostinger

## Load Testing

This project includes a comprehensive k6 load testing suite for performance testing and benchmarking.

### Quick Start

```bash
# Install k6
sudo apt-get install k6  # Linux
brew install k6          # macOS

# Run interactive test menu
cd k6-tests
./run-tests.sh

# Or use npm scripts
npm run loadtest:smoke   # Quick verification test
npm run loadtest:load    # Standard load test
npm run loadtest:stress  # Stress test
npm run loadtest:menu    # Interactive menu
```

### Documentation

- **[Getting Started](k6-tests/GETTING_STARTED.md)** - 5-minute quick start
- **[Complete Documentation](k6-tests/README.md)** - Full guide
- **[Quick Reference](k6-tests/QUICK_REFERENCE.md)** - Command cheat sheet
- **[Documentation Index](k6-tests/INDEX.md)** - All docs

### Test Scenarios

- **Smoke Test** - Quick verification (2 VUs, 30s)
- **Load Test** - Normal expected load (10-20 VUs, 16m)
- **Stress Test** - Find breaking point (up to 100 VUs, 24m)
- **Spike Test** - Sudden load increase (200 VUs spike)
- **Soak Test** - Sustained load testing (30 VUs, 30m)

See [k6-tests/](k6-tests/) directory for complete testing suite.

## Features (To be implemented)

- [ ] User Authentication (JWT)
- [ ] Role-based Access Control
- [ ] Payment Integration (Razorpay)
- [ ] Temple Management Modules
- [ ] Admin Dashboard
- [ ] Mobile-responsive UI

## License

ISC
