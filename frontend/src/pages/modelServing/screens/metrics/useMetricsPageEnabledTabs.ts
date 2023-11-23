import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { MetricsTabKeys } from './types';

const useMetricsPageEnabledTabs = () => {
  const enabledTabs: MetricsTabKeys[] = [];

  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  if (performanceMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.PERFORMANCE);
  }
  if (biasMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.BIAS);
  }
  return enabledTabs;
};

export default useMetricsPageEnabledTabs;
