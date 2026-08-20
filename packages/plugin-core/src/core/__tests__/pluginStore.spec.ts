import { PluginStore } from '../plugin-store';
import { SUPPRESS_EXTENSION_TYPE } from '../../extension-points/suppress';
import { PATCH_EXTENSION_TYPE } from '../../extension-points/patch';

describe('PluginStore', () => {
  it('should filter extensions based on feature flags', () => {
    const pluginStore = new PluginStore({
      test: [
        {
          type: 'test',
          flags: {
            required: ['test'],
            disallowed: ['test2'],
          },
          properties: {},
        },
      ],
    });

    expect(pluginStore.getExtensions()).toHaveLength(0);

    pluginStore.setFeatureFlags({
      test: true,
    });

    expect(pluginStore.getExtensions()).toHaveLength(0);

    pluginStore.setFeatureFlags({
      test: true,
      test2: false,
    });

    expect(pluginStore.getExtensions()).toHaveLength(1);

    pluginStore.setFeatureFlags({
      test: true,
      test2: true,
    });

    expect(pluginStore.getExtensions()).toHaveLength(0);

    pluginStore.setFeatureFlags({
      test: false,
      test2: true,
    });

    expect(pluginStore.getExtensions()).toHaveLength(0);
  });

  describe('resolution pipeline wiring', () => {
    it('should keep all in-use registrations when duplicates pass feature flags', () => {
      const store = new PluginStore({
        'plugin-a': [
          {
            type: 'app.navigation/href',
            properties: { id: 'nav', title: 'From A', href: '/a' },
          },
        ],
        'plugin-b': [
          {
            type: 'app.navigation/href',
            flags: { required: ['feature-x'] },
            properties: { id: 'nav', title: 'From B', href: '/b' },
          },
        ],
      });

      const before = store.getExtensions();
      expect(before).toHaveLength(1);
      expect(before[0].properties.title).toBe('From A');

      store.setFeatureFlags({ 'feature-x': true });
      const after = store.getExtensions();
      expect(after).toHaveLength(2);
      expect(after.map((e) => e.properties.title)).toEqual(['From A', 'From B']);
    });

    it('should keep a shared section when only one contributor flag is enabled', () => {
      const store = new PluginStore({
        maas: [
          {
            type: 'app.navigation/section',
            flags: { required: ['modelAsService'] },
            properties: { id: 'gen-ai-studio', title: 'Gen AI studio' },
          },
        ],
        'gen-ai': [
          {
            type: 'app.navigation/section',
            flags: { required: ['plugin-gen-ai'] },
            properties: { id: 'gen-ai-studio', title: 'Gen AI studio' },
          },
        ],
      });

      store.setFeatureFlags({ modelAsService: true });
      expect(store.getExtensions()).toHaveLength(1);
      expect(store.getExtensions()[0].pluginName).toBe('maas');

      store.setFeatureFlags({ modelAsService: false, 'plugin-gen-ai': true });
      expect(store.getExtensions()).toHaveLength(1);
      expect(store.getExtensions()[0].pluginName).toBe('gen-ai');

      store.setFeatureFlags({ modelAsService: true, 'plugin-gen-ai': true });
      expect(store.getExtensions()).toHaveLength(2);
    });

    it('should suppress then redefine the same (type, id)', () => {
      const store = new PluginStore({
        package: [
          {
            type: 'app.navigation/href',
            properties: { id: 'item', title: 'Original', href: '/old', path: '/old/*' },
          },
        ],
        distribution: [
          {
            type: SUPPRESS_EXTENSION_TYPE,
            properties: { targetType: 'app.navigation/href', targetId: 'item' },
          },
          {
            type: 'app.navigation/href',
            properties: { id: 'item', title: 'Custom', href: '/new', path: '/new/*' },
          },
        ],
      });

      const exts = store.getExtensions();
      expect(exts).toHaveLength(1);
      expect(exts[0].properties.title).toBe('Custom');
      expect(exts[0].properties.href).toBe('/new');
    });

    it('should suppress and patch regardless of their own feature flags', () => {
      const store = new PluginStore({
        package: [
          {
            type: 'app.navigation/href',
            properties: { id: 'item', title: 'Original', href: '/x', section: 'sec' },
          },
          {
            type: 'app.navigation/section',
            properties: { id: 'gone', title: 'Gone' },
          },
        ],
        distribution: [
          {
            type: SUPPRESS_EXTENSION_TYPE,
            flags: { required: ['never-on'] },
            properties: { targetType: 'app.navigation/section', targetId: 'gone' },
          },
          {
            type: PATCH_EXTENSION_TYPE,
            flags: { required: ['never-on'] },
            properties: {
              targetType: 'app.navigation/href',
              targetId: 'item',
              patch: { section: null, title: 'Forced' },
            },
          },
        ],
      });

      const exts = store.getExtensions();
      expect(exts).toHaveLength(1);
      expect(exts[0].properties.id).toBe('item');
      expect(exts[0].properties.section).toBeUndefined();
      expect(exts[0].properties.title).toBe('Forced');
    });

    it('should apply patches to each matching in-use extension after flag changes', () => {
      const store = new PluginStore({
        package: [
          {
            type: 'app.navigation/href',
            flags: { required: ['feature-a'] },
            properties: { id: 'item', title: 'A', href: '/a', group: 'g1' },
          },
        ],
        other: [
          {
            type: 'app.navigation/href',
            flags: { required: ['feature-b'] },
            properties: { id: 'item', title: 'B', href: '/b', group: 'g2' },
          },
        ],
        distribution: [
          {
            type: PATCH_EXTENSION_TYPE,
            properties: {
              targetType: 'app.navigation/href',
              targetId: 'item',
              patch: { title: 'Patched', group: 'g3' },
            },
          },
        ],
      });

      store.setFeatureFlags({ 'feature-a': true });
      let exts = store.getExtensions();
      expect(exts).toHaveLength(1);
      expect(exts[0].properties.title).toBe('Patched');
      expect(exts[0].properties.href).toBe('/a');

      store.setFeatureFlags({ 'feature-a': false, 'feature-b': true });
      exts = store.getExtensions();
      expect(exts).toHaveLength(1);
      expect(exts[0].properties.title).toBe('Patched');
      expect(exts[0].properties.href).toBe('/b');
    });

    it('should not include suppress or patch extensions in getExtensions()', () => {
      const store = new PluginStore({
        package: [
          {
            type: 'app.navigation/href',
            properties: { id: 'item', title: 'Original', href: '/x' },
          },
        ],
        distribution: [
          {
            type: SUPPRESS_EXTENSION_TYPE,
            properties: { targetType: 'app.navigation/href', targetId: 'missing' },
          },
          {
            type: PATCH_EXTENSION_TYPE,
            properties: {
              targetType: 'app.navigation/href',
              targetId: 'item',
              patch: { title: 'Patched' },
            },
          },
        ],
      });

      const types = store.getExtensions().map((e) => e.type);
      expect(types).not.toContain(SUPPRESS_EXTENSION_TYPE);
      expect(types).not.toContain(PATCH_EXTENSION_TYPE);
      expect(store.getExtensions()[0].properties.title).toBe('Patched');
    });

    it('should not allow a suppress to remove a patch', () => {
      const store = new PluginStore({
        package: [
          {
            type: 'app.navigation/href',
            properties: { id: 'item', title: 'Original', href: '/x' },
          },
        ],
        distribution: [
          {
            type: PATCH_EXTENSION_TYPE,
            properties: {
              id: 'item',
              targetType: 'app.navigation/href',
              targetId: 'item',
              patch: { title: 'Patched' },
            },
          },
        ],
        other: [
          {
            type: SUPPRESS_EXTENSION_TYPE,
            properties: { targetType: PATCH_EXTENSION_TYPE, targetId: 'item' },
          },
        ],
      });

      expect(store.getExtensions()[0].properties.title).toBe('Patched');
    });
  });
});
