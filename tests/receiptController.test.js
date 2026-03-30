jest.mock("../models/donationModel", () => ({
  getReceiptData: jest.fn(),
}));

jest.mock("../models/hallBookingModel", () => ({
  getReceiptData: jest.fn(),
}));

jest.mock("../models/poojaBookingModel", () => ({
  getReceiptData: jest.fn(),
}));

jest.mock("../utils/receiptService", () => ({
  ensureReceiptJsonFromRecord: jest.fn(),
}));

jest.mock("../utils/receiptPdf", () => ({
  renderReceiptPdf: jest.fn(),
}));

const receiptController = require("../controllers/receiptController");
const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");
const receiptService = require("../utils/receiptService");
const receiptPdf = require("../utils/receiptPdf");

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  render: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  end: jest.fn(),
});

describe("Receipt Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("downloadDonationReceipt renders 400 for an invalid receipt id", async () => {
    const req = { params: { id: "abc" }, user: { id: 1, role: "user" } };
    const res = createRes();

    await receiptController.downloadDonationReceipt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/400", {
      title: "Bad Request",
      message: "Invalid receipt request.",
    });
  });

  test("downloadDonationReceipt streams a generated PDF for the owner", async () => {
    const req = { params: { id: "15" }, user: { id: 1, role: "user" } };
    const res = createRes();
    const record = { id: 15, user_id: 1, payment_status: "completed" };
    const receipt = { receipt_number: "DON-15" };
    const pdfBuffer = Buffer.from("%PDF test");

    donationModel.getReceiptData.mockResolvedValue(record);
    receiptService.ensureReceiptJsonFromRecord.mockResolvedValue(receipt);
    receiptPdf.renderReceiptPdf.mockResolvedValue(pdfBuffer);

    await receiptController.downloadDonationReceipt(req, res);

    expect(receiptService.ensureReceiptJsonFromRecord).toHaveBeenCalledWith(
      "donation",
      record,
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.end).toHaveBeenCalledWith(pdfBuffer);
  });

  test("downloadHallReceipt renders 403 when a user lacks access", async () => {
    const req = { params: { id: "20" }, user: { id: 1, role: "user" } };
    const res = createRes();

    hallBookingModel.getReceiptData.mockResolvedValue({
      id: 20,
      user_id: 2,
      payment_status: "completed",
    });

    await receiptController.downloadHallReceipt(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", {
      title: "Forbidden",
      message: "You do not have permission to access this receipt.",
    });
  });

  test("downloadPoojaReceipt renders 404 when the receipt is missing", async () => {
    const req = { params: { id: "99" }, user: { id: 1, role: "admin" } };
    const res = createRes();

    poojaBookingModel.getReceiptData.mockResolvedValue(null);

    await receiptController.downloadPoojaReceipt(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/404", {
      title: "Not Found",
      message: "Receipt not found.",
    });
  });
});
