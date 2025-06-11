import React from 'react';
import { TrustyAPIState } from '#~/concepts/trustyai/useTrustyAIAPIState';
import { TrustyAIContextData } from '#~/concepts/trustyai/context/types';
import useFetchBiasMetricConfigs from '#~/concepts/trustyai/context/useFetchBiasMetricConfigs';

const useFetchContextData = (apiState: TrustyAPIState): TrustyAIContextData => {
  const [biasMetricConfigs, biasMetricConfigsLoaded, error, refreshBiasMetricConfigs] =
    useFetchBiasMetricConfigs(apiState);

  const refresh = React.useCallback(
    () => refreshBiasMetricConfigs().then(() => undefined),
    [refreshBiasMetricConfigs],
  );

  return {
    biasMetricConfigs,
    refresh,
    loaded: biasMetricConfigsLoaded,
    error,
  };
};

export default useFetchContextData;
