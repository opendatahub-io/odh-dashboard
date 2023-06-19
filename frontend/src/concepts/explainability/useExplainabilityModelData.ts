import React from 'react';
import { useParams } from 'react-router-dom';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { ExplainabilityContext } from '~/concepts/explainability/ExplainabilityContext';

export type ExplainabilityModelData = {
  biasMetricConfigs: BiasMetricConfig[];
  serviceStatus: { initializing: boolean; installed: boolean; timedOut: boolean };
  loaded: boolean;
  loadError?: Error;
  refresh: () => Promise<unknown>;
};
export const useExplainabilityModelData = (): ExplainabilityModelData => {
  const { inferenceService } = useParams();

  const { data, crInitializing, hasCR, serverTimedOut } = React.useContext(ExplainabilityContext);

  const serviceStatus: ExplainabilityModelData['serviceStatus'] = {
    initializing: crInitializing,
    installed: hasCR,
    timedOut: serverTimedOut,
  };

  const [biasMetricConfigs] = React.useMemo(() => {
    let configs: BiasMetricConfig[] = [];

    if (data.loaded) {
      configs = data.biasMetricConfigs.filter((x) => x.modelId === inferenceService);
    }

    return [configs];
  }, [data.biasMetricConfigs, data.loaded, inferenceService]);

  return {
    serviceStatus,
    biasMetricConfigs,
    loaded: data.loaded,
    loadError: data.error,
    refresh: data.refresh,
  };
};
