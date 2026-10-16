import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  NotReadyError,
  APIOptions,
} from 'mod-arch-core';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { NemoGuardrailsStatus } from '~/app/types';
import { NO_REFRESH_INTERVAL, REFRESH_INTERVAL } from '~/app/const';
import { GRID } from '~/odh/extensions';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchNemoGuardrailsStatus = (
  activelyRefresh?: boolean,
  enabled = true,
): FetchStateObject<NemoGuardrailsStatus | null> => {
  const { api, apiAvailable } = useGenAiAPI();
  const [gridEnabled] = useFeatureFlag(GRID);

  const callback = React.useCallback<FetchStateCallbackPromise<NemoGuardrailsStatus | null>>(
    async (opts: APIOptions) => {
      if (!apiAvailable || !enabled || gridEnabled) {
        return Promise.reject(new NotReadyError('NemoGuardrails status not available'));
      }
      return api.getNemoGuardrailsStatus(opts).then((r) => r);
    },
    [api, apiAvailable, enabled, gridEnabled],
  );

  const [data, loaded, error, refresh] = useFetchState(callback, null, {
    initialPromisePurity: true,
    refreshRate: activelyRefresh ? REFRESH_INTERVAL : NO_REFRESH_INTERVAL,
  });

  return { data, loaded, error, refresh };
};

export default useFetchNemoGuardrailsStatus;
