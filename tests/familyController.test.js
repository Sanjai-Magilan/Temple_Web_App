jest.mock('../models/familyModel');

const familyController = require('../controllers/familyController');
const familyModel = require('../models/familyModel');

const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (data = {}) => ({
  user: { id: 1 },
  params: {},
  body: {},
  ...data
});

describe('Family Controller Tests', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

});