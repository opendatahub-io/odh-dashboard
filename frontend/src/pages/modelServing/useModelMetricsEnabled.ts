import { useAppContext } from '~/app/AppContext';
import { useDashboardNamespace } from '~/redux/selectors';
import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import { isModelMetricsEnabled } from './screens/metrics/utils';
import usePerformanceMetricsEnabled from './screens/metrics/usePerformanceMetricsEnabled';

const useModelMetricsEnabled = (): [modelMetricsEnabled: boolean] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { dashboardConfig } = useAppContext();
  const performanceMetricsEnabled = usePerformanceMetricsEnabled();
  const biasMetricsEnabled = useBiasMetricsEnabled();

  const checkModelMetricsEnabled = () =>
    isModelMetricsEnabled(dashboardNamespace, dashboardConfig) &&
    (performanceMetricsEnabled || biasMetricsEnabled);

  return [checkModelMetricsEnabled()];
};

export default useModelMetricsEnabled;
