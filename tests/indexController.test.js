jest.mock("../config/database", () => ({
  execute: jest.fn(),
}));

const indexController = require("../controllers/indexController");
const pool = require("../config/database");

const createRes = () => ({
  render: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
});

describe("Index Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("renders the home page with latest news", async () => {
    const req = { user: { id: 1, first_name: "Test" } };
    const res = createRes();
    const latestNews = [{ id: 1, title: "Festival Notice" }];

    pool.execute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([latestNews]);

    await indexController.home(req, res);

    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM news WHERE published_at < NOW()",
    );
    expect(res.render).toHaveBeenCalledWith("index", {
      title: "Welcome to Temple Management System",
      message:
        "Experience the divine with our comprehensive temple management services. Please login or register to continue.",
      user: req.user,
      latestNews,
    });
  });

  test("renders the 500 page when loading the home page fails", async () => {
    const req = { user: null };
    const res = createRes();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    pool.execute.mockRejectedValue(new Error("DB Error"));

    await indexController.home(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("errors/500", {
      title: "Server Error",
      message: "Failed to load home page",
    });

    consoleSpy.mockRestore();
  });
});
