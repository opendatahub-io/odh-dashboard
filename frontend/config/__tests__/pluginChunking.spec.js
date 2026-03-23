const {
  isExtensionFile,
  getExtensionChunksFilter,
  getPluginChunkName,
} = require('../pluginChunking');

const pluginPackageDetails = [
  { shortName: 'kserve', location: '/workspace/packages/kserve' },
  { shortName: 'model-serving', location: '/workspace/packages/model-serving' },
];

const mockModule = (resource) => ({ resource });

const mockChunk = (name, isInitial = false) => ({
  name,
  canBeInitial: () => isInitial,
});

const mockChunkWithOrigin = (originResource, isInitial = false) => ({
  canBeInitial: () => isInitial,
  groupsIterable: [
    {
      origins: [{ module: { resource: originResource } }],
    },
  ],
});

describe('isExtensionFile', () => {
  it('should match extensions.ts at the package root', () => {
    expect(isExtensionFile('/workspace/packages/kserve/extensions.ts', pluginPackageDetails)).toBe(
      true,
    );
  });

  it('should match files in an extensions/ directory', () => {
    expect(
      isExtensionFile('/workspace/packages/model-serving/extensions/odh.ts', pluginPackageDetails),
    ).toBe(true);
  });

  it('should match nested extension files', () => {
    expect(
      isExtensionFile(
        '/workspace/packages/kserve/upstream/odh/extensions.ts',
        pluginPackageDetails,
      ),
    ).toBe(true);
  });

  it('should not match regular source files', () => {
    expect(isExtensionFile('/workspace/packages/kserve/src/deploy.ts', pluginPackageDetails)).toBe(
      false,
    );
  });

  it('should not match files from unknown packages', () => {
    expect(
      isExtensionFile('/workspace/node_modules/lodash/extensions.ts', pluginPackageDetails),
    ).toBe(false);
  });

  it('should not match files with "extensions" as a substring in the name', () => {
    expect(
      isExtensionFile('/workspace/packages/kserve/src/extensionsHelper.ts', pluginPackageDetails),
    ).toBe(false);
  });
});

describe('getExtensionChunksFilter', () => {
  const filter = getExtensionChunksFilter(pluginPackageDetails);

  it('should include async chunks originating from an extensions.ts file', () => {
    const chunk = mockChunkWithOrigin('/workspace/packages/kserve/extensions.ts');
    expect(filter(chunk)).toBe(true);
  });

  it('should include async chunks originating from an extensions/ directory', () => {
    const chunk = mockChunkWithOrigin('/workspace/packages/model-serving/extensions/odh.ts');
    expect(filter(chunk)).toBe(true);
  });

  it('should exclude initial chunks even if originating from extension files', () => {
    const chunk = mockChunkWithOrigin('/workspace/packages/kserve/extensions.ts', true);
    expect(filter(chunk)).toBe(false);
  });

  it('should exclude async chunks originating from non-extension source files', () => {
    const chunk = mockChunkWithOrigin('/workspace/packages/kserve/src/SomeLazyPage.tsx');
    expect(filter(chunk)).toBe(false);
  });

  it('should exclude chunks from unrelated directories', () => {
    const chunk = mockChunkWithOrigin('/workspace/node_modules/lodash/index.js');
    expect(filter(chunk)).toBe(false);
  });

  it('should include chunks when any origin matches an extension file', () => {
    const chunk = {
      canBeInitial: () => false,
      groupsIterable: [
        {
          origins: [{ module: { resource: '/workspace/packages/kserve/src/utils.ts' } }],
        },
        {
          origins: [{ module: { resource: '/workspace/packages/kserve/extensions.ts' } }],
        },
      ],
    };
    expect(filter(chunk)).toBe(true);
  });

  it('should handle origins with missing module gracefully', () => {
    const chunk = {
      canBeInitial: () => false,
      groupsIterable: [
        {
          origins: [{ module: null }],
        },
      ],
    };
    expect(filter(chunk)).toBe(false);
  });
});

describe('getPluginChunkName', () => {
  const getName = getPluginChunkName(pluginPackageDetails);

  describe('default plugin chunk naming', () => {
    it('should return plugin-<shortName> when all async chunks are unnamed', () => {
      const module = mockModule('/workspace/packages/kserve/src/index.ts');
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBe('plugin-kserve');
    });
  });

  describe('explicit webpackChunkName', () => {
    it('should preserve the name when all async chunks share the same webpackChunkName', () => {
      const module = mockModule('/workspace/packages/kserve/src/deploy.ts');
      const chunks = [mockChunk('kserve-deploy'), mockChunk('kserve-deploy')];
      expect(getName(module, chunks)).toBe('kserve-deploy');
    });

    it('should fall back to default when async chunks have different names', () => {
      const module = mockModule('/workspace/packages/kserve/src/utils.ts');
      const chunks = [mockChunk('kserve-deploy'), mockChunk('kserve-monitoring')];
      expect(getName(module, chunks)).toBe('plugin-kserve');
    });

    it('should fall back to default when some chunks are named and some are not', () => {
      const module = mockModule('/workspace/packages/kserve/src/shared.ts');
      const chunks = [mockChunk('kserve-deploy'), mockChunk(undefined)];
      expect(getName(module, chunks)).toBe('plugin-kserve');
    });
  });

  describe('initial chunk filtering', () => {
    it('should ignore initial chunks and use the async chunk name', () => {
      const module = mockModule('/workspace/packages/kserve/src/deploy.ts');
      const chunks = [mockChunk('main', true), mockChunk('kserve-deploy')];
      expect(getName(module, chunks)).toBe('kserve-deploy');
    });

    it('should fall back to default when only initial chunks exist', () => {
      const module = mockModule('/workspace/packages/kserve/src/index.ts');
      const chunks = [mockChunk('main', true)];
      expect(getName(module, chunks)).toBe('plugin-kserve');
    });
  });

  describe('unknown modules', () => {
    it('should return undefined for a module outside all plugin packages', () => {
      const module = mockModule('/workspace/node_modules/lodash/index.js');
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBeUndefined();
    });

    it('should return undefined when module.resource is undefined', () => {
      const module = mockModule(undefined);
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBeUndefined();
    });
  });

  describe('path matching precision', () => {
    it('should not match a directory whose name is a prefix of a plugin path', () => {
      const module = mockModule('/workspace/packages/kserve-extra/src/index.ts');
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBeUndefined();
    });
  });
});
