jest.mock("../models/familyModel", () => ({
  getAdminFamilies: jest.fn(),
  getFamilyDetailsForAdmin: jest.fn(),
  getThreeGenerationTree: jest.fn(),
}));

const familyController = require("../controllers/admin/familyController");
const familyModel = require("../models/familyModel");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
});

describe("Admin Family Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("index", () => {
    test("renders the admin family list", async () => {
      const req = { user: { id: 1, role: "admin" } };
      const res = createRes();
      const families = [{ id: 1, family_name: "Lakshmi Family" }];

      familyModel.getAdminFamilies.mockResolvedValue(families);

      await familyController.index(req, res);

      expect(familyModel.getAdminFamilies).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith("admin/families/index", {
        title: "Family Panel",
        user: req.user,
        families,
      });
    });

    test("renders 500 when listing families fails", async () => {
      const req = { user: { id: 1, role: "admin" } };
      const res = createRes();
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      familyModel.getAdminFamilies.mockRejectedValue(new Error("DB Error"));

      await familyController.index(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load family panel",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("details", () => {
    test("renders the family details page", async () => {
      const req = { params: { familyId: "7" } };
      const res = createRes();
      const data = {
        family: { id: 7, family_name: "Lakshmi Family" },
        members: [{ id: 2, member_name: "Asha" }],
        initialTree: { id: 2 },
      };

      familyModel.getFamilyDetailsForAdmin.mockResolvedValue(data);

      await familyController.details(req, res);

      expect(familyModel.getFamilyDetailsForAdmin).toHaveBeenCalledWith(7);
      expect(res.render).toHaveBeenCalledWith("admin/families/details", data);
    });

    test("returns 404 when the family is missing", async () => {
      const req = { params: { familyId: "7" } };
      const res = createRes();

      familyModel.getFamilyDetailsForAdmin.mockResolvedValue(null);

      await familyController.details(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Family not found");
    });

    test("returns 500 when loading details fails", async () => {
      const req = { params: { familyId: "7" } };
      const res = createRes();
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      familyModel.getFamilyDetailsForAdmin.mockRejectedValue(
        new Error("DB Error"),
      );

      await familyController.details(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Failed to load family details");

      consoleSpy.mockRestore();
    });
  });

  describe("tree", () => {
    test("returns the family tree json", async () => {
      const req = { params: { memberId: "9" } };
      const res = createRes();
      const tree = { id: 9 };

      familyModel.getThreeGenerationTree.mockResolvedValue(tree);

      await familyController.tree(req, res);

      expect(familyModel.getThreeGenerationTree).toHaveBeenCalledWith(9);
      expect(res.json).toHaveBeenCalledWith({ success: true, tree });
    });

    test("returns 404 when the tree cannot be found", async () => {
      const req = { params: { memberId: "9" } };
      const res = createRes();

      familyModel.getThreeGenerationTree.mockResolvedValue(null);

      await familyController.tree(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Member not found",
      });
    });

    test("returns 500 when loading the tree fails", async () => {
      const req = { params: { memberId: "9" } };
      const res = createRes();
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      familyModel.getThreeGenerationTree.mockRejectedValue(
        new Error("DB Error"),
      );

      await familyController.tree(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Failed to load tree",
      });

      consoleSpy.mockRestore();
    });
  });
});
