import { loadRemote } from '@module-federation/runtime';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import ProjectsContextProvider from './context/ProjectsContextProvider';
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
    AppWrapper: ProjectsContextProvider,
  });
};

start().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize the RHAII distribution:', error);
});
