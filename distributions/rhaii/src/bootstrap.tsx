import { loadRemote } from '@module-federation/runtime';
import { initSegment } from '@odh-dashboard/analytics';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import { noopAnalytics } from '@odh-dashboard/ui-core';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import ProjectsContextProvider from './context/ProjectsContextProvider';
import { createDistribution } from '../../base/src/lib';

const remoteEntry = process.env.MODEL_SERVING_REMOTE_ENTRY;
const REMOTE_LOAD_TIMEOUT_MS = 10_000;

// Ensure the host publishes ui-core's root export into the federation share scope.
// The shell otherwise consumes only ui-core subpath exports.
void noopAnalytics;
void commonFetch;
void initSegment;

const start = async () => {
  const extensions: Record<string, Extension[]> = { ...pluginExtensions };
  const resolvedFeatureFlags = { ...featureFlags };

  if (remoteEntry) {
    try {
      const remote = await Promise.race([
        loadRemote<{ default: Extension[] }>('modelServing/extensions'),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Timed out loading the model-serving remote.')),
            REMOTE_LOAD_TIMEOUT_MS,
          );
        }),
      ]);
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
