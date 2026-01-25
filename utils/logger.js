const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Error logs only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),

    // All logs
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),

    // Console logs (dev only)
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.simple(),
    }),
  ],
});

module.exports = logger;
