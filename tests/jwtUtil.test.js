const jwt = require("jsonwebtoken");

describe("JWT Utility", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "1h";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("generates and verifies a token", () => {
    const jwtUtils = require("../utils/jwt");
    const payload = { userId: 1, role: "user" };

    const token = jwtUtils.generateToken(payload);
    const decoded = jwtUtils.verifyToken(token);

    expect(decoded.userId).toBe(1);
    expect(decoded.role).toBe("user");
  });

  test("throws a friendly error for invalid tokens", () => {
    const jwtUtils = require("../utils/jwt");

    expect(() => jwtUtils.verifyToken("bad-token")).toThrow("Invalid token");
  });

  test("decodes a token without verification", () => {
    const jwtUtils = require("../utils/jwt");
    const token = jwt.sign({ userId: 7 }, "different-secret");

    expect(jwtUtils.decodeToken(token)).toEqual(
      expect.objectContaining({ userId: 7 }),
    );
  });
});
