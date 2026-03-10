 
  /**
 * Booking Cache Utility
 * Temporarily stores pending booking data before database persistence
 * Keyed by Razorpay order_id
 */

const bookingCache = new Map();

/**
 * Store booking data in cache
 * @param {string} orderId - Razorpay order ID
 * @param {object} bookingData - Booking details
 */
exports.set = (orderId, bookingData) => {
  bookingCache.set(orderId, {
    ...bookingData,
    cachedAt: new Date()
  });
};

/**
 * Retrieve booking data from cache
 * @param {string} orderId - Razorpay order ID
 * @returns {object|null} - Booking details or null if not found
 */
exports.get = (orderId) => {
  return bookingCache.get(orderId);
};

/**
 * Remove booking data from cache
 * @param {string} orderId - Razorpay order ID
 */
exports.delete = (orderId) => {
  bookingCache.delete(orderId);
};

/**
 * Periodic cleanup (every hour) to remove bookings older than 24 hours
 * This prevents memory leaks from abandoned bookings
 */
setInterval(() => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const [key, value] of bookingCache.entries()) {
    if (value.cachedAt < oneDayAgo) {
      bookingCache.delete(key);
    }
  }
}, 60 * 60 * 1000);
