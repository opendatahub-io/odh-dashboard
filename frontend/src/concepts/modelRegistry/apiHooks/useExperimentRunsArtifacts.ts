// React import not needed
import { useQuery } from '@tanstack/react-query';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

type AggregatedArtifacts = {
  metrics: Set<string>;
  parameters: Set<string>;
  tags: Set<string>;
};

const useExperimentRunsArtifacts = (
  experimentRuns: RegistryExperimentRun[],
): [AggregatedArtifacts, boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['runsArtifacts', experimentRuns.length],
    queryFn: async () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      if (!experimentRuns.length) {
        throw new Error('No experiment runs');
      }

      const artifactPromises = experimentRuns.map((run) =>
        api
          .getExperimentRunArtifacts({}, run.id)
          .catch(() => ({ items: [], size: 0, pageSize: 0, nextPageToken: '' })),
      );

      const allArtifacts = await Promise.all(artifactPromises);

      const aggregated: AggregatedArtifacts = {
        metrics: new Set<string>(),
        parameters: new Set<string>(),
        tags: new Set<string>(),
      };

      allArtifacts.forEach((artifactList) => {
        artifactList.items.forEach((artifact) => {
          if (artifact.artifactType === 'metric' && artifact.name) {
            aggregated.metrics.add(artifact.name);
          } else if (artifact.artifactType === 'parameter' && artifact.name) {
            aggregated.parameters.add(artifact.name);
          }
        });
      });

      experimentRuns.forEach((run) => {
        Object.keys(run.customProperties).forEach((key) => aggregated.tags.add(key));
      });

      return aggregated;
    },
    enabled: apiAvailable && experimentRuns.length > 0,
    staleTime: Infinity,
  });

  return [
    query.data ?? {
      metrics: new Set<string>(),
      parameters: new Set<string>(),
      tags: new Set<string>(),
    },
    query.isSuccess,
    query.error ?? undefined,
  ];
};

export default useExperimentRunsArtifacts;
