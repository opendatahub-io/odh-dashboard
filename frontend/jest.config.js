// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  testMatch: ['**/__tests__/unit/**/*.ts'],

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/config/transform.style.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/config/transform.file.js',
    '~/(.*)': '<rootDir>/src/$1',
  },

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest/presets/js-with-ts',

  // The test environment that will be used for testing.
  testEnvironment: 'jsdom',

  transform: {
    'node_modules/.+\\.(j|t)sx?$': 'ts-jest',
  },

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  snapshotSerializers: [],
};
