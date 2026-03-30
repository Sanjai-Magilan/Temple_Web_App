const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

const mailer = require("../utils/mailer");

describe("Mailer Utility", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_USER = "temple@test.com";
    process.env.EMAIL_PASS = "app-password";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("sendOTP sends the verification email", async () => {
    mockSendMail.mockResolvedValue({ messageId: "1" });

    await mailer.sendOTP("devotee@test.com", "123456");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "temple@test.com",
        to: "devotee@test.com",
        subject: "Temple App - Email Verification OTP",
        html: expect.stringContaining("123456"),
      }),
    );
  });

  test("sendPasswordResetOTP sends the password reset email", async () => {
    mockSendMail.mockResolvedValue({ messageId: "2" });

    await mailer.sendPasswordResetOTP("devotee@test.com", "654321");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "temple@test.com",
        to: "devotee@test.com",
        subject: "Temple App - Password Reset OTP",
        html: expect.stringContaining("654321"),
      }),
    );
  });
});
