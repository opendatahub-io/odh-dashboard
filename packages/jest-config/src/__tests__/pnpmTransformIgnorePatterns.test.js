const path = require('path');

const { pnpmTransformIgnorePatterns } = require('../pnpmTransformIgnorePatterns');
const { pnpmJestModuleNameMapper } = require('../pnpmModuleNameMapper');

describe('pnpmTransformIgnorePatterns', () => {
  const ignorePattern = new RegExp(pnpmTransformIgnorePatterns[0]);

  it.each([
    '/repo/node_modules/mod-arch-new/index.js',
    '/repo/node_modules/.pnpm/mod-arch-new@1.0.0/node_modules/mod-arch-new/index.js',
    '/repo/node_modules/.pnpm/@patternfly+react-core@6.0.0/node_modules/@patternfly/react-core/index.js',
  ])('transforms allowed ESM dependency %s', (modulePath) => {
    expect(ignorePattern.test(modulePath)).toBe(false);
  });

  it.each([
    '/repo/node_modules/mod-architecture/index.js',
    '/repo/node_modules/yaml-helper/index.js',
    '/repo/node_modules/.pnpm/example@1.0.0/node_modules/example/index.js',
  ])('ignores dependency %s', (modulePath) => {
    expect(ignorePattern.test(modulePath)).toBe(true);
  });

  it('maps React to the monorepo root install', () => {
    const mapper = pnpmJestModuleNameMapper();
    const repoRoot = path.resolve(__dirname, '../../../..');

    expect(mapper['^react$']).toBe(path.join(repoRoot, 'node_modules/react'));
    expect(mapper['^react-dom$']).toBe(path.join(repoRoot, 'node_modules/react-dom'));
  });
});
