/**
 * Hall Booking Controller Tests
 */

jest.mock("../models/hallBookingModel");

const hallBookingController = require("../controllers/hallBookingController");
const hallBookingModel = require("../models/hallBookingModel");

// ---- Mock Response ----
const mockResponse = () => {
  const res = {};
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

// ---- Mock Request ----
const mockRequest = (data = {}) => ({
  user: null,
  ...data,
});

describe("Hall Booking Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
});
