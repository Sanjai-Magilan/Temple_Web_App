jest.mock('../models/donationModel');

const donationController = require('../controllers/donationController');
const donationModel = require('../models/donationModel');

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe('Donation Controller Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });


  // ===============================
  // LIST FUNCTION TESTS
  // ===============================

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

      donationModel.getUserDonations.mockResolvedValue({
        donations: mockDonations,
        total: 2
      });

      const req = {
        user: { id: 1, name: 'Test User' },
        query: {}
      };

      const res = mockResponse();

      await donationController.list(req, res);

      expect(donationModel.getUserDonations)
        .toHaveBeenCalledWith(1, 12, 0);

      expect(res.render).toHaveBeenCalledWith('donations/list', {
        title: 'My Donations',
        user: req.user,
        donations: mockDonations,
        currentPage: 1,
        totalPages: 1
      });
    });

    test('should render 500 page if error occurs in list()', async () => {

      donationModel.getUserDonations.mockRejectedValue(new Error('DB Error'));

      const req = {
        user: { id: 1 },
        query: {}
      };

      const res = mockResponse();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await donationController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('errors/500', {
        title: 'Server Error',
        message: 'Failed to load donations'
      });

      consoleSpy.mockRestore();
    });

  });

  // ===============================
  // showNew FUNCTION TESTS
  // ===============================

  describe('showNew()', () => {

    test('should redirect to /login if user not authenticated', () => {
      const req = { user: null };
      const res = mockResponse();

      donationController.showNew(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    test('should render donation form if authenticated', () => {
      const req = {
        user: { id: 1, name: 'Test User' }
      };

      const res = mockResponse();

      donationController.showNew(req, res);

      expect(res.render).toHaveBeenCalledWith('donations/new', {
        title: 'Make a Donation',
        user: req.user,
        error: null
      });
    });

    test('should render 500 page if error occurs in showNew()', () => {
      const req = {
        user: { id: 1 }
      };

      const res = mockResponse();

      // Silence console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // First render throws error, second render works
      res.render = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('Render Error');
        })
        .mockImplementationOnce(() => res);

      donationController.showNew(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenLastCalledWith('errors/500', {
        title: 'Server Error',
        message: 'Failed to load donation form'
      });

      consoleSpy.mockRestore();
    });

  });

});