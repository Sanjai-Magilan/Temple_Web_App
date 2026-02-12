/**
 * Hall Booking Controller Tests
 */

jest.mock("../models/hallBookingModel");

const hallBookingController = require("../controllers/hallBookingController");
const hallBookingModel = require("../models/hallBookingModel");

// ---- Mock Response ----
const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

// ---- Mock Request ----
const mockRequest = (data = {}) => ({
  user: null,
  ...data,
});

describe("Hall Booking Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================
  // LIST BOOKINGS
  // =========================
  describe("list()", () => {
    test("should redirect to /login if user not authenticated", async () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();

      await hallBookingController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("should fetch bookings and render list page", async () => {
      const mockBookings = [
        { id: 1, hall_name: "Main Hall" },
        { id: 2, hall_name: "Conference Hall" },
      ];

      hallBookingModel.getUserBookings.mockResolvedValue(mockBookings);

      const req = mockRequest({
        user: { id: 10, name: "Test User" },
      });
      const res = mockResponse();

      await hallBookingController.list(req, res);

      expect(hallBookingModel.getUserBookings).toHaveBeenCalledWith(10, 50, 0);

      expect(res.render).toHaveBeenCalledWith("bookings/hall/list", {
        title: "Hall Bookings",
        user: req.user,
        bookings: mockBookings,
      });
    });

    test("should render 500 page if error occurs in list()", async () => {
      hallBookingModel.getUserBookings.mockRejectedValue(
        new Error("DB Error")
      );

      const req = mockRequest({
        user: { id: 10 },
      });
      const res = mockResponse();

      await hallBookingController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load hall bookings",
      });
    });
  });

  // =========================
// SHOW NEW BOOKING FORM
// =========================
describe("showNew()", () => {
  test("should redirect to /login if user not authenticated", () => {
    const req = mockRequest({ user: null });
    const res = mockResponse();

    hallBookingController.showNew(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/login");
  });

  test("should render new booking form if authenticated", () => {
    const req = mockRequest({
      user: { id: 10, name: "Test User" },
    });
    const res = mockResponse();

    hallBookingController.showNew(req, res);

    expect(res.render).toHaveBeenCalledWith("bookings/hall/new", {
      title: "Book a Hall",
      user: req.user,
      error: null,
    });
  });
});
});
