export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'jest-coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  setupFiles: ['<rootDir>/jest/setupSymbolDispose.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { isolatedModules: true } }],
    // @kubernetes/client-node >= 1.0 and some of its dependencies are ESM-only.
    '^.+\\.m?js$': '<rootDir>/jest/esmTransform.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@kubernetes/client-node|openid-client|oauth4webapi|jose|socks-proxy-agent|agent-base|jsonpath-plus|rfc4648)(/|@|\\+))',
  ],
};
