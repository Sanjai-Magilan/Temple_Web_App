/**
 * Pooja Booking Controller Tests
 */

const poojaBookingController = require("../controllers/poojaBookingController");
const poojaBookingModel = require("../models/poojaBookingModel");

// Mock the model
jest.mock("../models/poojaBookingModel");

describe("Pooja Booking Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        first_name: "Test",
        last_name: "User",
      },
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  // =========================
  // Tests for list()
  // =========================
  describe("list()", () => {
    test("should redirect to /login if user is not authenticated", async () => {
      req.user = null;

      await poojaBookingController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(poojaBookingModel.getUserBookings).not.toHaveBeenCalled();
    });

    test("should fetch bookings and render pooja booking list page", async () => {
      const mockBookings = [
        { id: 1, pooja_name: "Abhishekam" },
        { id: 2, pooja_name: "Archana" },
      ];

      poojaBookingModel.getUserBookings.mockResolvedValue(mockBookings);

      await poojaBookingController.list(req, res);

      expect(poojaBookingModel.getUserBookings).toHaveBeenCalledWith(1, 50, 0);
      expect(res.render).toHaveBeenCalledWith("bookings/pooja/list", {
        title: "Pooja Bookings",
        user: req.user,
        bookings: mockBookings,
      });
    });

    test("should render 500 error page if model throws error", async () => {
      poojaBookingModel.getUserBookings.mockRejectedValue(
        new Error("Database error"),
      );

      await poojaBookingController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load pooja bookings",
      });
    });
  });

  // =========================
  // Tests for showNew()
  // =========================
  describe("showNew()", () => {
    test("should redirect to /login if user is not authenticated", () => {
      req.user = null;

      poojaBookingController.showNew(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("should render pooja booking form for authenticated user", () => {
      poojaBookingController.showNew(req, res);

      expect(res.render).toHaveBeenCalledWith("bookings/pooja/new", {
        title: "Book a Pooja",
        user: req.user,
        error: null,
      });
    });

    test("should render 500 error page if exception occurs", () => {
      // Force render to throw error
      res.render.mockImplementation(() => {
        throw new Error("Render error");
      });

      poojaBookingController.showNew(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load pooja booking form",
      });
    });
  });
});
