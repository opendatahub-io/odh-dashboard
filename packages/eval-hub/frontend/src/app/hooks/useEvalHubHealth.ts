import * as React from 'react';
import { useFetchState, FetchStateCallbackPromise, APIOptions } from 'mod-arch-core';
import { getEvalHubHealth } from '~/app/api/k8s';
import { EvalHubHealthResponse } from '~/app/types';
import { POLL_INTERVAL } from '~/app/utilities/const';

type EvalHubHealthResult = {
  isHealthy: boolean;
  loaded: boolean;
  error: Error | undefined;
};

const useEvalHubHealth = (namespace?: string): EvalHubHealthResult => {
  const callback = React.useCallback<FetchStateCallbackPromise<EvalHubHealthResponse | null>>(
    (opts: APIOptions) => getEvalHubHealth('', namespace)(opts),
    [namespace],
  );

  const [data, loaded, error] = useFetchState<EvalHubHealthResponse | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: POLL_INTERVAL,
  });

  return {
    isHealthy: loaded && !!data && !error && data.available,
    loaded: loaded || !!error,
    error,
  };
};

export default useEvalHubHealth;
