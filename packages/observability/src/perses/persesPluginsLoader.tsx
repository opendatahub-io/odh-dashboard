import type { PluginLoader, PluginModuleResource } from '@perses-dev/plugin-system';
import { getPluginModuleCompoundKey, remotePluginLoader } from '@perses-dev/plugin-system';

import * as prometheusPlugin from '@perses-dev/prometheus-plugin';

import { PERSES_PROXY_BASE_PATH } from './perses-client';

declare global {
  interface Window {
    PERSES_PLUGIN_ASSETS_PATH?: string;
    PERSES_APP_CONFIG?: { api_prefix: string };
  }
}

/**
 * Tell Perses plugin manifests to resolve asset URLs through our proxy.
 * Each manifest's getPublicPath reads PERSES_PLUGIN_ASSETS_PATH (primary)
 * or PERSES_APP_CONFIG.api_prefix (fallback) to prefix chunk URLs.
 */
if (typeof window !== 'undefined') {
  window.PERSES_PLUGIN_ASSETS_PATH = PERSES_PROXY_BASE_PATH;
  window.PERSES_APP_CONFIG = { api_prefix: PERSES_PROXY_BASE_PATH };
}

const BUNDLED_OVERRIDES = new Map<string, { getPluginModule: () => PluginModuleResource }>([
  ['@perses-dev/prometheus-plugin', prometheusPlugin],
]);

const remoteLoader = remotePluginLoader({
  apiPrefix: PERSES_PROXY_BASE_PATH,
  baseURL: PERSES_PROXY_BASE_PATH,
});

/**
 * Composite PluginLoader: discovers plugins from the Perses server API
 * via remotePluginLoader and overrides specific plugins with locally
 * bundled versions when a newer build is needed.
 *
 * Perses's PluginRuntime (inside remotePluginLoader) already provides a
 * Module Federation runtime with shared singletons (React, emotion,
 * Perses libs, etc.) — see monitoring-plugin's PersesWrapper.tsx.
 */
export const pluginLoader: PluginLoader = {
  getInstalledPlugins: async () => {
    const remotePlugins = await remoteLoader.getInstalledPlugins();
    return remotePlugins.map((resource) => {
      const override = BUNDLED_OVERRIDES.get(resource.metadata.name);
      return override ? override.getPluginModule() : resource;
    });
  },

  importPluginModule: async (resource: PluginModuleResource) => {
    const override = BUNDLED_OVERRIDES.get(resource.metadata.name);
    if (override) {
      const {
        metadata: { version, registry },
        spec: { plugins },
      } = resource;
      const moduleExports: Record<string, unknown> = Object.fromEntries(Object.entries(override));
      for (const {
        kind,
        spec: { name },
      } of plugins) {
        if (moduleExports[name]) {
          const key = getPluginModuleCompoundKey({ kind, name, registry, version });
          moduleExports[key] = moduleExports[name];
        }
      }
      return moduleExports;
    }
    // FIXME: This can be removed once the backend supports versioned plugin paths (perses/shared#128).
    // Strip version/registry so PluginRuntime builds name-only URLs, then re-key.
    const { version, registry } = resource.metadata;
    const loaded = await remoteLoader.importPluginModule({
      ...resource,
      metadata: { ...resource.metadata, version: '', registry: '' },
    } satisfies PluginModuleResource);
    const result: Record<string, unknown> = {};
    for (const {
      kind,
      spec: { name },
    } of resource.spec.plugins) {
      const strippedKey = getPluginModuleCompoundKey({ kind, name });
      // Suppress 'unknown' type error by casting loaded to Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const loadedRecord = loaded as Record<string, unknown>;
      if (loadedRecord[strippedKey]) {
        result[getPluginModuleCompoundKey({ kind, name, registry, version })] =
          loadedRecord[strippedKey];
      }
    }
    return result;
  },
};
