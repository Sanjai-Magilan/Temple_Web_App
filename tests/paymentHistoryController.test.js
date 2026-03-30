jest.mock("../models/paymentModel", () => ({
  getAllPayments: jest.fn(),
}));

const paymentHistoryController = require("../controllers/admin/paymentHistoryController");
const paymentModel = require("../models/paymentModel");

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  render: jest.fn().mockReturnThis(),
});

describe("Payment History Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("renders 403 for non-admin users", async () => {
    const req = { user: { id: 1, role: "user" }, query: {} };
    const res = createRes();

    await paymentHistoryController.paymentHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith("errors/403", {
      title: "Forbidden",
      message: "Admin access required",
    });
  });

  test("renders paginated payment history for admins", async () => {
    const req = {
      user: { id: 1, role: "admin" },
      query: { page: "2", sort: "amount", order: "ASC", search: "ram" },
    };
    const res = createRes();

    paymentModel.getAllPayments.mockResolvedValue({
      payments: [
        {
          id: 1,
          created_at: "2026-03-20T10:30:00.000Z",
          booking_date: "2026-04-01",
        },
      ],
      totalCount: 13,
    });

    await paymentHistoryController.paymentHistory(req, res);

    expect(paymentModel.getAllPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "ram",
        sort: "amount",
        order: "ASC",
        limit: 12,
        offset: 12,
      }),
    );
    expect(res.render).toHaveBeenCalledWith(
      "admin/payment-history/payment-history",
      expect.objectContaining({
        title: "Payment History",
        user: req.user,
        currentPage: 2,
        totalPages: 2,
      }),
    );
  });
});
