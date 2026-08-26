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
    // Single React instance when testing components that use @odh-dashboard/internal
    '^react$': '<rootDir>/../../../node_modules/react',
    '^react-dom$': '<rootDir>/../../../node_modules/react-dom',
    // Single react-router instance: this package's own react-router(-dom) install can
    // resolve to a different (nested) copy than @odh-dashboard/autox-core, which has no
    // node_modules of its own and always resolves to the root install. Mismatched copies
    // mean a <MemoryRouter> from one and a <Link>/useNavigate from the other share no context.
    '^react-router$': '<rootDir>/../../../node_modules/react-router',
    '^react-router-dom$': '<rootDir>/../../../node_modules/react-router-dom',
    // Single mod-arch-core instance: same class of issue as react-router above. This
    // package's own nested mod-arch-core install can be a different version than the
    // root install @odh-dashboard/autox-core always resolves against — mismatched
    // copies mean useModularArchContext's React.createContext() differs, breaking
    // hooks like useNamespaceSelector for any consumer using the shared hooks layer.
    '^mod-arch-core$': '<rootDir>/../../../node_modules/mod-arch-core',
    // Resolve @odh-dashboard/internal's #~/ imports to main frontend src
    '#~/(.*)': '<rootDir>/../../../frontend/src/$1',
    '~/(.*)': '<rootDir>/src/$1',
    '^@odh-dashboard/internal(.*)$': '<rootDir>/../../../frontend/src$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(js|tsx?)$': [
      'babel-jest',
      { targets: 'current node', envName: 'test', rootMode: 'upward' },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!yaml|lodash-es|uuid|@patternfly|delaunator|mod-arch-core|mod-arch-shared)',
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
