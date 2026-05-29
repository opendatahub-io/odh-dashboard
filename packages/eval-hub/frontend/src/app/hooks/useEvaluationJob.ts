import React from 'react';
import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import { getEvaluationJob } from '~/app/api/k8s';
import { EvaluationJob } from '~/app/types';
import { POLL_INTERVAL } from '~/app/utilities/const';

export const useEvaluationJob = (
  namespace?: string,
  jobId?: string,
): [EvaluationJob | null, boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<EvaluationJob | null>>(
    (opts: APIOptions) => {
      if (!namespace || !jobId) {
        return Promise.resolve(null);
      }
      return getEvaluationJob('', namespace, jobId)(opts);
    },
    [namespace, jobId],
  );

  const [job, loaded, error] = useFetchState<EvaluationJob | null>(callback, null, {
    initialPromisePurity: true,
    refreshRate: POLL_INTERVAL,
  });

  return [job, loaded, error];
};
