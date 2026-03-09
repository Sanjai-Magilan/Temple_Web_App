/**
 * Global teardown for Jest tests
 * Ensures all database connections are properly closed
 */

module.exports = async () => {
  // Give a small delay to ensure all async operations complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Force close any remaining database connections
  try {
    const pool = require('../config/database');
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    // Ignore errors if pool is already closed or doesn't exist
    console.log('Database pool cleanup completed');
  }
};
