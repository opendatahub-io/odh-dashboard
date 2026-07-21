import type { PluginModuleResource } from '@perses-dev/plugin-system';
import { getPluginModuleCompoundKey, remotePluginLoader } from '@perses-dev/plugin-system';
import {
  loadBundledOverride,
  pluginLoader,
  resetBundledOverridesForTests,
  type BundledPluginModule,
} from '../persesPluginsLoader';

jest.mock('../perses-client', () => ({
  PERSES_PROXY_BASE_PATH: '/perses/api',
}));

jest.mock('@perses-dev/plugin-system', () => ({
  getPluginModuleCompoundKey: ({
    kind,
    name,
    registry,
    version,
  }: {
    kind: string;
    name: string;
    registry?: string;
    version?: string;
  }) => `${kind}:${name}:${registry ?? ''}:${version ?? ''}`,
  remotePluginLoader: jest.fn(() => ({
    getInstalledPlugins: jest.fn(),
    importPluginModule: jest.fn(),
  })),
}));

const remoteLoader = jest.mocked(remotePluginLoader).mock.results[0]?.value as {
  getInstalledPlugins: jest.Mock;
  importPluginModule: jest.Mock;
};

const createMockModule = (packageName: string, exportName = 'Table'): BundledPluginModule => {
  const pluginExport = { kind: 'Panel' };
  return {
    [exportName]: pluginExport,
    getPluginModule: () => ({
      kind: 'PluginModule',
      metadata: {
        name: packageName,
        version: '1.0.0',
        registry: 'perses.dev',
      },
      spec: {
        plugins: [
          {
            kind: 'Panel',
            spec: {
              name: exportName,
              display: { name: exportName },
            },
          },
        ],
      },
    }),
  };
};

const createRemoteResource = (
  name: string,
  options?: { version?: string; registry?: string; pluginName?: string },
): PluginModuleResource => ({
  kind: 'PluginModule',
  metadata: {
    name,
    version: options?.version ?? '0.1.0',
    registry: options?.registry ?? 'perses.dev',
  },
  spec: {
    plugins: [
      {
        kind: 'Panel',
        spec: {
          name: options?.pluginName ?? 'Table',
          display: { name: options?.pluginName ?? 'Table' },
        },
      },
    ],
  },
});

