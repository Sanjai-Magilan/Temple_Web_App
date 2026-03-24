jest.mock("../config/database", () => ({
  execute: jest.fn(),
}));

const newsController = require("../controllers/newsController");
const pool = require("../config/database");

const createRes = () => ({
  redirect: jest.fn().mockReturnThis(),
});

const createReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { id: 1 },
  flash: jest.fn(),
  ...overrides,
});

describe("News Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("createNews inserts a published news item and redirects to admin", async () => {
    const req = createReq({
      body: {
        title: "Special Pooja",
        content: "Festival starts at sunrise",
        published_date: "2026-04-15",
        published_time: "06:30",
      },
    });
    const res = createRes();

    pool.execute.mockResolvedValue([{}]);

    await newsController.createNews(req, res);

    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO news"),
      expect.arrayContaining(["Special Pooja", "Festival starts at sunrise"]),
    );
    expect(req.flash).toHaveBeenCalledWith("success", "News posted successfully");
    expect(res.redirect).toHaveBeenCalledWith("/admin");
  });

  test("deleteNews removes the record and redirects to admin", async () => {
    const req = createReq({ params: { id: "5" } });
    const res = createRes();

    pool.execute.mockResolvedValue([{}]);

    await newsController.deleteNews(req, res);

    expect(pool.execute).toHaveBeenCalledWith("DELETE FROM news WHERE id = ?", ["5"]);
    expect(req.flash).toHaveBeenCalledWith("success", "News deleted successfully");
    expect(res.redirect).toHaveBeenCalledWith("/admin");
  });

  test("createNews flashes an error when insertion fails", async () => {
    const req = createReq({
      body: { title: "Broken", content: "Error path" },
    });
    const res = createRes();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    pool.execute.mockRejectedValue(new Error("Insert failed"));

    await newsController.createNews(req, res);

    expect(req.flash).toHaveBeenCalledWith("error", "Failed to post news");
    expect(res.redirect).toHaveBeenCalledWith("/admin");

    consoleSpy.mockRestore();
  });
});
