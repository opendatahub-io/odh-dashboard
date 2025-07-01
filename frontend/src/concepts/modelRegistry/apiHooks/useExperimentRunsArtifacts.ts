import * as React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from 'mod-arch-shared';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

type AggregatedArtifacts = {
  metrics: Set<string>;
  parameters: Set<string>;
  tags: Set<string>;
};

const useExperimentRunsArtifacts = (
  experimentRuns: RegistryExperimentRun[],
): FetchState<AggregatedArtifacts> => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const callback = React.useCallback<FetchStateCallbackPromise<AggregatedArtifacts>>(
    async (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }
      if (!experimentRuns.length) {
        return Promise.reject(new NotReadyError('No experiment runs'));
      }

      // Fetch artifacts for all experiment runs in parallel
      const artifactPromises = experimentRuns.map((run) =>
        api
          .getExperimentRunArtifacts(opts, run.id)
          .catch(() => ({ items: [], size: 0, pageSize: 0, nextPageToken: '' })),
      );

      const allArtifacts = await Promise.all(artifactPromises);

      // Aggregate all unique metrics, parameters, and tags
      const aggregated: AggregatedArtifacts = {
        metrics: new Set<string>(),
        parameters: new Set<string>(),
        tags: new Set<string>(),
      };

      // Process artifacts based on artifactType
      allArtifacts.forEach((artifactList) => {
        artifactList.items.forEach((artifact) => {
          if (artifact.artifactType === 'metric' && artifact.name) {
            aggregated.metrics.add(artifact.name);
          } else if (artifact.artifactType === 'parameter' && artifact.name) {
            aggregated.parameters.add(artifact.name);
          }
        });
      });

      // Get tags from experiment run custom properties
      experimentRuns.forEach((run) => {
        Object.keys(run.customProperties).forEach((key) => {
          aggregated.tags.add(key);
        });
      });

      return aggregated;
    },
    [api, apiAvailable, experimentRuns],
  );

  return useFetchState(
    callback,
    { metrics: new Set(), parameters: new Set(), tags: new Set() },
    { initialPromisePurity: true },
  );
};

export default useExperimentRunsArtifacts;
