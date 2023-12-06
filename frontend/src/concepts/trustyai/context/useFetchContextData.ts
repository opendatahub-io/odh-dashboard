import React from 'react';
import { TrustyAPIState } from '~/concepts/trustyai/useTrustyAIAPIState';
import { TrustyAIContextData } from '~/concepts/trustyai/context/types';
import useFetchBiasMetricConfigs from '~/concepts/trustyai/context/useFetchBiasMetricConfigs';

const useFetchContextData = (apiState: TrustyAPIState): TrustyAIContextData => {
  const [biasMetricConfigs, biasMetricConfigsLoaded, error, refreshBiasMetricConfigs] =
    useFetchBiasMetricConfigs(apiState);

  const refresh = React.useCallback(
    () => Promise.all([refreshBiasMetricConfigs()]).then(() => undefined),
    [refreshBiasMetricConfigs],
  );

  const loaded = React.useMemo(() => biasMetricConfigsLoaded, [biasMetricConfigsLoaded]);

  return {
    biasMetricConfigs,
    refresh,
    loaded,
    error,
  };
};

export default useFetchContextData;
