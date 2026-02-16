/**
 * Pooja Booking Controller Tests
 */


jest.mock("../config/database", () => ({
  execute: jest.fn(),
  query: jest.fn(),
  getConnection: jest.fn(),
}));

const poojaBookingController = require("../controllers/poojaBookingController");
const poojaBookingModel = require("../models/poojaBookingModel");

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

  // ======================
  // list()
  // ======================
  describe("list()", () => {
    test("redirects to /login if user not authenticated", async () => {
      req.user = null;

      await poojaBookingController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(poojaBookingModel.getUserBookings).not.toHaveBeenCalled();
    });

    test("renders bookings list for authenticated user", async () => {
      const mockBookings = [{ id: 1 }, { id: 2 }];
      poojaBookingModel.getUserBookings.mockResolvedValue(mockBookings);

      await poojaBookingController.list(req, res);

      expect(poojaBookingModel.getUserBookings)
        .toHaveBeenCalledWith(1, 50, 0);

      expect(res.render).toHaveBeenCalledWith(
        "bookings/pooja/list",
        expect.objectContaining({
          title: "Pooja Bookings",
          bookings: mockBookings,
        }),
      );
    });

    test("renders 500 page when model throws error", async () => {
      poojaBookingModel.getUserBookings.mockRejectedValue(
        new Error("DB error"),
      );

      await poojaBookingController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        "errors/500",
        expect.any(Object),
      );
    });
  });

  // ======================
  // showNew()
  // ======================
  describe("showNew()", () => {
    test("redirects to /login if not authenticated", () => {
      req.user = null;

      poojaBookingController.showNew(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders pooja booking form", () => {
      poojaBookingController.showNew(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "bookings/pooja/new",
        expect.objectContaining({
          title: "Book a Pooja",
        }),
      );
    });
  });
});