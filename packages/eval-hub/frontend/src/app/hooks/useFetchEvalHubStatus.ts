import * as React from 'react';
import { useFetchState, FetchStateCallbackPromise, APIOptions } from 'mod-arch-core';
import { getEvalHubCRStatus } from '~/app/api/k8s';
import { EvalHubCRStatus } from '~/app/types';
import { STATUS_REFRESH_INTERVAL, NO_REFRESH_INTERVAL } from '~/app/utilities/const';

type FetchEvalHubStatusResult = {
  data: EvalHubCRStatus | null;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
};

const useFetchEvalHubStatus = (
  namespace: string | undefined,
  activelyRefresh?: boolean,
): FetchEvalHubStatusResult => {
  const callback = React.useCallback<FetchStateCallbackPromise<EvalHubCRStatus | null>>(
    (opts: APIOptions) => {
      if (!namespace) {
        return Promise.reject(new Error('No namespace provided'));
      }
      return getEvalHubCRStatus('', namespace)(opts);
    },
    [namespace],
  );

  const [data, loaded, error, refresh] = useFetchState(callback, null, {
    initialPromisePurity: true,
    refreshRate: activelyRefresh ? STATUS_REFRESH_INTERVAL : NO_REFRESH_INTERVAL,
  });

  return { data, loaded, error, refresh };
};

export default useFetchEvalHubStatus;
