jest.mock("../config/database", () => ({
  execute: jest.fn(),
}));

const bookingController = require("../controllers/admin/bookingController");
const pool = require("../config/database");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
});

describe("Admin Booking Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("renders the manage bookings page with hall and pooja data", async () => {
    const req = {
      query: {},
      headers: {},
      xhr: false,
    };
    const res = createRes();

    pool.execute
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ count: 1 }]])
      .mockResolvedValueOnce([[{ id: 11, hall_name: "Main Hall" }]])
      .mockResolvedValueOnce([[{ id: 21, pooja_name: "Archana" }]]);

    await bookingController.list(req, res);

    expect(res.render).toHaveBeenCalledWith(
      "admin/manage_booking/manage_booking",
      expect.objectContaining({
        title: "Manage Bookings",
        hallBookings: [{ id: 11, hall_name: "Main Hall" }],
        poojaBookings: [{ id: 21, pooja_name: "Archana" }],
        activeTab: "hall",
      }),
    );
  });

  test("renders the 500 page when listing bookings fails", async () => {
    const req = {
      query: {},
      headers: {},
      xhr: false,
    };
    const res = createRes();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    pool.execute.mockRejectedValue(new Error("DB Error"));

    await bookingController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/500", {
      title: "Server Error",
      message: "Failed to load bookings",
    });

    consoleSpy.mockRestore();
  });
});
