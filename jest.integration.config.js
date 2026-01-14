const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customIntegrationJestConfig = {
  displayName: 'integration',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-markdown|remark-gfm|rehype-highlight|@hello-pangea/dnd)/)',
    '^.+\.module\.(css|sass|scss)$',
  ],
};

module.exports = createJestConfig(customIntegrationJestConfig);
