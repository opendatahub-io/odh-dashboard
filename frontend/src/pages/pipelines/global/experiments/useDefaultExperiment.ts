import React from 'react';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentKF, PipelinesFilterOp } from '#~/concepts/pipelines/kfTypes';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';

/**
 * Fetch the first created experiment and check it's name to make sure it's default experiment
 */
const useDefaultExperiment = (): FetchState<ExperimentKF | null> => {
  const { api } = usePipelinesAPI();

  const getDefaultExperiment = React.useCallback<
    FetchStateCallbackPromise<ExperimentKF | null>
  >(async () => {
    const response = await api.listExperiments(
      {},
      {
        filter: {
          predicates: [
            // eslint-disable-next-line camelcase
            { key: 'name', operation: PipelinesFilterOp.EQUALS, string_value: 'Default' },
          ],
        },
        pageSize: 1,
      },
    );

    return response.experiments?.[0] || null;
  }, [api]);

  return useFetchState(getDefaultExperiment, null);
};

export default useDefaultExperiment;
