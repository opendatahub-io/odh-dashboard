import { TrustyAIContextData } from '~/concepts/trustyai/context/types';

export const DEFAULT_CONTEXT_DATA: TrustyAIContextData = {
  refresh: () => Promise.resolve(),
  biasMetricConfigs: [],
  loaded: false,
};
