import * as React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getResourceYaml } from '~/app/api/subscriptions';

export const useSubscriptionManagementYaml = (
  name: string,
  resourceType: string,
): FetchState<string | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<string | null>>(
    (opts: APIOptions) => getResourceYaml(name, resourceType)(opts),
    [name, resourceType],
  );

  return useFetchState<string | null>(callback, null, {
    refreshRate: POLL_INTERVAL,
  });
};
