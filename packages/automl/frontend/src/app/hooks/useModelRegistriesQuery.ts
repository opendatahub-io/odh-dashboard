import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ModelRegistriesResponse } from '~/app/types';
import { getModelRegistries } from '~/app/api/modelRegistry';

/**
 * Fetches available Model Registry instances from the BFF.
 * Only fetches when enabled (default true).
 */
export function useModelRegistriesQuery(
  enabled = true,
): UseQueryResult<ModelRegistriesResponse, Error> {
  return useQuery({
    queryKey: ['modelRegistries'],
    queryFn: () => getModelRegistries(''),
    enabled,
    retry: false,
  });
}
