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

  // =============================
  // listMembers
  // =============================

  describe('listMembers', () => {

    test('should render empty family if none found', async () => {
      familyModel.findByHeadUserId.mockResolvedValue(null);
      familyModel.findByUserId.mockResolvedValue([]);

      const req = mockRequest();
      const res = mockResponse();

      await familyController.listMembers(req, res);

      expect(res.render).toHaveBeenCalledWith('family/list', expect.objectContaining({
        family: null,
        members: [],
        isHead: false
      }));
    });

    test('should render family members if found', async () => {
      const mockFamily = { id: 10 };
      const mockMembers = [{ id: 1, name: 'Test' }];

      familyModel.findByHeadUserId.mockResolvedValue(mockFamily);
      familyModel.getMembers.mockResolvedValue(mockMembers);
      familyModel.isHead.mockResolvedValue(true);

      const req = mockRequest();
      const res = mockResponse();

      await familyController.listMembers(req, res);

      expect(res.render).toHaveBeenCalledWith('family/list', expect.objectContaining({
        family: mockFamily,
        members: mockMembers,
        isHead: true
      }));
    });

  });

  // =============================
  // showAddMember
  // =============================

  describe('showAddMember', () => {

    test('should redirect if no family', async () => {
      familyModel.findByHeadUserId.mockResolvedValue(null);

      const req = mockRequest();
      const res = mockResponse();

      await familyController.showAddMember(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/family?error=no_family');
    });

    test('should deny access if not head', async () => {
      familyModel.findByHeadUserId.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(false);

      const req = mockRequest();
      const res = mockResponse();

      await familyController.showAddMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

  });


});