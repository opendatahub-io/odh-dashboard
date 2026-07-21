import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  NotReadyError,
  APIOptions,
} from 'mod-arch-core';
import { NemoGuardrailsStatus } from '~/app/types';
import { NO_REFRESH_INTERVAL, REFRESH_INTERVAL } from '~/app/const';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchNemoGuardrailsStatus = (
  activelyRefresh?: boolean,
  enabled = true,
): FetchStateObject<NemoGuardrailsStatus | null> => {
  const { api, apiAvailable } = useGenAiAPI();

  const callback = React.useCallback<FetchStateCallbackPromise<NemoGuardrailsStatus | null>>(
    async (opts: APIOptions) => {
      if (!apiAvailable || !enabled) {
        return Promise.reject(new NotReadyError('NemoGuardrails status not available'));
      }
      return api.getNemoGuardrailsStatus(opts).then((r) => r);
    },
    [api, apiAvailable, enabled],
  );

  const [data, loaded, error, refresh] = useFetchState(callback, null, {
    initialPromisePurity: true,
    refreshRate: activelyRefresh ? REFRESH_INTERVAL : NO_REFRESH_INTERVAL,
  });

  return { data, loaded, error, refresh };
};

export default useFetchNemoGuardrailsStatus;
