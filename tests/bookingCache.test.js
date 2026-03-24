describe("Booking Cache Utility", () => {
  let fsMock;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    fsMock = {
      existsSync: jest.fn(() => false),
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
    };

    jest.doMock("fs", () => fsMock);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.dontMock("fs");
  });

  test("stores and retrieves cached bookings", () => {
    const bookingCache = require("../utils/bookingCache");

    bookingCache.set("order_1", { hall_name: "Main Hall" });
    const cached = bookingCache.get("order_1");

    expect(cached).toEqual(
      expect.objectContaining({
        hall_name: "Main Hall",
        cachedAt: expect.any(Date),
      }),
    );
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });

  test("loads persisted cache entries from disk", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(
      JSON.stringify([
        [
          "order_2",
          {
            pooja_name: "Archana",
            cachedAt: "2026-03-24T00:00:00.000Z",
          },
        ],
      ]),
    );

    const bookingCache = require("../utils/bookingCache");
    const cached = bookingCache.get("order_2");

    expect(cached).toEqual(
      expect.objectContaining({
        pooja_name: "Archana",
        cachedAt: expect.any(Date),
      }),
    );
  });

  test("deletes expired entries during scheduled cleanup", () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(
      JSON.stringify([
        [
          "order_3",
          {
            hall_name: "Old Hall",
            cachedAt: "2026-03-23T00:00:00.000Z",
          },
        ],
      ]),
    );

    jest.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
    const bookingCache = require("../utils/bookingCache");

    jest.advanceTimersByTime(60 * 60 * 1000);

    expect(bookingCache.get("order_3")).toBeUndefined();
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });
});
