import { sharedPluginModules, getSharedModuleMetadata } from '../shared-modules-meta';
import { getRuntimeOdhPackages } from '../getRuntimeOdhPackages';

jest.mock('child_process', () => ({
  execSync: jest.fn(() =>
    JSON.stringify([
      {
        name: 'odh-dashboard-frontend',
        dependencies: {
          '@odh-dashboard/internal': '*',
          '@odh-dashboard/plugin-core': '*',
          '@odh-dashboard/ui-core': '*',
        },
      },
      {
        name: '@odh-dashboard/internal',
        dependencies: { '@odh-dashboard/k8s-core': '*' },
      },
      {
        name: '@odh-dashboard/plugin-core',
        dependencies: { '@odh-dashboard/internal': '*' },
      },
      {
        name: '@odh-dashboard/ui-core',
        dependencies: {},
      },
      {
        name: '@odh-dashboard/k8s-core',
        dependencies: {},
      },
      {
        name: '@odh-dashboard/maas',
        'module-federation': { name: 'maas' },
        dependencies: { '@odh-dashboard/gen-ai': '*' },
      },
      {
        name: '@odh-dashboard/gen-ai',
        dependencies: {},
      },
      {
        name: '@odh-dashboard/eslint-config',
        devDependencies: {},
      },
    ]),
  ),
}));

describe('getSharedModuleMetadata', () => {
  it('returns complete defaults for a module not in the map', () => {
    const meta = getSharedModuleMetadata('not-in-the-map');
    expect(meta).toEqual({ singleton: true, allowFallback: true, eager: false });
  });

  it('applies overrides without losing unoverridden defaults', () => {
    const defaults = getSharedModuleMetadata('not-in-the-map');
    const entry = Object.entries(sharedPluginModules).find(([, v]) => Object.keys(v).length > 0);
    expect(entry).toBeDefined();
    if (!entry) {
      return;
    }
    const [name, overrides] = entry;
    const meta = getSharedModuleMetadata(name);

    for (const [key, value] of Object.entries(overrides)) {
      expect(meta[key as keyof typeof meta]).toBe(value);
    }
    for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
      if (!(key in overrides)) {
        expect(meta[key]).toBe(defaults[key]);
      }
    }
  });
});

describe('getRuntimeOdhPackages', () => {
  it('discovers transitive @odh-dashboard/* runtime packages', () => {
    const packages = getRuntimeOdhPackages();

    expect(packages.has('@odh-dashboard/internal')).toBe(true);
    expect(packages.has('@odh-dashboard/plugin-core')).toBe(true);
    expect(packages.has('@odh-dashboard/ui-core')).toBe(true);
    expect(packages.has('@odh-dashboard/k8s-core')).toBe(true);
  });

  it('includes federated modules and their transitive deps', () => {
    const packages = getRuntimeOdhPackages();

    expect(packages.has('@odh-dashboard/maas')).toBe(true);
    expect(packages.has('@odh-dashboard/gen-ai')).toBe(true);
  });

  it('excludes non-odh packages and dev-only packages', () => {
    const packages = getRuntimeOdhPackages();

    expect(packages.has('@odh-dashboard/eslint-config')).toBe(false);
  });
});
