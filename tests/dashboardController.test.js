const dashboardController = require('../controllers/dashboardController');

jest.mock('../models/donationModel');
jest.mock('../models/hallBookingModel');
jest.mock('../models/poojaBookingModel');
jest.mock('../models/paymentModel');
jest.mock('../models/userModel');
jest.mock('../config/database', () => ({
  execute: jest.fn()
}));

const mockRequest = (user = null) => ({ user });

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

//redirect to login if user not logged in
test('should redirect to login if user not logged in', async () => {
    const req = mockRequest(null);
    const res = mockResponse();

    await dashboardController.userDashboard(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
