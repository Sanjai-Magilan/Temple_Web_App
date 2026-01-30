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
    const redirectUrl = user.role === 'admin' ? '/admin' : '/';
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




/**
 * Send OTP
 */
exports.sendOtp = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!email || !name) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Please provide both name and email address.',
        formData: { name, email },
        step: 'details'
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in session
    req.session.otpAuth = {
      otp,
      email,
      name,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    // For demo purposes, log OTP to console
    console.log(`=========================================`);
    console.log(`OTP for ${name} (${email}): ${otp}`);
    console.log(`=========================================`);

    res.render('auth/login', {
      title: 'Verify OTP',
      error: null,
      step: 'otp',
      name,
      email,
      devOtp: otp // Pass OTP to view for testing
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.render('auth/login', {
      title: 'Login',
      error: 'Failed to send OTP. Please try again.',
      formData: req.body,
      step: 'details'
    });
  }
};

/**
 * Verify OTP and Login/Register
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const authData = req.session.otpAuth;

    if (!authData || !authData.otp) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Session expired. Please start again.',
        step: 'details',
        formData: {}
      });
    }

    if (authData.otp !== otp) {
      return res.render('auth/login', {
        title: 'Verify OTP',
        error: 'Invalid OTP. Please try again.',
        step: 'otp',
        name: authData.name,
        email: authData.email,
        devOtp: authData.otp // keep OTP on screen
      });
    }

    if (Date.now() > authData.expires) {
      delete req.session.otpAuth;
      return res.render('auth/login', {
        title: 'Login',
        error: 'OTP expired. Please request a new one.',
        step: 'details',
        formData: { name: authData.name, email: authData.email }
      });
    }

    // OTP Verified. Check if user exists.
    let user = await userModel.findByEmail(authData.email);

    if (!user) {
      // Create user
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      // Split name
      const names = authData.name.trim().split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || '';

      user = await userModel.create({
        email: authData.email,
        // Using a dummy phone number since it's required by the DB but not by the flow
        phone: '000' + Date.now().toString().slice(-7),
        password: randomPassword,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        is_active: 1
      });
    }

    // Login User
    await userModel.updateLastLogin(user.id);

    const token = jwtUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict'
    });

    // Clear session OTP
    delete req.session.otpAuth;

    const redirectUrl = user.role === 'admin' ? '/admin' : '/dashboard';
    req.flash ? req.flash('success', 'Login successful!') : null;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.render('auth/login', {
      title: 'Verify OTP',
      error: 'Verification failed. Please try again.',
      step: 'otp',
      name: req.session.otpAuth?.name,
      email: req.session.otpAuth?.email,
      devOtp: req.session.otpAuth?.otp // keep OTP on screen
    });
  }
};

/**
 * Resend OTP
 */
exports.resendOtp = (req, res) => {
  if (!req.session.otpAuth) {
    return res.redirect('/login');
  }

  // Regenerate OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  req.session.otpAuth.otp = otp;
  req.session.otpAuth.expires = Date.now() + 5 * 60 * 1000;

  console.log(`=========================================`);
  console.log(`Resent OTP for ${req.session.otpAuth.name} (${req.session.otpAuth.email}): ${otp}`);
  console.log(`=========================================`);

  res.render('auth/login', {
    title: 'Verify OTP',
    error: 'A new OTP has been sent.',
    step: 'otp',
    name: req.session.otpAuth.name,
    email: req.session.otpAuth.email,
    devOtp: otp
  });
};
