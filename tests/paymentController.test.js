/**
 * Payment Controller – Jest Tests
 */

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

jest.mock("../models/paymentModel");
jest.mock("../models/donationModel");
jest.mock("../models/hallBookingModel");
jest.mock("../models/poojaBookingModel");

const razorpay = require("../config/razorpay");
const paymentModel = require("../models/paymentModel");
const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");

const paymentController = require("../controllers/paymentController");

describe("Payment Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {},
      query: {},
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn(),
    };

    jest.clearAllMocks();
  });

  /* ----------------------------------
   * CREATE DONATION ORDER
   * ---------------------------------- */
  describe("createDonationOrder", () => {
    test("should return 401 if user not logged in", async () => {
      req.user = null;

      await paymentController.createDonationOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should create donation order successfully", async () => {
      req.body = { amount: 500 };

      razorpay.orders.create.mockResolvedValue({ id: "order_123" });
      paymentModel.create.mockResolvedValue(10);
      donationModel.create.mockResolvedValue({
        id: 5,
        receipt_number: "DON-001",
      });

      await paymentController.createDonationOrder(req, res);

      expect(razorpay.orders.create).toHaveBeenCalled();
      expect(paymentModel.create).toHaveBeenCalled();
      expect(donationModel.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  /* ----------------------------------
   * CREATE HALL BOOKING ORDER
   * ---------------------------------- */
  describe("createHallBookingOrder", () => {
    test("should block overlapping booking", async () => {
      req.body = {
        hall_name: "Main Hall",
        booking_date: "2026-02-10",
        start_time: "10:00",
        end_time: "12:00",
        amount: 1000,
      };

      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(true);

      await paymentController.createHallBookingOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    test("should create hall booking order successfully", async () => {
      req.body = {
        hall_name: "Main Hall",
        booking_date: "2026-02-10",
        start_time: "10:00",
        end_time: "12:00",
        amount: 1000,
      };

      hallBookingModel.hasConfirmedOverlap.mockResolvedValue(false);
      razorpay.orders.create.mockResolvedValue({ id: "order_hall" });
      paymentModel.create.mockResolvedValue(20);
      hallBookingModel.create.mockResolvedValue({
        id: 7,
        booking_number: "HALL-001",
      });

      await paymentController.createHallBookingOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  /* ----------------------------------
   * CREATE POOJA BOOKING ORDER
   * ---------------------------------- */
  describe("createPoojaBookingOrder", () => {
    test("should create pooja booking order", async () => {
      req.body = {
        pooja_name: "Abhishekam",
        booking_date: "2026-02-10",
        booking_time: "09:00",
        devotee_name: "Miruthul",
        amount: 500,
      };

      razorpay.orders.create.mockResolvedValue({ id: "order_pooja" });
      paymentModel.create.mockResolvedValue(30);
      poojaBookingModel.create.mockResolvedValue({
        id: 9,
        booking_number: "POOJA-001",
      });

      await paymentController.createPoojaBookingOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  /* ----------------------------------
   * VERIFY PAYMENT
   * ---------------------------------- */
  describe("verifyPayment", () => {
    test("should reject invalid signature", async () => {
      req.body = {
        order_id: "order_1",
        payment_id: "pay_1",
        signature: "invalid",
      };

      razorpay.verifyPaymentSignature.mockReturnValue(false);

      await paymentController.verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should verify and complete payment", async () => {
      req.body = {
        order_id: "order_1",
        payment_id: "pay_1",
        signature: "valid",
      };

      razorpay.verifyPaymentSignature.mockReturnValue(true);
      paymentModel.findByPaymentId.mockResolvedValue(null);
      paymentModel.findByOrderId.mockResolvedValue({
        related_id: 5,
        payment_type: "pooja_booking",
      });

      razorpay.payments.fetch.mockResolvedValue({
        status: "captured",
        method: "upi",
      });

      await paymentController.verifyPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  /* ----------------------------------
   * PAYMENT SUCCESS PAGE
   * ---------------------------------- */
  describe("paymentSuccess", () => {
    test("should render success page", async () => {
      req.query = { payment_id: "pay_123" };
      paymentModel.findByPaymentId.mockResolvedValue({ status: "completed" });

      await paymentController.paymentSuccess(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "payment/success",
        expect.any(Object),
      );
    });
  });

  /* ----------------------------------
   * PAYMENT FAILURE PAGE
   * ---------------------------------- */
  describe("paymentFailure", () => {
    test("should render failure page", async () => {
      req.query = { payment_id: "pay_123" };

      await paymentController.paymentFailure(req, res);

      expect(res.render).toHaveBeenCalledWith(
        "payment/failure",
        expect.any(Object),
      );
    });
  });
});