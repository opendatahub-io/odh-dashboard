import React from 'react';
import {
  useFetchState,
  APIOptions,
  FetchStateCallbackPromise,
  FetchStateRefreshPromise,
} from 'mod-arch-core';
import { getEvaluationJobs } from '~/app/api/k8s';
import { EvaluationJob, ListEvaluationJobsParams } from '~/app/types';
import { POLL_INTERVAL } from '~/app/utilities/const';

export const useEvaluationJobs = (
  params?: ListEvaluationJobsParams,
): [EvaluationJob[], boolean, Error | undefined, FetchStateRefreshPromise<EvaluationJob[]>] => {
  const paramsKey = JSON.stringify(params);
  const stableParams = React.useMemo(() => params, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const callback = React.useCallback<FetchStateCallbackPromise<EvaluationJob[]>>(
    (opts: APIOptions) => getEvaluationJobs('', stableParams)(opts),
    [stableParams],
  );
  const [jobs, loaded, error, refresh] = useFetchState<EvaluationJob[]>(callback, [], {
    refreshRate: POLL_INTERVAL,
  });

  return [jobs, loaded, error, refresh];
};
