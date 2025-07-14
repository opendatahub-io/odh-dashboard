import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { MetricsTabKeys } from './types';

const useMetricsPageEnabledTabs = (): MetricsTabKeys[] => {
  const enabledTabs: MetricsTabKeys[] = [];
  //check availability of Bias metrics
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  //check availability of Performance metrics
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  //check availability of NIM metrics
  const nimMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;
  if (performanceMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.PERFORMANCE);
  }
  if (biasMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.BIAS);
  }
  if (nimMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.NIM);
  }
  return enabledTabs;
};

export default useMetricsPageEnabledTabs;
