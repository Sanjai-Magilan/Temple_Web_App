module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
  // Force tests to run serially to avoid database connection issues
  maxWorkers: 1,
  globalTeardown: './tests/globalTeardown.js',
};
