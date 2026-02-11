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

  // =============================
  // addMember
  // =============================

  describe('addMember', () => {

    test('should validate missing name', async () => {
      familyModel.findByHeadUserId.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);

      const req = mockRequest({
        body: { member_name: '', relationship: 'son' }
      });

      const res = mockResponse();

      await familyController.addMember(req, res);

      expect(res.render).toHaveBeenCalled();
    });

    test('should add member and redirect', async () => {
      familyModel.findByHeadUserId.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);
      familyModel.addMember.mockResolvedValue(true);

      const req = mockRequest({
        body: {
          member_name: 'John',
          relationship: 'son'
        }
      });

      const res = mockResponse();

      await familyController.addMember(req, res);

      expect(familyModel.addMember).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/family?success=member_added');
    });

  });

  // =============================
  // showEditMember
  // =============================

  describe('showEditMember', () => {

    test('should return 404 if member not found', async () => {
      familyModel.getMemberById.mockResolvedValue(null);

      const req = mockRequest({ params: { id: 5 } });
      const res = mockResponse();

      await familyController.showEditMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

  });

  // =============================
  // editMember
  // =============================

  describe('editMember', () => {

    test('should validate missing relationship', async () => {
      const mockMember = { id: 5, family_id: 1 };

      familyModel.getMemberById.mockResolvedValue(mockMember);
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);

      const req = mockRequest({
        params: { id: 5 },
        body: { member_name: 'John', relationship: '' }
      });

      const res = mockResponse();

      await familyController.editMember(req, res);

      expect(res.render).toHaveBeenCalled();
    });

    test('should update member successfully', async () => {
      const mockMember = { id: 5, family_id: 1 };

      familyModel.getMemberById.mockResolvedValue(mockMember);
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);
      familyModel.updateMember.mockResolvedValue(true);

      const req = mockRequest({
        params: { id: 5 },
        body: { member_name: 'John', relationship: 'son' }
      });

      const res = mockResponse();

      await familyController.editMember(req, res);

      expect(familyModel.updateMember).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/family?success=member_updated');
    });

  });

  // =============================
  // deleteMember
  // =============================

  describe('deleteMember', () => {

    test('should return 404 if member not found', async () => {
      familyModel.getMemberById.mockResolvedValue(null);

      const req = mockRequest({ params: { id: 5 } });
      const res = mockResponse();

      await familyController.deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should prevent deleting head', async () => {
      familyModel.getMemberById.mockResolvedValue({
        id: 1,
        family_id: 1,
        relationship: 'head'
      });

      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);

      const req = mockRequest({ params: { id: 1 } });
      const res = mockResponse();

      await familyController.deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should delete member successfully', async () => {
      familyModel.getMemberById.mockResolvedValue({
        id: 2,
        family_id: 1,
        relationship: 'son'
      });

      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);
      familyModel.deleteMember.mockResolvedValue(true);

      const req = mockRequest({ params: { id: 2 } });
      const res = mockResponse();

      await familyController.deleteMember(req, res);

      expect(familyModel.deleteMember).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

  });

  // =============================
  // viewMember
  // =============================

  describe('viewMember', () => {

    test('should deny access if not head or member', async () => {
      familyModel.getMemberById.mockResolvedValue({
        id: 1,
        family_id: 1
      });

      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(false);
      familyModel.isMember.mockResolvedValue(false);

      const req = mockRequest({ params: { id: 1 } });
      const res = mockResponse();

      await familyController.viewMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should render view page if access allowed', async () => {
      const mockMember = { id: 1, family_id: 1 };

      familyModel.getMemberById.mockResolvedValue(mockMember);
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);
      familyModel.isMember.mockResolvedValue(false);

      const req = mockRequest({ params: { id: 1 } });
      const res = mockResponse();

      await familyController.viewMember(req, res);

      expect(res.render).toHaveBeenCalledWith('family/view', expect.objectContaining({
        member: mockMember
      }));
    });

  });

});