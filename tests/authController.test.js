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

describe('Logout', () => {
  test('should clear cookie and redirect', () => {
    const req = mockRequest();
    const res = mockResponse();

    authController.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('token');
    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});
