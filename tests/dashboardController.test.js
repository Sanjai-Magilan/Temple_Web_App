const dashboardController = require('../controllers/dashboardController');
const donationModel = require('../models/donationModel');
const hallBookingModel = require('../models/hallBookingModel');
const poojaBookingModel = require('../models/poojaBookingModel');
const paymentModel = require('../models/paymentModel');

jest.mock('../models/donationModel');
jest.mock('../models/hallBookingModel');
jest.mock('../models/poojaBookingModel');
jest.mock('../models/paymentModel');
jest.mock('../models/userModel');
jest.mock('../config/database', () => ({
  execute: jest.fn()
}));

const pool = require('../config/database');

const mockRequest = (user = null) => ({ user });

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
jest.clearAllMocks();
});

//redirect to login if user not logged in
test('should redirect to login if user not logged in', async () => {
    const req = mockRequest(null);
    const res = mockResponse();

    await dashboardController.userDashboard(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

//render dashboard with data test
  test('should render user dashboard with correct data', async () => {
    // SQL mock results
    pool.execute
      .mockResolvedValueOnce([[{ count: 5 }]])     // donations
      .mockResolvedValueOnce([[{ count: 2 }]])     // hall
      .mockResolvedValueOnce([[{ count: 3 }]])     // pooja
      .mockResolvedValueOnce([[{ total: 1500 }]]); // spent

    donationModel.getUserDonations.mockResolvedValue([{ id: 1 }]);
    hallBookingModel.getUserBookings.mockResolvedValue([
      { id: 2, created_at: '2025-01-01' }
    ]);
    poojaBookingModel.getUserBookings.mockResolvedValue([
      { id: 3, created_at: '2025-01-02' }
    ]);

    const req = mockRequest({ id: 1 });
    const res = mockResponse();

    await dashboardController.userDashboard(req, res);

    expect(res.render).toHaveBeenCalledWith(
      'dashboard/user',
      expect.objectContaining({
        donationsCount: 5,
        hallBookingsCount: 2,
        poojaBookingsCount: 3,
        totalSpent: 1500,
        recentDonations: expect.any(Array),
        recentBookings: expect.any(Array)
      })
    );
  });