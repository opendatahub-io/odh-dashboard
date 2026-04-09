import * as React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getPolicyInfo } from '~/app/api/auth-policies';
import type { PolicyInfoResponse } from '~/app/types/auth-policies';

export const useGetPolicyInfo = (name: string): FetchState<PolicyInfoResponse | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<PolicyInfoResponse | null>>(
    (opts: APIOptions) => {
      if (!name.trim()) {
        return Promise.resolve(null);
      }
      return getPolicyInfo(name)(opts);
    },
    [name],
  );

  return useFetchState<PolicyInfoResponse | null>(callback, null, {
    refreshRate: POLL_INTERVAL,
  });
};
