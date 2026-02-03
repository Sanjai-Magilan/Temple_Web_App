/**
 * Authentication Controller
 * Handles user registration, login, and logout
 */

const userModel = require('../models/userModel');
const familyModel = require('../models/familyModel');
const jwtUtils = require('../utils/jwt');

/**
 * Show registration page
 */
exports.showRegister = (req, res) => {
  // Redirect if already logged in
  if (req.user) {
    return res.redirect('/');
  }
  res.render('auth/register', {
    title: 'Register',
    error: null,
    formData: {}
  });
};

/**
 * Handle user registration
 */
exports.register = async (req, res) => {
  try {
    const { email, phone, password, first_name, last_name, family_name, address, city, state, pincode } = req.body;

    // Check if email already exists
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      return res.render('auth/register', {
        title: 'Register',
        error: 'Email already registered. Please use a different email or login.',
        formData: { email, phone, first_name, last_name, family_name, address, city, state, pincode }
      });
    }

    // Check if phone already exists
    const phoneExists = await userModel.phoneExists(phone);
    if (phoneExists) {
      return res.render('auth/register', {
        title: 'Register',
        error: 'Phone number already registered. Please use a different phone number or login.',
        formData: { email, phone, first_name, last_name, family_name, address, city, state, pincode }
      });
    }

    // Create user
    const user = await userModel.create({
      email,
      phone,
      password,
      first_name,
      last_name,
      role: 'user'
    });

    // Create family if family_name is provided
    let family = null;
    if (family_name && family_name.trim()) {
      family = await familyModel.create({
        family_name: family_name.trim(),
        head_user_id: user.id,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null
      });
    }

    // Generate JWT token
    const token = jwtUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Set token in httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    });

    // Redirect to home or dashboard
    req.flash ? req.flash('success', 'Registration successful! Welcome to Temple Management System.') : null;
    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/register', {
      title: 'Register',
      error: 'Registration failed. Please try again.',
      formData: req.body
    });
  }
};

/**
 * Show login page
 */
exports.showLogin = (req, res) => {
  // Redirect if already logged in
  if (req.user) {
    return res.redirect('/');
  }
  res.render('auth/login', {
    title: 'Login',
    error: null,
    formData: {}
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
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password.',
        formData: { email }
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Your account has been deactivated. Please contact administrator.',
        formData: { email }
      });
    }

    // Verify password
    const isPasswordValid = await userModel.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password.',
        formData: { email }
      });
    }

    // Update last login
    await userModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwtUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Set token in httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    });

    // Redirect based on role
    const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';
    req.flash ? req.flash('success', 'Login successful!') : null;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      title: 'Login',
      error: 'Login failed. Please try again.',
      formData: req.body
    });
  }
};

/**
 * Handle user logout
 */
exports.logout = (req, res) => {
  res.clearCookie('token');
  req.flash ? req.flash('success', 'You have been logged out successfully.') : null;
  res.redirect('/login');
};



