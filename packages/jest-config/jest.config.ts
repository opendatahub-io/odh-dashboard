// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

export default {
  testMatch: ['**/?(*.)+(spec|test).?([mc])[jt]s?(x)'],

  transform: {
    '^.+\\.(js|tsx?)$': [
      'babel-jest',
      { targets: 'current node', envName: 'test', rootMode: 'upward' },
    ],
  },

  // An array of directory names to be searched recursively up from the requiring module's location
  // moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/packages'],

  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': require.resolve('./config/transform.style.js'),
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      require.resolve('./config/transform.file.js'),
    '^monaco-editor$': require.resolve('./config/transform.file.js'),
  },

  // The test environment that will be used for testing.
  testEnvironment: 'jest-environment-jsdom',

  // include projects from node_modules as required
  transformIgnorePatterns: [
    'node_modules/(?!yaml|@openshift|lodash-es|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor)',
  ],

  setupFilesAfterEnv: [require.resolve('./config/jest.setup.ts')],

  coverageDirectory: 'jest-coverage',

  coverageReporters: ['json', 'lcov'],

  collectCoverageFrom: [
    'extensions.ts',
    'extensions/**/*.{ts,tsx}',
    'extension-points.ts',
    'extension-points/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!upstream/**',
    '!src/third_party/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/*.spec.{ts,tsx}',
  ],
};
