import React from 'react';
import { useParams } from 'react-router-dom';
import { BiasMetricConfig, TrustyStatusStates } from '#~/concepts/trustyai/types';
import { TrustyAIContext } from '#~/concepts/trustyai/context/TrustyAIContext';

export type ModelBiasData = {
  biasMetricConfigs: BiasMetricConfig[];
  statusState: TrustyStatusStates;
  refresh: () => Promise<unknown>;
};
export const useModelBiasData = (): ModelBiasData => {
  const { inferenceService } = useParams();

  const { data, statusState } = React.useContext(TrustyAIContext);

  const biasMetricConfigs = React.useMemo(() => {
    let configs: BiasMetricConfig[] = [];

    if (data.loaded) {
      configs = data.biasMetricConfigs.filter((x) => x.modelId === inferenceService);
    }

    return configs;
  }, [data.biasMetricConfigs, data.loaded, inferenceService]);

  return {
    statusState,
    biasMetricConfigs,
    refresh: data.refresh,
  };
};
