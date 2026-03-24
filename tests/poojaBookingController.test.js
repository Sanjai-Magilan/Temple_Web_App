jest.mock("../models/poojaBookingModel", () => ({
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

const poojaBookingController = require("../controllers/poojaBookingController");
const poojaBookingModel = require("../models/poojaBookingModel");
const paymentModel = require("../models/paymentModel");
const bookingCache = require("../utils/bookingCache");
const pool = require("../config/database");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("Pooja Booking Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        first_name: "Test",
        last_name: "User",
      },
    };

    res = createRes();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("list", () => {
    test("redirects to /login if the user is not authenticated", async () => {
      req.user = null;

      await poojaBookingController.list(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(poojaBookingModel.getUserBookings).not.toHaveBeenCalled();
    });

    test("renders database and cached pending pooja bookings together", async () => {
      const dbBookings = [{ id: 1, pooja_name: "Abhishekam" }];
      const pendingPayments = [{ id: 31, order_id: "order_pooja_1" }];
      const cachedBooking = {
        user_id: 1,
        pooja_name: "Archana",
        status: "pending",
        cachedAt: new Date("2026-04-11T08:00:00.000Z"),
      };

      poojaBookingModel.getUserBookings.mockResolvedValue(dbBookings);
      paymentModel.getPendingPaymentsByType.mockResolvedValue(pendingPayments);
      bookingCache.get.mockReturnValue(cachedBooking);

      await poojaBookingController.list(req, res);

      expect(poojaBookingModel.getUserBookings).toHaveBeenCalledWith(1, 50, 0);
      expect(paymentModel.getPendingPaymentsByType).toHaveBeenCalledWith(
        1,
        "pooja_booking",
      );
      expect(res.render).toHaveBeenCalledWith(
        "bookings/pooja/list",
        expect.objectContaining({
          title: "Pooja Bookings",
          user: req.user,
          bookings: [
            {
              ...cachedBooking,
              id: "p-31",
              booking_number: "POOJA-PENDING-31",
              created_at: cachedBooking.cachedAt,
              payment_id: 31,
              is_cached: true,
            },
            ...dbBookings,
          ],
        }),
      );
    });

    test("renders the 500 page when loading bookings fails", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      poojaBookingModel.getUserBookings.mockRejectedValue(new Error("DB error"));

      await poojaBookingController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        title: "Server Error",
        message: "Failed to load pooja bookings",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("showNew", () => {
    test("redirects to /login if not authenticated", async () => {
      req.user = null;

      await poojaBookingController.showNew(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders the pooja booking form with the user's booking history", async () => {
      const bookings = [{ id: 1, pooja_name: "Abhishekam" }];

      poojaBookingModel.getUserBookings.mockResolvedValue(bookings);

      await poojaBookingController.showNew(req, res);

      expect(poojaBookingModel.getUserBookings).toHaveBeenCalledWith(1, 50, 0);
      expect(res.render).toHaveBeenCalledWith("bookings/pooja/new", {
        title: "Book a Pooja",
        user: req.user,
        bookings,
        error: null,
        booking: null,
      });
    });
  });

  describe("showContinue", () => {
    test("redirects to /login if not authenticated", async () => {
      req.user = null;
      req.params = { id: "1" };

      await poojaBookingController.showContinue(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    test("renders the pending cached booking", async () => {
      req.params = { id: "p-31" };

      paymentModel.findById.mockResolvedValue({
        id: 31,
        order_id: "order_pooja_31",
      });
      bookingCache.get.mockReturnValue({
        user_id: 1,
        status: "pending",
        pooja_name: "Archana",
        cachedAt: new Date("2026-04-11T08:00:00.000Z"),
      });

      await poojaBookingController.showContinue(req, res);

      expect(res.render).toHaveBeenCalledWith("bookings/pooja/new", {
        title: "Complete Pooja Booking",
        user: req.user,
        error: null,
        booking: expect.objectContaining({
          id: "p-31",
          booking_number: "POOJA-PENDING-31",
          payment_id: 31,
          is_cached: true,
        }),
      });
    });

    test("renders 404 when the booking is missing", async () => {
      req.params = { id: "88" };

      poojaBookingModel.findById.mockResolvedValue(null);

      await poojaBookingController.showContinue(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404", {
        title: "Not Found",
        message: "Booking not found",
      });
    });

    test("redirects back to the list when the booking is no longer pending", async () => {
      req.params = { id: "88" };

      poojaBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 1,
        status: "confirmed",
      });

      await poojaBookingController.showContinue(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/bookings/pooja");
    });
  });

  describe("continuePayment", () => {
    test("returns 401 when the user is not authenticated", async () => {
      req.user = null;
      req.params = { id: "1" };

      await poojaBookingController.continuePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });
    });

    test("returns the cached payment payload for a pending booking", async () => {
      process.env.RAZORPAY_KEY_ID = "rzp_test_key";
      req.params = { id: "p-31" };

      paymentModel.findById.mockResolvedValue({
        id: 31,
        order_id: "order_pooja_31",
        amount: 700,
      });
      bookingCache.get.mockReturnValue({
        id: "p-31",
        user_id: 1,
        status: "pending",
        booking_number: "PB-31",
      });

      await poojaBookingController.continuePayment(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        order_id: "order_pooja_31",
        amount: 700,
        key: "rzp_test_key",
        booking_id: "p-31",
        description: "Pooja booking PB-31",
      });
    });

    test("returns 400 when the booking is not pending", async () => {
      req.params = { id: "88" };

      poojaBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 1,
        status: "confirmed",
      });

      await poojaBookingController.continuePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Booking is not pending",
      });
    });

    test("returns 400 when payment is not initialized", async () => {
      req.params = { id: "88" };

      poojaBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 1,
        status: "pending",
        payment_id: null,
      });

      await poojaBookingController.continuePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Payment not initialized",
      });
    });
  });

  describe("cancelBooking", () => {
    test("returns 401 when the user is not authenticated", async () => {
      req.user = null;
      req.params = { id: "1" };

      await poojaBookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });
    });

    test("cancels a cached pending booking and removes the payment row", async () => {
      req.params = { id: "p-31" };

      paymentModel.findById.mockResolvedValue({
        id: 31,
        user_id: 1,
        order_id: "order_pooja_31",
      });

      await poojaBookingController.cancelBooking(req, res);

      expect(bookingCache.delete).toHaveBeenCalledWith("order_pooja_31");
      expect(pool.execute).toHaveBeenCalledWith(
        "DELETE FROM payments WHERE id = ?",
        ["31"],
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test("returns 403 when another user tries to cancel the booking", async () => {
      req.params = { id: "88" };

      poojaBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 2,
        status: "pending",
      });

      await poojaBookingController.cancelBooking(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized access",
      });
    });

    test("cancels a persisted pending booking", async () => {
      req.params = { id: "88" };

      poojaBookingModel.findById.mockResolvedValue({
        id: 88,
        user_id: 1,
        status: "pending",
      });
      poojaBookingModel.cancelBookingById.mockResolvedValue(1);

      await poojaBookingController.cancelBooking(req, res);

      expect(poojaBookingModel.cancelBookingById).toHaveBeenCalledWith("88");
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});
