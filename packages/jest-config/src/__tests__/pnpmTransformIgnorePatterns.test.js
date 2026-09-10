const path = require('path');

const { PNPM_ESM_ALLOW } = require('../pnpmTransformIgnorePatterns');
const { pnpmJestModuleNameMapper } = require('../pnpmModuleNameMapper');

describe('pnpmTransformIgnorePatterns', () => {
  const allowPattern = new RegExp(PNPM_ESM_ALLOW);

  it('allows any mod-arch package in pnpm and flat node_modules layouts', () => {
    expect(allowPattern.test('.pnpm/mod-arch-new@1.0.0/node_modules/mod-arch-new')).toBe(true);
    expect(allowPattern.test('mod-arch-new')).toBe(true);
  });

  it('does not treat a similarly named package as mod-arch', () => {
    expect(allowPattern.test('mod-architecture')).toBe(false);
  });

  it('maps React to the monorepo root install', () => {
    const mapper = pnpmJestModuleNameMapper();
    const repoRoot = path.resolve(__dirname, '../../../..');

    expect(mapper['^react$']).toBe(path.join(repoRoot, 'node_modules/react'));
    expect(mapper['^react-dom$']).toBe(path.join(repoRoot, 'node_modules/react-dom'));
  });
});
