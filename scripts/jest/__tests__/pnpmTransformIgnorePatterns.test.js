const { PNPM_ESM_ALLOW } = require('../pnpmTransformIgnorePatterns');

describe('pnpmTransformIgnorePatterns', () => {
  const allowPattern = new RegExp(PNPM_ESM_ALLOW);

  it('allows any mod-arch package in pnpm and flat node_modules layouts', () => {
    expect(allowPattern.test('.pnpm/mod-arch-new@1.0.0/node_modules/mod-arch-new')).toBe(true);
    expect(allowPattern.test('mod-arch-new')).toBe(true);
  });

  it('does not treat a similarly named package as mod-arch', () => {
    expect(allowPattern.test('mod-architecture')).toBe(false);
  });
});
