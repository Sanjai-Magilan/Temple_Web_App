const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const compression = require("compression");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const passport = require("passport");
const logger = require("./utils/logger");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "temple-app-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// Initialize Passport
require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

// Flash messages middleware
app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  next();
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Authentication middleware (optional - makes user available if logged in)
const authMiddleware = require("./middleware/authMiddleware");
app.use(authMiddleware.optionalAuth);

// Routes
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const donationRoutes = require("./routes/donationRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const familyRoutes = require("./routes/familyRoutes");
const profileRoutes = require("./routes/profileRoutes");

// Public routes
app.use("/", indexRoutes);
app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", donationRoutes);
app.use("/", bookingRoutes);
app.use("/payment", paymentRoutes);
app.use("/family", familyRoutes);
app.use(profileRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render("errors/404", {
    title: "Page Not Found",
    message: "The page you are looking for does not exist.",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render("errors/500", {
    title: "Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
