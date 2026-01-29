const authController = require('../controllers/authController');
const userModel = require('../models/userModel');
const familyModel = require('../models/familyModel');
const jwtUtils = require('../utils/jwt');

jest.mock('../models/userModel');
jest.mock('../models/familyModel');
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

//case 1 erro if email already exists
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
