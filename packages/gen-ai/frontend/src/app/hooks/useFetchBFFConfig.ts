import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  NotReadyError,
  APIOptions,
} from 'mod-arch-core';
import { BFFConfig } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchBFFConfig = (): FetchStateObject<BFFConfig | null> => {
  const { api, apiAvailable } = useGenAiAPI();
  const callback = React.useCallback<FetchStateCallbackPromise<BFFConfig>>(
    async (opts: APIOptions) => {
      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return api.getBFFConfig(opts).then((r) => r);
    },
    [api, apiAvailable],
  );

  const [data, loaded, error, refresh] = useFetchState(callback, null, {
    initialPromisePurity: true,
  });
  return { data, loaded, error, refresh };
};

export default useFetchBFFConfig;
