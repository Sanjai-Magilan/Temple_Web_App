/**
 * Authentication Controller
 * Handles user registration, login, and logout
 */

const userModel = require("../models/userModel");
const familyModel = require("../models/familyModel");
const jwtUtils = require("../utils/jwt");
// TODO: Configure and import mailer module
// const mailer = require('../utils/mailer');
const crypto = require("crypto");
const mailer = require("../utils/mailer");

/**
 * Show registration page
 */
exports.showRegister = (req, res) => {
  // Redirect if already logged in
  if (req.user) {
    return res.redirect("/");
  }
  res.render("auth/register", {
    title: "Register",
    error: null,
    formData: {},
  });
};

exports.register = async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      first_name,
      last_name,
      family_name,
      address,
      city,
      state,
      pincode,
    } = req.body;

    // Check if email already exists
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      return res.render("auth/register", {
        title: "Register",
        error:
          "Email already registered. Please use a different email or login.",
        formData: {
          email,
          phone,
          first_name,
          last_name,
          family_name,
          address,
          city,
          state,
          pincode,
        },
      });
    }

    // Check if phone already exists
    const phoneExists = await userModel.phoneExists(phone);
    if (phoneExists) {
      return res.render("auth/register", {
        title: "Register",
        error:
          "Phone number already registered. Please use a different phone number or login.",
        formData: {
          email,
          phone,
          first_name,
          last_name,
          family_name,
          address,
          city,
          state,
          pincode,
        },
      });
    }

    // Create user account (email_verified = 0 by default)
    const user = await userModel.create({
      email,
      phone,
      password,
      first_name,
      last_name,
      role: "user",
      is_active: 1,
    });

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await userModel.saveEmailOtp(user.id, otp, expires);

    // Send OTP to email
    try {
      await mailer.sendOTP(user.email, otp);
      console.log(`OTP sent to ${user.email}: ${otp}`); // Temporary logging
    } catch (mailError) {
      console.error("Error sending OTP email:", mailError);
      // Continue anyway - OTP is saved in DB
    }

    // Create family if family_name is provided
    let family = null;
    if (family_name && family_name.trim()) {
      try {
        family = await familyModel.create({
          family_name: family_name.trim(),
          head_user_id: user.id,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
        });
      } catch (familyError) {
        console.error("Error creating family:", familyError);
        // Continue - family creation is optional
      }
    }

    // Redirect to OTP verification page
    req.flash(
      "info",
      "Registration successful! Please verify your email with the OTP sent to you.",
    );
    res.redirect(`/verify-otp?email=${encodeURIComponent(user.email)}`);
  } catch (error) {
    console.error("Registration error:", error);
    res.render("auth/register", {
      title: "Register",
      error: "Registration failed. Please try again. " + error.message,
      formData: req.body,
    });
  }
};

/**
 * Show login page
 */
exports.showLogin = (req, res) => {
  // Redirect if already logged in
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render("auth/login", {
    title: "Login",
    error: null,
    formData: {},
  });
};

/**
 * Handle user login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.render("auth/login", {
        title: "Login",
        error: "Invalid email or password.",
        formData: { email },
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.render("auth/login", {
        title: "Login",
        error:
          "Your account has been deactivated. Please contact administrator.",
        formData: { email },
      });
    }

    //Block login if email not verified
    if (!user.email_verified) {
      return res.render("auth/login", {
        title: "Login",
        error: "Please verify your email using OTP before logging in.",
        formData: { email },
      });
    }

    // Verify password
    const isPasswordValid = await userModel.verifyPassword(
      password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      return res.render("auth/login", {
        title: "Login",
        error: "Invalid email or password.",
        formData: { email },
      });
    }

    // Update last login
    await userModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwtUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set token in httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "strict",
    });

    // Redirect based on role
    const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';
    req.flash ? req.flash('success', 'Login successful!') : null;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Login error:", error);
    res.render("auth/login", {
      title: "Login",
      error: "Login failed. Please try again.",
      formData: req.body,
    });
  }
};

/**
 * Handle user logout
 */
exports.logout = (req, res) => {
  // Clear JWT cookie
  res.clearCookie("token");

  // Logout passport session (for Google OAuth users)
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    // Flash message works because session still exists
    if (req.flash) {
      req.flash("success", "You have been logged out successfully.");
    }
    res.redirect("/login");
  });
};
/**
 * Show OTP verification page
 */
