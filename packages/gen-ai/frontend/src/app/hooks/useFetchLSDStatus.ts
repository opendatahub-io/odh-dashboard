import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  NotReadyError,
  APIOptions,
} from 'mod-arch-core';
import { LlamaStackDistributionModel } from '~/app/types';
import { NO_REFRESH_INTERVAL, REFRESH_INTERVAL } from '~/app/const';
import { useGenAiAPI } from './useGenAiAPI';
import useChatPlaygroundEnabled from './useChatPlaygroundEnabled';

const useFetchLSDStatus = (
  activelyRefresh?: boolean,
): FetchStateObject<LlamaStackDistributionModel | null> => {
  const { api, apiAvailable } = useGenAiAPI();
  const isChatPlaygroundEnabled = useChatPlaygroundEnabled();
  const callback = React.useCallback<FetchStateCallbackPromise<LlamaStackDistributionModel>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      if (!isChatPlaygroundEnabled) {
        return Promise.reject(new NotReadyError('Playground is not enabled'));
      }
      return api.getLSDStatus(opts).then((r) => r);
    },
    [api, apiAvailable, isChatPlaygroundEnabled],
  );

  const [data, loaded, error, refresh] = useFetchState(callback, null, {
    initialPromisePurity: true,
    // Refresh every 3 seconds if actively refreshing
    refreshRate: activelyRefresh ? REFRESH_INTERVAL : NO_REFRESH_INTERVAL,
  });
  return { data, loaded, error, refresh };
};

export default useFetchLSDStatus;
