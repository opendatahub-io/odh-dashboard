import * as React from 'react';
import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import type { FetchStateCallbackPromise } from '@odh-dashboard/ui-core/hooks/useFetchState';
import {
  fetchOperatorSubscriptionStatus,
  type OperatorSubscriptionStatus,
} from '@odh-dashboard/k8s-core';

export const useWatchOperatorSubscriptionStatus =
  (): FetchState<OperatorSubscriptionStatus | null> => {
    const callback = React.useCallback<
      FetchStateCallbackPromise<OperatorSubscriptionStatus | null>
    >((opts) => fetchOperatorSubscriptionStatus('', { signal: opts.signal }), []);

    return useFetchState<OperatorSubscriptionStatus | null>(callback, null);
  };
