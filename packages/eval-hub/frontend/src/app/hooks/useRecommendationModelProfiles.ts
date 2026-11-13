import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { RecommendationModelProfile } from '~/app/types';

const useRecommendationModelProfiles = (
  namespace?: string,
): UseQueryResult<RecommendationModelProfile[], Error> =>
  useQuery<RecommendationModelProfile[]>({
    queryKey: ['evalhub', 'collection-generation', 'models', namespace],
    enabled: Boolean(namespace) && process.env.NODE_ENV !== 'production',
    queryFn: async () => {
      if (!namespace || process.env.NODE_ENV === 'production') {
        return [];
      }

      const { mockRecommendationModelProfiles } =
        await import('~/app/components/suiteBuilder/data/mockRecommendationModelProfiles');
      return mockRecommendationModelProfiles;
    },
  });

export default useRecommendationModelProfiles;
