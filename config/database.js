const logger = require('../utils/logger');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rootpassword",
  database: process.env.DB_NAME || "temple_db",
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
  namedPlaceholders: true
});
logger.info(`Database config: Host=${process.env.DB_HOST || "localhost"}, User=${process.env.DB_USER || "root"}, DB=${process.env.DB_NAME || "temple_db"}`);

// Test connection only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection()
    .then(connection => {
      logger.info('Database connected successfully');
      connection.release();
    })
    .catch(err => {
      logger.error('Database connection failed', {
        message: err.message,
        stack: err.stack,
      });
    });
}

module.exports = pool;


