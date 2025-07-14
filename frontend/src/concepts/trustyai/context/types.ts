import { BiasMetricConfig } from '#~/concepts/trustyai/types';

export type TrustyAIContextData = {
  refresh: () => Promise<void>;
  biasMetricConfigs: BiasMetricConfig[];
  loaded: boolean;
  error?: Error;
};
