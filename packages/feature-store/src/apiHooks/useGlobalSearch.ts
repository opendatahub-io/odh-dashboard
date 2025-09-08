import { useCallback } from 'react';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { GlobalSearchResponse } from '../types/search';

interface UseGlobalSearchOptions {
  projects: string[];
  query: string;
  page?: number;
  limit?: number;
}

const useGlobalSearch = (): {
  search: (options: UseGlobalSearchOptions) => Promise<GlobalSearchResponse>;
  apiAvailable: boolean;
} => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const search = useCallback(
    async ({
      projects,
      query,
      page = 1,
      limit = 50,
    }: UseGlobalSearchOptions): Promise<GlobalSearchResponse> => {
      if (!apiAvailable) {
        throw new Error('Feature Store API is not available');
      }

      return api.getGlobalSearch({}, projects, query, page, limit);
    },
    [api, apiAvailable],
  );

  return {
    search,
    apiAvailable,
  };
};

export default useGlobalSearch;
