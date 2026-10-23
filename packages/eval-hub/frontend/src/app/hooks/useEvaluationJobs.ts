import React from 'react';
import {
  useFetchState,
  NotReadyError,
  APIOptions,
  FetchStateCallbackPromise,
  FetchStateRefreshPromise,
} from 'mod-arch-core';
import { getEvaluationJobs } from '~/app/api/k8s';
import { EvaluationJobsResult, ListEvaluationJobsParams } from '~/app/types';
import { POLL_INTERVAL } from '~/app/utilities/const';

const EMPTY_RESULT: EvaluationJobsResult = {
  jobs: [],
  totalCount: 0,
  truncated: false,
};

export const useEvaluationJobs = (
  params?: ListEvaluationJobsParams,
  evalHubNotReady?: boolean,
  pollingEnabled = true,
): [
  EvaluationJobsResult,
  boolean,
  Error | undefined,
  FetchStateRefreshPromise<EvaluationJobsResult>,
] => {
  const paramsKey = JSON.stringify(params);
  const stableParams = React.useMemo(() => params, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const callback = React.useCallback<FetchStateCallbackPromise<EvaluationJobsResult>>(
    (opts: APIOptions) => {
      if (evalHubNotReady) {
        return Promise.reject(new NotReadyError('EvalHub is not ready'));
      }
      return getEvaluationJobs('', stableParams)(opts);
    },
    [stableParams, evalHubNotReady],
  );
  const [result, loaded, error, refresh] = useFetchState<EvaluationJobsResult>(
    callback,
    EMPTY_RESULT,
    {
      initialPromisePurity: true,
      refreshRate: evalHubNotReady || !pollingEnabled ? 0 : POLL_INTERVAL,
    },
  );

  return [result, loaded, error, refresh];
};
