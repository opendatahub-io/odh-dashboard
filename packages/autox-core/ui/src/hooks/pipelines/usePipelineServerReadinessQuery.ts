import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import { useAutoXApi } from '../../context';

export const pipelineServerReadinessKey = (namespace: string) =>
  ['pipelineServerReadiness', namespace] as const;

export function usePipelineServerReadinessQuery(
  namespace: string | undefined,
  isTransientError: (error: unknown) => boolean,
  enabled = true,
): UseQueryResult<boolean, Error> {
  const { pipelines: pipelinesApi } = useAutoXApi();
  const [initialDelayElapsed, setInitialDelayElapsed] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !namespace) {
      setInitialDelayElapsed(false);
      return;
    }

    const timeout = setTimeout(() => setInitialDelayElapsed(true), 5000);
    return () => clearTimeout(timeout);
  }, [enabled, namespace]);

  return useQuery({
    queryKey: pipelineServerReadinessKey(namespace ?? ''),
    enabled: Boolean(namespace) && enabled && initialDelayElapsed,
    queryFn: async ({ signal }) => {
      try {
        await pipelinesApi.getPipelineRunsFromBFF(
          '',
          { namespace: namespace ?? '', pageSize: 1 },
          {
            signal,
          },
        );
        return true;
      } catch (error) {
        if (isTransientError(error)) {
          return false;
        }
        throw error;
      }
    },
    refetchInterval: (query) => (query.state.data === true ? false : 5000),
    retry: false,
  });
}
