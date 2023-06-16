import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import { MetricsTabKeys } from './types';

const useMetricsPageEnabledTabs = () => {
  const enabledTabs: MetricsTabKeys[] = [];
  const [biasMetricsEnabled] = useBiasMetricsEnabled();
  // TODO: when we have a feature flag for performance tab, check it
  enabledTabs.push(MetricsTabKeys.PERFORMANCE);
  if (biasMetricsEnabled) {
    enabledTabs.push(MetricsTabKeys.BIAS);
  }
  return enabledTabs;
};

export default useMetricsPageEnabledTabs;
