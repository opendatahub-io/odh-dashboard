// React import not needed here
import { useQuery } from '@tanstack/react-query';
import { RegistryArtifactList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const emptyList: RegistryArtifactList = { items: [], size: 0, pageSize: 0, nextPageToken: '' };

const useExperimentRunMetricHistory = (
  experimentRunId?: string,
  metricName?: string,
): [RegistryArtifactList, boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['runMetricHistory', experimentRunId, metricName],
    queryFn: () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      if (!experimentRunId) {
        throw new Error('No experiment run id');
      }
      return api.getExperimentRunMetricHistory({}, experimentRunId, metricName);
    },
    enabled: apiAvailable && Boolean(experimentRunId),
    staleTime: Infinity,
  });

  return [query.data ?? emptyList, query.isSuccess, query.error ?? undefined];
};

export default useExperimentRunMetricHistory;
