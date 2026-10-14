import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getManagedPipelines } from '~/app/api/pipelines';
import type { ManagedPipeline } from '~/app/types';

export function useManagedPipelinesQuery(
  namespace?: string,
): UseQueryResult<ManagedPipeline[], Error> {
  return useQuery({
    enabled: !!namespace,
    queryKey: ['autorag', 'managedPipelines', namespace],
    queryFn: ({ signal }) => getManagedPipelines('', namespace!, { signal }),
    staleTime: 60_000,
    retry: 1,
  });
}
