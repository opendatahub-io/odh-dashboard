import { loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import K8sSdkProvider from './context/K8sSdkProvider';
import RhaiiAppProvider from './context/RhaiiAppProvider';
import { createDistribution } from '../../base/src/lib';

const remoteEntry = process.env.MODEL_SERVING_REMOTE_ENTRY;
const REMOTE_LOAD_TIMEOUT_MS = 10_000;

const start = async () => {
  const extensions: Record<string, Extension[]> = { ...pluginExtensions };
  const resolvedFeatureFlags = { ...featureFlags };

  if (remoteEntry) {
    try {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const remote = await Promise.race([
        loadRemote<{ default: Extension[] }>('modelServing/extensions'),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Timed out loading the model-serving remote.')),
            REMOTE_LOAD_TIMEOUT_MS,
          );
        }),
      ]).finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      if (remote?.default) {
        extensions.modelServing = remote.default;
        resolvedFeatureFlags['model-serving-shell'] = true;
      } else {
        // eslint-disable-next-line no-console
        console.warn('Model-serving remote loaded without extension declarations.');
        resolvedFeatureFlags['model-serving-shell'] = false;
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to load the model-serving remote; continuing with static extensions.',
        error,
      );
      resolvedFeatureFlags['model-serving-shell'] = false;
    }
  }

  createDistribution({
    extensions,
    featureFlags: resolvedFeatureFlags,
    AppWrapper: RhaiiAppProvider,
    PluginStoreWrapper: K8sSdkProvider,
  });
};

start().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize the RHAII distribution:', error);
  const root = document.getElementById('root');
  if (root) {
    root.textContent = 'Failed to initialize the application. Please refresh the page.';
    root.style.padding = '2rem';
  }
});
