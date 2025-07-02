import { useQuery } from '@tanstack/react-query';
import { RegistryArtifactList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const emptyList: RegistryArtifactList = { items: [], size: 0, pageSize: 0, nextPageToken: '' };

const useExperimentRunArtifacts = (
  experimentRunId?: string,
): [RegistryArtifactList, boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['runArtifacts', experimentRunId],
    queryFn: () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      if (!experimentRunId) {
        throw new Error('No experiment run id');
      }
      return api.getExperimentRunArtifacts({}, experimentRunId);
    },
    enabled: apiAvailable && Boolean(experimentRunId),
    staleTime: Infinity,
  });

  return [query.data ?? emptyList, query.isSuccess, query.error ?? undefined];
};

export default useExperimentRunArtifacts;
