/**
 * Jest Configuration for E-Book Store Backend
 */
module.exports = {
  // Use Node.js environment (not jsdom)
  testEnvironment: 'node',

  // Run setup file after the test framework is installed
  setupFilesAfterSetup: ['./tests/setup.js'],

  // Pattern to find test files
  testMatch: ['**/tests/**/*.test.js'],

  // Show individual test results
  verbose: true,

  // Force Jest to exit after all tests complete
  forceExit: true,

  // Detect open handles (sockets, timers, etc.) that prevent Jest from exiting
  detectOpenHandles: true,
};
