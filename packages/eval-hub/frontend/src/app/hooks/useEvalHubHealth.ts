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

const useEvalHubHealth = (): EvalHubHealthResult => {
  const callback = React.useCallback<FetchStateCallbackPromise<EvalHubHealthResponse | null>>(
    (opts: APIOptions) => getEvalHubHealth('')(opts),
    [],
  );

  const [data, loaded, error] = useFetchState<EvalHubHealthResponse | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: POLL_INTERVAL,
  });

  // The BFF always returns HTTP 200 for this endpoint.
  // Use the `available` field to determine actual EvalHub reachability.
  return {
    isHealthy: loaded && !!data && !error && data.available,
    loaded: loaded || !!error,
    error,
  };
};

export default useEvalHubHealth;
