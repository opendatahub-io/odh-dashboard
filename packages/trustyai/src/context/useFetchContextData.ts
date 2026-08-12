import React from 'react';
import type { TrustyAPIState } from './useTrustyAIAPIState';
import useFetchBiasMetricConfigs from './useFetchBiasMetricConfigs';
import type { TrustyAIContextData } from '../types';

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
