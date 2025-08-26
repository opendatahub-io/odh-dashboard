import { useQuery } from '@tanstack/react-query';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentRunById = (
  experimentRunId?: string,
): [RegistryExperimentRun | null, boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['run', experimentRunId],
    queryFn: () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      if (!experimentRunId) {
        throw new Error('No experiment run id');
      }
      return api.getExperimentRun({}, experimentRunId);
    },
    enabled: apiAvailable && Boolean(experimentRunId),
    staleTime: Infinity,
  });

  return [query.data ?? null, query.isSuccess, query.error ?? undefined];
};

export default useExperimentRunById;
