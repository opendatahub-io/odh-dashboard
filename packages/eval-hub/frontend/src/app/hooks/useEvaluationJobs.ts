import React from 'react';
import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import { getEvaluationJobs } from '~/app/api/k8s';
import { EvaluationJob, ListEvaluationJobsParams } from '~/app/types';

export const useEvaluationJobs = (
  params?: ListEvaluationJobsParams,
): [EvaluationJob[], boolean, Error | undefined] => {
  const paramsKey = JSON.stringify(params);
  const stableParams = React.useMemo(() => params, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const callback = React.useCallback<FetchStateCallbackPromise<EvaluationJob[]>>(
    (opts: APIOptions) => getEvaluationJobs('', stableParams)(opts),
    [stableParams],
  );
  const [jobs, loaded, error] = useFetchState<EvaluationJob[]>(callback, []);

  return [jobs, loaded, error];
};
