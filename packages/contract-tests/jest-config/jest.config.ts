// Shared Jest config used by consumers; modeled after original jest-config
export default {
  testMatch: ['**/?(*.)+(spec|test).?([mc])[jt]s?(x)'],
  transform: {
    '^.+\\.(js|tsx?)$': [
      'babel-jest',
      { targets: 'current node', envName: 'test', rootMode: 'upward' },
    ],
  },
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!yaml|@openshift|lodash-es|uuid|@patternfly|d3|delaunator|robust-predicates|internmap|monaco-editor)',
  ],
  setupFilesAfterEnv: [require.resolve('./config/jest.setup.ts')],
  coverageDirectory: 'jest-coverage',
  coverageReporters: ['json', 'lcov'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': require.resolve('./config/transform.style.js'),
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      require.resolve('./config/transform.file.js'),
    '^monaco-editor$': require.resolve('./config/transform.file.js'),
    // Legacy hooks path (keep consumers working without local jest configs)
    '^@odh-dashboard/jest-config/hooks$': '@odh-dashboard/jest-config/src/hooks.ts',
  },
};
