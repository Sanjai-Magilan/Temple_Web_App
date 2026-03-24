jest.mock("../models/familyModel", () => ({
  findByHeadUserId: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  getMembers: jest.fn(),
  isHead: jest.fn(),
  addMember: jest.fn(),
  getMemberById: jest.fn(),
  updateMember: jest.fn(),
  deleteMember: jest.fn(),
  isMember: jest.fn(),
}));

const familyController = require("../controllers/familyController");
const familyModel = require("../models/familyModel");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const createReq = (overrides = {}) => ({
  user: { id: 1 },
  params: {},
  body: {},
  ...overrides,
});

describe("Family Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("listMembers", () => {
    test("renders an empty family state when the user has no family", async () => {
      const req = createReq();
      const res = createRes();

      familyModel.findByHeadUserId.mockResolvedValue(null);
      familyModel.findByUserId.mockResolvedValue([]);

      await familyController.listMembers(req, res);

      expect(res.render).toHaveBeenCalledWith("family/list", {
        title: "Family Members",
        family: null,
        members: [],
        isHead: false,
        message:
          "You have not created a family yet. Create one during registration or contact admin.",
      });
    });

    test("loads the family through membership when the user is not the head", async () => {
      const req = createReq();
      const res = createRes();
      const family = { id: 22, family_name: "Lakshmi Family" };
      const members = [{ id: 7, member_name: "Asha" }];

      familyModel.findByHeadUserId.mockResolvedValue(null);
      familyModel.findByUserId.mockResolvedValue([{ id: 22 }]);
      familyModel.findById.mockResolvedValue(family);
      familyModel.getMembers.mockResolvedValue(members);
      familyModel.isHead.mockResolvedValue(false);

      await familyController.listMembers(req, res);

      expect(familyModel.findById).toHaveBeenCalledWith(22);
      expect(res.render).toHaveBeenCalledWith("family/list", {
        title: "Family Members",
        family,
        members,
        isHead: false,
        message: null,
      });
    });

    test("renders the 500 page when listing members fails", async () => {
      const req = createReq();
      const res = createRes();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      familyModel.findByHeadUserId.mockRejectedValue(new Error("DB Error"));

      await familyController.listMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", { title: "Error" });

      consoleSpy.mockRestore();
    });
  });

  describe("showAddMember", () => {
    test("redirects when the user does not manage a family", async () => {
      const req = createReq();
      const res = createRes();

      familyModel.findByHeadUserId.mockResolvedValue(null);

      await familyController.showAddMember(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/family?error=no_family");
    });

    test("denies access when the user is not the family head", async () => {
      const req = createReq();
      const res = createRes();

      familyModel.findByHeadUserId.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(false);

      await familyController.showAddMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", {
        title: "Access Denied",
      });
    });

    test("renders the add-member form for the family head", async () => {
      const req = createReq();
      const res = createRes();
      const family = { id: 1, family_name: "Lakshmi Family" };

      familyModel.findByHeadUserId.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(true);

      await familyController.showAddMember(req, res);

      expect(res.render).toHaveBeenCalledWith("family/add", {
        title: "Add Family Member",
        family,
        error: null,
        formData: {},
      });
    });
  });

  describe("addMember", () => {
    test("validates that member name is required", async () => {
      const req = createReq({
        body: {
          member_name: "  ",
          relationship: "son",
        },
      });
      const res = createRes();
      const family = { id: 1 };

      familyModel.findByHeadUserId.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(true);

      await familyController.addMember(req, res);

      expect(res.render).toHaveBeenCalledWith("family/add", {
        title: "Add Family Member",
        family,
        error: "Member name is required",
        formData: req.body,
      });
      expect(familyModel.addMember).not.toHaveBeenCalled();
    });

    test("validates that relationship is required", async () => {
      const req = createReq({
        body: {
          member_name: "Anu",
          relationship: "",
        },
      });
      const res = createRes();
      const family = { id: 1 };

      familyModel.findByHeadUserId.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(true);

      await familyController.addMember(req, res);

      expect(res.render).toHaveBeenCalledWith("family/add", {
        title: "Add Family Member",
        family,
        error: "Relationship is required",
        formData: req.body,
      });
    });

    test("adds a member with trimmed and normalized data", async () => {
      const req = createReq({
        body: {
          member_name: "  John  ",
          relationship: "son",
          email: "",
          mobile: "9876543210",
          address: "",
          occupation: "Student",
          age: "15",
          date_of_birth: "2010-01-01",
        },
      });
      const res = createRes();

      familyModel.findByHeadUserId.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);

      await familyController.addMember(req, res);

      expect(familyModel.addMember).toHaveBeenCalledWith({
        family_id: 1,
        member_name: "John",
        relationship: "son",
        email: null,
        mobile: "9876543210",
        address: null,
        occupation: "Student",
        age: 15,
        date_of_birth: "2010-01-01",
      });
      expect(res.redirect).toHaveBeenCalledWith("/family?success=member_added");
    });
  });

  describe("showEditMember", () => {
    test("returns 404 when the member does not exist", async () => {
      const req = createReq({ params: { id: "5" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue(null);

      await familyController.showEditMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", {
        title: "Not Found",
      });
    });

    test("denies access when the current user is not the head", async () => {
      const req = createReq({ params: { id: "5" } });
      const res = createRes();
      const member = { id: 5, family_id: 2 };
      const family = { id: 2 };

      familyModel.getMemberById.mockResolvedValue(member);
      familyModel.findById.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(false);

      await familyController.showEditMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", {
        title: "Access Denied",
      });
    });

    test("renders the edit form when the user is the family head", async () => {
      const req = createReq({ params: { id: "5" } });
      const res = createRes();
      const member = { id: 5, family_id: 2, member_name: "John" };
      const family = { id: 2 };

      familyModel.getMemberById.mockResolvedValue(member);
      familyModel.findById.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(true);

      await familyController.showEditMember(req, res);

      expect(res.render).toHaveBeenCalledWith("family/edit", {
        title: "Edit Family Member",
        family,
        member,
        error: null,
      });
    });
  });

  describe("editMember", () => {
    test("returns 404 when the member does not exist", async () => {
      const req = createReq({ params: { id: "5" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue(null);

      await familyController.editMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", {
        title: "Not Found",
      });
    });

    test("renders validation errors when relationship is missing", async () => {
      const req = createReq({
        params: { id: "5" },
        body: {
          member_name: "John",
          relationship: "",
          mobile: "9876543210",
        },
      });
      const res = createRes();
      const member = { id: 5, family_id: 2, member_name: "Old Name" };
      const family = { id: 2 };

      familyModel.getMemberById.mockResolvedValue(member);
      familyModel.findById.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(true);

      await familyController.editMember(req, res);

      expect(res.render).toHaveBeenCalledWith("family/edit", {
        title: "Edit Family Member",
        family,
        member: { ...member, ...req.body },
        error: "Relationship is required",
      });
      expect(familyModel.updateMember).not.toHaveBeenCalled();
    });

    test("updates a member with parsed age and trimmed name", async () => {
      const req = createReq({
        params: { id: "5" },
        body: {
          member_name: "  John  ",
          relationship: "son",
          email: "",
          mobile: "9876543210",
          address: "",
          occupation: "Engineer",
          age: "27",
          date_of_birth: "1999-02-03",
        },
      });
      const res = createRes();
      const member = { id: 5, family_id: 2 };

      familyModel.getMemberById.mockResolvedValue(member);
      familyModel.findById.mockResolvedValue({ id: 2 });
      familyModel.isHead.mockResolvedValue(true);

      await familyController.editMember(req, res);

      expect(familyModel.updateMember).toHaveBeenCalledWith("5", {
        member_name: "John",
        relationship: "son",
        email: null,
        mobile: "9876543210",
        address: null,
        occupation: "Engineer",
        age: 27,
        date_of_birth: "1999-02-03",
      });
      expect(res.redirect).toHaveBeenCalledWith("/family?success=member_updated");
    });
  });

  describe("deleteMember", () => {
    test("returns 404 when the member does not exist", async () => {
      const req = createReq({ params: { id: "5" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue(null);

      await familyController.deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Member not found",
      });
    });

    test("returns 403 when the current user is not the family head", async () => {
      const req = createReq({ params: { id: "5" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue({
        id: 5,
        family_id: 1,
        relationship: "son",
      });
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(false);

      await familyController.deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Access denied",
      });
    });

    test("prevents deleting the family head", async () => {
      const req = createReq({ params: { id: "1" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue({
        id: 1,
        family_id: 1,
        relationship: "head",
      });
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);

      await familyController.deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Cannot delete family head",
      });
    });

    test("deletes a non-head family member", async () => {
      const req = createReq({ params: { id: "2" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue({
        id: 2,
        family_id: 1,
        relationship: "son",
      });
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(true);

      await familyController.deleteMember(req, res);

      expect(familyModel.deleteMember).toHaveBeenCalledWith("2");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Member deleted successfully",
      });
    });
  });

  describe("viewMember", () => {
    test("returns 404 when the member does not exist", async () => {
      const req = createReq({ params: { id: "3" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue(null);

      await familyController.viewMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", {
        title: "Not Found",
      });
    });

    test("denies access when the user is neither head nor member", async () => {
      const req = createReq({ params: { id: "3" } });
      const res = createRes();

      familyModel.getMemberById.mockResolvedValue({
        id: 3,
        family_id: 1,
      });
      familyModel.findById.mockResolvedValue({ id: 1 });
      familyModel.isHead.mockResolvedValue(false);
      familyModel.isMember.mockResolvedValue(false);

      await familyController.viewMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", {
        title: "Access Denied",
      });
    });

    test("renders the member view for an authorized family member", async () => {
      const req = createReq({ params: { id: "3" } });
      const res = createRes();
      const member = { id: 3, family_id: 1, member_name: "Asha" };
      const family = { id: 1, family_name: "Lakshmi Family" };

      familyModel.getMemberById.mockResolvedValue(member);
      familyModel.findById.mockResolvedValue(family);
      familyModel.isHead.mockResolvedValue(false);
      familyModel.isMember.mockResolvedValue(true);

      await familyController.viewMember(req, res);

      expect(res.render).toHaveBeenCalledWith("family/view", {
        title: "View Family Member",
        family,
        member,
        isHead: false,
      });
    });
  });
});
