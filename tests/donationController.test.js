// Mock donationModel
jest.mock('../models/donationModel');

const donationController = require('../controllers/donationController');
const donationModel = require('../models/donationModel');

// Helper to mock response
const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe('Donation Controller Tests', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------
  // LIST FUNCTION TESTS
  // -----------------------

  describe('list()', () => {

    test('should redirect to /login if user not authenticated', async () => {
      const req = { user: null };
      const res = mockResponse();

      await donationController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(donationModel.getUserDonations).not.toHaveBeenCalled();
    });

    test('should fetch donations and render list page', async () => {
      const mockDonations = [
        { id: 1, amount: 500 },
        { id: 2, amount: 1000 }
      ];

      donationModel.getUserDonations.mockResolvedValue(mockDonations);

      const req = {
        user: { id: 1, name: 'Test User' }
      };

      const res = mockResponse();

      await donationController.list(req, res);

      expect(donationModel.getUserDonations)
        .toHaveBeenCalledWith(1, 50, 0);

      expect(res.render).toHaveBeenCalledWith('donations/list', {
        title: 'My Donations',
        user: req.user,
        donations: mockDonations
      });
    });

    test('should render 500 page if error occurs in list()', async () => {
      donationModel.getUserDonations.mockRejectedValue(new Error('DB Error'));

      const req = {
        user: { id: 1 }
      };

      const res = mockResponse();

      await donationController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('errors/500', {
        title: 'Server Error',
        message: 'Failed to load donations'
      });
    });
  });

 
});