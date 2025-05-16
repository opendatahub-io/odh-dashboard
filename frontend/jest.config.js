// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  roots: ['<rootDir>'],
  testMatch: [
    '**/src/__tests__/unit/**/?(*.)+(spec|test).ts?(x)',
    '**/__tests__/?(*.)+(spec|test).ts?(x)',
  ],

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/packages'],

  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/config/transform.style.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/config/transform.file.js',
    '~/(.*)': '<rootDir>/src/$1',
    '^monaco-editor$': '<rootDir>/src/__tests__/unit/__mocks__/monaco-editor.ts',
    '^@odh-dashboard/internal/(.*)$': '<rootDir>/src/$1',
  },

  // The test environment that will be used for testing.
  testEnvironment: 'jest-environment-jsdom',

  // include projects from node_modules as required
  transformIgnorePatterns: [
    'node_modules/(?!yaml|@openshift|lodash-es|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor)',
  ],

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  snapshotSerializers: [],

  setupFilesAfterEnv: ['<rootDir>/src/__tests__/unit/jest.setup.ts'],

  coverageDirectory: 'jest-coverage',

  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '<rootDir>/packages/**/src/**/*.{ts,tsx}',
    '!<rootDir>/src/third_party/**',
    '!<rootDir>/src/__tests__/**',
    '!<rootDir>/src/__mocks__/**',
    '!**/*.spec.{ts,tsx}',
  ],
};
