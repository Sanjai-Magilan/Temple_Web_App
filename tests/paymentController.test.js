jest.mock("../config/razorpay", () => ({
  orders: {
    create: jest.fn(),
  },
  payments: {
    fetch: jest.fn(),
  },
  verifyPaymentSignature: jest.fn(),
  verifyWebhookSignature: jest.fn(),
}));

jest.mock("../models/paymentModel", () => ({
  create: jest.fn(),
  findByPaymentId: jest.fn(),
  findByOrderId: jest.fn(),
  updateByOrderId: jest.fn(),
  update: jest.fn(),
}));

jest.mock("../models/donationModel", () => ({
  create: jest.fn(),
}));

jest.mock("../models/hallBookingModel", () => ({
  create: jest.fn(),
  findById: jest.fn(),
  hasConfirmedOverlap: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock("../models/poojaBookingModel", () => ({
  create: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock("../utils/receiptService", () => ({
  ensureDonationReceiptJsonById: jest.fn(),
  ensureHallReceiptJsonById: jest.fn(),
  ensurePoojaReceiptJsonById: jest.fn(),
}));

jest.mock("../utils/bookingCache", () => ({
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
}));

const razorpay = require("../config/razorpay");
const paymentModel = require("../models/paymentModel");
const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");
const receiptService = require("../utils/receiptService");
const bookingCache = require("../utils/bookingCache");

const paymentController = require("../controllers/paymentController");

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  render: jest.fn(),
});

describe("Payment Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";

    req = {
      user: { id: 1 },
      body: {},
      query: {},
      headers: {},
    };

    res = createRes();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createDonationOrder", () => {
    test("returns 401 when user is not logged in", async () => {
      req.user = null;

      await paymentController.createDonationOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Please login to make a donation",
      });
    });

    test("returns 400 when donation amount exceeds the configured limit", async () => {
      req.body = { amount: "500001" };

      await paymentController.createDonationOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(razorpay.orders.create).not.toHaveBeenCalled();
      expect(paymentModel.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Donation amount cannot exceed ₹5,00,000",
      });
    });

    test("creates a donation order and stores a pending payment record", async () => {
      req.body = {
        amount: "500",
        donation_type: "annadanam",
        purpose: "Festival",
        is_anonymous: true,
      };
      razorpay.orders.create.mockResolvedValue({ id: "order_donation_1" });

      await paymentController.createDonationOrder(req, res);

      expect(razorpay.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000,
          currency: "INR",
          notes: {
            payment_type: "donation",
            user_id: 1,
            donation_type: "annadanam",
            purpose: "Festival",
            is_anonymous: 1,
          },
        }),
      );
      expect(paymentModel.create).toHaveBeenCalledWith({
        order_id: "order_donation_1",
        user_id: 1,
        family_id: null,
        amount: 500,
        currency: "INR",
        status: "pending",
        payment_type: "donation",
      });
      expect(donationModel.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        order_id: "order_donation_1",
        amount: 500,
        key: "rzp_test_key",
      });
    });

    test("maps Razorpay amount limit errors to a 400 response", async () => {
      req.body = { amount: "600" };
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      razorpay.orders.create.mockRejectedValue({
        error: {
          code: "BAD_REQUEST_ERROR",
          description: "Amount exceeds maximum amount allowed",
        },
      });

      await paymentController.createDonationOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Check the amount please",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("createHallBookingOrder", () => {
    test("returns 400 when required fields are missing", async () => {
      req.body = {
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
      };

      await paymentController.createHallBookingOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing required fields",
      });
    });

    test("returns 400 when hall booking amount exceeds the configured limit", async () => {
      req.body = {
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
        amount: "50001",
      };

      await paymentController.createHallBookingOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(hallBookingModel.hasConfirmedOverlap).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Hall booking amount cannot exceed ₹50,000",
      });
    });

    test("blocks creation when the selected slot already has a confirmed booking", async () => {
      req.body = {
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
        amount: "1000",
      };
      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(true);

      await paymentController.createHallBookingOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Selected time slot is already booked.",
      });
      expect(razorpay.orders.create).not.toHaveBeenCalled();
    });

    test("creates a hall booking order and caches the pending booking data", async () => {
      req.body = {
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
        event_type: "Wedding",
        event_description: "Morning ceremony",
        expected_guests: "150",
        amount: "1200",
        food_required: "yes",
        food_meals: "breakfast,lunch",
      };
      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(false);
      razorpay.orders.create.mockResolvedValue({ id: "order_hall_1" });

      await paymentController.createHallBookingOrder(req, res);

      expect(paymentModel.create).toHaveBeenCalledWith({
        order_id: "order_hall_1",
        user_id: 1,
        family_id: null,
        amount: 1200,
        currency: "INR",
        status: "pending",
        payment_type: "hall_booking",
      });
      expect(bookingCache.set).toHaveBeenCalledWith("order_hall_1", {
        user_id: 1,
        family_id: null,
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
        event_type: "Wedding",
        event_description: "Morning ceremony",
        expected_guests: "150",
        food_required: 1,
        food_meals: "breakfast, lunch",
        amount: 1200,
        status: "pending",
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        order_id: "order_hall_1",
        amount: 1200,
        key: "rzp_test_key",
      });
    });
  });

  describe("createPoojaBookingOrder", () => {
    test("returns 400 when required fields are missing", async () => {
      req.body = {
        pooja_name: "Abhishekam",
        booking_date: "2026-04-10",
      };

      await paymentController.createPoojaBookingOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing required fields",
      });
    });

    test("creates a pooja booking order and caches the booking details", async () => {
      req.body = {
        pooja_name: "Abhishekam",
        pooja_type: "Special",
        booking_date: "2026-04-10",
        booking_time: "09:00",
        devotee_name: "Miruthul",
        gotra: "Kashyapa",
        nakshatra: "Ashwini",
        special_instructions: "Bring prasadam",
        amount: "500",
      };
      razorpay.orders.create.mockResolvedValue({ id: "order_pooja_1" });

      await paymentController.createPoojaBookingOrder(req, res);

      expect(paymentModel.create).toHaveBeenCalledWith({
        order_id: "order_pooja_1",
        user_id: 1,
        family_id: null,
        amount: 500,
        currency: "INR",
        status: "pending",
        payment_type: "pooja_booking",
      });
      expect(bookingCache.set).toHaveBeenCalledWith("order_pooja_1", {
        user_id: 1,
        family_id: null,
        pooja_name: "Abhishekam",
        pooja_type: "Special",
        booking_date: "2026-04-10",
        booking_time: "09:00",
        devotee_name: "Miruthul",
        gotra: "Kashyapa",
        nakshatra: "Ashwini",
        special_instructions: "Bring prasadam",
        amount: 500,
        status: "pending",
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        order_id: "order_pooja_1",
        amount: 500,
        key: "rzp_test_key",
      });
    });
  });

  describe("verifyPayment", () => {
    test("returns 401 when user is not authenticated", async () => {
      req.user = null;

      await paymentController.verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });
    });

    test("returns 400 when payment details are missing", async () => {
      req.body = { order_id: "order_1" };

      await paymentController.verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing payment details",
      });
    });

    test("rejects invalid payment signatures", async () => {
      req.body = {
        order_id: "order_1",
        payment_id: "pay_1",
        signature: "bad_sig",
      };
      razorpay.verifyPaymentSignature.mockReturnValue(false);

      await paymentController.verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid payment signature",
      });
    });

    test("handles already-completed donation payments idempotently", async () => {
      req.body = {
        order_id: "order_1",
        payment_id: "pay_1",
        signature: "valid_sig",
      };
      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue({
        id: 41,
        user_id: 1,
        payment_type: "donation",
        amount: 500,
        status: "completed",
        family_id: null,
      });
      donationModel.create.mockResolvedValue({ id: 91 });

      await paymentController.verifyPayment(req, res);

      expect(donationModel.create).toHaveBeenCalledWith({
        user_id: 1,
        family_id: null,
        amount: 500,
        donation_type: "general",
        purpose: null,
        payment_id: 41,
        is_anonymous: 0,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Payment already processed",
        payment: expect.objectContaining({
          id: 41,
          payment_type: "donation",
        }),
      });
    });

    test("returns 502 when Razorpay does not return a usable payment status", async () => {
      req.body = {
        order_id: "order_1",
        payment_id: "pay_1",
        signature: "valid_sig",
      };
      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({});

      await paymentController.verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unable to fetch payment status from Razorpay",
      });
    });

    test("returns 404 when no payment order exists for the given order id", async () => {
      req.body = {
        order_id: "order_missing",
        payment_id: "pay_1",
        signature: "valid_sig",
      };
      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({
        status: "captured",
        method: "upi",
      });
      paymentModel.findByOrderId.mockResolvedValue(null);

      await paymentController.verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Payment order not found",
      });
    });

    test("creates a donation record after a captured donation payment", async () => {
      req.body = {
        order_id: "order_donation_1",
        payment_id: "pay_1",
        signature: "valid_sig",
      };
      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({
        status: "captured",
        method: "upi",
        notes: {
          donation_type: "annadanam",
          purpose: "Temple festival",
          is_anonymous: 1,
        },
      });
      paymentModel.findByOrderId.mockResolvedValue({
        id: 55,
        user_id: 1,
        family_id: null,
        amount: 700,
        payment_type: "donation",
        related_id: null,
      });
      donationModel.create.mockResolvedValue({ id: 101 });

      await paymentController.verifyPayment(req, res);

      expect(paymentModel.updateByOrderId).toHaveBeenCalledWith(
        "order_donation_1",
        "pay_1",
        {
          payment_method: "upi",
          status: "completed",
          razorpay_response: expect.objectContaining({
            status: "captured",
          }),
        },
      );
      expect(donationModel.create).toHaveBeenCalledWith({
        user_id: 1,
        family_id: null,
        amount: 700,
        donation_type: "annadanam",
        purpose: "Temple festival",
        payment_id: 55,
        is_anonymous: 1,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Payment verified successfully",
        payment_id: "pay_1",
        status: "completed",
      });
    });

    test("creates a hall booking from cached data after a captured payment", async () => {
      req.body = {
        order_id: "order_hall_1",
        payment_id: "pay_2",
        signature: "valid_sig",
      };
      const cachedBooking = {
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
        amount: 1200,
      };

      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({
        status: "captured",
        method: "card",
      });
      paymentModel.findByOrderId.mockResolvedValue({
        id: 77,
        payment_type: "hall_booking",
        related_id: null,
      });
      bookingCache.get.mockReturnValue(cachedBooking);
      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(false);
      hallBookingModel.create.mockResolvedValue({ id: 501 });

      await paymentController.verifyPayment(req, res);

      expect(hallBookingModel.create).toHaveBeenCalledWith({
        ...cachedBooking,
        payment_id: 77,
        status: "confirmed",
      });
      expect(bookingCache.delete).toHaveBeenCalledWith("order_hall_1");
      expect(receiptService.ensureHallReceiptJsonById).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Payment verified successfully",
        payment_id: "pay_2",
        status: "completed",
      });
    });

    test("returns 409 when a cached hall booking becomes conflicting during payment verification", async () => {
      req.body = {
        order_id: "order_hall_conflict",
        payment_id: "pay_3",
        signature: "valid_sig",
      };
      const cachedBooking = {
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
      };

      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({
        status: "captured",
        method: "upi",
      });
      paymentModel.findByOrderId.mockResolvedValue({
        id: 78,
        payment_type: "hall_booking",
        related_id: null,
      });
      bookingCache.get.mockReturnValue(cachedBooking);
      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(true);

      await paymentController.verifyPayment(req, res);

      expect(hallBookingModel.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Time slot already booked. Payment received; please contact admin.",
      });
    });

    test("confirms an existing pooja booking and generates its receipt", async () => {
      req.body = {
        order_id: "order_pooja_1",
        payment_id: "pay_4",
        signature: "valid_sig",
      };

      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({
        status: "captured",
        method: "netbanking",
      });
      paymentModel.findByOrderId.mockResolvedValue({
        id: 79,
        payment_type: "pooja_booking",
        related_id: 601,
      });

      await paymentController.verifyPayment(req, res);

      expect(poojaBookingModel.updateStatus).toHaveBeenCalledWith(601, "confirmed");
      expect(receiptService.ensurePoojaReceiptJsonById).toHaveBeenCalledWith(601);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Payment verified successfully",
        payment_id: "pay_4",
        status: "completed",
      });
    });

    test("marks the payment as failed when Razorpay payment is not captured", async () => {
      req.body = {
        order_id: "order_5",
        payment_id: "pay_5",
        signature: "valid_sig",
      };
      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      razorpay.payments.fetch.mockResolvedValue({
        status: "authorized",
        method: "upi",
      });
      paymentModel.findByOrderId.mockResolvedValue({
        id: 80,
        payment_type: "pooja_booking",
        related_id: 602,
      });

      await paymentController.verifyPayment(req, res);

      expect(paymentModel.updateByOrderId).toHaveBeenCalledWith("order_5", "pay_5", {
        payment_method: "upi",
        status: "failed",
        razorpay_response: expect.objectContaining({
          status: "authorized",
        }),
      });
      expect(poojaBookingModel.updateStatus).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Payment verified successfully",
        payment_id: "pay_5",
        status: "failed",
      });
    });
  });

  describe("handleWebhook", () => {
    test("rejects invalid webhook signatures", async () => {
      req.headers["x-razorpay-signature"] = "bad_sig";
      req.body = { event: "payment.captured" };
      razorpay.verifyWebhookSignature.mockReturnValue(false);

      await paymentController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid webhook signature",
      });
    });

    test("returns success when a captured payment is not found in the local database", async () => {
      req.headers["x-razorpay-signature"] = "good_sig";
      req.body = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: { id: "pay_missing" },
          },
        },
      };
      razorpay.verifyWebhookSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await paymentController.handleWebhook(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      consoleSpy.mockRestore();
    });

    test("creates a donation during webhook retry for an already-completed donation payment", async () => {
      req.headers["x-razorpay-signature"] = "good_sig";
      req.body = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_done",
              notes: {
                donation_type: "general",
              },
            },
          },
        },
      };
      razorpay.verifyWebhookSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue({
        id: 90,
        user_id: 1,
        family_id: null,
        amount: 300,
        payment_type: "donation",
        status: "completed",
      });
      donationModel.create.mockResolvedValue({ id: 901 });

      await paymentController.handleWebhook(req, res);

      expect(donationModel.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Payment already processed",
      });
    });

    test("creates a hall booking from cached data for a captured webhook payment", async () => {
      req.headers["x-razorpay-signature"] = "good_sig";
      req.body = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_hall_webhook",
              method: "upi",
            },
          },
        },
      };
      const existingPayment = {
        id: 91,
        payment_type: "hall_booking",
        status: "pending",
        order_id: "order_hall_webhook",
        related_id: null,
      };
      const updatedPayment = {
        id: 91,
        payment_type: "hall_booking",
        status: "completed",
        order_id: "order_hall_webhook",
        related_id: null,
      };
      bookingCache.get.mockReturnValue({
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
      });
      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(false);
      hallBookingModel.create.mockResolvedValue({ id: 701 });
      razorpay.verifyWebhookSignature.mockReturnValue(true);
      paymentModel.findByPaymentId
        .mockResolvedValueOnce(existingPayment)
        .mockResolvedValueOnce(updatedPayment);

      await paymentController.handleWebhook(req, res);

      expect(paymentModel.update).toHaveBeenCalledWith("pay_hall_webhook", {
        payment_method: "upi",
        status: "completed",
        razorpay_response: expect.objectContaining({
          id: "pay_hall_webhook",
        }),
      });
      expect(hallBookingModel.create).toHaveBeenCalledWith({
        hall_name: "Main Hall",
        booking_date: "2026-04-10",
        start_time: "10:00",
        end_time: "12:00",
        payment_id: 91,
        status: "confirmed",
      });
      expect(bookingCache.delete).toHaveBeenCalledWith("order_hall_webhook");
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe("paymentSuccess", () => {
    test("renders a 400 page when both payment_id and order_id are missing", async () => {
      await paymentController.paymentSuccess(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/400", {
        title: "Bad Request",
        message: "Payment ID or Order ID is required.",
      });
    });

    test("renders the success page when a payment is looked up by order id", async () => {
      req.query = { order_id: "order_1" };
      paymentModel.findByOrderId.mockResolvedValue({ status: "completed" });

      await paymentController.paymentSuccess(req, res);

      expect(paymentModel.findByOrderId).toHaveBeenCalledWith("order_1");
      expect(res.render).toHaveBeenCalledWith("payment/success", {
        title: "Payment Success",
        payment_id: null,
        order_id: "order_1",
        paymentDetails: { status: "completed" },
      });
    });
  });

  describe("paymentFailure", () => {
    test("renders the failure page with a default error message", async () => {
      req.query = { payment_id: "pay_123", order_id: "order_123" };

      await paymentController.paymentFailure(req, res);

      expect(res.render).toHaveBeenCalledWith("payment/failure", {
        title: "Payment Failed",
        payment_id: "pay_123",
        order_id: "order_123",
        error: "Payment could not be processed.",
      });
    });
  });
});
