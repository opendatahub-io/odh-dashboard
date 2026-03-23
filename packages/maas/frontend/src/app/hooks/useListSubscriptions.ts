import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { listSubscriptions } from '../api/subscriptions';
import { MaaSSubscription } from '../types/subscriptions';

export const useListSubscriptions = (): FetchState<MaaSSubscription[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<MaaSSubscription[]>>(
    (opts: APIOptions) => listSubscriptions()(opts),
    [],
  );

  return useFetchState<MaaSSubscription[]>(callback, [], { refreshRate: POLL_INTERVAL });
};
