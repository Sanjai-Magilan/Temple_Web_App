/**
 * Database Configuration
 * MySQL connection setup for Hostinger
 */
const logger = require('../utils/logger');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "logesh8799",
  database: process.env.DB_NAME || "temple_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection
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

module.exports = pool;


