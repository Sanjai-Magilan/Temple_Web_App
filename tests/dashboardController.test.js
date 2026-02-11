/**
 * Dashboard Controller Tests
 */

jest.mock('../models/donationModel');
jest.mock('../models/hallBookingModel');
jest.mock('../models/poojaBookingModel');
jest.mock('../models/paymentModel');
jest.mock('../models/userModel');
jest.mock('../config/database', () => ({
  execute: jest.fn()
}));

const dashboardController = require('../controllers/dashboardController');
const donationModel = require('../models/donationModel');
const hallBookingModel = require('../models/hallBookingModel');
const poojaBookingModel = require('../models/poojaBookingModel');
const paymentModel = require('../models/paymentModel');
const pool = require('../config/database');

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe('Dashboard Controller', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // USER DASHBOARD TESTS
  // ================================

  describe('userDashboard', () => {

    test('should redirect to login if user not authenticated', async () => {
      const req = { user: null };
      const res = mockResponse();

      await dashboardController.userDashboard(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    test('should render user dashboard with correct data', async () => {
      const req = { user: { id: 1, name: 'Test User' } };
      const res = mockResponse();

      // Mock DB responses in order
      pool.execute
        .mockResolvedValueOnce([[{ count: 2 }]]) // donationsCount
        .mockResolvedValueOnce([[{ count: 1 }]]) // hallBookingsCount
        .mockResolvedValueOnce([[{ count: 3 }]]) // poojaBookingsCount
        .mockResolvedValueOnce([[{ total: 5000 }]]) // totalDonation
        .mockResolvedValueOnce([[{ count: 4 }]]) // familyCount
        .mockResolvedValueOnce([[{ id: 10, booking_date: '2026-12-01' }]]) // upcomingPooja
        .mockResolvedValueOnce([[{ id: 20, booking_date: '2026-11-01' }]]); // upcomingHall

      donationModel.getUserDonations.mockResolvedValue([{ id: 1 }]);
      hallBookingModel.getUserBookings.mockResolvedValue([{ id: 2, created_at: new Date() }]);
      poojaBookingModel.getUserBookings.mockResolvedValue([{ id: 3, created_at: new Date() }]);

      await dashboardController.userDashboard(req, res);

      expect(res.render).toHaveBeenCalledWith('dashboard/user', expect.objectContaining({
        title: 'Dashboard',
        user: req.user,
        totalDonation: 5000,
        familyCount: 4,
        donationsCount: 2,
        hallBookingsCount: 1,
        poojaBookingsCount: 3
      }));
    });

    test('should handle errors and return 500', async () => {
      const req = { user: { id: 1 } };
      const res = mockResponse();

      pool.execute.mockRejectedValue(new Error('DB Error'));

      await dashboardController.userDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('errors/500', expect.any(Object));
    });

  });

 
});