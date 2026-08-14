import type { BiasMetricConfig } from '@odh-dashboard/trustyai/types';

export type TrustyAIContextData = {
  refresh: () => Promise<void>;
  biasMetricConfigs: BiasMetricConfig[];
  loaded: boolean;
  error?: Error;
};
