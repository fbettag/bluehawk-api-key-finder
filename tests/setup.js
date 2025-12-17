/**
 * Jest Test Setup - BlueHawk API Key Finder
 */

// Mock Chrome Extension APIs
require('./mocks/chrome');

// Increase timeout for integration tests
jest.setTimeout(10000);
