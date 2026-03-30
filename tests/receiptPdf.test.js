const mockRenderFile = jest.fn();
const mockLaunch = jest.fn();

jest.mock("ejs", () => ({
  renderFile: mockRenderFile,
}));

jest.mock("puppeteer", () => ({
  launch: mockLaunch,
}));

describe("Receipt PDF Utility", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("renders a receipt to PDF using a browser page", async () => {
    const page = {
      isClosed: jest.fn(() => false),
      setCacheEnabled: jest.fn(),
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from("%PDF receipt")),
      goto: jest.fn(),
      close: jest.fn(),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn(),
    };

    mockRenderFile.mockResolvedValue("<html>receipt</html>");
    mockLaunch.mockResolvedValue(browser);

    const receiptPdf = require("../utils/receiptPdf");
    const result = await receiptPdf.renderReceiptPdf({ receipt_number: "R-1" });

    expect(mockRenderFile).toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalled();
    expect(browser.newPage).toHaveBeenCalled();
    expect(page.setCacheEnabled).toHaveBeenCalledWith(true);
    expect(page.setContent).toHaveBeenCalledWith("<html>receipt</html>", {
      waitUntil: "domcontentloaded",
    });
    expect(page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: "A4", printBackground: true }),
    );
    expect(page.goto).toHaveBeenCalledWith("about:blank", {
      waitUntil: "domcontentloaded",
    });
    expect(result).toBeInstanceOf(Buffer);
  });
});
