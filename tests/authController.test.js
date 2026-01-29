const authController = require('../controllers/authController');
const userModel = require('../models/userModel');
// const familyModel = require('../models/familyModel');
const jwtUtils = require('../utils/jwt');

jest.mock('../models/userModel');
// jest.mock('../models/familyModel');
jest.mock('../utils/jwt');

const mockRequest = (body = {}, user = null) => ({
  body,
  user,
  flash: jest.fn()
});

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

//case 1 error if email already exists
test('should show error if email already exists', async () => {
  userModel.emailExists.mockResolvedValue(true);

  const req = mockRequest({ email: 'test@mail.com' });
  const res = mockResponse();

  await authController.register(req, res);

  expect(userModel.emailExists).toHaveBeenCalledWith('test@mail.com');
  expect(res.render).toHaveBeenCalledWith('auth/register', expect.objectContaining({
    error: expect.stringContaining('Email already registered')
  }));
});

//case 2 successful registration
test('should register user and set cookie', async () => {
  userModel.emailExists.mockResolvedValue(false);
  userModel.phoneExists.mockResolvedValue(false);
  userModel.create.mockResolvedValue({ id: 1, email: 'a@mail.com', role: 'user' });
  jwtUtils.generateToken.mockReturnValue('fake-token');

  const req = mockRequest({
    email: 'a@mail.com',
    phone: '9999999999',
    password: '123456',
    first_name: 'A',
    last_name: 'B'
  });

  const res = mockResponse();

  await authController.register(req, res);

  expect(userModel.create).toHaveBeenCalled();
  expect(res.cookie).toHaveBeenCalledWith('token', 'fake-token', expect.any(Object));
  expect(res.redirect).toHaveBeenCalledWith('/');
});

//case 3 error if user not found during login
test('should show error if user not found', async () => {
  userModel.findByEmail.mockResolvedValue(null);

  const req = mockRequest({ email: 'x@mail.com', password: '123' });
  const res = mockResponse();

  await authController.login(req, res);

  expect(res.render).toHaveBeenCalledWith('auth/login', expect.objectContaining({
    error: 'Invalid email or password.'
  }));
});

