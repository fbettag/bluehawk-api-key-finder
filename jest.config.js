module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js',
    '!src/popup/**',
    '!src/settings/**',
    '!src/history/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
