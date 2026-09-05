import { loadRemote } from '@module-federation/runtime';
import { initSegment } from '@odh-dashboard/analytics';
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import { noopAnalytics } from '@odh-dashboard/ui-core';
import pluginExtensions, { featureFlags } from './distribution-extensions';
import ProjectsContextProvider from './context/ProjectsContextProvider';
import { createDistribution } from '../../base/src/lib';

const remoteEntry = process.env.MODEL_SERVING_REMOTE_ENTRY;

// Ensure the host publishes ui-core's root export into the federation share scope.
// The shell otherwise consumes only ui-core subpath exports.
void noopAnalytics;
void commonFetch;
void initSegment;

const start = async () => {
  const extensions: Record<string, Extension[]> = { ...pluginExtensions };
  const resolvedFeatureFlags = { ...featureFlags };

  if (remoteEntry) {
    const remote = await loadRemote<{ default: Extension[] }>('modelServing/extensions');
    extensions.modelServing = remote?.default ?? [];
    resolvedFeatureFlags['model-serving-shell'] = true;
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
