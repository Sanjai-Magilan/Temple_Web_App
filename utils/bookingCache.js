 
  const fs = require('fs');
const path = require('path');
const CACHE_FILE = path.join(__dirname, '../pending_bookings.json');

// Configuration for cache expiration
const CACHE_EXPIRY_MS = 15 * 60 * 1000; // Time until a pending booking is deleted (default: 24 hours)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;  // How often to check for expired bookings (default: 1 hour)

/**
 * Booking Cache Utility
 * Temporarily stores pending booking data before database persistence
 * Keyed by Razorpay order_id
 */

const bookingCache = new Map();

// Helper to save cache to file
const saveCacheToFile = () => {
    try {
        const data = JSON.stringify(Array.from(bookingCache.entries()), null, 2);
        fs.writeFileSync(CACHE_FILE, data);
    } catch (error) {
        console.error("Error saving booking cache to file:", error);
    }
};

// Helper to load cache from file
const loadCacheFromFile = () => {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf8');
            const entries = JSON.parse(data);
            for (const [key, value] of entries) {
                // Restore Date objects
                if (value.cachedAt) {
                    value.cachedAt = new Date(value.cachedAt);
                }
                bookingCache.set(key, value);
            }
            console.log(`Loaded ${bookingCache.size} pending bookings from persistence`);
        }
    } catch (error) {
        console.error("Error loading booking cache from file:", error);
    }
};

// Initial load
loadCacheFromFile();

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
  saveCacheToFile();
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
  saveCacheToFile();
};

/**
 * Get all entries from cache
 * @returns {IterableIterator<[string, object]>}
 */
exports.entries = () => {
  return bookingCache.entries();
};

/**
 * Periodic cleanup (every hour) to remove bookings older than 24 hours
 * This prevents memory leaks from abandoned bookings
 */
setInterval(() => {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() - CACHE_EXPIRY_MS);
  
  let changed = false;
  for (const [key, value] of bookingCache.entries()) {
    if (value.cachedAt < expiryThreshold) {
      bookingCache.delete(key);
      changed = true;
    }
  }

  if (changed) {
    saveCacheToFile();
  }
}, CLEANUP_INTERVAL_MS);
