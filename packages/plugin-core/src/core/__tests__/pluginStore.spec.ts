import { PluginStore } from '../plugin-store';

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
});
