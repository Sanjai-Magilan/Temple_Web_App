jest.mock("../models/donationModel", () => ({
  updateReceiptJson: jest.fn(),
  getReceiptData: jest.fn(),
}));

jest.mock("../models/hallBookingModel", () => ({
  updateReceiptJson: jest.fn(),
  getReceiptData: jest.fn(),
}));

jest.mock("../models/poojaBookingModel", () => ({
  updateReceiptJson: jest.fn(),
  getReceiptData: jest.fn(),
}));

const receiptService = require("../utils/receiptService");
const donationModel = require("../models/donationModel");
const hallBookingModel = require("../models/hallBookingModel");
const poojaBookingModel = require("../models/poojaBookingModel");

describe("Receipt Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TEMPLE_NAME = "Sri Temple";
    process.env.TEMPLE_ADDRESS = "Temple Street";
    process.env.TEMPLE_PHONE = "1234567890";
    process.env.TEMPLE_EMAIL = "info@temple.test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("returns the existing parsed receipt JSON when present", async () => {
    const record = {
      id: 1,
      receipt_json: JSON.stringify({ receipt_number: "DON-1" }),
    };

    const result = await receiptService.ensureReceiptJsonFromRecord("donation", record);

    expect(result).toEqual({ receipt_number: "DON-1" });
    expect(donationModel.updateReceiptJson).not.toHaveBeenCalled();
  });

  test("builds and persists a hall booking receipt from record data", async () => {
    const record = {
      id: 2,
      user_id: 11,
      booking_number: "HB-2",
      hall_name: "Main Hall",
      booking_date: "2026-05-01",
      start_time: "09:00",
      end_time: "11:00",
      event_type: "Wedding",
      expected_guests: 150,
      event_description: "Ceremony",
      food_required: 1,
      food_meals: "breakfast, lunch",
      first_name: "Ravi",
      last_name: "Kumar",
      email: "ravi@test.com",
      phone: "9999999999",
      payment_amount: 5000,
      payment_status: "completed",
      payment_method: "upi",
      razorpay_payment_id: "pay_123",
      order_id: "order_123",
      created_at: "2026-04-01T10:00:00.000Z",
    };

    const result = await receiptService.ensureReceiptJsonFromRecord(
      "hall_booking",
      record,
    );

    expect(hallBookingModel.updateReceiptJson).toHaveBeenCalledWith(2, result);
    expect(result).toEqual(
      expect.objectContaining({
        receipt_type: "hall_booking",
        receipt_number: "HB-2",
        temple: expect.objectContaining({ name: "Sri Temple" }),
        payer: expect.objectContaining({ name: "Ravi Kumar" }),
        payment: expect.objectContaining({ amount: 5000, status: "completed" }),
        details: expect.objectContaining({
          hall_name: "Main Hall",
          food_meals: ["breakfast", "lunch"],
        }),
      }),
    );
  });

  test("returns null when no donation receipt record exists", async () => {
    donationModel.getReceiptData.mockResolvedValue(null);

    const result = await receiptService.ensureDonationReceiptJsonById(99);

    expect(result).toBeNull();
  });

  test("loads and persists a pooja receipt by booking id", async () => {
    poojaBookingModel.getReceiptData.mockResolvedValue({
      id: 3,
      user_id: 9,
      booking_number: "PB-3",
      pooja_name: "Archana",
      pooja_type: "Daily",
      booking_date: "2026-05-10",
      booking_time: "07:30",
      devotee_name: "Lakshmi",
      gotra: "Bharadwaja",
      nakshatra: "Rohini",
      special_instructions: "Flowers",
      first_name: "Lakshmi",
      last_name: "",
      amount: 750,
      payment_status: "completed",
      created_at: "2026-04-10T10:00:00.000Z",
    });

    const result = await receiptService.ensurePoojaReceiptJsonById(3);

    expect(poojaBookingModel.updateReceiptJson).toHaveBeenCalledWith(3, result);
    expect(result.details).toEqual(
      expect.objectContaining({
        pooja_name: "Archana",
        devotee_name: "Lakshmi",
      }),
    );
  });
});
