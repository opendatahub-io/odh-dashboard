import { useQuery } from '@tanstack/react-query';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentById = (
  experimentId?: string,
): [RegistryExperiment | null, boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      if (!experimentId) {
        throw new Error('No experiment id');
      }
      return api.getExperiment({}, experimentId);
    },
    enabled: apiAvailable && Boolean(experimentId),
    staleTime: Infinity,
  });

  return [query.data ?? null, query.isSuccess, query.error ?? undefined];
};

export default useExperimentById;
