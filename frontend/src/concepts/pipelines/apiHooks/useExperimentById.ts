import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';

const useExperimentById = (experimentId?: string): FetchState<ExperimentKF | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<ExperimentKF | null>>(
    (opts) => {
      if (!experimentId) {
        return Promise.reject(new NotReadyError('No experiment id'));
      }

      return api.getExperiment(opts, experimentId);
    },
    [api, experimentId],
  );

  return useFetchState(call, null);
};

export default useExperimentById;
