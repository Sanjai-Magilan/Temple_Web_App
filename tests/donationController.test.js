jest.mock("../models/donationModel", () => ({
  getUserDonations: jest.fn(),
  getAllDonations: jest.fn(),
}));

const donationController = require("../controllers/donationController");
const donationModel = require("../models/donationModel");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
});

describe("Donation Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("list", () => {
    test("redirects to /login when the user is not authenticated", async () => {
      const req = { user: null, query: {} };
      const res = createRes();

      await donationController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(donationModel.getUserDonations).not.toHaveBeenCalled();
    });

    test("renders the donation list with pagination data", async () => {
      const req = {
        user: { id: 1, name: "Test User" },
        query: { page: "2" },
      };
      const res = createRes();
      const mockDonations = [{ id: 13 }, { id: 14 }];

      donationModel.getUserDonations.mockResolvedValue({
        donations: mockDonations,
        total: 26,
      });

      await donationController.list(req, res);

      expect(donationModel.getUserDonations).toHaveBeenCalledWith(1, 12, 12);
      expect(res.render).toHaveBeenCalledWith("donations/list", {
        title: "My Donations",
        user: req.user,
        donations: mockDonations,
        currentPage: 2,
        totalPages: 3,
      });
    });

    test("renders the 500 page when loading donations fails", async () => {
      const req = {
        user: { id: 1 },
        query: {},
      };
      const res = createRes();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      donationModel.getUserDonations.mockRejectedValue(new Error("DB Error"));

      await donationController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load donations",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("showNew", () => {
    test("redirects to /login when the user is not authenticated", () => {
      const req = { user: null };
      const res = createRes();

      donationController.showNew(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders the donation form when the user is authenticated", () => {
      const req = { user: { id: 1, name: "Test User" } };
      const res = createRes();

      donationController.showNew(req, res);

      expect(res.render).toHaveBeenCalledWith("donations/new", {
        title: "Make a Donation",
        user: req.user,
        error: null,
      });
    });

    test("renders the 500 page when the donation form fails to render", () => {
      const req = { user: { id: 1 } };
      const res = createRes();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      res.render = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error("Render Error");
        })
        .mockImplementationOnce(() => res);

      donationController.showNew(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenLastCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load donation form",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("listAdmin", () => {
    test("renders the admin donation list with filters and pagination", async () => {
      const req = {
        user: { id: 99, role: "admin" },
        query: {
          page: "3",
          search: "festival",
          type: "annadanam",
        },
      };
      const res = createRes();
      const mockDonations = [{ id: 31 }, { id: 32 }];
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      donationModel.getAllDonations.mockResolvedValue({
        donations: mockDonations,
        total: 30,
      });

      await donationController.listAdmin(req, res);

      expect(donationModel.getAllDonations).toHaveBeenCalledWith(
        12,
        24,
        "festival",
        "annadanam",
      );
      expect(res.render).toHaveBeenCalledWith("donations/admin_list", {
        title: "All Donations",
        donations: mockDonations,
        currentPage: 3,
        totalPages: 3,
        search: "festival",
        donationType: "annadanam",
        user: req.user,
      });

      consoleSpy.mockRestore();
    });

    test("renders the 500 page when loading admin donations fails", async () => {
      const req = {
        user: { id: 99, role: "admin" },
        query: {},
      };
      const res = createRes();
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      jest.spyOn(console, "log").mockImplementation(() => {});

      donationModel.getAllDonations.mockRejectedValue(new Error("DB Error"));

      await donationController.listAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load donations",
      });

      consoleSpy.mockRestore();
    });
  });
});
