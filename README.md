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

## Features (To be implemented)

- [ ] User Authentication (JWT)
- [ ] Role-based Access Control
- [ ] Payment Integration (Razorpay)
- [ ] Temple Management Modules
- [ ] Admin Dashboard
- [ ] Mobile-responsive UI

## License

ISC

