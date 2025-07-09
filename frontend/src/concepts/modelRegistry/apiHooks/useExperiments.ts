import { useQuery } from '@tanstack/react-query';
import { RegistryExperimentList } from '#~/concepts/modelRegistry/types';
import { useModelRegistryAPI } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';

const emptyList: RegistryExperimentList = { items: [], size: 0, pageSize: 0, nextPageToken: '' };

const useExperiments = (): [RegistryExperimentList, boolean, Error | undefined] => {
  const { api, apiAvailable } = useModelRegistryAPI();

  const query = useQuery({
    queryKey: ['experiments'],
    queryFn: () => {
      if (!apiAvailable) {
        throw new Error('API not yet available');
      }
      return api.listExperiments({});
    },
    enabled: apiAvailable,
    staleTime: Infinity,
  });

  return [query.data ?? emptyList, query.isSuccess, query.error ?? undefined];
};

export default useExperiments;
