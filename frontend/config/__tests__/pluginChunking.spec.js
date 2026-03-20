const { getPluginChunkName } = require('../pluginChunking');

const pluginPackageDetails = [
  { shortName: 'kserve', location: '/workspace/packages/kserve' },
  { shortName: 'model-serving', location: '/workspace/packages/model-serving' },
];

const mockModule = (resource) => ({ resource });

const mockChunk = (name, isInitial = false) => ({
  name,
  canBeInitial: () => isInitial,
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
    it('should return false for a module outside all plugin packages', () => {
      const module = mockModule('/workspace/node_modules/lodash/index.js');
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBe(false);
    });

    it('should return false when module.resource is undefined', () => {
      const module = mockModule(undefined);
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBe(false);
    });
  });

  describe('path matching precision', () => {
    it('should not match a directory whose name is a prefix of a plugin path', () => {
      const module = mockModule('/workspace/packages/kserve-extra/src/index.ts');
      const chunks = [mockChunk(undefined)];
      expect(getName(module, chunks)).toBe(false);
    });
  });
});
