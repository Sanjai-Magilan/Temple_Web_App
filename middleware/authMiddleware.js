/**
 * Authentication Middleware
 * Verifies JWT tokens and checks user authentication
 */

const jwtUtils = require("../utils/jwt");
const userModel = require("../models/userModel");

/**
 * Verify JWT token from cookie
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).render("errors/401", {
        title: "Unauthorized",
        message: "Please login to access this page.",
      });
    }

    // Verify token
    const decoded = jwtUtils.verifyToken(token);

    // Get user from database
    const user = await userModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      res.clearCookie("token");
      return res.status(401).render("errors/401", {
        title: "Unauthorized",
        message: "Invalid or inactive user account.",
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    };

    next();
  } catch (error) {
    res.clearCookie("token");
    return res.status(401).render("errors/401", {
      title: "Unauthorized",
      message:
        error.message === "Token expired"
          ? "Your session has expired. Please login again."
          : "Invalid authentication token.",
    });
  }
};

/**
 * Check if user has required role
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).render("errors/401", {
        title: "Unauthorized",
        message: "Please login to access this page.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).render("errors/403", {
        title: "Forbidden",
        message: "You do not have permission to access this page.",
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwtUtils.verifyToken(token);
      const user = await userModel.findById(decoded.userId);
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        };
      }
    }
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};
