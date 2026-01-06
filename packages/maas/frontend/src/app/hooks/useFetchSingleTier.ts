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

export const useFetchSingleTier = (tierName: string): FetchState<Tier | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Tier | null>>(
    (opts: APIOptions) => {
      if (!tierName) {
        return Promise.resolve(null);
      }
      return getTiers()(opts).then((tiers) => tiers.find((t) => t.name === tierName) || null);
    },
    [tierName],
  );

  return useFetchState<Tier | null>(callback, null, { refreshRate: POLL_INTERVAL });
};
