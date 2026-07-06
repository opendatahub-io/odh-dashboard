import React from 'react';
import {
  useFetchState,
  FetchState,
  FetchStateCallbackPromise,
  APIOptions,
  POLL_INTERVAL,
} from 'mod-arch-core';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { listAuthPolicies } from '~/app/api/auth-policies';

export const useListAuthPolicies = (): FetchState<MaaSAuthPolicy[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<MaaSAuthPolicy[]>>(
    (opts: APIOptions) => listAuthPolicies()(opts),
    [],
  );

  return useFetchState<MaaSAuthPolicy[]>(callback, [], { refreshRate: POLL_INTERVAL });
};
