import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { MetricsTabKeys } from './types';
import { useIsNIMModel } from './useIsNIMModel';
import type { InferenceServiceKind } from '../../shared';

type MetricsPageEnabledTabs = {
  enabledTabs: MetricsTabKeys[];
  /** Known tabs remain usable while loading. */
  loading: boolean;
  error?: Error;
};

const useMetricsPageEnabledTabs = (model: InferenceServiceKind): MetricsPageEnabledTabs => {
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  const { isNIMModel, loading, error } = useIsNIMModel(model);
  const enabledTabs: MetricsTabKeys[] = [];
  if (performanceMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.PERFORMANCE);
  }
  if (biasMetricsAreaAvailable) {
    enabledTabs.push(MetricsTabKeys.BIAS);
  }
  if (isNIMModel) {
    enabledTabs.push(MetricsTabKeys.NIM);
  }
  return {
    enabledTabs,
    loading,
    error,
  };
};

export default useMetricsPageEnabledTabs;
