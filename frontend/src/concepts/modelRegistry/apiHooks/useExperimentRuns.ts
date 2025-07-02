import { useQuery } from '@tanstack/react-query';
import { ModelRegistryQueryParams, RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useExperimentRuns = (
  experimentId?: string,
  params?: ModelRegistryQueryParams,
): [RegistryExperimentRun[], boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['experimentRuns', experimentId, params],
    queryFn: async () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      if (!experimentId) {
        throw new Error('No experiment id');
      }

      const all: RegistryExperimentRun[] = [];
      let next: string | undefined;
      do {
        const response = await api.getExperimentRuns({}, experimentId, {
          ...params,
          pageSize: 100,
          ...(next && { nextPageToken: next }),
        });
        all.push(...response.items);
        next = response.nextPageToken;
      } while (next);
      return all;
    },
    enabled: apiAvailable && Boolean(experimentId),
    staleTime: Infinity,
  });

  return [query.data ?? [], query.isSuccess, query.error ?? undefined];
};

export default useExperimentRuns;
