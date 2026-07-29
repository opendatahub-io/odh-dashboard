import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '#~/redux/hooks';
import { fetchComponents } from '#~/services/componentsServices';
import { OdhApplication } from '#~/types';
import { POLL_INTERVAL } from './const';

export const useWatchComponentsQuery = (
  installed: boolean,
): { components: OdhApplication[]; loaded: boolean; loadError: Error | undefined } => {
  const queryClient = useQueryClient();
  const forceUpdate = useAppSelector((state) => state.forceComponentsUpdate);
  const initForce = React.useRef<number>(forceUpdate);

  const { data, isLoading, error } = useQuery<OdhApplication[], Error>({
    queryKey: ['components', installed],
    queryFn: () => fetchComponents(installed),
    refetchInterval: POLL_INTERVAL,
  });

  React.useEffect(() => {
    if (initForce.current !== forceUpdate) {
      initForce.current = forceUpdate;
      queryClient.invalidateQueries({ queryKey: ['components', installed] });
    }
  }, [forceUpdate, installed, queryClient]);

  return {
    components: data ?? [],
    loaded: !isLoading,
    loadError: error ?? undefined,
  };
};
