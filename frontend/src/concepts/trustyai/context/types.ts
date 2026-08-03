import type { BiasMetricConfig } from '@odh-dashboard/model-serving/shared/types';

export type TrustyAIContextData = {
  refresh: () => Promise<void>;
  biasMetricConfigs: BiasMetricConfig[];
  loaded: boolean;
  error?: Error;
};
