import * as React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getSubscriptionInfo } from '~/app/api/subscriptions';
import { SubscriptionInfoResponse } from '~/app/types/subscriptions';

export const useGetSubscriptionInfo = (
  name: string,
): FetchState<SubscriptionInfoResponse | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SubscriptionInfoResponse | null>>(
    (opts: APIOptions) => getSubscriptionInfo(name)(opts),
    [name],
  );

  return useFetchState<SubscriptionInfoResponse | null>(callback, null, {
    refreshRate: POLL_INTERVAL,
  });
};
