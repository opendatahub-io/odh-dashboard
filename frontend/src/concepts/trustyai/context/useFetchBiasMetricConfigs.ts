import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { TrustyAPIState } from '#~/concepts/trustyai/useTrustyAIAPIState';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import { formatListResponse } from '#~/concepts/trustyai/utils';

const useFetchBiasMetricConfigs = (apiState: TrustyAPIState): FetchState<BiasMetricConfig[]> => {
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const callback = React.useCallback<FetchStateCallbackPromise<BiasMetricConfig[]>>(
    (opts) => {
      if (!biasMetricsAreaAvailable) {
        return Promise.reject(new NotReadyError('Bias metrics is not enabled'));
      }
      if (!apiState.apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      return apiState.api.listRequests(opts).then((r) => formatListResponse(r));
    },
    [apiState.api, apiState.apiAvailable, biasMetricsAreaAvailable],
  );

  return useFetchState(callback, [], { initialPromisePurity: true });
};

export default useFetchBiasMetricConfigs;
