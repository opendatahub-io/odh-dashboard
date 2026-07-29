import { useQuery } from '@tanstack/react-query';
import type { QuickStart } from '#~/concepts/quickStarts/types';
import { fetchQuickStarts } from '#~/services/quickStartsService';
import { POLL_INTERVAL } from './const';

export const useWatchQuickStartsQuery = (): {
  quickStarts: QuickStart[];
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const { data, isLoading, error } = useQuery<QuickStart[], Error>({
    queryKey: ['quickStarts'],
    queryFn: fetchQuickStarts,
    refetchInterval: POLL_INTERVAL,
  });

  return {
    quickStarts: data ?? [],
    loaded: !isLoading,
    loadError: error ?? undefined,
  };
};
