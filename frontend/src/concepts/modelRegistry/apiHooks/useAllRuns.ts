import { useQuery } from '@tanstack/react-query';
import { ModelRegistryQueryParams, RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const useAllRuns = (
  params?: ModelRegistryQueryParams,
): [RegistryExperimentRun[], boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const getAllRuns = async () => {
    if (!apiAvailable) {
      throw new Error('API not yet available');
    }

    const allItems: RegistryExperimentRun[] = [];
    let nextPageToken: string | undefined;

    do {
      const currentParams = {
        ...params,
        pageSize: 100,
        ...(nextPageToken && { nextPageToken }),
      };

      const response = await api.listRuns({}, currentParams);
      allItems.push(...response.items);
      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    return allItems;
  };

  const query = useQuery({
    queryKey: ['allRuns', params],
    queryFn: getAllRuns,
    enabled: apiAvailable,
    staleTime: Infinity,
  });

  return [query.data ?? [], query.isSuccess, query.error ?? undefined];
};

export default useAllRuns;
