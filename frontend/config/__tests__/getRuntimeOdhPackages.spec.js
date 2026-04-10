const { getRuntimeOdhPackages } = require('../getRuntimeOdhPackages');

describe('getRuntimeOdhPackages', () => {
  const makePackage = (name, { deps = {}, mf = false } = {}) => ({
    name,
    dependencies: deps,
    ...(mf && { 'module-federation': { name: name.replace('@odh-dashboard/', '') } }),
  });

  it('should include federated remotes as seeds', () => {
    const packages = [
      makePackage('@odh-dashboard/maas', { mf: true, deps: {} }),
      makePackage('@odh-dashboard/gen-ai', { mf: true, deps: {} }),
    ];
    const hostPkg = { dependencies: {} };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(new Set(['@odh-dashboard/maas', '@odh-dashboard/gen-ai']));
  });

  it('should include host @odh-dashboard/* dependencies as seeds', () => {
    const packages = [
      makePackage('@odh-dashboard/app-config'),
      makePackage('@odh-dashboard/plugin-core'),
    ];
    const hostPkg = {
      dependencies: {
        '@odh-dashboard/app-config': '*',
        '@odh-dashboard/plugin-core': '*',
        react: '^18.0.0',
      },
    };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(new Set(['@odh-dashboard/app-config', '@odh-dashboard/plugin-core']));
  });

  it('should follow transitive dependencies', () => {
    const packages = [
      makePackage('@odh-dashboard/maas', {
        mf: true,
        deps: { '@odh-dashboard/model-serving': '*' },
      }),
      makePackage('@odh-dashboard/model-serving', {
        deps: { '@odh-dashboard/kserve': '*' },
      }),
      makePackage('@odh-dashboard/kserve', {
        deps: { '@odh-dashboard/internal': '*' },
      }),
      makePackage('@odh-dashboard/internal'),
    ];
    const hostPkg = { dependencies: {} };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(
      new Set([
        '@odh-dashboard/maas',
        '@odh-dashboard/model-serving',
        '@odh-dashboard/kserve',
        '@odh-dashboard/internal',
      ]),
    );
  });

  it('should exclude devDependencies-only packages', () => {
    const packages = [
      makePackage('@odh-dashboard/maas', {
        mf: true,
        deps: { '@odh-dashboard/internal': '*' },
        devDeps: { '@odh-dashboard/eslint-config': '*' },
      }),
      makePackage('@odh-dashboard/internal'),
      makePackage('@odh-dashboard/eslint-config'),
      makePackage('@odh-dashboard/tsconfig'),
      makePackage('@odh-dashboard/jest-config'),
    ];
    const hostPkg = { dependencies: {} };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(new Set(['@odh-dashboard/maas', '@odh-dashboard/internal']));
    expect(result.has('@odh-dashboard/eslint-config')).toBe(false);
    expect(result.has('@odh-dashboard/tsconfig')).toBe(false);
    expect(result.has('@odh-dashboard/jest-config')).toBe(false);
  });

  it('should ignore non-@odh-dashboard dependencies in the walk', () => {
    const packages = [
      makePackage('@odh-dashboard/maas', {
        mf: true,
        deps: { react: '^18.0.0', lodash: '^4.0.0', '@odh-dashboard/internal': '*' },
      }),
      makePackage('@odh-dashboard/internal'),
    ];
    const hostPkg = { dependencies: {} };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(new Set(['@odh-dashboard/maas', '@odh-dashboard/internal']));
  });

  it('should handle circular dependencies without infinite loop', () => {
    const packages = [
      makePackage('@odh-dashboard/a', {
        mf: true,
        deps: { '@odh-dashboard/b': '*' },
      }),
      makePackage('@odh-dashboard/b', {
        deps: { '@odh-dashboard/a': '*' },
      }),
    ];
    const hostPkg = { dependencies: {} };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(new Set(['@odh-dashboard/a', '@odh-dashboard/b']));
  });

  it('should handle packages not found in the workspace', () => {
    const packages = [
      makePackage('@odh-dashboard/maas', {
        mf: true,
        deps: { '@odh-dashboard/missing-pkg': '*' },
      }),
    ];
    const hostPkg = { dependencies: {} };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(new Set(['@odh-dashboard/maas', '@odh-dashboard/missing-pkg']));
  });

  it('should return empty set when no packages or host deps exist', () => {
    const result = getRuntimeOdhPackages([], { dependencies: {} });

    expect(result).toEqual(new Set());
  });

  it('should handle host package with no dependencies field', () => {
    const packages = [makePackage('@odh-dashboard/maas', { mf: true })];

    const result = getRuntimeOdhPackages(packages, {});

    expect(result).toEqual(new Set(['@odh-dashboard/maas']));
  });

  it('should deduplicate packages reachable from multiple paths', () => {
    const packages = [
      makePackage('@odh-dashboard/remote-a', {
        mf: true,
        deps: { '@odh-dashboard/internal': '*', '@odh-dashboard/plugin-core': '*' },
      }),
      makePackage('@odh-dashboard/remote-b', {
        mf: true,
        deps: { '@odh-dashboard/internal': '*', '@odh-dashboard/plugin-core': '*' },
      }),
      makePackage('@odh-dashboard/internal'),
      makePackage('@odh-dashboard/plugin-core'),
    ];
    const hostPkg = { dependencies: { '@odh-dashboard/plugin-core': '*' } };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(
      new Set([
        '@odh-dashboard/plugin-core',
        '@odh-dashboard/remote-a',
        '@odh-dashboard/remote-b',
        '@odh-dashboard/internal',
      ]),
    );
  });

  it('should combine host deps and remote deps into one set', () => {
    const packages = [
      makePackage('@odh-dashboard/maas', {
        mf: true,
        deps: { '@odh-dashboard/model-serving': '*' },
      }),
      makePackage('@odh-dashboard/model-serving'),
      makePackage('@odh-dashboard/app-config'),
    ];
    const hostPkg = { dependencies: { '@odh-dashboard/app-config': '*' } };

    const result = getRuntimeOdhPackages(packages, hostPkg);

    expect(result).toEqual(
      new Set(['@odh-dashboard/app-config', '@odh-dashboard/maas', '@odh-dashboard/model-serving']),
    );
  });
});
