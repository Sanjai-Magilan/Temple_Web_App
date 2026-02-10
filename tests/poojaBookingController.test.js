/**
 * Pooja Booking Controller Tests
 */

const poojaBookingController = require("../controllers/poojaBookingController");
const poojaBookingModel = require("../models/poojaBookingModel");

// Mock the model
jest.mock("../models/poojaBookingModel");

describe("Pooja Booking Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        first_name: "Test",
        last_name: "User",
      },
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
