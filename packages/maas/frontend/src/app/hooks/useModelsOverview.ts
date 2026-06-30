import React from 'react';
import {
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { getModelsOverview } from '~/app/api/subscriptions';
import { ModelOverviewItem } from '~/app/types/subscriptions';

export const useModelsOverview = (): FetchState<ModelOverviewItem[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<ModelOverviewItem[]>>(
    (opts: APIOptions) => getModelsOverview()(opts),
    [],
  );

  return useFetchState<ModelOverviewItem[]>(callback, [], {
    refreshRate: POLL_INTERVAL,
  });
};
