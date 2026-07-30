import type { BiasMetricConfig } from '@odh-dashboard/k8s-core/trustyai';

export type TrustyAIContextData = {
  refresh: () => Promise<void>;
  biasMetricConfigs: BiasMetricConfig[];
  loaded: boolean;
  error?: Error;
};
