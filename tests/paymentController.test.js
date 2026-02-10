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

  
});