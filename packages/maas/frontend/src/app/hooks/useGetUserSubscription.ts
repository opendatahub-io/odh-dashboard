import React from 'react';
import {
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getUserSubscription } from '~/app/api/subscriptions';
import { UserSubscription } from '~/app/types/subscriptions';

export const useGetUserSubscription = (id: string): FetchState<UserSubscription | undefined> => {
  const callback = React.useCallback<FetchStateCallbackPromise<UserSubscription | undefined>>(
    (opts: APIOptions) => getUserSubscription()(id)(opts),
    [id],
  );

  return useFetchState<UserSubscription | undefined>(callback, undefined);
};
