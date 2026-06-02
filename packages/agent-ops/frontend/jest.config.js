// Default flavor override: removes references to Kubeflow-only packages.
module.exports = {
  roots: ['<rootDir>/src/'],
  testMatch: [
    '**/src/__tests__/unit/**/?(*.)+(spec|test).ts?(x)',
    '**/__tests__/?(*.)+(spec|test).ts?(x)',
  ],
  clearMocks: true,
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/config/transform.style.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/config/transform.file.js',
    '~/(.*)': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!yaml|lodash-es|uuid|@patternfly|delaunator|mod-arch-core)',
  ],
  snapshotSerializers: [],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/unit/jest.setup.ts'],
  coverageDirectory: 'jest-coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/__tests__/**',
    '!<rootDir>/src/__mocks__/**',
    '!**/*.spec.{ts,tsx}',
  ],
};
