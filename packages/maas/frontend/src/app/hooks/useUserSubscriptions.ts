import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { listUserSubscriptions } from '~/app/api/subscriptions';
import { UserSubscription } from '~/app/types/subscriptions';

export const useUserSubscriptions = (): FetchState<UserSubscription[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<UserSubscription[]>>(
    (opts: APIOptions) => listUserSubscriptions()(opts),
    [],
  );

  return useFetchState<UserSubscription[]>(callback, []);
};
