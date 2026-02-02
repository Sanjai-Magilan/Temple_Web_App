const profileController = require("../controllers/profileController");
const userModel = require("../models/userModel");

jest.mock("../models/userModel");

describe("Profile Controller Tests", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
      },
      body: {
        name: "Updated User",
        email: "updated@example.com",
      },
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  //Tests for viewProfile Function
  describe("viewProfile", () => {
    test("should render profile page with correct data", async () => {
      await profileController.viewProfile(req, res);

      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith("profile/profile", {
        title: "My Profile",
        user: req.user,
      });
    });

    test("should render profile page even if user is undefined", async () => {
      req.user = undefined;

      await profileController.viewProfile(req, res);

      expect(res.render).toHaveBeenCalledWith("profile/profile", {
        title: "My Profile",
        user: undefined,
      });
    });
  });

  //Tests for updateProfile Function
  describe("updateProfile", () => {
    test("should call model updateProfile and redirect on success", async () => {
      userModel.updateProfile.mockResolvedValue(true);

      await profileController.updateProfile(req, res);

      expect(userModel.updateProfile).toHaveBeenCalledTimes(1);
      expect(userModel.updateProfile).toHaveBeenCalledWith(
        req.user.id,
        req.body,
      );
      expect(res.redirect).toHaveBeenCalledWith("/profile");
    });

    test("should return 500 if updateProfile throws an error", async () => {
      userModel.updateProfile.mockRejectedValue(new Error("DB Error"));

      await profileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Error updating profile");
      expect(res.redirect).not.toHaveBeenCalled();
    });

    test("should handle missing user id gracefully", async () => {
      req.user = {};

      userModel.updateProfile.mockRejectedValue(new Error("User ID missing"));

      await profileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Error updating profile");
    });
  });
});
