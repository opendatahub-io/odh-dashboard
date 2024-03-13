import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';

const useExperimentById = (experimentId?: string): FetchState<ExperimentKFv2 | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<ExperimentKFv2 | null>>(
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