describe('loadBundledOverride', () => {
  beforeEach(() => {
    resetBundledOverridesForTests(new Map());
  });

  it('should resolve a plugin by remote manifest name', async () => {
    const mockModule = createMockModule('@perses-dev/table-plugin');
    const loader = jest.fn().mockResolvedValue(mockModule);
    resetBundledOverridesForTests(new Map([['Table', loader]]));

    const result = await loadBundledOverride('Table');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockModule);
  });

  it('should resolve a previously loaded plugin by npm package name alias', async () => {
    const mockModule = createMockModule('@perses-dev/table-plugin');
    const loader = jest.fn().mockResolvedValue(mockModule);
    resetBundledOverridesForTests(new Map([['Table', loader]]));

    await loadBundledOverride('Table');
    const aliased = await loadBundledOverride('@perses-dev/table-plugin');

    expect(loader).toHaveBeenCalledTimes(1);
    expect(aliased).toBe(mockModule);
  });

  it('should return undefined for unknown plugins', () => {
    resetBundledOverridesForTests(new Map([['Table', jest.fn()]]));

    expect(loadBundledOverride('Unknown')).toBeUndefined();
  });

  it('should retry after a rejected dynamic import by clearing the cache entry', async () => {
    const mockModule = createMockModule('@perses-dev/table-plugin');
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('chunk load failed'))
      .mockResolvedValueOnce(mockModule);
    resetBundledOverridesForTests(new Map([['Table', loader]]));

    await expect(loadBundledOverride('Table')).rejects.toThrow('chunk load failed');
    await expect(loadBundledOverride('Table')).resolves.toBe(mockModule);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('should not leave a rejected npm package alias cached after failure', async () => {
    const failingModule = {
      getPluginModule: () => {
        throw new Error('invalid module metadata');
      },
    };
    const loader = jest
      .fn()
      .mockResolvedValueOnce(failingModule)
      .mockResolvedValueOnce(createMockModule('@perses-dev/table-plugin'));
    resetBundledOverridesForTests(new Map([['Table', loader]]));

    await expect(loadBundledOverride('Table')).rejects.toThrow('invalid module metadata');
    await expect(loadBundledOverride('Table')).resolves.toBeDefined();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

describe('pluginLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBundledOverridesForTests(new Map());
  });

  describe('getInstalledPlugins', () => {
    it('should replace matching remote plugins with bundled module metadata', async () => {
      const mockModule = createMockModule('@perses-dev/table-plugin');
      resetBundledOverridesForTests(new Map([['Table', jest.fn().mockResolvedValue(mockModule)]]));
      const remoteTable = createRemoteResource('Table');
      const remoteOther = createRemoteResource('TimeSeriesChart');
      remoteLoader.getInstalledPlugins.mockResolvedValue([remoteTable, remoteOther]);

      const installed = await pluginLoader.getInstalledPlugins();

      expect(installed).toEqual([mockModule.getPluginModule(), remoteOther]);
    });

    it('should leave unknown remote plugins unchanged', async () => {
      const remoteOther = createRemoteResource('TimeSeriesChart');
      remoteLoader.getInstalledPlugins.mockResolvedValue([remoteOther]);

      const installed = await pluginLoader.getInstalledPlugins();

      expect(installed).toEqual([remoteOther]);
      expect(remoteLoader.importPluginModule).not.toHaveBeenCalled();
    });
  });

  describe('importPluginModule', () => {
    it('should return compound-keyed exports for a bundled override', async () => {
      const mockModule = createMockModule('@perses-dev/table-plugin', 'Table');
      resetBundledOverridesForTests(new Map([['Table', jest.fn().mockResolvedValue(mockModule)]]));
      const resource = createRemoteResource('Table', {
        version: '1.0.0',
        registry: 'perses.dev',
        pluginName: 'Table',
      });

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const imported = (await pluginLoader.importPluginModule(resource)) as Record<string, unknown>;

      const compoundKey = getPluginModuleCompoundKey({
        kind: 'Panel',
        name: 'Table',
        registry: resource.metadata.registry,
        version: resource.metadata.version,
      });
      expect(imported.Table).toBe(mockModule.Table);
      expect(imported[compoundKey]).toBe(mockModule.Table);
      expect(remoteLoader.importPluginModule).not.toHaveBeenCalled();
    });

    it('should resolve an override via cached npm package name after manifest load', async () => {
      const mockModule = createMockModule('@perses-dev/table-plugin', 'Table');
      const loader = jest.fn().mockResolvedValue(mockModule);
      resetBundledOverridesForTests(new Map([['Table', loader]]));

      await loadBundledOverride('Table');
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const imported = (await pluginLoader.importPluginModule(
        mockModule.getPluginModule(),
      )) as Record<string, unknown>;

      expect(loader).toHaveBeenCalledTimes(1);
      expect(imported.Table).toBe(mockModule.Table);
    });

    it('should delegate unknown plugins to the remote loader with stripped version metadata', async () => {
      const resource = createRemoteResource('TimeSeriesChart', {
        version: '9.9.9',
        registry: 'perses.dev',
        pluginName: 'TimeSeriesChart',
      });
      const strippedKey = getPluginModuleCompoundKey({
        kind: 'Panel',
        name: 'TimeSeriesChart',
      });
      const versionedKey = getPluginModuleCompoundKey({
        kind: 'Panel',
        name: 'TimeSeriesChart',
        registry: 'perses.dev',
        version: '9.9.9',
      });
      const remotePlugin = { render: jest.fn() };
      remoteLoader.importPluginModule.mockResolvedValue({
        [strippedKey]: remotePlugin,
      });

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const imported = (await pluginLoader.importPluginModule(resource)) as Record<string, unknown>;

      expect(remoteLoader.importPluginModule).toHaveBeenCalledWith({
        ...resource,
        metadata: { ...resource.metadata, version: '', registry: '' },
      });
      expect(imported[versionedKey]).toBe(remotePlugin);
    });
  });
});
