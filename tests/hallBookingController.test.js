jest.mock("../models/hallBookingModel", () => ({
  getUserBookings: jest.fn(),
  findById: jest.fn(),
  cancelBookingById: jest.fn(),
}));

jest.mock("../models/paymentModel", () => ({
  getPendingPaymentsByType: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../utils/bookingCache", () => ({
  get: jest.fn(),
  delete: jest.fn(),
}));

jest.mock("../config/database", () => ({
  execute: jest.fn(),
}));

const hallBookingController = require("../controllers/hallBookingController");
const hallBookingModel = require("../models/hallBookingModel");
const paymentModel = require("../models/paymentModel");
const bookingCache = require("../utils/bookingCache");
const pool = require("../config/database");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const createReq = (overrides = {}) => ({
  user: null,
  ...overrides,
});

describe("Hall Booking Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("list", () => {
    test("redirects to /login when the user is not authenticated", async () => {
      const req = createReq({ user: null });
      const res = createRes();

      await hallBookingController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders database and cached pending bookings together", async () => {
      const req = createReq({
        user: { id: 10, name: "Test User" },
      });
      const res = createRes();
      const dbBookings = [{ id: 1, hall_name: "Main Hall" }];
      const pendingPayments = [{ id: 21, order_id: "order_hall_1" }];
      const cachedBooking = {
        user_id: 10,
        hall_name: "Conference Hall",
        status: "pending",
        cachedAt: new Date("2026-04-10T10:00:00.000Z"),
      };

      hallBookingModel.getUserBookings.mockResolvedValue(dbBookings);
      paymentModel.getPendingPaymentsByType.mockResolvedValue(pendingPayments);
      bookingCache.get.mockReturnValue(cachedBooking);

      await hallBookingController.list(req, res);

      expect(hallBookingModel.getUserBookings).toHaveBeenCalledWith(10, 50, 0);
      expect(paymentModel.getPendingPaymentsByType).toHaveBeenCalledWith(
        10,
        "hall_booking",
      );
      expect(res.render).toHaveBeenCalledWith("bookings/hall/list", {
        title: "Hall Bookings",
        user: req.user,
        bookings: [
          {
            ...cachedBooking,
            id: "p-21",
            booking_number: "HALL-PENDING-21",
            created_at: cachedBooking.cachedAt,
            payment_id: 21,
            is_cached: true,
          },
          ...dbBookings,
        ],
      });
    });

    test("renders the 500 page when loading bookings fails", async () => {
      const req = createReq({
        user: { id: 10 },
      });
      const res = createRes();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      hallBookingModel.getUserBookings.mockRejectedValue(new Error("DB Error"));

      await hallBookingController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load hall bookings",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("showNew", () => {
    test("redirects to /login when the user is not authenticated", () => {
      const req = createReq({ user: null });
      const res = createRes();

      hallBookingController.showNew(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders the new booking form with an explicit null booking", () => {
      const req = createReq({
        user: { id: 10, name: "Test User" },
      });
      const res = createRes();

      hallBookingController.showNew(req, res);

      expect(res.render).toHaveBeenCalledWith("bookings/hall/new", {
        title: "Book a Hall",
        user: req.user,
        error: null,
        booking: null,
      });
    });
  });

  describe("showContinue", () => {
    test("redirects to /login when the user is not authenticated", async () => {
      const req = createReq({ user: null, params: { id: "1" } });
      const res = createRes();

      await hallBookingController.showContinue(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders a pending cached booking and parses food meals", async () => {
      const req = createReq({
        user: { id: 10, name: "Test User" },
        params: { id: "p-55" },
      });
      const res = createRes();

      paymentModel.findById.mockResolvedValue({
        id: 55,
        order_id: "order_hall_55",
      });
      bookingCache.get.mockReturnValue({
        user_id: 10,
        status: "pending",
        hall_name: "Annadanam Hall",
        food_meals: "breakfast, lunch",
        cachedAt: new Date("2026-04-12T09:00:00.000Z"),
      });

      await hallBookingController.showContinue(req, res);

      expect(res.render).toHaveBeenCalledWith("bookings/hall/new", {
        title: "Complete Hall Booking",
        user: req.user,
        error: null,
        booking: expect.objectContaining({
          id: "p-55",
          booking_number: "HALL-PENDING-55",
          payment_id: 55,
          is_cached: true,
          food_meals: ["breakfast", "lunch"],
        }),
      });
    });

    test("renders 403 when the booking belongs to another user", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "44" },
      });
      const res = createRes();

      hallBookingModel.findById.mockResolvedValue({
        id: 44,
        user_id: 99,
        status: "pending",
      });

      await hallBookingController.showContinue(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith("errors/403", {
        title: "Unauthorized",
        message: "You are not authorized to view this booking",
      });
    });

    test("redirects to the bookings list when the booking is not pending", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "44" },
      });
      const res = createRes();

      hallBookingModel.findById.mockResolvedValue({
        id: 44,
        user_id: 10,
        status: "confirmed",
      });

      await hallBookingController.showContinue(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/bookings/hall");
    });
  });

  describe("continuePayment", () => {
    test("returns 401 when the user is not authenticated", async () => {
      const req = createReq({ user: null, params: { id: "1" } });
      const res = createRes();

      await hallBookingController.continuePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });
    });

    test("returns the cached payment payload for a pending booking", async () => {
      process.env.RAZORPAY_KEY_ID = "rzp_test_key";

      const req = createReq({
        user: { id: 10 },
        params: { id: "p-55" },
      });
      const res = createRes();

      paymentModel.findById.mockResolvedValue({
        id: 55,
        order_id: "order_hall_55",
        amount: 2500,
      });
      bookingCache.get.mockReturnValue({
        user_id: 10,
        status: "pending",
        booking_number: "HB-55",
      });

      await hallBookingController.continuePayment(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        order_id: "order_hall_55",
        amount: 2500,
        key: "rzp_test_key",
        booking_id: "p-55",
        description: "Hall booking HB-55",
      });
    });

    test("returns 400 when payment is not initialized", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "88" },
      });
      const res = createRes();

      hallBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 10,
        status: "pending",
        payment_id: null,
      });

      await hallBookingController.continuePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Payment not initialized",
      });
    });

    test("returns 403 when another user tries to continue payment", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "88" },
      });
      const res = createRes();

      hallBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 77,
        status: "pending",
      });

      await hallBookingController.continuePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized access",
      });
    });
  });

  describe("cancelBooking", () => {
    test("cancels a cached pending booking and clears payment data", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "p-55" },
      });
      const res = createRes();

      paymentModel.findById.mockResolvedValue({
        id: 55,
        user_id: 10,
        order_id: "order_hall_55",
      });

      await hallBookingController.cancelBooking(req, res);

      expect(bookingCache.delete).toHaveBeenCalledWith("order_hall_55");
      expect(pool.execute).toHaveBeenCalledWith(
        "DELETE FROM payments WHERE id = ?",
        ["55"],
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test("cancels a persisted booking through the model", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "15" },
      });
      const res = createRes();

      hallBookingModel.cancelBookingById.mockResolvedValue(1);

      await hallBookingController.cancelBooking(req, res);

      expect(hallBookingModel.cancelBookingById).toHaveBeenCalledWith("15");
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test("returns 500 when cancellation fails unexpectedly", async () => {
      const req = createReq({
        user: { id: 10 },
        params: { id: "15" },
      });
      const res = createRes();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      hallBookingModel.cancelBookingById.mockRejectedValue(new Error("DB Error"));

      await hallBookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
      });

      consoleSpy.mockRestore();
    });
  });
});