exports.showOTPPage = (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.redirect("/register");
  }
  res.render("auth/verify-otp", {
    email,
    error: null,
    success: null,
    info: null,
  });
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.render("auth/verify-otp", {
        email,
        error: "Email and OTP are required",
      });
    }

    // Use the new verifyEmailOtp method that handles hash comparison
    const user = await userModel.verifyEmailOtp(email, otp);

    if (!user) {
      return res.render("auth/verify-otp", {
        email,
        error:
          "Invalid OTP or OTP has expired. Please try again or request a new one.",
      });
    }

    // Check if already verified
    if (user.email_verified) {
      req.flash("info", "Email already verified. Please login.");
      return res.redirect("/login");
    }

    // Mark email as verified
    await userModel.verifyEmail(user.id);

    req.flash("success", "Email verified successfully! You can now login.");
    res.redirect("/login");
  } catch (err) {
    console.error("OTP verification error:", err);
    res.render("auth/verify-otp", {
      email: req.body.email,
      error: "Verification failed. Please try again later.",
    });
  }
};

/**
 * Resend OTP to user's email
 */
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.render("auth/verify-otp", {
        email,
        error: "Email is required.",
      });
    }

    const user = await userModel.findByEmail(email);

    if (!user) {
      return res.render("auth/verify-otp", {
        email,
        error: "User not found. Please register first.",
      });
    }

    // Check if email is already verified
    if (user.email_verified) {
      req.flash("info", "Your email is already verified. Please login.");
      return res.redirect("/login");
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP
    await userModel.saveEmailOtp(user.id, otp, expires);

    // Send OTP via email
    try {
      await mailer.sendOTP(user.email, otp);
      console.log(`OTP resent to ${user.email}: ${otp}`);
    } catch (mailError) {
      console.error("Error sending email:", mailError);
      // Continue anyway - OTP is saved in DB
    }

    res.render("auth/verify-otp", {
      email,
      success: "New OTP sent to your email. It will expire in 10 minutes.",
      info: null,
      error: null,
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.render("auth/verify-otp", {
      email: req.body.email,
      error: "Failed to resend OTP. Please try again later.",
      success: null,
      info: null,
    });
  }
};

/**
 * Show complete profile page for Google users
 */
exports.showCompleteProfile = (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  if (req.user.phone) {
    return res.redirect("/dashboard");
  }
  res.render("auth/complete-profile", {
    error: null,
    user: req.user,
  });
};
/**
 * Save phone number for Google users
 */
exports.savePhone = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const { phone, family_name, address, city, state, pincode } = req.body;

    if (!phone) {
      return res.render("auth/complete-profile", {
        error: "Phone number is required.",
        user: req.user,
      });
    }

    // Check if phone is already used by another user
    const existingUser = await userModel.findByPhone(phone);
    if (existingUser && existingUser.id !== req.user.id) {
      return res.render("auth/complete-profile", {
        error: "Phone number already in use. Please use a different number.",
        user: req.user,
      });
    }

    // Update user's phone
    await userModel.updateProfile(req.user.id, {
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      phone,
    });

    // Create family if family_name is provided
    if (family_name && family_name.trim()) {
      try {
        await familyModel.create({
          family_name: family_name.trim(),
          head_user_id: req.user.id,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
        });
      } catch (familyError) {
        console.error("Error creating family:", familyError);
        // Continue - family creation is optional
      }
    }

    req.flash("success", "Profile completed successfully!");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Save phone error:", error);
    res.render("auth/complete-profile", {
      error: "Failed to save profile. Please try again.",
      user: req.user,
    });
  }
};
//Handle Google OAuth callback
// ...existing code...
//Handle Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      req.flash("error", "Google login failed. Please try again.");
      return res.redirect("/login");
    }

    await userModel.updateLastLogin(req.user.id);

    const token = jwtUtils.generateToken({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
    });

    if (!req.user.phone) {
      req.flash(
        "info",
        "Please add your phone number to complete your profile.",
      );
      return res.redirect("/complete-profile");
    }

    const redirectUrl = req.user.role === "admin" ? "/admin" : "/dashboard";
    req.flash("success", "Google login successful!");
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect("/login");
  }
};
