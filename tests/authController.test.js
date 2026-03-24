jest.mock('../models/userModel');
jest.mock('../models/familyModel');
jest.mock('../utils/jwt');
jest.mock('../utils/mailer');

const authController = require('../controllers/authController');
const userModel = require('../models/userModel');
const familyModel = require('../models/familyModel');
const jwtUtils = require('../utils/jwt');
const mailer = require('../utils/mailer');

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (data = {}) => ({
  body: {},
  query: {},
  user: null,
  flash: jest.fn(),
  logout: jest.fn(cb => cb()),
  ...data
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('Auth Controller - View Handlers', () => {
  test('showRegister redirects authenticated users home', () => {
    const req = mockRequest({ user: { id: 1 } });
    const res = mockResponse();

    authController.showRegister(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  test('showRegister renders the registration page for guests', () => {
    const req = mockRequest();
    const res = mockResponse();

    authController.showRegister(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/register', {
      title: 'Register',
      error: null,
      formData: {},
    });
  });

  test('showLogin renders the login page for guests', () => {
    const req = mockRequest();
    const res = mockResponse();

    authController.showLogin(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/login', {
      title: 'Login',
      error: null,
      formData: {},
    });
  });

  test('showOTPPage redirects to register when email is missing', () => {
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    authController.showOTPPage(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/register');
  });

  test('showOTPPage renders the OTP page when email is present', () => {
    const req = mockRequest({ query: { email: 'test@mail.com' } });
    const res = mockResponse();

    authController.showOTPPage(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/verify-otp', {
      email: 'test@mail.com',
      error: null,
      success: null,
      info: null,
    });
  });

  test('showCompleteProfile redirects guests to login', () => {
    const req = mockRequest();
    const res = mockResponse();

    authController.showCompleteProfile(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  test('showCompleteProfile redirects users with phone numbers to dashboard', () => {
    const req = mockRequest({ user: { id: 1, phone: '9999999999' } });
    const res = mockResponse();

    authController.showCompleteProfile(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  test('showForgotPassword renders the forgot password page for guests', () => {
    const req = mockRequest();
    const res = mockResponse();

    authController.showForgotPassword(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/forgot-password', {
      title: 'Forgot Password',
      error: null,
      success: null,
      formData: {},
    });
  });

  test('showVerifyResetOTP redirects to forgot password when email is missing', () => {
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    authController.showVerifyResetOTP(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/forgot-password');
  });

  test('showResetPassword renders when verification is complete', () => {
    const req = mockRequest({
      query: { email: 'test@mail.com', verified: 'true' },
    });
    const res = mockResponse();

    authController.showResetPassword(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/reset-password', {
      title: 'Reset Password',
      email: 'test@mail.com',
      error: null,
      formData: {},
    });
  });
});

describe('Auth Controller - Register', () => {
  afterEach(() => jest.clearAllMocks());

  test('should register user and send OTP', async () => {
    const req = mockRequest({
      body: {
        email: 'test@mail.com',
        phone: '9999999999',
        password: '123456',
        first_name: 'John',
        last_name: 'Doe'
      }
    });
    const res = mockResponse();

    userModel.emailExists.mockResolvedValue(false);
    userModel.phoneExists.mockResolvedValue(false);
    userModel.create.mockResolvedValue({ id: 1, email: 'test@mail.com' });
    userModel.saveEmailOtp.mockResolvedValue(true);
    mailer.sendOTP.mockResolvedValue(true);

    await authController.register(req, res);

    expect(userModel.create).toHaveBeenCalled();
    expect(userModel.saveEmailOtp).toHaveBeenCalled();
    expect(mailer.sendOTP).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/verify-otp')
    );
  });
});

test('should show error if email exists', async () => {
  const req = mockRequest({ body: { email: 'test@mail.com' } });
  const res = mockResponse();

  userModel.emailExists.mockResolvedValue(true);

  await authController.register(req, res);

  expect(res.render).toHaveBeenCalledWith(
    'auth/register',
    expect.objectContaining({ error: expect.stringContaining('Email already') })
  );
});

describe('Auth Controller - Login', () => {
  test('should login successfully', async () => {
    const req = mockRequest({
      body: { email: 'test@mail.com', password: '123456' }
    });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      role: 'user',
      is_active: 1,
      email_verified: 1,
      password_hash: 'hashed'
    });

    userModel.verifyPassword.mockResolvedValue(true);
    jwtUtils.generateToken.mockReturnValue('token123');

    await authController.login(req, res);

    expect(res.cookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });
});

test('should fail if password invalid', async () => {
  const req = mockRequest({
    body: { email: 'test@mail.com', password: 'wrong' }
  });
  const res = mockResponse();

  userModel.findByEmail.mockResolvedValue({
    password_hash: 'hashed',
    is_active: 1,
    email_verified: 1
  });

  userModel.verifyPassword.mockResolvedValue(false);

  await authController.login(req, res);

  expect(res.render).toHaveBeenCalledWith(
    'auth/login',
    expect.objectContaining({ error: 'Invalid email or password.' })
  );
});

describe('OTP Verification', () => {
  test('should verify OTP', async () => {
    const req = mockRequest({
      body: { email: 'test@mail.com', otp: '123456' }
    });
    const res = mockResponse();

    userModel.verifyEmailOtp.mockResolvedValue({ id: 1, email_verified: 0 });
    userModel.verifyEmail.mockResolvedValue(true);

    await authController.verifyOTP(req, res);

    expect(userModel.verifyEmail).toHaveBeenCalledWith(1);
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});

describe('Auth Controller - Resend OTP', () => {
  test('renders an error when email is missing', async () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    await authController.resendOTP(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/verify-otp', {
      email: undefined,
      error: 'Email is required.',
    });
  });

  test('redirects to login when the email is already verified', async () => {
    const req = mockRequest({ body: { email: 'test@mail.com' } });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      email_verified: 1,
    });

    await authController.resendOTP(req, res);

    expect(req.flash).toHaveBeenCalledWith(
      'info',
      'Your email is already verified. Please login.'
    );
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  test('saves and sends a new OTP for unverified users', async () => {
    const req = mockRequest({ body: { email: 'test@mail.com' } });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      email_verified: 0,
    });
    userModel.saveEmailOtp.mockResolvedValue(true);
    mailer.sendOTP.mockResolvedValue(true);

    await authController.resendOTP(req, res);

    expect(userModel.saveEmailOtp).toHaveBeenCalled();
    expect(mailer.sendOTP).toHaveBeenCalledWith('test@mail.com', expect.any(String));
    expect(res.render).toHaveBeenCalledWith('auth/verify-otp', {
      email: 'test@mail.com',
      success: 'New OTP sent to your email. It will expire in 10 minutes.',
      info: null,
      error: null,
    });
  });
});

describe('Auth Controller - Complete Profile', () => {
  test('savePhone redirects guests to login', async () => {
    const req = mockRequest({ user: null });
    const res = mockResponse();

    await authController.savePhone(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  test('savePhone renders an error when phone is missing', async () => {
    const req = mockRequest({
      user: { id: 1, first_name: 'Test', last_name: 'User' },
      body: {},
    });
    const res = mockResponse();

    await authController.savePhone(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/complete-profile', {
      error: 'Phone number is required.',
      user: req.user,
    });
  });

  test('savePhone renders an error when the phone is already in use', async () => {
    const req = mockRequest({
      user: { id: 1, first_name: 'Test', last_name: 'User' },
      body: { phone: '9999999999' },
    });
    const res = mockResponse();

    userModel.findByPhone.mockResolvedValue({ id: 2 });

    await authController.savePhone(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/complete-profile', {
      error: 'Phone number already in use. Please use a different number.',
      user: req.user,
    });
  });

  test('savePhone updates the profile and optionally creates a family', async () => {
    const req = mockRequest({
      user: { id: 1, first_name: 'Test', last_name: 'User' },
      body: {
        phone: '9999999999',
        family_name: 'Lakshmi Family',
        address: 'Temple Street',
        city: 'Madurai',
        state: 'TN',
        pincode: '625001',
      },
    });
    const res = mockResponse();

    userModel.findByPhone.mockResolvedValue(null);
    userModel.updateProfile.mockResolvedValue(true);
    familyModel.create.mockResolvedValue({ id: 10 });

    await authController.savePhone(req, res);

    expect(userModel.updateProfile).toHaveBeenCalledWith(1, {
      first_name: 'Test',
      last_name: 'User',
      phone: '9999999999',
    });
    expect(familyModel.create).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });
});

describe('Auth Controller - Google Callback', () => {
  test('redirects to login when Google auth does not provide a user', async () => {
    const req = mockRequest({ user: null });
    const res = mockResponse();

    await authController.googleCallback(req, res);

    expect(req.flash).toHaveBeenCalledWith(
      'error',
      'Google login failed. Please try again.'
    );
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  test('redirects to complete profile when the Google user has no phone', async () => {
    const req = mockRequest({
      user: { id: 1, email: 'test@mail.com', role: 'user', phone: null },
    });
    const res = mockResponse();

    userModel.updateLastLogin.mockResolvedValue(true);
    jwtUtils.generateToken.mockReturnValue('google-token');

    await authController.googleCallback(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'token',
      'google-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
    expect(res.redirect).toHaveBeenCalledWith('/complete-profile');
  });

  test('redirects admins to the admin dashboard after Google login', async () => {
    const req = mockRequest({
      user: { id: 1, email: 'admin@mail.com', role: 'admin', phone: '9999999999' },
    });
    const res = mockResponse();

    userModel.updateLastLogin.mockResolvedValue(true);
    jwtUtils.generateToken.mockReturnValue('admin-token');

    await authController.googleCallback(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/admin');
  });
});

describe('Auth Controller - Password Reset', () => {
  test('requestPasswordReset renders an error when email is missing', async () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    await authController.requestPasswordReset(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/forgot-password', {
      title: 'Forgot Password',
      error: 'Email is required.',
      success: null,
      formData: { email: undefined },
    });
  });

  test('requestPasswordReset redirects to OTP verification for active users', async () => {
    const req = mockRequest({ body: { email: 'test@mail.com' } });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      is_active: 1,
    });
    userModel.savePasswordResetOtp.mockResolvedValue(true);
    mailer.sendPasswordResetOTP.mockResolvedValue(true);

    await authController.requestPasswordReset(req, res);

    expect(userModel.savePasswordResetOtp).toHaveBeenCalled();
    expect(mailer.sendPasswordResetOTP).toHaveBeenCalledWith(
      'test@mail.com',
      expect.any(String)
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/verify-reset-otp?email=')
    );
  });

  test('showVerifyResetOTP renders the reset OTP page', () => {
    const req = mockRequest({ query: { email: 'test@mail.com' } });
    const res = mockResponse();

    authController.showVerifyResetOTP(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/verify-reset-otp', {
      title: 'Verify OTP',
      email: 'test@mail.com',
      error: null,
      success: null,
    });
  });

  test('verifyResetOTP redirects to reset password on success', async () => {
    const req = mockRequest({
      body: { email: 'test@mail.com', otp: '123456' },
    });
    const res = mockResponse();

    userModel.verifyPasswordResetOtp.mockResolvedValue({ id: 1 });

    await authController.verifyResetOTP(req, res);

    expect(res.redirect).toHaveBeenCalledWith(
      '/reset-password?email=test%40mail.com&verified=true'
    );
  });

  test('resendResetOTP renders an error when the user does not exist', async () => {
    const req = mockRequest({ body: { email: 'missing@mail.com' } });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue(null);

    await authController.resendResetOTP(req, res);

    expect(res.render).toHaveBeenCalledWith('auth/verify-reset-otp', {
      title: 'Verify OTP',
      email: 'missing@mail.com',
      error: 'User not found.',
      success: null,
    });
  });

  test('resendResetOTP saves and renders a new OTP message', async () => {
    const req = mockRequest({ body: { email: 'test@mail.com' } });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue({ id: 1, email: 'test@mail.com' });
    userModel.savePasswordResetOtp.mockResolvedValue(true);
    mailer.sendPasswordResetOTP.mockResolvedValue(true);

    await authController.resendResetOTP(req, res);

    expect(userModel.savePasswordResetOtp).toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith('auth/verify-reset-otp', {
      title: 'Verify OTP',
      email: 'test@mail.com',
      success: 'New OTP sent to your email. It will expire in 10 minutes.',
      error: null,
    });
  });

  test('showResetPassword redirects when the request is not verified', () => {
    const req = mockRequest({
      query: { email: 'test@mail.com', verified: 'false' },
    });
    const res = mockResponse();

    authController.showResetPassword(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/forgot-password');
  });

  test('resetPassword updates the password and redirects to login', async () => {
    const req = mockRequest({
      body: {
        email: 'test@mail.com',
        password: '123456',
        confirm_password: '123456',
      },
    });
    const res = mockResponse();

    userModel.findByEmail.mockResolvedValue({ id: 1, email: 'test@mail.com' });
    userModel.updatePassword.mockResolvedValue(true);

    await authController.resetPassword(req, res);

    expect(userModel.updatePassword).toHaveBeenCalledWith(1, '123456');
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});

describe('Logout', () => {
  test('should clear cookie and redirect', () => {
    const req = mockRequest();
    const res = mockResponse();

    authController.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('token');
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});
