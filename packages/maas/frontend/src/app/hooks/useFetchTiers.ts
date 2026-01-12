import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { Tier } from '~/app/types/tier';
import { getTiers } from '~/app/api/tiers';

export const useFetchTiers = (): FetchState<Tier[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Tier[]>>(
    (opts: APIOptions) => getTiers()(opts),
    [],
  );

  return useFetchState<Tier[]>(callback, [], { refreshRate: POLL_INTERVAL });
};
